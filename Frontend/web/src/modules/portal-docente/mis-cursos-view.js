/* Mis Cursos: una tarjeta por cada division + materia asignada al docente
   autenticado (el backend ya filtra: nunca aparecen cursos ajenos). */

import { h } from "../../layouts/site-layout.js";
import { Esqueleto, MensajeError, SinDatos } from "../../components/ui/index.js";
import { PortalLayout } from "./components/portal-layout.js";
import { useMisCursos } from "./components/use-mis-cursos.js";
import { expandirClases } from "./portal-docente-logica.js";
import { usePlanillaCalificaciones } from "./components/planilla-calificaciones-portal.js";

function Dato({ etiqueta, valor }) {
  return h("div", { className: "portal-curso__dato" }, h("dt", null, etiqueta), h("dd", null, valor ?? "—"));
}

export default function MisCursosView() {
  const { cursos, cargando, error, recargar } = useMisCursos();
  const clases = expandirClases(cursos);
  const planilla = usePlanillaCalificaciones(clases);

  let cuerpo;

  if (error) {
    cuerpo = h(MensajeError, { error, onReintentar: recargar });
  } else if (cargando) {
    cuerpo = h(Esqueleto, { filas: 2, columnas: 3 });
  } else if (!clases.length) {
    cuerpo = h(SinDatos, {
      titulo: "No tenés cursos asignados",
      descripcion: "Las asignaciones las registra Dirección o Jefatura de Área. Cuando estén cargadas, vas a ver tus cursos acá."
    });
  } else {
    cuerpo = h(
      "ul",
      { className: "portal-cursos", "aria-label": "Cursos asignados" },
      clases.map((clase) =>
        h(
          "li",
          { key: clase.clave, className: "portal-curso" },
          h(
            "div",
            { className: "portal-curso__cabecera" },
            h("span", { className: "portal-curso__anio", "aria-hidden": "true" }, `${clase.anio}°${clase.division}`),
            h(
              "div",
              null,
              h("h2", { className: "portal-curso__materia" }, clase.materia ?? "Materia sin especificar"),
              h("span", { className: "portal-curso__division" }, `${clase.anio}° año · División ${clase.division}`)
            )
          ),
          h(
            "dl",
            { className: "portal-curso__datos" },
            h(Dato, { etiqueta: "Turno", valor: clase.turno }),
            h(Dato, { etiqueta: "Alumnos", valor: clase.cantidadAlumnos }),
            h(Dato, { etiqueta: "Horario", valor: clase.horario ?? "Sin registrar" })
          ),
          h(
            "div",
            { className: "portal-curso__acciones" },
            h("a", { href: `#/docente/cursos/${clase.cursoId}`, className: "portal-boton portal-boton--contorno" }, "Ver curso"),
            h(
              "a",
              {
                href: `#/docente/asistencias?curso=${clase.cursoId}&materia=${encodeURIComponent(clase.materia ?? "")}`,
                className: "portal-boton"
              },
              "Tomar asistencia"
            ),
            h(
              "button",
              { type: "button", className: "portal-boton portal-boton--contorno", onClick: () => planilla.abrir(clase) },
              "Cargar calificaciones"
            )
          )
        )
      )
    );
  }

  return h(
    PortalLayout,
    { activa: "cursos", titulo: "Mis Cursos", bajada: "Las divisiones y materias que tenés asignadas en este ciclo lectivo." },
    cuerpo,
    planilla.modal
  );
}
