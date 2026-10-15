import planificacionesService from "./planificaciones.service.mjs";

export function createPlanning({ body, user }) {
  return planificacionesService.createPlanning(body, user);
}

export function getPlanning({ params }) {
  return planificacionesService.getPlanning(params.planId);
}

export function listPlannings({ url, user }) {
  return planificacionesService.listPlannings(Object.fromEntries(url.searchParams.entries()), user);
}

export function listPlanningsByTeacher({ params, url, user }) {
  return planificacionesService.listPlanningsByTeacher(
    params.teacherId,
    Object.fromEntries(url.searchParams.entries()),
    user
  );
}

export function listPlanningsBySubject({ params, url, user }) {
  return planificacionesService.listPlanningsBySubject(
    params.subjectId,
    Object.fromEntries(url.searchParams.entries()),
    user
  );
}

export function listPlanningsByCourse({ params, url, user }) {
  return planificacionesService.listPlanningsByCourse(
    params.courseId,
    Object.fromEntries(url.searchParams.entries()),
    user
  );
}

export function listPlanningsByPeriod({ params, url, user }) {
  return planificacionesService.listPlanningsByPeriod(
    params.year,
    Object.fromEntries(url.searchParams.entries()),
    user
  );
}

export function getPlanningStatus({ params, user }) {
  return planificacionesService.getStatus(params.planId, user);
}

export function getPlanningHistory({ params }) {
  return planificacionesService.getHistory(params.planId);
}

export function getPlanningCurriculumComparison({ params, user }) {
  return planificacionesService.getCurriculumComparison(params.planId, user);
}

export function updatePlanning({ params, body, user }) {
  return planificacionesService.updatePlanning(params.planId, body, user);
}

export function changePlanningStatus({ params, body, user }) {
  return planificacionesService.changeStatus(params.planId, body, user);
}

export function archivePlanning({ params, body, user }) {
  return planificacionesService.archivePlanning(params.planId, body, user);
}
