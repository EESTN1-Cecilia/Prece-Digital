/* Controlador HTTP del modulo de alumnos. La autenticacion y los permisos los
   resuelven verifyToken + authorize en routes/index.mjs: aca solo se traduce la
   peticion a llamadas del servicio. */

import studentService, {
  listarPorCurso,
  listarPorDivision,
  listarPorGrupo,
  listarPorTaller,
  resumenDivisiones
} from "./students.service.mjs";
import legajoService from "./legajo.service.mjs";

/* ---------------- Listados ---------------- */

export function listarCurso({ url, user }) {
  return listarPorCurso({ url, user });
}

export function listarDivision({ url, user }) {
  return listarPorDivision({ url, user });
}

export function listarGrupo({ url, user }) {
  return listarPorGrupo({ url, user });
}

export function listarTaller({ url, user }) {
  return listarPorTaller({ url, user });
}

/* ---------------- CRUD del legajo ---------------- */

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

/* ---------------- Legajo: resumen, perfil, observaciones, pases, constancias ---------------- */

export function obtenerResumen({ params }) {
  return legajoService.resumen(params.studentId);
}

export function obtenerPerfil({ params, user }) {
  return legajoService.perfil(params.studentId, user);
}

export function listarObservacionesDeAlumno({ params }) {
  return legajoService.listarObservaciones(params.studentId);
}

export function listarObservaciones({ url }) {
  return legajoService.listarObservaciones(url.searchParams.get("alumnoId") || null);
}

export function crearObservacion({ params, body, user }) {
  return legajoService.crearObservacion(params.studentId, body, user);
}

export function iniciarPase({ params, body, user }) {
  return legajoService.iniciarPase(params.studentId, body, user);
}

export function emitirConstancia({ params, user }) {
  return legajoService.emitirConstancia(params.studentId, user);
}

/* ---------------- Tablero de secretaria y alertas ---------------- */

export function tableroSecretaria({ user }) {
  return legajoService.tableroSecretaria(user);
}

export function descartarAlerta({ params }) {
  return legajoService.descartarAlerta(params.alertId);
}

export function listarDivisiones({ user }) {
  return resumenDivisiones(user);
}
