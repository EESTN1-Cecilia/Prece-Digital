/* Grafico del panel de jefatura: barras horizontales de matricula por ciclo y
   orientacion, con sus valores, porcentajes y un resumen accesible. */

import React from "react";
import { h } from "../../layouts/site-layout.js";

const formatoNumero = new Intl.NumberFormat("es-AR");

export function numero(valor) {
  return formatoNumero.format(valor ?? 0);
}

function porcentaje(valor, total) {
  return total ? `${Math.round((valor / total) * 100)} %` : "0 %";
}

export function escalaDeBarras(partes) {
  const maximo = Math.max(0, ...partes.map((parte) => Number(parte.valor) || 0));
  if (maximo === 0) return [];
  const paso = Math.max(1, Math.ceil(maximo / 4));
  const maximoEje = paso * 4;
  return Array.from({ length: 5 }, (_, indice) => indice * paso).map((valor) => ({
    valor,
    posicion: `${(valor / maximoEje) * 100}%`
  }));
}

/* partes: [{ etiqueta, detalle, valor, tono }] con tono = basico | programacion | informatica */
export function DistribucionAlumnos({ partes, titulo = "Alumnos de la escuela" }) {
  const total = partes.reduce((suma, parte) => suma + parte.valor, 0);
  const maximo = Math.max(0, ...partes.map((parte) => Number(parte.valor) || 0));
  const eje = escalaDeBarras(partes);
  const resumen = partes.map((parte) => `${parte.etiqueta}: ${parte.valor}`).join(", ");

  return h(
    "div",
    { className: "jf-distribucion" },
    h(
      "figure",
      { className: "jf-distribucion__figura" },
      h("figcaption", { className: "jf-distribucion__total" }, h("strong", null, numero(total)), " alumnos en total"),
      h(
        "ul",
        { className: "jf-distribucion__lista", role: "img", "aria-label": `${titulo}. ${resumen}` },
        partes.map((parte) =>
          h(
            "li",
            { key: parte.tono, className: "jf-distribucion__item" },
            h(
              "div",
              { className: "jf-distribucion__fila" },
              h("span", { className: "jf-distribucion__nombre" }, parte.etiqueta),
              h("strong", null, numero(parte.valor)),
              h("small", null, porcentaje(parte.valor, total))
            ),
            parte.detalle ? h("span", { className: "jf-distribucion__detalle" }, parte.detalle) : null,
            h(
              "div",
              { className: "jf-distribucion__pista", "aria-hidden": "true" },
              h("div", {
                className: `jf-tono--${parte.tono}`,
                style: { width: `${maximo ? (parte.valor / maximo) * 100 : 0}%` }
              })
            )
          )
        )
      ),
      h(
        "div",
        { className: "jf-distribucion__eje", "aria-hidden": "true" },
        h("span", null, "Alumnos"),
        h(
          "div",
          null,
          eje.map((marca) =>
            h("span", { key: marca.valor, style: { left: marca.posicion } }, numero(marca.valor))
          )
        )
      )
    )
  );
}
