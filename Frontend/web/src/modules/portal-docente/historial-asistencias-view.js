/* Historial: las asistencias registradas en los cursos del docente, con
   filtros por division y fechas, detalle y correccion. */

import { h } from "../../layouts/site-layout.js";
import { PortalLayout } from "./components/portal-layout.js";
import { useMisCursos } from "./components/use-mis-cursos.js";
import { HistorialTomas } from "./components/historial-tomas.js";
import { expandirClases } from "./portal-docente-logica.js";

export default function HistorialAsistenciasView() {
  const { cursos } = useMisCursos();

  return h(
    PortalLayout,
    {
      activa: "historial",
      titulo: "Historial de asistencias",
      bajada: "Consultá las asistencias que se registraron en tus cursos. Cada corrección queda guardada con tu usuario, la fecha y la hora."
    },
    h("section", { className: "portal-panel" }, h(HistorialTomas, { clases: expandirClases(cursos) }))
  );
}
