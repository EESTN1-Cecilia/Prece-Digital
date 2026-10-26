/* Tests de dispositivos para Mobile.
   Replican el contrato real de la API comun (modules/devices +
   Backend/routes/index.mjs): registro idempotente, propiedad fijada por el
   token (nunca se envia userId), desasociacion con baja logica y renovacion
   de sesion ante 401 con el mecanismo existente. */

import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";

import { BASE_URL } from "../src/config/env.js";
import {
  ErrorDeApi,
  configurarPeticion,
  configurarRegistro,
  suscribirAEstadoDeSesion
} from "../src/services/api.js";
import "../src/services/auth-api.js";
import {
  desasociarDispositivo,
  listarDispositivos,
  registrarDispositivo
} from "../src/services/devices-api.js";
import {
  configurarAlmacenamientoSeguro,
  crearAlmacenamientoEnMemoria
} from "../src/services/secure-store.js";
import { guardarTokens, haySesionGuardada, leerAccessToken, limpiarTokens, reiniciarCacheDeTokens } from "../src/services/session-tokens.js";

/* Rutas reales de la API comun. */
const REGISTRO = "/api/v1/devices";
const DISPOSITIVO = "/api/v1/devices/dev_123_abc";
const REFRESH = "/api/v1/auth/refresh";

const TOKEN_PUSH = "ExponentPushToken[pruebaFija123]";

const DISPOSITIVO_DATA = {
  id: "dev_123_abc",
  userId: "usr_2",
  installationId: "expo-install-xyz",
  platform: "android",
  isActive: true,
  hasPushToken: true,
  createdAt: "2026-05-10T14:00:00.000Z",
  updatedAt: "2026-05-10T15:00:00.000Z"
};

function sesionPayload(accessToken, refreshToken) {
  return {
    accessToken,
    refreshToken,
    tokenType: "Bearer",
    id: "usr_2",
    email: "secretaria@prece.local",
    displayName: "Secretaria Escuela",
    roles: ["secretario"],
    permisos: ["notifications.read"],
    alcances: []
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
  limpiarTokens();
});

afterEach(() => {
  configurarPeticion(null);
});

describe("dispositivos - registro", () => {
  it("envia solo installationId/platform/pushToken con Bearer", async () => {
    await guardarTokens({ accessToken: "access_1", refreshToken: "refresh_1" });
    configurarPeticion(
      crearPeticion({ [REGISTRO]: { estado: 201, body: { data: DISPOSITIVO_DATA } } })
    );

    const datos = await registrarDispositivo({
      installationId: "expo-install-xyz",
      platform: "android",
      pushToken: TOKEN_PUSH
    });

    assert.deepEqual(datos, DISPOSITIVO_DATA);
    assert.equal(llamadas[0].ruta, REGISTRO);
    assert.equal(llamadas[0].metodo, "POST");
    assert.equal(llamadas[0].cabeceras.Authorization, "Bearer access_1");
    assert.deepEqual(JSON.parse(llamadas[0].cuerpo), {
      installationId: "expo-install-xyz",
      platform: "android",
      pushToken: TOKEN_PUSH
    });
  });

  it("nunca envia userId para fijar la propiedad", async () => {
    await guardarTokens({ accessToken: "access_1", refreshToken: "refresh_1" });
    configurarPeticion(crearPeticion({ [REGISTRO]: { estado: 201, body: { data: DISPOSITIVO_DATA } } }));

    await registrarDispositivo({ installationId: "expo-install-xyz", platform: "ios", pushToken: TOKEN_PUSH });

    const cuerpo = JSON.parse(llamadas[0].cuerpo);
    assert.equal("userId" in cuerpo, false);
    assert.equal("recipientId" in cuerpo, false);
    assert.equal(cuerpo.platform, "ios");
  });

  it("omite el token si no viene y exige datos minimos", async () => {
    await guardarTokens({ accessToken: "access_1", refreshToken: "refresh_1" });
    configurarPeticion(crearPeticion({ [REGISTRO]: { estado: 201, body: { data: DISPOSITIVO_DATA } } }));

    await registrarDispositivo({ installationId: "expo-install-xyz", platform: "android" });

    assert.deepEqual(JSON.parse(llamadas[0].cuerpo), {
      installationId: "expo-install-xyz",
      platform: "android"
    });
  });

  it("falla localmente sin llamar a la API sin identificador de instalacion", async () => {
    await assert.rejects(
      () => registrarDispositivo({ platform: "android" }),
      (fallo) => fallo.message.includes("identificador de instalacion")
    );

    assert.equal(llamadas.length, 0);
  });

  it("propaga el error de validacion real del Backend (422)", async () => {
    await guardarTokens({ accessToken: "access_1", refreshToken: "refresh_1" });
    configurarPeticion(
      crearPeticion({
        [REGISTRO]: {
          estado: 422,
          body: { error: { code: "VALIDATION_ERROR", message: "Los datos enviados no son validos.", details: [{ field: "platform", message: "Plataforma no soportada. Valores: android, ios." }] } }
        }
      })
    );

    await assert.rejects(
      () => registrarDispositivo({ installationId: "expo-xyz", platform: "windows" }),
      (fallo) => {
        assert.ok(fallo instanceof ErrorDeApi);
        assert.equal(fallo.codigo, "VALIDATION_ERROR");
        assert.equal(fallo.estado, 422);
        assert.equal(fallo.mensaje, "Los datos enviados no son validos.");
        assert.deepEqual(fallo.detalles[0].field, "platform");
        return true;
      }
    );
  });
});

