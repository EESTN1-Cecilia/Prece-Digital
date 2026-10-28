/* Tests del contrato normalizado de errores de Mobile.
   No inventan respuestas: replican el contrato real de la API comun
   ({ error: { code, message, details } }), los codigos reales de autenticacion
   (MISSING_TOKEN, INVALID_TOKEN, INVALID_CREDENTIALS), el details del 403 del
   middleware de autorizacion ({ permission, roles, context }) y los errores de
   transporte del cliente (NETWORK_ERROR / TIMEOUT). */

import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";

import { BASE_URL } from "../src/config/env.js";
import {
  ErrorDeApi,
  camposDeError,
  configurarPeticion,
  configurarRenovador,
  configurarRegistro,
  esMensajeApto,
  pedir,
  suscribirAEstadoDeSesion
} from "../src/services/api.js";
import {
  refrescarSesion,
  iniciarSesion,
  obtenerSesion
} from "../src/services/auth-api.js";
import {
  configurarAlmacenamientoSeguro,
  crearAlmacenamientoEnMemoria
} from "../src/services/secure-store.js";
import {
  guardarTokens,
  hayRefreshToken,
  haySesionGuardada,
  leerAccessToken,
  leerRefreshToken,
  limpiarTokens,
  reiniciarCacheDeTokens
} from "../src/services/session-tokens.js";

const LOGIN = "/api/v1/auth/login";
const REFRESH = "/api/v1/auth/refresh";
const ME = "/api/v1/auth/me";
const DISPOSITIVOS = "/api/v1/devices";
const DISPOSITIVO = "/api/v1/devices/dev_inexistente";

function sesionPayload(accessToken, refreshToken) {
  return {
    accessToken,
    refreshToken,
    tokenType: "Bearer",
    email: "secretaria@prece.local",
    displayName: "Secretaria Escuela",
    roles: ["secretario"],
    permisos: ["students.read"],
    alcances: []
  };
}

function errorPayload(code, message, details) {
  return { error: { code, message, details } };
}

let llamadas;
let avisos;
let bajaSuscripcion;

function crearPeticion(rutas) {
  return async function peticion(url, opciones = {}) {
    const ruta = url.startsWith(BASE_URL) ? url.slice(BASE_URL.length) : url;
    const registro = { ruta, metodo: opciones.method, cabeceras: opciones.headers || {}, cuerpo: opciones.body };

    llamadas.push(registro);

    const regla = rutas[ruta];

    if (!regla) {
      throw new Error(`Ruta no esperada en el test: ${ruta}`);
    }

    const resultado = typeof regla === "function" ? await regla(registro, llamadas) : regla;

    return {
      ok: resultado.estado >= 200 && resultado.estado < 300,
      status: resultado.estado,
      async text() {
        return resultado.body === undefined ? "" : JSON.stringify(resultado.body);
      }
    };
  };
}

function errorDe(ruta = ME, opciones) {
  return pedir(ruta, opciones).then(
    () => null,
    (fallo) => fallo
  );
}

beforeEach(() => {
  llamadas = [];
  avisos = 0;
  bajaSuscripcion = suscribirAEstadoDeSesion(() => {
    avisos += 1;
  });
  configurarAlmacenamientoSeguro(crearAlmacenamientoEnMemoria());
  reiniciarCacheDeTokens();
  limpiarTokens();
  configurarRegistro(null);
  configurarRenovador(refrescarSesion);
});

afterEach(() => {
  configurarPeticion(null);
  bajaSuscripcion();
});

