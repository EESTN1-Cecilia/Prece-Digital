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

/**
 * SolicitudPaseModal: Digitalización oficial del formulario "SOLICITUD DE PASES"
 * (Gráfica Escolar 3345-2217)
 */
export function SolicitudPaseModal({ abierto, onCerrar, alumnoInicial = null }) {
  const {
    alumnoId,
    setAlumnoId,
    busqueda,
    setBusqueda,
    opcionesAlumnos,
    alumno
  } = useDocumentStudent(alumnoInicial);
  const [establecimientoDestino, setEstablecimientoDestino] = useState("");
  const [distritoDestino, setDistritoDestino] = useState("Esteban Echeverría");
  const [tipoAccion, setTipoAccion] = useState("solicita o concede"); // "solicita o concede", "solicita", "concede"
  const fecha = useMemo(() => getFechaActual(), []);

  if (!abierto) return null;

  const displayCursoDiv = `${alumno.curso || "1°"} Año — División ${alumno.division || "1"}${alumno.orientacion ? ` (${alumno.orientacion})` : ""}`;

  const modalContent = h(
    "div",
    {
      className: "matriz-modal-backdrop",
      onClick: (e) => {
        if (e.target === e.currentTarget && onCerrar) onCerrar();
      }
    },
    h(
      "div",
      {
        className: "matriz-modal-container doc-modal-paper-wrap doc-modal-paper-wrap--regular",
        role: "dialog",
        "aria-modal": "true"
      },

      // Barra superior de herramientas fija
      h(
        "div",
        { className: "matriz-toolbar no-print" },
        h(
          "div",
          { className: "matriz-toolbar__left" },
          h("h2", { className: "matriz-toolbar__title" }, "Solicitud de Pases"),
          h("span", { className: "matriz-toolbar__badge" }, "Formulario Oficial")
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
            {
              type: "button",
              className: "matriz-btn matriz-btn--primary",
              onClick: () => window.print()
            },
            h(
              "svg",
              {
                className: "matriz-btn-icon",
                viewBox: "0 0 24 24",
                fill: "none",
                stroke: "currentColor",
                strokeWidth: "2",
                width: "16",
                height: "16"
              },
              h("polyline", { points: "6 9 6 2 18 2 18 9" }),
              h("path", {
                d: "M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"
              }),
              h("rect", { x: "6", y: "14", width: "12", height: "8" })
            ),
            h("span", null, "Imprimir / PDF")
          ),
          h(BotonCerrarBarra, { onCerrar })
        )
      ),

      // Área con scroll
      h(
        "div",
        { className: "matriz-scroll-area" },

        // Hoja física oficial digitalizada (Estilo Gráfica Escolar)
        h(
          "div",
          { className: "doc-paper-sheet doc-paper-sheet--compact doc-pase-card" },

          // Header Gráfica Escolar y Título Azul
          h(
            "div",
            { className: "doc-pase-top-row" },
            h("div", { className: "doc-pase-publisher" }, "Gráfica Escolar\n3345-2217"),
            h("div", { className: "doc-pase-blue-banner" }, "SOLICITUD DE PASES")
          ),

          // Fila: Establecimiento y Distrito
          h(
            "div",
            { className: "doc-pase-est-row" },
            h(
              "div",
              { className: "doc-pase-field-group" },
              h("span", { className: "doc-pase-label" }, "Establecimiento:"),
              h(
                "span",
                { className: "doc-pase-dotted-field doc-pase-dotted-field--grow" },
                "E.E.S.T N° 1 - Gral. Manuel Belgrano"
              )
            ),
            h(
              "div",
              { className: "doc-pase-field-group" },
              h("span", { className: "doc-pase-label" }, "Distrito:"),
              h(
                "span",
                { className: "doc-pase-dotted-field doc-pase-dotted-field--medium" },
                distritoDestino || "Esteban Echeverría"
              )
            )
          ),

          // Cuerpo de la solicitud
          h(
            "div",
            { className: "doc-pase-body-text" },
            h(
              "p",
              { className: "doc-pase-paragraph" },
              "La Dirección del Establecimiento ",
              h("span", { className: "doc-pase-emphasis" }, tipoAccion),
              " el pase del alumno ",
              h(
                "span",
                { className: "doc-pase-dotted-field doc-pase-dotted-field--full doc-field--bold" },
                `${alumno.apellido || ""}, ${alumno.nombre || ""}`
              )
            ),
            h(
              "p",
              { className: "doc-pase-paragraph" },
              "que actualmente cursa ",
              h(
                "span",
                { className: "doc-pase-dotted-field doc-pase-dotted-field--full doc-field--bold" },
                displayCursoDiv
              )
            ),
            h(
              "p",
              { className: "doc-pase-paragraph" },
              "Lugar y Fecha ",
              h(
                "span",
                { className: "doc-pase-dotted-field doc-pase-dotted-field--full" },
                `Monte Grande, ${fecha.dia} de ${fecha.mes} de ${fecha.anio}`
              )
            )
          ),

          // Pie con Sello y Firma del Director/a o Vice
          h(
            "div",
            { className: "doc-pase-footer" },
            h(
              "div",
              { className: "doc-pase-sello-wrap" },
              h(SelloInstitucionalCircular),
              h("span", { className: "doc-pase-sello-caption" }, "SELLO")
            ),
            h(
              "div",
              { className: "doc-pase-firma-wrap" },
              h("div", { className: "doc-pase-dotted-line" }),
              h("span", { className: "doc-pase-firma-caption" }, "Firma del Director/a o Vice")
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

export default SolicitudPaseModal;
