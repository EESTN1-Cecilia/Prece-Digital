/* Navegacion interna del modulo: listado general y consultas por docente,
   materia y curso. La entrada activa se marca con aria-current. */

import { h } from "../../../layouts/site-layout.js";

const ENTRADAS = [
  { id: "listado", titulo: "Todas", href: "#/planificaciones" },
  { id: "revision", titulo: "Revisión", href: "#/planificaciones/revision" },
  { id: "docentes", titulo: "Por docente", href: "#/planificaciones/docentes" },
  { id: "materias", titulo: "Por materia", href: "#/planificaciones/materias" },
  { id: "cursos", titulo: "Por curso", href: "#/planificaciones/cursos" }
];

export function NavegacionPlanificaciones({ activa }) {
  return h(
    "nav",
    { className: "planif-nav", "aria-label": "Consultas de planificaciones" },
    ENTRADAS.map((entrada) =>
      h(
        "a",
        {
          key: entrada.id,
          href: entrada.href,
          className: entrada.id === activa ? "planif-nav__enlace planif-nav__enlace--activo" : "planif-nav__enlace",
          "aria-current": entrada.id === activa ? "page" : undefined
        },
        entrada.titulo
      )
    )
  );
}
