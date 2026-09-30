import { pedir } from "../../services/http.js";

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

export const ServerService = {
  /**
   * Obtiene la información agregada del dashboard de Server desde la API.
   */
  async getDashboardData() {
    return pedir("/api/v1/dashboard/server", { recurso: "el tablero de server" });
  },

  /**
   * Listado de materiales / artículos de inventario con filtros opcionales.
   */
  async listItems(filtros = {}) {
    const qs = limpiarQuery(filtros);
    return pedir("/api/v1/inventory" + qs, { recurso: "los materiales" });
  },

  /**
   * Obtiene el detalle de un material por ID.
   */
  async getItem(id) {
    return pedir(`/api/v1/inventory/${encodeURIComponent(id)}`, { recurso: "el material" });
  },

  /**
   * Da de alta un nuevo material.
   */
  async createItem(datos) {
    return pedir("/api/v1/inventory", {
      method: "POST",
      body: JSON.stringify(datos)
    });
  },

  /**
   * Actualiza los datos de un material.
   */
  async updateItem(id, datos) {
    return pedir(`/api/v1/inventory/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(datos)
    });
  },

  /**
   * Da de baja un material.
   */
  async deleteItem(id) {
    return pedir(`/api/v1/inventory/${encodeURIComponent(id)}`, {
      method: "DELETE"
    });
  },

  /**
   * Registra un movimiento de stock (ingreso, egreso, transferencia, ajuste).
   */
  async createMovement(datos) {
    return pedir("/api/v1/inventory-movements", {
      method: "POST",
      body: JSON.stringify(datos)
    });
  },

  /**
   * Lista el historial de movimientos de inventario.
   */
  async listMovements(filtros = {}) {
    const qs = limpiarQuery(filtros);
    return pedir("/api/v1/inventory-movements" + qs, { recurso: "los movimientos" });
  },

  /**
   * Consulta las solicitudes de recursos y materiales.
   */
  async listRequests(filtros = {}) {
    const qs = limpiarQuery(filtros);
    return pedir("/api/v1/requests" + qs, { recurso: "las solicitudes" });
  },

  /**
   * Actualiza el estado o datos de una solicitud.
   */
  async updateRequest(id, datos) {
    return pedir(`/api/v1/requests/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(datos)
    });
  },

  /**
   * Consulta las reservas de recursos y espacios.
   */
  async listReservations(filtros = {}) {
    const qs = limpiarQuery(filtros);
    return pedir("/api/v1/reservations" + qs, { recurso: "las reservas" });
  },

  /**
   * Aprueba una reserva pendiente.
   */
  async approveReservation(id) {
    return pedir(`/api/v1/reservations/${encodeURIComponent(id)}/approve`, {
      method: "POST"
    });
  },

  /**
   * Rechaza una reserva pendiente.
   */
  async rejectReservation(id) {
    return pedir(`/api/v1/reservations/${encodeURIComponent(id)}/reject`, {
      method: "POST"
    });
  },

  /**
   * Cancela una reserva existente.
   */
  async cancelReservation(id) {
    return pedir(`/api/v1/reservations/${encodeURIComponent(id)}/cancel`, {
      method: "POST"
    });
  },

  /**
   * Descarta una alerta activa del dashboard.
   */
  async dismissAlert(alertId) {
    try {
      await pedir(`/api/v1/alerts/${encodeURIComponent(alertId)}/dismiss`, { method: "POST" });
    } catch {
      // Si la alerta es generada en tiempo real por el backend, se descarta localmente
    }
    return true;
  }
};
