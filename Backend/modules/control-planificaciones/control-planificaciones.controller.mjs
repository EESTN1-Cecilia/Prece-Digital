import controlPlanificacionesService from "./control-planificaciones.service.mjs";

export function createControl({ body, user }) {
  return controlPlanificacionesService.createControl(body, user);
}

export function getControl({ params, user }) {
  return controlPlanificacionesService.getControl(params.controlId, user);
}

export function listControls({ url, user }) {
  return controlPlanificacionesService.listControls(Object.fromEntries(url.searchParams.entries()), user);
}

export function listPendingControls({ url, user }) {
  return controlPlanificacionesService.listPendingControls(Object.fromEntries(url.searchParams.entries()), user);
}

export function listControlsByTeacher({ params, url, user }) {
  return controlPlanificacionesService.listControlsByTeacher(
    params.teacherId,
    Object.fromEntries(url.searchParams.entries()),
    user
  );
}

export function listControlsBySubject({ params, url, user }) {
  return controlPlanificacionesService.listControlsBySubject(
    params.subjectId,
    Object.fromEntries(url.searchParams.entries()),
    user
  );
}

export function listControlsByCourse({ params, url, user }) {
  return controlPlanificacionesService.listControlsByCourse(
    params.courseId,
    Object.fromEntries(url.searchParams.entries()),
    user
  );
}

export function listControlsByPeriod({ params, url, user }) {
  return controlPlanificacionesService.listControlsByPeriod(
    params.year,
    Object.fromEntries(url.searchParams.entries()),
    user
  );
}

export function listControlsByStatus({ params, url, user }) {
  return controlPlanificacionesService.listControlsByStatus(
    params.status,
    Object.fromEntries(url.searchParams.entries()),
    user
  );
}

export function getControlByPlanning({ params, user }) {
  return controlPlanificacionesService.getControlByPlanning(params.planId, user);
}

export function getPlanningControlHistory({ params, user }) {
  return controlPlanificacionesService.getPlanningControlHistory(params.planId, user);
}

export function getControlAudit({ params, user }) {
  return controlPlanificacionesService.getControlAudit(params.controlId, user);
}

export function updateControl({ params, body, user }) {
  return controlPlanificacionesService.updateControl(params.controlId, body, user);
}

export function changeControlStatus({ params, body, user }) {
  return controlPlanificacionesService.changeStatus(params.controlId, body, user);
}
