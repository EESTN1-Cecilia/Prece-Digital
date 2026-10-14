import { useState } from "react";
import { h, IconoFigma } from "../../../layouts/site-layout.js";
import { StatusBadge, ConditionBadge } from "./student-badges.js";

/**
 * StudentSchoolInfo: Componente para visualizar la situación escolar actual del alumno
 */
export function StudentSchoolInfo({ escolar, defaultExpanded = true }) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  if (!escolar) return null;

  const {
    curso,
    division,
    turno,
    turnoTaller,
    condicion,
    estado,
    anioLectivo,
    orientacion
  } = escolar;

  return h(
    "div",
    { className: `student-summary-card student-school-info-card ${isExpanded ? "card--expanded" : "card--collapsed"}` },
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
          h("path", { d: "M22 10v6M2 10l10-5 10 5-10 5z" }),
          h("path", { d: "M6 12v5c3 3 9 3 12 0v-5" })
        ),
        h("h3", { className: "student-summary-card__title" }, "Información Escolar")
      ),
      h(
        "div",
        { className: "student-school-badges" },
        h(StatusBadge, { status: estado, label: estado }),
        h(ConditionBadge, { condicion }),
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
          { className: "student-school-info__body" },
          h(
            "div",
            { className: "student-metrics-grid" },
            h(
              "div",
              { className: "student-metric-box highlight-metric" },
              h("span", { className: "metric-label" }, "Curso y División"),
              h("strong", { className: "metric-value-primary" }, `${curso || "1°"} Div. ${division || "1"}`),
              h("span", { className: "metric-subtext" }, `Ciclo Lectivo ${anioLectivo || 2026}`)
            ),
            h(
              "div",
              { className: "student-metric-box" },
              h("span", { className: "metric-label" }, "Turno Aula"),
              h("strong", { className: "metric-value" }, turno || "Mañana"),
              turnoTaller
                ? h("span", { className: "metric-subtext" }, `Taller: ${turnoTaller}`)
                : null
            ),
            h(
              "div",
              { className: "student-metric-box" },
              h("span", { className: "metric-label" }, "Orientación"),
              h("strong", { className: "metric-value text-sm" }, orientacion || "Ciclo Básico"),
              h("span", { className: "metric-subtext" }, "E.E.S.T. N°1")
            ),
            h(
              "div",
              { className: "student-metric-box" },
              h("span", { className: "metric-label" }, "Condición Matrícula"),
              h("strong", { className: "metric-value" }, condicion || "Regular"),
              h("span", { className: "metric-subtext" }, estado === "Activo" ? "Cursando actualmente" : "No activo")
            )
          )
        )
      : null
  );
}
