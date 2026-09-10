/* Adaptador de notificaciones.

   Endpoints esperados del backend (su issue #44, Sistema general de
   notificaciones, todavia sin empezar):

     GET   /api/v1/notifications
     PATCH /api/v1/notifications/:id      cuerpo { "leida": true }

   Mientras no existan, la lectura degrada a un juego de prueba y lo informa con
   `origen: "demo"` para que la vista lo muestre. El marcado como leida no
   degrada: si el backend rechaza, la pantalla lo dice. */

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
  const leida = primero(crudo, ["leida", "read", "leido"]);

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

const DEMO = [
  {
    id: 1,
    tipo: "solicitud",
    titulo: "Nuevo pedido de material para aprobar",
    detalle: "Taller de Electronica solicito 12 multimetros.",
    creada_en: "2026-09-06T09:20:00",
    leida: false
  },
  {
    id: 2,
    tipo: "ausencia",
    titulo: "El docente Juan Perez informo una ausencia",
    detalle: "Martes 8, modulos 3 y 4. Falta cubrir el aula.",
    creada_en: "2026-09-06T08:05:00",
    leida: false
  },
  {
    id: 3,
    tipo: "horario",
    titulo: "Se actualizo el horario del curso 4°2",
    detalle: "Matematica pasa del modulo 1 al 2 los jueves.",
    creada_en: "2026-09-05T17:40:00",
    leida: false
  },
  {
    id: 4,
    tipo: "reserva",
    titulo: "Tenes una solicitud de reserva pendiente",
    detalle: "Laboratorio de Informatica, viernes 11 a las 10:00.",
    creada_en: "2026-09-04T11:15:00",
    leida: true
  },
  {
    id: 5,
    tipo: "sistema",
    titulo: "Cierre de carga de asistencias",
    detalle: "El periodo de agosto se cierra el lunes.",
    creada_en: "2026-09-02T19:00:00",
    leida: true
  }
].map(normalizarNotificacion);

export async function listarNotificaciones() {
  try {
    const cuerpo = await pedir("/api/v1/notifications");
    const lista = Array.isArray(cuerpo) ? cuerpo : (cuerpo?.items ?? []);

    return { data: lista.map(normalizarNotificacion), origen: "api" };
  } catch (error) {
    /* Sin permiso o sin sesion no se inventa nada: eso lo decide el backend. */
    if (error.status === 401 || error.status === 403) {
      throw error;
    }

    return { data: DEMO, origen: "demo" };
  }
}

export function marcarNotificacionLeida(id) {
  return pedir(`/api/v1/notifications/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify({ leida: true })
  });
}