describe("transporte: red y timeout", () => {
  it("distingue caida de red de timeout y no toca la sesion", async () => {
    await guardarTokens({ accessToken: "access_1", refreshToken: "refresh_1" });

    let redUsada = false;
    configurarPeticion(async (url, opciones) => {
      const ruta = url.startsWith(BASE_URL) ? url.slice(BASE_URL.length) : url;
      llamadas.push({ ruta, metodo: opciones.method });

      if (ruta !== ME) {
        throw new Error(`Ruta no esperada en el test: ${ruta}`);
      }

      redUsada = true;
      throw new TypeError("Failed to fetch");
    });

    const caida = await errorDe();

    assert.equal(redUsada, true);
    assert.ok(caida instanceof ErrorDeApi);
    assert.equal(caida.codigo, "NETWORK_ERROR");
    assert.equal(caida.estado, 0);
    assert.match(caida.mensaje, /No pudimos conectarnos/);

    let abortos = false;
    configurarPeticion(async (url, _opciones) => {
      const ruta = url.startsWith(BASE_URL) ? url.slice(BASE_URL.length) : url;
      llamadas.push({ ruta, metodo: "GET" });

      if (ruta !== ME) {
        throw new Error(`Ruta no esperada en el test: ${ruta}`);
      }

      abortos = true;
      const fallo = new Error("operacion cancelada");
      fallo.name = "AbortError";
      throw fallo;
    });

    const agotado = await errorDe();

    assert.equal(abortos, true);
    assert.equal(agotado.codigo, "TIMEOUT");
    assert.equal(agotado.estado, 0);
    assert.match(agotado.mensaje, /tardó demasiado/);
    assert.notEqual(caida.mensaje, agotado.mensaje);

    /* Ningun problema de transporte cierra la sesion ni avisa invalidaciones. */
    assert.equal(haySesionGuardada(), true);
    assert.equal(hayRefreshToken(), true);
    assert.equal(avisos, 0);
  });
});

