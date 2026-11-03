import { pedir } from "../../services/http.js";

function params(query = {}) {
  const search = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "" && value !== "todos" && value !== "todas") {
      search.set(key, value);
    }
  });
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export const JefaturaService = {
  listarCursosGrupos(filtros = {}) {
    return pedir("/api/v1/jefatura/cursos-grupos" + params(filtros), {
      recurso: "los cursos y grupos de jefatura"
    });
  },

  /* Guarda en el legajo de cada alumno el grupo de taller que le asigno la jefatura.
     asignaciones: { [alumnoId]: "A" | "B" }; grupos: { A: "1.1", B: "1.3" } */
  guardarDivisionTalleres({ anio, division, grupos, asignaciones }) {
    return pedir("/api/v1/jefatura/talleres/division", {
      method: "PUT",
      body: JSON.stringify({ anio, division, grupos, asignaciones }),
      recurso: "la division de talleres"
    });
  },

  /* Profes que la direccion asigno a cada grupo de taller: [{ grupo, anio, division, docente: { id, nombre, email } }] */
  listarDocentesTalleres(filtros = {}) {
    return pedir("/api/v1/jefatura/talleres/docentes" + params(filtros), {
      recurso: "los profes de los grupos de taller"
    });
  },

  /* asignaciones: [{ grupo, anio, division, docente: { id, nombre, email } | null }]; null deja el grupo sin profe. */
  guardarDocentesTalleres(asignaciones) {
    return pedir("/api/v1/jefatura/talleres/docentes", {
      method: "PUT",
      body: JSON.stringify({ asignaciones }),
      recurso: "los profes de los grupos de taller"
    });
  },

  obtenerGrilla(filtros = {}) {
    return pedir("/api/v1/jefatura/grilla" + params(filtros), {
      recurso: "la grilla de jefatura",
      crudo: true
    });
  }
};
