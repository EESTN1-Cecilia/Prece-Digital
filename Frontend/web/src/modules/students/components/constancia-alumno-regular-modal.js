import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { h } from "../../../layouts/site-layout.js";
import {
  getFechaActual,
  useDocumentStudent,
  DarkCustomDropdown,
  SelloInstitucionalCircular,
  BotonCerrarBarra
} from "../../documents/document-helpers.js";

// ============================================================================
// 4. MODAL: CONSTANCIA DE ALUMNO REGULAR
// ============================================================================
export function AlumnoRegularModal({ abierto, onCerrar, alumnoInicial = null }) {
  const {
    alumnoId,
    setAlumnoId,
    busqueda,
    setBusqueda,
    opcionesAlumnos,
    alumno
  } = useDocumentStudent(alumnoInicial);
  const [destino, setDestino] = useState("quien corresponda");
  const fecha = useMemo(() => getFechaActual(), []);

  if (!abierto) return null;

  const modalContent = h(
    "div",
    { className: "matriz-modal-backdrop", onClick: (e) => { if (e.target === e.currentTarget && onCerrar) onCerrar(); } },
    h(
      "div",
      { className: "matriz-modal-container doc-modal-paper-wrap doc-modal-paper-wrap--regular", role: "dialog", "aria-modal": "true" },

      // Barra superior fija
      h(
        "div",
        { className: "matriz-toolbar no-print" },
        h(
          "div",
          { className: "matriz-toolbar__left" },
          h("h2", { className: "matriz-toolbar__title" }, "Constancia de Alumno Regular"),
          h("span", { className: "matriz-toolbar__badge" }, `E.E.S.T. Nº 1`)
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

      // Contenedor scrollable
      h(
        "div",
        { className: "matriz-scroll-area" },

        // Hoja formato papel oficial Alumno Regular
        h(
          "div",
          { className: "doc-paper-sheet doc-paper-sheet--compact" },

          // Cabecera con badge azul y datos escolares con Logo Tec.png
          h(
            "div",
            { className: "doc-regular-header" },
            h(
              "div",
              { className: "doc-regular-brand" },
              h(
                "div",
                { style: { display: "flex", alignItems: "center", gap: "14px" } },
                h("img", {
                  src: "/assets/tecnica-n1-monte-grande.png",
                  alt: "Escudo E.E.S.T N°1",
                  style: { width: "64px", height: "64px", objectFit: "contain", flexShrink: 0 },
                  onError: (e) => { e.currentTarget.src = "/assets/Logo Tec.png"; }
                }),
                h(
                  "div",
                  { style: { display: "flex", flexDirection: "column", justifyContent: "center" } },
                  h("span", { className: "doc-regular-escuela", style: { whiteSpace: "nowrap" } }, "Gráfica Escolar · E.E.S.T. Nº 1"),
                  h("span", { className: "doc-regular-tel", style: { display: "block", marginTop: "2px" } }, "Tel: 3345-2217")
                )
              )
            ),
            h("div", { className: "doc-regular-badge", style: { whiteSpace: "nowrap" } }, "CONST. DE ALUMNO REGULAR")
          ),

          // Establecimiento
          h(
            "div",
            { className: "doc-regular-est-row" },
            h("strong", null, "ESTABLECIMIENTO: "),
            h("span", { className: "doc-field-underlined doc-field--bold" }, "E.E.S.T. Nº 1 - Esteban Echeverría")
          ),

          // Cuerpo
          h(
            "div",
            { className: "doc-regular-body" },
            h(
              "p",
              null,
              "Se hace constar que ",
              h("span", { className: "doc-field-underlined doc-field--bold" }, `${alumno.apellido}, ${alumno.nombre}`),
              " DNI ",
              h("span", { className: "doc-field-underlined doc-field--bold" }, alumno.dni),
              " es alumno/a regular del Establecimiento y está matriculado/a en el presente curso escolar en ",
              h("span", { className: "doc-field-underlined" }, `${alumno.curso} Año ${alumno.division}ª División`),
              " y concurre a clase en el turno ",
              h("span", { className: "doc-field-underlined" }, alumno.turno),
              "."
            ),
            h(
              "p",
              null,
              "A pedido del interesado y al sólo efecto de ser presentado ante las autoridades de ",
              h("span", { className: "doc-field-underlined" }, destino),
              ", se le extiende la presente constancia en ",
              h("span", { className: "doc-field-underlined" }, "Monte Grande"),
              " a los ",
              h("span", { className: "doc-field-underlined" }, `${fecha.dia}`),
              " del mes de ",
              h("span", { className: "doc-field-underlined" }, `${fecha.mes}`),
              " de ",
              h("span", { className: "doc-field-underlined" }, `${fecha.anio}`),
              "."
            )
          ),

          // Pie de Sello y Firma
          h(
            "div",
            { className: "doc-regular-footer" },
            h(
              "div",
              { className: "doc-regular-sello-wrap" },
              h(SelloInstitucionalCircular)
            ),
            h(
              "div",
              { className: "doc-regular-firma-wrap" },
              h("div", { className: "doc-regular-firma-line" }),
              h("span", null, "FIRMA AUTORIZADA")
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

export default AlumnoRegularModal;
