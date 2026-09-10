/* Manejo centralizado de errores: npm test */

import assert from "node:assert/strict";
import test, { after, before } from "node:test";
import { createApp } from "../src/app.mjs";
import { healthCheck } from "../controllers/health.controller.mjs";
import { conflicto, errorDeValidacion, noEncontrado, sinPermisos } from "../utils/api-error.mjs";

const PUERTO = 3999;
const base = `http://127.0.0.1:${PUERTO}`;
let servidor;

/* Juego de rutas propio del test: la app las recibe por parametro. */
const rutasDePrueba = {
  "GET /health": healthCheck,
  "GET /test/validacion": () => {
    throw errorDeValidacion([{ field: "dni", message: "El DNI es obligatorio." }]);
  },
  "GET /test/inexistente": () => {
    throw noEncontrado("El estudiante solicitado");
  },
  "GET /test/sin-permisos": () => {
    throw sinPermisos();
  },
  "GET /test/conflicto": () => {
    throw conflicto("El DNI ya esta registrado.");
  },
  "GET /test/mysql": () => {
    const fallo = new Error("ER_DUP_ENTRY: Duplicate entry '30111222' for key 'uq_usuarios_dni'");
    fallo.code = "ER_DUP_ENTRY";
    throw fallo;
  },
  "GET /test/interno": () => {
    throw new Error("SELECT * FROM usuarios WHERE id = 1 fallo en /var/app/db.mjs");
  },
  "GET /test/asincronico": async () => {
    await Promise.resolve();
    throw noEncontrado("El curso solicitado");
  }
};

before(async () => {
  servidor = createApp(rutasDePrueba);
  await new Promise((listo) => servidor.listen(PUERTO, listo));
});

after(async () => {
  await new Promise((listo) => servidor.close(listo));
});

async function pedir(ruta) {
  const respuesta = await fetch(`${base}${ruta}`);
  return { status: respuesta.status, cuerpo: await respuesta.json() };
}

test("los errores de validacion devuelven 422 con el detalle por campo", async () => {
  const { status, cuerpo } = await pedir("/test/validacion");

  assert.equal(status, 422);
  assert.equal(cuerpo.error.code, "VALIDATION_ERROR");
  assert.deepEqual(cuerpo.error.details, [{ field: "dni", message: "El DNI es obligatorio." }]);
});

test("un registro inexistente devuelve 404 con mensaje contextual", async () => {
  const { status, cuerpo } = await pedir("/test/inexistente");

  assert.equal(status, 404);
  assert.equal(cuerpo.error.code, "NOT_FOUND");
  assert.equal(cuerpo.error.message, "El estudiante solicitado no existe.");
});

test("la falta de permisos devuelve 403 y no se confunde con 401", async () => {
  const { status, cuerpo } = await pedir("/test/sin-permisos");

  assert.equal(status, 403);
  assert.equal(cuerpo.error.code, "FORBIDDEN");
});

test("los conflictos devuelven 409", async () => {
  const { status, cuerpo } = await pedir("/test/conflicto");

  assert.equal(status, 409);
  assert.equal(cuerpo.error.code, "CONFLICT");
  assert.equal(cuerpo.error.message, "El DNI ya esta registrado.");
});

test("un error de clave duplicada de MySQL se traduce a 409 sin exponer la consulta", async () => {
  const { status, cuerpo } = await pedir("/test/mysql");

  assert.equal(status, 409);
  assert.equal(cuerpo.error.code, "CONFLICT");
  assert.ok(!JSON.stringify(cuerpo).includes("uq_usuarios_dni"));
});

test("un error inesperado devuelve 500 sin SQL, rutas internas ni stack", async () => {
  const { status, cuerpo } = await pedir("/test/interno");
  const texto = JSON.stringify(cuerpo.error.message);

  assert.equal(status, 500);
  assert.equal(cuerpo.error.code, "INTERNAL_ERROR");
  assert.ok(!texto.includes("SELECT"));
  assert.ok(!texto.includes("/var/app"));
  assert.equal(cuerpo.error.stack, undefined);
});

test("los controladores asincronicos propagan el error al middleware", async () => {
  const { status, cuerpo } = await pedir("/test/asincronico");

  assert.equal(status, 404);
  assert.equal(cuerpo.error.message, "El curso solicitado no existe.");
});

test("una ruta inexistente usa el mismo formato de error", async () => {
  const { status, cuerpo } = await pedir("/no-existe");

  assert.equal(status, 404);
  assert.equal(cuerpo.error.code, "NOT_FOUND");
});

test("las rutas existentes siguen respondiendo 200", async () => {
  const { status, cuerpo } = await pedir("/health");

  assert.equal(status, 200);
  assert.equal(cuerpo.status, "ok");
});
