import gradesService from "./grades.service.mjs";

function query(url) {
  return Object.fromEntries(url.searchParams.entries());
}

/* ---------------- Calificaciones ----------------------------------------- */

export function getCatalogos() {
  return gradesService.getCatalogos();
}

export function createCalificacion({ body, user }) {
  return gradesService.createCalificacion(body, user);
}

export function listCalificaciones({ url, user }) {
  return gradesService.listCalificaciones(query(url), user);
}

export function getCalificacion({ params }) {
  return gradesService.getCalificacion(params.calificacionId);
}

export function updateCalificacion({ params, body, user }) {
  return gradesService.updateCalificacion(params.calificacionId, body, user);
}

export function deleteCalificacion({ params, user }) {
  return gradesService.deleteCalificacion(params.calificacionId, user);
}

/* ---------------- Consultas por alumno y docente ------------------------- */

export function getCalificacionesDeAlumno({ params }) {
  return gradesService.getCalificacionesDeAlumno(params.alumnoId);
}

export function getResumenDeAlumno({ params }) {
  return gradesService.getResumenDeAlumno(params.alumnoId);
}

export function getCalificacionesDeDocente({ params, url }) {
  return gradesService.getCalificacionesDeDocente(params.docenteId, query(url));
}
