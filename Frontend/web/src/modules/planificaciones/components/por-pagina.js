/* Selector de cantidad de planificaciones por pagina. */

import { h } from "../../../layouts/site-layout.js";

const TAMANOS = [10, 20, 50];

export function PorPagina({ id, valor, onCambiar }) {
  return h(
    "div",
    { className: "planif-por-pagina" },
    h(
      "label",
      { htmlFor: id },
      "Por página ",
      h(
        "select",
        { id, value: valor, onChange: (evento) => onCambiar(Number(evento.target.value)) },
        TAMANOS.map((tamano) => h("option", { key: tamano, value: tamano }, String(tamano)))
      )
    )
  );
}
