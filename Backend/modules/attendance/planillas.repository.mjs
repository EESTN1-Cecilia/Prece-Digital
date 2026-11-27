/* Planillas mensuales de asistencia (Libro de Asistencia del preceptor y planillas
   por materia de cada docente). Una planilla por curso + materia + año + mes.

   Viven en la coleccion `planillasAsistencia` del store, que la persistencia
   guarda en SQL Server (tabla ps_planillas_asistencia) despues de cada cambio:
   asi todos los perfiles ven la misma planilla, desde cualquier computadora. */

import { getStore } from "../../database/memory-store.mjs";

function coleccion() {
  const store = getStore();
  store.planillasAsistencia ??= new Map();
  return store.planillasAsistencia;
}

export function clavePlanilla({ cursoId, materiaClave, anio, mes }) {
  return `${cursoId}|${materiaClave || "-"}|${anio}|${mes}`;
}

const planillasRepository = {
  buscar(clave) {
    const planilla = coleccion().get(clave);
    return planilla ? structuredClone(planilla) : null;
  },

  guardar(clave, planilla) {
    coleccion().set(clave, structuredClone(planilla));
    return structuredClone(planilla);
  },

  listar() {
    return [...coleccion().values()].map((planilla) => structuredClone(planilla));
  },

  /* Solo para tests. */
  vaciar() {
    coleccion().clear();
  }
};

export default planillasRepository;
