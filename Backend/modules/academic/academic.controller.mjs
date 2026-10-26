import academicService from "./academic.service.mjs";
import academicRepository from "./academic.repository.mjs";
import { cursosPermitidos } from "../auth/alcance-cursos.service.mjs";
import { errorHttp } from "../../utils/api-error.mjs";

/* Clave "<anio>-<division>" de una division del catalogo academico. */
function claveDivision(division) {
  const curso = division?.cursoId ? academicRepository.findCursoById(division.cursoId) : null;
  const anio = curso?.anio ?? division?.anio;
  const numero = /(\d+)/.exec(String(division?.nombre ?? ""))?.[1];
  return anio && numero ? `${anio}-${numero}` : null;
}

function query(url) {
  return Object.fromEntries(url.searchParams.entries());
}

export function createCiclo({ body, user }) {
  return academicService.createCiclo(body, user);
}

export function getCiclo({ params }) {
  return academicService.getCiclo(params.cicloId);
}

export function listCiclos({ url }) {
  return academicService.listCiclos(query(url));
}

export function updateCiclo({ params, body, user }) {
  return academicService.updateCiclo(params.cicloId, body, user);
}

export function deactivateCiclo({ params, user }) {
  return academicService.deactivateCiclo(params.cicloId, user);
}

export function createOrientacion({ body, user }) {
  return academicService.createOrientacion(body, user);
}

export function getOrientacion({ params }) {
  return academicService.getOrientacion(params.orientacionId);
}

export function listOrientaciones({ url }) {
  return academicService.listOrientaciones(query(url));
}

export function updateOrientacion({ params, body, user }) {
  return academicService.updateOrientacion(params.orientacionId, body, user);
}

export function deactivateOrientacion({ params, user }) {
  return academicService.deactivateOrientacion(params.orientacionId, user);
}

export function createCurso({ body, user }) {
  return academicService.createCurso(body, user);
}

export function getCurso({ params }) {
  return academicService.getCurso(params.cursoId);
}

export function listCursos({ url, user }) {
  return academicService.listCursos(query(url), user);
}

export function updateCurso({ params, body, user }) {
  return academicService.updateCurso(params.cursoId, body, user);
}

export function deactivateCurso({ params, user }) {
  return academicService.deactivateCurso(params.cursoId, user);
}

export function listDivisionesDeCurso({ params, url }) {
  return academicService.listDivisionesDeCurso(params.cursoId, query(url));
}

export function listAlumnosDeCurso({ params, url, user }) {
  const permitidos = cursosPermitidos(user);
  const divisionesPermitidas = permitidos
    ? new Set(
        academicRepository
          .listDivisiones({ cursoId: params.cursoId })
          .filter((division) => permitidos.has(claveDivision(division)))
          .map((division) => division.id)
      )
    : null;

  return academicService.listAlumnosDeCurso(params.cursoId, query(url), { divisionesPermitidas });
}

export function listMateriasDeCurso({ params, url }) {
  return academicService.listMateriasDeCurso(params.cursoId, query(url));
}

export function listDocentesDeCurso({ params, url }) {
  return academicService.listDocentesDeCurso(params.cursoId, query(url));
}

export function listHorariosDeCurso({ params, url }) {
  return academicService.listHorariosDeCurso(params.cursoId, query(url));
}

export function createDivision({ body, user }) {
  return academicService.createDivision(body, user);
}

export function getDivision({ params }) {
  return academicService.getDivision(params.divisionId);
}

export function listDivisiones({ url, user }) {
  return academicService.listDivisiones(query(url), user);
}

export function updateDivision({ params, body, user }) {
  return academicService.updateDivision(params.divisionId, body, user);
}

export function deactivateDivision({ params, user }) {
  return academicService.deactivateDivision(params.divisionId, user);
}

export function listAlumnosDeDivision({ params, url, user }) {
  const permitidos = cursosPermitidos(user);
  const division = permitidos ? academicRepository.findDivisionById(params.divisionId) : null;

  if (permitidos && division && !permitidos.has(claveDivision(division))) {
    throw errorHttp(403, "FORBIDDEN", "Solo puede consultar alumnos de los cursos que tiene asignados.");
  }

  return academicService.listAlumnosDeDivision(params.divisionId, query(url));
}

export function listMateriasDeDivision({ params, url }) {
  return academicService.listMateriasDeDivision(params.divisionId, query(url));
}

export function listDocentesDeDivision({ params, url }) {
  return academicService.listDocentesDeDivision(params.divisionId, query(url));
}

export function listHorariosDeDivision({ params, url }) {
  return academicService.listHorariosDeDivision(params.divisionId, query(url));
}