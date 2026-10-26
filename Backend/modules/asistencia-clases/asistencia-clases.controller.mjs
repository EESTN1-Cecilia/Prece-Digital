import asistenciaClasesService from "./asistencia-clases.service.mjs";

function query(url) {
  return Object.fromEntries(url.searchParams.entries());
}

export function catalogo() {
  return asistenciaClasesService.catalogo();
}

export function alumnosDeCurso({ params, user }) {
  return asistenciaClasesService.alumnosDeCurso(user, params.cursoId);
}

export function listar({ url, user }) {
  return asistenciaClasesService.listar(user, query(url));
}

export function obtener({ params, user }) {
  return asistenciaClasesService.obtener(user, params.claseId);
}

export function registrar({ body, user }) {
  return asistenciaClasesService.registrar(user, body);
}

export function corregir({ params, body, user }) {
  return asistenciaClasesService.corregir(user, params.claseId, body);
}

export function guardarPlanilla({ body, user }) {
  return asistenciaClasesService.guardarPlanilla(user, body);
}
