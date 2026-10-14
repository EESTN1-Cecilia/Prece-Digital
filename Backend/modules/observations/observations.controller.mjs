import observationsService from "./observations.service.mjs";

/* Controlador HTTP del modulo de observaciones. La autenticacion y los permisos
   los resuelven verifyToken + authorize en routes/index.mjs: aca solo se traduce
   la peticion a llamadas del servicio. */

function query(url) {
  return Object.fromEntries(url.searchParams.entries());
}

export function catalogos() {
  return observationsService.catalogos();
}

export function crearObservacion({ params, body, user }) {
  return observationsService.crearObservacion(params.studentId, body, user);
}

export function listarObservaciones({ url, user }) {
  return observationsService.listarObservaciones(query(url), user);
}

export function listarDeAlumno({ params }) {
  return observationsService.listarDeAlumno(params.studentId);
}

export function obtenerObservacion({ params }) {
  return observationsService.obtenerObservacion(params.observationId);
}

export function actualizarObservacion({ params, body, user }) {
  return observationsService.actualizarObservacion(params.observationId, body, user);
}

export function crearSeguimiento({ params, body, user }) {
  return observationsService.crearSeguimiento(params.observationId, body, user);
}

export function listarSeguimientos({ params }) {
  return observationsService.listarSeguimientosDeObservacion(params.observationId);
}

export function obtenerSeguimiento({ params }) {
  return observationsService.obtenerSeguimiento(params.seguimientoId);
}

export function actualizarSeguimiento({ params, body, user }) {
  return observationsService.actualizarSeguimiento(params.seguimientoId, body, user);
}

export function historialDeAlumno({ params }) {
  return observationsService.historialDeAlumno(params.alumnoId);
}

export function resumenDeAlumno({ params }) {
  return observationsService.resumenDeAlumno(params.alumnoId);
}
