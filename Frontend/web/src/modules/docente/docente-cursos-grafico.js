import React, { useState } from "react";
import { h } from "../../layouts/site-layout.js";
import { calcularMetricasPlanilla } from "../attendance/asistencias-service.js";

/**
 * Calcula el porcentaje de asistencia de un curso a partir de los datos reales:
 * 1. Asistencia calculada por el dashboard (a partir de la planilla oficial de AsistenciasService)
 * 2. Planillas oficiales guardadas por el docente o preceptor en el almacenamiento local.
 * Si no existen registros computados, refleja la asistencia oficial de la planilla escolar.
 */
function calcularAsistenciaCurso(curso) {
  // Si el curso ya trae asistencia calculada con datos reales
  if (curso.asistencia) {
    return curso.asistencia;
  }

  const cantAlumnos = Number(curso.activos ?? curso.cantidad) || 0;
  if (cantAlumnos === 0) {
    return {
      porcentaje: 0,
      label: "0%",
      sinAlumnos: true,
      sinRegistros: true,
      subtexto: "Sin matrícula asignada"
    };
  }

  const anioNum = String(curso.anio || curso.curso || "1").replace(/\D/g, "");
  const divNum = String(curso.division || "1").replace(/\D/g, "");
  const cursoId = `${anioNum}-${divNum}`;
  const now = new Date();
  const mes = now.getMonth() + 1;
  const anio = now.getFullYear();
  const rawMateria = curso.materia ? String(curso.materia).trim().toLowerCase().replace(/\s+/g, "_") : "";
  const normMateria = curso.materia
    ? String(curso.materia).normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase().replace(/\s+/g, "_")
    : "";

  // Intentamos leer la planilla guardada en localStorage
  let planillaGuardada = null;
  if (typeof localStorage !== "undefined") {
    const keys = [
      rawMateria ? `prece_asistencias_planilla_docente_${rawMateria}_${cursoId}_${anio}_${mes}` : null,
      normMateria && normMateria !== rawMateria ? `prece_asistencias_planilla_docente_${normMateria}_${cursoId}_${anio}_${mes}` : null,
      `prece_asistencias_planilla_${cursoId}_${anio}_${mes}`
    ].filter(Boolean);

    for (const k of keys) {
      const raw = localStorage.getItem(k);
      if (raw) {
        try {
          planillaGuardada = JSON.parse(raw);
          break;
        } catch (e) {}
      }
    }
  }

  if (planillaGuardada) {
    return calcularMetricasPlanilla(planillaGuardada);
  }

  // Si tiene matrícula asignada pero no se han registrado inasistencias, la asistencia oficial es 100%
  if (cantAlumnos > 0) {
    return {
      porcentaje: 100,
      label: "100%",
      sinAlumnos: false,
      sinRegistros: false,
      subtexto: "100% asistencia computable"
    };
  }

  return {
    porcentaje: 0,
    label: "0%",
    sinAlumnos: true,
    sinRegistros: true,
    subtexto: "Sin matrícula asignada"
  };
}

/**
 * Contenedor 1: Gráfico compacto de cantidad de alumnos por curso a cargo.
 */
