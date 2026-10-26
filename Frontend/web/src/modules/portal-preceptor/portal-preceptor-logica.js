/* Reglas puras del Portal Preceptor (sin React): se prueban con node --test
   (portal-preceptor-logica.test.mjs). */

import { diasModificados, fechaDeDia } from "../portal-docente/portal-docente-logica.js";

const ESTADO_POR_LETRA = { P: "presente", A: "ausente", T: "tarde" };

/* La asistencia diaria se guarda por alumno: a diferencia de la toma por clase
   del docente, un dia puede quedar a medio cargar. Devuelve, por cada dia
   modificado, los alumnos con estado marcado. */
export function diasParaGuardar(planilla, original) {
  return diasModificados(planilla, original)
    .map((dia) => ({
      fecha: fechaDeDia(planilla.anio, planilla.mes, dia),
      registros: planilla.alumnos
        .map((alumno) => ({ alumnoId: alumno.id, estado: ESTADO_POR_LETRA[planilla.registros?.[alumno.orden]?.[dia]] ?? null }))
        .filter((registro) => registro.estado)
    }))
    .filter((dia) => dia.registros.length);
}

/* Indicadores del inicio: divisiones, alumnos y turnos a cargo. */
export function resumenCursos(cursos = []) {
  return {
    divisiones: cursos.length,
    alumnos: cursos.reduce((total, curso) => total + (curso.cantidadAlumnos ?? 0), 0),
    turnos: [...new Set(cursos.map((curso) => curso.turno).filter(Boolean))]
  };
}
