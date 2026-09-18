/* Adaptador de notificaciones del usuario autenticado.

     GET  /api/v1/notifications
     POST /api/v1/notifications/:id/read
     POST /api/v1/notifications/read-all

   Sin datos de prueba: si el backend rechaza, la pantalla lo dice. */

import { ErrorApi, pedir } from "./http.js";

export { ErrorApi };

/* Tipos previstos por la issue #59 del frontend. El filtro del centro de
   notificaciones se arma con esta lista. */
export const TIPOS = [
  { id: "solicitud", nombre: "Solicitudes" },
  { id: "ausencia", nombre: "Ausencias" },
  { id: "horario", nombre: "Horarios" },
  { id: "reserva", nombre: "Reservas" },
  { id: "sistema", nombre: "Sistema" }
];

function primero(objeto, claves) {
  for (const clave of claves) {
    const valor = objeto?.[clave];

    if (valor !== undefined && valor !== null && valor !== "") {
      return valor;
    }
  }

  return null;
}

/* Lista blanca: a la vista solo llegan estos campos. */
export function normalizarNotificacion(crudo) {
  const leida = primero(crudo, ["leida", "read", "leido", "isRead"]);

  return {
    id: primero(crudo, ["id", "notificacion_id", "notificationId"]),
    tipo: primero(crudo, ["tipo", "type"]) ?? "sistema",
    titulo: primero(crudo, ["titulo", "title", "asunto"]),
    detalle: primero(crudo, ["detalle", "mensaje", "message", "body"]),
    /* Ruta interna a la que lleva la notificacion, si corresponde. */
    destino: primero(crudo, ["destino", "enlace", "link", "url"]),
    creadaEn: primero(crudo, ["creadaEn", "creada_en", "createdAt", "created_at"]),
    leida: leida === true || leida === 1
  };
}

export async function listarNotificaciones() {
  const cuerpo = await pedir("/api/v1/notifications");
  const lista = Array.isArray(cuerpo) ? cuerpo : (cuerpo?.items ?? []);

  return { data: lista.map(normalizarNotificacion), origen: "api" };
}

export function marcarNotificacionLeida(id) {
  return pedir(`/api/v1/notifications/${encodeURIComponent(id)}/read`, { method: "POST" });
}

export function marcarTodasLasNotificacionesLeidas() {
  return pedir("/api/v1/notifications/read-all", { method: "POST" });
}
