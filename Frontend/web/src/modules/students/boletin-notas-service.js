/* Boletin de calificaciones compartido (backend /api/v1/boletines).

   Una sola fuente para el Boletin Digital de Secretaria y Direccion, la
   planilla de calificaciones del docente y los boletines que imprime
   preceptoria. Reemplaza al guardado en el navegador: lo que carga un usuario
   lo ve el resto, en cualquier equipo. */

import { pedir } from "../../services/http.js";

export const BoletinNotasService = {
  /* { alumnoId, anio, calificaciones: { [materia]: { informe1, ... } }, materiasPendientes, inasistencias } */
  async obtener(alumnoId, anio) {
    const respuesta = await pedir(`/api/v1/boletines/alumno/${encodeURIComponent(alumnoId)}?anio=${encodeURIComponent(anio)}`, {
      crudo: true,
      recurso: "el boletín del alumno"
    });
    return respuesta?.data ?? null;
  },

  async guardar(alumnoId, { anio, calificaciones, materiasPendientes, inasistencias }) {
    const respuesta = await pedir(`/api/v1/boletines/alumno/${encodeURIComponent(alumnoId)}`, {
      method: "PUT",
      crudo: true,
      body: JSON.stringify({ anio, calificaciones, materiasPendientes, inasistencias })
    });
    return respuesta?.data ?? null;
  },

  /* [{ orden, alumno, boletin }] del curso "<anio>-<division>", en orden de lista. */
  async deCurso(cursoId) {
    const respuesta = await pedir(`/api/v1/boletines/curso/${encodeURIComponent(cursoId)}`, {
      crudo: true,
      recurso: "los boletines del curso"
    });
    return respuesta?.data ?? [];
  },

  /* Planilla del docente: una materia (con sus nombres equivalentes del plan)
     para los alumnos del curso. */
  async guardarMateria(cursoId, { materias, notas }) {
    const respuesta = await pedir(`/api/v1/boletines/curso/${encodeURIComponent(cursoId)}/materia`, {
      method: "PUT",
      crudo: true,
      body: JSON.stringify({ materias, notas })
    });
    return respuesta?.data ?? [];
  }
};
