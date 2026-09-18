import { h } from "../../../../layouts/site-layout.js";

/**
 * StudentGradeBookTab: Muestra la información del Libro Matriz histórico organizada por ciclo lectivo.
 */
export function StudentGradeBookTab({
  datosPersonales = {},
  situacionAcademica = {},
  onOpenMatrizModal
}) {
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
        h(
          "div",
          { className: "gradebook-header-right-actions" },
          onOpenMatrizModal
            ? h(
                "button",
                {
                  type: "button",
                  className: "btn-action-primary btn-open-matriz-modal",
                  onClick: onOpenMatrizModal,
                  title: "Abrir documento oficial de Libro Matriz / Certificado Analítico"
                },
                h(
                  "svg",
                  { className: "btn-action-icon", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" },
                  h("path", { d: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" }),
                  h("polyline", { points: "14 2 14 8 20 8" }),
                  h("line", { x1: "16", y1: "13", x2: "8", y2: "13" }),
                  h("line", { x1: "16", y1: "17", x2: "8", y2: "17" })
                ),
                h("span", null, "Ver Libro Matriz Oficial (7 Años)")
              )
            : null
        )
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

      // Panel de apertura del Libro Matriz Oficial
      h(
        "div",
        { className: "gradebook-modal-launcher-card" },
        h(
          "div",
          { className: "launcher-card-icon-wrap" },
          h(
            "svg",
            { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.8", className: "launcher-card-icon" },
            h("path", { d: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20" }),
            h("path", { d: "M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" }),
            h("line", { x1: "12", y1: "6", x2: "12", y2: "14" }),
            h("line", { x1: "8", y1: "10", x2: "16", y2: "10" })
          )
        ),
        h(
          "div",
          { className: "launcher-card-text" },
          h("h3", { className: "launcher-card-title" }, "Registro Académico Oficial y Certificado Analítico"),
          h(
            "p",
            { className: "launcher-card-desc" },
            "El registro completo de Libro Matriz oficial del estudiante se gestiona y visualiza a través del documento oficial institucional de 1° a 7° año, con soporte de edición foliada, firmas digitales y formato legal de impresión A4."
          )
        ),
        h(
          "button",
          {
            type: "button",
            className: "btn-action-primary btn-launcher-main",
            onClick: onOpenMatrizModal
          },
          h(
            "svg",
            { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", className: "btn-action-icon" },
            h("path", { d: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" }),
            h("polyline", { points: "14 2 14 8 20 8" }),
            h("line", { x1: "16", y1: "13", x2: "8", y2: "13" }),
            h("line", { x1: "16", y1: "17", x2: "8", y2: "17" })
          ),
          h("span", null, "Abrir Libro Matriz Oficial")
        )
      )
    )
  );
}
