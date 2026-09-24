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
// 5. MODAL: CONSTANCIA DE CERTIFICADO DE ESTUDIO EN TRÁMITE / PASE
// ============================================================================
export function TramitePaseModal({ abierto, onCerrar, alumnoInicial = null }) {
  const {
    alumnoId,
    setAlumnoId,
    busqueda,
    setBusqueda,
    opcionesAlumnos,
    alumno
  } = useDocumentStudent(alumnoInicial);
  const [materiasAdeudadas, setMateriasAdeudadas] = useState("NINGUNA");
  const [destino, setDestino] = useState("las autoridades que lo requieran (Pase de Institución)");
  const fecha = useMemo(() => getFechaActual(), []);

  if (!abierto) return null;

  const modalContent = h(
    "div",
    { className: "matriz-modal-backdrop", onClick: (e) => { if (e.target === e.currentTarget && onCerrar) onCerrar(); } },
    h(
      "div",
      { className: "matriz-modal-container doc-modal-paper-wrap", role: "dialog", "aria-modal": "true" },

      // Barra superior fija
      h(
        "div",
        { className: "matriz-toolbar no-print" },
        h(
          "div",
          { className: "matriz-toolbar__left" },
          h("h2", { className: "matriz-toolbar__title" }, "Constancia de Certificado de Estudio en Trámite / Solicitud de Pase"),
          h("span", { className: "matriz-toolbar__badge" }, "Validez: 30 días")
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

        // Hoja de papel oficial Certificado en Trámite / Solicitud de Pase
        h(
          "div",
          { className: "doc-paper-sheet" },

          // Membrete oficial de la Provincia con Logo Tec.png
          h(
            "div",
            { className: "doc-tramite-header" },
            h("img", {
              src: "/assets/tecnica-n1-monte-grande.png",
              alt: "Escudo E.E.S.T N°1",
              style: { width: "64px", height: "64px", objectFit: "contain", marginBottom: "10px" },
              onError: (e) => { e.currentTarget.src = "/assets/Logo Tec.png"; }
            }),
            h("span", { className: "doc-tramite-provincia" }, "PROVINCIA DE BUENOS AIRES"),
            h("span", { className: "doc-tramite-sub" }, "DIRECCIÓN GENERAL DE CULTURA Y EDUCACIÓN"),
            h("span", { className: "doc-tramite-sub" }, "Dirección de Educación Media, Técnica y Agraria"),
            h("h1", { className: "doc-tramite-title" }, "Constancia de Certificado de Estudio en Trámite (Solicitud de Pase)")
          ),

          // Cuerpo institucional
          h(
            "div",
            { className: "doc-tramite-body" },
            h(
              "p",
              null,
              "La Dirección de la ESCUELA DE EDUCACIÓN SECUNDARIA TÉCNICA Nº 1 de Esteban Echeverría, hace constar por la presente que el alumno/a ",
              h("span", { className: "doc-field-underlined doc-field--bold" }, `${alumno.apellido}, ${alumno.nombre}`),
              " D.N.I. Nº ",
              h("span", { className: "doc-field-underlined doc-field--bold" }, alumno.dni),
              " tiene en trámite un ",
              h("strong", null, "CERTIFICADO ANALÍTICO DE ESTUDIOS"),
              " Incompleto / Completo, hasta ",
              h("span", { className: "doc-field-underlined" }, `${alumno.curso} Año`),
              " del Ciclo ",
              h("span", { className: "doc-field-underlined" }, alumno.orientacion === "Ciclo Básico" ? "Básico" : "Superior"),
              ", Especialidad ",
              h("span", { className: "doc-field-underlined" }, alumno.orientacion),
              ", R.M. Nº ",
              h("span", { className: "doc-field-underlined" }, "302/12"),
              ", adeudando las siguientes asignaturas: ",
              h("span", { className: "doc-field-underlined doc-field--bold" }, materiasAdeudadas),
              ", siendo el/los idiomas extranjeros cursados ",
              h("span", { className: "doc-field-underlined" }, "INGLÉS"),
              "."
            ),
            h(
              "p",
              null,
              "A pedido del interesado/a y al solo efecto de ser presentado ante las autoridades de ",
              h("span", { className: "doc-field-underlined" }, destino),
              ", se extiende la presente en ",
              h("span", { className: "doc-field-underlined" }, "Monte Grande"),
              " a los ",
              h("span", { className: "doc-field-underlined" }, `${fecha.dia}`),
              " días del mes de ",
              h("span", { className: "doc-field-underlined" }, `${fecha.mes}`),
              " de ",
              h("span", { className: "doc-field-underlined" }, `${fecha.anio}`),
              ", la que tendrá valor únicamente por un plazo de ",
              h("strong", null, "TREINTA DÍAS"),
              ", a contar de la fecha, debiendo el solicitante vencido el mismo, pasar a retirar el certificado de estudios."
            )
          ),

          // Pie con firmas y sellos
          h(
            "div",
            { className: "doc-tramite-footer" },
            h(
              "div",
              { className: "doc-tramite-box" },
              h("div", { className: "doc-tramite-line" }),
              h("span", null, "Firma del Secretario/a")
            ),
            h(
              "div",
              { className: "doc-tramite-box" },
              h(SelloInstitucionalCircular)
            ),
            h(
              "div",
              { className: "doc-tramite-box" },
              h("div", { className: "doc-tramite-line" }),
              h("span", null, "Firma del Director/a")
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

export default TramitePaseModal;
