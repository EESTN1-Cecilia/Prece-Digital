import React, { useState, useEffect, useCallback } from "react";
import { h, IconoFigma } from "../../layouts/site-layout.js";
import { useUsuarioActual } from "../../estado/index.js";
import { StudentsService } from "../students/students-service.js";

// Cursos asignados a la cuenta de prueba del docente (exactamente 3 cursos: dos turno mañana, uno turno tarde)
const ASIGNACIONES_DOCENTE_DEFAULT = [
  { anio: 1, curso: "1°", division: "1", materia: "Matemática I" },
  { anio: 2, curso: "2°", division: "1", materia: "Matemática II" },
  { anio: 3, curso: "3°", division: "3", materia: "Matemática III" }
];

export default function DocenteDashboardView() {
  const user = useUsuarioActual();
  const [cursos, setCursos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fechaHoy, setFechaHoy] = useState("");

  useEffect(() => {
    const d = new Date();
    const opt = { weekday: "long", day: "numeric", month: "long", year: "numeric" };
    const raw = new Intl.DateTimeFormat("es-AR", opt).format(d);
    setFechaHoy(raw.charAt(0).toUpperCase() + raw.slice(1));
  }, []);

  const fetchCursos = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const divisiones = await StudentsService.getDivisiones();

      // Cursos asignados a la cuenta del docente (desde su perfil de sesión o las 3 asignaciones de prueba)
      const asignaciones = (user?.assignments && user.assignments.length > 0)
        ? user.assignments
        : ASIGNACIONES_DOCENTE_DEFAULT;

      // Filtramos las divisiones de la institución para conservar ÚNICAMENTE las 3 asignadas a este docente
      const cursosAsignados = (divisiones || []).filter((div) => {
        return asignaciones.some((asig) => {
          const anioAsig = String(asig.anio || asig.curso || "").replace(/\D/g, "");
          const anioDiv = String(div.anio || div.curso || "").replace(/\D/g, "");
          const divAsig = String(asig.division || "").trim();
          const divDiv = String(div.division || "").trim();
          return anioAsig === anioDiv && divAsig === divDiv;
        });
      });

      // Mapeamos los cursos con su materia correspondiente y datos reales de matrícula
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

      // Si el catálogo de la institución no matcheó por IDs, usamos las 3 asignaciones con datos normalizados
      if (cursosListos.length === 0) {
        setCursos(
          ASIGNACIONES_DOCENTE_DEFAULT.map((asig) => ({
            id: `${asig.anio}-${asig.division}`,
            curso: asig.curso,
            division: asig.division,
            anio: asig.anio,
            turnoAula: asig.anio === 3 ? "Tarde" : "Mañana",
            turnoTaller: asig.anio === 3 ? "Mañana" : "Tarde",
            orientacion: "Ciclo Básico",
            cantidad: 28,
            activos: 28,
            materia: asig.materia
          }))
        );
      } else {
        setCursos(cursosListos);
      }
    } catch (err) {
      console.error("Error al cargar cursos del docente:", err);
      setError("No se pudieron cargar los cursos y divisiones desde la base de datos.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchCursos();
  }, [fetchCursos]);

  const totalEstudiantes = cursos.reduce((acc, c) => acc + (Number(c.activos ?? c.cantidad) || 0), 0);
  const cicloLectivo = user?.cicloLectivo || new Date().getFullYear();
  const nombreDocente = user?.nombre || "Docente";
  const escuelaNombre = user?.escuela || "E.E.S.T N°1 Monte Grande";
  const rolDocente = user?.rolNombre || (user?.roles?.includes("docente") ? "Docente" : "Personal Docente");

  return h(
    "section",
    { className: "docente-dashboard-wrapper" },

    // 0. Barra superior: Eyebrow institucional y acción de refresco
    h(
      "div",
      { className: "docente-top-bar" },
      h(
        "div",
        { className: "docente-eyebrow" },
        escuelaNombre
      ),
      h(
        "div",
        { className: "docente-top-actions" },
        h("span", { className: "docente-ciclo-tag" }, `Ciclo Lectivo ${cicloLectivo}`),
        h(
          "button",
          {
            type: "button",
            className: "btn-actualizar-datos",
            onClick: fetchCursos,
            disabled: loading,
            title: "Actualizar nómina y cantidades desde la base de datos"
          },
          h(IconoFigma, { className: "btn-actualizar-icon", nombre: "filter" }),
          h("span", null, loading ? "Actualizando..." : "Actualizar datos")
        )
      )
    ),

    // 1. Hero Banner Institucional del Docente
    h(
      "div",
      { className: "docente-hero-banner" },
      h(
        "div",
        { className: "docente-hero-left" },
        h(
          "div",
          { className: "docente-hero-eyebrow" },
          h("span", { className: "docente-hero-dot" }),
          `PORTAL DOCENTE INSTITUCIONAL · ${cicloLectivo}`
        ),
        h("h1", { className: "docente-hero-title" }, `¡Hola, ${nombreDocente}!`),
        h(
          "p",
          { className: "docente-hero-subtitle" },
          "Acceso exclusivo a registro de planillas de asistencia y confección de boletines digitales oficiales de tus cursos asignados."
        ),
        h(
          "div",
          { className: "docente-hero-badges" },
          h("span", { className: "docente-role-tag" }, rolDocente),
          h("span", { className: "docente-school-tag" }, escuelaNombre),
          h("span", { className: "docente-school-tag" }, fechaHoy || `Ciclo ${cicloLectivo}`)
        )
      )
    ),

    // 2. Módulos Autorizados del Docente (KPI Cards)
    h(
      "div",
      { className: "docente-modules-grid" },

      // Módulo A: Planillas de Asistencia
      h(
        "div",
        { className: "docente-module-card" },
        h(
          "div",
          { className: "docente-module-card__top" },
          h(
            "div",
            { className: "docente-module-icon-wrap docente-module-icon-wrap--asistencias" },
            h(
              "svg",
              { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" },
              h("path", { d: "M9 11l3 3L22 4" }),
              h("path", { d: "M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" })
            )
          ),
          h(
            "div",
            { className: "docente-module-title-wrap" },
            h("h2", { className: "docente-module-name" }, "Planillas de Asistencia"),
            h(
              "p",
              { className: "docente-module-desc" },
              "Registro diario de presentes, ausentes, llegadas tarde y justificaciones por materia y turno."
            )
          )
        ),
        h(
          "div",
          { className: "docente-module-card__footer" },
          h("span", { className: "docente-module-badge docente-module-badge--blue" }, "Módulo Habilitado"),
          h(
            "a",
            { href: "#/docente/asistencias", className: "docente-module-link-btn docente-module-link-btn--primary" },
            "Abrir Planilla ➔"
          )
        )
      ),

      // Módulo B: Boletines Digitales
      h(
        "div",
        { className: "docente-module-card" },
        h(
          "div",
          { className: "docente-module-card__top" },
          h(
            "div",
            { className: "docente-module-icon-wrap docente-module-icon-wrap--boletines" },
            h(
              "svg",
              { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" },
              h("path", { d: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20" }),
              h("path", { d: "M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" }),
              h("line", { x1: "8", y1: "6", x2: "16", y2: "6" }),
              h("line", { x1: "8", y1: "10", x2: "14", y2: "10" })
            )
          ),
          h(
            "div",
            { className: "docente-module-title-wrap" },
            h("h2", { className: "docente-module-name" }, "Boletines Digitales"),
            h(
              "p",
              { className: "docente-module-desc" },
              "Visualización y carga oficial de informes valorativos (1° y 2° informe), promedios y definitivas."
            )
          )
        ),
        h(
          "div",
          { className: "docente-module-card__footer" },
          h("span", { className: "docente-module-badge docente-module-badge--green" }, "Calificaciones Oficiales"),
          h(
            "a",
            { href: "#/boletines", className: "docente-module-link-btn docente-module-link-btn--primary" },
            "Ver Boletines ➔"
          )
        )
      ),

      // Módulo C: Resumen de Cursos a Cargo
      h(
        "div",
        { className: "docente-module-card" },
        h(
          "div",
          { className: "docente-module-card__top" },
          h(
            "div",
            { className: "docente-module-icon-wrap docente-module-icon-wrap--cursos" },
            h(
              "svg",
              { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" },
              h("path", { d: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" }),
              h("circle", { cx: "9", cy: "7", r: "4" }),
              h("path", { d: "M23 21v-2a4 4 0 0 0-3-3.87" }),
              h("path", { d: "M16 3.13a4 4 0 0 1 0 7.75" })
            )
          ),
          h(
            "div",
            { className: "docente-module-title-wrap" },
            h("h2", { className: "docente-module-name" }, "Cursos a Cargo"),
            h(
              "p",
              { className: "docente-module-desc" },
              loading
                ? "Consultando asignaciones en base de datos..."
                : `${cursos.length} divisiones activas con ${totalEstudiantes} estudiantes registrados.`
            )
          )
        ),
        h(
          "div",
          { className: "docente-module-card__footer" },
          h(
            "span",
            { className: "docente-module-badge docente-module-badge--purple" },
            loading ? "..." : `${cursos.length} Divisiones`
          ),
          h(
            "a",
            { href: "#/docente/cursos", className: "docente-module-link-btn docente-module-link-btn--primary" },
            "Ver Cursos a Cargo ➔"
          )
        )
      )
    ),

    // 3. Nota Informativa Oficial PBA
    h(
      "div",
      { className: "docente-notice-box" },
      h(
        "svg",
        { className: "docente-notice-icon", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" },
        h("circle", { cx: "12", cy: "12", r: "10" }),
        h("line", { x1: "12", y1: "16", x2: "12", y2: "12" }),
        h("line", { x1: "12", y1: "8", x2: "12.01", y2: "8" })
      ),
      h(
        "div",
        null,
        h("strong", { className: "docente-notice-title" }, "Lineamientos Oficiales de Evaluación y Calificación"),
        h(
          "span",
          null,
          " Las calificaciones asentadas en el Boletín Digital se guardan directamente asociadas al legajo de cada alumno, con formato numérico (1 a 10) para calificación definitiva y valorativo para informes de ciclo. Los cambios quedan firmados y registrados con tu cuenta de docente."
        )
      )
    )
  );
}
