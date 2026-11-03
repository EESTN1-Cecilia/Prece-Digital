import { anioDelAlumno, planDelAnio } from "./boletin-oficial-datos.js";

/* Agrupa las materias del boletin como el formulario oficial: primero
   FORMACIÓN GENERAL y despues el taller (TCO. ESPECÍFICA en el ciclo basico,
   FORMACIÓN TÉCNICA ESPECÍFICA en el superior). Se decide por el plan de
   estudios del año del alumno; una materia que no figura en el plan queda en
   FORMACIÓN GENERAL. Devuelve [{ titulo, materias }] sin grupos vacios. */

const normalizar = (texto) =>
  String(texto ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/\s+/g, " ").trim();

export const COLOR_SECCION = [0.361, 0.071, 0.11]; // #5c121c, el mismo rojo del boletin oficial
export const COLOR_SECCION_CSS = "#5c121c";

export function agruparMaterias(datos) {
  const materias = datos.materias ?? [];
  const anio = anioDelAlumno({ curso: String(datos.alumno?.cursoDivision ?? "") });
  const plan = planDelAnio(anio, datos.alumno?.orientacion);
  const taller = new Set(plan.taller.map(normalizar));

  const tecnicas = materias.filter((m) => taller.has(normalizar(m.materia)));
  const generales = materias.filter((m) => !taller.has(normalizar(m.materia)));

  return [
    { titulo: "FORMACIÓN GENERAL", materias: generales },
    { titulo: plan.tituloTaller, materias: tecnicas }
  ].filter((grupo) => grupo.materias.length > 0);
}
