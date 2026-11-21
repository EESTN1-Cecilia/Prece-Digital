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

/* Estado de lectura y descarte guardado en el navegador, por usuario.
   Las alertas por rol se arman en el cliente y el backend no las conoce: sin esto,
   al recargar la pagina volvian a aparecer como no leidas. */
const CLAVE_ESTADO_LOCAL = "prece_notificaciones_estado";
let usuarioActivo = "anonimo";
const idsConocidosPorUsuario = new Map();

function claveDeUsuario(usuario = usuarioActivo) {
  if (typeof usuario === "string") return usuario || "anonimo";
  return String(usuario?.id ?? usuario?.email ?? "anonimo");
}

function leerEstadoLocal(usuario = usuarioActivo) {
  try {
    const crudo = JSON.parse(localStorage.getItem(`${CLAVE_ESTADO_LOCAL}:${claveDeUsuario(usuario)}`) ?? "null");
    return {
      leidas: crudo?.leidas && typeof crudo.leidas === "object" ? crudo.leidas : {},
      descartadas: Array.isArray(crudo?.descartadas) ? crudo.descartadas : []
    };
  } catch {
    return { leidas: {}, descartadas: [] };
  }
}

function guardarEstadoLocal(estado, usuario = usuarioActivo) {
  try {
    localStorage.setItem(`${CLAVE_ESTADO_LOCAL}:${claveDeUsuario(usuario)}`, JSON.stringify(estado));
  } catch {
    // Sin almacenamiento disponible: el estado vale solo para esta pagina.
  }
}

export function recordarNotificacionLeida(id, leida = true, usuario = usuarioActivo) {
  if (id === null || id === undefined) return;
  const estado = leerEstadoLocal(usuario);
  estado.leidas[String(id)] = Boolean(leida);
  guardarEstadoLocal(estado, usuario);
}

function recordarTodasLeidas(usuario = usuarioActivo) {
  const clave = claveDeUsuario(usuario);
  const estado = leerEstadoLocal(clave);
  (idsConocidosPorUsuario.get(clave) ?? []).forEach((id) => {
    estado.leidas[String(id)] = true;
  });
  guardarEstadoLocal(estado, clave);
}

function recordarDescartada(id) {
  const estado = leerEstadoLocal();
  if (!estado.descartadas.includes(String(id))) estado.descartadas.push(String(id));
  guardarEstadoLocal(estado);
}

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
    destinatarioRol: primero(crudo, ["destinatarioRol", "targetRole", "role"]),
    recipientId: primero(crudo, ["recipientId", "destinatarioId", "userId"]),
    creadaEn: primero(crudo, ["creadaEn", "creada_en", "createdAt", "created_at", "fecha"]) || new Date().toISOString(),
    leida: leida === true || leida === 1
  };
}

export async function listarNotificaciones(sesion = {}) {
  let items = [];

  // Extraer roles y usuario autenticado
  let usuario = sesion?.usuario;
  let roles = (sesion?.roles || []).map((r) => (typeof r === "string" ? r : r?.id)).filter(Boolean);

  if (!usuario || roles.length === 0) {
    try {
      const guardado = localStorage.getItem("prece_usuario");
      if (guardado) {
        const u = JSON.parse(guardado);
        usuario = usuario || u;
        if (roles.length === 0 && u.roles) {
          roles = u.roles.map((r) => (typeof r === "string" ? r : r?.id)).filter(Boolean);
        }
      }
    } catch {
      // Ignorar fallback storage
    }
  }

  usuarioActivo = claveDeUsuario(usuario);

  const esDirector = roles.includes("director") || roles.includes("admin");
  const esDocente = roles.includes("docente") || roles.includes("profesor");
  const esPreceptor = roles.includes("preceptor");
  const esSecretario = roles.includes("secretario") || roles.includes("secretaria");
  const esJefeArea = roles.includes("jefe_area");
  const esServer = roles.includes("server");

  // 1. Consultar notificaciones dirigidas al usuario en el backend
  try {
    const cuerpo = await pedir("/api/v1/notifications");
    const lista = Array.isArray(cuerpo)
      ? cuerpo
      : (cuerpo?.notifications ?? cuerpo?.data?.notifications ?? cuerpo?.items ?? (Array.isArray(cuerpo?.data) ? cuerpo.data : []));

    if (Array.isArray(lista) && lista.length > 0) {
      items = lista
        .map(normalizarNotificacion)
        .filter((item) => {
          // Si tiene destinatario específico, debe coincidir
          if (item.recipientId && usuario?.id && item.recipientId !== usuario.id) {
            return false;
          }
          if (item.destinatarioRol) {
            if (item.destinatarioRol === "director" && !esDirector) return false;
            if (item.destinatarioRol === "docente" && !esDocente) return false;
            if (item.destinatarioRol === "preceptor" && !esPreceptor) return false;
            if (item.destinatarioRol === "secretaria" && !esSecretario) return false;
            if (item.destinatarioRol === "jefe_area" && !esJefeArea) return false;
            if (item.destinatarioRol === "server" && !esServer) return false;
          }
          return true;
        });
    }
  } catch {
    // Si no está disponible el endpoint de notificaciones, se aplican alertas por rol
  }

  /* Sin alertas de ejemplo: cada persona ve solo las notificaciones que el
     backend genero para su cuenta (GET /api/v1/notifications devuelve solo las
     del usuario del token). */

  // Aplicar lo que la persona ya leyo o descarto (sobrevive a recargar la pagina)
  const local = leerEstadoLocal(usuarioActivo);
  items = items
    .filter((item) => !local.descartadas.includes(String(item.id)))
    .map((item) => (String(item.id) in local.leidas ? { ...item, leida: local.leidas[String(item.id)] } : item));
  idsConocidosPorUsuario.set(usuarioActivo, items.map((item) => item.id));

  return { data: items, origen: "api" };
}

export function marcarNotificacionLeida(id, usuario = usuarioActivo) {
  recordarNotificacionLeida(id, true, usuario);
  if (String(id).startsWith("notif-")) return Promise.resolve(true);
  return pedir(`/api/v1/notifications/${encodeURIComponent(id)}/read`, { method: "POST" });
}

export function marcarTodasLasNotificacionesLeidas(usuario = usuarioActivo) {
  recordarTodasLeidas(usuario);
  return pedir("/api/v1/notifications/read-all", { method: "POST" });
}

export async function descartarNotificacionApi(id) {
  recordarDescartada(id);
  try {
    await pedir(`/api/v1/alerts/${encodeURIComponent(id)}/dismiss`, { method: "POST" });
  } catch {
    // Manejado en el estado local
  }
  return true;
}
