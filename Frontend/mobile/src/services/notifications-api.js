/* Acceso a notificaciones para el usuario autenticado.
   Reutiliza el cliente HTTP comun (api.js) y los endpoints existentes de la
   API comun. El Backend determina el destinatario con el access token, por lo
   que Mobile nunca envia userId como autoridad. */

import { pedir } from "./api.js";

const RUTA_NOTIFICACIONES = "/api/v1/notifications";

/* GET /api/v1/notifications -> { data: notificacion[] } */
export async function listarNotificaciones(filtros = {}) {
  const parametros = new URLSearchParams();

  if (filtros.type) {
    parametros.set("type", filtros.type);
  }
  if (typeof filtros.isRead === "boolean") {
    parametros.set("isRead", filtros.isRead ? "true" : "false");
  }
  if (filtros.schoolId) {
    parametros.set("schoolId", filtros.schoolId);
  }
  if (filtros.priority) {
    parametros.set("priority", filtros.priority);
  }

  const consulta = parametros.toString();
  return pedir(consulta ? `${RUTA_NOTIFICACIONES}?${consulta}` : RUTA_NOTIFICACIONES, { metodo: "GET" });
}

/* GET /api/v1/notifications/unread-count -> { data: { unreadCount } } */
export async function obtenerContadorNoLeidas() {
  const datos = await pedir(`${RUTA_NOTIFICACIONES}/unread-count`, { metodo: "GET" });
  return typeof datos?.unreadCount === "number" ? datos.unreadCount : 0;
}

/* GET /api/v1/notifications/:notificationId -> { data: notificacion } */
export async function obtenerNotificacion(id) {
  if (!id) {
    throw new Error("Se requiere el identificador de la notificacion");
  }
  return pedir(`${RUTA_NOTIFICACIONES}/${id}`, { metodo: "GET" });
}

/* POST /api/v1/notifications/:notificationId/read -> { data: notificacion } */
export async function marcarNotificacionComoLeida(id) {
  if (!id) {
    throw new Error("Se requiere el identificador de la notificacion");
  }
  return pedir(`${RUTA_NOTIFICACIONES}/${id}/read`, { metodo: "POST" });
}

/* POST /api/v1/notifications/read-all -> { data: { markedAsRead } } */
export async function marcarTodasComoLeidas() {
  return pedir(`${RUTA_NOTIFICACIONES}/read-all`, { metodo: "POST" });
}