describe("sesion expirada y autenticacion", () => {
  it("un login rechazado no borra una sesion previa valida", async () => {
    await guardarTokens({ accessToken: "access_previo", refreshToken: "refresh_previo" });

    configurarPeticion(
      crearPeticion({
        [LOGIN]: {
          estado: 401,
          body: errorPayload("INVALID_CREDENTIALS", "Credenciales inválidas o cuenta desactivada")
        }
      })
    );

    const fallo = await errorDe(LOGIN, {
      metodo: "POST",
      cuerpo: { email: "a@b.c", password: "mala" },
      autenticado: false,
      permitirRenovacion: false
    });

    assert.ok(fallo instanceof ErrorDeApi);
    assert.equal(fallo.codigo, "INVALID_CREDENTIALS");
    assert.equal(fallo.estado, 401);
    assert.equal(fallo.mensaje, "Credenciales inválidas o cuenta desactivada");

    /* La sesion vigente sigue en pie: no hubo avisos, limpieza ni renovaciones. */
    assert.equal(leerAccessToken(), "access_previo");
    assert.equal(leerRefreshToken(), "refresh_previo");
    assert.equal(avisos, 0);
    assert.equal(llamadas.filter((l) => l.ruta === REFRESH && l.metodo === "POST").length, 0);
  });

  it("un 401 sin renovador disponible cierra la sesion y avisa una vez", async () => {
    await guardarTokens({ accessToken: "access_vencido", refreshToken: "refresh_1" });

    /* Renovador no conectado (servicios usados sin el modulo de sesion): el 401
       no queda sin efecto, la sesion local se limpia igual. */
    configurarRenovador(null);

    configurarPeticion(
      crearPeticion({
        [ME]: { estado: 401, body: errorPayload("MISSING_TOKEN", "Se requiere un token de acceso") }
      })
    );

    const fallo = await errorDe();

    assert.equal(fallo.codigo, "MISSING_TOKEN");
    assert.equal(fallo.estado, 401);
    assert.match(fallo.mensaje, /iniciar sesión/i, "el mensaje explica que falta iniciar sesion, no que expiro");
    assert.equal(haySesionGuardada(), false, "la sesion local se limpia");
    assert.equal(hayRefreshToken(), false);
    assert.equal(avisos, 1);
    assert.equal(llamadas.filter((l) => l.ruta === REFRESH).length, 0);
  });

  it("un 401 INVALID_TOKEN con refresh vencido invalida una sola vez", async () => {
    await guardarTokens({ accessToken: "access_vencido", refreshToken: "refresh_revocado" });

    configurarPeticion(
      crearPeticion({
        [ME]: { estado: 401, body: errorPayload("INVALID_TOKEN", "Token de acceso inválido o vencido") },
        [REFRESH]: {
          estado: 401,
          body: errorPayload("INVALID_REFRESH_TOKEN", "Refresh token revocado. Inicie sesión de nuevo")
        }
      })
    );

    const fallo = await errorDe();

    assert.equal(fallo.codigo, "INVALID_TOKEN");
    assert.equal(fallo.estado, 401);
    assert.match(fallo.mensaje, /sesión venció|token no es válido/);
    assert.equal(haySesionGuardada(), false);
    assert.equal(hayRefreshToken(), false);
    assert.equal(avisos, 1);
  });

  it("pedidos concurrentes con la misma sesion terminada producen un unico aviso", async () => {
    await guardarTokens({ accessToken: "access_vencido", refreshToken: "refresh_1" });

    let refrescos = 0;

    configurarPeticion(
      crearPeticion({
        [ME]: { estado: 401, body: errorPayload("UNAUTHENTICATED", "Token expirado") },
        [REFRESH]: () => {
          refrescos += 1;
          return { estado: 401, body: errorPayload("INVALID_REFRESH_TOKEN", "Refresh token inválido") };
        }
      })
    );

    const resultados = await Promise.allSettled([obtenerSesion(), obtenerSesion(), obtenerSesion()]);

    assert.equal(resultados.filter((r) => r.status === "rejected").length, 3);
    assert.equal(refrescos, 1, "la renovacion es single-flight");
    assert.equal(haySesionGuardada(), false);
    assert.equal(avisos, 1, "un solo cierre de sesion ante el mismo vencimiento");
  });

  it("el reintento tras renovar no vuelve a renovar (sin bucles)", async () => {
    await guardarTokens({ accessToken: "access_vencido", refreshToken: "refresh_1" });

    let refrescos = 0;
    let intentosMe = 0;

    configurarPeticion(
      crearPeticion({
        [ME]: () => {
          intentosMe += 1;
          return { estado: 401, body: errorPayload("UNAUTHENTICATED", "Token expirado") };
        },
        [REFRESH]: () => {
          refrescos += 1;
          return { estado: 200, body: sesionPayload("access_2", "refresh_2") };
        }
      })
    );

    const fallo = await errorDe();

    assert.equal(fallo.estado, 401);
    assert.equal(intentosMe, 2, "un unico reintento");
    assert.equal(refrescos, 1, "no hay bucle de renovacion");
    assert.equal(haySesionGuardada(), false, "si el token nuevo tambien es rechazado, la sesion se cierra");
    assert.equal(avisos, 1);
  });
});

describe("permisos (403)", () => {
  it("un 403 expone el permiso del Backend y no cierra la sesion", async () => {
    await guardarTokens({ accessToken: "access_1", refreshToken: "refresh_1" });

    configurarPeticion(
      crearPeticion({
        [DISPOSITIVOS]: {
          estado: 403,
          body: errorPayload("FORBIDDEN", "No tiene permiso para esta acción en el alcance solicitado", {
            permission: "notifications.read",
            context: {}
          })
        }
      })
    );

    const fallo = await errorDe(DISPOSITIVOS);

    assert.ok(fallo instanceof ErrorDeApi);
    assert.equal(fallo.codigo, "FORBIDDEN");
    assert.equal(fallo.estado, 403);
    assert.equal(fallo.permiso, "notifications.read");

    assert.equal(haySesionGuardada(), true, "un 403 nunca cierra la sesion");
    assert.equal(hayRefreshToken(), true);
    assert.equal(avisos, 0);
    assert.equal(llamadas.filter((l) => l.ruta === REFRESH).length, 0);
  });

  it("un 403 sin permission en details queda con permiso nulo", async () => {
    await guardarTokens({ accessToken: "access_1", refreshToken: "refresh_1" });

    configurarPeticion(
      crearPeticion({
        [DISPOSITIVOS]: {
          estado: 403,
          body: errorPayload("FORBIDDEN", "No puede modificar su propia cuenta.")
        }
      })
    );

    const fallo = await errorDe(DISPOSITIVOS);

    assert.equal(fallo.codigo, "FORBIDDEN");
    assert.equal(fallo.permiso, null);
    assert.equal(fallo.mensaje, "No puede modificar su propia cuenta.");
    assert.equal(haySesionGuardada(), true);
    assert.equal(avisos, 0);
  });
});

