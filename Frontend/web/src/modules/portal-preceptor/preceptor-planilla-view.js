/* Asistencia del Portal Preceptor: la planilla mensual institucional
   alimentada con las divisiones, alumnos y asistencia diaria que el backend
   autoriza al preceptor autenticado. */

import { h } from "../../layouts/site-layout.js";
import AsistenciasView from "../attendance/asistencias-view.js";
import { PortalPreceptorLayout } from "./components/portal-preceptor-layout.js";
import { fuentePlanillaPreceptor } from "./planilla-preceptor-fuente.js";

export default function PreceptorPlanillaView() {
  return h(
    PortalPreceptorLayout,
    { activa: "asistencia" },
    h("div", { className: "portal-planilla" }, h(AsistenciasView, { fuente: fuentePlanillaPreceptor }))
  );
}
