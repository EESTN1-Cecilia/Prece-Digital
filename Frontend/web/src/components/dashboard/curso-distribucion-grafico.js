import React, { useState } from "react";
import { h } from "../../layouts/site-layout.js";

/**
 * Paleta de colores distintivos por año académico para el gráfico de barras.
 */
const CONFIG_ANIOS = [
  { anio: 1, label: "1°", color: "#2563eb", hoverColor: "#1d4ed8", bgLight: "rgba(37, 99, 235, 0.12)" },
  { anio: 2, label: "2°", color: "#059669", hoverColor: "#047857", bgLight: "rgba(5, 150, 105, 0.12)" },
  { anio: 3, label: "3°", color: "#10b981", hoverColor: "#059669", bgLight: "rgba(16, 185, 129, 0.12)" },
  { anio: 4, label: "4°", color: "#f59e0b", hoverColor: "#d97706", bgLight: "rgba(245, 158, 11, 0.12)" },
  { anio: 5, label: "5°", color: "#8b5cf6", hoverColor: "#7c3aed", bgLight: "rgba(139, 92, 246, 0.12)" },
  { anio: 6, label: "6°", color: "#a855f7", hoverColor: "#9333ea", bgLight: "rgba(168, 85, 247, 0.12)" },
  { anio: 7, label: "7°", color: "#06b6d4", hoverColor: "#0891b2", bgLight: "rgba(6, 182, 212, 0.12)" }
];

function IconAcademic({ className }) {
  return h(
    "svg",
    {
      className: className || "footer-info-icon",
      width: "17",
      height: "17",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "2",
      strokeLinecap: "round",
      strokeLinejoin: "round",
      "aria-hidden": "true"
    },
    h("path", { d: "M22 10v6M2 10l10-5 10 5-10 5z" }),
    h("path", { d: "M6 12v5c3 3 9 3 12 0v-5" })
  );
}

function IconBook({ className }) {
  return h(
    "svg",
    {
      className: className || "btn-acceso-cursos__icon",
      width: "15",
      height: "15",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "2.2",
      strokeLinecap: "round",
      strokeLinejoin: "round",
      "aria-hidden": "true"
    },
    h("path", { d: "M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" }),
    h("path", { d: "M6 6h10" }),
    h("path", { d: "M6 10h10" })
  );
}

/**
 * Componente interactivo de Gráfico de Barras para la Distribución de Cursos y Alumnos por Año.
 */
