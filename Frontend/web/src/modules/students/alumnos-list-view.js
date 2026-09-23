import React, { useState, useEffect, useCallback, useMemo } from "react";
import { h, ActionButton, IconoFigma } from "../../layouts/site-layout.js";
import { DashboardCard } from "../../components/dashboard/dashboard-card.js";
import { LoadingState, EmptyState, ErrorState, StatusBadge } from "../../components/common/state-handlers.js";
import { CustomSelect } from "../../components/common/custom-select.js";
import { StudentsService } from "./students-service.js";

export default function AlumnosListView() {
  // Filtros del Listado de Alumnos
  const [viewMode, setViewMode] = useState("table"); // 'table' | 'card'
  const [studentSearch, setStudentSearch] = useState("");
  const [debouncedStudentSearch, setDebouncedStudentSearch] = useState("");
  const [selectedCurso, setSelectedCurso] = useState("todos");
  const [selectedDivision, setSelectedDivision] = useState("todas");
  const [selectedTurno, setSelectedTurno] = useState("todos");
  const [selectedEstado, setSelectedEstado] = useState("todos");
  const [selectedCondicion, setSelectedCondicion] = useState("todas");

  // Ordenamiento y datos de alumnos
  const [sortBy, setSortBy] = useState("apellido");
  const [sortOrder, setSortOrder] = useState("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;

  const [students, setStudents] = useState([]);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 25,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Leer parámetros de URL al iniciar o cambiar hash (#/alumnos?curso=1°&div=1)
  useEffect(() => {
    const parseHashParams = () => {
      const hash = window.location.hash;
      if (hash.includes("?")) {
        const queryPart = hash.split("?")[1];
        const params = new URLSearchParams(queryPart);
        const c = params.get("curso");
        const d = params.get("div") || params.get("division");
        const q = params.get("q");

        if (c) setSelectedCurso(c.includes("°") ? c : `${c}°`);
        if (d) setSelectedDivision(String(d));
        if (q) {
          setStudentSearch(q);
          setDebouncedStudentSearch(q);
        }
      }
    };

    parseHashParams();
    window.addEventListener("hashchange", parseHashParams);
    return () => window.removeEventListener("hashchange", parseHashParams);
  }, []);

  // Debounce para el buscador de alumnos
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedStudentSearch(studentSearch);
      setCurrentPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [studentSearch]);

  // Cargar nómina de alumnos con filtros y paginación
  const fetchStudents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await StudentsService.getAlumnos({
        q: debouncedStudentSearch,
        curso: selectedCurso,
        division: selectedDivision,
        turno: selectedTurno,
        estado: selectedEstado,
        condicion: selectedCondicion,
        sortBy,
        sortOrder,
        page: currentPage,
        limit: pageSize
      });

      setStudents(res.data || []);
      setPagination(
        res.pagination || {
          total: res.data?.length || 0,
          page: currentPage,
          limit: pageSize,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false
        }
      );
    } catch (err) {
      setError(err.message || "Error al cargar el listado de alumnos.");
    } finally {
      setLoading(false);
    }
  }, [
    debouncedStudentSearch,
    selectedCurso,
    selectedDivision,
    selectedTurno,
    selectedEstado,
    selectedCondicion,
    sortBy,
    sortOrder,
    currentPage,
    pageSize
  ]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
    setCurrentPage(1);
  };

  const renderSortIndicator = (field) => {
    if (sortBy !== field) {
      return h("span", { className: "sort-icon sort-icon--inactive" }, " ⬍");
    }
    return h(
      "span",
      { className: "sort-icon sort-icon--active" },
      sortOrder === "asc" ? " ▲" : " ▼"
    );
  };

  const handleResetFilters = () => {
    setStudentSearch("");
    setDebouncedStudentSearch("");
    setSelectedCurso("todos");
    setSelectedDivision("todas");
    setSelectedTurno("todos");
    setSelectedEstado("todos");
    setSelectedCondicion("todas");
    setCurrentPage(1);
    window.location.hash = "#/alumnos";
  };

  const isFiltered =
    debouncedStudentSearch.trim() !== "" ||
    selectedCurso !== "todos" ||
    selectedDivision !== "todas" ||
    selectedTurno !== "todos" ||
    selectedEstado !== "todos" ||
    selectedCondicion !== "todas";

  return h(
    "section",
    { className: "welcome-panel alumnos-panel" },

    // Barra superior con botones institucionales y retorno
    h(
      "div",
      { className: "dashboard-top-bar alumnos-top-nav" },
      h(
        "button",
        {
          type: "button",
          className: "btn-volver-atras",
          onClick: () => {
            window.location.hash = "#/inicio";
          },
          title: "Volver al dashboard",
          "aria-label": "Volver al dashboard"
        },
        h(
          "svg",
          {
            className: "btn-volver-atras__icon",
            viewBox: "0 0 20 20",
            fill: "currentColor",
            "aria-hidden": "true"
          },
          h("path", {
            fillRule: "evenodd",
            d: "M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z",
            clipRule: "evenodd"
          })
        ),
        h("span", null, "Volver al Dashboard")
      ),
      h(
        "div",
        { className: "alumnos-top-badges" },
        h("span", { className: "badge-institucion" }, "E.E.ST N°1 Monte Grande"),
        h("span", { className: "badge-ciclo" }, "Ciclo Lectivo 2026")
      )
    ),

    // Tarjeta Principal: Listado de Alumnos
    h(
      DashboardCard,
      {
        title: "Listado General de Alumnos",
        icon: "people",
        badge: `${pagination.total} alumnos registrados`,
        className: "dashboard-card--highlight alumnos-main-card",
        collapsible: false,
        actions: h(
          "div",
          { className: "alumnos-header-actions" },
          // Switch de Vista: Tabla vs Tarjetas
          h(
            "div",
            { className: "view-mode-toggle", role: "group", "aria-label": "Modo de visualización" },
            h(
              "button",
              {
                type: "button",
                className: `view-mode-btn ${viewMode === "table" ? "active" : ""}`,
                onClick: () => setViewMode("table"),
                title: "Vista en lista de tabla",
                "aria-label": "Vista en lista de tabla",
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
            ),
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
                  strokeLinejoin: "round",
                  "aria-hidden": "true"
                },
                h("rect", { x: "3", y: "3", width: "5.5", height: "5.5", rx: "1.5" }),
                h("rect", { x: "11.5", y: "3", width: "5.5", height: "5.5", rx: "1.5" }),
                h("rect", { x: "3", y: "11.5", width: "5.5", height: "5.5", rx: "1.5" }),
                h("rect", { x: "11.5", y: "11.5", width: "5.5", height: "5.5", rx: "1.5" })
              )
            )
          ),
          // Botón Ver Cursos
          h(
            "a",
            {
              href: "#/cursos",
              className: "action-button action-button--secondary",
              title: "Ver directorio de cursos y divisiones"
            },
            h(IconoFigma, { className: "action-button__icon", nombre: "academic" }),
            h("span", null, "Ver Cursos")
          ),
          // Botón Cargar Alumno
          h(
            ActionButton,
            {
              icon: "clipboard",
              tone: "primary",
              onClick: () => {
                window.location.hash = "#/alumnos/cargar";
              }
            },
            "Cargar Alumno"
          )
        )
      },

      // Toolbar de Búsqueda y Filtros
      h(
        "div",
        { className: "alumnos-toolbar" },
        // Input de búsqueda principal
        h(
          "div",
          { className: "search-input-wrapper" },
          h(IconoFigma, { className: "search-input-icon", nombre: "search" }),
          h("input", {
            type: "text",
            className: "search-input",
            placeholder: "Buscar alumno (apellido, nombre, DNI, legajo)...",
            value: studentSearch,
            onChange: (e) => setStudentSearch(e.target.value),
            "aria-label": "Buscar alumno"
          }),
          studentSearch
            ? h(
                "button",
                {
                  type: "button",
                  className: "search-clear-btn",
                  onClick: () => {
                    setStudentSearch("");
                    setDebouncedStudentSearch("");
                  },
                  "aria-label": "Limpiar búsqueda"
                },
                "✕"
              )
            : null
        ),

        // Filtros desplegables
        h(
          "div",
          { className: "filters-group" },
          h(CustomSelect, {
            label: "Año/Curso",
            value: selectedCurso,
            onChange: (val) => {
              setSelectedCurso(typeof val === "string" ? val : val?.target?.value);
              setCurrentPage(1);
            },
            options: [
              { value: "todos", label: "Todos los Años" },
              { value: "1°", label: "1° Año" },
              { value: "2°", label: "2° Año" },
              { value: "3°", label: "3° Año" },
              { value: "4°", label: "4° Año" },
              { value: "5°", label: "5° Año" },
              { value: "6°", label: "6° Año" },
              { value: "7°", label: "7° Año" }
            ]
          }),
          h(CustomSelect, {
            label: "División",
            value: selectedDivision,
            onChange: (val) => {
              setSelectedDivision(typeof val === "string" ? val : val?.target?.value);
              setCurrentPage(1);
            },
            options: [
              { value: "todas", label: "Todas las Div." },
              { value: "1", label: "División 1" },
              { value: "2", label: "División 2" },
              { value: "3", label: "División 3" },
              { value: "4", label: "División 4" },
              { value: "5", label: "División 5" },
              { value: "6", label: "División 6" }
            ]
          }),
          h(CustomSelect, {
            label: "Turno",
            value: selectedTurno,
            onChange: (val) => {
              setSelectedTurno(typeof val === "string" ? val : val?.target?.value);
              setCurrentPage(1);
            },
            options: [
              { value: "todos", label: "Todos los Turnos" },
              { value: "Mañana", label: "Mañana" },
              { value: "Tarde", label: "Tarde" }
            ]
          }),
          h(CustomSelect, {
            label: "Estado",
            value: selectedEstado,
            onChange: (val) => {
              setSelectedEstado(typeof val === "string" ? val : val?.target?.value);
              setCurrentPage(1);
            },
            options: [
              { value: "todos", label: "Todos los Estados" },
              { value: "Activo", label: "Activo" },
              { value: "Inactivo", label: "Inactivo" },
              { value: "Pase pendiente", label: "Pase pendiente" }
            ]
          }),
          h(CustomSelect, {
            label: "Condición",
            value: selectedCondicion,
            onChange: (val) => {
              setSelectedCondicion(typeof val === "string" ? val : val?.target?.value);
              setCurrentPage(1);
            },
            options: [
              { value: "todas", label: "Todas las Cond." },
              { value: "Regular", label: "Regular" },
              { value: "Irregular", label: "Irregular" }
            ]
          })
        )
      ),

      // Banner informativo si hay un filtro de curso activo
      isFiltered
        ? h(
            "div",
            { className: "alumnos-filter-status-bar" },
            h(
              "span",
              { className: "filter-status-text" },
              `Filtros activos: ${[
                debouncedStudentSearch ? `Búsqueda: "${debouncedStudentSearch}"` : null,
                selectedCurso !== "todos" ? `Año: ${selectedCurso}` : null,
                selectedDivision !== "todas" ? `División: ${selectedDivision}` : null,
                selectedTurno !== "todos" ? `Turno: ${selectedTurno}` : null,
                selectedEstado !== "todos" ? `Estado: ${selectedEstado}` : null,
                selectedCondicion !== "todas" ? `Condición: ${selectedCondicion}` : null
              ]
                .filter(Boolean)
                .join(" • ")}`
            ),
            h(
              "button",
              {
                type: "button",
                className: "btn-clear-all-filters",
                onClick: handleResetFilters
              },
              "Limpiar Filtros"
            )
          )
        : null,

      // Estado de Carga
      loading ? h(LoadingState, { mensaje: "Cargando nómina de alumnos..." }) : null,

      // Estado de Error
      error ? h(ErrorState, { mensaje: error, onRetry: fetchStudents }) : null,

      // Estado Sin Resultados
      !loading && !error && students.length === 0
        ? h(EmptyState, {
            mensaje: isFiltered
              ? "No se encontraron alumnos coincidentes con los criterios y filtros seleccionados."
              : "No hay alumnos registrados en el sistema.",
            action: isFiltered
              ? h(
                  "button",
                  {
                    type: "button",
                    className: "action-button action-button--secondary",
                    onClick: handleResetFilters
                  },
                  "Restablecer Filtros"
                )
              : null
          })
        : null,

      // Listado de Alumnos (Tabla o Tarjetas)
      !loading && !error && students.length > 0
        ? viewMode === "table"
          ? // 1. Tabla de Alumnos
            h(
              "div",
              { className: "table-responsive alumnos-table-wrap" },
              h(
                "table",
                { className: "custom-table alumnos-table" },
                h(
                  "thead",
                  null,
                  h(
                    "tr",
                    null,
                    h(
                      "th",
                      {
                        onClick: () => handleSort("apellido"),
                        className: "sortable-th",
                        title: "Ordenar por Apellido y Nombre"
                      },
                      "Apellido y Nombre",
                      renderSortIndicator("apellido")
                    ),
                    h(
                      "th",
                      {
                        onClick: () => handleSort("dni"),
                        className: "sortable-th",
                        title: "Ordenar por DNI"
                      },
                      "DNI",
                      renderSortIndicator("dni")
                    ),
                    h(
                      "th",
                      {
                        onClick: () => handleSort("curso"),
                        className: "sortable-th",
                        title: "Ordenar por Curso y División"
                      },
                      "Curso / Div",
                      renderSortIndicator("curso")
                    ),
                    h("th", null, "Turno"),
                    h("th", null, "Condición"),
                    h(
                      "th",
                      {
                        onClick: () => handleSort("estado"),
                        className: "sortable-th",
                        title: "Ordenar por Estado"
                      },
                      "Estado",
                      renderSortIndicator("estado")
                    ),
                    h("th", { className: "text-center" }, "Acciones")
                  )
                ),
                h(
                  "tbody",
                  null,
                  students.map((alumno) =>
                    h(
                      "tr",
                      { key: alumno.id, className: "alumno-row" },
                      h(
                        "td",
                        null,
                        h("strong", { className: "alumno-name" }, `${alumno.apellido}, ${alumno.nombre}`)
                      ),
                      h("td", { className: "text-muted" }, alumno.dni),
                      h(
                        "td",
                        null,
                        h("span", { className: "curso-badge" }, `${alumno.curso} ${alumno.division}`)
                      ),
                      h("td", null, alumno.turno || "-"),
                      h(
                        "td",
                        null,
                        h(
                          "span",
                          {
                            className: `condicion-tag ${
                              alumno.condicion === "Irregular"
                                ? "condicion-tag--libre"
                                : "condicion-tag--regular"
                            }`
                          },
                          alumno.condicion || "Regular"
                        )
                      ),
                      h(
                        "td",
                        null,
                        h(StatusBadge, {
                          status:
                            alumno.estado === "Activo"
                              ? "success"
                              : alumno.estado === "Pase pendiente"
                              ? "warning"
                              : "danger",
                          label: alumno.estado
                        })
                      ),
                      h(
                        "td",
                        { className: "text-center" },
                        h(
                          "div",
                          { className: "table-actions-inline" },
                          h(
                            "a",
                            {
                              href: `#/alumnos/${alumno.id}`,
                              className: "table-action-link btn-ver-ficha-inline",
                              title: `Ver ficha de ${alumno.nombre}`
                            },
                            "Ver Ficha"
                          )
                        )
                      )
                    )
                  )
                )
              )
            )
          : // 2. Tarjetas de Alumnos
            h(
              "div",
              { className: "students-cards-grid" },
              students.map((alumno) =>
                h(
                  "article",
                  { key: alumno.id, className: "student-mini-card" },
                  h(
                    "div",
                    { className: "student-mini-card__header" },
                    h(
                      "div",
                      { className: "student-mini-card__avatar-wrap" },
                      h(IconoFigma, { className: "student-mini-card__avatar", nombre: "avatar" })
                    ),
                    h(
                      "div",
                      { className: "student-mini-card__title-wrap" },
                      h("h3", { className: "student-mini-card__name" }, `${alumno.apellido}, ${alumno.nombre}`),
                      h("span", { className: "student-mini-card__legajo" }, alumno.legajo || `ID: ${alumno.id}`)
                    ),
                    h(StatusBadge, {
                      status:
                        alumno.estado === "Activo"
                          ? "success"
                          : alumno.estado === "Pase pendiente"
                          ? "warning"
                          : "danger",
                      label: alumno.estado
                    })
                  ),
                  h(
                    "div",
                    { className: "student-mini-card__body" },
                    h(
                      "div",
                      { className: "student-mini-card__info-row" },
                      h("span", { className: "info-label" }, "DNI:"),
                      h("strong", null, alumno.dni)
                    ),
                    h(
                      "div",
                      { className: "student-mini-card__info-row" },
                      h("span", { className: "info-label" }, "Curso:"),
                      h("span", { className: "curso-badge" }, `${alumno.curso} ${alumno.division}`)
                    ),
                    h(
                      "div",
                      { className: "student-mini-card__info-row" },
                      h("span", { className: "info-label" }, "Condición:"),
                      h("strong", null, alumno.condicion || "Regular")
                    ),
                    h(
                      "div",
                      { className: "student-mini-card__info-row" },
                      h("span", { className: "info-label" }, "Turno:"),
                      h("span", null, alumno.turno || "-")
                    )
                  ),
                  h(
                    "div",
                    { className: "student-mini-card__actions" },
                    h(
                      "a",
                      {
                        href: `#/alumnos/${alumno.id}`,
                        className: "action-button action-button--primary student-card-btn student-card-btn--full"
                      },
                      h(IconoFigma, { className: "action-button__icon", nombre: "user-search" }),
                      h("span", null, "Ver Ficha")
                    )
                  )
                )
              )
            )
        : null,

      // Paginación y Barra inferior
      !loading && !error && students.length > 0
        ? h(
            "div",
            { className: "alumnos-pagination-row" },
            h(
              "div",
              { className: "pagination-info" },
              h(
                "span",
                { className: "pagination-counter-text" },
                `Página ${pagination.page} de ${pagination.totalPages} • Total: ${pagination.total} alumnos`
              )
            ),
            h(
              "div",
              { className: "pagination-controls-buttons" },
              h(
                "button",
                {
                  type: "button",
                  className: "pagination-btn",
                  disabled: !pagination.hasPrevPage || currentPage <= 1,
                  onClick: () => setCurrentPage((prev) => Math.max(1, prev - 1)),
                  title: "Página anterior"
                },
                "← Anterior"
              ),
              h(
                "span",
                { className: "pagination-current-badge" },
                `Pág. ${currentPage}`
              ),
              h(
                "button",
                {
                  type: "button",
                  className: "pagination-btn",
                  disabled: !pagination.hasNextPage || currentPage >= pagination.totalPages,
                  onClick: () => setCurrentPage((prev) => Math.min(pagination.totalPages, prev + 1)),
                  title: "Página siguiente"
                },
                "Siguiente →"
              )
            ),
            h(
              "div",
              { className: "alumnos-bottom-actions" },
              h(
                ActionButton,
                {
                  tone: "secondary",
                  icon: "clipboard",
                  onClick: () => alert("Exportando nómina de alumnos filtrada...")
                },
                "Exportar Nómina"
              )
            )
          )
        : null
    )
  );
}
