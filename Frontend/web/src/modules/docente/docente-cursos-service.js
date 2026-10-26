import { pedir } from "../../services/http.js";

/* Cursos asignados al docente autenticado.

   La fuente es el backend (GET /api/v1/docente/mis-cursos), que es tambien quien
   limita los alumnos, perfiles y boletines que el docente puede consultar. Si el
   docente no tiene cursos asignados la lista llega vacia: nunca se completa con
   cursos de ejemplo, para no mostrar datos de cursos ajenos. */

function capitalizar(texto) {
  const valor = String(texto ?? "").trim();
  if (!valor) return "";
  if (/^ma(n|ñ)ana$/i.test(valor)) return "Mañana";
  return valor.charAt(0).toUpperCase() + valor.slice(1);
}

export function normalizarCursoDocente(curso) {
  const anio = Number(String(curso.anio ?? curso.curso ?? "").replace(/\D/g, "")) || null;
  const division = String(curso.division ?? "").replace(/\D/g, "");

  return {
    id: curso.id ?? `${anio}-${division}`,
    anio,
    curso: `${anio}°`,
    division,
    materia: curso.materia ?? curso.materias?.[0] ?? "",
    materias: curso.materias ?? (curso.materia ? [curso.materia] : []),
    turno: capitalizar(curso.turno)
  };
}

export const DocenteCursosService = {
  /* Devuelve [{ id: "1-1", anio, curso: "1°", division: "1", materia, materias, turno }]. */
  async getMisCursos() {
    const respuesta = await pedir("/api/v1/docente/mis-cursos", { recurso: "los cursos asignados" });
    const lista = Array.isArray(respuesta) ? respuesta : respuesta?.data ?? [];
    return lista.map(normalizarCursoDocente);
  }
};

/* true si el usuario de la sesion es solo docente (sin rol institucional). */
export function esSoloDocente(user) {
  const roles = Array.isArray(user?.roles) ? user.roles : [];
  const institucionales = ["admin", "director", "secretario", "secretaria", "preceptor", "jefe_area", "server"];
  return roles.includes("docente") && !roles.some((rol) => institucionales.includes(rol));
}
