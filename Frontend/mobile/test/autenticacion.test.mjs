/* Tests de la autenticacion de Mobile.
   No inventan respuestas: replican el contrato real de la API comun
   (Backend/modules/auth/auth.service.mjs y Backend/routes/index.mjs). */

import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";

import { BASE_URL } from "../src/config/env.js";
import {
  ErrorDeApi,
  configurarPeticion,
  configurarRegistro,
  suscribirAEstadoDeSesion
} from "../src/services/api.js";
import {
  cerrarSesion,
  iniciarSesion,
  obtenerSesion,
  refrescarSesion
} from "../src/services/auth-api.js";
import {
  cargarTokensGuardados,
  guardarTokens,
  hayRefreshToken,
  haySesionGuardada,
  leerAccessToken,
  leerRefreshToken,
  limpiarTokens,
  reiniciarCacheDeTokens
} from "../src/services/session-tokens.js";
import {
  configurarAlmacenamientoSeguro,
  crearAlmacenamientoEnMemoria
} from "../src/services/secure-store.js";

const LOGIN = "/api/v1/auth/login";
const REFRESH = "/api/v1/auth/refresh";
const LOGOUT = "/api/v1/auth/logout";
const ME = "/api/v1/auth/me";

const USUARIO = {
  id: "usr_1",
  email: "secretaria@prece.local",
  displayName: "Secretaria Escuela",
  nombre: "Secretaria",
  apellido: "Escuela",
  roles: ["secretario"],
  isActive: true
};

/* Mismo payload que arma sessionPayload() en el Backend. */
function sesionPayload(accessToken, refreshToken) {
  return {
    accessToken,
    refreshToken,
    tokenType: "Bearer",
    ...USUARIO,
    user: USUARIO,
    usuario: USUARIO,
    roles: ["secretario"],
    permisos: ["students.read"],
    alcances: ["courses"]
  };
}

function errorPayload(code, message) {
  return { error: { code, message, details: undefined } };
}

let llamadas;

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

beforeEach(() => {
  llamadas = [];
  configurarAlmacenamientoSeguro(crearAlmacenamientoEnMemoria());
  reiniciarCacheDeTokens();
  configurarRegistro(null);
});

afterEach(() => {
  configurarPeticion(null);
});

describe("login", () => {
  it("guarda los tokens del Backend y devuelve la sesion normalizada", async () => {
    configurarPeticion(
      crearPeticion({
        [LOGIN]: { estado: 200, body: sesionPayload("access_1", "refresh_1") }
      })
    );

    const sesion = await iniciarSesion({ email: "secretaria@prece.local", password: "clave" });

    assert.equal(llamadas.length, 1);
    assert.equal(llamadas[0].ruta, LOGIN);
    assert.equal(llamadas[0].metodo, "POST");
    assert.deepEqual(JSON.parse(llamadas[0].cuerpo), {
      email: "secretaria@prece.local",
      password: "clave"
    });
    assert.equal(sesion.usuario.email, USUARIO.email);
    assert.deepEqual(sesion.roles, ["secretario"]);
    assert.deepEqual(sesion.permisos, ["students.read"]);
    assert.equal(leerAccessToken(), "access_1");
    assert.equal(leerRefreshToken(), "refresh_1");
  });

  it("no guarda la contrasena ni envia Authorization al login", async () => {
    configurarPeticion(
      crearPeticion({
        [LOGIN]: { estado: 200, body: sesionPayload("access_1", "refresh_1") }
      })
    );

    await iniciarSesion({ email: "secretaria@prece.local", password: "clave-secreta" });

    assert.equal(llamadas[0].cabeceras.Authorization, undefined);
    assert.equal(JSON.stringify(await listarAlmacenamiento()).includes("clave-secreta"), false);
  });

  it("devuelve el error real del Backend con credenciales invalidas", async () => {
    configurarPeticion(
      crearPeticion({
        [LOGIN]: {
          estado: 401,
          body: errorPayload("INVALID_CREDENTIALS", "Credenciales inválidas o cuenta desactivada")
        }
      })
    );

    await assert.rejects(
      () => iniciarSesion({ email: "secretaria@prece.local", password: "mala" }),
      (fallo) => {
        assert.ok(fallo instanceof ErrorDeApi);
        assert.equal(fallo.codigo, "INVALID_CREDENTIALS");
        assert.equal(fallo.estado, 401);
        assert.equal(fallo.mensaje, "Credenciales inválidas o cuenta desactivada");
        return true;
      }
    );

    assert.equal(haySesionGuardada(), false);
  });

  it("traduce un error de conexion sin inventar un codigo del Backend", async () => {
    configurarPeticion(crearPeticion({ [LOGIN]: () => { throw new Error("offline"); } }));

    await assert.rejects(() => iniciarSesion({ email: "a@b.c", password: "x" }), (fallo) => {
      assert.equal(fallo.codigo, "NETWORK_ERROR");
      assert.equal(fallo.estado, 0);
      return true;
    });
  });

  it("reporta timeout con su propio codigo", async () => {
    configurarPeticion(async (url, opciones) =>
      new Promise((_resolver, rechazar) => {
        opciones.signal.addEventListener("abort", () => {
          const fallo = new Error("abortado");
          fallo.name = "AbortError";
          rechazar(fallo);
        });
      })
    );

    await assert.rejects(
      () => iniciarSesion({ email: "a@b.c", password: "x" }, { tiempoLimiteMs: 10 }),
      (fallo) => fallo.codigo === "TIMEOUT"
    );
  });
});

