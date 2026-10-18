import React, { useState, useEffect, useCallback, useMemo } from "react";
import { h, ActionButton, IconoFigma } from "../../layouts/site-layout.js";
import { useUsuarioActual } from "../../estado/index.js";
import { LoadingState, EmptyState, ErrorState } from "../../components/common/state-handlers.js";
import { CustomSelect } from "../../components/common/custom-select.js";
import { paginasVisibles } from "../../components/ui/index.js";
import { StudentsService } from "./students-service.js";
import { BoletinDigitalModal } from "./components/boletin-digital-modal.js";
import { PlanillaCalificacionesModal } from "../documents/planilla-calificaciones-modal.js";

// Cursos de referencia para la cuenta docente institucional
const ASIGNACIONES_DOCENTE_DEFAULT = [
  { anio: 1, curso: "1°", division: "1", materia: "Matemática I" },
  { anio: 2, curso: "2°", division: "1", materia: "Matemática II" },
  { anio: 3, curso: "3°", division: "3", materia: "Matemática III" }
];

function normalizarAsignacion(asig) {
  const anio = Number(String(asig.anio || asig.curso || "").replace(/\D/g, "")) || 1;
  const division = String(asig.division || "").trim();
  const cursoStr = `${anio}°`;
  return { anio, curso: cursoStr, division, materia: asig.materia || "Matemática" };
}

