import { useState } from "react";
import { h, IconoFigma } from "../../../layouts/site-layout.js";

/**
 * StudentAttendanceSummary: Componente para visualizar el resumen de inasistencias y asistencia
 */
export function StudentAttendanceSummary({ inasistencias, defaultExpanded = true }) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  if (!inasistencias) return null;

  const {
    total = 0,
    justificadas = 0,
    injustificadas = 0,
    porcentajeAsistencia = 95,
    inasistenciasRelevantes = 0,
    periodo = "Ciclo Lectivo 2026",
    alertaInasistencias = false,
    umbralAlerta = 15
  } = inasistencias;

  const esAlertaCritica = total >= 20;
  const esAlertaMedia = total >= umbralAlerta || alertaInasistencias;

  return h(
    "div",
    { className: `student-summary-card student-attendance-summary-card ${isExpanded ? "card--expanded" : "card--collapsed"}` },
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
            strokeLinejoin: "round"
          },
          h("rect", { x: "3", y: "4", width: "18", height: "18", rx: "2", ry: "2" }),
          h("line", { x1: "16", y1: "2", x2: "16", y2: "6" }),
          h("line", { x1: "8", y1: "2", x2: "8", y2: "6" }),
          h("line", { x1: "3", y1: "10", x2: "21", y2: "10" })
        ),
        h("h3", { className: "student-summary-card__title" }, "Resumen de Inasistencias")
      ),
      h(
        "div",
        { className: "student-school-badges" },
        h("span", { className: "attendance-period-tag" }, periodo),
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
          { className: "student-attendance-summary__body" },
          // Indicador de Alerta si supera el límite de inasistencias
          esAlertaMedia
            ? h(
                "div",
                {
                  className: `attendance-alert-banner ${
                    esAlertaCritica
                      ? "attendance-alert-banner--critical"
                      : "attendance-alert-banner--warning"
                  }`
                },
                h(IconoFigma, { className: "attendance-alert-icon", nombre: "support" }),
                h(
                  "div",
                  { className: "attendance-alert-text" },
                  h(
                    "strong",
                    null,
                    esAlertaCritica
                      ? "Atención: Pérdida de regularidad inminente"
                      : "Alerta preventiva de inasistencias"
                  ),
                  h(
                    "p",
                    null,
                    `El alumno acumula ${total} inasistencias totales (${injustificadas} injustificadas), superando el umbral de ${umbralAlerta} faltas.`
                  )
                )
              )
            : null,

          // Bloques de desglose y porcentaje
          h(
            "div",
            { className: "attendance-metrics-container" },
            // Gráfico / Barra de porcentaje de asistencia
            h(
              "div",
              { className: "attendance-percentage-card" },
              h(
                "div",
                { className: "percentage-circle-wrap" },
                h(
                  "div",
                  {
                    className: `percentage-circle ${
                      porcentajeAsistencia < 75
                        ? "percentage--danger"
                        : porcentajeAsistencia < 85
                        ? "percentage--warning"
                        : "percentage--success"
                    }`
                  },
                  h("span", { className: "percentage-number" }, `${porcentajeAsistencia}%`),
                  h("span", { className: "percentage-sub" }, "Asistencia")
                )
              ),
              h(
                "div",
                { className: "percentage-progress-bar-wrap" },
                h("div", {
                  className: "percentage-progress-bar-fill",
                  style: { width: `${Math.min(100, Math.max(0, porcentajeAsistencia))}%` }
                })
              )
            ),

            // Desglose de Faltas
            h(
              "div",
              { className: "attendance-breakdown-grid" },
              h(
                "div",
                { className: "attendance-counter-item item--total" },
                h("span", { className: "counter-label" }, "Total Inasistencias"),
                h("strong", { className: "counter-value" }, String(total)),
                h("span", { className: "counter-sub" }, "Faltas computadas")
              ),
              h(
                "div",
                { className: "attendance-counter-item item--justificadas" },
                h("span", { className: "counter-label" }, "Justificadas"),
                h("strong", { className: "counter-value" }, String(justificadas)),
                h("span", { className: "counter-sub" }, "Con certificado médico/nota")
              ),
              h(
                "div",
                { className: "attendance-counter-item item--injustificadas" },
                h("span", { className: "counter-label" }, "Injustificadas"),
                h(
                  "strong",
                  { className: `counter-value ${injustificadas > 5 ? "text-danger" : ""}` },
                  String(injustificadas)
                ),
                h("span", { className: "counter-sub" }, "Sin justificativo")
              )
            )
          )
        )
      : null
  );
}
