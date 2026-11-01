import { pedir } from "../../services/http.js";

/* Adaptador del calendario. Todo pasa por el backend:
     GET  /api/v1/calendario/eventos?anio=&ambito=       eventos (cualquier sesion)
     GET  /api/v1/calendario/avisos                       fechas para el aviso automatico
     GET  /api/v1/calendario/estado                       ultima consulta (gestion)
     POST /api/v1/calendario/actualizar                   consulta las fuentes oficiales (gestion)
     POST /api/v1/calendario/eventos                      fecha institucional (gestion)
     PUT/DELETE /api/v1/calendario/eventos/:id            editar / quitar institucional
     POST /api/v1/calendario/eventos/:id/verificar        confirmar un evento oficial contra su fuente */

const e = encodeURIComponent;

export const CalendarioService = {
  eventos: (anio) => pedir(`/api/v1/calendario/eventos?anio=${e(anio)}`),
  avisos: () => pedir("/api/v1/calendario/avisos"),
  estado: () => pedir("/api/v1/calendario/estado"),
  actualizar: (anio) => pedir("/api/v1/calendario/actualizar", { method: "POST", body: JSON.stringify({ anio }), tiempoLimite: 60000 }),
  crear: (cuerpo) => pedir("/api/v1/calendario/eventos", { method: "POST", body: JSON.stringify(cuerpo) }),
  editar: (id, cuerpo) => pedir(`/api/v1/calendario/eventos/${e(id)}`, { method: "PUT", body: JSON.stringify(cuerpo) }),
  eliminar: (id) => pedir(`/api/v1/calendario/eventos/${e(id)}`, { method: "DELETE" }),
  verificar: (id) => pedir(`/api/v1/calendario/eventos/${e(id)}/verificar`, { method: "POST", body: JSON.stringify({}) })
};
