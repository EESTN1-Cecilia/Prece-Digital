import React, { useState, useEffect, useCallback } from "react";
import { h, IconoFigma } from "../../layouts/site-layout.js";
import { useUsuarioActual } from "../../estado/index.js";
import { BotonVolverDireccion } from "../../components/common/boton-volver-direccion.js";
import { StudentsService } from "../students/students-service.js";
import { AsistenciasService, calcularMetricasPlanilla } from "../attendance/asistencias-service.js";
import { DocenteCursosGrafico } from "./docente-cursos-grafico.js";
import { cursosAsignadosDelDocente } from "../../utils/asignaciones-docente.js";

// Helper icons para las tarjetas de métricas del docente
function IconGroupUsers({ className }) {
  return h(
    "svg",
    {
      className: className || "kpi-icon",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "2",
      strokeLinecap: "round",
      strokeLinejoin: "round"
    },
    h("path", { d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" }),
    h("circle", { cx: "9", cy: "7", r: "4" }),
    h("path", { d: "M22 21v-2a4 4 0 0 0-3-3.87" }),
    h("path", { d: "M16 3.13a4 4 0 0 1 0 7.75" })
  );
}

function IconAcademicCap({ className }) {
  return h(
    "svg",
    {
      className: className || "kpi-icon",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "2",
      strokeLinecap: "round",
      strokeLinejoin: "round"
    },
    h("path", { d: "M22 10v6M2 10l10-5 10 5-10 5z" }),
    h("path", { d: "M6 12v5c0 2 2 3 6 3s6-1 6-3v-5" })
  );
}

function IconAttendanceCheck({ className }) {
  return h(
    "svg",
    {
      className: className || "kpi-icon",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "2",
      strokeLinecap: "round",
      strokeLinejoin: "round"
    },
    h("path", { d: "M9 11l3 3L22 4" }),
    h("path", { d: "M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" })
  );
}

function IconBookSubject({ className }) {
  return h(
    "svg",
    {
      className: className || "kpi-icon",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "2",
      strokeLinecap: "round",
      strokeLinejoin: "round"
    },
    h("path", { d: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20" }),
    h("path", { d: "M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" }),
    h("line", { x1: "8", y1: "6", x2: "16", y2: "6" }),
    h("line", { x1: "8", y1: "10", x2: "14", y2: "10" })
  );
}

function DocenteKpiGrid({
  totalEstudiantes,
  totalCursos,
  promedioAsistencia,
  totalMaterias,
  cicloLectivo,
  loading
}) {
  return h(
    "div",
    { className: "kpi-summary-grid docente-kpi-summary-grid" },

    // Card 1: Alumnos a Cargo (Azul)
    h(
      "div",
      { className: "kpi-metric-card kpi-metric-card--blue" },
      h(
        "div",
        { className: "kpi-metric-card__icon-box kpi-metric-card__icon-box--blue" },
        h(IconGroupUsers, null)
      ),
      h(
        "div",
        { className: "kpi-metric-card__content" },
        h("span", { className: "kpi-metric-card__label" }, "Alumnos a Cargo"),
        h("div", { className: "kpi-metric-card__value" }, loading ? "..." : totalEstudiantes),
        h(
          "div",
          { className: "kpi-metric-card__subrow" },
          h(
            "span",
            { className: "kpi-metric-card__period" },
            `${totalCursos} ${totalCursos === 1 ? "curso asignado" : "cursos asignados"}`
          ),
          h("span", { className: "kpi-metric-card__trend" }, "↗ Activos")
        )
      )
    ),

    // Card 2: Cursos Asignados (Violeta)
    h(
      "div",
      { className: "kpi-metric-card kpi-metric-card--purple" },
      h(
        "div",
        { className: "kpi-metric-card__icon-box kpi-metric-card__icon-box--purple" },
        h(IconAcademicCap, null)
      ),
      h(
        "div",
        { className: "kpi-metric-card__content" },
        h("span", { className: "kpi-metric-card__label" }, "Cursos a Cargo"),
        h("div", { className: "kpi-metric-card__value" }, loading ? "..." : totalCursos),
        h(
          "span",
          { className: "kpi-metric-card__subtext" },
          `Ciclo Lectivo ${cicloLectivo}`
        )
      )
    ),

    // Card 3: Asistencia Promedio (Verde)
    h(
      "div",
      { className: "kpi-metric-card kpi-metric-card--green" },
      h(
        "div",
        { className: "kpi-metric-card__icon-box kpi-metric-card__icon-box--green" },
        h(IconAttendanceCheck, null)
      ),
      h(
        "div",
        { className: "kpi-metric-card__content" },
        h("span", { className: "kpi-metric-card__label" }, "Asistencia Promedio"),
        h(
          "div",
          { className: "kpi-metric-card__value" },
          loading ? "..." : (promedioAsistencia !== null ? `${promedioAsistencia}%` : "100%")
        ),
        h(
          "span",
          { className: "kpi-metric-card__subtext" },
          promedioAsistencia !== null ? "Promedio en tus materias" : "Sin inasistencias computadas"
        )
      )
    ),

    // Card 4: Materias a Cargo (Ámbar)
    h(
      "div",
      { className: "kpi-metric-card kpi-metric-card--amber" },
      h(
        "div",
        { className: "kpi-metric-card__icon-box kpi-metric-card__icon-box--amber" },
        h(IconBookSubject, null)
      ),
      h(
        "div",
        { className: "kpi-metric-card__content" },
        h("span", { className: "kpi-metric-card__label" }, "Materias a Cargo"),
        h("div", { className: "kpi-metric-card__value" }, loading ? "..." : totalMaterias),
        h(
          "span",
          { className: "kpi-metric-card__subtext" },
          "Planillas habilitadas"
        )
      )
    )
  );
}

export default function DocenteDashboardView() {
  const user = useUsuarioActual();
  const [cursos, setCursos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [fechaHoy, setFechaHoy] = useState("");

  useEffect(() => {
    const d = new Date();
    const opt = { weekday: "long", day: "numeric", month: "long", year: "numeric" };
    const raw = new Intl.DateTimeFormat("es-AR", opt).format(d);
    setFechaHoy(raw.charAt(0).toUpperCase() + raw.slice(1));
  }, []);

  const formatFechaHora = (date) => {
    if (!date) return "";
    return new Intl.DateTimeFormat("es-AR", {
      dateStyle: "short",
      timeStyle: "medium"
    }).format(new Date(date));
  };

  const fetchCursos = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Consultamos divisiones de la institución (con matrícula real de la base de datos)
      const divisiones = await StudentsService.getDivisiones();

      // Cursos asignados a la cuenta del docente (desde su perfil de sesión o asignaciones registradas)
      const asignaciones = cursosAsignadosDelDocente(user);

      // Filtramos las divisiones de la institución para conservar las asignadas a este docente
      const cursosAsignados = (divisiones || []).filter((div) => {
        return asignaciones.some((asig) => {
          const anioAsig = String(asig.anio || asig.curso || "").replace(/\D/g, "");
          const anioDiv = String(div.anio || div.curso || "").replace(/\D/g, "");
          const divAsig = String(asig.division || "").trim();
          const divDiv = String(div.division || "").trim();
          return anioAsig === anioDiv && divAsig === divDiv;
        });
      });

      const now = new Date();
      const mesActual = now.getMonth() + 1;
      const anioActual = now.getFullYear();

      // Mapeamos los cursos con su materia correspondiente, matrícula real y planilla oficial de asistencias
      const cursosListos = await Promise.all(
        cursosAsignados.map(async (c) => {
          const asig = asignaciones.find((a) => {
            const anioAsig = String(a.anio || a.curso || "").replace(/\D/g, "");
            const anioDiv = String(c.anio || c.curso || "").replace(/\D/g, "");
            const divAsig = String(a.division || "").trim();
            const divDiv = String(c.division || "").trim();
            return anioAsig === anioDiv && divAsig === divDiv;
          });

          const anioNum = String(c.anio || c.curso || "1").replace(/\D/g, "");
          const divNum = String(c.division || "1").replace(/\D/g, "");
          const cursoId = `${anioNum}-${divNum}`;
          const materiaNombre = asig?.materia || c.materia || "";

          // Consultamos la planilla oficial de asistencias (idéntica a la pantalla del libro de asistencias)
          let metricas = null;
          let planilla = null;
          try {
            planilla = await AsistenciasService.getPlanilla(
              cursoId,
              mesActual,
              anioActual,
              materiaNombre
            );
            if (planilla) {
              metricas = calcularMetricasPlanilla(planilla);
            }
          } catch (err) {
            console.warn(`No se pudo obtener planilla para el curso ${cursoId}:`, err);
          }

          // Matrícula real: si la planilla obtuvo los alumnos reales de la base de datos, usamos su longitud
          const cantAlumnos = (planilla?.alumnos && planilla.alumnos.length > 0)
            ? planilla.alumnos.length
            : (Number(c.activos ?? c.cantidad) || 0);

          if (!metricas) {
            metricas = {
              porcentaje: 0,
              label: "0%",
              sinAlumnos: cantAlumnos === 0,
              sinRegistros: true,
              subtexto: cantAlumnos === 0 ? "Sin matrícula asignada" : "Sin asistencias registradas"
            };
          }

          return {
            ...c,
            cantidad: cantAlumnos,
            activos: cantAlumnos,
            materia: materiaNombre,
            asistencia: metricas
          };
        })
      );

      // Si el catálogo de la institución no matcheó por IDs, usamos asignaciones con cantidades reales de división
      if (cursosListos.length === 0) {
        const fallbackListos = await Promise.all(
          asignaciones.map(async (asig) => {
            const anioNum = String(asig.anio || asig.curso || "1").replace(/\D/g, "");
            const divNum = String(asig.division || "1").replace(/\D/g, "");
            const cursoId = `${anioNum}-${divNum}`;
            const divMatch = (divisiones || []).find((div) => {
              const anioDiv = String(div.anio || div.curso || "").replace(/\D/g, "");
              const divDiv = String(div.division || "").trim();
              return anioNum === anioDiv && divNum === divDiv;
            });

            let metricas = null;
            let planilla = null;
            try {
              planilla = await AsistenciasService.getPlanilla(
                cursoId,
                mesActual,
                anioActual,
                asig.materia
              );
              if (planilla) {
                metricas = calcularMetricasPlanilla(planilla);
              }
            } catch (err) {}

            const cantReal = (planilla?.alumnos && planilla.alumnos.length > 0)
              ? planilla.alumnos.length
              : (divMatch ? Number(divMatch.activos ?? divMatch.cantidad) || 0 : 0);

            if (!metricas) {
              metricas = {
                porcentaje: 0,
                label: "0%",
                sinAlumnos: cantReal === 0,
                sinRegistros: true,
                subtexto: cantReal === 0 ? "Sin matrícula asignada" : "Sin asistencias registradas"
              };
            }

            return {
              id: `${anioNum}-${divNum}`,
              curso: asig.curso || `${anioNum}°`,
              division: divNum,
              anio: Number(anioNum),
              turnoAula: asig.shiftId === "tarde" || asig.anio === 3 ? "Tarde" : "Mañana",
              turnoTaller: asig.shiftId === "tarde" || asig.anio === 3 ? "Mañana" : "Tarde",
              orientacion: divMatch?.orientacion || "Ciclo Básico",
              cantidad: cantReal,
              activos: cantReal,
              materia: asig.materia || "",
              asistencia: metricas
            };
          })
        );
        setCursos(fallbackListos);
      } else {
        setCursos(cursosListos);
      }
      setLastUpdated(new Date());
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

  const materiasUnicas = Array.from(new Set(cursos.map((c) => c.materia).filter(Boolean)));
  const totalMaterias = materiasUnicas.length > 0 ? materiasUnicas.length : (cursos.length || 0);

  const asistenciasCalculadas = cursos.map((c) => {
    if (c.asistencia && !c.asistencia.sinAlumnos && !c.asistencia.sinRegistros) {
      return c.asistencia.porcentaje;
    }
    const cant = Number(c.activos ?? c.cantidad) || 0;
    if (cant > 0) return 100;
    return null;
  }).filter((p) => p !== null);

  const promedioAsistencia = asistenciasCalculadas.length > 0
    ? Math.round(asistenciasCalculadas.reduce((a, b) => a + b, 0) / asistenciasCalculadas.length)
    : null;

  return h(
    "section",
    { className: "docente-dashboard-wrapper" },

    // Solo el director ve este boton para volver a su tablero.
    h(BotonVolverDireccion),

    // Bloque superior: en desktop conserva la disposición amplia (top-bar + hero-banner),
    // y en celular el contenedor azul unificado envuelve cabecera + las 4 tarjetas de métricas permitidas.
    h(
      "div",
      { className: "docente-home-hero-group" },

      // 0. Barra superior institucional (desktop)
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

      // 1. Hero Banner Institucional del Docente (desktop)
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

      // 2. Cabecera móvil compacta integrada en el bloque azul (mobile <= 768px)
      h(
        "header",
        { className: "docente-home-header" },
        h(
          "div",
          { className: "docente-home-header__copy" },
          h(
            "div",
            { className: "docente-home-header__brand" },
            h("img", {
              src: "/assets/precelogo.jpeg",
              alt: "",
              className: "docente-home-header__logo",
              "aria-hidden": "true"
            }),
            h("span", { className: "docente-eyebrow" }, escuelaNombre)
          ),
          h("h1", { className: "docente-title" }, `¡Hola, ${nombreDocente}!`),
          lastUpdated
            ? h("p", { className: "docente-last-updated" }, `Actualizado ${formatFechaHora(lastUpdated)}`)
            : null
        ),
        h(
          "button",
          {
            type: "button",
            className: "btn-actualizar-datos",
            onClick: fetchCursos,
            disabled: loading
          },
          h(IconoFigma, { className: "btn-actualizar-icon", nombre: "filter" }),
          h("span", null, loading ? "Actualizando..." : "Actualizar")
        )
      ),

      // 3. Grilla 2x2 de métricas permitidas (KPI Cards)
      h(DocenteKpiGrid, {
        totalEstudiantes,
        totalCursos: cursos.length,
        promedioAsistencia,
        totalMaterias,
        cicloLectivo,
        loading
      })
    ),

    // 2. Gráficos interactivos del Docente (Contenedores compactos: Matrícula y Asistencia por curso)
    h(DocenteCursosGrafico, { cursos, loading }),

    // 3. Módulos Autorizados del Docente (KPI Cards)
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
            h("h2", { className: "docente-module-name" }, "Planilla de Calificaciones"),
            h(
              "p",
              { className: "docente-module-desc" },
              "Planilla oficial de calificaciones por materia, informes valorativos e intensificación para tus cursos a cargo."
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
            "Cargar Calificaciones ➔"
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

    // 4. Nota Informativa Oficial PBA
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
