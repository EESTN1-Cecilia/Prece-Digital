/* Historial de estados de una planificacion, del cambio mas reciente al mas
   antiguo: estado anterior -> nuevo, fecha, usuario y motivo. Lo usan el
   detalle y la pantalla de revision. */

import { h } from "../../../layouts/site-layout.js";
import { fecha } from "../../../utils/formato.js";
import { EstadoPlanificacion } from "./estado-planificacion.js";

export function HistorialEstados({ entradas }) {
  if (!entradas?.length) {
    return h("p", { className: "data-nota" }, "Sin cambios de estado registrados.");
  }

  const ordenadas = [...entradas].sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));

  return h(
    "ol",
    { className: "planif-historial" },
    ordenadas.map((entrada, indice) =>
      h(
        "li",
        { key: `${entrada.fecha}-${indice}`, className: "planif-historial__item" },
        h(
          "div",
          { className: "planif-historial__estados" },
          entrada.estadoAnterior ? h(EstadoPlanificacion, { estado: entrada.estadoAnterior }) : null,
          entrada.estadoAnterior ? h("span", { "aria-hidden": "true" }, "→") : null,
          h(EstadoPlanificacion, { estado: entrada.estadoNuevo })
        ),
        h("p", { className: "planif-historial__meta" }, `${fecha(entrada.fecha)} · ${entrada.usuario?.nombre ?? "Usuario no disponible"}`),
        entrada.motivo ? h("p", { className: "planif-historial__motivo" }, entrada.motivo) : null
      )
    )
  );
}
