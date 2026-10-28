/* Tests de notificaciones para Mobile.
   Replican el contrato real de la API comun
   (Backend/modules/notifications/* y Backend/routes/index.mjs):
   - listar, contador, detalle y marcado requieren Bearer;
   - el Backend fija el destinatario con el token (Mobile nunca envia userId);
   - ante 401 actua la renovacion unica ya existente en api.js. */

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
  listarNotificaciones,
  marcarNotificacionComoLeida,
  marcarTodasComoLeidas,
  obtenerContadorNoLeidas,
  obtenerNotificacion
} from "../src/services/notifications-api.js";
import {
  configurarAlmacenamientoSeguro,
  crearAlmacenamientoEnMemoria
} from "../src/services/secure-store.js";
import {
  guardarTokens,
  haySesionGuardada,
  leerAccessToken,
  limpiarTokens,
  reiniciarCacheDeTokens
} from "../src/services/session-tokens.js";

/* Rutas reales de la API comun. */
const LISTAR = "/api/v1/notifications";
const NO_LEIDAS = "/api/v1/notifications/unread-count";
const LEER_TODAS = "/api/v1/notifications/read-all";
const DETALLE = "/api/v1/notifications/ntf_1";
const MARCAR = "/api/v1/notifications/ntf_1/read";

const LISTA = [
  {
    id: "ntf_1",
    recipientId: "usr_1",
    title: "Reserva aprobada",
    body: "Tu reserva de proyector fue aprobada.",
    type: "reserva",
    referenceType: "reservation",
    referenceId: "res_9",
    priority: "normal",
    isRead: false,
    readAt: null,
    schoolId: "esc_1",
    createdAt: "2026-05-10T14:00:00.000Z"
  },
  {
    id: "ntf_2",
    recipientId: "usr_1",
    title: "Recordatorio",
    body: "Registra tu asistencia antes de las 8:00.",
    type: "recordatorio",
    referenceType: null,
    referenceId: null,
    priority: "baja",
    isRead: true,
    readAt: "2026-05-10T15:00:00.000Z",
    schoolId: "esc_1",
    createdAt: "2026-05-10T08:00:00.000Z"
  }
];

const DETALLE_DATA = LISTA[0];
const MARCADA = { ...LISTA[0], isRead: true, readAt: "2026-05-11T10:00:00.000Z" };

