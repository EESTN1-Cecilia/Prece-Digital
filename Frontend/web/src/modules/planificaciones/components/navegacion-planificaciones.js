/* Navegacion interna del modulo: listado general, bandeja de revision y
   consultas por docente, materia y curso. La entrada activa se marca con
   aria-current. Cada entrada declara su permiso: no se ofrece una pestaña
   que despues termina en acceso denegado (el guardia de rutas igual la
   protege si alguien escribe la direccion). */

import { h } from "../../../layouts/site-layout.js";
import { usePermisos } from "../../../estado/index.js";
import { PERMISOS } from "../../../utils/permisos.js";

const ENTRADAS = [
  { id: "listado", titulo: "Todas", href: "#/planificaciones" },
  { id: "revision", titulo: "Revisión", href: "#/planificaciones/revision", permiso: PERMISOS.planificacionesGestionar },
  { id: "docentes", titulo: "Por docente", href: "#/planificaciones/docentes" },
  { id: "materias", titulo: "Por materia", href: "#/planificaciones/materias" },
  { id: "cursos", titulo: "Por curso", href: "#/planificaciones/cursos" }
];

export function NavegacionPlanificaciones({ activa }) {
  const { puede } = usePermisos();

  return h(
    "nav",
    { className: "planif-nav", "aria-label": "Consultas de planificaciones" },
    ENTRADAS.filter((entrada) => !entrada.permiso || puede(entrada.permiso)).map((entrada) =>
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
