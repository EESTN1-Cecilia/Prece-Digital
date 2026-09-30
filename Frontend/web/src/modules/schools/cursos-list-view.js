import React, { useState, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { h, ActionButton, IconoFigma } from "../../layouts/site-layout.js";
import { DashboardCard } from "../../components/dashboard/dashboard-card.js";
import { LoadingState, EmptyState, ErrorState } from "../../components/common/state-handlers.js";
import { CustomSelect } from "../../components/common/custom-select.js";
import { StudentsService } from "../students/students-service.js";

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

function IconPlus({ className = "btn-plus-icon" }) {
  return h(
    "svg",
    {
      className,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "2.5",
      strokeLinecap: "round",
      strokeLinejoin: "round",
      "aria-hidden": "true"
    },
    h("line", { x1: "12", y1: "5", x2: "12", y2: "19" }),
    h("line", { x1: "5", y1: "12", x2: "19", y2: "12" })
  );
}

/**
 * Modal para el alta de un nuevo curso y división
 */
function CargarCursoModal({ abierto, onCerrar, onGuardar }) {
  const [curso, setCurso] = useState("1°");
  const [division, setDivision] = useState("1");
  const [turnoAula, setTurnoAula] = useState("Mañana");
  const [turnoTaller, setTurnoTaller] = useState("Tarde");
  const [orientacion, setOrientacion] = useState("Ciclo Básico");
  const [capacidad, setCapacidad] = useState(30);
  const [preceptor, setPreceptor] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [mensajeExito, setMensajeExito] = useState("");

  // Actualizar orientación recomendada según el año seleccionado
  useEffect(() => {
    const numAnio = parseInt(curso.replace("°", ""), 10);
    if (numAnio <= 3) {
      setOrientacion("Ciclo Básico");
    } else if (orientacion === "Ciclo Básico") {
      setOrientacion("Técnico en Informática");
    }
  }, [curso]);

  useEffect(() => {
    if (!abierto) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && !guardando && onCerrar) {
        onCerrar();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [abierto, guardando, onCerrar]);

  if (!abierto) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setGuardando(true);

    const nuevoCurso = {
      id: `curso-${Date.now()}`,
      curso: curso.includes("°") ? curso : `${curso}°`,
      division: String(division),
      orientacion,
      turnoAula,
      turnoTaller,
      cantidad: 0,
      capacidad: Number(capacidad) || 30,
      preceptor: preceptor.trim() || null
    };

    setTimeout(() => {
      onGuardar(nuevoCurso);
      setGuardando(false);
      setMensajeExito(`¡Curso ${nuevoCurso.curso} ${nuevoCurso.division} registrado correctamente!`);
      setTimeout(() => {
        setMensajeExito("");
        onCerrar();
      }, 1200);
    }, 400);
  };

  const modalContent = h(
    "div",
    {
      className: "modal-backdrop",
      onClick: (e) => {
        if (e.target === e.currentTarget && !guardando) onCerrar();
      }
    },
    h(
      "div",
      { className: "modal-card modal-cargar-curso", role: "dialog", "aria-labelledby": "modal-curso-title" },
      h(
        "div",
        { className: "modal-header" },
        h(
          "div",
          { className: "modal-header-title-wrap" },
          h(
            "div",
            { className: "modal-header-icon-box" },
            h(IconoFigma, { nombre: "academic" })
          ),
          h(
            "div",
            null,
            h("h3", { id: "modal-curso-title", className: "modal-title" }, "Cargar Nuevo Curso y División"),
            h("p", { className: "modal-subtitle" }, "Registrar una nueva división institucional para el ciclo lectivo")
          )
        ),
        h(
          "button",
          {
            type: "button",
            className: "modal-close-btn",
            onClick: onCerrar,
            disabled: guardando,
            "aria-label": "Cerrar modal"
          },
          "✕"
        )
      ),

      mensajeExito
        ? h(
            "div",
            { className: "modal-success-banner" },
            h("span", { className: "modal-success-icon" }, "✓"),
            h("strong", null, mensajeExito)
          )
        : h(
            "form",
            { onSubmit: handleSubmit, className: "modal-form" },
            h(
              "div",
              { className: "modal-form-grid" },
              // Campo Año
              h(
                "div",
                { className: "form-group" },
                h("label", { className: "form-label", htmlFor: "curso-anio" }, "Año / Nivel:", h("span", { className: "required-star" }, " *")),
                h(CustomSelect, {
                  id: "curso-anio",
                  value: curso,
                  options: ["1°", "2°", "3°", "4°", "5°", "6°", "7°"].map((a) => ({
                    value: a,
                    label: `${a} Año`
                  })),
                  onChange: (val) => setCurso(val),
                  placeholder: "Seleccionar año..."
                })
              ),

              // Campo División
              h(
                "div",
                { className: "form-group" },
                h("label", { className: "form-label", htmlFor: "curso-division" }, "División:", h("span", { className: "required-star" }, " *")),
                h(CustomSelect, {
                  id: "curso-division",
                  value: division,
                  options: ["1", "2", "3", "4", "5", "6", "7", "8"].map((d) => ({
                    value: d,
                    label: `División ${d}`
                  })),
                  onChange: (val) => setDivision(val),
                  placeholder: "Seleccionar división..."
                })
              ),

              // Campo Orientación / Especialidad
              h(
                "div",
                { className: "form-group form-group--full" },
                h("label", { className: "form-label", htmlFor: "curso-orientacion" }, "Orientación / Especialidad:", h("span", { className: "required-star" }, " *")),
                h(CustomSelect, {
                  id: "curso-orientacion",
                  value: orientacion,
                  options: [
                    "Ciclo Básico",
                    "Técnico en Informática",
                    "Técnico en Programación",
                    "Técnico Electromecánico",
                    "Técnico en Electrónica",
                    "Técnico Químico"
                  ],
                  onChange: (val) => setOrientacion(val),
                  placeholder: "Seleccionar orientación..."
                })
              ),

              // Campo Turno Aula
              h(
                "div",
                { className: "form-group" },
                h("label", { className: "form-label", htmlFor: "curso-turno-aula" }, "Turno Aula:", h("span", { className: "required-star" }, " *")),
                h(CustomSelect, {
                  id: "curso-turno-aula",
                  value: turnoAula,
                  options: ["Mañana", "Tarde", "Vespertino"],
                  onChange: (val) => setTurnoAula(val),
                  placeholder: "Seleccionar turno..."
                })
              ),

              // Campo Turno Taller
              h(
                "div",
                { className: "form-group" },
                h("label", { className: "form-label", htmlFor: "curso-turno-taller" }, "Turno Taller:"),
                h(CustomSelect, {
                  id: "curso-turno-taller",
                  value: turnoTaller,
                  options: ["Mañana", "Tarde", "Vespertino", "Sin Taller"],
                  onChange: (val) => setTurnoTaller(val),
                  placeholder: "Seleccionar turno taller..."
                })
              ),

              // Capacidad de Alumnos
              h(
                "div",
                { className: "form-group" },
                h("label", { className: "form-label", htmlFor: "curso-capacidad" }, "Capacidad (Cupo Máximo):"),
                h("input", {
                  id: "curso-capacidad",
                  type: "number",
                  className: "form-control",
                  min: 5,
                  max: 50,
                  placeholder: "Ej: 30",
                  value: capacidad,
                  onChange: (e) => setCapacidad(e.target.value)
                })
              ),

              // Preceptor/a a cargo
              h(
                "div",
                { className: "form-group" },
                h("label", { className: "form-label", htmlFor: "curso-preceptor" }, "Preceptor/a a Cargo:"),
                h("input", {
                  id: "curso-preceptor",
                  type: "text",
                  className: "form-control",
                  placeholder: "Ej: Gómez, Carlos",
                  value: preceptor,
                  onChange: (e) => setPreceptor(e.target.value)
                })
              )
            ),

            // Acciones del modal
            h(
              "div",
              { className: "modal-actions" },
              h(
                "button",
                {
                  type: "button",
                  className: "modal-actions-btn modal-actions-btn--secondary",
                  onClick: onCerrar,
                  disabled: guardando
                },
                "Cancelar"
              ),
              h(
                "button",
                {
                  type: "submit",
                  className: "modal-actions-btn modal-actions-btn--primary",
                  disabled: guardando
                },
                h(
                  "svg",
                  { viewBox: "0 0 20 20", fill: "currentColor", width: "16", height: "16", "aria-hidden": "true" },
                  h("path", {
                    fillRule: "evenodd",
                    d: "M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z",
                    clipRule: "evenodd"
                  })
                ),
                h("span", null, guardando ? "Guardando..." : "Guardar Curso")
              )
            )
          )
    )
  );

  if (typeof document !== "undefined") {
    return createPortal(modalContent, document.body);
  }
  return modalContent;
}

export default function CursosListView() {
  const [cursosCatalogo, setCursosCatalogo] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorCatalogo, setErrorCatalogo] = useState(null);
  const [modalCursoAbierto, setModalCursoAbierto] = useState(false);

  // Filtros del Directorio de Cursos
  const [courseSearch, setCourseSearch] = useState("");
  const [courseFilterCiclo, setCourseFilterCiclo] = useState("todos"); // 'todos' | 'basico' | 'informatica' | 'programacion'
  const [courseFilterAnio, setCourseFilterAnio] = useState("todos"); // 'todos' | '1°' | '2°' ...
  const [courseFilterTurno, setCourseFilterTurno] = useState("todos"); // 'todos' | 'Mañana' | 'Tarde'

  const cargarCursos = useCallback(() => {
    let vigente = true;
    setLoading(true);
    StudentsService.getDivisiones()
      .then((divisiones) => {
        if (vigente) {
          setCursosCatalogo(divisiones || []);
          setErrorCatalogo(null);
        }
      })
      .catch((fallo) => {
        if (vigente) {
          setErrorCatalogo(fallo?.mensaje ?? "No se pudo cargar el directorio de cursos.");
        }
      })
      .finally(() => {
        if (vigente) setLoading(false);
      });
    return () => {
      vigente = false;
    };
  }, []);

  useEffect(() => {
    cargarCursos();
  }, [cargarCursos]);

  const handleGuardarNuevoCurso = (nuevoCurso) => {
    setCursosCatalogo((prev) => [nuevoCurso, ...prev]);
  };

  // Contadores dinámicos por orientación
  const counts = useMemo(() => {
    const total = cursosCatalogo.length;
    const basico = cursosCatalogo.filter((c) => c.orientacion === "Ciclo Básico").length;
    const informatica = cursosCatalogo.filter((c) => c.orientacion?.includes("Informática")).length;
    const programacion = cursosCatalogo.filter((c) => c.orientacion?.includes("Programación")).length;
    return { total, basico, informatica, programacion };
  }, [cursosCatalogo]);

  // Cursos filtrados
  const filteredCourseCards = useMemo(() => {
    return cursosCatalogo.filter((c) => {
      // Filtro por búsqueda de texto
      if (courseSearch.trim()) {
        const q = courseSearch.trim().toLowerCase();
        const matchName = `${c.curso} ${c.division}`.toLowerCase().includes(q);
        const matchFull = `${c.curso} año división ${c.division}`.toLowerCase().includes(q);
        const matchOri = (c.orientacion || "").toLowerCase().includes(q);
        const matchTurno =
          (c.turnoAula || "").toLowerCase().includes(q) || (c.turnoTaller || "").toLowerCase().includes(q);
        if (!matchName && !matchFull && !matchOri && !matchTurno) return false;
      }

      // Filtro por Ciclo / Orientación
      if (courseFilterCiclo === "basico" && c.orientacion !== "Ciclo Básico") return false;
      if (courseFilterCiclo === "informatica" && !c.orientacion?.includes("Informática")) return false;
      if (courseFilterCiclo === "programacion" && !c.orientacion?.includes("Programación")) return false;

      // Filtro por Año
      if (courseFilterAnio !== "todos" && c.curso?.replace("°", "") !== courseFilterAnio.replace("°", "")) {
        return false;
      }

      // Filtro por Turno
      if (courseFilterTurno !== "todos" && c.turnoAula?.toLowerCase() !== courseFilterTurno.toLowerCase()) {
        return false;
      }

      return true;
    });
  }, [cursosCatalogo, courseSearch, courseFilterCiclo, courseFilterAnio, courseFilterTurno]);

  const handleVerAlumnosCurso = (curso, division) => {
    window.location.hash = `#/alumnos?curso=${encodeURIComponent(curso)}&div=${encodeURIComponent(division)}`;
  };

  return h(
    "section",
    { className: "welcome-panel alumnos-panel cursos-panel" },

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
        icon: "academic",
        className: "dashboard-card--highlight alumnos-main-card",
        collapsible: false,
        actions: h(
          "div",
          { className: "alumnos-header-actions" },
          // Botón "+ Cargar Curso"
          h(
            "button",
            {
              type: "button",
              className: "btn-cargar-curso-header",
              onClick: () => setModalCursoAbierto(true),
              title: "Registrar un nuevo curso o división"
            },
            h(IconPlus, null),
            h("span", null, "Cargar Curso")
          ),
          // Botón "Cargar Alumno"
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

          // Filtros de ciclo / orientación con contadores dinámicos
          h(
            "div",
            { className: "course-ciclo-pills" },
            [
              { id: "todos", label: `Todos los Cursos (${counts.total})` },
              { id: "basico", label: `Ciclo Básico (${counts.basico})` },
              { id: "informatica", label: `Informática (${counts.informatica})` },
              { id: "programacion", label: `Programación (${counts.programacion})` }
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

        loading ? h(LoadingState, { mensaje: "Cargando directorio de cursos y divisiones..." }) : null,

        errorCatalogo ? h(ErrorState, { mensaje: errorCatalogo, onRetry: cargarCursos }) : null,

        // Mensaje cuando no hay cursos coincidentes con los filtros
        !loading && !errorCatalogo && filteredCourseCards.length === 0
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
        !loading && !errorCatalogo && filteredCourseCards.length > 0
          ? h(
              "div",
              { className: "course-cards-directory-grid" },
              filteredCourseCards.map((cursoItem) => {
                const orientacionLimpia = (cursoItem.orientacion || "").replace(/^Técnico en\s+/i, "");
                return h(
                  "div",
                  {
                    key: cursoItem.id,
                    className: "course-directory-card",
                    onClick: () => handleVerAlumnosCurso(cursoItem.curso, cursoItem.division),
                    title: `Abrir nómina de ${cursoItem.curso} ${cursoItem.division}`,
                    role: "button",
                    tabIndex: 0,
                    onKeyDown: (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        handleVerAlumnosCurso(cursoItem.curso, cursoItem.division);
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
                            : cursoItem.orientacion?.includes("Informática")
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
                      h("strong", null, cursoItem.cantidad ?? 0),
                      h("span", null, "alumnos")
                    ),
                    h(
                      "button",
                      {
                        type: "button",
                        className: "btn-open-course",
                        onClick: (e) => {
                          e.stopPropagation();
                          handleVerAlumnosCurso(cursoItem.curso, cursoItem.division);
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
    ),

    // Modal para el alta de un nuevo curso
    h(CargarCursoModal, {
      abierto: modalCursoAbierto,
      onCerrar: () => setModalCursoAbierto(false),
      onGuardar: handleGuardarNuevoCurso
    })
  );
}
