import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { h } from "../../layouts/site-layout.js";
import {
  getFechaActual,
  useDocumentStudent,
  DarkCustomDropdown,
  BotonCerrarBarra
} from "./document-helpers.js";

// ============================================================================
// 2. MODAL: RITE - REGISTRO INSTITUCIONAL DE TRAYECTORIAS EDUCATIVAS
// ============================================================================
export function RiteModal({ abierto, onCerrar, alumnoInicial = null }) {
  const {
    alumnoId,
    setAlumnoId,
    busqueda,
    setBusqueda,
    opcionesAlumnos,
    alumno
  } = useDocumentStudent(alumnoInicial);
  const fecha = useMemo(() => getFechaActual(), []);

  const materiasRite = useMemo(() => [
    { nombre: "BIOLOGÍA", tipo: "C", nota1C: "TEA", nota2C: "TEA", dic: "-", feb: "-", final: "8 (OCHO)" },
    { nombre: "CONSTRUCCIÓN DE CIUDADANÍA", tipo: "C", nota1C: "TEA", nota2C: "TEA", dic: "-", feb: "-", final: "9 (NUEVE)" },
    { nombre: "EDUCACIÓN ARTÍSTICA", tipo: "C", nota1C: "TEA", nota2C: "TEA", dic: "-", feb: "-", final: "8 (OCHO)" },
    { nombre: "EDUCACIÓN FÍSICA", tipo: "C", nota1C: "TEA", nota2C: "TEA", dic: "-", feb: "-", final: "10 (DIEZ)" },
    { nombre: "FÍSICO QUÍMICA", tipo: "C", nota1C: "TEP", nota2C: "TEA", dic: "7", feb: "-", final: "7 (SIETE)" },
    { nombre: "GEOGRAFÍA", tipo: "C", nota1C: "TEA", nota2C: "TEA", dic: "-", feb: "-", final: "8 (OCHO)" },
    { nombre: "HISTORIA", tipo: "C", nota1C: "TEA", nota2C: "TEA", dic: "-", feb: "-", final: "8 (OCHO)" },
    { nombre: "INGLÉS", tipo: "C", nota1C: "TEA", nota2C: "TEA", dic: "-", feb: "-", final: "9 (NUEVE)" },
    { nombre: "MATEMÁTICA", tipo: "C", nota1C: "TEP", nota2C: "TEA", dic: "8", feb: "-", final: "8 (OCHO)" },
    { nombre: "PRÁCTICAS DEL LENGUAJE", tipo: "C", nota1C: "TEA", nota2C: "TEA", dic: "-", feb: "-", final: "8 (OCHO)" },
    { nombre: "PROCEDIMIENTOS TÉCNICOS", tipo: "C", nota1C: "TEA", nota2C: "TEA", dic: "-", feb: "-", final: "9 (NUEVE)" },
    { nombre: "LENGUAJES TECNOLÓGICOS", tipo: "C", nota1C: "TEA", nota2C: "TEA", dic: "-", feb: "-", final: "10 (DIEZ)" },
    { nombre: "SISTEMAS TECNOLÓGICOS", tipo: "C", nota1C: "TEA", nota2C: "TEA", dic: "-", feb: "-", final: "9 (NUEVE)" }
  ], []);

  if (!abierto) return null;

  const modalContent = h(
    "div",
    { className: "matriz-modal-backdrop", onClick: (e) => { if (e.target === e.currentTarget && onCerrar) onCerrar(); } },
    h(
      "div",
      { className: "matriz-modal-container doc-modal-paper-wrap doc-modal-paper-wrap--wide", role: "dialog", "aria-modal": "true" },

      // Barra de herramientas superior fija
      h(
        "div",
        { className: "matriz-toolbar no-print" },
        h(
          "div",
          { className: "matriz-toolbar__left" },
          h("h2", { className: "matriz-toolbar__title" }, "RITE - Registro Institucional de Trayectorias Educativas"),
          h("span", { className: "matriz-toolbar__badge" }, "Secundaria Técnica · Res. Prov.")
        ),
        h(
          "div",
          { className: "matriz-toolbar__controls" },
          h(DarkCustomDropdown, {
            label: "Estudiante",
            value: alumnoId,
            opciones: opcionesAlumnos,
            onSelect: (val) => setAlumnoId(Number(val)),
            placeholder: "-- Seleccionar Alumno --",
            isSearchable: true,
            searchValue: busqueda,
            onSearchChange: setBusqueda
          }),
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
            h("span", null, "Imprimir / PDF (2 x Hoja A4)")
          ),
          h(BotonCerrarBarra, { onCerrar })
        )
      ),

      // Contenedor scrollable
      h(
        "div",
        { className: "matriz-scroll-area" },

        // Hoja de papel oficial RITE
        h(
          "div",
          { className: "doc-paper-sheet doc-paper-sheet--wide" },

          // Encabezado institucional RITE con Logo Tec.png
          h(
            "div",
            { className: "doc-rite-header" },
            h(
              "div",
              { className: "doc-rite-logo-col" },
              h("img", {
                src: "/assets/tecnica-n1-monte-grande.png",
                alt: "Logo EEST Nº1",
                className: "doc-rite-logo-img",
                style: { width: "64px", height: "64px", objectFit: "contain", flexShrink: 0 },
                onError: (e) => { e.currentTarget.src = "/assets/Logo Tec.png"; }
              })
            ),
            h(
              "div",
              { className: "doc-rite-header-text" },
              h("h1", { className: "doc-rite-title" }, "REGISTRO INSTITUCIONAL DE TRAYECTORIAS EDUCATIVAS"),
              h("div", { className: "doc-rite-meta-grid" },
                h("div", null, h("strong", null, "NIVEL DE EDUCACIÓN: "), "SECUNDARIA TÉCNICA"),
                h("div", null, h("strong", null, "ESCUELA: "), "E.E.S.T Nº 1 de ESTEBAN ECHEVERRÍA"),
                h("div", null, h("strong", null, "CICLO LECTIVO: "), `${fecha.anio}`)
              )
            )
          ),

          // Barra de datos del estudiante
          h(
            "div",
            { className: "doc-rite-student-bar" },
            h("div", null, h("strong", null, "ESTUDIANTE: "), h("span", { className: "doc-field-highlight" }, `${alumno.apellido}, ${alumno.nombre}`)),
            h("div", null, h("strong", null, "CURSO: "), h("span", { className: "doc-field-highlight" }, `${alumno.curso} ${alumno.division}`)),
            h("div", null, h("strong", null, "TURNO: "), h("span", { className: "doc-field-highlight" }, alumno.turno.toUpperCase())),
            h("div", null, h("strong", null, "DNI: "), alumno.dni)
          ),

          // Tabla RITE de Materias y Calificaciones
          h(
            "table",
            { className: "doc-rite-table" },
            h(
              "thead",
              null,
              h(
                "tr",
                null,
                h("th", { rowSpan: 2, className: "col-tipo" }, "TIPO C-R"),
                h("th", { rowSpan: 2, className: "col-materia" }, "MATERIAS"),
                h("th", { rowSpan: 2, className: "col-anio" }, "AÑO"),
                h("th", { colSpan: 2 }, "CALIFICACIONES"),
                h("th", { colSpan: 2 }, "INTENSIFICACIÓN"),
                h("th", { rowSpan: 2, className: "col-final" }, "CALIFICACIÓN FINAL"),
                h("th", { rowSpan: 2, className: "col-obs" }, "OBSERVACIONES")
              ),
              h(
                "tr",
                null,
                h("th", { className: "col-sub" }, "1ER CUAT."),
                h("th", { className: "col-sub" }, "2DO CUAT."),
                h("th", { className: "col-sub" }, "DICIEMBRE"),
                h("th", { className: "col-sub" }, "FEBRERO")
              )
            ),
            h(
              "tbody",
              null,
              materiasRite.map((m, idx) =>
                h(
                  "tr",
                  { key: idx },
                  h("td", { className: "text-center font-bold" }, m.tipo),
                  h("td", { className: "text-left font-bold" }, m.nombre),
                  h("td", { className: "text-center" }, alumno.curso),
                  h("td", { className: "text-center" }, m.nota1C),
                  h("td", { className: "text-center" }, m.nota2C),
                  h("td", { className: "text-center" }, m.dic),
                  h("td", { className: "text-center" }, m.feb),
                  h("td", { className: "text-center font-bold text-navy" }, m.final),
                  h("td", { className: "text-center text-muted" }, "-")
                )
              )
            )
          ),

          // Sección inferior de Firmas y Asistencias
          h(
            "div",
            { className: "doc-rite-bottom-grid" },
            h(
              "div",
              { className: "doc-rite-asistencias-box" },
              h("h3", { className: "doc-rite-box-title" }, "INASISTENCIAS"),
              h("div", { className: "doc-rite-asist-row" },
                h("span", null, "1º Cuatrimestre:"),
                h("strong", null, "2")
              ),
              h("div", { className: "doc-rite-asist-row" },
                h("span", null, "2º Cuatrimestre:"),
                h("strong", null, "1")
              ),
              h("div", { className: "doc-rite-asist-row doc-rite-asist-row--total" },
                h("span", null, "TOTAL ANUAL:"),
                h("strong", null, "3")
              )
            ),
            h(
              "div",
              { className: "doc-rite-firmas-box" },
              h("h3", { className: "doc-rite-box-title" }, "FIRMAS DE CONFORMIDAD"),
              h("div", { className: "doc-rite-firmas-grid" },
                h("div", { className: "doc-rite-firma-item" },
                  h("div", { className: "doc-rite-firma-line" }),
                  h("span", null, "AUTORIDAD")
                ),
                h("div", { className: "doc-rite-firma-item" },
                  h("div", { className: "doc-rite-firma-line" }),
                  h("span", null, "ADULTO RESPONSABLE")
                ),
                h("div", { className: "doc-rite-firma-item" },
                  h("div", { className: "doc-rite-firma-line" }),
                  h("span", null, "ALUMNO/A")
                )
              )
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

export default RiteModal;
