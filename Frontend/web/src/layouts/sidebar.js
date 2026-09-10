/* Menu lateral de movil.

   Las opciones salen de la tabla de rutas y ya vienen filtradas por lo que la
   sesion puede abrir. Ocultar una opcion no protege la ruta: el guardia la
   evalua igual si alguien escribe la direccion a mano.

   En escritorio no se muestra: ahi las secciones estan en la barra del
   encabezado. El panel se corre fuera de la vista y se abre desde el boton del
   encabezado. */

import React from "react";
import { IconoFigma } from "./site-layout.js";
import { armarMenu, hrefActivo } from "./menu.js";
import { RUTAS } from "../app/rutas.js";
import { useSesion } from "../estado/hooks.js";

const h = React.createElement;

function Entrada({ entrada, activo, onNavegar }) {
  return h(
    "li",
    null,
    h(
      "a",
      {
        className: activo ? "sidebar__enlace sidebar__enlace--activo" : "sidebar__enlace",
        href: entrada.href,
        "aria-current": activo ? "page" : undefined,
        onClick: onNavegar
      },
      entrada.icono
        ? h(IconoFigma, { className: "sidebar__icono", nombre: entrada.icono })
        : h("span", { className: "sidebar__icono sidebar__icono--vacio", "aria-hidden": "true" }),
      h("span", { className: "sidebar__texto" }, entrada.titulo)
    )
  );
}

export function Sidebar({ hash, abierto, onCerrar }) {
  const sesion = useSesion();
  const secciones = armarMenu(RUTAS, sesion);
  const activo = hrefActivo(
    hash,
    RUTAS,
    secciones.flatMap((seccion) => seccion.entradas.map((entrada) => entrada.href))
  );

  return h(
    "nav",
    {
      className: abierto ? "sidebar sidebar--abierto" : "sidebar",
      "aria-label": "Secciones"
    },
    h(
      "div",
      { className: "sidebar__cabecera" },
      h("span", { className: "sidebar__titulo" }, "Secciones"),
      h(
        "button",
        {
          className: "sidebar__cerrar",
          type: "button",
          "aria-label": "Cerrar el menu",
          onClick: onCerrar
        },
        "×"
      )
    ),
    secciones.length
      ? secciones.map((seccion) =>
          h(
            "div",
            { className: "sidebar__seccion", key: seccion.nombre },
            h("p", { className: "sidebar__seccion-titulo" }, seccion.nombre),
            h(
              "ul",
              null,
              seccion.entradas.map((entrada) =>
                h(Entrada, {
                  key: entrada.href,
                  entrada,
                  activo: entrada.href === activo,
                  onNavegar: onCerrar
                })
              )
            )
          )
        )
      : h("p", { className: "sidebar__vacio" }, "Tu usuario todavia no tiene secciones habilitadas.")
  );
}