export default function BoletinesListView() {
  const user = useUsuarioActual();

  const esDocente =
    user?.rol === "docente" ||
    (Array.isArray(user?.roles) &&
      user.roles.includes("docente") &&
      !user.roles.includes("admin") &&
      !user.roles.includes("director") &&
      !user.roles.includes("secretario") &&
      !user.roles.includes("secretaria"));

  const asignacionesDocente = useMemo(() => {
    if (!esDocente) return null;
    const raw =
      user?.assignments && user.assignments.length > 0
        ? user.assignments
        : ASIGNACIONES_DOCENTE_DEFAULT;
    return raw.map(normalizarAsignacion);
  }, [user, esDocente]);

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

  // Modal de boletín / planilla activo
  const [alumnoSeleccionado, setAlumnoSeleccionado] = useState(null);
  const [planillaModalOpen, setPlanillaModalOpen] = useState(false);
  const [califRefreshTick, setCalifRefreshTick] = useState(0);

  // Escuchar actualizaciones de calificaciones para refrescar estados de la tabla
  useEffect(() => {
    const onCalifsActualizadas = () => {
      setCalifRefreshTick((t) => t + 1);
    };
    window.addEventListener("prece:calificaciones-updated", onCalifsActualizadas);
    return () => window.removeEventListener("prece:calificaciones-updated", onCalifsActualizadas);
  }, []);

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

  // Opciones dinámicas para selector de Curso/Año
  const aniosDisponibles = useMemo(() => {
    if (!asignacionesDocente) return [1, 2, 3, 4, 5, 6, 7];
    const setAnios = new Set(asignacionesDocente.map((a) => a.anio).filter(Boolean));
    return Array.from(setAnios).sort((a, b) => a - b);
  }, [asignacionesDocente]);

  const opcionesCurso = useMemo(() => {
    if (!esDocente) {
      return [
        { value: "todos", label: "Todos los Años" },
        { value: "1°", label: "1° Año" },
        { value: "2°", label: "2° Año" },
        { value: "3°", label: "3° Año" },
        { value: "4°", label: "4° Año" },
        { value: "5°", label: "5° Año" },
        { value: "6°", label: "6° Año" },
        { value: "7°", label: "7° Año" }
      ];
    }
    return [
      { value: "todos", label: "Mis cursos asignados" },
      ...aniosDisponibles.map((anio) => ({ value: `${anio}°`, label: `${anio}° Año` }))
    ];
  }, [esDocente, aniosDisponibles]);

  // Opciones dinámicas para selector de División
  const divisionesDisponibles = useMemo(() => {
    if (!esDocente) {
      return [
        { value: "todas", label: "Todas las Div." },
        { value: "1", label: "División 1" },
        { value: "2", label: "División 2" },
        { value: "3", label: "División 3" },
        { value: "4", label: "División 4" },
        { value: "5", label: "División 5" },
        { value: "6", label: "División 6" }
      ];
    }

    let filteredAsigs = asignacionesDocente;
    if (selectedCurso !== "todos") {
      const selAnioNum = Number(String(selectedCurso).replace(/\D/g, ""));
      filteredAsigs = asignacionesDocente.filter((a) => a.anio === selAnioNum);
    }
    const setDivs = new Set(filteredAsigs.map((a) => a.division).filter(Boolean));
    const divsSorted = Array.from(setDivs).sort((a, b) => Number(a) - Number(b));
    return [
      { value: "todas", label: "Todas las Div." },
      ...divsSorted.map((d) => ({ value: d, label: `División ${d}` }))
    ];
  }, [esDocente, asignacionesDocente, selectedCurso]);

  // Cargar nómina de alumnos
  const fetchStudents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (esDocente && asignacionesDocente && asignacionesDocente.length > 0) {
        // Enfoque Docente: acotado estrictamente a los cursos y divisiones asignados al docente
        let cursosAConsultar = [];

        if (selectedCurso !== "todos" && selectedDivision !== "todas") {
          cursosAConsultar = [{ curso: selectedCurso, division: selectedDivision }];
        } else if (selectedCurso !== "todos" && selectedDivision === "todas") {
          const selAnioNum = Number(String(selectedCurso).replace(/\D/g, ""));
          cursosAConsultar = asignacionesDocente
            .filter((a) => a.anio === selAnioNum)
            .map((a) => ({ curso: `${a.anio}°`, division: a.division }));
        } else if (selectedCurso === "todos" && selectedDivision !== "todas") {
          cursosAConsultar = asignacionesDocente
            .filter((a) => a.division === String(selectedDivision).trim())
            .map((a) => ({ curso: `${a.anio}°`, division: a.division }));
        } else {
          // Todos los cursos asignados al docente
          cursosAConsultar = asignacionesDocente.map((a) => ({
            curso: `${a.anio}°`,
            division: a.division
          }));
        }

        // Consultamos en paralelo las nóminas de cada una de sus divisiones
        const respuestas = await Promise.all(
          cursosAConsultar.map((c) =>
            StudentsService.getAlumnos({
              curso: c.curso,
              division: c.division,
              q: debouncedStudentSearch,
              turno: selectedTurno,
              estado: "activo",
              sortBy: "apellido",
              sortOrder: "asc",
              limit: 100
            })
          )
        );

        // Agrupar y asegurar unicidad
        const mapaAlumnos = new Map();
        for (const res of respuestas) {
          for (const alu of res?.data || []) {
            mapaAlumnos.set(alu.id, alu);
          }
        }

        let listaAlumnos = Array.from(mapaAlumnos.values());

        // Ordenar alfabéticamente por apellido y nombre
        listaAlumnos.sort((a, b) => {
          const comp = (a.apellido || "").localeCompare(b.apellido || "");
          if (comp !== 0) return comp;
          return (a.nombre || "").localeCompare(b.nombre || "");
        });

        // Paginación client-side de las divisiones del docente
        const total = listaAlumnos.length;
        const totalPages = Math.max(1, Math.ceil(total / pageSize));
        const paginaValida = Math.min(currentPage, totalPages);
        const offset = (paginaValida - 1) * pageSize;
        const dataPaginada = listaAlumnos.slice(offset, offset + pageSize);

        setStudents(dataPaginada);
        setPagination({
          total,
          page: paginaValida,
          limit: pageSize,
          totalPages,
          hasNextPage: offset + pageSize < total,
          hasPrevPage: paginaValida > 1
        });
      } else {
        // Enfoque general (Administrador, Director, Preceptor, Secretaría)
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
      }
    } catch (err) {
      setError(err.message || "Error al cargar la nómina de alumnos.");
    } finally {
      setLoading(false);
    }
  }, [
    esDocente,
    asignacionesDocente,
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

    // Barra superior con botón volver atrás
    h(
      "div",
      { className: "dashboard-top-bar alumnos-top-nav" },
      h(
        "button",
        {
          type: "button",
          className: "btn-volver-atras",
          onClick: () => {
            if (window.history.length > 1) {
              window.history.back();
            } else {
              window.location.hash = "#/inicio";
            }
          },
          title: "Volver atrás",
          "aria-label": "Volver atrás"
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
            d: "M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z",
            clipRule: "evenodd"
          })
        ),
        h("span", null, "Volver Atrás")
      ),
      h(
        "div",
        { className: "alumnos-top-badges" },
        h("span", { className: "badge-institucion" }, user?.escuela || "E.E.S.T N°1 Monte Grande"),
        h("span", { className: "badge-ciclo" }, `Ciclo Lectivo ${user?.cicloLectivo || 2026}`),
        esDocente
          ? h(
              "span",
              {
                className: "badge-ciclo",
                style: { background: "#eff6ff", color: "#1d4ed8", borderColor: "#bfdbfe" }
              },
              "Vista Docente · Cursos a Cargo"
            )
          : null
      )
    ),

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
          esDocente ? "CALIFICACIONES OFICIALES · PLANILLA DOCENTE PBA" : "CALIFICACIONES OFICIALES · PBA"
        ),
        h(
          "h1",
          { className: "boletines-main-title" },
          esDocente ? "Planilla de Calificaciones" : "Boletines Digitales de Calificaciones"
        ),
        h(
          "p",
          { className: "boletines-subtitle" },
          esDocente
            ? "Consulta y carga oficial de notas por informes valorativos e intensificación para tus cursos a cargo. Las calificaciones se autocompletan directamente en el Boletín Digital de cada estudiante."
            : "Consulta, carga de notas por informes valorativos y emisión oficial de boletines de alumnos."
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
            const nextVal = typeof val === "string" ? val : val?.target?.value;
            setSelectedCurso(nextVal);
            setSelectedDivision("todas");
            setCurrentPage(1);
          },
          options: opcionesCurso
        }),
        h(CustomSelect, {
          label: "División",
          value: selectedDivision,
          onChange: (val) => {
            const nextVal = typeof val === "string" ? val : val?.target?.value;
            setSelectedDivision(nextVal);
            setCurrentPage(1);
          },
          options: divisionesDisponibles
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

    // Banner informativo para el docente con sus cursos a cargo y acceso a la planilla completa
    esDocente && asignacionesDocente
      ? h(
          "div",
          {
            className: "alumnos-filter-status-bar",
            style: {
              background: "#eff6ff",
              border: "1px solid #bfdbfe",
              color: "#1e40af",
              margin: "0 0 16px 0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "10px"
            }
          },
          h(
            "span",
            { className: "filter-status-text" },
            `Cursos Asignados: ${asignacionesDocente
              .map((a) => `${a.curso} ${a.division}° (${a.materia || "Materia"})`)
              .join(" • ")} · Total matrícula asignada: ${pagination.total} estudiante${
              pagination.total === 1 ? "" : "s"
            }`
          ),
          h(
            "button",
            {
              type: "button",
              className: "boletin-btn-open",
              style: { padding: "6px 14px", fontSize: "12.5px" },
              onClick: () => {
                setAlumnoSeleccionado(null);
                setPlanillaModalOpen(true);
              },
              title: "Abrir planilla de calificaciones completa del curso"
            },
            h(
              "svg",
              { width: "15", height: "15", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" },
              h("rect", { x: "3", y: "3", width: "18", height: "18", rx: "2" }),
              h("path", { d: "M3 9h18M9 21V9" })
            ),
            "Abrir Planilla del Curso"
          )
        )
      : null,

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
                    esDocente
                      ? h(
                          "button",
                          {
                            type: "button",
                            className: "boletin-btn-open",
                            onClick: () => {
                              setAlumnoSeleccionado(alumno);
                              setPlanillaModalOpen(true);
                            },
                            title: `Cargar / Ver Planilla de Calificaciones de ${alumno.nombre} ${alumno.apellido}`
                          },
                          h(
                            "svg",
                            { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" },
                            h("rect", { x: "3", y: "3", width: "18", height: "18", rx: "2" }),
                            h("path", { d: "M3 9h18M9 21V9" })
                          ),
                          "Planilla de Calificaciones"
                        )
                      : h(
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

    // Modal de Planilla de Calificaciones Oficial PBA (para Docentes)
    esDocente && planillaModalOpen
      ? h(PlanillaCalificacionesModal, {
          abierto: planillaModalOpen,
          onCerrar: () => {
            setPlanillaModalOpen(false);
            setAlumnoSeleccionado(null);
          },
          alumnoInicial: alumnoSeleccionado,
          cursoInicial: selectedCurso !== "todos" ? selectedCurso : (alumnoSeleccionado?.curso || asignacionesDocente?.[0]?.curso || "1°"),
          divisionInicial: selectedDivision !== "todas" ? selectedDivision : (alumnoSeleccionado?.division || asignacionesDocente?.[0]?.division || "1"),
          materiaInicial: asignacionesDocente?.find((a) => {
            const c = selectedCurso !== "todos" ? selectedCurso : alumnoSeleccionado?.curso;
            const d = selectedDivision !== "todas" ? selectedDivision : alumnoSeleccionado?.division;
            return a.curso === c && String(a.division) === String(d);
          })?.materia || asignacionesDocente?.[0]?.materia || "Matemática",
          estudiantesIniciales: students,
          asignacionesDocente: asignacionesDocente,
          esDocente: true,
          profesorNombre: user?.nombreCompleto || (user?.nombre ? `${user.nombre} ${user.apellido || ""}`.trim() : "Docente Asignado")
        })
      : null,

    // Modal de Boletín Digital Oficial (para Directores, Preceptores, Secretaría)
    !esDocente && alumnoSeleccionado
      ? h(BoletinDigitalModal, {
          abierto: Boolean(alumnoSeleccionado),
          onCerrar: () => setAlumnoSeleccionado(null),
          alumno: alumnoSeleccionado
        })
      : null
  );
}
