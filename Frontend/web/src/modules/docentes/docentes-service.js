/* Adaptador de la API de gestion de docentes (Backend/modules/teachers).

   Todas las llamadas pasan por el cliente HTTP unico. El backend valida
   permisos, formatos y duplicados: lo que se valida aca es solo para avisar
   antes de enviar. */

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

export const DocentesService = {
  /* Estados, tipos de documento, areas institucionales y materias dictadas. */
  catalogos() {
    return pedir("/api/v1/teachers/catalogos");
  },

  /* Devuelve { items, total, pagina, paginas } a partir de la respuesta
     paginada del backend ({ data, filtros, paginacion }). */
  async listar({ q, estado, area, materiaId, orden, pagina = 1, porPagina = 12 } = {}) {
    const parametros = consulta({ q, estado: estado || "todos", area, materiaId, orden, pagina, porPagina });
    const cuerpo = await pedir(`/api/v1/teachers${parametros}`, { crudo: true });

    return {
      items: cuerpo?.data ?? [],
      total: cuerpo?.paginacion?.total ?? 0,
      pagina: cuerpo?.paginacion?.pagina ?? pagina,
      paginas: cuerpo?.paginacion?.totalPaginas ?? 0
    };
  },

  /* Totales del cuerpo docente, sin filtros: alimentan el encabezado. */
  async contar() {
    const [todos, activos] = await Promise.all([
      DocentesService.listar({ estado: "todos", porPagina: 1 }),
      DocentesService.listar({ estado: "activo", porPagina: 1 })
    ]);

    return { total: todos.total, activos: activos.total, inactivos: todos.total - activos.total };
  },

  obtener(id) {
    return pedir(`/api/v1/teachers/${encodeURIComponent(id)}`, { recurso: "el docente solicitado" });
  },

  actualizar(id, cambios) {
    return pedir(`/api/v1/teachers/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(cambios),
      recurso: "el docente solicitado"
    });
  },

  /* Baja logica: el docente queda inactivo y sus asignaciones se conservan. */
  darDeBaja(id) {
    return pedir(`/api/v1/teachers/${encodeURIComponent(id)}`, {
      method: "DELETE",
      recurso: "el docente solicitado"
    });
  },

  /* Asignaciones de materia y de curso/division, incluidas las dadas de baja
     para que se vea el historial. */
  async asignaciones(id) {
    const [materias, cursos] = await Promise.all([
      pedir(`/api/v1/teachers/${encodeURIComponent(id)}/subjects?estado=todos&porPagina=100&orden=periodo_desc`),
      pedir(`/api/v1/teachers/${encodeURIComponent(id)}/courses?estado=todos&porPagina=100&orden=periodo_desc`)
    ]);

    return { materias: materias ?? [], cursos: cursos ?? [] };
  }
};
