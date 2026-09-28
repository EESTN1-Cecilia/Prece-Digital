import attendanceAlertsService from "./attendance-alerts.service.mjs";
import attendanceAlertsConfigService, { escuelaDe } from "./configuracion.service.mjs";
import attendanceInasistenciasService from "./inasistencias.service.mjs";

function query(url) {
  return Object.fromEntries(url.searchParams.entries());
}

/* Inasistencias: el insumo de la deteccion. El alta y la modificacion devuelven
   ademas el resultado de la evaluacion, porque el registro de una inasistencia es
   lo que puede disparar una alerta. */
export function createInasistencia({ body, user }) {
  return attendanceAlertsService.registrarInasistencia(body, user);
}

export function getInasistencia({ params, user }) {
  return attendanceInasistenciasService.getInasistencia(params.inasistenciaId, user);
}

export function listInasistencias({ url, user }) {
  return attendanceInasistenciasService.listInasistencias(query(url), user);
}

export function updateInasistencia({ params, body, user }) {
  return attendanceAlertsService.actualizarInasistencia(params.inasistenciaId, body, user);
}

export function deactivateInasistencia({ params, body, user }) {
  return attendanceAlertsService.bajaInasistencia(params.inasistenciaId, body, user);
}

export function getInasistenciasDeAlumno({ params, url, user }) {
  return attendanceInasistenciasService.getInasistenciasDeAlumno(params.alumnoId, query(url), user);
}

/* Alertas */
export function getAlerta({ params, user }) {
  return attendanceAlertsService.getAlerta(params.alertaId, user);
}

export function listAlertas({ url, user }) {
  return attendanceAlertsService.listAlertas(query(url), user);
}

export function updateAlerta({ params, body, user }) {
  return attendanceAlertsService.updateAlerta(params.alertaId, body, user);
}

export function getAlertasDeAlumno({ params, url, user }) {
  return attendanceAlertsService.getAlertasDeAlumno(params.alumnoId, query(url), user);
}

export function getResumenDeAlumno({ params, user }) {
  return attendanceAlertsService.getResumenDeAlumno(params.alumnoId, user);
}

/* Deteccion */
export function evaluarAlertas({ body, user }) {
  return attendanceAlertsService.evaluarEscuela({
    alumnoId: body?.alumnoId,
    disparador: "periodica",
    user
  });
}

export function listEvaluaciones({ url, user }) {
  return attendanceAlertsService.listEvaluaciones(query(url), user);
}

export function reenviarNotificacion({ params, user }) {
  return attendanceAlertsService.reenviarNotificacion(params.alertaId, user);
}

/* Configuracion institucional de la regla */
export function getConfiguracion({ user }) {
  return attendanceAlertsConfigService.getConfiguracion(escuelaDe(user));
}

export function updateConfiguracion({ body, user }) {
  return attendanceAlertsConfigService.updateConfiguracion(escuelaDe(user), body, user.id);
}

export function getCatalogos() {
  return attendanceAlertsConfigService.getCatalogos();
}
