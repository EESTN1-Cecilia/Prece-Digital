import React from "react";
import { h } from "../../../../layouts/site-layout.js";

/**
 * StudentAcademicTab: Presenta la situación académica global y la grilla de materias en curso con calificaciones.
 */
export function StudentAcademicTab({ situacionAcademica = {}, materias = [] }) {
  const getEstadoBadgeClass = (estado) => {
    const s = String(estado || "").toLowerCase();
    if (s.includes("aprobada")) return "badge-materia-aprobada";
    if (s.includes("desaprobada") || s.includes("riesgo")) return "badge-materia-desaprobada";
    if (s.includes("pendiente")) return "badge-materia-pendiente";
    if (s.includes("curso")) return "badge-materia-en-curso";
    if (s.includes("evaluacion")) return "badge-materia-evaluacion";
    return "badge-materia-sin-info";
  };

  const estadoGeneral = situacionAcademica.estadoGeneral || "Regular al día";
  const esRiesgo = estadoGeneral.toLowerCase().includes("riesgo") || (situacionAcademica.materiasDesaprobadas || 0) >= 3;
  const esIntensificar = estadoGeneral.toLowerCase().includes("intensificar") || (situacionAcademica.materiasPendientes || 0) > 0 || (situacionAcademica.materiasDesaprobadas || 0) > 0;

  return h(
    "div",
    { className: "student-tab-content-pane" },

    // Sección 4: Situación Académica
    h(
      "div",
      { className: "profile-section-card" },
      h(
        "div",
        { className: "profile-section-header" },
        h(
          "div",
          { className: "profile-section-title-wrap" },
          h(
            "div",
            { className: "section-icon-badge" },
            h(
              "svg",
              { className: "profile-section-icon", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" },
              h("path", { d: "M22 10v6M2 10l10-5 10 5-10 5z" }),
              h("path", { d: "M6 12v5c3 3 9 3 12 0v-5" })
            )
          ),
          h(
            "div",
            null,
            h("h2", { className: "profile-section-title" }, "4. Situación Académica"),
            h("span", { className: "profile-section-subtitle-inline" }, "Diagnóstico general de avance y condición de promoción")
          )
        ),
        h(
          "span",
          { className: "profile-section-badge-tag" },
          `Ciclo Lectivo ${situacionAcademica.anioLectivo || 2026}`
        )
      ),

      // Métricas KPI de situación académica
      h(
        "div",
        { className: "academic-kpi-grid" },
        // 1. Estado Académico
        h(
          "div",
          { className: `academic-kpi-card ${esRiesgo ? "kpi-danger" : esIntensificar ? "kpi-warning" : "kpi-success"}` },
          h(
            "div",
            { className: "kpi-header-row" },
            h("span", { className: "academic-kpi-label" }, "Estado Académico"),
            h(
              "span",
              { className: `kpi-status-dot ${esRiesgo ? "dot-danger" : esIntensificar ? "dot-warning" : "dot-success"}` }
            )
          ),
          h("span", { className: "academic-kpi-value kpi-title-value" }, estadoGeneral)
        ),

        // 2. Promedio General
        h(
          "div",
          { className: "academic-kpi-card kpi-accent" },
          h(
            "div",
            { className: "kpi-header-row" },
            h("span", { className: "academic-kpi-label" }, "Promedio General"),
            h(
              "svg",
              { className: "kpi-micro-icon text-accent", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" },
              h("polygon", { points: "12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" })
            )
          ),
          h(
            "div",
            { className: "kpi-promedio-wrap" },
            h("span", { className: "academic-kpi-value text-accent" }, situacionAcademica.promedioGeneral ? situacionAcademica.promedioGeneral.toFixed(1) : "—"),
            h("span", { className: "kpi-promedio-scale" }, "/ 10")
          )
        ),

        // 3. Materias Aprobadas
        h(
          "div",
          { className: "academic-kpi-card kpi-success" },
          h(
            "div",
            { className: "kpi-header-row" },
            h("span", { className: "academic-kpi-label" }, "Materias Aprobadas"),
            h(
              "svg",
              { className: "kpi-micro-icon text-success", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" },
              h("path", { d: "M22 11.08V12a10 10 0 1 1-5.93-9.14" }),
              h("polyline", { points: "22 4 12 14.01 9 11.01" })
            )
          ),
          h("span", { className: "academic-kpi-value text-success" }, String(situacionAcademica.materiasAprobadas ?? 0))
        ),

        // 4. Materias Pendientes
        h(
          "div",
          { className: `academic-kpi-card ${(situacionAcademica.materiasPendientes || 0) > 0 ? "kpi-warning" : ""}` },
          h(
            "div",
            { className: "kpi-header-row" },
            h("span", { className: "academic-kpi-label" }, "Materias Pendientes"),
            h(
              "svg",
              { className: "kpi-micro-icon text-muted", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" },
              h("circle", { cx: "12", cy: "12", r: "10" }),
              h("polyline", { points: "12 6 12 12 14 14" })
            )
          ),
          h("span", { className: `academic-kpi-value ${(situacionAcademica.materiasPendientes || 0) > 0 ? "text-warning" : ""}` }, String(situacionAcademica.materiasPendientes ?? 0))
        ),

        // 5. Materias Desaprobadas
        h(
          "div",
          { className: `academic-kpi-card ${(situacionAcademica.materiasDesaprobadas || 0) > 0 ? "kpi-danger" : ""}` },
          h(
            "div",
            { className: "kpi-header-row" },
            h("span", { className: "academic-kpi-label" }, "Materias Desaprobadas"),
            h(
              "svg",
              { className: "kpi-micro-icon text-muted", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" },
              h("circle", { cx: "12", cy: "12", r: "10" }),
              h("line", { x1: "15", y1: "9", x2: "9", y2: "15" }),
              h("line", { x1: "9", y1: "9", x2: "15", y2: "15" })
            )
          ),
          h("span", { className: `academic-kpi-value ${(situacionAcademica.materiasDesaprobadas || 0) > 0 ? "text-danger" : ""}` }, String(situacionAcademica.materiasDesaprobadas ?? 0))
        ),

        // 6. Evaluaciones Pendientes
        h(
          "div",
          { className: "academic-kpi-card" },
          h(
            "div",
            { className: "kpi-header-row" },
            h("span", { className: "academic-kpi-label" }, "Eval. Pendientes"),
            h(
              "svg",
              { className: "kpi-micro-icon text-muted", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" },
              h("path", { d: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" }),
              h("polyline", { points: "14 2 14 8 20 8" }),
              h("line", { x1: "16", y1: "13", x2: "8", y2: "13" })
            )
          ),
          h("span", { className: "academic-kpi-value" }, String(situacionAcademica.evaluacionesPendientes ?? 0))
        )
      ),

      // Detalle estructurado de situación académica (Cards elegantes con micro-iconos)
      h(
        "div",
        { className: "academic-details-grid" },
        h(
          "div",
          { className: "academic-detail-box" },
          h(
            "div",
            { className: "detail-box-icon-wrap icon-blue" },
            h(
              "svg",
              { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" },
              h("rect", { x: "3", y: "4", width: "18", height: "18", rx: "2", ry: "2" }),
              h("line", { x1: "16", y1: "2", x2: "16", y2: "6" }),
              h("line", { x1: "8", y1: "2", x2: "8", y2: "6" }),
              h("line", { x1: "3", y1: "10", x2: "21", y2: "10" })
            )
          ),
          h(
            "div",
            { className: "detail-box-content" },
            h("span", { className: "detail-box-label" }, "Año Lectivo"),
            h("span", { className: "detail-box-value" }, String(situacionAcademica.anioLectivo || 2026))
          )
        ),

        h(
          "div",
          { className: "academic-detail-box" },
          h(
            "div",
            { className: "detail-box-icon-wrap icon-indigo" },
            h(
              "svg",
              { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" },
              h("path", { d: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" }),
              h("circle", { cx: "9", cy: "7", r: "4" })
            )
          ),
          h(
            "div",
            { className: "detail-box-content" },
            h("span", { className: "detail-box-label" }, "Curso y División"),
            h("span", { className: "detail-box-value highlight-val" }, `${situacionAcademica.curso || "3°"} Div. ${situacionAcademica.division || "4"}`)
          )
        ),

        h(
          "div",
          { className: "academic-detail-box" },
          h(
            "div",
            { className: "detail-box-icon-wrap icon-amber" },
            h(
              "svg",
              { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" },
              h("circle", { cx: "12", cy: "12", r: "5" }),
              h("line", { x1: "12", y1: "1", x2: "12", y2: "3" }),
              h("line", { x1: "12", y1: "21", x2: "12", y2: "23" }),
              h("line", { x1: "4.22", y1: "4.22", x2: "5.64", y2: "5.64" }),
              h("line", { x1: "18.36", y1: "18.36", x2: "19.78", y2: "19.78" }),
              h("line", { x1: "1", y1: "12", x2: "3", y2: "12" }),
              h("line", { x1: "21", y1: "12", x2: "23", y2: "12" })
            )
          ),
          h(
            "div",
            { className: "detail-box-content" },
            h("span", { className: "detail-box-label" }, "Turno y Modalidad"),
            h("span", { className: "detail-box-value" }, `${situacionAcademica.turno || "Tarde"} • ${situacionAcademica.orientacion || "Ciclo Básico"}`)
          )
        ),

        h(
          "div",
          { className: "academic-detail-box promotion-highlight-box" },
          h(
            "div",
            { className: "detail-box-icon-wrap promo-icon" },
            h(
              "svg",
              { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" },
              h("path", { d: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" }),
              h("path", { d: "m9 12 2 2 4-4" })
            )
          ),
          h(
            "div",
            { className: "detail-box-content" },
            h("span", { className: "detail-box-label promo-lbl" }, "Condición de Promoción"),
            h("span", { className: "detail-box-value font-bold promo-val" }, situacionAcademica.estadoPromocion || "En condiciones de promoción directa")
          )
        )
      ),

      // Observaciones Académicas Callout
      h(
        "div",
        { className: "academic-observation-callout" },
        h(
          "svg",
          { className: "callout-icon", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" },
          h("circle", { cx: "12", cy: "12", r: "10" }),
          h("line", { x1: "12", y1: "16", x2: "12", y2: "12" }),
          h("line", { x1: "12", y1: "8", x2: "12.01", y2: "8" })
        ),
        h(
          "div",
          { className: "callout-body" },
          h("strong", { className: "callout-title" }, "Observaciones Pedagógicas: "),
          h("span", { className: "callout-text" }, situacionAcademica.observacionesAcademicas || "Seguimiento pedagógico regular sin novedades reportadas en el ciclo vigente.")
        )
      )
    ),

    // Sección 5: Materias
    h(
      "div",
      { className: "profile-section-card" },
      h(
        "div",
        { className: "profile-section-header" },
        h(
          "div",
          { className: "profile-section-title-wrap" },
          h(
            "div",
            { className: "section-icon-badge" },
            h(
              "svg",
              { className: "profile-section-icon", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" },
              h("path", { d: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20" }),
              h("path", { d: "M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" })
            )
          ),
          h(
            "div",
            null,
            h("h2", { className: "profile-section-title" }, "5. Materias y Calificaciones"),
            h("span", { className: "profile-section-subtitle-inline" }, `Listado curricular correspondiente al ciclo lectivo (${materias.length} materias)`)
          )
        )
      ),

      materias && materias.length > 0
        ? h(
            "div",
            { className: "table-responsive-wrapper" },
            h(
              "table",
              { className: "data-table materias-table" },
              h(
                "thead",
                null,
                h(
                  "tr",
                  null,
                  h("th", { style: { width: "24%" } }, "Materia"),
                  h("th", null, "Docente"),
                  h("th", { className: "text-center" }, "1° Cuatr."),
                  h("th", { className: "text-center" }, "2° Cuatr."),
                  h("th", { className: "text-center" }, "Promedio"),
                  h("th", { className: "text-center" }, "Definitiva"),
                  h("th", { className: "text-center" }, "Estado"),
                  h("th", null, "Instancias / Obs.")
                )
              ),
              h(
                "tbody",
                null,
                materias.map((mat, idx) =>
                  h(
                    "tr",
                    { key: mat.id || idx },
                    h(
                      "td",
                      { className: "font-medium" },
                      h("span", { className: "materia-title" }, mat.nombre || "Materia"),
                      h("span", { className: "materia-curso-sub" }, `${mat.curso || ""} ${mat.division ? `Div. ${mat.division}` : ""}`)
                    ),
                    h("td", { className: "text-muted" }, mat.docente || "A designar"),
                    h(
                      "td",
                      { className: "text-center font-mono" },
                      mat.calificaciones?.primerCuatrimestre !== null && mat.calificaciones?.primerCuatrimestre !== undefined
                        ? h("span", { className: "grade-cell" }, String(mat.calificaciones.primerCuatrimestre))
                        : "—"
                    ),
                    h(
                      "td",
                      { className: "text-center font-mono" },
                      mat.calificaciones?.segundoCuatrimestre !== null && mat.calificaciones?.segundoCuatrimestre !== undefined
                        ? h("span", { className: "grade-cell" }, String(mat.calificaciones.segundoCuatrimestre))
                        : "—"
                    ),
                    h(
                      "td",
                      { className: "text-center font-mono font-semibold" },
                      mat.promedio !== null && mat.promedio !== undefined
                        ? h("span", { className: `grade-badge ${mat.promedio >= 7 ? "grade-pass" : "grade-warn"}` }, mat.promedio.toFixed(1))
                        : "—"
                    ),
                    h(
                      "td",
                      { className: "text-center font-mono font-bold" },
                      mat.calificaciones?.definitiva !== null && mat.calificaciones?.definitiva !== undefined
                        ? h("span", { className: "grade-definitiva" }, String(mat.calificaciones.definitiva))
                        : "—"
                    ),
                    h(
                      "td",
                      { className: "text-center" },
                      h("span", { className: `badge-materia ${getEstadoBadgeClass(mat.estado)}` }, mat.estado || "En curso")
                    ),
                    h(
                      "td",
                      { className: "text-sm text-muted" },
                      mat.instanciasPendientes && mat.instanciasPendientes.length > 0
                        ? h(
                            "div",
                            { className: "instancias-box" },
                            h("strong", null, "Pendiente: "),
                            mat.instanciasPendientes.join(", ")
                          )
                        : mat.observaciones || "—"
                    )
                  )
                )
              )
            )
          )
        : h(
            "div",
            { className: "empty-state-card" },
            h("p", null, "No hay materias registradas en el plan de estudios para este alumno.")
          )
    )
  );
}
