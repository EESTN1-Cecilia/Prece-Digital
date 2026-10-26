/* Tomar Asistencia del Portal Docente: la planilla mensual institucional
   (la misma de Preceptoria) alimentada con los cursos, alumnos y tomas que el
   backend autoriza al docente autenticado. */

import { h } from "../../layouts/site-layout.js";
import AsistenciasView from "../attendance/asistencias-view.js";
import { PortalLayout } from "./components/portal-layout.js";
import { fuentePlanillaDocente } from "./planilla-docente-fuente.js";

export default function PortalPlanillaView() {
  return h(
    PortalLayout,
    { activa: "asistencia" },
    h("div", { className: "portal-planilla" }, h(AsistenciasView, { fuente: fuentePlanillaDocente }))
  );
}
