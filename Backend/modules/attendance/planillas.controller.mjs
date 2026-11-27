import { guardarPlanilla, obtenerPlanilla } from "./planillas.service.mjs";

function consulta(url) {
  return Object.fromEntries(url.searchParams.entries());
}

/* GET /api/v1/asistencias/planillas?curso=1-1&anio=2026&mes=4[&materia=...]
   data: la planilla guardada, o null si todavia no se cargo. */
export function obtener({ url, user }) {
  return { data: obtenerPlanilla(consulta(url), user) };
}

/* PUT /api/v1/asistencias/planillas?curso=1-1&anio=2026&mes=4[&materia=...] */
export function guardar({ url, body, user }) {
  return { data: guardarPlanilla(consulta(url), body, user) };
}
