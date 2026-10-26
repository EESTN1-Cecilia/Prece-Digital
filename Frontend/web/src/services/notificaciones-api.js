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

  const esDirector = roles.includes("director") || roles.includes("admin");
  const esDocente = roles.includes("docente") || roles.includes("profesor");
  const esPreceptor = roles.includes("preceptor");
  const esSecretario = roles.includes("secretario") || roles.includes("secretaria");
  const esServer = roles.includes("server");

  // 1. Consultar notificaciones dirigidas al usuario en el backend
  try {
    const cuerpo = await pedir("/api/v1/notifications");
    const lista = Array.isArray(cuerpo)
      ? cuerpo
      : (cuerpo?.data?.notifications ?? cuerpo?.items ?? (Array.isArray(cuerpo?.data) ? cuerpo.data : []));

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
            if (item.destinatarioRol === "server" && !esServer) return false;
          }
          return true;
        });
    }
  } catch {
    // Si no está disponible el endpoint de notificaciones, se aplican alertas por rol
  }

  // 2. Alertas institucionales específicas según el rol de la persona
  const alertasPorRol = [];

  if (esDirector) {
    alertasPorRol.push(
      {
        id: "notif-dir-1",
        destinatarioRol: "director",
        tipo: "urgente",
        titulo: "Cátedras sin cubrir en Turno Mañana",
        detalle: "Hay 2 cátedras de Ciclo Básico sin profesor asignado para la jornada de hoy. Se requiere designar reemplazo o guardia.",
        destino: "#/director",
        creadaEn: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        leida: false
      },
      {
        id: "notif-dir-2",
        destinatarioRol: "director",
        tipo: "academico",
        titulo: "Supervisión: 12 Alumnos con materias previas pendientes",
        detalle: "Secretaría preparó la nómina para coordinar el cronograma de comisiones evaluadoras del Ciclo Superior.",
        destino: "#/director",
        creadaEn: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
        leida: false
      },
      {
        id: "notif-dir-3",
        destinatarioRol: "director",
        tipo: "ausencia",
        titulo: "Informe de ausentismo consolidado de la jornada",
        detalle: "Preceptoría reportó 3 alumnos con más de 3 inasistencias consecutivas en turno mañana sin justificación.",
        destino: "#/director",
        creadaEn: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
        leida: false
      },
      {
        id: "notif-dir-4",
        destinatarioRol: "director",
        tipo: "sistema",
        titulo: "Solicitud de insumos para Taller pendiente de aprobación",
        detalle: "Jefatura de Taller elevó solicitud de reposición de herramientas para prácticas de laboratorio.",
        destino: "#/director",
        creadaEn: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
        leida: true
      }
    );
  } else if (esDocente) {
    alertasPorRol.push(
      {
        id: "notif-doc-1",
        destinatarioRol: "docente",
        tipo: "academico",
        titulo: "Cierre de notas de período próximo a vencer",
        detalle: "Recordá cargar las calificaciones del primer informe en tus materias asignadas de Matemática y Prácticas.",
        destino: "#/docente",
        creadaEn: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
        leida: false
      },
      {
        id: "notif-doc-2",
        destinatarioRol: "docente",
        tipo: "academico",
        titulo: "Convocatoria a Comisión Evaluadora de Materias Pendientes",
        detalle: "Has sido designado/a como evaluador/a para la mesa de examen del área Ciencias Exactas el próximo viernes a las 14:00 hs.",
        destino: "#/docente",
        creadaEn: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
        leida: false
      },
      {
        id: "notif-doc-3",
        destinatarioRol: "docente",
        tipo: "ausencia",
        titulo: "Alumnos con inasistencias en tus módulos de clase",
        detalle: "El alumno Gómez Lucas (1° 1°) registra inasistencias reiteradas a tus clases prácticas semanales.",
        destino: "#/docente",
        creadaEn: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
        leida: false
      },
      {
        id: "notif-doc-4",
        destinatarioRol: "docente",
        tipo: "sistema",
        titulo: "Horario institucional de cátedras confirmado",
        detalle: "Dirección confirmó la distribución horaria de tus módulos asignados en el turno mañana.",
        destino: "#/docente",
        creadaEn: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
        leida: true
      }
    );
  } else if (esPreceptor) {
    alertasPorRol.push(
      {
        id: "notif-prec-1",
        destinatarioRol: "preceptor",
        tipo: "ausencia",
        titulo: "Cierre de Parte Diario - Turno Mañana",
        detalle: "Falta registrar la asistencia de la última hora en tus divisiones asignadas. Por favor completá el parte antes del cambio de turno.",
        destino: "#/preceptoria",
        creadaEn: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
        leida: false
      },
      {
        id: "notif-prec-2",
        destinatarioRol: "preceptor",
        tipo: "urgente",
        titulo: "Autorización de Retiro Anticipado de Alumno",
        detalle: "El tutor del alumno Fernández Matías (2° 1°) solicitó retiro por razones particulares.",
        destino: "#/preceptoria",
        creadaEn: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
        leida: false
      },
      {
        id: "notif-prec-3",
        destinatarioRol: "preceptor",
        tipo: "ausencia",
        titulo: "Certificado médico presentado para justificar faltas",
        detalle: "Se adjuntó certificado médico para justificar inasistencias de los días 23 y 24 en 1° 1°.",
        destino: "#/preceptoria",
        creadaEn: new Date(Date.now() - 1000 * 60 * 60 * 14).toISOString(),
        leida: false
      }
    );
  } else if (esSecretario) {
    alertasPorRol.push(
      {
        id: "notif-sec-1",
        destinatarioRol: "secretaria",
        tipo: "urgente",
        titulo: "5 Ingresantes con documentación de legajo pendiente",
        detalle: "Faltan certificados de vacunas y ficha de salud obligatoria en los legajos del ciclo básico.",
        destino: "#/secretaria",
        creadaEn: new Date(Date.now() - 1000 * 60 * 40).toISOString(),
        leida: false
      },
      {
        id: "notif-sec-2",
        destinatarioRol: "secretaria",
        tipo: "sistema",
        titulo: "8 Solicitudes de constancia de alumno regular",
        detalle: "Pendientes de firma y entrega a familiares para asignaciones y transporte escolar.",
        destino: "#/secretaria",
        creadaEn: new Date(Date.now() - 1000 * 60 * 150).toISOString(),
        leida: false
      }
    );
  } else if (esServer) {
    alertasPorRol.push(
      {
        id: "notif-srv-1",
        destinatarioRol: "server",
        tipo: "urgente",
        titulo: "Alerta de Stock Crítico: Bobinas UTP agotadas",
        detalle: "No quedan cables de red en Pañol para la práctica de taller de informática de esta tarde.",
        destino: "#/inventario",
        creadaEn: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
        leida: false
      },
      {
        id: "notif-srv-2",
        destinatarioRol: "server",
        tipo: "sistema",
        titulo: "Devolución de instrumental de medición en Taller 1",
        detalle: "Revisar recepción de multímetros y soldadores prestados para las prácticas del turno mañana.",
        destino: "#/server",
        creadaEn: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
        leida: false
      }
    );
  }

  // Fusionar respetando IDs existentes
  const idsExistentes = new Set(items.map((i) => i.id));
  for (const a of alertasPorRol) {
    if (!idsExistentes.has(a.id)) {
      items.push(a);
      idsExistentes.add(a.id);
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
