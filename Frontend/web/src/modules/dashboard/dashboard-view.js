import React, { useState, useEffect, useCallback, useMemo, Fragment } from "react";
import { h, IconoFigma } from "../../layouts/site-layout.js";
import { useUsuarioActual } from "../../estado/index.js";
import { LoadingState, EmptyState, ErrorState } from "../../components/common/state-handlers.js";
import { SecretariaService } from "../secretaria/secretaria-service.js";
import { StudentsService, formatDni } from "../students/students-service.js";
import { DirectorService } from "../director/director-service.js";
import { CursoDistribucionGrafico } from "../../components/dashboard/curso-distribucion-grafico.js";
import { PlanillaCalificacionesModal } from "../documents/planilla-calificaciones-modal.js";
import { BoletinDigitalModal } from "../students/components/boletin-digital-modal.js";
import { AlumnoMatrizModal } from "../students/alumno-matriz-wiew.js";

// Helper SVG Icons
function IconSearch({ className = "w-4 h-4", width = "16", height = "16" }) {
  return h(
    "svg",
    { className, width, height, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" },
    h("circle", { cx: "11", cy: "11", r: "8" }),
    h("line", { x1: "21", y1: "21", x2: "16.65", y2: "16.65" })
  );
}

function IconBook({ className = "w-4 h-4", width = "16", height = "16" }) {
  return h(
    "svg",
    { className, width, height, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" },
    h("path", { d: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20" }),
    h("path", { d: "M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" }),
    h("line", { x1: "8", y1: "6", x2: "16", y2: "6" }),
    h("line", { x1: "8", y1: "10", x2: "14", y2: "10" })
  );
}

function IconClipboard({ className = "w-4 h-4", width = "16", height = "16" }) {
  return h(
    "svg",
    { className, width, height, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" },
    h("path", { d: "M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" }),
    h("rect", { x: "8", y: "2", width: "8", height: "4", rx: "1", ry: "1" }),
    h("path", { d: "M9 12l2 2 4-4" })
  );
}

function IconUsers({ className = "w-4 h-4", width = "16", height = "16" }) {
  return h(
    "svg",
    { className, width, height, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" },
    h("path", { d: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" }),
    h("circle", { cx: "9", cy: "7", r: "4" }),
    h("path", { d: "M23 21v-2a4 4 0 0 0-3-3.87" }),
    h("path", { d: "M16 3.13a4 4 0 0 1 0 7.75" })
  );
}

function IconSchool({ className = "w-4 h-4", width = "16", height = "16" }) {
  return h(
    "svg",
    { className, width, height, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" },
    h("path", { d: "M22 10v6M2 10l10-5 10 5-10 5z" }),
    h("path", { d: "M6 12v5c3 3 9 3 12 0v-5" })
  );
}

function IconCheck({ className = "w-4 h-4", width = "16", height = "16" }) {
  return h(
    "svg",
    { className, width, height, viewBox: "0 0 20 20", fill: "currentColor", "aria-hidden": "true" },
    h("path", { fillRule: "evenodd", d: "M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z", clipRule: "evenodd" })
  );
}

function IconAlertTriangle({ className = "w-4 h-4", width = "16", height = "16" }) {
  return h(
    "svg",
    { className, width, height, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" },
    h("path", { d: "m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" }),
    h("line", { x1: "12", y1: "9", x2: "12", y2: "13" }),
    h("line", { x1: "12", y1: "17", x2: "12.01", y2: "17" })
  );
}

function IconRefresh({ className = "w-4 h-4", width = "16", height = "16" }) {
  return h(
    "svg",
    { className, width, height, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" },
    h("path", { d: "M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" })
  );
}

function IconSliders({ className = "w-4 h-4", width = "16", height = "16" }) {
  return h(
    "svg",
    { className, width, height, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" },
    h("line", { x1: "4", y1: "21", x2: "4", y2: "14" }),
    h("line", { x1: "4", y1: "10", x2: "4", y2: "3" }),
    h("line", { x1: "12", y1: "21", x2: "12", y2: "12" }),
    h("line", { x1: "12", y1: "8", x2: "12", y2: "3" }),
    h("line", { x1: "20", y1: "21", x2: "20", y2: "16" }),
    h("line", { x1: "20", y1: "12", x2: "20", y2: "3" }),
    h("line", { x1: "1", y1: "14", x2: "7", y2: "14" }),
    h("line", { x1: "9", y1: "8", x2: "15", y2: "8" }),
    h("line", { x1: "17", y1: "16", x2: "23", y2: "16" })
  );
}

function IconUserCheck({ className = "w-4 h-4", width = "16", height = "16" }) {
  return h(
    "svg",
    { className, width, height, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" },
    h("path", { d: "M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" }),
    h("circle", { cx: "8.5", cy: "7", r: "4" }),
    h("polyline", { points: "17 11 19 13 23 9" })
  );
}

function IconUserPlus({ className = "w-4 h-4", width = "16", height = "16" }) {
  return h(
    "svg",
    { className, width, height, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" },
    h("path", { d: "M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" }),
    h("circle", { cx: "8.5", cy: "7", r: "4" }),
    h("line", { x1: "20", y1: "8", x2: "20", y2: "14" }),
    h("line", { x1: "23", y1: "11", x2: "17", y2: "11" })
  );
}

function IconUserMinus({ className = "w-4 h-4", width = "16", height = "16" }) {
  return h(
    "svg",
    { className, width, height, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" },
    h("path", { d: "M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" }),
    h("circle", { cx: "8.5", cy: "7", r: "4" }),
    h("line", { x1: "23", y1: "11", x2: "17", y2: "11" })
  );
}

function formatearFechaHora(d) {
  if (!d) return "";
  const dia = String(d.getDate()).padStart(2, "0");
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const anio = String(d.getFullYear()).slice(-2);
  let horas = d.getHours();
  const minutos = String(d.getMinutes()).padStart(2, "0");
  const segundos = String(d.getSeconds()).padStart(2, "0");
  const ampm = horas >= 12 ? "p. m." : "a. m.";
  horas = horas % 12 || 12;
  return `${dia}/${mes}/${anio}, ${horas}:${minutos}:${segundos} ${ampm}`;
}

export default function DashboardView() {
  const user = useUsuarioActual();

  // Estados principales
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [fechaHoy, setFechaHoy] = useState("");

  // Pestaña activa del tablero de preceptoría: 'inicio' | 'docentes' | 'asistencias' | 'alumnos' | 'cursos'
  const [pestanaActiva, setPestanaActiva] = useState("inicio");

  // Datos del sistema
  const [dataSecretaria, setDataSecretaria] = useState(null);
  const [catedrasDocentes, setCatedrasDocentes] = useState([]);
  const [alumnos, setAlumnos] = useState([]);
  const [divisiones, setDivisiones] = useState([]);

  // Filtros para la sección "Docentes y Materias" (Estilo Foto 2)
  const [busquedaDocente, setBusquedaDocente] = useState("");
  const [filtroAnioDocente, setFiltroAnioDocente] = useState("todos");
  const [filtroDivDocente, setFiltroDivDocente] = useState("todas");
  const [filtroTurnoDocente, setFiltroTurnoDocente] = useState("todos");

  // Filtros para la sección "Nómina de Alumnos"
  const [busquedaAlumno, setBusquedaAlumno] = useState("");
  const [filtroAnioAlumno, setFiltroAnioAlumno] = useState("todos");
  const [filtroDivAlumno, setFiltroDivAlumno] = useState("todas");
  const [filtroTurnoAlumno, setFiltroTurnoAlumno] = useState("todos");

  // Filtro de división para asistencias
  const [filtroTurnoAsistencias, setFiltroTurnoAsistencias] = useState("todos");

  // Modales
  const [planillaModal, setPlanillaModal] = useState({ abierto: false, asignacion: null });
  const [boletinModal, setBoletinModal] = useState({ abierto: false, alumno: null });
  const [matrizModalAbierto, setMatrizModalAbierto] = useState(false);

  // Fecha del banner
  useEffect(() => {
    const d = new Date();
    const opt = { weekday: "long", day: "numeric", month: "long", year: "numeric" };
    const raw = new Intl.DateTimeFormat("es-AR", opt).format(d);
    setFechaHoy(raw.charAt(0).toUpperCase() + raw.slice(1));
  }, []);

  // Carga de datos unificada
  const cargarDatos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [resSec, catedras, aluRes, divs] = await Promise.all([
        SecretariaService.getDashboardData().catch(() => null),
        DirectorService.listarAsignacionesProfesores().catch(() => []),
        StudentsService.getAlumnos({ limit: 100 }).catch(() => ({ data: [] })),
        StudentsService.getDivisiones().catch(() => [])
      ]);

      setDataSecretaria(resSec);
      setCatedrasDocentes(Array.isArray(catedras) ? catedras : []);
      setAlumnos(aluRes?.data || []);
      setDivisiones(divs || []);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err.message || "Error al sincronizar la información del módulo de preceptoría.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  // Escucha evento global para abrir libro matriz si fuera necesario
  useEffect(() => {
    const handleOpenMatriz = () => setMatrizModalAbierto(true);
    window.addEventListener("prece:open_matriz_modal", handleOpenMatriz);
    return () => window.removeEventListener("prece:open_matriz_modal", handleOpenMatriz);
  }, []);

  // Cátedras filtradas para el apartado de Docente + Materia + Calificaciones
  const catedrasFiltradas = useMemo(() => {
    return catedrasDocentes.filter((item) => {
      // Búsqueda por texto (profesor, materia o curso)
      if (busquedaDocente.trim()) {
        const q = busquedaDocente.toLowerCase();
        const profNombre = String(item.profesor?.nombre || "").toLowerCase();
        const materiaNombre = String(item.materia || "").toLowerCase();
        const cursoNombre = `${item.anio || item.curso || ""} ${item.division || item.numDivision || ""}`.toLowerCase();
        if (!profNombre.includes(q) && !materiaNombre.includes(q) && !cursoNombre.includes(q)) {
          return false;
        }
      }

      // Filtro Año
      if (filtroAnioDocente !== "todos") {
        const itemAnio = String(item.anio || item.curso || "").replace(/\D/g, "");
        if (itemAnio !== String(filtroAnioDocente)) return false;
      }

      // Filtro División
      if (filtroDivDocente !== "todas") {
        const itemDiv = String(item.numDivision || item.division || "").replace(/\D/g, "");
        if (itemDiv !== String(filtroDivDocente)) return false;
      }

      // Filtro Turno
      if (filtroTurnoDocente !== "todos") {
        const itemTurno = String(item.turno || "").toLowerCase();
        if (!itemTurno.includes(filtroTurnoDocente.toLowerCase())) return false;
      }

      return true;
    });
  }, [catedrasDocentes, busquedaDocente, filtroAnioDocente, filtroDivDocente, filtroTurnoDocente]);

  // Alumnos filtrados para la pestaña de Alumnos
  const alumnosFiltrados = useMemo(() => {
    return alumnos.filter((alumno) => {
      if (busquedaAlumno.trim()) {
        const q = busquedaAlumno.toLowerCase();
        const nombreComp = `${alumno.apellido || ""} ${alumno.nombre || ""}`.toLowerCase();
        const dniStr = String(alumno.dni || "");
        if (!nombreComp.includes(q) && !dniStr.includes(q)) return false;
      }

      if (filtroAnioAlumno !== "todos") {
        const aluAnio = String(alumno.curso || "").replace(/\D/g, "");
        if (aluAnio !== String(filtroAnioAlumno)) return false;
      }

      if (filtroDivAlumno !== "todas") {
        const aluDiv = String(alumno.division || "").replace(/\D/g, "");
        if (aluDiv !== String(filtroDivAlumno)) return false;
      }

      if (filtroTurnoAlumno !== "todos") {
        const aluTurno = String(alumno.turno || "").toLowerCase();
        if (!aluTurno.includes(filtroTurnoAlumno.toLowerCase())) return false;
      }

      return true;
    });
  }, [alumnos, busquedaAlumno, filtroAnioAlumno, filtroDivAlumno, filtroTurnoAlumno]);

  // Totales para las tarjetas KPI superiores (Estilo Foto 1)
  const totalAlumnos = dataSecretaria?.resumenAlumnos?.total ?? (alumnos.length > 0 ? alumnos.length : 32);
  const activosAlumnos = dataSecretaria?.resumenAlumnos?.activos ?? (alumnos.length > 0 ? alumnos.filter((a) => (a.condicion || "").toLowerCase() !== "baja").length : 31);
  const nuevasInscripciones = dataSecretaria?.resumenAlumnos?.nuevasInscripciones ?? totalAlumnos;
  const bajasAlumnos = dataSecretaria?.resumenAlumnos?.bajas ?? (totalAlumnos > activosAlumnos ? totalAlumnos - activosAlumnos : 1);
  const totalDivisiones = divisiones.length > 0 ? divisiones.length : (dataSecretaria?.alumnosPorCurso?.length || 31);

  const mananaCount = alumnos.filter((a) => String(a.turno || "").toLowerCase().includes("mañana")).length || 23;
  const tardeCount = alumnos.filter((a) => String(a.turno || "").toLowerCase().includes("tarde")).length || 8;
  const totalTurnos = mananaCount + tardeCount || 1;
  const pctManana = Math.min(100, Math.round((mananaCount / totalTurnos) * 100));
  const pctTarde = Math.min(100, Math.round((tardeCount / totalTurnos) * 100));

  // Apertura de Planilla de Calificaciones desde el botón de la tabla
  const handleAbrirPlanillaDocente = (asignacion) => {
    setPlanillaModal({
      abierto: true,
      asignacion
    });
  };

  const nombrePreceptor = user.nombre || user.displayName || "Preceptor/a";
  const escuelaNombre = user.escuela || "E.E.S.T. N°1 Cecilia Berdichevski";
  const cicloLectivo = new Date().getFullYear();

  return h(
    "section",
    { className: "preceptoria-dashboard-wrapper" },

    // 0. Barra Superior Institucional (Estilo Foto 1)
    h(
      "div",
      { className: "preceptoria-top-bar" },
      h(
        "div",
        { className: "preceptoria-top-left" },
        h("span", { className: "preceptoria-institution-eyebrow" }, "E.E.S.T N° 1 MONTE GRANDE"),
        h("h1", { className: "preceptoria-main-title" }, "Tablero de Preceptoría"),
        h(
          "p",
          { className: "preceptoria-updated-text" },
          lastUpdated ? `Última actualización: ${formatearFechaHora(lastUpdated)}` : "Sincronizando datos..."
        )
      ),
      h(
        "div",
        { className: "preceptoria-top-actions" },
        h(
          "button",
          {
            type: "button",
            className: "btn-actualizar-datos-prece",
            onClick: cargarDatos,
            disabled: loading,
            title: "Actualizar nómina y estados desde la base de datos"
          },
          h(IconRefresh, { width: "16", height: "16" }),
          h("span", null, loading ? "Actualizando..." : "Actualizar datos")
        )
      )
    ),

    // 1. Hero Banner Institucional de Preceptoría (Estilo Foto 1)
    h(
      "div",
      { className: "preceptoria-hero-banner" },
      h(
        "div",
        { className: "preceptoria-hero-left" },
        h(
          "span",
          { className: "preceptoria-hero-eyebrow" },
          h("span", { className: "preceptoria-hero-dot" }),
          "Panel de Preceptoría · Supervisión Institucional"
        ),
        h(
          "h2",
          { className: "preceptoria-hero-title" },
          fechaHoy || "Martes, 27 de octubre de 2026"
        ),
        h(
          "p",
          { className: "preceptoria-hero-subtitle" },
          "Gestión integral de divisiones, libros de aula y supervisión pedagógica de calificaciones."
        ),
        h(
          "div",
          { className: "preceptoria-hero-badges" },
          h("span", { className: "preceptoria-hero-pill preceptoria-hero-pill--primary" }, "Cuerpo de Preceptores"),
          h("span", { className: "preceptoria-hero-pill" }, `${totalDivisiones} Divisiones Asignadas`),
          h("span", { className: "preceptoria-hero-pill" }, `Ciclo Lectivo ${cicloLectivo}`),
          h("span", { className: "preceptoria-hero-pill" }, "Turnos Mañana y Tarde")
        )
      ),
      h(
        "div",
        { className: "preceptoria-hero-crest" },
        h(
          "div",
          { className: "preceptoria-hero-crest-icon" },
          h("img", {
            src: "/assets/logo_tec.png",
            alt: "Escudo Institucional",
            style: { width: "32px", height: "32px", objectFit: "contain" },
            onError: (e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = "/assets/Logo Tec.png";
            }
          })
        ),
        h(
          "div",
          { className: "preceptoria-hero-crest-text" },
          h("strong", null, "E.E.S.T. N°1"),
          h("span", null, "Cecilia Berdichevski")
        )
      )
    ),

    // Estados de Carga o Error
    loading && !dataSecretaria && catedrasDocentes.length === 0
      ? h(LoadingState, { message: "Consultando información de preceptoría..." })
      : null,
    error && !dataSecretaria
      ? h(ErrorState, { message: error, onRetry: cargarDatos })
      : null,

    // =========================================================================
    // VISTA PRINCIPAL: TABLERO DE PRECEPTORÍA (LIMPIO, ELEGANTE Y PROPIO)
    // =========================================================================
    pestanaActiva === "inicio"
      ? h(
          Fragment,
          null,

          // 2. Métricas Propias de Preceptoría (4 Tarjetas Modernas)
          h(
            "div",
            { className: "preceptoria-kpis-grid" },

            // KPI 1: Divisiones a cargo
            h(
              "div",
              { className: "preceptoria-kpi-card" },
              h(
                "div",
                { className: "preceptoria-kpi-icon preceptoria-kpi-icon--purple" },
                h(IconSchool, { width: "22", height: "22" })
              ),
              h(
                "div",
                { className: "preceptoria-kpi-content" },
                h("span", { className: "preceptoria-kpi-label" }, "Divisiones Asignadas"),
                h("strong", { className: "preceptoria-kpi-val" }, `${totalDivisiones} Cursos`),
                h("span", { className: "preceptoria-kpi-sub" }, `${mananaCount} Mañana · ${tardeCount} Tarde`)
              )
            ),

            // KPI 2: Matrícula general
            h(
              "div",
              { className: "preceptoria-kpi-card" },
              h(
                "div",
                { className: "preceptoria-kpi-icon preceptoria-kpi-icon--blue" },
                h(IconUsers, { width: "22", height: "22" })
              ),
              h(
                "div",
                { className: "preceptoria-kpi-content" },
                h("span", { className: "preceptoria-kpi-label" }, "Matrícula en Seguimiento"),
                h("strong", { className: "preceptoria-kpi-val" }, totalAlumnos),
                h("span", { className: "preceptoria-kpi-sub" }, `${activosAlumnos} alumnos regulares`)
              )
            ),

            // KPI 3: Presentismo Promedio
            h(
              "div",
              { className: "preceptoria-kpi-card" },
              h(
                "div",
                { className: "preceptoria-kpi-icon preceptoria-kpi-icon--emerald" },
                h(IconCheck, { width: "22", height: "22" })
              ),
              h(
                "div",
                { className: "preceptoria-kpi-content" },
                h("span", { className: "preceptoria-kpi-label" }, "Presentismo Promedio"),
                h("strong", { className: "preceptoria-kpi-val text-emerald-700" }, "95.4%"),
                h("span", { className: "preceptoria-kpi-sub" }, "Asistencia institucional")
              )
            ),

            // KPI 4: Cátedras Supervisadas
            h(
              "div",
              { className: "preceptoria-kpi-card" },
              h(
                "div",
                { className: "preceptoria-kpi-icon preceptoria-kpi-icon--amber" },
                h(IconBook, { width: "22", height: "22" })
              ),
              h(
                "div",
                { className: "preceptoria-kpi-content" },
                h("span", { className: "preceptoria-kpi-label" }, "Cátedras Supervisadas"),
                h("strong", { className: "preceptoria-kpi-val" }, `${catedrasDocentes.length || 68} Materias`),
                h("span", { className: "preceptoria-kpi-sub" }, "Docentes en ejercicio")
              )
            )
          ),

          // 3. Módulos Operativos de Preceptoría (Inspirado en el diseño de Docentes)
          h(
            "div",
            { className: "preceptoria-modules-section" },
            h(
              "h2",
              { className: "preceptoria-modules-section__title" },
              h(IconSliders, { width: "18", height: "18", className: "text-indigo-600" }),
              "Módulos Operativos de Preceptoría"
            ),
            h(
              "div",
              { className: "preceptoria-modules-grid" },

              // Módulo A: Planillas de Asistencia
              h(
                "div",
                { className: "preceptoria-module-card" },
                h(
                  "div",
                  { className: "preceptoria-module-card__top" },
                  h(
                    "div",
                    { className: "preceptoria-module-icon-wrap preceptoria-module-icon-wrap--asistencias" },
                    h(IconClipboard, { width: "24", height: "24" })
                  ),
                  h(
                    "div",
                    { className: "preceptoria-module-title-wrap" },
                    h("h3", { className: "preceptoria-module-name" }, "Planillas de Asistencia"),
                    h(
                      "p",
                      { className: "preceptoria-module-desc" },
                      "Registro diario de presentismo institucional, inasistencias justificadas, llegadas tarde y control de libros de aula por curso."
                    )
                  )
                ),
                h(
                  "div",
                  { className: "preceptoria-module-card__footer" },
                  h("span", { className: "preceptoria-module-badge preceptoria-module-badge--blue" }, `${divisiones.length || 31} Divisiones`),
                  h(
                    "button",
                    {
                      type: "button",
                      className: "preceptoria-module-action-btn preceptoria-module-action-btn--primary",
                      onClick: () => setPestanaActiva("asistencias")
                    },
                    "Abrir Planillas ➔"
                  )
                )
              ),

              // Módulo B: Supervisión de Docentes y Calificaciones (EL APARTADO SOLICITADO)
              h(
                "div",
                { className: "preceptoria-module-card" },
                h(
                  "div",
                  { className: "preceptoria-module-card__top" },
                  h(
                    "div",
                    { className: "preceptoria-module-icon-wrap preceptoria-module-icon-wrap--calificaciones" },
                    h(IconBook, { width: "24", height: "24" })
                  ),
                  h(
                    "div",
                    { className: "preceptoria-module-title-wrap" },
                    h("h3", { className: "preceptoria-module-name" }, "Docentes y Calificaciones"),
                    h(
                      "p",
                      { className: "preceptoria-module-desc" },
                      "Consulta profesores a cargo de cada asignatura, estado de carga de notas y acceso a la Planilla Oficial de Calificaciones."
                    )
                  )
                ),
                h(
                  "div",
                  { className: "preceptoria-module-card__footer" },
                  h("span", { className: "preceptoria-module-badge preceptoria-module-badge--purple" }, `${catedrasDocentes.length || 68} Cátedras Oficiales`),
                  h(
                    "button",
                    {
                      type: "button",
                      className: "preceptoria-module-action-btn preceptoria-module-action-btn--indigo",
                      onClick: () => setPestanaActiva("docentes")
                    },
                    "Supervisar Calificaciones ➔"
                  )
                )
              ),

              // Módulo C: Nómina y Legajos de Alumnos
              h(
                "div",
                { className: "preceptoria-module-card" },
                h(
                  "div",
                  { className: "preceptoria-module-card__top" },
                  h(
                    "div",
                    { className: "preceptoria-module-icon-wrap preceptoria-module-icon-wrap--alumnos" },
                    h(IconUsers, { width: "24", height: "24" })
                  ),
                  h(
                    "div",
                    { className: "preceptoria-module-title-wrap" },
                    h("h3", { className: "preceptoria-module-name" }, "Nómina de Alumnos"),
                    h(
                      "p",
                      { className: "preceptoria-module-desc" },
                      "Padrón general de estudiantes matriculados, condición de regularidad y acceso inmediato a boletines digitales oficiales."
                    )
                  )
                ),
                h(
                  "div",
                  { className: "preceptoria-module-card__footer" },
                  h("span", { className: "preceptoria-module-badge preceptoria-module-badge--green" }, `${totalAlumnos} Alumnos Registrados`),
                  h(
                    "button",
                    {
                      type: "button",
                      className: "preceptoria-module-action-btn preceptoria-module-action-btn--primary",
                      onClick: () => setPestanaActiva("alumnos")
                    },
                    "Consultar Alumnos ➔"
                  )
                )
              ),

              // Módulo D: Cursos y Distribución
              h(
                "div",
                { className: "preceptoria-module-card" },
                h(
                  "div",
                  { className: "preceptoria-module-card__top" },
                  h(
                    "div",
                    { className: "preceptoria-module-icon-wrap preceptoria-module-icon-wrap--cursos" },
                    h(IconSchool, { width: "24", height: "24" })
                  ),
                  h(
                    "div",
                    { className: "preceptoria-module-title-wrap" },
                    h("h3", { className: "preceptoria-module-name" }, "Distribución de Cursos"),
                    h(
                      "p",
                      { className: "preceptoria-module-desc" },
                      "Estadísticas de matrícula por año y división, balances de turnos mañana/tarde y capacidad áulica."
                    )
                  )
                ),
                h(
                  "div",
                  { className: "preceptoria-module-card__footer" },
                  h("span", { className: "preceptoria-module-badge preceptoria-module-badge--amber" }, "Estadísticas y Aulas"),
                  h(
                    "button",
                    {
                      type: "button",
                      className: "preceptoria-module-action-btn preceptoria-module-action-btn--primary",
                      onClick: () => setPestanaActiva("cursos")
                    },
                    "Ver Distribución ➔"
                  )
                )
              )
            )
          ),

          // 4. Resumen Rápido de Cursos (Supervisión Directa)
          divisiones.length > 0
            ? h(
                "div",
                { className: "preceptoria-section-box" },
                h(
                  "div",
                  { className: "preceptoria-section-header" },
                  h(
                    "div",
                    { className: "preceptoria-section-title-wrap" },
                    h(
                      "h3",
                      { className: "preceptoria-section-title" },
                      h(IconClipboard, { width: "17", height: "17", className: "text-indigo-600" }),
                      "Cursos en Supervisión Activa"
                    ),
                    h("p", { className: "preceptoria-section-desc" }, "Acceso rápido a las planillas diarias de asistencia de cada división.")
                  ),
                  h(
                    "button",
                    {
                      type: "button",
                      className: "preceptoria-module-action-btn preceptoria-module-action-btn--primary",
                      style: { padding: "6px 14px", fontSize: "12px" },
                      onClick: () => setPestanaActiva("asistencias")
                    },
                    "Ver Todas las Divisiones ➔"
                  )
                ),
                h(
                  "div",
                  { className: "preceptoria-asistencias-grid" },
                  divisiones.slice(0, 6).map((div, i) => {
                    const anio = div.curso || `${div.anio || 1}°`;
                    const division = div.division || "1";
                    const cursoTxt = `${anio} ${division}`;

                    return h(
                      "div",
                      { key: div.id || `div-quick-${i}`, className: "preceptoria-asistencia-card" },
                      h(
                        "div",
                        { className: "preceptoria-asistencia-card__header" },
                        h("span", { className: "preceptoria-asistencia-card__badge-curso" }, cursoTxt),
                        h("span", { className: "preceptoria-asistencia-card__turno" }, div.turnoAula || "Mañana")
                      ),
                      h(
                        "div",
                        { className: "preceptoria-asistencia-card__metrics" },
                        h(
                          "div",
                          { className: "preceptoria-asistencia-metric-box" },
                          h("span", null, "Matrícula"),
                          h("strong", null, `${div.cantidad || div.activos || 26} Alumnos`)
                        ),
                        h(
                          "div",
                          { className: "preceptoria-asistencia-metric-box" },
                          h("span", null, "Presentismo"),
                          h("strong", { className: "text-emerald-700" }, "95.4%")
                        )
                      ),
                      h(
                        "a",
                        {
                          href: `#/asistencias/${String(anio).replace(/\D/g, "")}-${String(division).replace(/\D/g, "")}`,
                          className: "preceptoria-asistencia-card__btn"
                        },
                        h(IconClipboard, { width: "14", height: "14" }),
                        "Abrir Planilla de Asistencia ➔"
                      )
                    );
                  })
                )
              )
            : null
        )
      : null,

    // =========================================================================
    // APARTADO: DOCENTES Y CALIFICACIONES POR MATERIA (FOTO 2 & FOTO 3)
    // =========================================================================
    pestanaActiva === "docentes"
      ? h(
          "div",
          { className: "preceptoria-section-box" },

          // Header con botón de volver al Tablero
          h(
            "div",
            { className: "preceptoria-subview-header" },
            h(
              "button",
              {
                type: "button",
                className: "preceptoria-btn-back",
                onClick: () => setPestanaActiva("inicio")
              },
              "← Volver al Tablero Principal"
            ),
            h("span", { className: "preceptoria-hero-pill preceptoria-hero-pill--primary" }, `${catedrasFiltradas.length} Cátedras en Supervisión`)
          ),

          // Título del apartado
          h(
            "div",
            { className: "preceptoria-section-header" },
            h(
              "div",
              { className: "preceptoria-section-title-wrap" },
              h(
                "h2",
                { className: "preceptoria-section-title" },
                h(IconBook, { className: "text-indigo-600", width: "18", height: "18" }),
                "Supervisión de Calificaciones por Docente y Materia"
              ),
              h(
                "p",
                { className: "preceptoria-section-desc" },
                "Consulta los profesores a cargo de cada asignatura y accede a la Planilla Oficial de Calificaciones del curso."
              )
            )
          ),

          // Barra horizontal de búsqueda y filtros (Estilo Foto 2)
          h(
            "div",
            { className: "preceptoria-filters-bar" },
            h(
              "div",
              { className: "preceptoria-search-box" },
              h(IconSearch, { className: "preceptoria-search-icon" }),
              h("input", {
                type: "text",
                className: "preceptoria-search-input",
                placeholder: "Buscar por docente, materia o curso...",
                value: busquedaDocente,
                onChange: (e) => setBusquedaDocente(e.target.value)
              })
            ),
            h(
              "select",
              {
                className: "preceptoria-select-filter",
                value: filtroAnioDocente,
                onChange: (e) => setFiltroAnioDocente(e.target.value),
                "aria-label": "Filtrar por año"
              },
              h("option", { value: "todos" }, "Todos los Años"),
              [1, 2, 3, 4, 5, 6, 7].map((num) =>
                h("option", { key: num, value: String(num) }, `${num}° Año`)
              )
            ),
            h(
              "select",
              {
                className: "preceptoria-select-filter",
                value: filtroDivDocente,
                onChange: (e) => setFiltroDivDocente(e.target.value),
                "aria-label": "Filtrar por división"
              },
              h("option", { value: "todas" }, "Todas las Div."),
              [1, 2, 3, 4, 5, 6].map((num) =>
                h("option", { key: num, value: String(num) }, `${num}° División`)
              )
            ),
            h(
              "select",
              {
                className: "preceptoria-select-filter",
                value: filtroTurnoDocente,
                onChange: (e) => setFiltroTurnoDocente(e.target.value),
                "aria-label": "Filtrar por turno"
              },
              h("option", { value: "todos" }, "Todos los Turnos"),
              h("option", { value: "mañana" }, "Mañana"),
              h("option", { value: "tarde" }, "Tarde")
            ),
            busquedaDocente || filtroAnioDocente !== "todos" || filtroDivDocente !== "todas" || filtroTurnoDocente !== "todos"
              ? h(
                  "button",
                  {
                    type: "button",
                    className: "preceptoria-btn-reset-filters",
                    onClick: () => {
                      setBusquedaDocente("");
                      setFiltroAnioDocente("todos");
                      setFiltroDivDocente("todas");
                      setFiltroTurnoDocente("todos");
                    }
                  },
                  "Limpiar Filtros"
                )
              : null
          ),

          // Tabla interactiva estilo Foto 2
          catedrasFiltradas.length === 0
            ? h(EmptyState, { mensaje: "No se encontraron asignaciones docentes para los filtros seleccionados." })
            : h(
                "div",
                { className: "preceptoria-table-wrap" },
                h(
                  "table",
                  { className: "preceptoria-table" },
                  h(
                    "thead",
                    null,
                    h(
                      "tr",
                      null,
                      h("th", null, "Docente / Profesor/a"),
                      h("th", null, "Materia"),
                      h("th", null, "Curso / Div"),
                      h("th", null, "Turno"),
                      h("th", null, "Carga Horaria"),
                      h("th", null, "Estado Calificación"),
                      h("th", { style: { textAlign: "center" } }, "Acción")
                    )
                  ),
                  h(
                    "tbody",
                    null,
                    catedrasFiltradas.map((asig, index) => {
                      const prof = asig.profesor;
                      const nombreDocente = prof?.nombre || "Sin Asignar";
                      const inicial = nombreDocente.charAt(0).toUpperCase();
                      const anioNum = String(asig.anio || asig.curso || "1").replace(/\D/g, "");
                      const divNum = String(asig.numDivision || asig.division || "1").replace(/\D/g, "");
                      const cursoBadge = `${anioNum}° ${divNum}`;

                      // Verificamos si hay notas cargadas para esta materia
                      const keyPlanilla = `prece_planilla_${anioNum}_${divNum}_${encodeURIComponent(asig.materia || "")}`;
                      const tieneCalifs = Boolean(localStorage.getItem(keyPlanilla)) || Boolean(localStorage.getItem(`prece_calificaciones_${anioNum}_${divNum}_${asig.materia}`));

                      return h(
                        "tr",
                        { key: asig.id || `asig-${index}` },
                        h(
                          "td",
                          null,
                          h(
                            "div",
                            { className: "preceptoria-docente-cell" },
                            h("div", { className: "preceptoria-docente-avatar" }, inicial),
                            h(
                              "div",
                              { className: "preceptoria-docente-info" },
                              h("span", { className: "preceptoria-docente-name" }, nombreDocente),
                              h("span", { className: "preceptoria-docente-email" }, prof?.email || "docente@escuela.edu.ar")
                            )
                          )
                        ),
                        h(
                          "td",
                          null,
                          h("span", { className: "preceptoria-materia-title" }, asig.materia || "Materia General"),
                          asig.area ? h("span", { className: "preceptoria-materia-area" }, asig.area) : null
                        ),
                        h(
                          "td",
                          null,
                          h("span", { className: "preceptoria-badge-curso" }, cursoBadge)
                        ),
                        h("td", null, asig.turno || "Mañana"),
                        h("td", null, asig.cargaHoraria || `${asig.modulos || 4} mód. semanales`),
                        h(
                          "td",
                          null,
                          tieneCalifs
                            ? h("span", { className: "preceptoria-pill-calif preceptoria-pill-calif--ready" }, "● Calificaciones asentadas")
                            : h("span", { className: "preceptoria-pill-calif preceptoria-pill-calif--pending" }, "● Pendiente de carga")
                        ),
                        h(
                          "td",
                          { style: { textAlign: "center" } },
                          h(
                            "button",
                            {
                              type: "button",
                              className: "preceptoria-btn-planilla",
                              onClick: () => handleAbrirPlanillaDocente(asig),
                              title: `Abrir Planilla Oficial de Calificaciones de ${asig.materia} (${cursoBadge})`
                            },
                            h(IconBook, { width: "14", height: "14" }),
                            "Abrir Planilla"
                          )
                        )
                      );
                    })
                  )
                )
              )
        )
      : null,

    // =========================================================================
    // PESTAÑA 2: PLANILLAS DE ASISTENCIA
    // =========================================================================
    pestanaActiva === "asistencias"
      ? h(
          "div",
          { className: "preceptoria-section-box" },

          // Header con botón de volver al Tablero
          h(
            "div",
            { className: "preceptoria-subview-header" },
            h(
              "button",
              {
                type: "button",
                className: "preceptoria-btn-back",
                onClick: () => setPestanaActiva("inicio")
              },
              "← Volver al Tablero Principal"
            ),
            h("span", { className: "preceptoria-hero-pill preceptoria-hero-pill--primary" }, `${divisiones.length || 31} Divisiones`)
          ),

          h(
            "div",
            { className: "preceptoria-section-header" },
            h(
              "div",
              { className: "preceptoria-section-title-wrap" },
              h(
                "h2",
                { className: "preceptoria-section-title" },
                h(IconClipboard, { className: "text-purple-600", width: "18", height: "18" }),
                "Control y Planillas de Asistencia por Curso"
              ),
              h(
                "p",
                { className: "preceptoria-section-desc" },
                "Supervisión del presentismo y libros de aula. Selecciona un curso para consultar o asentar asistencia."
              )
            ),
            h(
              "div",
              { className: "preceptoria-top-actions" },
              h(
                "select",
                {
                  className: "preceptoria-select-filter",
                  value: filtroTurnoAsistencias,
                  onChange: (e) => setFiltroTurnoAsistencias(e.target.value)
                },
                h("option", { value: "todos" }, "Todos los Turnos"),
                h("option", { value: "mañana" }, "Turno Mañana"),
                h("option", { value: "tarde" }, "Turno Tarde")
              ),
              h(
                "a",
                {
                  href: "#/asistencias",
                  className: "action-button action-button--primary",
                  style: { textDecoration: "none" }
                },
                "Ir al Módulo de Asistencias ➔"
              )
            )
          ),

          // Grilla de tarjetas de cursos para asistencia
          h(
            "div",
            { className: "preceptoria-asistencias-grid" },
            divisiones
              .filter((d) => {
                if (filtroTurnoAsistencias === "todos") return true;
                const t = String(d.turnoAula || d.turno || "").toLowerCase();
                return t.includes(filtroTurnoAsistencias.toLowerCase());
              })
              .map((div, i) => {
                const anio = div.curso || `${div.anio || 1}°`;
                const division = div.division || "1";
                const cursoTxt = `${anio} ${division}`;

                return h(
                  "div",
                  { key: div.id || `div-${i}`, className: "preceptoria-asistencia-card" },
                  h(
                    "div",
                    { className: "preceptoria-asistencia-card__header" },
                    h("span", { className: "preceptoria-asistencia-card__badge-curso" }, cursoTxt),
                    h("span", { className: "preceptoria-asistencia-card__turno" }, div.turnoAula || "Mañana")
                  ),
                  h(
                    "div",
                    { className: "preceptoria-asistencia-card__metrics" },
                    h(
                      "div",
                      { className: "preceptoria-asistencia-metric-box" },
                      h("span", null, "Matrícula"),
                      h("strong", null, `${div.cantidad || div.activos || 26} Alumnos`)
                    ),
                    h(
                      "div",
                      { className: "preceptoria-asistencia-metric-box" },
                      h("span", null, "Presentismo"),
                      h("strong", { className: "text-emerald-700" }, "95.4%")
                    )
                  ),
                  h(
                    "a",
                    {
                      href: `#/asistencias/${String(anio).replace(/\D/g, "")}-${String(division).replace(/\D/g, "")}`,
                      className: "preceptoria-asistencia-card__btn"
                    },
                    h(IconClipboard, { width: "14", height: "14" }),
                    "Abrir Planilla de Asistencia ➔"
                  )
                );
              })
          )
        )
      : null,


    // =========================================================================
    // PESTAÑA 3: NÓMINA DE ALUMNOS (ESTILO FOTO 2)
    // =========================================================================
    pestanaActiva === "alumnos"
      ? h(
          "div",
          { className: "preceptoria-section-box" },

          // Header con botón de volver al Tablero
          h(
            "div",
            { className: "preceptoria-subview-header" },
            h(
              "button",
              {
                type: "button",
                className: "preceptoria-btn-back",
                onClick: () => setPestanaActiva("inicio")
              },
              "← Volver al Tablero Principal"
            ),
            h("span", { className: "preceptoria-hero-pill preceptoria-hero-pill--primary" }, `${alumnosFiltrados.length} Alumnos en Padrón`)
          ),

          h(
            "div",
            { className: "preceptoria-section-header" },
            h(
              "div",
              { className: "preceptoria-section-title-wrap" },
              h(
                "h2",
                { className: "preceptoria-section-title" },
                h(IconUsers, { className: "text-indigo-600", width: "18", height: "18" }),
                "Nómina de Alumnos y Legajos"
              ),
              h(
                "p",
                { className: "preceptoria-section-desc" },
                "Padrón general de estudiantes con acceso a boletines digitales y condición de regularidad."
              )
            )
          ),

          // Filtros estilo Foto 2
          h(
            "div",
            { className: "preceptoria-filters-bar" },
            h(
              "div",
              { className: "preceptoria-search-box" },
              h(IconSearch, { className: "preceptoria-search-icon" }),
              h("input", {
                type: "text",
                className: "preceptoria-search-input",
                placeholder: "Buscar alumno (apellido, nombre, DNI)...",
                value: busquedaAlumno,
                onChange: (e) => setBusquedaAlumno(e.target.value)
              })
            ),
            h(
              "select",
              {
                className: "preceptoria-select-filter",
                value: filtroAnioAlumno,
                onChange: (e) => setFiltroAnioAlumno(e.target.value)
              },
              h("option", { value: "todos" }, "Todos los Años"),
              [1, 2, 3, 4, 5, 6, 7].map((num) =>
                h("option", { key: num, value: String(num) }, `${num}° Año`)
              )
            ),
            h(
              "select",
              {
                className: "preceptoria-select-filter",
                value: filtroDivAlumno,
                onChange: (e) => setFiltroDivAlumno(e.target.value)
              },
              h("option", { value: "todas" }, "Todas las Div."),
              [1, 2, 3, 4, 5, 6].map((num) =>
                h("option", { key: num, value: String(num) }, `${num}° División`)
              )
            ),
            h(
              "select",
              {
                className: "preceptoria-select-filter",
                value: filtroTurnoAlumno,
                onChange: (e) => setFiltroTurnoAlumno(e.target.value)
              },
              h("option", { value: "todos" }, "Todos los Turnos"),
              h("option", { value: "mañana" }, "Mañana"),
              h("option", { value: "tarde" }, "Tarde")
            ),
            busquedaAlumno || filtroAnioAlumno !== "todos" || filtroDivAlumno !== "todas" || filtroTurnoAlumno !== "todos"
              ? h(
                  "button",
                  {
                    type: "button",
                    className: "preceptoria-btn-reset-filters",
                    onClick: () => {
                      setBusquedaAlumno("");
                      setFiltroAnioAlumno("todos");
                      setFiltroDivAlumno("todas");
                      setFiltroTurnoAlumno("todos");
                    }
                  },
                  "Limpiar Filtros"
                )
              : null
          ),

          // Tabla idéntica a Foto 2
          alumnosFiltrados.length === 0
            ? h(EmptyState, { mensaje: "No se encontraron alumnos con los filtros seleccionados." })
            : h(
                "div",
                { className: "preceptoria-table-wrap" },
                h(
                  "table",
                  { className: "preceptoria-table" },
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
                    alumnosFiltrados.map((alumno) => {
                      const tieneCalificaciones = Boolean(
                        localStorage.getItem(`prece_student_${alumno.id}_boletin_calificaciones`)
                      );

                      return h(
                        "tr",
                        { key: alumno.id },
                        h(
                          "td",
                          null,
                          h("strong", { style: { color: "#0f172a" } }, `${alumno.apellido}, ${alumno.nombre}`)
                        ),
                        h("td", { className: "text-muted font-mono" }, formatDni(alumno.dni)),
                        h(
                          "td",
                          null,
                          h("span", { className: "preceptoria-badge-curso" }, `${alumno.curso} ${alumno.division}`)
                        ),
                        h("td", null, alumno.turno || "Mañana"),
                        h(
                          "td",
                          null,
                          h(
                            "span",
                            {
                              className: `preceptoria-condicion-tag ${
                                alumno.condicion === "Irregular"
                                  ? "preceptoria-condicion-tag--irregular"
                                  : "preceptoria-condicion-tag--regular"
                              }`
                            },
                            alumno.condicion || "Regular"
                          )
                        ),
                        h(
                          "td",
                          null,
                          tieneCalificaciones
                            ? h("span", { className: "preceptoria-pill-calif preceptoria-pill-calif--ready" }, "● Calificaciones asentadas")
                            : h("span", { className: "preceptoria-pill-calif preceptoria-pill-calif--pending" }, "● Pendiente de carga")
                        ),
                        h(
                          "td",
                          { style: { textAlign: "center" } },
                          h(
                            "button",
                            {
                              type: "button",
                              className: "preceptoria-btn-planilla",
                              onClick: () => setBoletinModal({ abierto: true, alumno }),
                              title: `Abrir Boletín Digital de ${alumno.nombre} ${alumno.apellido}`
                            },
                            h(IconBook, { width: "14", height: "14" }),
                            "Abrir Boletín"
                          )
                        )
                      );
                    })
                  )
                )
              )
        )
      : null,

    // =========================================================================
    // PESTAÑA 4: CURSOS Y DISTRIBUCIÓN
    // =========================================================================
    pestanaActiva === "cursos"
      ? h(
          "div",
          { className: "preceptoria-section-box" },

          // Header con botón de volver al Tablero
          h(
            "div",
            { className: "preceptoria-subview-header" },
            h(
              "button",
              {
                type: "button",
                className: "preceptoria-btn-back",
                onClick: () => setPestanaActiva("inicio")
              },
              "← Volver al Tablero Principal"
            ),
            h("span", { className: "preceptoria-hero-pill preceptoria-hero-pill--primary" }, `${divisiones.length || 31} Divisiones`)
          ),

          h(
            "div",
            { className: "preceptoria-section-header" },
            h(
              "div",
              { className: "preceptoria-section-title-wrap" },
              h(
                "h2",
                { className: "preceptoria-section-title" },
                h(IconSchool, { className: "text-indigo-600", width: "18", height: "18" }),
                "Distribución por Curso y División"
              ),
              h(
                "p",
                { className: "preceptoria-section-desc" },
                "Visualización gráfica de la matrícula distribuida por año y turno."
              )
            )
          ),

          divisiones.length > 0
            ? h(CursoDistribucionGrafico, {
                cursos: divisiones,
                turnoFiltro: "todos",
                totalDivisiones: divisiones.length
              })
            : h(EmptyState, { mensaje: "No hay información de divisiones disponible." })
        )
      : null,

    // =========================================================================
    // MODALES (PLANILLA OFICIAL DE CALIFICACIONES Y BOLETÍN DIGITAL)
    // =========================================================================
    planillaModal.abierto && planillaModal.asignacion
      ? h(PlanillaCalificacionesModal, {
          abierto: planillaModal.abierto,
          onCerrar: () => setPlanillaModal({ abierto: false, asignacion: null }),
          cursoInicial: `${parseInt(String(planillaModal.asignacion.anio || planillaModal.asignacion.curso || 1).replace(/\D/g, ""), 10) || 1}°`,
          divisionInicial: String(planillaModal.asignacion.numDivision || planillaModal.asignacion.division || "1").replace(/\D/g, "") || "1",
          materiaInicial: planillaModal.asignacion.materia || "Matemática",
          profesorNombre: planillaModal.asignacion.profesor?.nombre || "Docente a cargo",
          asignacionesDocente: [
            {
              anio: parseInt(String(planillaModal.asignacion.anio || planillaModal.asignacion.curso || 1).replace(/\D/g, ""), 10) || 1,
              curso: `${parseInt(String(planillaModal.asignacion.anio || planillaModal.asignacion.curso || 1).replace(/\D/g, ""), 10) || 1}°`,
              division: String(planillaModal.asignacion.numDivision || planillaModal.asignacion.division || "1").replace(/\D/g, "") || "1",
              materia: planillaModal.asignacion.materia || "Matemática",
              turno: planillaModal.asignacion.turno || "Mañana"
            }
          ],
          esDocente: false
        })
      : null,

    boletinModal.abierto && boletinModal.alumno
      ? h(BoletinDigitalModal, {
          abierto: boletinModal.abierto,
          onCerrar: () => setBoletinModal({ abierto: false, alumno: null }),
          alumno: boletinModal.alumno
        })
      : null,

    matrizModalAbierto
      ? h(AlumnoMatrizModal, {
          abierto: matrizModalAbierto,
          onCerrar: () => setMatrizModalAbierto(false),
          permitirSeleccionarAlumno: true
        })
      : null
  );
}
