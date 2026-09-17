import academicRecordsService from "./academic-records.service.mjs";

function query(url) {
  return Object.fromEntries(url.searchParams.entries());
}

export function createSituacion({ body, user }) {
  return academicRecordsService.createSituacion(body, user);
}

export function getSituacion({ params }) {
  return academicRecordsService.getSituacion(params.situacionId);
}

export function updateSituacion({ params, body, user }) {
  return academicRecordsService.updateSituacion(params.situacionId, body, user);
}

export function listSituaciones({ url, user }) {
  return academicRecordsService.listSituaciones(query(url), user);
}

export function listPendientes({ url, user }) {
  return academicRecordsService.listPendientes(query(url), user);
}

export function listRecursadas({ url, user }) {
  return academicRecordsService.listRecursadas(query(url), user);
}

export function listIntensificadas({ url, user }) {
  return academicRecordsService.listIntensificadas(query(url), user);
}

export function getCatalogos() {
  return academicRecordsService.getCatalogos();
}

export function getSituacionDeAlumno({ params }) {
  return academicRecordsService.getSituacionDeAlumno(params.alumnoId);
}

export function getSituacionDeAlumnoYMateria({ params }) {
  return academicRecordsService.getSituacionDeAlumnoYMateria(params.alumnoId, params.materiaId);
}

export function getHistorialDeAlumno({ params }) {
  return academicRecordsService.getHistorialDeAlumno(params.alumnoId);
}