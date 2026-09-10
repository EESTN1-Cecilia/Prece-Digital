import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { h, SiteLayout } from "../layouts/site-layout.js";
import DashboardView from "../modules/dashboard/dashboard-view.js";
import SecretariaDashboardView from "../modules/secretaria/secretaria-dashboard-view.js";
import LoginView from "../modules/auth/login-view.js";
import InviteView from "../modules/auth/invite-view.js";
import ObservacionesView from "../modules/preceptoria/observaciones-view.js";
import { AuthService } from "../services/auth-service.js";

import AlumnosListView from "../modules/students/alumnos-list-view.js";
import CargarAlumnoView from "../modules/students/cargar-alumno-view.js";

function renderInicio() {
  const role = AuthService.getActiveRole();
  if (role === "secretaria") {
    return h(SecretariaDashboardView);
  }
  return h(DashboardView);
}

const RUTAS = {
  "#/inicio": () => renderInicio(),
  "#/secretaria": () => h(SecretariaDashboardView),
  "#/preceptoria": () => h(DashboardView),
  "#/alumnos": () => h(AlumnosListView),
  "#/alumnos/buscar": () => h(AlumnosListView),
  "#/alumnos/cargar": () => h(CargarAlumnoView),
  "#/alumnos/nuevo": () => h(CargarAlumnoView),
  "#/login": () => h(LoginView),
  "#/activar": () => h(LoginView, { titulo: "Activar Cuenta" }),
  "#/invitar": () => h(InviteView),
  "#/preceptoria/observaciones": () => h(ObservacionesView)
};

function rutaActual() {
  const hash = window.location.hash || "#/inicio";
  const baseHash = hash.split("?")[0];
  return RUTAS[baseHash] ? baseHash : "#/inicio";
}

function App() {
  const [ruta, setRuta] = useState(rutaActual);
  const [, setRoleState] = useState(AuthService.getActiveRole());

  useEffect(() => {
    const alCambiarRuta = () => {
      setRuta(rutaActual());
      window.scrollTo(0, 0);
    };

    const alCambiarRol = () => {
      setRoleState(AuthService.getActiveRole());
      setRuta(rutaActual());
    };

    window.addEventListener("hashchange", alCambiarRuta);
    window.addEventListener("auth:role_changed", alCambiarRol);
    return () => {
      window.removeEventListener("hashchange", alCambiarRuta);
      window.removeEventListener("auth:role_changed", alCambiarRol);
    };
  }, []);

  return h(SiteLayout, { ruta }, RUTAS[ruta] ? RUTAS[ruta]() : renderInicio());
}

createRoot(document.querySelector("#root")).render(h(App));