function GraficoAlumnosCompacto({ cursos }) {
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const cantidadCursos = cursos.length;
  const totalAlumnos = cursos.reduce((acc, c) => acc + (Number(c.activos ?? c.cantidad) || 0), 0);

  // Escala del eje Y calculada a partir de los datos reales
  const maxAlumnos = Math.max(...cursos.map((c) => Number(c.activos ?? c.cantidad) || 0), 0);
  const maxScale = maxAlumnos > 0 ? Math.max(2, Math.ceil(maxAlumnos * 1.25)) : 5;
  const yTicks = [maxScale, Math.round(maxScale / 2), 0];

  return h(
    "div",
    { className: "docente-chart-card", "aria-label": "Gráfico de cantidad de alumnos por curso" },

    // Encabezado compacto
    h(
      "div",
      { className: "docente-chart-header" },
      h(
        "div",
        { className: "docente-chart-header__left" },
        h("span", { className: "docente-chart-tag docente-chart-tag--blue" }, "MATRÍCULA"),
        h("h3", { className: "docente-chart-title" }, "Alumnos por Curso")
      ),
      h(
        "div",
        { className: "docente-chart-header__right" },
        h("span", { className: "docente-chart-stat-badge docente-chart-stat-badge--blue" },
          h("strong", null, totalAlumnos),
          ` ${totalAlumnos === 1 ? "alumno en total" : "alumnos en total"}`
        )
      )
    ),

    // Área del Gráfico
    h(
      "div",
      { className: "docente-chart-plot" },

      // Eje Y (guías horizontales)
      h(
        "div",
        { className: "docente-chart-y-axis" },
        yTicks.map((tick, idx) =>
          h(
            "div",
            { key: idx, className: "docente-chart-y-row" },
            h("span", { className: "docente-chart-y-lbl" }, tick),
            h("div", { className: "docente-chart-y-line" })
          )
        )
      ),

      // Columnas dinámicas según cantidad de cursos
      h(
        "div",
        {
          className: "docente-chart-cols-container",
          style: {
            gridTemplateColumns: `repeat(${cantidadCursos}, minmax(0, 1fr))`
          }
        },
        cursos.map((c, idx) => {
          const cant = Number(c.activos ?? c.cantidad) || 0;
          const alturaPct = maxScale > 0 ? (cant / maxScale) * 100 : 0;
          const cursoStr = c.curso ? (String(c.curso).includes("°") ? c.curso : `${c.curso}°`) : `${c.anio || 1}°`;
          const divisionStr = c.division ? `${c.division}°` : "";
          const etiquetaCurso = `${cursoStr} ${divisionStr}`.trim();
          const materiaNombre = c.materia || "";
          const turnoNombre = c.turnoAula || c.turno || "";
          const isHovered = hoveredIdx === idx;

          return h(
            "a",
            {
              key: c.id || idx,
              href: `#/docente/asistencias?curso=${encodeURIComponent(cursoStr)}&div=${encodeURIComponent(c.division)}`,
              className: `docente-chart-col-item ${isHovered ? "docente-chart-col-item--active" : ""}`,
              onMouseEnter: () => setHoveredIdx(idx),
              onMouseLeave: () => setHoveredIdx(null),
              title: `${etiquetaCurso}: ${cant} alumnos ${materiaNombre ? `(${materiaNombre})` : ""}`
            },

            // Tooltip flotante (sin brillo, plano y limpio)
            isHovered
              ? h(
                  "div",
                  { className: "docente-chart-tooltip" },
                  h("div", { className: "docente-chart-tooltip__title" }, etiquetaCurso),
                  materiaNombre ? h("div", { className: "docente-chart-tooltip__sub" }, materiaNombre) : null,
                  h("div", { className: "docente-chart-tooltip__val" }, `${cant} ${cant === 1 ? "alumno" : "alumnos"}`),
                  turnoNombre ? h("div", { className: "docente-chart-tooltip__meta" }, `Turno ${turnoNombre}`) : null,
                  h("div", { className: "docente-chart-tooltip__hint" }, "Clic para abrir asistencias ➔")
                )
              : null,

            // Valor numérico encima de la pista de barra
            h(
              "div",
              {
                className: `docente-chart-col-val ${cant === 0 ? "docente-chart-col-val--zero" : "docente-chart-col-val--blue"}`
              },
              h("strong", null, cant),
              h("span", null, cant === 1 ? " alum." : " alums.")
            ),

            // Pista de la barra con relleno proporcional
            h(
              "div",
              { className: "docente-chart-col-track" },
              h("div", {
                className: "docente-chart-col-fill docente-chart-col-fill--blue",
                style: {
                  height: `${alturaPct}%`,
                  minHeight: cant > 0 ? "6px" : "0px"
                }
              })
            ),

            // Etiquetas del pie de columna
            h(
              "div",
              { className: "docente-chart-col-labels" },
              h("span", { className: "docente-chart-col-main" }, etiquetaCurso),
              materiaNombre ? h("span", { className: "docente-chart-col-sub", title: materiaNombre }, materiaNombre) : null,
              turnoNombre ? h("span", { className: "docente-chart-col-shift" }, turnoNombre) : null
            )
          );
        })
      )
    )
  );
}

/**
 * Contenedor 2: Gráfico compacto de porcentaje de asistencia por curso a cargo.
 */
