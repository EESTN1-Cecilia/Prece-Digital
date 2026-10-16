import React, { useState, useEffect, useCallback, useMemo } from "react";
import { h, ActionButton, IconoFigma } from "../../layouts/site-layout.js";
import { useUsuarioActual } from "../../estado/index.js";
import { DashboardCard } from "../../components/dashboard/dashboard-card.js";
import { LoadingState, EmptyState, ErrorState } from "../../components/common/state-handlers.js";
import { StudentsService } from "../students/students-service.js";

const ASIGNACIONES_DOCENTE_DEFAULT = [
  { id: "1-1", anio: 1, curso: "1°", division: "1", materia: "Matemática I", turnoAula: "Mañana", turnoTaller: "Tarde", orientacion: "Ciclo Básico", cantidad: 28, activos: 28 },
  { id: "2-1", anio: 2, curso: "2°", division: "1", materia: "Matemática II", turnoAula: "Mañana", turnoTaller: "Tarde", orientacion: "Ciclo Básico", cantidad: 28, activos: 28 },
  { id: "3-3", anio: 3, curso: "3°", division: "3", materia: "Matemática III", turnoAula: "Tarde", turnoTaller: "Mañana", orientacion: "Ciclo Básico", cantidad: 28, activos: 28 }
];

export default function DocenteCursosView() {
  const user = useUsuarioActual();
  const [cursos, setCursos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState("card"); // 'card' | 'table'
  const [selectedTurnoFilter, setSelectedTurnoFilter] = useState("todos");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchCursos = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const divisiones = await StudentsService.getDivisiones();

      const asignaciones = (user?.assignments && user.assignments.length > 0)
        ? user.assignments
        : ASIGNACIONES_DOCENTE_DEFAULT;

      const cursosAsignados = (divisiones || []).filter((div) => {
        return asignaciones.some((asig) => {
          const anioAsig = String(asig.anio || asig.curso || "").replace(/\D/g, "");
          const anioDiv = String(div.anio || div.curso || "").replace(/\D/g, "");
          const divAsig = String(asig.division || "").trim();
          const divDiv = String(div.division || "").trim();
          return anioAsig === anioDiv && divAsig === divDiv;
        });
      });

      const cursosListos = cursosAsignados.map((c) => {
        const asig = asignaciones.find((a) => {
          const anioAsig = String(a.anio || a.curso || "").replace(/\D/g, "");
          const anioDiv = String(c.anio || c.curso || "").replace(/\D/g, "");
          const divAsig = String(a.division || "").trim();
          const divDiv = String(c.division || "").trim();
          return anioAsig === anioDiv && divAsig === divDiv;
        });
        return {
          ...c,
          materia: asig?.materia || "Matemática"
        };
      });

      if (cursosListos.length === 0) {
        setCursos(ASIGNACIONES_DOCENTE_DEFAULT);
      } else {
        setCursos(cursosListos);
      }
    } catch (err) {
      console.error("Error al cargar cursos a cargo:", err);
      setError("No se pudieron cargar los cursos asignados desde la base de datos.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchCursos();
  }, [fetchCursos]);

  // Filtrado reactivo por turno y búsqueda
  const cursosFiltrados = useMemo(() => {
    return cursos.filter((c) => {
      if (selectedTurnoFilter !== "todos") {
        const t = String(c.turnoAula || c.turno || "").toLowerCase();
        if (!t.includes(selectedTurnoFilter)) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const mat = (c.materia || "").toLowerCase();
        const cur = `${c.curso} ${c.division}`.toLowerCase();
        const ori = (c.orientacion || "").toLowerCase();
        if (!mat.includes(q) && !cur.includes(q) && !ori.includes(q)) return false;
      }
      return true;
    });
  }, [cursos, selectedTurnoFilter, searchQuery]);

  const totalEstudiantes = cursos.reduce((acc, c) => acc + (Number(c.activos ?? c.cantidad) || 0), 0);
  const escuelaNombre = user?.escuela || "E.E.S.T N°1 Monte Grande";
  const cicloLectivo = user?.cicloLectivo || 2026;

  return h(
    "section",
    { className: "docente-cursos-container docente-panel" },

    // 1. Barra de navegación superior (con botón de regreso)
    h(
      "div",
      { className: "alumnos-top-nav" },
      h(
        "button",
        {
          type: "button",
          className: "btn-volver-atras",
          onClick: () => {
            if (window.history.length > 1) {
              window.history.back();
            } else {
              window.location.hash = "#/docente";
            }
          },
          title: "Volver al Tablero Docente"
        },
        h(
          "svg",
          { className: "btn-volver-atras__icon", viewBox: "0 0 20 20", fill: "currentColor" },
          h("path", {
            fillRule: "evenodd",
            d: "M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z",
            clipRule: "evenodd"
          })
        ),
        h("span", null, "Volver al Dashboard")
      ),
      h(
        "div",
        { className: "alumnos-top-badges" },
        h("span", { className: "badge-institucion" }, escuelaNombre),
        h("span", { className: "badge-ciclo" }, `Ciclo Lectivo ${cicloLectivo}`)
      )
    ),

    // 2. Encabezado descriptivo oficial
    h(
      "div",
      { className: "alumnos-header-block" },
      h(
        "div",
        { className: "alumnos-title-row" },
        h("h1", { className: "alumnos-page-title" }, "Cursos y Materias a Cargo"),
        h("span", { className: "alumnos-school-badge" }, `${cursos.length} divisiones asignadas`)
      ),
      h(
        "p",
        { className: "alumnos-intro-desc" },
        "Acceso directo a las planillas de asistencia oficiales y a la confección de boletines digitales para cada una de tus asignaturas activas."
      )
    ),

    // 3. Tarjeta Principal: DashboardCard con alternancia Tarjeta / Lista
    h(
      DashboardCard,
      {
        title: "Mis Divisiones Asignadas",
        icon: "academic",
        badge: `${cursosFiltrados.length} de ${cursos.length} cursos`,
        className: "dashboard-card--highlight alumnos-main-card",
        collapsible: false,
        actions: h(
          "div",
          { className: "alumnos-header-actions" },
          // Switch de Vista: Tarjetas vs Listado
          h(
            "div",
            { className: "view-mode-toggle", role: "group", "aria-label": "Modo de visualización" },
            h(
              "button",
              {
                type: "button",
                className: `view-mode-btn ${viewMode === "card" ? "active" : ""}`,
                onClick: () => setViewMode("card"),
                title: "Vista en tarjetas",
                "aria-label": "Vista en tarjetas",
                "aria-pressed": viewMode === "card"
              },
              h(
                "svg",
                {
                  className: "view-mode-icon",
                  viewBox: "0 0 20 20",
                  fill: "none",
                  stroke: "currentColor",
                  strokeWidth: "2.2",
                  strokeLinecap: "round",
                  "aria-hidden": "true"
                },
                h("rect", { x: "3", y: "3", width: "5.5", height: "5.5", rx: "1.5" }),
                h("rect", { x: "11.5", y: "3", width: "5.5", height: "5.5", rx: "1.5" }),
                h("rect", { x: "3", y: "11.5", width: "5.5", height: "5.5", rx: "1.5" }),
                h("rect", { x: "11.5", y: "11.5", width: "5.5", height: "5.5", rx: "1.5" })
              )
            ),
            h(
              "button",
              {
                type: "button",
                className: `view-mode-btn ${viewMode === "table" ? "active" : ""}`,
                onClick: () => setViewMode("table"),
                title: "Vista en lista",
                "aria-label": "Vista en lista",
                "aria-pressed": viewMode === "table"
              },
              h(
                "svg",
                {
                  className: "view-mode-icon",
                  viewBox: "0 0 20 20",
                  fill: "none",
                  stroke: "currentColor",
                  strokeWidth: "2.2",
                  strokeLinecap: "round",
                  "aria-hidden": "true"
                },
                h("circle", { cx: "4", cy: "5.5", r: "1", fill: "currentColor", stroke: "none" }),
                h("line", { x1: "8", y1: "5.5", x2: "16.5", y2: "5.5" }),
                h("circle", { cx: "4", cy: "10", r: "1", fill: "currentColor", stroke: "none" }),
                h("line", { x1: "8", y1: "10", x2: "16.5", y2: "10" }),
                h("circle", { cx: "4", cy: "14.5", r: "1", fill: "currentColor", stroke: "none" }),
                h("line", { x1: "8", y1: "14.5", x2: "16.5", y2: "14.5" })
              )
            )
          ),
          h(
            ActionButton,
            {
              icon: "filter",
              tone: "secondary",
              onClick: fetchCursos,
              disabled: loading
            },
            loading ? "Actualizando..." : "Actualizar"
          )
        )
      },

      // Toolbar de Filtros y Búsqueda
      h(
        "div",
        { className: "alumnos-toolbar" },
        h(
          "div",
          { className: "search-input-wrapper" },
          h(IconoFigma, { className: "search-input-icon", nombre: "search" }),
          h("input", {
            type: "text",
            className: "search-input",
            placeholder: "Buscar por materia, curso o ciclo...",
            value: searchQuery,
            onChange: (e) => setSearchQuery(e.target.value)
          }),
          searchQuery
            ? h(
                "button",
                {
                  type: "button",
                  className: "search-clear-btn",
                  onClick: () => setSearchQuery("")
                },
                "✕"
              )
            : null
        ),
        h(
          "div",
          { className: "filters-group" },
          h(
            "div",
            { className: "filter-pills" },
            [
              { id: "todos", label: "Todos los turnos" },
              { id: "mañana", label: "Turno Mañana" },
              { id: "tarde", label: "Turno Tarde" }
            ].map((pill) =>
              h(
                "button",
                {
                  key: pill.id,
                  type: "button",
                  className: `filter-pill ${selectedTurnoFilter === pill.id ? "active filter-pill--active" : ""}`,
                  onClick: () => setSelectedTurnoFilter(pill.id)
                },
                pill.label
              )
            )
          )
        )
      ),

      // Banner informativo
      h(
        "div",
        { className: "alumnos-filter-status-bar" },
        h(
          "span",
          { className: "filter-status-text" },
          `Total matrícula asignada: ${totalEstudiantes} estudiantes en ${cursos.length} comisiones activas.`
        )
      ),

      // Estados de carga / error / vacío
      loading
        ? h(LoadingState, { mensaje: "Cargando cursos y materias a cargo..." })
        : error
        ? h(ErrorState, { mensaje: error, onRetry: fetchCursos })
        : cursosFiltrados.length === 0
        ? h(EmptyState, { mensaje: "No se encontraron cursos coincidentes con los filtros aplicados." })
        : viewMode === "card"
        ? // A. MODO TARJETAS (Cards)
          h(
            "div",
            { className: "docente-cursos-grid", style: { padding: "8px 0 16px" } },
            cursosFiltrados.map((c) => {
              const displayCurso = c.curso || `${c.anio}°`;
              const displayDivision = c.division ? `${c.division}°` : "";
              const displayTurno = c.turnoAula || c.turno || "Mañana";
              const displayOrientacion = c.orientacion || "Ciclo Básico";
              const cantidadAlumnos = c.activos ?? c.cantidad ?? 0;

              return h(
                "div",
                { key: c.id || `${c.curso}-${c.division}`, className: "docente-curso-card" },
                h(
                  "div",
                  { className: "docente-curso-card__header" },
                  h("span", { className: "docente-curso-badge" }, `${displayCurso} ${displayDivision}`),
                  h("span", { className: "docente-curso-turno" }, displayTurno)
                ),
                h(
                  "div",
                  { className: "docente-curso-card__body" },
                  h("span", { className: "docente-curso-materia" }, c.materia || displayOrientacion),
                  h(
                    "div",
                    { className: "docente-curso-info-row" },
                    h("span", null, `Turno Taller: ${c.turnoTaller || (displayTurno === "Mañana" ? "Tarde" : "Mañana")}`),
                    h("span", null, `• ${cantidadAlumnos} estudiantes`)
                  )
                ),
                h(
                  "div",
                  { className: "docente-curso-card__actions" },
                  h(
                    "a",
                    {
                      href: `#/asistencias?curso=${encodeURIComponent(displayCurso)}&div=${encodeURIComponent(c.division)}&materia=${encodeURIComponent(c.materia || "")}`,
                      className: "docente-curso-action-btn docente-curso-action-btn--asistencia",
                      title: `Planilla de asistencia para ${displayCurso} ${displayDivision}`
                    },
                    h(
                      "svg",
                      { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" },
                      h("path", { d: "M9 11l3 3L22 4" }),
                      h("path", { d: "M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" })
                    ),
                    "Asistencia"
                  ),
                  h(
                    "a",
                    {
                      href: `#/boletines?curso=${encodeURIComponent(displayCurso)}&div=${encodeURIComponent(c.division)}`,
                      className: "docente-curso-action-btn docente-curso-action-btn--boletin",
                      title: `Boletines de ${displayCurso} ${displayDivision}`
                    },
                    h(
                      "svg",
                      { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" },
                      h("path", { d: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20" }),
                      h("path", { d: "M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" })
                    ),
                    "Boletines"
                  )
                )
              );
            })
          )
        : // B. MODO LISTADO (Tabla)
          h(
            "div",
            { className: "alumnos-table-wrap" },
            h(
              "table",
              { className: "custom-table alumnos-table" },
              h(
                "thead",
                null,
                h(
                  "tr",
                  null,
                  h("th", { style: { width: "130px" } }, "Curso / Div"),
                  h("th", null, "Materia Asignada"),
                  h("th", { style: { width: "120px" } }, "Turno Aula"),
                  h("th", { style: { width: "120px" } }, "Turno Taller"),
                  h("th", null, "Orientación"),
                  h("th", { style: { width: "110px", textAlign: "center" } }, "Matrícula"),
                  h("th", { style: { width: "200px", textAlign: "center" } }, "Acciones")
                )
              ),
              h(
                "tbody",
                null,
                cursosFiltrados.map((c) => {
                  const displayCurso = c.curso || `${c.anio}°`;
                  const displayDivision = c.division ? `${c.division}°` : "";
                  const displayTurno = c.turnoAula || c.turno || "Mañana";
                  const cantidadAlumnos = c.activos ?? c.cantidad ?? 0;

                  return h(
                    "tr",
                    { key: c.id || `${c.curso}-${c.division}`, className: "alumno-row" },
                    h(
                      "td",
                      null,
                      h("span", { className: "curso-badge" }, `${displayCurso} ${displayDivision}`)
                    ),
                    h(
                      "td",
                      null,
                      h("strong", { className: "alumno-name" }, c.materia || "Matemática")
                    ),
                    h("td", null, displayTurno),
                    h("td", null, c.turnoTaller || (displayTurno === "Mañana" ? "Tarde" : "Mañana")),
                    h("td", { className: "text-muted" }, c.orientacion || "Ciclo Básico"),
                    h("td", { style: { textAlign: "center", fontWeight: "700" } }, `${cantidadAlumnos} al.`),
                    h(
                      "td",
                      { style: { textAlign: "center" } },
                      h(
                        "div",
                        { style: { display: "inline-flex", gap: "6px" } },
                        h(
                          "a",
                          {
                            href: `#/asistencias?curso=${encodeURIComponent(displayCurso)}&div=${encodeURIComponent(c.division)}&materia=${encodeURIComponent(c.materia || "")}`,
                            className: "btn-ver-ficha-inline",
                            title: "Tomar asistencia"
                          },
                          "Asistencia"
                        ),
                        h(
                          "a",
                          {
                            href: `#/boletines?curso=${encodeURIComponent(displayCurso)}&div=${encodeURIComponent(c.division)}`,
                            className: "btn-ver-ficha-inline",
                            style: { background: "#f0fdf4", color: "#166534", borderColor: "#bbf7d0" },
                            title: "Ver boletines"
                          },
                          "Boletines"
                        )
                      )
                    )
                  );
                })
              )
            )
          )
    )
  );
}
