import { exigirAutenticacion } from "../../middlewares/auth.middleware.mjs";
import studentService from "./student.service.mjs";
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

/* ------------------------------------------------------------------
   Gestion de alumnos (legajo). La autorizacion (verifyToken + authorize)
   corre como middleware de ruta; estos handlers solo implementan el CRUD.
   ------------------------------------------------------------------ */

export function crearAlumno({ body, user }) {
  return studentService.create(body, user);
}

export function obtenerAlumno({ params }) {
  return studentService.getById(params.studentId);
}

export function listarAlumnos({ url, user }) {
  const query = Object.fromEntries(url.searchParams.entries());
  return studentService.list(query, user);
}

export function modificarAlumno({ params, body, user }) {
  return studentService.update(params.studentId, body, user);
}

export function desactivarAlumno({ params, user }) {
  return studentService.deactivate(params.studentId, user);
}