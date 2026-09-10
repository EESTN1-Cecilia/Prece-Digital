/* Botones compartidos.

   Una sola implementacion visual para todo el sistema: las pantallas eligen la
   variante y el tamano, nunca las clases. `Boton` es un <button> y `BotonEnlace`
   un <a> con la misma apariencia, para navegacion. */

import { h, IconoFigma } from "../../layouts/site-layout.js";
import { Spinner } from "./estado.js";

const VARIANTES = ["primario", "secundario", "contorno", "peligro", "exito", "texto"];
const TAMANOS = ["chico", "medio", "grande"];

function clases({ variante, tamano, ancho, extra }) {
  const elegida = VARIANTES.includes(variante) ? variante : "primario";
  const medida = TAMANOS.includes(tamano) ? tamano : "medio";

  return [
    "ui-boton",
    `ui-boton--${elegida}`,
    `ui-boton--${medida}`,
    ancho ? "ui-boton--ancho" : null,
    extra
  ]
    .filter(Boolean)
    .join(" ");
}

function contenido({ icono, cargando, children }) {
  return [
    cargando ? h(Spinner, { key: "spinner", tamano: "chico", etiqueta: null }) : null,
    !cargando && icono ? h(IconoFigma, { key: "icono", className: "ui-boton__icono", nombre: icono }) : null,
    h("span", { key: "texto" }, children)
  ];
}

export function Boton({
  variante = "primario",
  tamano = "medio",
  tipo = "button",
  icono,
  cargando = false,
  deshabilitado = false,
  ancho = false,
  className,
  onClick,
  children,
  ...resto
}) {
  /* Mientras carga el boton queda inactivo: evita el doble envio sin que cada
     formulario tenga que llevar su propia bandera. */
  const inactivo = deshabilitado || cargando;

  return h(
    "button",
    {
      className: clases({ variante, tamano, ancho, extra: className }),
      type: tipo,
      disabled: inactivo,
      "aria-busy": cargando ? "true" : undefined,
      onClick: inactivo ? undefined : onClick,
      ...resto
    },
    ...contenido({ icono, cargando, children })
  );
}

export function BotonEnlace({
  href,
  variante = "secundario",
  tamano = "medio",
  icono,
  deshabilitado = false,
  ancho = false,
  className,
  children,
  ...resto
}) {
  return h(
    "a",
    {
      className: clases({ variante, tamano, ancho, extra: className }),
      href: deshabilitado ? undefined : href,
      "aria-disabled": deshabilitado ? "true" : undefined,
      role: deshabilitado ? "link" : undefined,
      ...resto
    },
    ...contenido({ icono, cargando: false, children })
  );
}

/* Grupo de botones alineados, usado en cabeceras de panel y pies de modal. */
export function Acciones({ alineacion = "derecha", children }) {
  return h("div", { className: `ui-acciones ui-acciones--${alineacion}` }, children);
}
