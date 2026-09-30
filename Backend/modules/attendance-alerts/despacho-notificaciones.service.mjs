import notificationsRepository from "../notifications/notifications.repository.mjs";
import attendanceAlertsRepository from "./attendance-alerts.repository.mjs";

/* Despacho de las alertas hacia notificaciones.

   Este archivo es el unico que sabe enviar algo. La deteccion no lo conoce: solo
   produce el evento con destinatarios, tipo, mensaje, prioridad, canal y estado,
   y este servicio lo consume.

   Reemplazar el canal interno por correo, sms o app es cambiar `canales` y el
   adaptador de abajo; la regla de deteccion no se toca. Si el canal falla, la
   alerta queda registrada con su evento en estado pendiente y se puede reintentar
   sin volver a generar la deteccion. */

export const TIPO_EVENTO = "alerta.inasistencia_consecutiva";

/* Un solo destinatario por evento: cada preceptor recibe la suya, y asi el envio
   de una familia no depende de que la otra se haya entregado. */
function construirMensaje({ alumno, alerta }) {
  const nombre = [alumno.nombre, alumno.apellido].filter(Boolean).join(" ");
  const curso = alumno.curso ? `${alumno.curso} grado` : "grado desconocido";
  const periodo =
    alerta.periodoDesde === alerta.periodoHasta
      ? alerta.periodoDesde
      : `${alerta.periodoDesde} a ${alerta.periodoHasta}`;

  return (
    `${nombre} (${curso}, division ${alumno.division ?? "sin asignar"}) acumulo ` +
    `${alerta.cantidadInasistencias} inasistencias consecutivas entre el ${periodo}. ` +
    `La escuela exige ${alerta.diasConsecutivosExigidos} inasistencias seguidas para generar una alerta.`
  );
}

export function destinatariosDe(alerta) {
  return attendanceAlertsRepository.findPreceptoresDe(alerta.escuelaId).map((usuario) => usuario.id);
}

/* Arma el evento que el sistema general de notificaciones va a consumir. */
export function construirEvento({ alerta, alumno }) {
  return {
    alertaId: alerta.id,
    escuelaId: alerta.escuelaId,
    alumnoId: alerta.alumnoId,
    tipoEvento: TIPO_EVENTO,
    destinatarios: destinatariosDe(alerta),
    tipoNotificacion: "ausencia",
    mensaje: construirMensaje({ alumno, alerta }),
    prioridad: alerta.configuracionAplicada?.prioridadNotificacion ?? "alta",
    canales: alerta.configuracionAplicada?.canales ?? ["notificacion_interna"],
    estadoEnvio: "pendiente",
    generadoEn: new Date().toISOString(),
    datos: {
      alumno: { id: alumno.id, nombre: alumno.nombre, apellido: alumno.apellido, dni: alumno.dni },
      condicion: alerta.condicion,
      cantidadInasistencias: alerta.cantidadInasistencias,
      diasConsecutivosExigidos: alerta.diasConsecutivosExigidos,
      periodoDesde: alerta.periodoDesde,
      periodoHasta: alerta.periodoHasta,
      dias: alerta.dias,
      inasistenciaIds: alerta.inasistenciaIds
    },
    clave: alerta.clave
  };
}

/* Crea el evento de una alerta y lo entrega al canal configurado. Es idempotente:
   si el evento ya fue enviado, no vuelve a notificar. */
export function despacharEvento({ alerta, alumno }) {
  const evento = attendanceAlertsRepository.crearEvento(construirEvento({ alerta, alumno }));

  return enviarEvento({ evento });
}

/* Envio propiamente dicho. Separado de la construccion para poder reintentar un
   evento que quedo pendiente sin regenerar la deteccion. */
export function enviarEvento({ evento }) {
  if (evento.estadoEnvio === "enviado") {
    return { evento, notificaciones: [], reenviada: false };
  }

  const notificaciones = evento.destinatarios.map((destinatario) =>
    notificationsRepository.create({
      recipientId: destinatario,
      title: "Alerta por inasistencias consecutivas",
      body: evento.mensaje,
      type: evento.tipoNotificacion,
      referenceType: "alerta_ausencia",
      referenceId: evento.alertaId,
      priority: evento.prioridad,
      schoolId: evento.escuelaId
    })
  );

  const enviado = attendanceAlertsRepository.marcarEventoEnviado(evento.id, notificaciones.map((n) => n.id));

  return { evento: enviado, notificaciones, reenviada: true };
}
