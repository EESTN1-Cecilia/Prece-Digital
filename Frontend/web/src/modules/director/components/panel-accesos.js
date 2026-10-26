/* Panel de Accesos: navegacion directa por areas y sectores de la institucion.

   Lo usa el tablero de Direccion y las pantallas que se abren desde el (por
   ejemplo Gestion de Docentes), para que el panel se vea igual en todas y
   marque donde esta parado el usuario. `rutaActiva` es el hash de la pantalla
   actual: el enlace que coincide queda resaltado y con aria-current="page".

   Server y Jefatura siguen deshabilitados por configuracion del tablero. */

import { h } from "../../../layouts/site-layout.js";

function icono(...hijos) {
  return function Icono({ width = "16", height = "16" }) {
    return h(
      "svg",
      { width, height, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", style: { flexShrink: 0 } },
      ...hijos
    );
  };
}

const IconClipboard = icono(
  h("path", { key: "a", d: "M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" }),
  h("rect", { key: "b", x: "8", y: "2", width: "8", height: "4", rx: "1", ry: "1" })
);

const IconUsers = icono(
  h("path", { key: "a", d: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" }),
  h("circle", { key: "b", cx: "9", cy: "7", r: "4" }),
  h("path", { key: "c", d: "M23 21v-2a4 4 0 0 0-3-3.87" }),
  h("path", { key: "d", d: "M16 3.13a4 4 0 0 1 0 7.75" })
);

const IconSchool = icono(
  h("path", { key: "a", d: "M22 10v6M2 10l10-5 10 5-10 5z" }),
  h("path", { key: "b", d: "M6 12v5c3 3 9 3 12 0v-5" })
);

const IconClock = icono(
  h("circle", { key: "a", cx: "12", cy: "12", r: "10" }),
  h("polyline", { key: "b", points: "12 6 12 12 16 14" })
);

/* Docente frente a un pizarron. */
const IconDocente = icono(
  h("rect", { key: "a", x: "9", y: "3", width: "13", height: "10", rx: "1.5" }),
  h("circle", { key: "b", cx: "5.5", cy: "8", r: "2.5" }),
  h("path", { key: "c", d: "M1.5 21v-3.5A3.5 3.5 0 0 1 5 14h1.5l4-2.5" })
);

const IconServer = icono(
  h("rect", { key: "a", x: "2", y: "2", width: "20", height: "8", rx: "2", ry: "2" }),
  h("rect", { key: "b", x: "2", y: "14", width: "20", height: "8", rx: "2", ry: "2" }),
  h("line", { key: "c", x1: "6", y1: "6", x2: "6.01", y2: "6" }),
  h("line", { key: "d", x1: "6", y1: "18", x2: "6.01", y2: "18" })
);

const IconWrench = icono(
  h("path", { key: "a", d: "M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" })
);

/* Cada sector tiene un acceso principal y sus submodulos. */
function secciones({ mostrarServer, mostrarJefatura }) {
  return [
    {
      id: "sec",
      titulo: "Secretaría",
      principal: { href: "#/secretaria", titulo: "Secretaría", detalle: "Legajos y Documentación", icono: IconClipboard },
      subs: [
        { href: "#/alumnos", titulo: "Alumnos", icono: IconUsers },
        { href: "#/cursos", titulo: "Cursos", icono: IconSchool }
      ]
    },
    {
      id: "doc",
      titulo: "Cuerpo Docente",
      principal: { href: "#/docentes", titulo: "Docentes", detalle: "Gestión y Asignaciones", icono: IconDocente },
      subs: []
    },
    {
      id: "prec",
      titulo: "Preceptoría",
      principal: { href: "#/preceptoria", titulo: "Preceptoría", detalle: "Asistencias y Cursos", icono: IconClock },
      subs: [{ href: "#/asistencias", titulo: "Asistencias", icono: IconClock }]
    },
    mostrarServer
      ? {
          id: "srv",
          titulo: "Server",
          principal: { href: "#/server", titulo: "Server", detalle: "Stock y Equipamiento", icono: IconServer },
          subs: [{ href: "#/inventario", titulo: "Inventario", icono: IconServer }]
        }
      : null,
    mostrarJefatura
      ? {
          id: "jef",
          titulo: "Jefatura",
          principal: { href: "#/jefatura", titulo: "Jefatura", detalle: "Talleres y Grillas", icono: IconWrench },
          subs: [{ href: "#/jefatura", titulo: "Talleres", icono: IconWrench }]
        }
      : null
  ].filter(Boolean);
}

export function PanelAccesos({ rutaActiva = null, mostrarServer = false, mostrarJefatura = false }) {
  const activo = (href) => rutaActiva === href;

  return h(
    "aside",
    { className: "director-sidebar-access", "aria-label": "Accesos Rápidos Institucionales" },
    h(
      "div",
      { className: "director-sidebar-access__header" },
      h("span", { className: "director-sidebar-access__tag" }, "Accesos Rápidos"),
      h("h2", { className: "director-sidebar-access__title" }, "Panel de Accesos"),
      h("p", { className: "director-sidebar-access__subtitle" }, "Navegación directa por áreas y sectores")
    ),
    h(
      "nav",
      { className: "director-sidebar-nav-grouped" },
      secciones({ mostrarServer, mostrarJefatura }).flatMap((seccion) => [
        h("div", { key: `side-div-${seccion.id}`, className: "director-sidebar-divider-label" }, seccion.titulo),
        h(
          "a",
          {
            key: `side-link-${seccion.id}`,
            href: seccion.principal.href,
            className: `director-sidebar-item director-sidebar-item--${seccion.id}${activo(seccion.principal.href) ? " director-sidebar-item--activo" : ""}`,
            "aria-current": activo(seccion.principal.href) ? "page" : undefined
          },
          h("div", { className: `director-sidebar-icon director-sidebar-icon--${seccion.id}` }, h(seccion.principal.icono, { width: "16", height: "16" })),
          h(
            "div",
            { className: "director-sidebar-item-text" },
            h("strong", null, seccion.principal.titulo),
            h("span", null, seccion.principal.detalle)
          ),
          h("span", { className: "director-sidebar-item-arrow", "aria-hidden": "true" }, "➔")
        ),
        ...seccion.subs.map((sub) =>
          h(
            "a",
            {
              key: `side-sub-${seccion.id}-${sub.titulo}`,
              href: sub.href,
              className: `director-sidebar-sub-btn${activo(sub.href) ? " director-sidebar-sub-btn--activo" : ""}`,
              "aria-current": activo(sub.href) ? "page" : undefined
            },
            h(sub.icono, { width: "15", height: "15" }),
            h("span", null, sub.titulo)
          )
        )
      ])
    )
  );
}
