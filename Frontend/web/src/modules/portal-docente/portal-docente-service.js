/* API del Portal Docente. Todo sale del backend con la identidad del token:
   el navegador nunca manda "que docente soy". Si el docente no tiene cursos o
   alumnos, las listas llegan vacias; no se completan con datos de ejemplo. */

import { pedir } from "../../services/http.js";

function consulta(parametros = {}) {
  const busqueda = new URLSearchParams();

  for (const [clave, valor] of Object.entries(parametros)) {
    if (valor !== undefined && valor !== null && valor !== "") {
      busqueda.set(clave, String(valor));
    }
  }

  const texto = busqueda.toString();
  return texto ? `?${texto}` : "";
}

export const PortalDocenteService = {
  /* [{ id: "1-1", anio, division, materias, turno, cantidadAlumnos, horario }] */
  async misCursos() {
    const respuesta = await pedir("/api/v1/docente/mis-cursos", { crudo: true, recurso: "los cursos asignados" });
    return respuesta?.data ?? [];
  },

  /* { alumnos, curso } de una division asignada. */
  async alumnos(cursoId) {
    const respuesta = await pedir(`/api/v1/docente/cursos/${encodeURIComponent(cursoId)}/alumnos`, {
      crudo: true,
      recurso: "la lista del curso"
    });
    return { alumnos: respuesta?.data ?? [], curso: respuesta?.curso ?? null };
  },

  async tomas({ cursoId, materia, desde, hasta, incluirRegistros } = {}) {
    const parametros = consulta({ cursoId, materia, desde, hasta, incluirRegistros: incluirRegistros ? 1 : undefined });
    return pedir(`/api/v1/asistencia-clases${parametros}`);
  },

  toma(id) {
    return pedir(`/api/v1/asistencia-clases/${encodeURIComponent(id)}`, { recurso: "la toma de asistencia" });
  },

  /* Guarda varios dias de la planilla mensual de una vez (todo o nada). */
  guardarPlanilla({ cursoId, materia, tomas }) {
    return pedir("/api/v1/asistencia-clases/planilla", {
      method: "PUT",
      body: JSON.stringify({ cursoId, materia, tomas }),
      crudo: true
    });
  },

  corregir(id, registros) {
    return pedir(`/api/v1/asistencia-clases/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify({ registros }),
      recurso: "la toma de asistencia"
    });
  }
};
