import preceptorService from "./preceptor.service.mjs";
import preceptorAsignacionesService from "./preceptor-asignaciones.service.mjs";

export function misCursos({ user }) {
  return preceptorService.misCursos({ user });
}

export function listarAlumnos({ params, url, user }) {
  return preceptorService.listarAlumnos({ params, url, user });
}

export function registrarAsistencia({ body, user }) {
  return preceptorService.registrarAsistencia({ body, user });
}

export function estadoAulas({ url, user }) {
  return preceptorService.estadoAulas({ url, user });
}

export function boletinCurso({ params, url, user }) {
  return preceptorService.boletinCurso({ params, url, user });
}

export function listarAsistencias({ url, user }) {
  return preceptorService.listarAsistencias({ url, user });
}

export function obtenerAsistenciaDia({ params, user }) {
  return preceptorService.obtenerAsistenciaDia({ params, user });
}

export function listarAsignaciones({ user }) {
  return preceptorAsignacionesService.listar({ user });
}

export function asignarPreceptor({ params, body, user }) {
  return preceptorAsignacionesService.asignar({ params, body, user });
}

export function quitarPreceptor({ params, user }) {
  return preceptorAsignacionesService.quitar({ params, user });
}