describe("dispositivos - listado y sesion", () => {
  it("lista los dispositivos del usuario con Bearer", async () => {
    await guardarTokens({ accessToken: "access_1", refreshToken: "refresh_1" });
    configurarPeticion(
      crearPeticion({ [REGISTRO]: { estado: 200, body: { data: [DISPOSITIVO_DATA] } } })
    );

    const datos = await listarDispositivos();

    assert.deepEqual(datos, [DISPOSITIVO_DATA]);
    assert.equal(llamadas[0].metodo, "GET");
    assert.equal(llamadas[0].cabeceras.Authorization, "Bearer access_1");
  });

  it("renueva la sesion ante 401 y reintenta una sola vez", async () => {
    await guardarTokens({ accessToken: "access_vencido", refreshToken: "refresh_1" });

    let refrescos = 0;
    let intentos = 0;

    configurarPeticion(
      crearPeticion({
        [REGISTRO]: () => {
          intentos += 1;
          return intentos === 1
            ? { estado: 401, body: errorPayload("UNAUTHENTICATED", "Token expirado") }
            : { estado: 200, body: { data: [] } };
        },
        [REFRESH]: () => {
          refrescos += 1;
          return { estado: 200, body: sesionPayload("access_2", "refresh_2") };
        }
      })
    );

    assert.deepEqual(await listarDispositivos(), []);
    assert.equal(intentos, 2);
    assert.equal(refrescos, 1);
    assert.equal(leerAccessToken(), "access_2");
  });

  it("limpia la sesion si la renovacion falla", async () => {
    await guardarTokens({ accessToken: "access_vencido", refreshToken: "refresh_1" });

    let avisos = 0;
    const baja = suscribirAEstadoDeSesion(() => {
      avisos += 1;
    });

    configurarPeticion(
      crearPeticion({
        [REGISTRO]: { estado: 401, body: errorPayload("UNAUTHENTICATED", "Token expirado") },
        [REFRESH]: { estado: 401, body: errorPayload("UNAUTHENTICATED", "Refresh token inválido") }
      })
    );

    await assert.rejects(() => listarDispositivos(), (fallo) => fallo.estado === 401);

    baja();

    assert.equal(haySesionGuardada(), false);
    assert.equal(avisos, 1);
  });

  it("no llama a la API sin token guardado", async () => {
    configurarPeticion(crearPeticion({ [REGISTRO]: { estado: 200, body: { data: [] } } }));

    await assert.rejects(() => listarDispositivos(), (fallo) => fallo.codigo === "UNAUTHENTICATED");
    assert.equal(llamadas.length, 0);
  });
});