function sesionPayload(accessToken, refreshToken) {
  return {
    accessToken,
    refreshToken,
    tokenType: "Bearer",
    id: "usr_1",
    email: "secretaria@prece.local",
    displayName: "Secretaria Escuela",
    roles: ["secretario"],
    permisos: ["notifications.read", "notifications.write"],
    alcances: ["notifications"]
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

describe("notificaciones - consulta", () => {
  it("lista con Bearer y deja que el Backend fije el destinatario", async () => {
    await guardarTokens({ accessToken: "access_1", refreshToken: "refresh_1" });
    configurarPeticion(
      crearPeticion({ [LISTAR]: { estado: 200, body: { data: LISTA } } })
    );

    const datos = await listarNotificaciones();

    assert.deepEqual(datos, LISTA);
    assert.equal(llamadas.length, 1);
    assert.equal(llamadas[0].ruta, LISTAR);
    assert.equal(llamadas[0].metodo, "GET");
    assert.equal(llamadas[0].cabeceras.Authorization, "Bearer access_1");
    assert.equal(llamadas[0].cabeceras["Content-Type"], undefined);
  });

  it("reenvia solo los filtros soportados por la API comun", async () => {
    await guardarTokens({ accessToken: "access_1", refreshToken: "refresh_1" });
    configurarPeticion(
      crearPeticion({ [`${LISTAR}?type=reserva&isRead=false&priority=normal`]: { estado: 200, body: { data: [LISTA[0]] } } })
    );

    const datos = await listarNotificaciones({ type: "reserva", isRead: false, priority: "normal" });

    assert.deepEqual(datos, [LISTA[0]]);
    assert.equal(llamadas[0].ruta, `${LISTAR}?type=reserva&isRead=false&priority=normal`);
  });

  it("devuelve lista vacia cuando no hay notificaciones", async () => {
    await guardarTokens({ accessToken: "access_1", refreshToken: "refresh_1" });
    configurarPeticion(crearPeticion({ [LISTAR]: { estado: 200, body: { data: [] } } }));

    const datos = await listarNotificaciones();

    assert.deepEqual(datos, []);
  });

  it("obtiene el contador de no leidas", async () => {
    await guardarTokens({ accessToken: "access_1", refreshToken: "refresh_1" });
    configurarPeticion(
      crearPeticion({ [NO_LEIDAS]: { estado: 200, body: { data: { unreadCount: 2 } } } })
    );

    const contador = await obtenerContadorNoLeidas();

    assert.equal(contador, 2);
    assert.equal(llamadas[0].ruta, NO_LEIDAS);
    assert.equal(llamadas[0].metodo, "GET");
    assert.equal(llamadas[0].cabeceras.Authorization, "Bearer access_1");
  });

  it("obtiene el detalle de una notificacion por id", async () => {
    await guardarTokens({ accessToken: "access_1", refreshToken: "refresh_1" });
    configurarPeticion(crearPeticion({ [DETALLE]: { estado: 200, body: { data: DETALLE_DATA } } }));

    const datos = await obtenerNotificacion("ntf_1");

    assert.deepEqual(datos, DETALLE_DATA);
    assert.equal(llamadas[0].ruta, DETALLE);
    assert.equal(llamadas[0].metodo, "GET");
  });

  it("propaga los errores reales del Backend (404 y 403)", async () => {
    await guardarTokens({ accessToken: "access_1", refreshToken: "refresh_1" });
    configurarPeticion(
      crearPeticion({
        [DETALLE]: { estado: 404, body: errorPayload("NOT_FOUND", "Notificación no encontrada") },
        [MARCAR]: { estado: 403, body: errorPayload("FORBIDDEN", "No tiene permisos para modificar esta notificación") }
      })
    );

    await assert.rejects(() => obtenerNotificacion("ntf_1"), (fallo) => {
      assert.ok(fallo instanceof ErrorDeApi);
      assert.equal(fallo.codigo, "NOT_FOUND");
      assert.equal(fallo.estado, 404);
      return true;
    });

    await assert.rejects(() => marcarNotificacionComoLeida("ntf_1"), (fallo) => {
      assert.equal(fallo.codigo, "FORBIDDEN");
      assert.equal(fallo.estado, 403);
      assert.equal(fallo.mensaje, "No tiene permisos para modificar esta notificación");
      return true;
    });
  });
});

describe("notificaciones - sesion", () => {
  it("renueva el token ante 401 y reintenta una sola vez", async () => {
    await guardarTokens({ accessToken: "access_vencido", refreshToken: "refresh_1" });

    let refrescos = 0;
    let intentos = 0;

    configurarPeticion(
      crearPeticion({
        [LISTAR]: () => {
          intentos += 1;
          return intentos === 1
            ? { estado: 401, body: errorPayload("UNAUTHENTICATED", "Token expirado") }
            : { estado: 200, body: { data: LISTA } };
        },
        "/api/v1/auth/refresh": () => {
          refrescos += 1;
          return { estado: 200, body: sesionPayload("access_2", "refresh_2") };
        }
      })
    );

    const datos = await listarNotificaciones();

    assert.deepEqual(datos, LISTA);
    assert.equal(intentos, 2);
    assert.equal(refrescos, 1);
    assert.equal(leerAccessToken(), "access_2");
    assert.equal(llamadas[0].cabeceras.Authorization, "Bearer access_vencido");
    assert.equal(llamadas[1].cabeceras.Authorization, undefined);
    assert.equal(llamadas[2].cabeceras.Authorization, "Bearer access_2");
  });

  it("limpia la sesion local si la renovacion tambien falla", async () => {
    await guardarTokens({ accessToken: "access_vencido", refreshToken: "refresh_1" });

    let avisos = 0;
    const baja = suscribirAEstadoDeSesion(() => {
      avisos += 1;
    });

    configurarPeticion(
      crearPeticion({
        [LISTAR]: { estado: 401, body: errorPayload("UNAUTHENTICATED", "Token expirado") },
        "/api/v1/auth/refresh": { estado: 401, body: errorPayload("UNAUTHENTICATED", "Refresh token inválido") }
      })
    );

    await assert.rejects(() => listarNotificaciones(), (fallo) => fallo.estado === 401);

    baja();

    assert.equal(haySesionGuardada(), false);
    assert.equal(avisos, 1);
  });

  it("no llama a la API sin token guardado", async () => {
    configurarPeticion(crearPeticion({ [LISTAR]: { estado: 200, body: { data: [] } } }));

    await assert.rejects(() => listarNotificaciones(), (fallo) => fallo.codigo === "UNAUTHENTICATED");

    assert.equal(llamadas.length, 0);
  });
});

describe("notificaciones - marcado", () => {
  it("marca una notificacion con POST al id correcto y sin enviar userId", async () => {
    await guardarTokens({ accessToken: "access_1", refreshToken: "refresh_1" });
    configurarPeticion(crearPeticion({ [MARCAR]: { estado: 200, body: { data: MARCADA } } }));

    const datos = await marcarNotificacionComoLeida("ntf_1");

    assert.deepEqual(datos, MARCADA);
    assert.equal(datos.isRead, true);
    assert.equal(llamadas[0].ruta, MARCAR);
    assert.equal(llamadas[0].metodo, "POST");
    assert.equal(llamadas[0].cuerpo, undefined);
    assert.equal(llamadas[0].cabeceras.Authorization, "Bearer access_1");
  });

  it("propaga 404 si la notificacion no existe", async () => {
    await guardarTokens({ accessToken: "access_1", refreshToken: "refresh_1" });
    configurarPeticion(
      crearPeticion({ [MARCAR]: { estado: 404, body: errorPayload("NOT_FOUND", "Notificación no encontrada") } })
    );

    await assert.rejects(() => marcarNotificacionComoLeida("ntf_1"), (fallo) => fallo.codigo === "NOT_FOUND");
  });

  it("marca todas con POST al endpoint existente", async () => {
    await guardarTokens({ accessToken: "access_1", refreshToken: "refresh_1" });
    configurarPeticion(
      crearPeticion({ [LEER_TODAS]: { estado: 200, body: { data: { markedAsRead: 2 } } } })
    );

    const datos = await marcarTodasComoLeidas();

    assert.deepEqual(datos, { markedAsRead: 2 });
    assert.equal(llamadas[0].ruta, LEER_TODAS);
    assert.equal(llamadas[0].metodo, "POST");
    assert.equal(llamadas[0].cuerpo, undefined);
    assert.equal(llamadas[0].cabeceras.Authorization, "Bearer access_1");
  });
});

describe("notificaciones - seguridad", () => {
  it("solo usa el header Authorization con Bearer en todas las llamadas", async () => {
    await guardarTokens({ accessToken: "access_1", refreshToken: "refresh_1" });
    configurarPeticion(
      crearPeticion({
        [LISTAR]: { estado: 200, body: { data: LISTA } },
        [NO_LEIDAS]: { estado: 200, body: { data: { unreadCount: 2 } } },
        [MARCAR]: { estado: 200, body: { data: MARCADA } }
      })
    );

    await listarNotificaciones();
    await obtenerContadorNoLeidas();
    await marcarNotificacionComoLeida("ntf_1");

    for (const llamada of llamadas) {
      assert.match(llamada.cabeceras.Authorization, /^Bearer /);
      const claves = Object.keys(llamada.cabeceras);
      assert.equal(claves.every((c) => c === "Accept" || c === "Authorization" || c === "Content-Type"), true);
    }
  });

  it("no registra tokens, cuerpos ni cabeceras de autenticacion", async () => {
    const registros = [];
    configurarRegistro((dato) => registros.push(dato));

    await guardarTokens({ accessToken: "access_secreto", refreshToken: "refresh_secreto" });
    configurarPeticion(
      crearPeticion({
        [LISTAR]: { estado: 200, body: { data: LISTA } },
        [MARCAR]: { estado: 200, body: { data: MARCADA } }
      })
    );

    await listarNotificaciones();
    await marcarNotificacionComoLeida("ntf_1");

    configurarRegistro(null);

    const volcado = JSON.stringify(registros);

    assert.ok(registros.length > 0);
    assert.equal(volcado.includes("access_secreto"), false);
    assert.equal(volcado.includes("refresh_secreto"), false);
    assert.equal(volcado.toLowerCase().includes("authorization"), false);
    assert.equal(volcado.includes("Bearer"), false);
  });

  it("no datos falsos: la UI solo consume lo devuelto por el Backend", async () => {
    await guardarTokens({ accessToken: "access_1", refreshToken: "refresh_1" });

    let respuestas = 0;

    configurarPeticion(
      crearPeticion({
        [LISTAR]: () => {
          respuestas += 1;
          return { estado: 200, body: { data: LISTA } };
        }
      })
    );

    const primera = await listarNotificaciones();
    const segunda = await listarNotificaciones();

    assert.equal(respuestas, 2);
    assert.deepEqual(primera, segunda);
    assert.equal(primera[0].recipientId, "usr_1");
  });
});
