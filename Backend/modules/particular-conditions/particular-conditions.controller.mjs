import particularConditionsService from "./particular-conditions.service.mjs";

/* Controlador HTTP del modulo de condiciones particulares. La autenticacion y
   los permisos los resuelven verifyToken + authorize en routes/index.mjs: aca
   solo se traduce la peticion a llamadas del servicio. */

function query(url) {
  return Object.fromEntries(url.searchParams.entries());
}

export function catalogos() {
  return particularConditionsService.catalogos();
}

export function crearCondicion({ params, body, user }) {
  return particularConditionsService.crearCondicion(params.studentId, body, user);
}

export function listarCondiciones({ url, user }) {
  return particularConditionsService.listarCondiciones(query(url), user);
}

export function listarDeAlumno({ params }) {
  return particularConditionsService.listarDeAlumno(params.studentId);
}

export function obtenerCondicion({ params }) {
  return particularConditionsService.obtenerCondicion(params.conditionId);
}

export function actualizarCondicion({ params, body, user }) {
  return particularConditionsService.actualizarCondicion(params.conditionId, body, user);
}

export function finalizarCondicion({ params, body, user }) {
  return particularConditionsService.finalizarCondicion(params.conditionId, body, user);
}

export function historialDeAlumno({ params }) {
  return particularConditionsService.historialDeAlumno(params.alumnoId);
}

export function resumenDeAlumno({ params }) {
  return particularConditionsService.resumenDeAlumno(params.alumnoId);
}
