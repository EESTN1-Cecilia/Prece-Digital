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

  obtenerGrilla(filtros = {}) {
    return pedir("/api/v1/jefatura/grilla" + params(filtros), {
      recurso: "la grilla de jefatura",
      crudo: true
    });
  }
};
