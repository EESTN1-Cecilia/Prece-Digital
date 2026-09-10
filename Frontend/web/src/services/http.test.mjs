/* Chequeo del manejo centralizado de errores: node --test src */

import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import {
  ErrorApi,
  camposDeError,
  esMensajeApto,
  pedir,
  reiniciarSesionExpirada
} from "./http.js";

const fetchOriginal = globalThis.fetch;

function responder(status, cuerpo) {
  globalThis.fetch = async () => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => cuerpo
  });
}

afterEach(() => {
  globalThis.fetch = fetchOriginal;
  reiniciarSesionExpirada();
});

async function capturar(ruta = "/api/v1/users", opciones) {
  try {
    await pedir(ruta, opciones);
    assert.fail("se esperaba un error");
  } catch (error) {
    return error;
  }
}

test("cada codigo HTTP tiene mensaje, alcance y reintento propios", async () => {
  const casos = [
    [400, "local", false],
    [401, "global", false],
    [403, "local", false],
    [404, "local", false],
    [409, "local", false],
    [429, "local", true],
    [500, "global", true],
    [503, "global", true]
  ];

  for (const [status, alcance, reintentable] of casos) {
    responder(status, null);
    const error = await capturar();

    assert.ok(error instanceof ErrorApi, `${status} debe ser ErrorApi`);
    assert.equal(error.status, status);
    assert.equal(error.alcance, alcance, `alcance de ${status}`);
    assert.equal(error.reintentable, reintentable, `reintento de ${status}`);
    assert.ok(error.mensaje.length > 0);
    assert.ok(!error.mensaje.includes(String(status)), "el usuario no ve el codigo HTTP");
  }
});

test("401 se distingue de 403", async () => {
  responder(401, null);
  const expirada = await capturar();

  responder(403, null);
  const sinPermiso = await capturar();

  assert.ok(expirada.esSesionExpirada && !expirada.esSinPermiso);
  assert.ok(sinPermiso.esSinPermiso && !sinPermiso.esSesionExpirada);
  assert.equal(sinPermiso.alcance, "local", "un 403 no debe bloquear la aplicacion");
});

test("el 404 usa el recurso pedido para dar contexto", async () => {
  responder(404, null);
  const error = await capturar("/api/v1/users/9", { recurso: "el usuario solicitado" });

  assert.equal(error.mensaje, "No se encontro el usuario solicitado.");
});

test("sin conexion devuelve error global reintentable", async () => {
  globalThis.fetch = async () => {
    throw new TypeError("Failed to fetch");
  };

  const error = await capturar();

  assert.equal(error.status, 0);
  assert.equal(error.alcance, "global");
  assert.ok(error.reintentable);
  assert.match(error.mensaje, /No se pudo conectar/);
});

test("el timeout se trata como error de conexion", async () => {
  globalThis.fetch = async () => {
    const fallo = new Error("tardo demasiado");
    fallo.name = "TimeoutError";
    throw fallo;
  };

  const error = await capturar();

  assert.equal(error.status, 0);
  assert.match(error.tecnico, /timeout/);
});

test("no se muestran mensajes tecnicos del backend", async () => {
  const tecnico = "SQLITE_CONSTRAINT: UNIQUE constraint failed: usuarios.dni";
  responder(409, { error: { code: "CONFLICT", message: tecnico } });
  const error = await capturar();

  assert.notEqual(error.mensaje, tecnico);
  assert.match(error.mensaje, /conflicto/i);
  assert.equal(error.tecnico, tecnico, "queda solo para el registro de desarrollo");
});

test("si el backend manda un mensaje para el usuario, se usa", async () => {
  responder(409, { error: { code: "CONFLICT", message: "El DNI ingresado ya esta registrado." } });
  const error = await capturar();

  assert.equal(error.mensaje, "El DNI ingresado ya esta registrado.");
  assert.equal(error.codigo, "CONFLICT");
});

test("se leen los details del formato de error del backend", async () => {
  responder(422, {
    error: {
      code: "VALIDATION_ERROR",
      message: "Los datos enviados no son validos.",
      details: [
        { field: "dni", message: "El DNI es obligatorio." },
        { field: "email", message: "El correo no es valido." }
      ]
    }
  });

  const error = await capturar();

  assert.equal(error.status, 422);
  assert.equal(error.codigo, "VALIDATION_ERROR");
  assert.deepEqual(error.campos, {
    dni: "El DNI es obligatorio.",
    email: "El correo no es valido."
  });
});

test("esMensajeApto descarta texto tecnico", () => {
  assert.ok(esMensajeApto("El usuario ya existe en el sistema."));
  assert.ok(!esMensajeApto("Error: at listarUsuarios (/src/services/api.js:12)"));
  assert.ok(!esMensajeApto("select id from usuarios where dni = 1"));
  assert.ok(!esMensajeApto("linea uno\nlinea dos"));
  assert.ok(!esMensajeApto("x".repeat(201)));
  assert.ok(!esMensajeApto(undefined));
});

test("los errores de validacion se agrupan por campo", async () => {
  responder(400, { errores: { email: "El correo no es valido", dni: "Falta el DNI" } });
  const error = await capturar();

  assert.deepEqual(error.campos, { email: "El correo no es valido", dni: "Falta el DNI" });
  assert.equal(error.alcance, "local");
});

test("camposDeError acepta lista y descarta detalle tecnico", () => {
  assert.deepEqual(camposDeError({ errors: [{ field: "email", message: "Correo invalido" }] }), {
    email: "Correo invalido"
  });
  assert.equal(camposDeError({ errores: { email: "at Object.<anonymous> (/src/x.js:1)" } }), null);
  assert.equal(camposDeError({}), null);
});

test("una respuesta correcta devuelve el contenido de data", async () => {
  responder(200, { data: { id: 1 } });
  assert.deepEqual(await pedir("/api/v1/users/1"), { id: 1 });
});
