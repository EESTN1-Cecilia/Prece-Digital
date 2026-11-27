/* Planillas mensuales de asistencia (Libro de Asistencia del preceptor y planillas
   por materia de cada docente). Una planilla por curso + materia + año + mes.

   Viven en la coleccion `planillasAsistencia` del store, que la persistencia
   guarda en SQL Server (tabla ps_planillas_asistencia) despues de cada cambio:
   asi todos los perfiles ven la misma planilla, desde cualquier computadora. */

import { getStore } from "../../database/memory-store.mjs";

const MARCAS = {
  A: { tipo: "ausente", justificada: false },
  J: { tipo: "ausente", justificada: true },
  T: { tipo: "tarde", justificada: false }
};

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

  /* Marcas de la planilla OFICIAL (la del preceptor, sin materia) pasadas a
     registros de asistencia por alumno: A = ausente, J = ausente justificado,
     T = llegada tarde. P y "—" no generan registro. Las planillas por materia
     del docente no cuentan como inasistencias de la escuela. */
  registrosOficiales(alumnoId) {
    const registros = [];
    for (const planilla of coleccion().values()) {
      if (planilla.materia) continue;
      for (const [id, dias] of Object.entries(planilla.registros ?? {})) {
        if (alumnoId && id !== alumnoId) continue;
        for (const [dia, codigo] of Object.entries(dias ?? {})) {
          const marca = MARCAS[codigo];
          if (!marca) continue;
          registros.push({
            alumnoId: id,
            fecha: `${planilla.anio}-${String(planilla.mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`,
            tipo: marca.tipo,
            justificada: marca.justificada,
            motivo: planilla.observacionesPorAlumno?.[id] ?? null,
            origen: "planilla"
          });
        }
      }
    }
    return registros;
  },

  /* Solo para tests. */
  vaciar() {
    coleccion().clear();
  }
};

export default planillasRepository;