describe("dispositivos - desasociacion", () => {
  it("desasocia el device propio con DELETE al id correcto", async () => {
    await guardarTokens({ accessToken: "access_1", refreshToken: "refresh_1" });
    configurarPeticion(
      crearPeticion({
        [DISPOSITIVO]: {
          estado: 200,
          body: { data: { ...DISPOSITIVO_DATA, isActive: false } }
        }
      })
    );

    const datos = await desasociarDispositivo("dev_123_abc");

    assert.deepEqual(datos, { ...DISPOSITIVO_DATA, isActive: false });
    assert.equal(llamadas[0].metodo, "DELETE");
    assert.equal(llamadas[0].cuerpo, undefined);
    assert.equal(llamadas[0].cabeceras.Authorization, "Bearer access_1");
  });

  it("propaga 404 para device ajeno o inexistente sin revelar datos", async () => {
    await guardarTokens({ accessToken: "access_1", refreshToken: "refresh_1" });
    configurarPeticion(
      crearPeticion({
        [DISPOSITIVO]: { estado: 404, body: errorPayload("NOT_FOUND", "Dispositivo no encontrado") }
      })
    );

    await assert.rejects(() => desasociarDispositivo("dev_123_abc"), (fallo) => {
      assert.equal(fallo.codigo, "NOT_FOUND");
      assert.equal(fallo.estado, 404);
      return true;
    });
  });

  it("falla localmente si falta el identificador", async () => {
    await assert.rejects(() => desasociarDispositivo(""), (fallo) =>
      fallo.message.includes("identificador")
    );
  });
});

describe("dispositivos - seguridad", () => {
  it("no registra tokens push, tokens de sesion ni cabeceras", async () => {
    const registros = [];
    configurarRegistro((dato) => registros.push(dato));

    await guardarTokens({ accessToken: "access_secreto", refreshToken: "refresh_secreto" });
    configurarPeticion(
      crearPeticion({
        [REGISTRO]: { estado: 201, body: { data: DISPOSITIVO_DATA } }
      })
    );

    await registrarDispositivo({ installationId: "expo-xyz", platform: "android", pushToken: TOKEN_PUSH });

    configurarRegistro(null);

    const volcado = JSON.stringify(registros);

    assert.ok(registros.length > 0);
    assert.equal(volcado.includes("access_secreto"), false);
    assert.equal(volcado.includes("refresh_secreto"), false);
    assert.equal(volcado.includes(TOKEN_PUSH), false);
    assert.equal(volcado.toLowerCase().includes("authorization"), false);
  });

  it("las respuestas sin token no contienen el token push", async () => {
    await guardarTokens({ accessToken: "access_1", refreshToken: "refresh_1" });
    configurarPeticion(
      crearPeticion({
        [REGISTRO]: { estado: 200, body: { data: DISPOSITIVO_DATA } }
      })
    );

    const datos = await registrarDispositivo({ installationId: "expo-xyz", platform: "android", pushToken: TOKEN_PUSH });

    assert.equal("pushToken" in datos, false);
    assert.equal(datos.hasPushToken, true);
  });

  it("solo usa el header Authorization con Bearer", async () => {
    await guardarTokens({ accessToken: "access_1", refreshToken: "refresh_1" });
    configurarPeticion(
      crearPeticion({
        [REGISTRO]: { estado: 200, body: { data: [DISPOSITIVO_DATA] } },
        [DISPOSITIVO]: { estado: 200, body: { data: { ...DISPOSITIVO_DATA, isActive: false } } }
      })
    );

    await listarDispositivos();
    await desasociarDispositivo("dev_123_abc");

    for (const llamada of llamadas) {
      assert.match(llamada.cabeceras.Authorization, /^Bearer /);
    }
  });
});
