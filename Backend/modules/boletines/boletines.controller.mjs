import boletinesService from "./boletines.service.mjs";

export function obtenerDeAlumno({ params, url, user }) {
  return boletinesService.obtenerDeAlumno({ params, url, user });
}

export function guardarDeAlumno({ params, body, user }) {
  return boletinesService.guardarDeAlumno({ params, body, user });
}

export function deCurso({ params, user }) {
  return boletinesService.deCurso({ params, user });
}

export function guardarMateriaDeCurso({ params, body, user }) {
  return boletinesService.guardarMateriaDeCurso({ params, body, user });
}
