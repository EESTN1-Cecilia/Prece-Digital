import { pedir } from "../../services/http.js";

/* Datos del tablero de secretaria. Todo sale de la API:
     GET  /api/v1/dashboard/secretaria
     POST /api/v1/alerts/:alertId/dismiss */
export const SecretariaService = {
  getDashboardData() {
    return pedir("/api/v1/dashboard/secretaria", { recurso: "el tablero de secretaria" });
  },

  async dismissAlert(alertId) {
    await pedir(`/api/v1/alerts/${encodeURIComponent(alertId)}/dismiss`, { method: "POST" });
    return true;
  }
};
