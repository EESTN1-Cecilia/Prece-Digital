import { pedir } from "../../../services/http.js";

function limpiarQuery(params = {}) {
  const limpio = {};
  for (const [clave, valor] of Object.entries(params)) {
    if (valor !== undefined && valor !== null && valor !== "" && valor !== "todos" && valor !== "todas") {
      limpio[clave] = valor;
    }
  }
  const query = new URLSearchParams(limpio).toString();
  return query ? `?${query}` : "";
}

export const InventarioService = {
  /**
   * Obtiene la lista de materiales / artículos de inventario con filtros de API.
   */
  async getMateriales(filtros = {}) {
    const qs = limpiarQuery(filtros);
    return pedir("/api/v1/inventory" + qs, { recurso: "los materiales" });
  },

  /**
   * Obtiene un material por su ID.
   */
  async getMaterial(id) {
    return pedir(`/api/v1/inventory/${encodeURIComponent(id)}`, { recurso: "el material" });
  },

  /**
   * Crea un nuevo material en el inventario.
   */
  async createMaterial(datos) {
    return pedir("/api/v1/inventory", {
      method: "POST",
      body: JSON.stringify(datos)
    });
  },

  /**
   * Actualiza los datos de un material existente.
   */
  async updateMaterial(id, datos) {
    return pedir(`/api/v1/inventory/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(datos)
    });
  },

  /**
   * Desactiva lógicamente un material del inventario.
   */
  async deleteMaterial(id) {
    return pedir(`/api/v1/inventory/${encodeURIComponent(id)}`, {
      method: "DELETE"
    });
  },

  /**
   * Obtiene los movimientos asociados a un material o a toda la institución.
   */
  async getMovimientos(filtros = {}) {
    const qs = limpiarQuery(filtros);
    return pedir("/api/v1/inventory-movements" + qs, { recurso: "los movimientos" });
  },

  /**
   * Registra un nuevo movimiento de stock.
   */
  async createMovimiento(datos) {
    return pedir("/api/v1/inventory-movements", {
      method: "POST",
      body: JSON.stringify(datos)
    });
  },

  /**
   * Obtiene los datos consolidados del dashboard de Server (métricas y catálogos).
   */
  async getDashboardData() {
    return pedir("/api/v1/dashboard/server", { recurso: "el tablero de server" });
  }
};
