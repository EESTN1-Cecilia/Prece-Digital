import {
  crearInasistencia as serviceCrearInasistencia,
  obtenerInasistencia as serviceObtenerInasistencia,
  historialInasistencia as serviceHistorialInasistencia,
  listarInasistencias as serviceListarInasistencias,
  totalesDeAlumno as serviceTotalesDeAlumno,
  estadisticas as serviceEstadisticas,
  listarMotivos as serviceListarMotivos,
  justificarInasistencia as serviceJustificarInasistencia,
  modificarInasistencia as serviceModificarInasistencia
} from "./inasistencias.service.mjs";

function query(url) {
  return Object.fromEntries(url.searchParams.entries());
}

export function crearInasistencia({ body, user }) {
  return serviceCrearInasistencia(body, user);
}

export function obtenerInasistencia({ params }) {
  return serviceObtenerInasistencia(params.inasistenciaId);
}

export function historialInasistencia({ params }) {
  return serviceHistorialInasistencia(params.inasistenciaId);
}

export function listarInasistencias({ url, user }) {
  return serviceListarInasistencias({ url, user });
}

export function totalesDeAlumno({ params, url, user }) {
  return serviceTotalesDeAlumno(params.alumnoId, url, user);
}

export function estadisticas({ url, user }) {
  return serviceEstadisticas({ url, user });
}

export function listarMotivos() {
  return serviceListarMotivos();
}

export function justificarInasistencia({ params, body, user }) {
  return serviceJustificarInasistencia(params.inasistenciaId, body, user);
}

export function modificarInasistencia({ params, body, user }) {
  return serviceModificarInasistencia(params.inasistenciaId, body, user);
}