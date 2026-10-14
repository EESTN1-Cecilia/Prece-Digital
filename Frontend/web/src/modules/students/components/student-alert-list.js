import { useState } from "react";
import { h, IconoFigma } from "../../../layouts/site-layout.js";
import { AlertBadge } from "./student-badges.js";

/**
 * StudentAlertList: Componente para visualizar las alertas importantes asociadas al alumno
 */
export function StudentAlertList({ alertas = [], defaultExpanded = true }) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const tieneAlertas = Array.isArray(alertas) && alertas.length > 0;

  return h(
    "div",
    { className: `student-summary-card student-alert-list-card ${isExpanded ? "card--expanded" : "card--collapsed"}` },
    h(
      "div",
      {
        className: "student-summary-card__header student-summary-card__header--clickable",
        onClick: () => setIsExpanded((prev) => !prev),
        role: "button",
        tabIndex: 0,
        "aria-expanded": isExpanded
      },
      h(
        "div",
        { className: "student-summary-card__title-wrap" },
        h(
          "svg",
          {
            className: "student-summary-card__icon",
            viewBox: "0 0 24 24",
            fill: "none",
            stroke: "currentColor",
            strokeWidth: "2",
            strokeLinecap: "round",
            strokeLinejoin: "round",
            "aria-hidden": "true"
          },
          h("path", { d: "M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" }),
          h("path", { d: "M13.73 21a2 2 0 0 1-3.46 0" })
        ),
        h("h3", { className: "student-summary-card__title" }, "Alertas Importantes")
      ),
      h(
        "div",
        { className: "student-school-badges" },
        h(
          "span",
          {
            className: `alerts-count-badge ${
              tieneAlertas ? "alerts-count-badge--has" : "alerts-count-badge--none"
            }`
          },
          tieneAlertas ? `${alertas.length} alerta(s)` : "Sin alertas"
        ),
        h(
          "button",
          {
            type: "button",
            className: `card-toggle-btn ${isExpanded ? "card-toggle-btn--expanded" : ""}`,
            onClick: (e) => {
              e.stopPropagation();
              setIsExpanded((prev) => !prev);
            },
            "aria-label": isExpanded ? "Contraer sección" : "Desplegar sección"
          },
          h(
            "svg",
            {
              className: "card-chevron-icon",
              viewBox: "0 0 24 24",
              fill: "none",
              stroke: "currentColor",
              strokeWidth: "2.5",
              strokeLinecap: "round",
              strokeLinejoin: "round"
            },
            h("polyline", { points: "6 9 12 15 18 9" })
          )
        )
      )
    ),
    isExpanded
      ? h(
          "div",
          { className: "student-alert-list__body" },
          !tieneAlertas
            ? h(
                "div",
                { className: "alert-list-empty" },
                h(
                  "svg",
                  {
                    className: "alert-empty-icon",
                    viewBox: "0 0 20 20",
                    fill: "none",
                    stroke: "currentColor",
                    strokeWidth: "2"
                  },
                  h("path", { d: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" })
                ),
                h("p", null, "El alumno no posee alertas ni observaciones pendientes.")
              )
            : h(
                "div",
                { className: "alert-cards-stack" },
                alertas.map((alerta, index) => {
                  const p = (alerta.prioridad || "media").toLowerCase();
                  const severidadClase =
                    p === "urgente" || p === "critica"
                      ? "alert-item--urgent"
                      : p === "alta"
                      ? "alert-item--high"
                      : p === "media"
                      ? "alert-item--medium"
                      : "alert-item--low";

                  return h(
                    "article",
                    { key: alerta.id || index, className: `student-alert-item ${severidadClase}` },
                    h(
                      "div",
                      { className: "student-alert-item__top" },
                      h(
                        "div",
                        { className: "alert-type-and-title" },
                        alerta.tipo
                          ? h("span", { className: "alert-type-chip" }, alerta.tipo)
                          : null,
                        h("h4", { className: "alert-title" }, alerta.titulo)
                      ),
                      h(AlertBadge, { prioridad: alerta.prioridad })
                    ),
                    h("p", { className: "alert-description" }, alerta.descripcion),
                    h(
                      "div",
                      { className: "student-alert-item__footer" },
                      h(
                        "div",
                        { className: "alert-meta-info" },
                        alerta.fecha
                          ? h(
                              "span",
                              { className: "alert-date" },
                              h(
                                "svg",
                                {
                                  className: "alert-calendar-icon",
                                  viewBox: "0 0 24 24",
                                  fill: "none",
                                  stroke: "currentColor",
                                  strokeWidth: "2",
                                  strokeLinecap: "round",
                                  strokeLinejoin: "round",
                                  "aria-hidden": "true"
                                },
                                h("rect", { x: "3", y: "4", width: "18", height: "18", rx: "2", ry: "2" }),
                                h("line", { x1: "16", y1: "2", x2: "16", y2: "6" }),
                                h("line", { x1: "8", y1: "2", x2: "8", y2: "6" }),
                                h("line", { x1: "3", y1: "10", x2: "21", y2: "10" })
                              ),
                              h("span", null, alerta.fecha)
                            )
                          : null,
                        alerta.estado
                          ? h(
                              "span",
                              { className: "alert-status-text" },
                              `Estado: ${alerta.estado}`
                            )
                          : null
                      ),
                      alerta.recursoRelacionado
                        ? h(
                            "a",
                            {
                              href: alerta.recursoRelacionado,
                              className: "alert-action-link",
                              title: "Ver recurso asociado"
                            },
                            "Consultar detalle →"
                          )
                        : null
                    )
                  );
                })
              )
        )
      : null
  );
}
