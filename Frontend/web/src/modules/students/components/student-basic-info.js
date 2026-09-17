import { useState } from "react";
import { h, IconoFigma } from "../../../layouts/site-layout.js";

/**
 * StudentBasicInfo: Componente para visualizar los datos personales del alumno
 */
export function StudentBasicInfo({ alumno, defaultExpanded = true }) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  if (!alumno) return null;

  const {
    id,
    nombre,
    apellido,
    nombreCompleto,
    dni,
    legajo,
    email,
    telefono,
    genero,
    fechaNacimiento
  } = alumno;

  const displayNombreCompleto = nombreCompleto || `${apellido || ""}, ${nombre || ""}`.trim() || "Estudiante";

  return h(
    "div",
    { className: `student-summary-card student-basic-info-card ${isExpanded ? "card--expanded" : "card--collapsed"}` },
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
        h(IconoFigma, { className: "student-summary-card__icon", nombre: "people" }),
        h("h3", { className: "student-summary-card__title" }, "Datos Personales")
      ),
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
    ),
    isExpanded
      ? h(
          "div",
          { className: "student-basic-info__body" },
          // Avatar con el icono del header
          h(
            "div",
            { className: "student-avatar-large" },
            h(IconoFigma, {
              className: "student-avatar-header-icon",
              nombre: "avatar"
            })
          ),
          // Datos principales en grid
          h(
            "div",
            { className: "student-info-grid" },
            h(
              "div",
              { className: "student-info-item" },
              h("span", { className: "student-info-item__label" }, "Nombre Completo"),
              h("strong", { className: "student-info-item__value highlight-name" }, displayNombreCompleto)
            ),
            h(
              "div",
              { className: "student-info-item" },
              h("span", { className: "student-info-item__label" }, "DNI"),
              h("span", { className: "student-info-item__value" }, dni || "No especificado")
            ),
            h(
              "div",
              { className: "student-info-item" },
              h("span", { className: "student-info-item__label" }, "ID de Alumno / Legajo"),
              h("span", { className: "student-info-item__value font-mono" }, legajo || (id ? `ID: ${id}` : "No asignado"))
            ),
            email
              ? h(
                  "div",
                  { className: "student-info-item" },
                  h("span", { className: "student-info-item__label" }, "Correo Institucional"),
                  h("span", { className: "student-info-item__value text-truncate" }, email)
                )
              : null,
            telefono
              ? h(
                  "div",
                  { className: "student-info-item" },
                  h("span", { className: "student-info-item__label" }, "Teléfono de Contacto"),
                  h("span", { className: "student-info-item__value" }, telefono)
                )
              : null,
            fechaNacimiento
              ? h(
                  "div",
                  { className: "student-info-item" },
                  h("span", { className: "student-info-item__label" }, "Fecha de Nacimiento"),
                  h("span", { className: "student-info-item__value" }, fechaNacimiento)
                )
              : null,
            genero
              ? h(
                  "div",
                  { className: "student-info-item" },
                  h("span", { className: "student-info-item__label" }, "Género"),
                  h("span", { className: "student-info-item__value" }, genero)
                )
              : null
          )
        )
      : null
  );
}
