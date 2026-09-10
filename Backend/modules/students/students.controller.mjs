import { exigirAutenticacion } from "../../middlewares/auth.middleware.mjs";
import {
  listarAlumnosPorCurso,
  listarAlumnosPorDivision,
  listarAlumnosPorGrupo,
  listarAlumnosPorTaller
} from "./students.service.mjs";

/* Decodifica el JWT y expone el usuario al service. */
function usuarioDe(request) {
  return exigirAutenticacion(request);
}

export function listarCurso({ request, url }) {
  return listarAlumnosPorCurso({ url, user: usuarioDe(request) });
}

export function listarDivision({ request, url }) {
  return listarAlumnosPorDivision({ url, user: usuarioDe(request) });
}

export function listarGrupo({ request, url }) {
  return listarAlumnosPorGrupo({ url, user: usuarioDe(request) });
}

export function listarTaller({ request, url }) {
  return listarAlumnosPorTaller({ url, user: usuarioDe(request) });
}