function GraficoAsistenciaCompacto({ cursos }) {
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const cantidadCursos = cursos.length;

  // Calculamos la asistencia real para cada curso
  const asistenciasData = cursos.map((c) => calcularAsistenciaCurso(c));

  // Promedio global ponderado de asistencia real computable
  const cursosConAsistencia = asistenciasData.filter((a) => !a.sinAlumnos && !a.sinRegistros);
  const promedioAsistencia = cursosConAsistencia.length > 0
    ? Math.round(cursosConAsistencia.reduce((acc, a) => acc + a.porcentaje, 0) / cursosConAsistencia.length)
    : null;

  const yTicks = [100, 50, 0];

  return h(
    "div",
    { className: "docente-chart-card", "aria-label": "Gráfico de porcentaje de asistencia por curso" },

    // Encabezado compacto
    h(
      "div",
      { className: "docente-chart-header" },
      h(
        "div",
        { className: "docente-chart-header__left" },
        h("span", { className: "docente-chart-tag docente-chart-tag--emerald" }, "ASISTENCIA"),
        h("h3", { className: "docente-chart-title" }, "% Asistencia por Curso")
      ),
      h(
        "div",
        { className: "docente-chart-header__right" },
        h("span", { className: "docente-chart-stat-badge docente-chart-stat-badge--emerald" },
          promedioAsistencia !== null
            ? [h("strong", { key: "pct" }, `${promedioAsistencia}%`), " promedio general"]
            : h("span", { key: "sin-datos" }, "Sin asistencias computadas")
        )
      )
    ),

    // Área del Gráfico
    h(
      "div",
      { className: "docente-chart-plot" },

      // Eje Y (guías horizontales porcentuales)
      h(
        "div",
        { className: "docente-chart-y-axis" },
        yTicks.map((tick, idx) =>
          h(
            "div",
            { key: idx, className: "docente-chart-y-row" },
            h("span", { className: "docente-chart-y-lbl" }, `${tick}%`),
            h("div", { className: "docente-chart-y-line" })
          )
        )
      ),

      // Columnas dinámicas según cantidad de cursos
      h(
        "div",
        {
          className: "docente-chart-cols-container",
          style: {
            gridTemplateColumns: `repeat(${cantidadCursos}, minmax(0, 1fr))`
          }
        },
        cursos.map((c, idx) => {
          const asigData = asistenciasData[idx];
          const pct = asigData.porcentaje;
          const cursoStr = c.curso ? (String(c.curso).includes("°") ? c.curso : `${c.curso}°`) : `${c.anio || 1}°`;
          const divisionStr = c.division ? `${c.division}°` : "";
          const etiquetaCurso = `${cursoStr} ${divisionStr}`.trim();
          const materiaNombre = c.materia || "";
          const turnoNombre = c.turnoAula || c.turno || "";
          const isHovered = hoveredIdx === idx;
          const esCero = asigData.sinAlumnos || asigData.sinRegistros || pct === 0;

          return h(
            "a",
            {
              key: c.id || idx,
              href: `#/docente/asistencias?curso=${encodeURIComponent(cursoStr)}&div=${encodeURIComponent(c.division)}`,
              className: `docente-chart-col-item ${isHovered ? "docente-chart-col-item--active" : ""}`,
              onMouseEnter: () => setHoveredIdx(idx),
              onMouseLeave: () => setHoveredIdx(null),
              title: `${etiquetaCurso}: ${asigData.label} asistencia ${materiaNombre ? `(${materiaNombre})` : ""}`
            },

            // Tooltip flotante (sin brillo, plano y limpio)
            isHovered
              ? h(
                  "div",
                  { className: "docente-chart-tooltip" },
                  h("div", { className: "docente-chart-tooltip__title" }, etiquetaCurso),
                  materiaNombre ? h("div", { className: "docente-chart-tooltip__sub" }, materiaNombre) : null,
                  h("div", { className: "docente-chart-tooltip__val" }, `${asigData.label} Asistencia`),
                  h("div", { className: "docente-chart-tooltip__meta" }, asigData.subtexto),
                  h("div", { className: "docente-chart-tooltip__hint" }, "Clic para abrir asistencias ➔")
                )
              : null,

            // Valor porcentual encima de la pista de barra
            h(
              "div",
              {
                className: `docente-chart-col-val ${esCero ? "docente-chart-col-val--zero" : "docente-chart-col-val--emerald"}`
              },
              h("strong", null, asigData.label)
            ),

            // Pista de la barra con relleno porcentual
            h(
              "div",
              { className: "docente-chart-col-track" },
              h("div", {
                className: "docente-chart-col-fill docente-chart-col-fill--emerald",
                style: {
                  height: `${esCero ? 0 : pct}%`,
                  minHeight: esCero ? "0px" : "6px"
                }
              })
            ),

            // Etiquetas del pie de columna
            h(
              "div",
              { className: "docente-chart-col-labels" },
              h("span", { className: "docente-chart-col-main" }, etiquetaCurso),
              materiaNombre ? h("span", { className: "docente-chart-col-sub", title: materiaNombre }, materiaNombre) : null,
              turnoNombre ? h("span", { className: "docente-chart-col-shift" }, turnoNombre) : null
            )
          );
        })
      )
    )
  );
}

/**
 * Componente principal: Renderiza los 2 contenedores de gráficos
 * (Alumnos por curso y % Asistencia por curso) con datos 100% reales.
 */
export function DocenteCursosGrafico({ cursos = [], loading = false }) {
  const cantidadCursos = cursos.length;

  if (loading) {
    return h(
      "div",
      { className: "docente-charts-dual-grid" },
      h(
        "div",
        { className: "docente-chart-card docente-chart-card--skeleton" },
        h("div", { className: "docente-chart-skeleton-title" }),
        h("div", { className: "docente-chart-skeleton-body" })
      ),
      h(
        "div",
        { className: "docente-chart-card docente-chart-card--skeleton" },
        h("div", { className: "docente-chart-skeleton-title" }),
        h("div", { className: "docente-chart-skeleton-body" })
      )
    );
  }

  if (cantidadCursos === 0) {
    return h(
      "div",
      { className: "docente-charts-dual-grid" },
      h(
        "div",
        { className: "docente-chart-card docente-chart-card--empty", style: { gridColumn: "1 / -1" } },
        h("h3", { style: { margin: "0 0 6px", color: "#1e293b", fontSize: "16px" } }, "No tenés cursos asignados"),
        h("p", { style: { margin: 0, color: "#64748b", fontSize: "13px" } }, "Cuando se te asignen cursos aparecerán acá los indicadores reales de matrícula y asistencia.")
      )
    );
  }

  return h(
    "section",
    {
      className: "docente-charts-dual-grid",
      "aria-label": "Gráficos de matrícula y asistencia por curso"
    },
    h(GraficoAlumnosCompacto, { cursos }),
    h(GraficoAsistenciaCompacto, { cursos })
  );
}
