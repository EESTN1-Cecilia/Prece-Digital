import attendanceFollowupsService from "./attendance-followups.service.mjs";

function query(url) {
  return Object.fromEntries(url.searchParams.entries());
}

export function createSeguimiento({ body, user }) {
  return attendanceFollowupsService.createSeguimiento(body, user);
}

export function getSeguimiento({ params }) {
  return attendanceFollowupsService.getSeguimiento(params.seguimientoId);
}

export function updateSeguimiento({ params, body, user }) {
  return attendanceFollowupsService.updateSeguimiento(params.seguimientoId, body, user);
}

export function listSeguimientos({ url, user }) {
  return attendanceFollowupsService.listSeguimientos(query(url), user);
}

export function listAlumnosConSeguimientos({ url, user }) {
  return attendanceFollowupsService.listAlumnosConSeguimientos(query(url), user);
}

export function getCatalogos() {
  return attendanceFollowupsService.getCatalogos();
}

export function getHistorialDeAlumno({ params, url }) {
  return attendanceFollowupsService.getHistorialDeAlumno(params.alumnoId, query(url));
}

export function getUltimoDeAlumno({ params }) {
  return attendanceFollowupsService.getUltimoDeAlumno(params.alumnoId);
}

export function getResumenDeAlumno({ params }) {
  return attendanceFollowupsService.getResumenDeAlumno(params.alumnoId);
}
