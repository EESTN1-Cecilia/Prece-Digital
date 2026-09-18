import React from "react";
import DashboardView from "../modules/dashboard/dashboard-view.js";
import SecretariaDashboardView from "../modules/secretaria/secretaria-dashboard-view.js";
import { useUsuarioActual } from "../estado/index.js";

const h = React.createElement;

/* Pantalla de inicio: el tablero depende del rol real de la sesion. */
export default function InicioView() {
  const { rol } = useUsuarioActual();
  return h(rol === "secretaria" ? SecretariaDashboardView : DashboardView);
}