describe("sesion almacenada", () => {
  it("restaura los tokens desde el almacen seguro", async () => {
    await guardarTokens({ accessToken: "access_1", refreshToken: "refresh_1" });
    reiniciarCacheDeTokens();

    await cargarTokensGuardados();

    assert.equal(leerAccessToken(), "access_1");
    assert.equal(leerRefreshToken(), "refresh_1");
    assert.equal(haySesionGuardada(), true);
    assert.equal(hayRefreshToken(), true);
  });

  it("no acepta una sesion incompleta", async () => {
    await assert.rejects(() => guardarTokens({ accessToken: "access_1" }));
  });
});

describe("requests autenticadas", () => {
  it("envia exactamente el header que espera la API comun", async () => {
    await guardarTokens({ accessToken: "access_1", refreshToken: "refresh_1" });
    configurarPeticion(
      crearPeticion({ [ME]: { estado: 200, body: { data: sesionPayload("access_1", "refresh_1") } } })
    );

    const sesion = await obtenerSesion();

    assert.equal(llamadas[0].cabeceras.Authorization, "Bearer access_1");
    assert.equal(sesion.usuario.email, USUARIO.email);
  });

  it("no llama a un recurso protegido si no hay token", async () => {
    await limpiarTokens();
    configurarPeticion(crearPeticion({ [ME]: { estado: 200, body: { data: {} } } }));

    await assert.rejects(() => obtenerSesion(), (fallo) => {
      assert.equal(fallo.codigo, "UNAUTHENTICATED");
      return true;
    });

    assert.equal(llamadas.length, 0);
  });

  it("rechaza un token invalido y limpia la sesion local", async () => {
    await guardarTokens({ accessToken: "access_manipulado", refreshToken: "refresh_1" });

    let avisos = 0;
    const baja = suscribirAEstadoDeSesion(() => {
      avisos += 1;
    });

    configurarPeticion(
      crearPeticion({
        [ME]: { estado: 401, body: errorPayload("UNAUTHENTICATED", "Token inválido o expirado") },
        [REFRESH]: { estado: 401, body: errorPayload("UNAUTHENTICATED", "Refresh token inválido") }
      })
    );

    await assert.rejects(() => obtenerSesion(), (fallo) => fallo.estado === 401);

    baja();

    assert.equal(haySesionGuardada(), false);
    assert.equal(hayRefreshToken(), false);
    assert.equal(avisos, 1);
  });

  it("renueva el token expirado y reintenta una sola vez", async () => {
    await guardarTokens({ accessToken: "access_vencido", refreshToken: "refresh_1" });

    let refrescos = 0;
    let intentosMe = 0;

    configurarPeticion(
      crearPeticion({
        [ME]: () => {
          intentosMe += 1;

          return intentosMe === 1
            ? { estado: 401, body: errorPayload("UNAUTHENTICATED", "Token expirado") }
            : { estado: 200, body: { data: sesionPayload("access_2", "refresh_2") } };
        },
        [REFRESH]: () => {
          refrescos += 1;
          return { estado: 200, body: sesionPayload("access_2", "refresh_2") };
        }
      })
    );

    await obtenerSesion();

    assert.equal(refrescos, 1);
    assert.equal(intentosMe, 2);
    assert.equal(leerAccessToken(), "access_2");
    assert.equal(leerRefreshToken(), "refresh_2");
    assert.equal(haySesionGuardada(), true);
  });

  it("renueva una sola vez cuando varias requests fallan juntas", async () => {
    await guardarTokens({ accessToken: "access_vencido", refreshToken: "refresh_1" });

    let refrescos = 0;

    const rutas = {
      [ME]: () => ({ estado: 200, body: { data: sesionPayload("access_2", "refresh_2") } }),
      [REFRESH]: () => {
        refrescos += 1;
        return { estado: 200, body: sesionPayload("access_2", "refresh_2") };
      }
    };

    let pendientes = 2;

    rutas[ME] = () => {
      pendientes -= 1;

      return pendientes >= 0
        ? { estado: 401, body: errorPayload("UNAUTHENTICATED", "Token expirado") }
        : { estado: 200, body: { data: sesionPayload("access_2", "refresh_2") } };
    };

    configurarPeticion(crearPeticion(rutas));

    const resultados = await Promise.allSettled([obtenerSesion(), obtenerSesion()]);

    assert.equal(refrescos, 1);
    assert.equal(resultados.filter((r) => r.status === "fulfilled").length >= 1, true);
  });

  it("no reintenta mas de una vez cuando el token nuevo tambien falla", async () => {
    await guardarTokens({ accessToken: "access_vencido", refreshToken: "refresh_1" });

    let intentosMe = 0;
    let refrescos = 0;

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

    await assert.rejects(() => obtenerSesion(), (fallo) => fallo.estado === 401);

    assert.equal(intentosMe, 2);
    assert.equal(refrescos, 1);
  });

  it("expone el permiso real del Backend sin decidirlo en Mobile", async () => {
    await guardarTokens({ accessToken: "access_1", refreshToken: "refresh_1" });
    configurarPeticion(
      crearPeticion({ [ME]: { estado: 200, body: { data: sesionPayload("access_1", "refresh_1") } } })
    );

    const sesion = await obtenerSesion();

    assert.deepEqual(sesion.permisos, ["students.read"]);
  });
});

