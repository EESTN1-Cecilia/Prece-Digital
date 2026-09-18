import React, { useState, useEffect, useCallback, useMemo } from "react";
import { h, ActionButton, IconoFigma } from "../../layouts/site-layout.js";
import { DashboardCard } from "../../components/dashboard/dashboard-card.js";
import { LoadingState, EmptyState, ErrorState, StatusBadge } from "../../components/common/state-handlers.js";
import { CustomSelect } from "../../components/common/custom-select.js";
import { StudentsService } from "./students-service.js";
import { AuthService } from "../../services/auth-service.js";

/**
 * Catálogo institucional de las 27 divisiones de la E.E.S.T N°1 Monte Grande.
 */
const CURSOS_CATALOG = [
  // Ciclo Básico 1° Año
  { id: 1, curso: "1°", division: "1", anio: 1, orientacion: "Ciclo Básico", turnoAula: "Mañana", turnoTaller: "Tarde", cantidad: 31, activos: 30, inactivos: 1 },
  { id: 2, curso: "1°", division: "2", anio: 1, orientacion: "Ciclo Básico", turnoAula: "Mañana", turnoTaller: "Tarde", cantidad: 30, activos: 29, inactivos: 1 },
  { id: 3, curso: "1°", division: "3", anio: 1, orientacion: "Ciclo Básico", turnoAula: "Tarde", turnoTaller: "Mañana", cantidad: 29, activos: 28, inactivos: 1 },
  { id: 4, curso: "1°", division: "4", anio: 1, orientacion: "Ciclo Básico", turnoAula: "Tarde", turnoTaller: "Mañana", cantidad: 32, activos: 31, inactivos: 1 },
  { id: 5, curso: "1°", division: "6", anio: 1, orientacion: "Ciclo Básico", turnoAula: "Mañana", turnoTaller: "Tarde", cantidad: 28, activos: 28, inactivos: 0 },

  // Ciclo Básico 2° Año
  { id: 6, curso: "2°", division: "1", anio: 2, orientacion: "Ciclo Básico", turnoAula: "Mañana", turnoTaller: "Tarde", cantidad: 30, activos: 29, inactivos: 1 },
  { id: 7, curso: "2°", division: "2", anio: 2, orientacion: "Ciclo Básico", turnoAula: "Mañana", turnoTaller: "Tarde", cantidad: 31, activos: 30, inactivos: 1 },
  { id: 8, curso: "2°", division: "3", anio: 2, orientacion: "Ciclo Básico", turnoAula: "Tarde", turnoTaller: "Mañana", cantidad: 28, activos: 27, inactivos: 1 },
  { id: 9, curso: "2°", division: "4", anio: 2, orientacion: "Ciclo Básico", turnoAula: "Tarde", turnoTaller: "Mañana", cantidad: 29, activos: 28, inactivos: 1 },
  { id: 10, curso: "2°", division: "6", anio: 2, orientacion: "Ciclo Básico", turnoAula: "Mañana", turnoTaller: "Tarde", cantidad: 27, activos: 27, inactivos: 0 },

  // Ciclo Básico 3° Año
  { id: 11, curso: "3°", division: "1", anio: 3, orientacion: "Ciclo Básico", turnoAula: "Mañana", turnoTaller: "Tarde", cantidad: 33, activos: 32, inactivos: 1 },
  { id: 12, curso: "3°", division: "2", anio: 3, orientacion: "Ciclo Básico", turnoAula: "Mañana", turnoTaller: "Tarde", cantidad: 30, activos: 30, inactivos: 0 },
  { id: 13, curso: "3°", division: "3", anio: 3, orientacion: "Ciclo Básico", turnoAula: "Tarde", turnoTaller: "Mañana", cantidad: 29, activos: 28, inactivos: 1 },
  { id: 14, curso: "3°", division: "4", anio: 3, orientacion: "Ciclo Básico", turnoAula: "Tarde", turnoTaller: "Mañana", cantidad: 31, activos: 30, inactivos: 1 },
  { id: 15, curso: "3°", division: "6", anio: 3, orientacion: "Ciclo Básico", turnoAula: "Mañana", turnoTaller: "Tarde", cantidad: 28, activos: 27, inactivos: 1 },

  // Ciclo Superior - Técnico en Informática
  { id: 16, curso: "4°", division: "1", anio: 4, orientacion: "Técnico en Informática", turnoAula: "Mañana", turnoTaller: "Tarde", cantidad: 32, activos: 31, inactivos: 1 },
  { id: 17, curso: "4°", division: "2", anio: 4, orientacion: "Técnico en Informática", turnoAula: "Tarde", turnoTaller: "Mañana", cantidad: 30, activos: 29, inactivos: 1 },
  { id: 18, curso: "5°", division: "1", anio: 5, orientacion: "Técnico en Informática", turnoAula: "Mañana", turnoTaller: "Tarde", cantidad: 28, activos: 28, inactivos: 0 },
  { id: 19, curso: "5°", division: "2", anio: 5, orientacion: "Técnico en Informática", turnoAula: "Tarde", turnoTaller: "Mañana", cantidad: 29, activos: 28, inactivos: 1 },
  { id: 20, curso: "6°", division: "1", anio: 6, orientacion: "Técnico en Informática", turnoAula: "Mañana", turnoTaller: "Tarde", cantidad: 26, activos: 25, inactivos: 1 },
  { id: 21, curso: "7°", division: "1", anio: 7, orientacion: "Técnico en Informática", turnoAula: "Mañana", turnoTaller: "Mañana", cantidad: 24, activos: 24, inactivos: 0 },

  // Ciclo Superior - Técnico en Programación
  { id: 22, curso: "4°", division: "3", anio: 4, orientacion: "Técnico en Programación", turnoAula: "Mañana", turnoTaller: "Tarde", cantidad: 31, activos: 30, inactivos: 1 },
  { id: 23, curso: "4°", division: "4", anio: 4, orientacion: "Técnico en Programación", turnoAula: "Tarde", turnoTaller: "Mañana", cantidad: 30, activos: 29, inactivos: 1 },
  { id: 24, curso: "5°", division: "3", anio: 5, orientacion: "Técnico en Programación", turnoAula: "Mañana", turnoTaller: "Tarde", cantidad: 29, activos: 29, inactivos: 0 },
  { id: 25, curso: "5°", division: "4", anio: 5, orientacion: "Técnico en Programación", turnoAula: "Tarde", turnoTaller: "Mañana", cantidad: 27, activos: 26, inactivos: 1 },
  { id: 26, curso: "6°", division: "3", anio: 6, orientacion: "Técnico en Programación", turnoAula: "Mañana", turnoTaller: "Tarde", cantidad: 26, activos: 25, inactivos: 1 },
  { id: 27, curso: "7°", division: "2", anio: 7, orientacion: "Técnico en Programación", turnoAula: "Tarde", turnoTaller: "Tarde", cantidad: 23, activos: 23, inactivos: 0 }
];