describe("validacion (422/400)", () => {
  it("conserva details crudos y arma errores por campo", async () => {
    await guardarTokens({ accessToken: "access_1", refreshToken: "refresh_1" });

    const detalles = [
      { field: "platform", message: "Plataforma no soportada. Valores: android, ios." }
    ];

    configurarPeticion(
      crearPeticion({
        [DISPOSITIVOS]: {
          estado: 422,
          body: errorPayload("VALIDATION_ERROR", "Los datos enviados no son validos.", detalles)
        }
      })
    );

    const fallo = await errorDe(DISPOSITIVOS, { metodo: "POST", cuerpo: {} });

    assert.equal(fallo.codigo, "VALIDATION_ERROR");
    assert.equal(fallo.estado, 422);
    assert.deepEqual(fallo.detalles, detalles, "el detalle original llega crudo");
    assert.deepEqual(fallo.campos, { platform: "Plataforma no soportada. Valores: android, ios." });
    assert.equal(haySesionGuardada(), true);
    assert.equal(avisos, 0);
  });

  it("validacion sin detalles deja campos nulo y muestra el mensaje", async () => {
    await guardarTokens({ accessToken: "access_1", refreshToken: "refresh_1" });

    configurarPeticion(
      crearPeticion({
        [LOGIN]: {
          estado: 422,
          body: errorPayload("INVALID_REQUEST", "La solicitud no es valida.")
        }
      })
    );

    const fallo = await errorDe(LOGIN, {
      metodo: "POST",
      cuerpo: {},
      autenticado: false
    });

    assert.equal(fallo.codigo, "INVALID_REQUEST");
    assert.equal(fallo.estado, 422);
    assert.equal(fallo.campos, null);
    assert.equal(fallo.mensaje, "La solicitud no es valida.");
  });

  it("un 422 no se trata como sesion expirada ni limpia credenciales", async () => {
    await guardarTokens({ accessToken: "access_1", refreshToken: "refresh_1" });

    configurarPeticion(
      crearPeticion({
        [LOGIN]: {
          estado: 422,
          body: errorPayload("VALIDATION_ERROR", "Los datos enviados no son validos.")
        }
      })
    );

    await errorDe(LOGIN, { metodo: "POST", cuerpo: {}, autenticado: false });

    assert.equal(haySesionGuardada(), true);
    assert.equal(avisos, 0);
  });
});

