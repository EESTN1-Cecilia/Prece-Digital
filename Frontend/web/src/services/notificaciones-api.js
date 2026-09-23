/* Adaptador de notificaciones y alertas institucionales del usuario autenticado.
     GET  /api/v1/notifications
     POST /api/v1/notifications/:id/read
     POST /api/v1/notifications/read-all
     POST /api/v1/alerts/:id/dismiss */

import { ErrorApi, pedir } from "./http.js";

export { ErrorApi };

export const TIPOS = [
  { id: "todas", nombre: "Todas" },
  { id: "urgente", nombre: "Alertas Urgentes" },
  { id: "ausencia", nombre: "Inasistencias" },
  { id: "academico", nombre: "Académicas" },
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
    id: primero(crudo, ["id", "notificacion_id", "notificationId", "alertaId"]),
    tipo: primero(crudo, ["tipo", "type", "severidad"]) ?? "sistema",
    titulo: primero(crudo, ["titulo", "title", "asunto", "descripcion"]) || "Notificación institucional",
    detalle: primero(crudo, ["detalle", "mensaje", "message", "body", "descripcion"]) || "",
    alumno: primero(crudo, ["alumno", "student"]),
    curso: primero(crudo, ["curso", "course"]),
    destino: primero(crudo, ["destino", "enlace", "link", "url"]),
    creadaEn: primero(crudo, ["creadaEn", "creada_en", "createdAt", "created_at", "fecha"]) || new Date().toISOString(),
    leida: leida === true || leida === 1
  };
}

export async function listarNotificaciones() {
  let items = [];

  try {
    const cuerpo = await pedir("/api/v1/notifications");
    const lista = Array.isArray(cuerpo) ? cuerpo : (cuerpo?.items ?? cuerpo?.data ?? []);
    if (lista.length > 0) {
      items = lista.map(normalizarNotificacion);
    }
  } catch {
    // Si no está disponible el endpoint de notificaciones, consultar alertas
  }

  if (items.length === 0) {
    try {
      const dash = await pedir("/api/v1/dashboard/secretaria");
      if (Array.isArray(dash?.alertas) && dash.alertas.length > 0) {
        items = dash.alertas.map((alerta) => ({
          id: alerta.id,
          tipo: alerta.tipo || "urgente",
          titulo: alerta.titulo || `Alerta: ${alerta.alumno || "Estudiante"}`,
          detalle: alerta.mensaje || alerta.descripcion || `Situación de ${alerta.tipo || "alerta"} en curso ${alerta.curso || ""}`,
          alumno: alerta.alumno,
          curso: alerta.curso,
          destino: alerta.alumnoId ? `#/alumnos/${alerta.alumnoId}` : "#/alumnos",
          creadaEn: alerta.fecha || new Date().toISOString(),
          leida: false
        }));
      }
    } catch {
      // Ignorar fallback
    }
  }

  return { data: items, origen: "api" };
}

export function marcarNotificacionLeida(id) {
  return pedir(`/api/v1/notifications/${encodeURIComponent(id)}/read`, { method: "POST" }).catch(() => true);
}

export function marcarTodasLasNotificacionesLeidas() {
  return pedir("/api/v1/notifications/read-all", { method: "POST" }).catch(() => true);
}

export async function descartarNotificacionApi(id) {
  try {
    await pedir(`/api/v1/alerts/${encodeURIComponent(id)}/dismiss`, { method: "POST" });
  } catch {
    // Manejado en el estado local
  }
  return true;
}
