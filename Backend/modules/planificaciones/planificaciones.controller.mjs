import planificacionesService from "./planificaciones.service.mjs";

function query(url) {
  return Object.fromEntries(url.searchParams.entries());
}

/* ---------------- Catalogos y opciones ----------------------------------- */

export function getCatalogos() {
  return planificacionesService.getCatalogos();
}

export function getOpciones({ url, user }) {
  return planificacionesService.getOpciones(query(url), user);
}

/* ---------------- Planificaciones ---------------------------------------- */

export function listPlanificaciones({ url, user }) {
  return planificacionesService.listPlanificaciones(query(url), user);
}

export function getPlanificacion({ params, user }) {
  return planificacionesService.getPlanificacion(params.planificacionId, user);
}

export function createPlanificacion({ body, user }) {
  return planificacionesService.createPlanificacion(body, user);
}

export function updatePlanificacion({ params, body, user }) {
  return planificacionesService.updatePlanificacion(params.planificacionId, body, user);
}

export function presentarPlanificacion({ params, user }) {
  return planificacionesService.presentarPlanificacion(params.planificacionId, user);
}

export function cambiarEstado({ params, body, user }) {
  return planificacionesService.cambiarEstado(params.planificacionId, body, user);
}

/* ---------------- Consultas por docente, materia y curso ----------------- */

export function getPorDocente({ params, url, user }) {
  return planificacionesService.getPorDocente(params.docenteId, query(url), user);
}

export function getPorMateria({ params, url, user }) {
  return planificacionesService.getPorMateria(params.materiaId, query(url), user);
}

export function getPorCurso({ params, url, user }) {
  return planificacionesService.getPorCurso(params.cursoId, query(url), user);
}
