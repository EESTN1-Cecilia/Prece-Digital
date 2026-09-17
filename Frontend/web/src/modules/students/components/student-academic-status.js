import { useState } from "react";
import { h, IconoFigma } from "../../../layouts/site-layout.js";

/**
 * StudentAcademicStatus: Componente para visualizar el resumen de la situación académica del alumno
 */
export function StudentAcademicStatus({ academico, defaultExpanded = true }) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  if (!academico) return null;

  const {
    estadoGeneral = "Regular al día",
    materiasAprobadas = 0,
    materiasPendientes = 0,
    materiasDesaprobadas = 0,
    evaluacionesPendientes = 0,
    situacionPromocion = "En condiciones de promoción directa",
    promedioGeneral = null,
    totalMaterias = 12
  } = academico;

  const tieneAtencion = materiasDesaprobadas > 0 || materiasPendientes > 0;
  const esRiesgo = materiasDesaprobadas >= 3;

  return h(
    "div",
    { className: `student-summary-card student-academic-status-card ${isExpanded ? "card--expanded" : "card--collapsed"}` },
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
        h(IconoFigma, { className: "student-summary-card__icon", nombre: "students" }),
        h("h3", { className: "student-summary-card__title" }, "Estado Académico")
      ),
      h(
        "div",
        { className: "student-school-badges" },
        h(
          "span",
          {
            className: `status-badge ${
              esRiesgo
                ? "status-badge--danger"
                : tieneAtencion
                ? "status-badge--warning"
                : "status-badge--success"
            }`
          },
          estadoGeneral
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
          { className: "student-academic-status__body" },
          // Barra de proyección de promoción con ícono SVG claro
          h(
            "div",
            {
              className: `academic-promotion-banner ${
                esRiesgo
                  ? "academic-promotion-banner--danger"
                  : tieneAtencion
                  ? "academic-promotion-banner--warning"
                  : "academic-promotion-banner--success"
              }`
            },
            h(
              "div",
              { className: "academic-promotion-banner__icon-wrap" },
              esRiesgo || tieneAtencion
                ? h(
                    "svg",
                    {
                      className: "promotion-svg-icon",
                      viewBox: "0 0 24 24",
                      fill: "none",
                      stroke: "currentColor",
                      strokeWidth: "2.2",
                      strokeLinecap: "round",
                      strokeLinejoin: "round"
                    },
                    h("circle", { cx: "12", cy: "12", r: "10" }),
                    h("line", { x1: "12", y1: "8", x2: "12", y2: "12" }),
                    h("line", { x1: "12", y1: "16", x2: "12.01", y2: "16" })
                  )
                : h(
                    "svg",
                    {
                      className: "promotion-svg-icon",
                      viewBox: "0 0 24 24",
                      fill: "none",
                      stroke: "currentColor",
                      strokeWidth: "2.4",
                      strokeLinecap: "round",
                      strokeLinejoin: "round"
                    },
                    h("path", { d: "M22 11.08V12a10 10 0 1 1-5.93-9.14" }),
                    h("polyline", { points: "22 4 12 14.01 9 11.01" })
                  )
            ),
            h(
              "div",
              { className: "academic-promotion-banner__content" },
              h("strong", { className: "promotion-title" }, "Situación de Promoción:"),
              h("p", { className: "promotion-desc" }, situacionPromocion)
            )
          ),

          // Cuadrícula de contadores de materias
          h(
            "div",
            { className: "academic-counters-grid" },
            h(
              "div",
              { className: "academic-counter-box counter--aprobadas" },
              h("span", { className: "counter-number" }, materiasAprobadas),
              h("span", { className: "counter-label" }, "Aprobadas"),
              h("span", { className: "counter-subtext" }, `de ${totalMaterias} materias`)
            ),
            h(
              "div",
              {
                className: `academic-counter-box ${
                  materiasPendientes > 0 ? "counter--pendientes" : "counter--neutral"
                }`
              },
              h("span", { className: "counter-number" }, materiasPendientes),
              h("span", { className: "counter-label" }, "Pendientes / Previas"),
              h(
                "span",
                { className: "counter-subtext" },
                materiasPendientes > 0 ? "A intensificar" : "Sin pendientes"
              )
            ),
            h(
              "div",
              {
                className: `academic-counter-box ${
                  materiasDesaprobadas > 0 ? "counter--desaprobadas" : "counter--neutral"
                }`
              },
              h("span", { className: "counter-number" }, materiasDesaprobadas),
              h("span", { className: "counter-label" }, "Desaprobadas"),
              h(
                "span",
                { className: "counter-subtext" },
                materiasDesaprobadas > 0 ? "Requiere examen" : "0 desaprobadas"
              )
            ),
            evaluacionesPendientes > 0 || promedioGeneral !== null
              ? h(
                  "div",
                  { className: "academic-counter-box counter--evaluaciones" },
                  h(
                    "span",
                    { className: "counter-number" },
                    promedioGeneral !== null ? promedioGeneral : evaluacionesPendientes
                  ),
                  h(
                    "span",
                    { className: "counter-label" },
                    promedioGeneral !== null ? "Promedio General" : "Evaluaciones Pendientes"
                  ),
                  h(
                    "span",
                    { className: "counter-subtext" },
                    promedioGeneral !== null ? "Escala 1 a 10" : "Por calificar"
                  )
                )
              : null
          )
        )
      : null
  );
}
