import { useState } from "react";
import { h, IconoFigma } from "../../layouts/site-layout.js";
import { Boton, Card } from "../../components/ui/index.js";

/* Figma: "Inicio-Prece" variante Secretario (2250:2 / Contenedor 2250:62). */

function Chip({ children }) {
  return h(
    "button",
    { className: "chip", type: "button" },
    h(IconoFigma, { className: "chip__chevron", nombre: "chevron" }),
    h("span", null, children)
  );
}

function ActivityList({ items }) {
  return h(
    "div",
    { className: "activity-list" },
    items.map((item, index) =>
      h(
        "div",
        { className: "activity-item", key: `${item.overline}-${index}` },
        h("span", null, item.overline),
        h("strong", null, item.title)
      )
    )
  );
}

function TableroAlumnos() {
  const cambios = [
    { overline: "0 Inasistencias consecutivas", title: "Alumno Apellido, Grado, Grupo" },
    { overline: "0 Inasistencias consecutivas", title: "Alumno Apellido, Grado, Grupo" },
    { overline: "0 Inasistencias consecutivas", title: "Alumno Apellido, Grado, Grupo" }
  ];
  const novedades = [
    { overline: "Pase de ingreso", title: "Alumno Apellido, Grado, Grupo" },
    { overline: "Conflicto de Taller", title: "Alumno Apellido, Grado, Grupo" },
    { overline: "Pase de ingreso", title: "Alumno Apellido, Grado, Grupo" }
  ];

  return h(
    "section",
    { className: "dashboard", "aria-labelledby": "tablero-alumnos-title" },
    h(
      "div",
      { className: "dashboard__top" },
      h(
        "h2",
        { id: "tablero-alumnos-title" },
        h(IconoFigma, { className: "sliders-icon", nombre: "filter" }),
        "Tablero"
      ),
      h(
        "div",
        { className: "dashboard__actions dashboard__actions--una" },
        h(Boton, { variante: "primario", icono: "clipboard" }, "Listado de Alumnos")
      )
    ),
    h("div", { className: "dashboard__filtros" }, h(Chip, null, "Curso"), h(Chip, null, "División")),
    h(
      "div",
      { className: "metrics metrics--tres" },
      h(Card, { className: "metric", valor: "0 | 0", descripcion: "Activos - Inactivos" }),
      h(Card, { className: "metric", valor: "0", descripcion: "Total" }),
      h(Card, { className: "metric", valor: "0", descripcion: "Inasistencias relevantes" })
    ),
    h(
      "div",
      { className: "metrics metrics--tres" },
      h(Card, { className: "metric", valor: "0", descripcion: "Observaciones" }),
      h(Card, { className: "metric", valor: "0", descripcion: "Documentación pendiente" }),
      h(Card, { className: "metric", valor: "0", descripcion: "Situación académica pendiente" })
    ),
    h(
      "div",
      { className: "activity-titles" },
      h("h3", null, "Cambios de curso"),
      h("h3", null, "Resumen de novedades")
    ),
    h(
      "div",
      { className: "activity-grid activity-grid--dos" },
      h(ActivityList, { items: cambios }),
      h(ActivityList, { items: novedades })
    ),
    h(
      "div",
      { className: "dashboard__footer-actions" },
      h("button", { type: "button" }, "Planilla"),
      h("button", { className: "is-light", type: "button" }, "Materias"),
      h("button", { type: "button" }, "Plantillas")
    )
  );
}

export default function SecretariaView() {
  const [abierto, setAbierto] = useState(true);

  return h(
    "section",
    { className: "welcome-panel" },
    h(
      "div",
      { className: "welcome-panel__heading" },
      h("h1", null, "Bienvenido Secretario ", h("span", null, "“Nombre”")),
      h("p", null, "E.E.S.T N°1")
    ),
    h(
      "p",
      { className: "welcome-panel__intro" },
      "Desde este espacio podés consultar el legajo de cada estudiante, cargar altas y pases, y revisar la documentación pendiente. También vas a ver los cambios de curso, las inasistencias relevantes y las novedades que necesitan seguimiento."
    ),
    h(
      "div",
      { className: `course-section${abierto ? " course-section--open" : ""}` },
      h(
        "button",
        {
          className: "course-header",
          type: "button",
          onClick: () => setAbierto((actual) => !actual),
          "aria-expanded": abierto
        },
        h(IconoFigma, { className: "people-icon", nombre: "students" }),
        h("span", { className: "course-header__title" }, "Alumnos"),
        h(IconoFigma, {
          className: `course-header__chevron${abierto ? " course-header__chevron--open" : ""}`,
          nombre: "chevron"
        })
      ),
      abierto ? h(TableroAlumnos) : null
    )
  );
}
