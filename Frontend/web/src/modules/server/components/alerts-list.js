import React from "react";
import { h, IconoFigma } from "../../../layouts/site-layout.js";
import { EmptyState } from "../../../components/common/state-handlers.js";

function getAlertIcon(tipo) {
  const t = (tipo || "").toLowerCase();
  if (t.includes("sin_stock") || t.includes("agotado")) {
    return h(
      "svg",
      { className: "server-alert-icon text-danger", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" },
      h("circle", { cx: "12", cy: "12", r: "10" }),
      h("line", { x1: "15", y1: "9", x2: "9", y2: "15" }),
      h("line", { x1: "9", y1: "9", x2: "15", y2: "15" })
    );
  }
  if (t.includes("bajo") || t.includes("stock")) {
    return h(
      "svg",
      { className: "server-alert-icon text-warning", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" },
      h("path", { d: "m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" }),
      h("line", { x1: "12", y1: "9", x2: "12", y2: "13" }),
      h("line", { x1: "12", y1: "17", x2: "12.01", y2: "17" })
    );
  }
  return h(
    "svg",
    { className: "server-alert-icon text-primary", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" },
    h("circle", { cx: "12", cy: "12", r: "10" }),
    h("line", { x1: "12", y1: "16", x2: "12", y2: "12" }),
    h("line", { x1: "12", y1: "8", x2: "12.01", y2: "8" })
  );
}

export function AlertsList({
  alertas = [],
  onIrARecurso,
  onDescartarAlerta
}) {
  if (!alertas || alertas.length === 0) {
    return h(EmptyState, { mensaje: "Excelente: no hay alertas críticas ni advertencias de stock activas." });
  }

  return h(
    "div",
    { className: "server-alerts-list" },
    alertas.map((alerta) => {
      const esCritica = alerta.prioridad === "urgente" || alerta.prioridad === "alta" || alerta.tipo === "sin_stock";

      return h(
        "div",
        {
          key: alerta.id,
          className: `server-alert-card ${esCritica ? "server-alert-card--critical" : "server-alert-card--warning"}`
        },
        h(
          "div",
          { className: "server-alert-left" },
          h("div", { className: "server-alert-icon-box" }, getAlertIcon(alerta.tipo)),
          h(
            "div",
            { className: "server-alert-content" },
            h(
              "div",
              { className: "server-alert-topline" },
              h("strong", { className: "server-alert-title" }, alerta.titulo),
              h("span", { className: "server-alert-date" }, alerta.fecha)
            ),
            h("p", { className: "server-alert-desc" }, alerta.descripcion),
            alerta.recursoNombre
              ? h(
                  "div",
                  { className: "server-alert-resource-link" },
                  h(
                    "button",
                    {
                      type: "button",
                      className: "btn-alert-jump",
                      onClick: () => onIrARecurso && onIrARecurso(alerta)
                    },
                    `Ver recurso: ${alerta.recursoNombre} →`
                  )
                )
              : null
          )
        ),
        h(
          "div",
          { className: "server-alert-actions" },
          h(
            "button",
            {
              type: "button",
              className: "btn-alert-dismiss",
              onClick: () => onDescartarAlerta && onDescartarAlerta(alerta.id),
              title: "Descartar alerta"
            },
            "×"
          )
        )
      );
    })
  );
}
