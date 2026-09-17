import { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { h } from "../../layouts/site-layout.js";
import {
  getFechaActual,
  BotonCerrarBarra
} from "./document-helpers.js";

// ============================================================================
// 3. MODAL: PLANILLA DE CALIFICACIONES 2026
// ============================================================================
export function PlanillaCalificacionesModal({ abierto, onCerrar }) {
  const [ordenCampo, setOrdenCampo] = useState("numero");
  const [ordenDir, setOrdenDir] = useState("asc");
  const [materiaSeleccionada, setMateriaSeleccionada] = useState("INGLÉS");
  const [cursoSeleccionado, setCursoSeleccionado] = useState("4° 1°");
  const fecha = useMemo(() => getFechaActual(), []);

  const [estudiantes, setEstudiantes] = useState([
    { num: 1, apellido: "Alvarez", nombre: "Nicolás Daniel", p1: "7", p2: "8", v1: "TEA", c1: "7.50", f1: 0, p3: "8", p4: "10", v2: "TEA", c2: "9.00", f2: 1, dic: "-", feb: "-", final: "8.25" },
    { num: 2, apellido: "Benítez", nombre: "Sofía Valentina", p1: "6", p2: "7", v1: "TEA", c1: "6.50", f1: 1, p3: "7", p4: "8", v2: "TEA", c2: "7.50", f2: 0, dic: "-", feb: "-", final: "7.00" },
    { num: 3, apellido: "Cabrera", nombre: "Antonella Solange", p1: "9", p2: "9", v1: "TEA", c1: "9.00", f1: 0, p3: "10", p4: "10", v2: "TEA", c2: "10.00", f2: 0, dic: "-", feb: "-", final: "9.50" },
    { num: 4, apellido: "Castro", nombre: "Brisa Morena", p1: "5", p2: "6", v1: "TEP", c1: "5.50", f1: 3, p3: "7", p4: "7", v2: "TEA", c2: "7.00", f2: 2, dic: "7.00", feb: "-", final: "7.00" },
    { num: 5, apellido: "Díaz", nombre: "Joaquín Lautaro", p1: "8", p2: "8", v1: "TEA", c1: "8.00", f1: 0, p3: "8", p4: "9", v2: "TEA", c2: "8.50", f2: 0, dic: "-", feb: "-", final: "8.25" },
    { num: 6, apellido: "Fernández", nombre: "Tomás Ignacio", p1: "7", p2: "7", v1: "TEA", c1: "7.00", f1: 2, p3: "7", p4: "8", v2: "TEA", c2: "7.50", f2: 1, dic: "-", feb: "-", final: "7.25" },
    { num: 7, apellido: "Giménez", nombre: "Martina Belén", p1: "10", p2: "10", v1: "TEA", c1: "10.00", f1: 0, p3: "9", p4: "10", v2: "TEA", c2: "9.50", f2: 0, dic: "-", feb: "-", final: "9.75" },
    { num: 8, apellido: "González", nombre: "Lucas Agustín", p1: "8", p2: "9", v1: "TEA", c1: "8.50", f1: 1, p3: "9", p4: "9", v2: "TEA", c2: "9.00", f2: 1, dic: "-", feb: "-", final: "8.75" },
    { num: 9, apellido: "López", nombre: "Camila Denise", p1: "4", p2: "5", v1: "TED", c1: "4.50", f1: 4, p3: "6", p4: "7", v2: "TEP", c2: "6.50", f2: 3, dic: "6.00", feb: "7.00", final: "7.00" },
    { num: 10, apellido: "Medina", nombre: "Lautaro Nahuel", p1: "8", p2: "8", v1: "TEA", c1: "8.00", f1: 0, p3: "8", p4: "8", v2: "TEA", c2: "8.00", f2: 0, dic: "-", feb: "-", final: "8.00" }
  ]);

  const estudiantesOrdenados = useMemo(() => {
    return [...estudiantes].sort((a, b) => {
      if (ordenCampo === "numero") {
        return ordenDir === "asc" ? a.num - b.num : b.num - a.num;
      }
      const nombreA = `${a.apellido}, ${a.nombre}`.toLowerCase();
      const nombreB = `${b.apellido}, ${b.nombre}`.toLowerCase();
      if (nombreA < nombreB) return ordenDir === "asc" ? -1 : 1;
      if (nombreA > nombreB) return ordenDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [estudiantes, ordenCampo, ordenDir]);

  const handleAlternarOrden = () => {
    if (ordenCampo === "numero") {
      setOrdenCampo("nombre");
      setOrdenDir("asc");
    } else if (ordenDir === "asc") {
      setOrdenDir("desc");
    } else {
      setOrdenCampo("numero");
      setOrdenDir("asc");
    }
  };

  if (!abierto) return null;

  const modalContent = h(
    "div",
    { className: "matriz-modal-backdrop", onClick: (e) => { if (e.target === e.currentTarget && onCerrar) onCerrar(); } },
    h(
      "div",
      { className: "matriz-modal-container doc-modal-paper-wrap doc-modal-paper-wrap--wide", role: "dialog", "aria-modal": "true" },

      // Barra superior de herramientas fija
      h(
        "div",
        { className: "matriz-toolbar no-print" },
        h(
          "div",
          { className: "matriz-toolbar__left" },
          h("h2", { className: "matriz-toolbar__title" }, "Planilla de Calificaciones 2026"),
          h("span", { className: "matriz-toolbar__badge" }, `Curso: ${cursoSeleccionado} · ${materiaSeleccionada}`)
        ),
        h(
          "div",
          { className: "matriz-toolbar__controls" },
          h(
            "button",
            {
              type: "button",
              className: "matriz-btn matriz-btn--secondary",
              onClick: handleAlternarOrden,
              title: "Alternar orden de alumnos"
            },
            h(
              "svg",
              { className: "matriz-btn-icon", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", width: "16", height: "16" },
              h("path", { d: "M3 6h18M6 12h12M10 18h4" })
            ),
            h("span", null, `Ordenar: ${ordenCampo === "numero" ? "Por Nº" : ordenDir === "asc" ? "A-Z" : "Z-A"}`)
          ),
          h(
            "button",
            { type: "button", className: "matriz-btn matriz-btn--primary", onClick: () => window.print() },
            h(
              "svg",
              { className: "matriz-btn-icon", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", width: "16", height: "16" },
              h("polyline", { points: "6 9 6 2 18 2 18 9" }),
              h("path", { d: "M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" }),
              h("rect", { x: "6", y: "14", width: "12", height: "8" })
            ),
            h("span", null, "Imprimir / PDF")
          ),
          h(BotonCerrarBarra, { onCerrar })
        )
      ),

      // Contenedor scrollable
      h(
        "div",
        { className: "matriz-scroll-area" },

        // Hoja oficial de la planilla
        h(
          "div",
          { className: "doc-paper-sheet doc-paper-sheet--wide" },

          // Encabezado
          h(
            "div",
            { className: "doc-planilla-header" },
            h(
              "div",
              { className: "doc-planilla-top-row" },
              h("div", { className: "doc-provincia-tag" }, "DIRECCIÓN GENERAL DE CULTURA Y EDUCACIÓN · PROVINCIA DE BUENOS AIRES"),
              h(
                "div",
                { style: { display: "flex", alignItems: "center", gap: "8px" } },
                h("img", { src: "/assets/Logo Tec.png", alt: "Logo", style: { width: "24px", height: "24px", objectFit: "contain" } }),
                h("span", { className: "doc-escuela-title" }, "ESCUELA DE EDUCACIÓN SECUNDARIA TÉCNICA 1")
              )
            ),
            h("h1", { className: "doc-planilla-main-title" }, `PLANILLA DE CALIFICACIONES ${fecha.anio}`),

            // Grilla de Metadatos de la Materia
            h(
              "div",
              { className: "doc-planilla-meta-grid" },
              h("div", null, h("strong", null, "MATERIA: "), h("span", { className: "doc-field-underlined" }, materiaSeleccionada)),
              h("div", null, h("strong", null, "AÑO: "), h("span", { className: "doc-field-underlined" }, "4°")),
              h("div", null, h("strong", null, "SECCIÓN: "), h("span", { className: "doc-field-underlined" }, "1°")),
              h("div", null, h("strong", null, "TURNO: "), h("span", { className: "doc-field-underlined" }, "MAÑANA")),
              h("div", null, h("strong", null, "PROFESOR/A: "), h("span", { className: "doc-field-underlined" }, "PROF. DEMO")),
              h("div", null, h("strong", null, "PRECEPTOR/A: "), h("span", { className: "doc-field-underlined" }, "TERESITA"))
            ),

            // Resumen Estadístico Superior
            h(
              "div",
              { className: "doc-planilla-stats-box" },
              h("div", { className: "doc-stat-item" }, h("span", null, "TOTAL ESTUDIANTES:"), h("strong", null, estudiantes.length)),
              h("div", { className: "doc-stat-item text-success" }, h("span", null, "APROBADOS:"), h("strong", null, "9")),
              h("div", { className: "doc-stat-item text-danger" }, h("span", null, "DESAPROBADOS:"), h("strong", null, "1")),
              h("div", { className: "doc-stat-item" }, h("span", null, "CLASES DADAS:"), h("strong", null, "72 / 75"))
            )
          ),

          // Tabla de Calificaciones
          h(
            "table",
            { className: "doc-planilla-table" },
            h(
              "thead",
              null,
              h(
                "tr",
                null,
                h("th", { rowSpan: 2, className: "col-num", onClick: handleAlternarOrden, style: { cursor: "pointer" } }, "Nº"),
                h("th", { rowSpan: 2, className: "col-name", onClick: handleAlternarOrden, style: { cursor: "pointer" } }, "APELLIDO/S Y NOMBRE/S DEL/LA ESTUDIANTE ⬍"),
                h("th", { colSpan: 4 }, "1º CUATRIMESTRE"),
                h("th", { colSpan: 4 }, "2º CUATRIMESTRE"),
                h("th", { colSpan: 2 }, "INTENSIFICACIÓN"),
                h("th", { rowSpan: 2, className: "col-cal-final" }, "CALIF. FINAL")
              ),
              h(
                "tr",
                null,
                h("th", { className: "col-sub" }, "PARC."),
                h("th", { className: "col-sub" }, "VAL. PREL."),
                h("th", { className: "col-sub" }, "CALIF. 1C"),
                h("th", { className: "col-sub" }, "INAS."),
                h("th", { className: "col-sub" }, "PARC."),
                h("th", { className: "col-sub" }, "VAL. PREL."),
                h("th", { className: "col-sub" }, "CALIF. 2C"),
                h("th", { className: "col-sub" }, "INAS."),
                h("th", { className: "col-sub" }, "DIC."),
                h("th", { className: "col-sub" }, "FEB.")
              )
            ),
            h(
              "tbody",
              null,
              estudiantesOrdenados.map((e) =>
                h(
                  "tr",
                  { key: e.num },
                  h("td", { className: "text-center font-bold" }, e.num),
                  h("td", { className: "text-left font-bold" }, `${e.apellido}, ${e.nombre}`),
                  h("td", { className: "text-center" }, `${e.p1} - ${e.p2}`),
                  h("td", { className: "text-center font-bold" }, e.v1),
                  h("td", { className: "text-center" }, e.c1),
                  h("td", { className: "text-center text-muted" }, e.f1),
                  h("td", { className: "text-center" }, `${e.p3} - ${e.p4}`),
                  h("td", { className: "text-center font-bold" }, e.v2),
                  h("td", { className: "text-center" }, e.c2),
                  h("td", { className: "text-center text-muted" }, e.f2),
                  h("td", { className: "text-center" }, e.dic),
                  h("td", { className: "text-center" }, e.feb),
                  h("td", { className: "text-center font-bold text-navy" }, e.final)
                )
              )
            )
          ),

          // Pie de firmas
          h(
            "div",
            { className: "doc-planilla-footer-signatures" },
            h("div", { className: "doc-signature-line-box" },
              h("div", { className: "doc-sig-line" }),
              h("span", null, "FIRMA DEL/LA PROFESOR/A")
            ),
            h("div", { className: "doc-signature-line-box" },
              h("div", { className: "doc-sig-line" }),
              h("span", null, "FIRMA DEL/LA PRECEPTOR/A")
            ),
            h("div", { className: "doc-signature-line-box" },
              h("div", { className: "doc-sig-line" }),
              h("span", null, "SELLO Y FIRMA DIRECTIVA")
            )
          )
        )
      )
    )
  );

  if (typeof document !== "undefined" && document.body) {
    return createPortal(modalContent, document.body);
  }
  return modalContent;
}

export default PlanillaCalificacionesModal;
