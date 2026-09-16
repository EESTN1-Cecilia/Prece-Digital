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
import AlumnoResumenView from "../modules/students/alumno-resumen-view.js";
import AlumnoPerfilView from "../modules/students/alumno-perfil-view.js";

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

function resolverComponenteRuta(hash) {
  const rawHash = hash || window.location.hash || "#/inicio";
  const baseHash = rawHash.split("?")[0];

  if (RUTAS[baseHash]) {
    return RUTAS[baseHash]();
  }

  // Coincidencia para ruta de ficha y perfil de alumno: #/alumnos/:id, #/alumnos/:id/ficha, #/alumnos/:id/perfil
  const matchAlumno = baseHash.match(/^#\/alumnos\/([^/?]+)(?:\/(ficha|perfil))?$/);
  if (matchAlumno && matchAlumno[1] !== "cargar" && matchAlumno[1] !== "nuevo" && matchAlumno[1] !== "buscar") {
    const studentId = decodeURIComponent(matchAlumno[1]);
    const subvista = matchAlumno[2];
    if (subvista === "perfil") {
      return h(AlumnoPerfilView, { id: studentId, ruta: { parametros: { id: studentId } } });
    }
    return h(AlumnoResumenView, { id: studentId, ruta: { parametros: { id: studentId } } });
  }

  return renderInicio();
}

function rutaActual() {
  const hash = window.location.hash || "#/inicio";
  return hash.split("?")[0];
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

  return h(SiteLayout, { ruta }, resolverComponenteRuta(ruta));
}

createRoot(document.querySelector("#root")).render(h(App));
