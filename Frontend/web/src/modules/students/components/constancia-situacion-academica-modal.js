import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { h } from "../../../layouts/site-layout.js";
import {
  ALUMNOS_DEMO,
  getFechaActual,
  DarkCustomDropdown,
  SelloInstitucionalCircular,
  BotonCerrarBarra
} from "../../documents/document-helpers.js";

// ============================================================================
// 1. MODAL: CONSTANCIA SITUACIÓN ACADÉMICA
// ============================================================================
export function SituacionAcademicaModal({ abierto, onCerrar, alumnoInicial = null }) {
  const [alumnoId, setAlumnoId] = useState(alumnoInicial?.id || ALUMNOS_DEMO[0].id);
  const [busqueda, setBusqueda] = useState("");
  const [materiasAdeudadas, setMateriasAdeudadas] = useState([
    "MATEMÁTICA",
    "FÍSICO QUÍMICA",
    "LABORATORIO DE PROGRAMACIÓN"
  ]);
  const [nuevaMateria, setNuevaMateria] = useState("");
  const fecha = useMemo(() => getFechaActual(), []);

  useEffect(() => {
    if (alumnoInicial?.id) setAlumnoId(alumnoInicial.id);
  }, [alumnoInicial]);

  const alumno = useMemo(() => {
    return ALUMNOS_DEMO.find((a) => a.id === Number(alumnoId)) || ALUMNOS_DEMO[0];
  }, [alumnoId]);

  const opcionesAlumnos = useMemo(() => {
    const q = busqueda.toLowerCase().trim();
    return ALUMNOS_DEMO.filter((a) => {
      if (!q) return true;
      const nom = `${a.apellido} ${a.nombre}`.toLowerCase();
      return nom.includes(q) || a.dni.includes(q);
    }).map((a) => ({
      value: a.id,
      label: `${a.apellido}, ${a.nombre} (${a.curso} ${a.division} - DNI: ${a.dni})`
    }));
  }, [busqueda]);

  const handleAgregarMateria = (e) => {
    e.preventDefault();
    if (!nuevaMateria.trim()) return;
    setMateriasAdeudadas([...materiasAdeudadas, nuevaMateria.trim().toUpperCase()]);
    setNuevaMateria("");
  };

  const handleEliminarMateria = (idx) => {
    setMateriasAdeudadas(materiasAdeudadas.filter((_, i) => i !== idx));
  };

  if (!abierto) return null;

  const modalContent = h(
    "div",
    { className: "matriz-modal-backdrop", onClick: (e) => { if (e.target === e.currentTarget && onCerrar) onCerrar(); } },
    h(
      "div",
      { className: "matriz-modal-container doc-modal-paper-wrap", role: "dialog", "aria-modal": "true" },

      // Barra superior fija con controles y botón cerrar
      h(
        "div",
        { className: "matriz-toolbar no-print" },
        h(
          "div",
          { className: "matriz-toolbar__left" },
          h("h2", { className: "matriz-toolbar__title" }, "Constancia de Situación Académica"),
          h("span", { className: "matriz-toolbar__badge" }, `E.E.S.T. Nº1 · Ciclo ${fecha.anio}`)
        ),
        h(
          "div",
          { className: "matriz-toolbar__controls" },
          h(DarkCustomDropdown, {
            label: "Alumno",
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
            h("span", null, "Imprimir / PDF")
          ),
          h(BotonCerrarBarra, { onCerrar })
        )
      ),

      // Panel para agregar materias adeudadas (oculto al imprimir)
      h(
        "div",
        { className: "doc-editor-bar no-print" },
        h("span", { className: "doc-editor-label" }, "Agregar materia adeudada:"),
        h(
          "form",
          { className: "doc-editor-form", onSubmit: handleAgregarMateria },
          h("input", {
            type: "text",
            className: "doc-editor-input",
            placeholder: "Ej: SISTEMAS DIGITALES",
            value: nuevaMateria,
            onChange: (e) => setNuevaMateria(e.target.value)
          }),
          h("button", { type: "submit", className: "doc-editor-btn-add" }, "+ Agregar")
        )
      ),

      // Contenedor scrollable
      h(
        "div",
        { className: "matriz-scroll-area" },

        // Hoja de papel formato oficial
        h(
          "div",
          { className: "doc-paper-sheet" },

          // Encabezado con el logo oficial Logo Tec.png
          h(
            "div",
            { className: "doc-paper-header-right" },
            h(
              "div",
              { className: "doc-paper-logo-badge" },
              h("img", { src: "/assets/Logo Tec.png", alt: "Escudo EEST Nº1", className: "doc-paper-logo-img" }),
              h("span", { className: "doc-paper-logo-text" }, "E.E.S. TÉCNICA Nº 1\nESTEBAN ECHEVERRÍA")
            )
          ),

          // Título del Documento
          h("h1", { className: "doc-paper-title" }, "CONSTANCIA SITUACION ACADEMICA"),

          // Párrafo principal institucional
          h(
            "div",
            { className: "doc-paper-body-text" },
            "La Dirección de la Escuela de Educación Secundaria Técnica Nº1 de Esteban Echeverría hace constar que ",
            h("span", { className: "doc-field-underlined doc-field--bold" }, `${alumno.apellido}, ${alumno.nombre}`),
            " D.N.I ",
            h("span", { className: "doc-field-underlined doc-field--bold" }, alumno.dni),
            " CURSÓ ",
            h("span", { className: "doc-field-underlined" }, `${alumno.curso} Año`),
            " en ",
            h("span", { className: "doc-field-underlined" }, "2025"),
            " en esta Institución"
          ),

          // Subtítulo de materias adeudadas
          h("h2", { className: "doc-paper-subtitle" }, "ADEUDANDO LAS SIGUIENTES MATERIAS:"),

          // Lista de renglones con materias
          h(
            "div",
            { className: "doc-paper-ruled-lines" },
            materiasAdeudadas.map((mat, idx) =>
              h(
                "div",
                { key: idx, className: "doc-ruled-line-item" },
                h("span", { className: "doc-line-number" }, `${idx + 1}.`),
                h("span", { className: "doc-line-content" }, mat),
                h(
                  "button",
                  {
                    type: "button",
                    className: "doc-line-remove-btn no-print",
                    onClick: () => handleEliminarMateria(idx),
                    title: "Quitar materia"
                  },
                  "✕"
                )
              )
            ),
            Array.from({ length: Math.max(1, 8 - materiasAdeudadas.length) }).map((_, i) =>
              h("div", { key: `empty-${i}`, className: "doc-ruled-line-empty" })
            )
          ),

          // Párrafo legal de cierre
          h(
            "div",
            { className: "doc-paper-footer-legal" },
            "A pedido del interesado/a y al solo efecto de ser presentada ante las autoridades correspondientes, se extiende la presente en MONTE GRANDE, provincia de BUENOS AIRES, a los ",
            h("span", { className: "doc-field-underlined" }, `${fecha.dia}`),
            " Días del mes de ",
            h("span", { className: "doc-field-underlined" }, `${fecha.mes}`),
            " DE ",
            h("span", { className: "doc-field-underlined" }, `${fecha.anio}`),
            "."
          ),

          // Bloque de Firmas y Sello
          h(
            "div",
            { className: "doc-paper-signatures-row" },
            h(SelloInstitucionalCircular),
            h(
              "div",
              { className: "doc-paper-signature-box" },
              h("div", { className: "doc-paper-signature-line" }),
              h("span", { className: "doc-paper-signature-label" }, "Firma Autorizada / Secretaría")
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

export default SituacionAcademicaModal;
