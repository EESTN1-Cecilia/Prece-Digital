/* Inicio del preceptor: el tablero de preceptoria, o un aviso si la Direccion
   todavia no le asigno cursos. Los cursos salen del backend
   (GET /api/v1/preceptores/mis-cursos); el backend ademas recorta cada pedido
   a esos cursos, asi que esto es solo la experiencia de uso. */

import { useEffect, useState } from "react";
import { h } from "../../layouts/site-layout.js";
import { CargandoPantalla } from "../../components/ui/index.js";
import { pedir } from "../../services/http.js";
import { useUsuarioActual } from "../../estado/index.js";
import DashboardView from "./dashboard-view.js";

export const MENSAJE_SIN_CURSOS = "No tenés cursos asignados actualmente. Comunicate con el Director para solicitar una asignación.";

export default function PreceptorInicioView() {
  const { roles } = useUsuarioActual();
  const soloPreceptor = roles.length > 0 && roles.every((rol) => rol === "preceptor");
  const [cursos, setCursos] = useState(soloPreceptor ? null : []);

  useEffect(() => {
    if (!soloPreceptor) return;
    pedir("/api/v1/preceptores/mis-cursos")
      .then((lista) => setCursos(Array.isArray(lista) ? lista : []))
      .catch(() => setCursos([]));
  }, [soloPreceptor]);

  if (soloPreceptor && cursos === null) return h(CargandoPantalla, { texto: "Cargando tus cursos..." });

  if (soloPreceptor && cursos.length === 0) {
    return h(
      "section",
      { className: "welcome-panel", role: "status" },
      h("h1", { className: "secretaria-title" }, "Tablero de preceptoría"),
      h("p", null, MENSAJE_SIN_CURSOS)
    );
  }

  return h(DashboardView);
}
