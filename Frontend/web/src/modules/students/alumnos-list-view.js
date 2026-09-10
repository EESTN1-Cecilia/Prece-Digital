import React, { useState, useEffect, useCallback, useMemo } from "react";
import { h, ActionButton, IconoFigma } from "../../layouts/site-layout.js";
import { DashboardCard } from "../../components/dashboard/dashboard-card.js";
import { LoadingState, EmptyState, ErrorState, StatusBadge } from "../../components/common/state-handlers.js";
import { CustomSelect } from "../../components/common/custom-select.js";
import { StudentsService } from "./students-service.js";
import { AuthService } from "../../services/auth-service.js";

export default function AlumnosListView() {
  const [user, setUser] = useState(AuthService.getCurrentUser());
  const [viewMode, setViewMode] = useState("table"); // 'table' | 'card'

  // Parámetros de consulta y filtros
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedCurso, setSelectedCurso] = useState("todos");
  const [selectedDivision, setSelectedDivision] = useState("todos");
  const [selectedEstado, setSelectedEstado] = useState("todos");
  const [selectedTurno, setSelectedTurno] = useState("todos");
  const [selectedCondicion, setSelectedCondicion] = useState("todas");

  // Ordenamiento y paginación
  const [sortBy, setSortBy] = useState("apellido");
  const [sortOrder, setSortOrder] = useState("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Estado de datos
  const [students, setStudents] = useState([]);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Escuchar cambios de rol globales
  useEffect(() => {
    const handleRoleChanged = (e) => {
      setUser(e.detail);
    };
    window.addEventListener("auth:role_changed", handleRoleChanged);
    return () => window.removeEventListener("auth:role_changed", handleRoleChanged);
  }, []);

  // Extraer parámetros iniciales desde la URL (ej: #/alumnos?curso=1°&div=1)
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("?")) {
      const queryPart = hash.split("?")[1];
      const params = new URLSearchParams(queryPart);
      if (params.has("curso")) setSelectedCurso(params.get("curso"));
      if (params.has("div") || params.has("division")) {
        setSelectedDivision(params.get("div") || params.get("division"));
      }
      if (params.has("estado")) setSelectedEstado(params.get("estado"));
      if (params.has("q")) {
        setSearchQuery(params.get("q"));
        setDebouncedSearch(params.get("q"));
      }
    }
  }, []);

  // Debounce para la búsqueda (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1); // Reiniciar a página 1 al cambiar búsqueda
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Carga de alumnos desde la API
  const fetchStudents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await StudentsService.getAlumnos({
        q: debouncedSearch,
        curso: selectedCurso,
        division: selectedDivision,
        estado: selectedEstado,
        turno: selectedTurno,
        condicion: selectedCondicion,
        sortBy,
        sortOrder,
        page: currentPage,
        limit: pageSize
      });

      setStudents(res.data || []);
      setPagination(res.pagination || {
        total: res.data?.length || 0,
        page: currentPage,
        limit: pageSize,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false
      });
    } catch (err) {
      setError(err.message || "Error al consultar la lista de alumnos desde el servidor.");
    } finally {
      setLoading(false);
    }
  }, [
    debouncedSearch,
    selectedCurso,
    selectedDivision,
    selectedEstado,
    selectedTurno,
    selectedCondicion,
    sortBy,
    sortOrder,
    currentPage
  ]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  // Controladores de cambio de filtro (resetean página a 1)
  const handleCursoChange = (val) => {
    setSelectedCurso(typeof val === "string" ? val : val?.target?.value);
    setCurrentPage(1);
  };

  const handleDivisionChange = (val) => {
    setSelectedDivision(typeof val === "string" ? val : val?.target?.value);
    setCurrentPage(1);
  };

  const handleEstadoChange = (val) => {
    setSelectedEstado(typeof val === "string" ? val : val?.target?.value);
    setCurrentPage(1);
  };

  const handleTurnoChange = (val) => {
    setSelectedTurno(typeof val === "string" ? val : val?.target?.value);
    setCurrentPage(1);
  };

  const handleCondicionChange = (val) => {
    setSelectedCondicion(typeof val === "string" ? val : val?.target?.value);
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setDebouncedSearch("");
    setSelectedCurso("todos");
    setSelectedDivision("todos");
    setSelectedEstado("todos");
    setSelectedTurno("todos");
    setSelectedCondicion("todas");
    setCurrentPage(1);
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
    setCurrentPage(1);
  };

  const handleSwitchRole = (newRole) => {
    const updatedUser = AuthService.switchRole(newRole);
    setUser(updatedUser);
  };

  // Listado de filtros activos para los chips
  const activeFilters = useMemo(() => {
    const filters = [];
    if (debouncedSearch) {
      filters.push({
        id: "q",
        label: `Búsqueda: "${debouncedSearch}"`,
        onRemove: () => {
          setSearchQuery("");
          setDebouncedSearch("");
        }
      });
    }
    if (selectedCurso !== "todos") {
      filters.push({
        id: "curso",
        label: `Curso: ${selectedCurso}`,
        onRemove: () => setSelectedCurso("todos")
      });
    }
    if (selectedDivision !== "todos") {
      filters.push({
        id: "division",
        label: `División: ${selectedDivision}`,
        onRemove: () => setSelectedDivision("todos")
      });
    }
    if (selectedEstado !== "todos") {
      filters.push({
        id: "estado",
        label: `Estado: ${selectedEstado}`,
        onRemove: () => setSelectedEstado("todos")
      });
    }
    if (selectedTurno !== "todos") {
      filters.push({
        id: "turno",
        label: `Turno: ${selectedTurno}`,
        onRemove: () => setSelectedTurno("todos")
      });
    }
    if (selectedCondicion !== "todas") {
      filters.push({
        id: "condicion",
        label: `Condición: ${selectedCondicion}`,
        onRemove: () => setSelectedCondicion("todas")
      });
    }
    return filters;
  }, [debouncedSearch, selectedCurso, selectedDivision, selectedEstado, selectedTurno, selectedCondicion]);

  const hasActiveFilters = activeFilters.length > 0;

  // Renderizador de flecha de orden en tabla
  const renderSortIndicator = (field) => {
    if (sortBy !== field) {
      return h("span", { className: "sort-icon sort-icon--inactive" }, " ⬍");
    }
    return h("span", { className: "sort-icon sort-icon--active" }, sortOrder === "asc" ? " ▲" : " ▼");
  };

  // Cálculo de rango de resultados mostrado (Ej: "Mostrando 1 a 10 de 30 alumnos")
  const startRange = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
  const endRange = Math.min(pagination.page * pagination.limit, pagination.total);

  return h(
    "section",
    { className: "welcome-panel alumnos-panel" },

    // Barra superior con botón Volver y datos institucionales (sin el switch de rol)
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
      
    ),

    // Contenedor principal "Listado de Alumnos"
    h(
      DashboardCard,
      {
        title: "Listado de Alumnos",
        icon: "people",
        className: "dashboard-card--highlight alumnos-main-card",
        collapsible: false
      },

      // Subcontenedor "Listado" con controles de búsqueda, filtros y cambio de vista
      h(
        DashboardCard,
        {
          title: "Listado",
          icon: "filter",
          className: "alumnos-subcard",
          actions: h(
            "div",
            { className: "alumnos-header-actions" },
            // Switch de Vista: Tarjetas vs Tabla (diseño compacto de la referencia)
            h(
              "div",
              { className: "view-mode-toggle", role: "group", "aria-label": "Modo de visualización" },
              h(
                "button",
                {
                  type: "button",
                  className: `view-mode-btn ${viewMode === "card" ? "active" : ""}`,
                  onClick: () => setViewMode("card"),
                  title: "Vista en cuadrícula de tarjetas",
                  "aria-label": "Vista en cuadrícula de tarjetas",
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
              ),
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
              )
            ),
            // Botón de Cargar Alumno
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

        // Barra de Búsqueda y Filtros
        h(
          "div",
          { className: "alumnos-toolbar" },
          // Input de búsqueda
          h(
            "div",
            { className: "search-input-wrapper" },
            h("input", {
              type: "text",
              className: "search-input",
              placeholder: "Ingrese apellido, nombre o DNI....",
              value: searchQuery,
              onChange: (e) => setSearchQuery(e.target.value),
              "aria-label": "Buscar por apellido, nombre o DNI"
            }),
            searchQuery
              ? h(
                  "button",
                  {
                    type: "button",
                    className: "search-clear-btn",
                    onClick: () => {
                      setSearchQuery("");
                      setDebouncedSearch("");
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

            // Filtro Curso
            h(CustomSelect, {
              label: "Curso",
              value: selectedCurso,
              onChange: handleCursoChange,
              options: [
                { value: "todos", label: "Todos los Cursos" },
                { value: "1°", label: "1° Año" },
                { value: "2°", label: "2° Año" },
                { value: "3°", label: "3° Año" },
                { value: "4°", label: "4° Año" },
                { value: "5°", label: "5° Año" },
                { value: "6°", label: "6° Año" },
                { value: "7°", label: "7° Año" }
              ]
            }),

            // Filtro División
            h(CustomSelect, {
              label: "División",
              value: selectedDivision,
              onChange: handleDivisionChange,
              options: [
                { value: "todos", label: "Todas las Divisiones" },
                { value: "1", label: "División 1" },
                { value: "2", label: "División 2" },
                { value: "3", label: "División 3" },
                { value: "4", label: "División 4" },
                { value: "6", label: "División 6" }
              ]
            }),

            // Filtro Estado
            h(CustomSelect, {
              label: "Estado",
              value: selectedEstado,
              onChange: handleEstadoChange,
              options: [
                { value: "todos", label: "Todos los Estados" },
                { value: "Activo", label: "Activo" },
                { value: "Inactivo", label: "Inactivo" },
                { value: "Pase pendiente", label: "Pase pendiente" }
              ]
            }),

            // Filtro Turno
            h(CustomSelect, {
              label: "Turno",
              value: selectedTurno,
              onChange: handleTurnoChange,
              options: [
                { value: "todos", label: "Todos los Turnos" },
                { value: "Mañana", label: "Turno Mañana" },
                { value: "Tarde", label: "Turno Tarde" }
              ]
            }),

            // Filtro Condición
            h(CustomSelect, {
              label: "Condición",
              value: selectedCondicion,
              onChange: handleCondicionChange,
              options: [
                { value: "todas", label: "Todas las Condiciones" },
                { value: "Regular", label: "Regular" },
                { value: "Libre", label: "Libre" }
              ]
            })
          )
        ),

        // Barra de Filtros Activos
        hasActiveFilters
          ? h(
              "div",
              { className: "active-filters-bar" },
              h("span", { className: "active-filters-label" }, "Filtros activos:"),
              h(
                "div",
                { className: "active-filters-list" },
                activeFilters.map((f) =>
                  h(
                    "span",
                    { key: f.id, className: "active-filter-chip" },
                    f.label,
                    h(
                      "button",
                      {
                        type: "button",
                        className: "active-filter-chip__remove",
                        onClick: f.onRemove,
                        title: "Quitar este filtro"
                      },
                      "×"
                    )
                  )
                ),
                h(
                  "button",
                  {
                    type: "button",
                    className: "clear-all-filters-btn",
                    onClick: handleResetFilters
                  },
                  "Limpiar filtros"
                )
              )
            )
          : null,

        // Estado de Carga
        loading ? h(LoadingState, { mensaje: "Cargando padrón de alumnos..." }) : null,

        // Estado de Error
        error ? h(ErrorState, { mensaje: error, onRetry: fetchStudents }) : null,

        // Estado Sin Resultados
        !loading && !error && students.length === 0
          ? h(EmptyState, {
              mensaje: hasActiveFilters
                ? "No se encontraron alumnos coincidentes con los filtros seleccionados."
                : "No hay alumnos registrados en el sistema.",
              action: hasActiveFilters
                ? h(
                    "button",
                    {
                      type: "button",
                      className: "action-button action-button--secondary",
                      onClick: handleResetFilters
                    },
                    "Limpiar Criterios de Búsqueda"
                  )
                : null
            })
          : null,

        // Contenido de Alumnos (Tabla o Tarjetas)
        !loading && !error && students.length > 0
          ? viewMode === "table"
            ? // 1. Vista de Tabla
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
                          title: "Ordenar por Curso"
                        },
                        "Curso",
                        renderSortIndicator("curso")
                      ),
                      h(
                        "th",
                        {
                          onClick: () => handleSort("division"),
                          className: "sortable-th",
                          title: "Ordenar por División"
                        },
                        "División",
                        renderSortIndicator("division")
                      ),
                      h(
                        "th",
                        {
                          onClick: () => handleSort("turno"),
                          className: "sortable-th",
                          title: "Ordenar por Turno"
                        },
                        "Turno",
                        renderSortIndicator("turno")
                      ),
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
                        h("td", null, h("span", { className: "curso-badge" }, alumno.curso)),
                        h("td", null, alumno.division),
                        h("td", null, alumno.turno),
                        h(
                          "td",
                          null,
                          h(StatusBadge, {
                            status: alumno.estado === "Activo" ? "success" : alumno.estado === "Pase pendiente" ? "warning" : "danger",
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
                                className: "table-action-link",
                                title: `Ver ficha de ${alumno.nombre}`
                              },
                              "Ver"
                            ),
                            h("span", { className: "action-separator" }, "|"),
                            h(
                              "button",
                              {
                                type: "button",
                                className: "table-action-btn",
                                onClick: () => alert(`Editar datos de ${alumno.apellido}, ${alumno.nombre}`),
                                title: `Editar alumno ${alumno.nombre}`
                              },
                              "Editar"
                            )
                          )
                        )
                      )
                    )
                  )
                )
              )
            : // 2. Vista de Tarjetas (Switch solicitado por el usuario)
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
                        status: alumno.estado === "Activo" ? "success" : alumno.estado === "Pase pendiente" ? "warning" : "danger",
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
                        h("span", { className: "info-label" }, "Curso/Div:"),
                        h("strong", null, `${alumno.curso} ${alumno.division} (${alumno.turno})`)
                      ),
                      alumno.orientacion && alumno.orientacion !== "Ciclo Básico"
                        ? h(
                            "div",
                            { className: "student-mini-card__info-row" },
                            h("span", { className: "info-label" }, "Orientación:"),
                            h("span", { className: "orientation-tag" }, alumno.orientacion)
                          )
                        : null
                    ),
                    h(
                      "div",
                      { className: "student-mini-card__actions" },
                      h(
                        "a",
                        {
                          href: `#/alumnos/${alumno.id}`,
                          className: "action-button action-button--primary student-card-btn"
                        },
                        h(IconoFigma, { className: "action-button__icon", nombre: "user-search" }),
                        h("span", null, "Ver Ficha")
                      ),
                      h(
                        "button",
                        {
                          type: "button",
                          className: "action-button action-button--secondary student-card-btn",
                          onClick: () => alert(`Editar datos de ${alumno.apellido}, ${alumno.nombre}`)
                        },
                        h("span", null, "Editar")
                      )
                    )
                  )
                )
              )
          : null,

        // Paginación (Mostrando X de Y alumnos + Botones Anterior / Siguiente)
        h(
          "div",
          { className: "alumnos-pagination-row" },
          h(
            "span",
            { className: "pagination-counter-text" },
            pagination.total > 0
              ? `Mostrando ${startRange} a ${endRange} de ${pagination.total} alumnos`
              : "Mostrando 0 de 0 alumnos"
          ),
          h(
            "div",
            { className: "pagination-controls" },
            h(
              "button",
              {
                type: "button",
                className: "pagination-btn",
                disabled: !pagination.hasPrevPage || loading,
                onClick: () => setCurrentPage((p) => Math.max(1, p - 1)),
                "aria-label": "Página anterior"
              },
              "▼ Anterior"
            ),
            h(
              "span",
              { className: "pagination-page-indicator" },
              `Página ${pagination.page} de ${pagination.totalPages}`
            ),
            h(
              "button",
              {
                type: "button",
                className: "pagination-btn",
                disabled: !pagination.hasNextPage || loading,
                onClick: () => setCurrentPage((p) => p + 1),
                "aria-label": "Página siguiente"
              },
              "▼ Siguiente"
            )
          )
        ),

        // Botones inferiores de acción (Volver, Exportar, Planilla, Plantillas según Mockup)
        h(
          "div",
          { className: "alumnos-bottom-actions" },
          h(
            "button",
            {
              type: "button",
              className: "btn-volver-atras btn-volver-atras--bottom",
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
            h("span", null, "Volver")
          ),
          h(
            ActionButton,
            {
              tone: "primary",
              icon: "clipboard",
              onClick: () => alert("Exportando padrón de alumnos a Excel / CSV...")
            },
            "Exportar"
          ),
          h(
            ActionButton,
            {
              tone: "secondary",
              icon: "filter",
              onClick: () => alert("Generando planilla institucional...")
            },
            "Planilla"
          ),
          h(
            ActionButton,
            {
              tone: "primary",
              icon: "clipboard",
              onClick: () => alert("Plantillas institucionales de Secretaría...")
            },
            "Plantillas"
          )
        )
      )
    )
  );
}
