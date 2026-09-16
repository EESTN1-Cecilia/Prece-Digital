import { h } from "../../../../layouts/site-layout.js";

/**
 * StudentGradeBookTab: Muestra la información del Libro Matriz histórico organizada por ciclo lectivo.
 */
export function StudentGradeBookTab({ libroMatriz = [], datosPersonales = {}, situacionAcademica = {} }) {
  return h(
    "div",
    { className: "student-tab-content-pane" },

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
            "svg",
            { className: "profile-section-icon", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" },
            h("path", { d: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20" }),
            h("path", { d: "M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" }),
            h("line", { x1: "12", y1: "6", x2: "12", y2: "14" }),
            h("line", { x1: "8", y1: "10", x2: "16", y2: "10" })
          ),
          h("h2", { className: "profile-section-title" }, "9. Libro Matriz Institucional")
        ),
        h("span", { className: "profile-section-subtitle" }, "Registro académico oficial permanente foliado")
      ),

      // Cabecera institucional del alumno en libro matriz
      h(
        "div",
        { className: "gradebook-header-banner" },
        h("div", { className: "gradebook-field" },
          h("span", { className: "lbl" }, "Estudiante:"),
          h("span", { className: "val font-bold" }, datosPersonales.nombreCompleto || `${datosPersonales.apellido}, ${datosPersonales.nombre}`)
        ),
        h("div", { className: "gradebook-field" },
          h("span", { className: "lbl" }, "DNI:"),
          h("span", { className: "val font-mono" }, datosPersonales.dni || "S/D")
        ),
        h("div", { className: "gradebook-field" },
          h("span", { className: "lbl" }, "Legajo Oficial:"),
          h("span", { className: "val font-mono" }, datosPersonales.legajo || `LEG-${datosPersonales.id}`)
        ),
        h("div", { className: "gradebook-field" },
          h("span", { className: "lbl" }, "Ciclo Actual:"),
          h("span", { className: "val font-medium" }, `${situacionAcademica.curso || "1°"} ${situacionAcademica.division || "1"} (${situacionAcademica.anioLectivo || 2026})`)
        )
      ),

      // Listado de años / períodos registrados en libro matriz
      libroMatriz && libroMatriz.length > 0
        ? h(
            "div",
            { className: "gradebook-years-stack" },
            libroMatriz.map((periodo, pIdx) =>
              h(
                "div",
                { key: periodo.anioLectivo || pIdx, className: "gradebook-period-block" },
                h(
                  "div",
                  { className: "gradebook-period-header" },
                  h(
                    "div",
                    { className: "period-title-row" },
                    h("h3", { className: "period-year-title" }, `Ciclo Lectivo ${periodo.anioLectivo} — Curso ${periodo.curso} Div. ${periodo.division}`),
                    h("span", { className: "period-condicion-badge" }, periodo.condicion || "Regular")
                  ),
                  h(
                    "div",
                    { className: "period-summary-row" },
                    h("span", { className: "period-result" }, `Resultado: ${periodo.resultadoFinal || "En curso"}`),
                    periodo.promedioFinal
                      ? h("span", { className: "period-avg" }, `Promedio Final: ${periodo.promedioFinal.toFixed(1)}`)
                      : null
                  )
                ),

                // Tabla de asignaturas del período
                periodo.materias && periodo.materias.length > 0
                  ? h(
                      "div",
                      { className: "table-responsive-wrapper mt-2" },
                      h(
                        "table",
                        { className: "data-table gradebook-table" },
                        h(
                          "thead",
                          null,
                          h(
                            "tr",
                            null,
                            h("th", { style: { width: "40%" } }, "Asignatura / Espacio Curricular"),
                            h("th", { className: "text-center" }, "Calificación Final"),
                            h("th", { className: "text-center" }, "Condición"),
                            h("th", { className: "text-center" }, "Libro"),
                            h("th", { className: "text-center" }, "Folio")
                          )
                        ),
                        h(
                          "tbody",
                          null,
                          periodo.materias.map((m, mIdx) =>
                            h(
                              "tr",
                              { key: mIdx },
                              h("td", { className: "font-medium" }, m.materia || "Materia"),
                              h("td", { className: "text-center font-mono font-bold" }, m.calificacionFinal !== null && m.calificacionFinal !== undefined ? String(m.calificacionFinal) : "—"),
                              h("td", { className: "text-center" },
                                h("span", { className: `badge-materia ${m.estado?.toLowerCase().includes("aprob") ? "badge-materia-aprobada" : "badge-materia-pendiente"}` }, m.estado || "Aprobada")
                              ),
                              h("td", { className: "text-center font-mono text-muted text-sm" }, m.libro || "—"),
                              h("td", { className: "text-center font-mono text-muted text-sm" }, m.folio || "—")
                            )
                          )
                        )
                      )
                    )
                  : null
              )
            )
          )
        : h(
            "div",
            { className: "empty-state-card" },
            h("p", null, "No se registran actas cerradas en Libro Matriz para este alumno.")
          )
    )
  );
}