export function CursoDistribucionGrafico({
  cursos = [],
  turnoFiltro = "todos",
  totalDivisiones = 19
}) {
  const [hoveredAnio, setHoveredAnio] = useState(null);

  // Agrupación de alumnos y divisiones por cada año académico (1° a 7°)
  const aniosData = CONFIG_ANIOS.map((cfg) => {
    const divisionesAnio = (cursos || []).filter((c) => {
      const cursoStr = String(c.curso || "");
      return cursoStr.startsWith(String(cfg.anio)) || cursoStr === `${cfg.anio}°`;
    });

    const totalAlumnos = divisionesAnio.reduce((acc, c) => acc + (Number(c.cantidad) || 0), 0);
    const cantDivisiones = divisionesAnio.length;

    return {
      ...cfg,
      totalAlumnos,
      cantDivisiones,
      divisiones: divisionesAnio
    };
  });

  const maxStudentCount = Math.max(...aniosData.map((d) => d.totalAlumnos), 0);
  const maxScale = Math.max(30, Math.ceil((maxStudentCount * 1.2) / 5) * 5);

  const yTicks = [
    maxScale,
    Math.round(maxScale * 0.75),
    Math.round(maxScale * 0.5),
    Math.round(maxScale * 0.25),
    0
  ];

  const totalAlumnosFiltrados = aniosData.reduce((sum, item) => sum + item.totalAlumnos, 0);

  return h(
    "div",
    { className: "curso-distribucion-wrapper" },

    // Encabezado interno del gráfico
    h(
      "div",
      { className: "curso-distribucion-subhead" },
      h("h3", { className: "curso-distribucion-title" }, "Distribución por año"),
      h(
        "div",
        { className: "curso-distribucion-meta" },
        h("span", { className: "meta-item" }, `Total: ${totalAlumnosFiltrados} alumnos`),
        turnoFiltro !== "todos"
          ? h("span", { className: "meta-badge" }, `Turno ${turnoFiltro}`)
          : null
      )
    ),

    // Área del gráfico con Eje Y, Grilla y Barras
    h(
      "div",
      { className: "curso-distribucion-chart-area" },

      // Eje Y (Escala y Líneas de Grilla)
      h(
        "div",
        { className: "chart-grid-container" },
        yTicks.map((tick, idx) =>
          h(
            "div",
            { key: idx, className: "chart-grid-row" },
            h("span", { className: "chart-y-label" }, tick),
            h("div", { className: "chart-grid-line" })
          )
        )
      ),

      // Columnas de Barras por cada Año (1° a 7°)
      h(
        "div",
        { className: "chart-bars-container" },
        aniosData.map((item) => {
          const heightPercent = maxScale > 0 ? (item.totalAlumnos / maxScale) * 100 : 0;
          const isHovered = hoveredAnio === item.anio;

          return h(
            "div",
            {
              key: item.anio,
              className: `chart-bar-column ${isHovered ? "chart-bar-column--hovered" : ""}`,
              onMouseEnter: () => setHoveredAnio(item.anio),
              onMouseLeave: () => setHoveredAnio(null)
            },

            // Tooltip flotante al pasar el mouse
            isHovered
              ? h(
                  "div",
                  { className: "chart-bar-tooltip" },
                  h("strong", null, `${item.label} Año`),
                  h("span", null, `${item.totalAlumnos} alumnos · ${item.cantDivisiones} divisiones`),
                  h("small", null, "Click para ver cursos")
                )
              : null,

            // Valor numérico superior sobre la barra
            h(
              "div",
              {
                className: "chart-bar-value",
                style: { bottom: `calc(${heightPercent}% + 6px)` }
              },
              item.totalAlumnos
            ),

            // Contenedor del riel y la barra
            h(
              "a",
              {
                href: `#/cursos?anio=${item.anio}`,
                className: "chart-bar-track",
                title: `${item.label} Año: ${item.totalAlumnos} alumnos en ${item.cantDivisiones} divisiones. Click para ver.`
              },
              h("div", {
                className: "chart-bar-fill",
                style: {
                  height: `${Math.max(heightPercent, 2)}%`,
                  backgroundColor: item.color
                }
              })
            ),

            // Etiqueta del Eje X (1°, 2°, 3°...) debajo de la barra
            h(
              "a",
              {
                href: `#/cursos?anio=${item.anio}`,
                className: "chart-x-label",
                title: `Ver cursos de ${item.label} Año`
              },
              item.label
            )
          );
        })
      )
    ),

    // Subtítulo del eje horizontal: "Año" centrado debajo de las etiquetas 1° a 7°
    h("div", { className: "chart-x-bottom-title" }, "Año"),

    // Barra de Acceso a Cursos (Alineada a la derecha con "Ver Cursos" e icono blanco)
    h(
      "div",
      { className: "curso-distribucion-footer" },
      h(
        "div",
        { className: "curso-distribucion-footer__info" },
        h(IconAcademic, { className: "footer-info-icon" }),
        h(
          "span",
          null,
          `Directorio de `,
          h("strong", null, `${totalDivisiones} divisiones`),
          ` habilitadas`
        )
      ),
      h(
        "a",
        {
          href: "#/cursos",
          className: "btn-acceso-cursos",
          title: "Acceder al directorio de Cursos y Divisiones"
        },
        h(IconBook, { className: "btn-acceso-cursos__icon" }),
        h("span", null, "Ver Cursos"),
        h(
          "svg",
          {
            className: "btn-acceso-cursos__arrow",
            width: "15",
            height: "15",
            viewBox: "0 0 24 24",
            fill: "none",
            stroke: "currentColor",
            strokeWidth: "2.2",
            strokeLinecap: "round",
            strokeLinejoin: "round"
          },
          h("path", { d: "M5 12h14" }),
          h("path", { d: "m12 5 7 7-7 7" })
        )
      )
    )
  );
}