describe("refresh manual", () => {
  it("rota access y refresh token contra el endpoint real", async () => {
    await guardarTokens({ accessToken: "access_1", refreshToken: "refresh_1" });
    configurarPeticion(
      crearPeticion({ [REFRESH]: { estado: 200, body: sesionPayload("access_2", "refresh_2") } })
    );

    const sesion = await refrescarSesion();

    assert.equal(llamadas[0].ruta, REFRESH);
    assert.equal(llamadas[0].cabeceras.Authorization, undefined);
    assert.deepEqual(JSON.parse(llamadas[0].cuerpo), { refreshToken: "refresh_1" });
    assert.equal(leerAccessToken(), "access_2");
    assert.equal(sesion.usuario.email, USUARIO.email);
  });

  it("falla sin inventar refresh cuando no hay refresh token", async () => {
    await limpiarTokens();

    await assert.rejects(() => refrescarSesion(), (fallo) => fallo.codigo === "UNAUTHENTICATED");
  });
});

describe("logout", () => {
  it("revoca el refresh token en el Backend y limpia la sesion local", async () => {
    await guardarTokens({ accessToken: "access_1", refreshToken: "refresh_1" });
    configurarPeticion(crearPeticion({ [LOGOUT]: { estado: 200, body: { ok: true } } }));

    await cerrarSesion();

    assert.equal(llamadas.length, 1);
    assert.equal(llamadas[0].ruta, LOGOUT);
    assert.deepEqual(JSON.parse(llamadas[0].cuerpo), { refreshToken: "refresh_1" });
    assert.equal(haySesionGuardada(), false);
    assert.equal(hayRefreshToken(), false);
  });

  it("limpia la sesion local aunque el Backend no responda", async () => {
    await guardarTokens({ accessToken: "access_1", refreshToken: "refresh_1" });
    configurarPeticion(crearPeticion({ [LOGOUT]: () => { throw new Error("offline"); } }));

    await assert.rejects(() => cerrarSesion());

    assert.equal(haySesionGuardada(), false);
    assert.equal(hayRefreshToken(), false);
  });
});

describe("registro", () => {
  it("no registra tokens, contrasenas ni cabeceras de autenticacion", async () => {
    const registros = [];
    configurarRegistro((dato) => registros.push(dato));

    await guardarTokens({ accessToken: "access_secreto", refreshToken: "refresh_secreto" });

    configurarPeticion(
      crearPeticion({ [LOGIN]: { estado: 200, body: sesionPayload("access_secreto", "refresh_secreto") } })
    );

    await iniciarSesion({ email: "secretaria@prece.local", password: "clave-secreta" });

    configurarRegistro(null);

    const volcado = JSON.stringify(registros);

    assert.ok(registros.length > 0);
    assert.equal(volcado.includes("access_secreto"), false);
    assert.equal(volcado.includes("refresh_secreto"), false);
    assert.equal(volcado.includes("clave-secreta"), false);
    assert.equal(volcado.toLowerCase().includes("authorization"), false);
  });
});

async function listarAlmacenamiento() {
  const { leerSeguro } = await import("../src/services/secure-store.js");

  return [await leerSeguro("prece.token"), await leerSeguro("prece.refreshToken")];
}