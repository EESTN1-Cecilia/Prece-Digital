import courseChangesService from "./course-changes.service.mjs";

/* Controlador HTTP de promocion y cambio de curso. La autenticacion y los
   permisos los resuelven verifyToken + authorize en routes/index.mjs: aca solo se
   traduce la peticion a llamadas del servicio. */

function query(url) {
  return Object.fromEntries(url.searchParams.entries());
}

export function getCatalogos() {
  return courseChangesService.catalogos();
}

export function promoverAlumno({ params, body, user }) {
  return courseChangesService.promoverAlumno(params.studentId, body, user);
}

export function cambiarCurso({ params, body, user }) {
  return courseChangesService.cambiarCurso(params.studentId, body, user);
}

export function cambiarDivision({ params, body, user }) {
  return courseChangesService.cambiarDivision(params.studentId, body, user);
}

export function registrarMasivos({ body, user }) {
  return courseChangesService.registrarMasivos(body, user);
}

export function listarMovimientos({ url, user }) {
  return courseChangesService.listarMovimientos(query(url), user);
}

export function obtenerMovimiento({ params }) {
  return courseChangesService.obtenerMovimiento(params.movimientoId);
}

export function obtenerOperacion({ params }) {
  return courseChangesService.obtenerOperacion(params.operacionId);
}

export function historialDeAlumno({ params }) {
  return courseChangesService.historialDeAlumno(params.alumnoId);
}

export function ultimoDeAlumno({ params }) {
  return courseChangesService.ultimoDeAlumno(params.alumnoId);
}

export function situacionDeAlumno({ params }) {
  return courseChangesService.situacionDeAlumno(params.alumnoId);
}

export function asignados({ url, user }) {
  return courseChangesService.asignados(query(url), user);
}