describe("errores del servidor y formatos inesperados", () => {
  it("5xx muestra el mensaje del servidor y no cierra la sesion", async () => {
    await guardarTokens({ accessToken: "access_1", refreshToken: "refresh_1" });

    configurarPeticion(
      crearPeticion({
        [DISPOSITIVOS]: {
          estado: 503,
          body: { error: { code: "INTERNAL_ERROR", message: "Servicio temporalmente no disponible" } }
        }
      })
    );

    const fallo = await errorDe(DISPOSITIVOS);

    assert.equal(fallo.codigo, "INTERNAL_ERROR");
    assert.equal(fallo.estado, 503);
    assert.equal(fallo.mensaje, "Servicio temporalmente no disponible");
    assert.equal(haySesionGuardada(), true, "un 5xx no cierra la sesion");
    assert.equal(avisos, 0);
  });

  it("un 5xx con mensaje tecnico del backend no lo muestra al usuario", async () => {
    await guardarTokens({ accessToken: "access_1", refreshToken: "refresh_1" });

    configurarPeticion(
      crearPeticion({
        [DISPOSITIVOS]: {
          estado: 500,
          body: {
            error: {
              code: "INTERNAL_ERROR",
              message: "SequelizeDatabaseError: select id from usuarios where dni = 1"
            }
          }
        }
      })
    );

    const fallo = await errorDe(DISPOSITIVOS);

    assert.equal(fallo.codigo, "INTERNAL_ERROR");
    assert.equal(fallo.estado, 500);
    assert.match(fallo.mensaje, /error en el servidor/);
    assert.equal(fallo.mensaje.includes("Sequelize"), false);
    assert.equal(haySesionGuardada(), true);
    assert.equal(avisos, 0);
  });

  it("un 500 sin codigo conocido no usa una categoria inventada", async () => {
    await guardarTokens({ accessToken: "access_1", refreshToken: "refresh_1" });

    configurarPeticion(
      crearPeticion({ [DISPOSITIVOS]: { estado: 500 } })
    );

    const fallo = await errorDe(DISPOSITIVOS);

    assert.ok(fallo instanceof ErrorDeApi);
    assert.equal(fallo.codigo, null);
    assert.equal(fallo.estado, 500);
    assert.match(fallo.mensaje, /error en el servidor/);
    assert.equal(fallo.campos, null);
  });

  it("un 404 sin estructura de error conserva el estado y no toca la sesion", async () => {
    await guardarTokens({ accessToken: "access_1", refreshToken: "refresh_1" });

    configurarPeticion(
      crearPeticion({ [DISPOSITIVO]: { estado: 404 } })
    );

    const fallo = await errorDe(DISPOSITIVO);

    assert.equal(fallo.estado, 404);
    assert.equal(fallo.codigo, null);
    assert.match(fallo.mensaje, /\(404\)/);
    assert.equal(haySesionGuardada(), true);
    assert.equal(avisos, 0);
  });

  it("una respuesta 200 sin JSON devuelve data nula sin romper", async () => {
    await guardarTokens({ accessToken: "access_1", refreshToken: "refresh_1" });

    configurarPeticion(
      crearPeticion({ [DISPOSITIVOS]: { estado: 200 } })
    );

    const resultado = await pedir(DISPOSITIVOS);

    assert.equal(resultado, null);
  });
});

describe("normalizacion por campo", () => {
  it("camposDeError acepta lista y objeto, y excluye claves de control", () => {
    assert.deepEqual(camposDeError({ error: { details: [{ field: "email", message: "Correo invalido" }] } }), {
      email: "Correo invalido"
    });

    assert.deepEqual(camposDeError({ errores: { dni: "Falta el DNI" } }), {
      dni: "Falta el DNI"
    });

    /* El details del 403 ({ permission, context }) no fabrica campos de formulario. */
    assert.equal(camposDeError({ error: { details: { permission: "students.read", context: {} } } }), null);
    assert.equal(camposDeError({}), null);
    assert.equal(camposDeError(null), null);
  });

  it("esMensajeApto descarta texto tecnico", () => {
    assert.ok(esMensajeApto("El usuario ya existe en el sistema."));
    assert.ok(!esMensajeApto("Error: at listar (/src/services/api.js:12)"));
    assert.ok(!esMensajeApto("SQLITE_CONSTRAINT: UNIQUE failed"));
    assert.ok(!esMensajeApto("linea uno\nlinea dos"));
    assert.ok(!esMensajeApto("x".repeat(201)));
    assert.ok(!esMensajeApto(undefined));
  });
});
