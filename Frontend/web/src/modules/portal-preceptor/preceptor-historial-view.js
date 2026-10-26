/* Historial: la asistencia diaria registrada en las divisiones del preceptor,
   con filtros por division y fechas, detalle y correccion. */

import { h } from "../../layouts/site-layout.js";
import { HistorialTomas } from "../portal-docente/components/historial-tomas.js";
import { PortalPreceptorLayout, useCursosPreceptor } from "./components/portal-preceptor-layout.js";
import { PortalPreceptorService } from "./portal-preceptor-service.js";

/* El preceptor corrige la asistencia de sus divisiones; el backend vuelve a
   validar el alcance. */
const puedeCorregirDia = () => true;

export default function PreceptorHistorialView() {
  const { cursos } = useCursosPreceptor();

  return h(
    PortalPreceptorLayout,
    {
      activa: "historial",
      titulo: "Historial de asistencia",
      bajada: "Consultá la asistencia diaria registrada en tus divisiones y corregila si hace falta."
    },
    h(
      "section",
      { className: "portal-panel" },
      h(HistorialTomas, {
        clases: cursos.map((curso) => ({ cursoId: curso.id, anio: curso.anio, division: curso.division })),
        servicio: PortalPreceptorService,
        puedeCorregir: puedeCorregirDia
      })
    )
  );
}