function IconAula({ className = "card-info-icon" }) {
  return h(
    "svg",
    {
      className,
      viewBox: "0 0 20 20",
      fill: "currentColor",
      "aria-hidden": "true"
    },
    h("path", {
      d: "M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"
    })
  );
}

function IconTaller({ className = "card-info-icon" }) {
  return h(
    "svg",
    {
      className,
      viewBox: "0 0 20 20",
      fill: "currentColor",
      "aria-hidden": "true"
    },
    h("path", {
      fillRule: "evenodd",
      d: "M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z",
      clipRule: "evenodd"
    })
  );
}

function IconMatricula({ className = "card-info-icon" }) {
  return h(
    "svg",
    {
      className,
      viewBox: "0 0 20 20",
      fill: "currentColor",
      "aria-hidden": "true"
    },
    h("path", {
      d: "M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"
    })
  );
}

export default function AlumnosListView() {
  const [user, setUser] = useState(AuthService.getCurrentUser());

  // Estado del Curso Abierto: si es null, muestra las tarjetas de cursos; si no, muestra los alumnos del curso
  const [openCourse, setOpenCourse] = useState(null); // { curso: "1°", division: "1" } | null

  // Filtros del Directorio de Cursos (Nivel 1)
  const [courseSearch, setCourseSearch] = useState("");
  const [courseFilterCiclo, setCourseFilterCiclo] = useState("todos"); // 'todos' | 'basico' | 'informatica' | 'programacion'
  const [courseFilterAnio, setCourseFilterAnio] = useState("todos"); // 'todos' | '1°' | '2°' ...
  const [courseFilterTurno, setCourseFilterTurno] = useState("todos"); // 'todos' | 'Mañana' | 'Tarde'

  // Filtros del Listado de Alumnos del Curso Abierto (Nivel 2)
  const [viewMode, setViewMode] = useState("table"); // 'table' | 'card'
  const [studentSearch, setStudentSearch] = useState("");
  const [debouncedStudentSearch, setDebouncedStudentSearch] = useState("");
  const [selectedEstado, setSelectedEstado] = useState("todos");
  const [selectedCondicion, setSelectedCondicion] = useState("todas");
  const [selectedTurno, setSelectedTurno] = useState("todos");

  // Ordenamiento y datos de alumnos
  const [sortBy, setSortBy] = useState("apellido");
  const [sortOrder, setSortOrder] = useState("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;

  const [students, setStudents] = useState([]);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 50,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Escuchar cambios de rol globales
  useEffect(() => {
    const handleRoleChanged = (e) => {
      setUser(e.detail);
    };
    window.addEventListener("auth:role_changed", handleRoleChanged);
    return () => window.removeEventListener("auth:role_changed", handleRoleChanged);
  }, []);

  // Sincronizar estado inicial y cambios en el hash URL (#/alumnos?curso=1°&div=1)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash.includes("?")) {
        const queryPart = hash.split("?")[1];
        const params = new URLSearchParams(queryPart);
        const c = params.get("curso");
        const d = params.get("div") || params.get("division");
        if (c && d) {
          setOpenCourse({ curso: c, division: String(d) });
          return;
        }
      }
      setOpenCourse(null);
    };

    handleHashChange();
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  // Debounce para búsqueda de alumnos
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedStudentSearch(studentSearch);
      setCurrentPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [studentSearch]);

  // Cargar alumnos cuando se abre un curso
  const fetchCourseStudents = useCallback(async () => {
    if (!openCourse) {
      setStudents([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await StudentsService.getAlumnos({
        q: debouncedStudentSearch,
        curso: openCourse.curso,
        division: openCourse.division,
        estado: selectedEstado,
        condicion: selectedCondicion,
        turno: selectedTurno,
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
      setError(err.message || "Error al cargar la nómina de alumnos del curso.");
    } finally {
      setLoading(false);
    }
  }, [openCourse, debouncedStudentSearch, selectedEstado, selectedCondicion, selectedTurno, sortBy, sortOrder, currentPage, pageSize]);

  useEffect(() => {
    if (openCourse) {
      fetchCourseStudents();
    }
  }, [openCourse, fetchCourseStudents]);

  // Abrir un curso específico
  const handleOpenCourse = (curso, division) => {
    setOpenCourse({ curso, division: String(division) });
    setStudentSearch("");
    setDebouncedStudentSearch("");
    setSelectedEstado("todos");
    setSelectedCondicion("todas");
    setSelectedTurno("todos");
    setCurrentPage(1);
    window.location.hash = `#/alumnos?curso=${encodeURIComponent(curso)}&div=${encodeURIComponent(division)}`;
  };

  // Volver a la vista de tarjetas de cursos
  const handleBackToCourses = () => {
    setOpenCourse(null);
    setStudentSearch("");
    setDebouncedStudentSearch("");
    window.location.hash = "#/alumnos";
  };

  // Metadatos del curso actualmente abierto
  const activeCourseMeta = useMemo(() => {
    if (!openCourse) return null;
    return CURSOS_CATALOG.find(
      (c) =>
        c.curso.replace("°", "") === openCourse.curso.replace("°", "") &&
        String(c.division) === String(openCourse.division)
    ) || {
      curso: openCourse.curso,
      division: openCourse.division,
      orientacion: parseInt(openCourse.curso, 10) <= 3 ? "Ciclo Básico" : "Ciclo Superior",
      turnoAula: "Mañana",
      turnoTaller: "Tarde",
      cantidad: 30
    };
  }, [openCourse]);

  // Otras divisiones del mismo año (para alternar rápido)
  const peerDivisions = useMemo(() => {
    if (!openCourse) return [];
    return CURSOS_CATALOG.filter(
      (c) => c.curso.replace("°", "") === openCourse.curso.replace("°", "")
    );
  }, [openCourse]);

  // Cursos filtrados para la pantalla de tarjetas (Nivel 1)
  const filteredCourseCards = useMemo(() => {
    return CURSOS_CATALOG.filter((c) => {
      // Filtro por búsqueda de texto
      if (courseSearch.trim()) {
        const q = courseSearch.trim().toLowerCase();
        const matchName = `${c.curso} ${c.division}`.toLowerCase().includes(q);
        const matchFull = `${c.curso} año división ${c.division}`.toLowerCase().includes(q);
        const matchOri = c.orientacion.toLowerCase().includes(q);
        const matchTurno = c.turnoAula.toLowerCase().includes(q) || c.turnoTaller.toLowerCase().includes(q);
        if (!matchName && !matchFull && !matchOri && !matchTurno) return false;
      }

      // Filtro por Ciclo / Orientación
      if (courseFilterCiclo === "basico" && c.orientacion !== "Ciclo Básico") return false;
      if (courseFilterCiclo === "informatica" && !c.orientacion.includes("Informática")) return false;
      if (courseFilterCiclo === "programacion" && !c.orientacion.includes("Programación")) return false;

      // Filtro por Año
      if (courseFilterAnio !== "todos" && c.curso.replace("°", "") !== courseFilterAnio.replace("°", "")) {
        return false;
      }

      // Filtro por Turno
      if (courseFilterTurno !== "todos" && c.turnoAula.toLowerCase() !== courseFilterTurno.toLowerCase()) {
        return false;
      }

      return true;
    });
  }, [courseSearch, courseFilterCiclo, courseFilterAnio, courseFilterTurno]);

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
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

  // =========================================================================
  // RENDER: SI HAY UN CURSO ABIERTO -> VISTA DE ALUMNOS DEL CURSO (NIVEL 2)
  // =========================================================================
  if (openCourse && activeCourseMeta) {
    return h(
      "section",
      { className: "welcome-panel alumnos-panel" },

      // Barra superior con botón para Volver a Cursos
      h(
        "div",
        { className: "dashboard-top-bar alumnos-top-nav" },
        h(
          "button",
          {
            type: "button",
            className: "btn-volver-atras",
            onClick: handleBackToCourses,
            title: "Volver a la selección de cursos",
            "aria-label": "Volver a la selección de cursos"
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
          h("span", null, "Volver a Cursos")
        ),
        h(
          "div",
          { className: "alumnos-top-badges" },
          h("span", { className: "badge-institucion" }, "E.E.S.T N°1"),
          h("span", { className: "badge-ciclo" }, `${activeCourseMeta.curso} ${activeCourseMeta.division}`)
        )
      ),

      // Hero Banner del Curso Abierto
      h(
        "div",
        { className: "course-active-hero-banner" },
        h(
          "div",
          { className: "course-hero-left" },
          h(
            "div",
            { className: "course-hero-badge" },
            `${activeCourseMeta.curso} ${activeCourseMeta.division}`
          ),
          h(
            "div",
            { className: "course-hero-details" },
            h(
              "div",
              { className: "course-hero-title-row" },
              h(
                "h2",
                { className: "course-hero-title" },
                `${activeCourseMeta.curso} Año — División ${activeCourseMeta.division}`
              ),
              h(
                "span",
                { className: "course-hero-orientacion-tag" },
                activeCourseMeta.orientacion
              )
            ),
            h(
              "div",
              { className: "course-hero-chips-row" },
              h(
                "span",
                { className: "course-hero-chip" },
                h(IconAula, { className: "course-hero-chip__icon" }),
                h("span", null, `Aula: Turno ${activeCourseMeta.turnoAula}`)
              ),
              h(
                "span",
                { className: "course-hero-chip" },
                h(IconTaller, { className: "course-hero-chip__icon" }),
                h("span", null, `Taller: Turno ${activeCourseMeta.turnoTaller}`)
              ),
              h(
                "span",
                { className: "course-hero-chip course-hero-chip--highlight" },
                h(IconMatricula, { className: "course-hero-chip__icon" }),
                h("span", null, `Matrícula: ${activeCourseMeta.cantidad} alumnos`)
              )
            )
          )
        ),
        // Selector rápido entre divisiones del mismo año
        peerDivisions.length > 1
          ? h(
              "div",
              { className: "course-hero-peer-switcher" },
              h("span", { className: "peer-switcher-label" }, `Otras div. de ${activeCourseMeta.curso}:`),
              h(
                "div",
                { className: "peer-switcher-buttons" },
                peerDivisions.map((p) =>
                  h(
                    "button",
                    {
                      key: p.id,
                      type: "button",
                      className: `peer-switch-btn ${String(p.division) === String(activeCourseMeta.division) ? "active" : ""}`,
                      onClick: () => handleOpenCourse(p.curso, p.division),
                      title: `Ver alumnos de ${p.curso} ${p.division}`
                    },
                    `Div ${p.division}`
                  )
                )
              )
            )
          : null
      ),

      // Tarjeta principal con la nómina de alumnos del curso
      h(
        DashboardCard,
        {
          title: `Alumnos de ${activeCourseMeta.curso} ${activeCourseMeta.division}`,
          icon: "people",
          className: "dashboard-card--highlight alumnos-main-card",
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
            // Botón Cargar Alumno
            h(
              ActionButton,
              {
                icon: "clipboard",
                tone: "primary",
                onClick: () => {
                  window.location.hash = `#/alumnos/cargar?curso=${encodeURIComponent(activeCourseMeta.curso)}&div=${encodeURIComponent(activeCourseMeta.division)}`;
                }
              },
              "Cargar Alumno"
            )
          )
        },

        // Barra de búsqueda y filtros dentro del curso
        h(
          "div",
          { className: "alumnos-toolbar" },
          // Input de búsqueda
          h(
            "div",
            { className: "search-input-wrapper" },
            h(IconoFigma, { className: "search-input-icon", nombre: "search" }),
            h("input", {
              type: "text",
              className: "search-input",
              placeholder: `Buscar alumnos en ${activeCourseMeta.curso} ${activeCourseMeta.division} (apellido, nombre, DNI)...`,
              value: studentSearch,
              onChange: (e) => setStudentSearch(e.target.value),
              "aria-label": "Buscar alumno en este curso"
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

          // Filtros
          h(
            "div",
            { className: "filters-group" },
            h(CustomSelect, {
              label: "Estado",
              value: selectedEstado,
              onChange: (val) => setSelectedEstado(typeof val === "string" ? val : val?.target?.value),
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
              onChange: (val) => setSelectedCondicion(typeof val === "string" ? val : val?.target?.value),
              options: [
                { value: "todas", label: "Todas las Condiciones" },
                { value: "Regular", label: "Regular" },
                { value: "Libre", label: "Libre" }
              ]
            })
          )
        ),

        // Estado de Carga
        loading ? h(LoadingState, { mensaje: `Cargando alumnos de ${activeCourseMeta.curso} ${activeCourseMeta.division}...` }) : null,

        // Estado de Error
        error ? h(ErrorState, { mensaje: error, onRetry: fetchCourseStudents }) : null,

        // Estado Sin Resultados
        !loading && !error && students.length === 0
          ? h(EmptyState, {
              mensaje: studentSearch
                ? `No se encontraron alumnos coincidentes con "${studentSearch}" en este curso.`
                : `No hay alumnos registrados en ${activeCourseMeta.curso} ${activeCourseMeta.division}.`,
              action: studentSearch
                ? h(
                    "button",
                    {
                      type: "button",
                      className: "action-button action-button--secondary",
                      onClick: () => {
                        setStudentSearch("");
                        setDebouncedStudentSearch("");
                      }
                    },
                    "Limpiar Búsqueda"
                  )
                : null
            })
          : null,

        // Listado de Alumnos del Curso
        !loading && !error && students.length > 0
          ? viewMode === "table"
            ? // 1. Tabla de Alumnos del Curso
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
                          title: "Curso y División"
                        },
                        "Curso / Div"
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
                        h("td", null, alumno.turno || activeCourseMeta.turnoAula),
                        h(
                          "td",
                          null,
                          h(
                            "span",
                            {
                              className: `condicion-tag ${alumno.condicion === "Libre" ? "condicion-tag--libre" : "condicion-tag--regular"}`
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
            : // 2. Tarjetas de Alumnos del Curso
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
                        h("span", { className: "info-label" }, "Condición:"),
                        h("strong", null, alumno.condicion || "Regular")
                      ),
                      h(
                        "div",
                        { className: "student-mini-card__info-row" },
                        h("span", { className: "info-label" }, "Turno:"),
                        h("span", null, alumno.turno || activeCourseMeta.turnoAula)
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

        // Barra inferior del curso
        h(
          "div",
          { className: "alumnos-pagination-row" },
          h(
            "span",
            { className: "pagination-counter-text" },
            `Mostrando ${students.length} de ${activeCourseMeta.cantidad} alumnos registrados en este curso`
          ),
          h(
            "div",
            { className: "alumnos-bottom-actions" },
            h(
              "button",
              {
                type: "button",
                className: "btn-volver-atras btn-volver-atras--bottom",
                onClick: handleBackToCourses,
                title: "Volver al listado de cursos"
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
              h("span", null, "Volver a Cursos")
            ),
            h(
              ActionButton,
              {
                tone: "primary",
                icon: "clipboard",
                onClick: () => alert(`Exportando nómina de ${activeCourseMeta.curso} ${activeCourseMeta.division}...`)
              },
              "Exportar Nómina"
            ),
            h(
              ActionButton,
              {
                tone: "secondary",
                icon: "filter",
                onClick: () => alert(`Generando planilla de asistencia de ${activeCourseMeta.curso} ${activeCourseMeta.division}...`)
              },
              "Planilla de Asistencia"
            )
          )
        )
      )
    );
  }

  // =========================================================================
  // RENDER: VISTA PRINCIPAL -> CATÁLOGO DE TARJETAS POR CURSO (NIVEL 1)
  // =========================================================================
  return h(
    "section",
    { className: "welcome-panel alumnos-panel" },

    // Barra superior
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
        h("span", { className: "badge-institucion" }, "E.E.S.T N°1 Monte Grande"),
        h("span", { className: "badge-ciclo" }, "Ciclo Lectivo 2026")
      )
    ),

    // Tarjeta principal del Directorio de Cursos
    h(
      DashboardCard,
      {
        title: "Cursos y Divisiones",
        icon: "people",
        className: "dashboard-card--highlight alumnos-main-card",
        collapsible: false,
        actions: h(
          "div",
          { className: "alumnos-header-actions" },
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

      // Subcard con filtros y cuadrícula de tarjetas de cursos
      h(
        "div",
        { className: "courses-directory-section" },

        // Barra de búsqueda y filtros rápidos de cursos
        h(
          "div",
          { className: "courses-directory-toolbar" },
          // Buscador de cursos
          h(
            "div",
            { className: "search-input-wrapper" },
            h(IconoFigma, { className: "search-input-icon", nombre: "search" }),
            h("input", {
              type: "text",
              className: "search-input",
              placeholder: "Buscar curso o división (ej: 1° 1, 4° Año, Programación)...",
              value: courseSearch,
              onChange: (e) => setCourseSearch(e.target.value),
              "aria-label": "Buscar curso o división"
            }),
            courseSearch
              ? h(
                  "button",
                  {
                    type: "button",
                    className: "search-clear-btn",
                    onClick: () => setCourseSearch(""),
                    "aria-label": "Limpiar búsqueda"
                  },
                  "✕"
                )
              : null
          ),

          // Filtros de ciclo / orientación
          h(
            "div",
            { className: "course-ciclo-pills" },
            [
              { id: "todos", label: "Todos los Cursos (27)" },
              { id: "basico", label: "Ciclo Básico (15)" },
              { id: "informatica", label: "Informática (6)" },
              { id: "programacion", label: "Programación (6)" }
            ].map((pill) =>
              h(
                "button",
                {
                  key: pill.id,
                  type: "button",
                  className: `course-filter-pill ${courseFilterCiclo === pill.id ? "active" : ""}`,
                  onClick: () => setCourseFilterCiclo(pill.id)
                },
                pill.label
              )
            )
          )
        ),

        // Filtros por Año y Turno
        h(
          "div",
          { className: "courses-secondary-filters" },
          h(
            "div",
            { className: "courses-year-pills" },
            h("span", { className: "filter-mini-label" }, "AÑO:"),
            ["todos", "1°", "2°", "3°", "4°", "5°", "6°", "7°"].map((anio) =>
              h(
                "button",
                {
                  key: anio,
                  type: "button",
                  className: `course-year-filter-btn ${courseFilterAnio === anio ? "active" : ""}`,
                  onClick: () => setCourseFilterAnio(anio)
                },
                anio === "todos" ? "Todos" : `${anio}`
              )
            )
          ),
          h(
            "div",
            { className: "courses-turno-pills" },
            h("span", { className: "filter-mini-label" }, "TURNO:"),
            ["todos", "Mañana", "Tarde"].map((turno) =>
              h(
                "button",
                {
                  key: turno,
                  type: "button",
                  className: `course-turno-filter-btn ${courseFilterTurno === turno ? "active" : ""}`,
                  onClick: () => setCourseFilterTurno(turno)
                },
                turno.charAt(0).toUpperCase() + turno.slice(1)
              )
            )
          )
        ),

        // Mensaje cuando no hay cursos coincidentes con los filtros
        filteredCourseCards.length === 0
          ? h(EmptyState, {
              mensaje: "No se encontraron cursos coincidentes con los criterios de búsqueda seleccionados.",
              action: h(
                "button",
                {
                  type: "button",
                  className: "action-button action-button--secondary",
                  onClick: () => {
                    setCourseSearch("");
                    setCourseFilterCiclo("todos");
                    setCourseFilterAnio("todos");
                    setCourseFilterTurno("todos");
                  }
                },
                "Restablecer Filtros"
              )
            })
          : null,

        // Cuadrícula de Tarjetas por Curso
        filteredCourseCards.length > 0
          ? h(
              "div",
              { className: "course-cards-directory-grid" },
              filteredCourseCards.map((cursoItem) => {
                const orientacionLimpia = cursoItem.orientacion.replace(/^Técnico en\s+/i, "");
                return h(
                  "div",
                  {
                    key: cursoItem.id,
                    className: "course-directory-card",
                    onClick: () => handleOpenCourse(cursoItem.curso, cursoItem.division),
                    title: `Abrir nómina de ${cursoItem.curso} ${cursoItem.division}`,
                    role: "button",
                    tabIndex: 0,
                    onKeyDown: (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        handleOpenCourse(cursoItem.curso, cursoItem.division);
                      }
                    }
                  },
                  // Encabezado de la Tarjeta del Curso
                  h(
                    "div",
                    { className: "course-directory-card__header" },
                    h(
                      "div",
                      { className: "course-directory-card__badge" },
                      `${cursoItem.curso} ${cursoItem.division}`
                    ),
                    h(
                      "span",
                      {
                        className: `course-directory-card__tag ${
                          cursoItem.orientacion === "Ciclo Básico"
                            ? "tag--basico"
                            : cursoItem.orientacion.includes("Informática")
                            ? "tag--informatica"
                            : "tag--programacion"
                        }`
                      },
                      orientacionLimpia
                    )
                  ),

                  // Título y detalles
                  h(
                    "div",
                    { className: "course-directory-card__body" },
                    h(
                      "h3",
                      { className: "course-directory-card__title" },
                      `${cursoItem.curso} Año — División ${cursoItem.division}`
                    ),
                    h(
                      "div",
                      { className: "course-directory-card__info-row" },
                      h(IconAula, { className: "card-info-icon" }),
                      h("span", { className: "card-info-text" }, `Aula: Turno ${cursoItem.turnoAula}`)
                    ),
                    h(
                      "div",
                      { className: "course-directory-card__info-row" },
                      h(IconTaller, { className: "card-info-icon" }),
                      h("span", { className: "card-info-text" }, `Taller: Turno ${cursoItem.turnoTaller}`)
                    )
                  ),

                  // Pie de la tarjeta con total de alumnos y botón de acción
                  h(
                    "div",
                    { className: "course-directory-card__footer" },
                    h(
                      "div",
                      { className: "course-directory-card__matricula" },
                      h(IconMatricula, { className: "card-matricula-icon" }),
                      h("strong", null, cursoItem.cantidad),
                      h("span", null, "alumnos")
                    ),
                    h(
                      "button",
                      {
                        type: "button",
                        className: "btn-open-course",
                        onClick: (e) => {
                          e.stopPropagation();
                          handleOpenCourse(cursoItem.curso, cursoItem.division);
                        }
                      },
                      "Ver Alumnos ➔"
                    )
                  )
                );
              })
            )
          : null
      )
    )
  );
}
