import React, { useState, useEffect, useCallback } from "react";
import { h, ActionButton, IconoFigma } from "../../layouts/site-layout.js";
import { useUsuarioActual } from "../../estado/index.js";
import { LoadingState, EmptyState, ErrorState } from "../../components/common/state-handlers.js";
import { CustomSelect } from "../../components/common/custom-select.js";
import { paginasVisibles } from "../../components/ui/index.js";
import { StudentsService } from "./students-service.js";
import { BoletinDigitalModal } from "./components/boletin-digital-modal.js";

export default function BoletinesListView() {
  const user = useUsuarioActual();

  // Filtros
  const [studentSearch, setStudentSearch] = useState("");
  const [debouncedStudentSearch, setDebouncedStudentSearch] = useState("");
  const [selectedCurso, setSelectedCurso] = useState("todos");
  const [selectedDivision, setSelectedDivision] = useState("todas");
  const [selectedTurno, setSelectedTurno] = useState("todos");

  // Paginación y datos
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
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

  // Modal de boletín activo
  const [alumnoSeleccionado, setAlumnoSeleccionado] = useState(null);

  // Parsear hash params (ej: #/boletines?curso=7°&div=3)
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

  // Debounce buscador
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedStudentSearch(studentSearch);
      setCurrentPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [studentSearch]);

  // Cargar nómina de alumnos
  const fetchStudents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await StudentsService.getAlumnos({
        q: debouncedStudentSearch,
        curso: selectedCurso,
        division: selectedDivision,
        turno: selectedTurno,
        estado: "activo",
        sortBy: "apellido",
        sortOrder: "asc",
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
      setError(err.message || "Error al cargar la nómina de alumnos.");
    } finally {
      setLoading(false);
    }
  }, [
    debouncedStudentSearch,
    selectedCurso,
    selectedDivision,
    selectedTurno,
    currentPage,
    pageSize
  ]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const handleResetFilters = () => {
    setStudentSearch("");
    setDebouncedStudentSearch("");
    setSelectedCurso("todos");
    setSelectedDivision("todas");
    setSelectedTurno("todos");
    setCurrentPage(1);
    window.location.hash = "#/boletines";
  };

  const isFiltered =
    debouncedStudentSearch.trim() !== "" ||
    selectedCurso !== "todos" ||
    selectedDivision !== "todas" ||
    selectedTurno !== "todos";

  return h(
    "section",
    { className: "welcome-panel boletines-panel" },

    // Header Principal
    h(
      "div",
      { className: "boletines-header-top" },
      h(
        "div",
        { className: "boletines-title-wrap" },
        h(
          "div",
          { className: "boletines-eyebrow" },
          h(
            "svg",
            { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.5" },
            h("path", { d: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20" }),
            h("path", { d: "M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" })
          ),
          "CALIFICACIONES OFICIALES · PBA"
        ),
        h("h1", { className: "boletines-main-title" }, "Boletines Digitales de Calificaciones"),
        h(
          "p",
          { className: "boletines-subtitle" },
          "Consulta, carga de notas por informes valorativos y emisión oficial de boletines de alumnos."
        )
      ),
      h(
        "div",
        { className: "boletines-header-actions" },
        h(
          "button",
          {
            type: "button",
            className: "action-button action-button--primary",
            style: { background: "var(--navy, #222a4c)", borderColor: "var(--navy, #222a4c)" },
            onClick: () => {
              if (students.length > 0) {
                setAlumnoSeleccionado(students[0]);
              }
            },
            title: "Abrir visor de boletín digital con búsqueda directa por DNI"
          },
          h(IconoFigma, { className: "action-button__icon", nombre: "search" }),
          h("span", null, "Ver Boletín por DNI")
        ),
        h(
          "a",
          {
            href: "#/asistencias",
            className: "action-button action-button--secondary",
            title: "Ir al registro de asistencias"
          },
          h(IconoFigma, { className: "action-button__icon", nombre: "clipboard" }),
          h("span", null, "Planilla de Asistencia")
        )
      )
    ),

    // Toolbar de Búsqueda y Filtros
    h(
      "div",
      { className: "boletines-toolbar" },
      // Buscador
      h(
        "div",
        { className: "search-input-wrapper" },
        h(IconoFigma, { className: "search-input-icon", nombre: "search" }),
        h("input", {
          type: "text",
          className: "search-input",
          placeholder: "Buscar alumno (apellido, nombre, DNI)...",
          value: studentSearch,
          onChange: (e) => setStudentSearch(e.target.value),
          "aria-label": "Buscar alumno para boletín"
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
        })
      )
    ),

    // Estado de filtros activos
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
              selectedTurno !== "todos" ? `Turno: ${selectedTurno}` : null
            ]
              .filter(Boolean)
              .join(" • ")}`
          ),
          h(
            "button",
            {
              type: "button",
              className: "clear-all-filters-btn",
              onClick: handleResetFilters
            },
            "Limpiar Filtros"
          )
        )
      : null,

    // Estados de Carga, Error o Vacío
    loading ? h(LoadingState, { message: "Cargando nómina de estudiantes..." }) : null,
    error ? h(ErrorState, { message: error, onRetry: fetchStudents }) : null,

    !loading && !error && students.length === 0
      ? h(EmptyState, {
          mensaje: "No se encontraron alumnos con los filtros seleccionados.",
          accion: isFiltered
            ? h(
                ActionButton,
                {
                  tone: "secondary",
                  onClick: handleResetFilters
                },
                "Restablecer Filtros"
              )
            : null
        })
      : null,

    // Tabla de Alumnos para Boletín
    !loading && !error && students.length > 0
      ? h(
          "div",
          { className: "boletines-table-wrap" },
          h(
            "table",
            { className: "boletines-table" },
            h(
              "thead",
              null,
              h(
                "tr",
                null,
                h("th", null, "Apellido y Nombre"),
                h("th", null, "DNI"),
                h("th", null, "Curso / Div"),
                h("th", null, "Turno"),
                h("th", null, "Condición"),
                h("th", null, "Estado Calificación"),
                h("th", { style: { textAlign: "center" } }, "Acción")
              )
            ),
            h(
              "tbody",
              null,
              students.map((alumno) => {
                const tieneCalificaciones = Boolean(
                  localStorage.getItem(`prece_student_${alumno.id}_boletin_calificaciones`)
                );

                return h(
                  "tr",
                  { key: alumno.id, className: "boletines-row" },
                  h(
                    "td",
                    null,
                    h("strong", { className: "boletin-alumno-name" }, `${alumno.apellido}, ${alumno.nombre}`)
                  ),
                  h("td", { className: "text-muted font-mono" }, alumno.dni),
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
                          alumno.condicion === "Irregular" ? "condicion-tag--libre" : "condicion-tag--regular"
                        }`
                      },
                      alumno.condicion || "Regular"
                    )
                  ),
                  h(
                    "td",
                    null,
                    tieneCalificaciones
                      ? h("span", { className: "boletin-status-pill boletin-status-pill--ready" }, "Calificaciones asentadas")
                      : h("span", { className: "boletin-status-pill boletin-status-pill--pending" }, "Pendiente de carga")
                  ),
                  h(
                    "td",
                    { style: { textAlign: "center" } },
                    h(
                      "button",
                      {
                        type: "button",
                        className: "boletin-btn-open",
                        onClick: () => setAlumnoSeleccionado(alumno),
                        title: `Abrir Boletín Digital de ${alumno.nombre} ${alumno.apellido}`
                      },
                      h(
                        "svg",
                        { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" },
                        h("path", { d: "M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" }),
                        h("path", { d: "M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" })
                      ),
                      "Abrir Boletín"
                    )
                  )
                );
              })
            )
          )
        )
      : null,

    // Paginación Inferior
    !loading && !error && students.length > 0
      ? h(
          "div",
          { className: "alumnos-pagination-row" },
          // Info a la izquierda
          h(
            "div",
            { className: "pagination-info" },
            h("span", { className: "pagination-info-dot" }),
            h(
              "span",
              { className: "pagination-counter-text" },
              h("span", { className: "pagination-text-muted" }, "Página "),
              h("strong", { className: "pagination-text-bold" }, String(pagination.page)),
              h("span", { className: "pagination-text-muted" }, ` de ${pagination.totalPages}`),
              h("span", { className: "pagination-divider" }, "•"),
              h("strong", { className: "pagination-text-bold" }, String(pagination.total)),
              h("span", { className: "pagination-text-muted" }, " alumnos")
            )
          ),

          // Botones navegación
          h(
            "nav",
            { className: "pagination-controls-buttons", "aria-label": "Navegación de páginas" },
            h(
              "button",
              {
                type: "button",
                className: "pagination-nav-btn pagination-nav-btn--prev",
                disabled: !pagination.hasPrevPage || currentPage <= 1,
                onClick: () => setCurrentPage((prev) => Math.max(1, prev - 1)),
                title: "Ir a la página anterior",
                "aria-label": "Página anterior"
              },
              h(
                "svg",
                { className: "pagination-nav-icon", viewBox: "0 0 20 20", fill: "currentColor" },
                h("path", {
                  fillRule: "evenodd",
                  d: "M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z",
                  clipRule: "evenodd"
                })
              ),
              h("span", { className: "pagination-nav-label" }, "Anterior")
            ),
            h(
              "div",
              { className: "pagination-pages-list" },
              paginasVisibles(currentPage, pagination.totalPages, 5).map((num, idx) => {
                if (num === "…") {
                  return h("span", { key: `ellipsis-${idx}`, className: "pagination-ellipsis" }, "…");
                }
                const isActive = num === currentPage;
                return h(
                  "button",
                  {
                    key: `page-${num}`,
                    type: "button",
                    className: `pagination-page-btn ${isActive ? "pagination-page-btn--active" : ""}`,
                    onClick: () => setCurrentPage(num),
                    title: `Ir a la página ${num}`,
                    "aria-current": isActive ? "page" : undefined
                  },
                  String(num)
                );
              })
            ),
            h(
              "button",
              {
                type: "button",
                className: "pagination-nav-btn pagination-nav-btn--next",
                disabled: !pagination.hasNextPage || currentPage >= pagination.totalPages,
                onClick: () => setCurrentPage((prev) => Math.min(pagination.totalPages, prev + 1)),
                title: "Ir a la página siguiente",
                "aria-label": "Página siguiente"
              },
              h("span", { className: "pagination-nav-label" }, "Siguiente"),
              h(
                "svg",
                { className: "pagination-nav-icon", viewBox: "0 0 20 20", fill: "currentColor" },
                h("path", {
                  fillRule: "evenodd",
                  d: "M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z",
                  clipRule: "evenodd"
                })
              )
            )
          ),

          // Selector de cantidad a la derecha
          h(
            "div",
            { className: "alumnos-bottom-actions" },
            h(
              "div",
              { className: "pagination-page-size-selector" },
              h("span", { className: "pagination-size-label" }, "Mostrar:"),
              h(CustomSelect, {
                className: "pagination-custom-select",
                value: String(pageSize),
                dropUp: true,
                onChange: (val) => {
                  setPageSize(Number(val) || 10);
                  setCurrentPage(1);
                },
                options: [
                  { value: "10", label: "10 por pág." },
                  { value: "15", label: "15 por pág." },
                  { value: "20", label: "20 por pág." },
                  { value: "25", label: "25 por pág." },
                  { value: "50", label: "50 por pág." }
                ],
                ariaLabel: "Cantidad de alumnos por página"
              })
            )
          )
        )
      : null,

    // Modal de Boletín Digital Oficial
    alumnoSeleccionado
      ? h(BoletinDigitalModal, {
          abierto: Boolean(alumnoSeleccionado),
          onCerrar: () => setAlumnoSeleccionado(null),
          alumno: alumnoSeleccionado
        })
      : null
  );
}
