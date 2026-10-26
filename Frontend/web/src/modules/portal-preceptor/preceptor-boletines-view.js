/* Boletines del Portal Preceptor: por cada division asignada, imprimir los
   boletines de todo el curso o elegir un alumno desde la lista. */

import { h } from "../../layouts/site-layout.js";
import { Esqueleto, MensajeError, SinDatos } from "../../components/ui/index.js";
import { PortalPreceptorLayout, useCursosPreceptor } from "./components/portal-preceptor-layout.js";
import { TarjetasCursos } from "./preceptor-cursos-view.js";

export default function PreceptorBoletinesView() {
  const { cursos, cargando, error, recargar } = useCursosPreceptor();

  let cuerpo;

  if (error) {
    cuerpo = h(MensajeError, { error, onReintentar: recargar });
  } else if (cargando) {
    cuerpo = h(Esqueleto, { filas: 2, columnas: 3 });
  } else if (!cursos.length) {
    cuerpo = h(SinDatos, {
      titulo: "No tenés divisiones asignadas",
      descripcion: "Cuando Dirección te asigne divisiones, vas a poder imprimir sus boletines desde acá."
    });
  } else {
    cuerpo = h(TarjetasCursos, {
      cursos,
      acciones: (curso) => [
        h("a", { key: "alumno", href: `#/preceptor/cursos/${curso.id}`, className: "portal-boton portal-boton--contorno" }, "Elegir alumno"),
        h("a", { key: "curso", href: `#/preceptor/cursos/${curso.id}/boletines`, className: "portal-boton" }, "Boletines del curso")
      ]
    });
  }

  return h(
    PortalPreceptorLayout,
    {
      activa: "boletines",
      titulo: "Boletines",
      bajada: "Imprimí el boletín de un alumno o los de toda la división: dos boletines por hoja Oficio, en orden de lista."
    },
    cuerpo
  );
}
