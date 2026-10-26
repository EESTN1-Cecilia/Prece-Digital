/* Mis cursos del preceptor: una tarjeta por division asignada (el backend ya
   filtra: nunca aparecen divisiones ajenas). */

import { h } from "../../layouts/site-layout.js";
import { Esqueleto, MensajeError, SinDatos } from "../../components/ui/index.js";
import { etiquetaTurno } from "../portal-docente/portal-docente-logica.js";
import { PortalPreceptorLayout, useCursosPreceptor } from "./components/portal-preceptor-layout.js";

function Dato({ etiqueta, valor }) {
  return h("div", { className: "portal-curso__dato" }, h("dt", null, etiqueta), h("dd", null, valor ?? "—"));
}

export function TarjetasCursos({ cursos, acciones }) {
  return h(
    "ul",
    { className: "portal-cursos", "aria-label": "Divisiones asignadas" },
    cursos.map((curso) =>
      h(
        "li",
        { key: curso.id, className: "portal-curso" },
        h(
          "div",
          { className: "portal-curso__cabecera" },
          h("span", { className: "portal-curso__anio", "aria-hidden": "true" }, `${curso.anio}°${curso.division}`),
          h(
            "div",
            null,
            h("h2", { className: "portal-curso__materia" }, `${curso.anio}° año · División ${curso.division}`),
            h("span", { className: "portal-curso__division" }, curso.orientacion ?? "Ciclo Básico")
          )
        ),
        h(
          "dl",
          { className: "portal-curso__datos" },
          h(Dato, { etiqueta: "Turno", valor: etiquetaTurno(curso.turno) }),
          h(Dato, { etiqueta: "Alumnos", valor: curso.cantidadAlumnos }),
          h(Dato, { etiqueta: "Curso", valor: `${curso.anio}° ${curso.division}` })
        ),
        h("div", { className: "portal-curso__acciones" }, acciones(curso))
      )
    )
  );
}

export default function PreceptorCursosView() {
  const { cursos, cargando, error, recargar } = useCursosPreceptor();

  let cuerpo;

  if (error) {
    cuerpo = h(MensajeError, { error, onReintentar: recargar });
  } else if (cargando) {
    cuerpo = h(Esqueleto, { filas: 2, columnas: 3 });
  } else if (!cursos.length) {
    cuerpo = h(SinDatos, {
      titulo: "No tenés divisiones asignadas",
      descripcion: "Las asignaciones las registra Dirección. Cuando estén cargadas, vas a ver tus cursos acá."
    });
  } else {
    cuerpo = h(TarjetasCursos, {
      cursos,
      acciones: (curso) => [
        h("a", { key: "ver", href: `#/preceptor/cursos/${curso.id}`, className: "portal-boton portal-boton--contorno" }, "Ver curso"),
        h("a", { key: "asistencia", href: `#/preceptor/asistencia?curso=${curso.id}`, className: "portal-boton" }, "Asistencia"),
        h("a", { key: "boletines", href: `#/preceptor/cursos/${curso.id}/boletines`, className: "portal-boton portal-boton--contorno" }, "Boletines")
      ]
    });
  }

  return h(
    PortalPreceptorLayout,
    { activa: "cursos", titulo: "Mis cursos", bajada: "Las divisiones que Dirección te asignó en este ciclo lectivo." },
    cuerpo
  );
}
