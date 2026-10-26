/* Encabezado institucional de los documentos impresos (planillas de
   asistencia y listas de alumnos). Solo se ve al imprimir: en pantalla cada
   modulo conserva su propio diseno.

   `datos` es una lista de { etiqueta, valor }; los que no tienen valor no se
   muestran (no se imprimen campos vacios ni datos inventados). */

import { h } from "../../layouts/site-layout.js";
import { INSTITUCION_IMPRESION } from "../../config/institucion-impresion.js";

export function EncabezadoImpresion({ titulo, datos = [] }) {
  const visibles = datos.filter((dato) => dato && dato.valor !== null && dato.valor !== undefined && String(dato.valor).trim() !== "");

  return h(
    "header",
    { className: "impresion-encabezado solo-impresion" },
    h("img", { className: "impresion-encabezado__logo", src: INSTITUCION_IMPRESION.logo, alt: INSTITUCION_IMPRESION.logoAlt }),
    h(
      "div",
      { className: "impresion-encabezado__institucion" },
      h("strong", { className: "impresion-encabezado__nombre" }, INSTITUCION_IMPRESION.nombre),
      titulo ? h("span", { className: "impresion-encabezado__titulo" }, titulo) : null
    ),
    visibles.length
      ? h(
          "dl",
          { className: "impresion-encabezado__datos" },
          visibles.map((dato) =>
            h(
              "div",
              { key: dato.etiqueta, className: "impresion-encabezado__dato" },
              h("dt", null, dato.etiqueta),
              h("dd", null, String(dato.valor))
            )
          )
        )
      : null
  );
}

/* Aviso que solo aparece si el documento no entra en una hoja con una escala
   legible (ver utils/impresion.js). */
export function AvisoVariasHojas({ texto }) {
  return h("p", { className: "impresion-aviso-varias-hojas solo-impresion" }, texto);
}
