/* Grafico del panel de jefatura: una dona con la matricula total repartida en
   tres colores (Ciclo Basico, Programacion e Informatica), con el detalle en
   barras al lado. Se dibuja con un SVG, sin librerias, y lleva un resumen en
   texto para lectores de pantalla. */

import React from "react";
import { h } from "../../layouts/site-layout.js";

const formatoNumero = new Intl.NumberFormat("es-AR");

export function numero(valor) {
  return formatoNumero.format(valor ?? 0);
}

function porcentaje(valor, total) {
  return total ? `${Math.round((valor / total) * 100)} %` : "0 %";
}

/* partes: [{ etiqueta, detalle, valor, tono }] con tono = basico | programacion | informatica */
export function DistribucionAlumnos({ partes, titulo = "Alumnos de la escuela" }) {
  const total = partes.reduce((suma, parte) => suma + parte.valor, 0);
  const radio = 52;
  const circunferencia = 2 * Math.PI * radio;
  let acumulado = 0;
  const resumen = partes.map((parte) => `${parte.etiqueta}: ${parte.valor}`).join(", ");

  return h(
    "div",
    { className: "jf-distribucion" },
    h(
      "div",
      { className: "jf-distribucion__dona" },
      h(
        "svg",
        { viewBox: "0 0 140 140", role: "img", "aria-label": `${titulo}. Total ${total}. ${resumen}` },
        h("circle", { className: "jf-distribucion__fondo", cx: 70, cy: 70, r: radio, fill: "none", strokeWidth: 16 }),
        total > 0
          ? partes.map((parte) => {
              const largo = (parte.valor / total) * circunferencia;
              const segmento = h("circle", {
                key: parte.tono,
                className: `jf-trazo--${parte.tono}`,
                cx: 70,
                cy: 70,
                r: radio,
                fill: "none",
                strokeWidth: 16,
                strokeDasharray: `${Math.max(0, largo - 1.5)} ${circunferencia - Math.max(0, largo - 1.5)}`,
                strokeDashoffset: -acumulado,
                transform: "rotate(-90 70 70)"
              });
              acumulado += largo;
              return segmento;
            })
          : null
      ),
      h("div", { className: "jf-distribucion__centro" }, h("strong", null, numero(total)), h("span", null, "alumnos"))
    ),
    h(
      "ul",
      { className: "jf-distribucion__lista" },
      partes.map((parte) =>
        h(
          "li",
          { key: parte.tono },
          h(
            "div",
            { className: "jf-distribucion__fila" },
            h("i", { className: `jf-tono--${parte.tono}`, "aria-hidden": "true" }),
            h("span", { className: "jf-distribucion__nombre" }, parte.etiqueta),
            h("strong", null, numero(parte.valor)),
            h("small", null, porcentaje(parte.valor, total))
          ),
          parte.detalle ? h("span", { className: "jf-distribucion__detalle" }, parte.detalle) : null,
          h(
            "div",
            { className: "jf-distribucion__pista", "aria-hidden": "true" },
            h("div", { className: `jf-tono--${parte.tono}`, style: { width: `${total ? Math.max(parte.valor ? 4 : 0, (parte.valor / total) * 100) : 0}%` } })
          )
        )
      )
    )
  );
}
