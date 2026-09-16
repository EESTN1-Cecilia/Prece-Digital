import {
  listarAlumnosPorCurso,
  listarAlumnosPorDivision,
  listarAlumnosPorGrupo,
  listarAlumnosPorTaller
} from "./students.service.mjs";

export function listarCurso(ctx) {
  return listarAlumnosPorCurso({ url: ctx.url, user: ctx.user });
}

export function listarDivision(ctx) {
  return listarAlumnosPorDivision({ url: ctx.url, user: ctx.user });
}

export function listarGrupo(ctx) {
  return listarAlumnosPorGrupo({ url: ctx.url, user: ctx.user });
}

export function listarTaller(ctx) {
  return listarAlumnosPorTaller({ url: ctx.url, user: ctx.user });
}
