import React, { useState, useEffect, useCallback, Fragment } from "react";
import { h, ActionButton, IconoFigma } from "../../layouts/site-layout.js";
import { DashboardCard } from "../../components/dashboard/dashboard-card.js";
import { SummaryCard } from "../../components/dashboard/summary-card.js";
import { AlertCard } from "../../components/dashboard/alert-card.js";
import { QuickAccessGrid } from "../../components/dashboard/quick-access-grid.js";
import { CursoDistribucionGrafico } from "../../components/dashboard/curso-distribucion-grafico.js";
import { LoadingState, EmptyState, ErrorState, StatusBadge} from "../../components/common/state-handlers.js";
import { SecretariaService } from "./secretaria-service.js";
import { useUsuarioActual } from "../../estado/index.js";
import { AlumnoMatrizModal } from "../students/alumno-matriz-wiew.js";

// Helper icons para las tarjetas de métricas
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

function IconUserVerified({ className }) {
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
    h("polyline", { points: "16 11 18 13 22 9" })
  );
}

function IconUserAdd({ className }) {
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
    h("line", { x1: "19", y1: "8", x2: "19", y2: "14" }),
    h("line", { x1: "16", y1: "11", x2: "22", y2: "11" })
  );
}

function IconUserRemove({ className }) {
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
    h("line", { x1: "22", y1: "11", x2: "16", y2: "11" })
  );
}

export default function SecretariaDashboardView() {
  const user = useUsuarioActual();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [selectedTurnoFilter, setSelectedTurnoFilter] = useState("todos");
  const [selectedOrientacionFilter, setSelectedOrientacionFilter] = useState("todas");
  const [matrizModalAbierto, setMatrizModalAbierto] = useState(false);

  // Apertura del Libro Matriz desde otros componentes
  useEffect(() => {
    const handleOpenMatriz = () => {
      setMatrizModalAbierto(true);
    };
    window.addEventListener("prece:open_matriz_modal", handleOpenMatriz);
    return () => {
      window.removeEventListener("prece:open_matriz_modal", handleOpenMatriz);
    };
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await SecretariaService.getDashboardData();
      setData(result);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err.message || "Error al consultar la información institucional de la base de datos.");
    } finally {
      setLoading(false);
    }
  }, []);

  /* El acceso lo decide la tabla de rutas (app/rutas.js) segun los permisos. */
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDismissAlert = async (alertId) => {
    await SecretariaService.dismissAlert(alertId);
    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        alertas: prev.alertas.filter((a) => a.id !== alertId)
      };
    });
  };

  const formatFechaHora = (date) => {
    if (!date) return "";
    return new Intl.DateTimeFormat("es-AR", {
      dateStyle: "short",
      timeStyle: "medium"
    }).format(new Date(date));
  };

  const formatFechaBanner = (date) => {
    const d = date ? new Date(date) : new Date();
    const options = { weekday: "long", day: "numeric", month: "long", year: "numeric" };
    const raw = new Intl.DateTimeFormat("es-AR", options).format(d);
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  };

  // Filtrado de cursos por turno y orientación
  const cursosFiltrados = (data?.alumnosPorCurso || []).filter((c) => {
    const turnoCurso = String(c.turnoAula || c.turno || "").toLowerCase();
    const coincideTurno =
      selectedTurnoFilter === "todos" ||
      turnoCurso.includes(selectedTurnoFilter.toLowerCase());

    const coincideOrientacion =
      selectedOrientacionFilter === "todas" ||
      String(c.orientacion ?? "").toLowerCase().includes(selectedOrientacionFilter.toLowerCase());

    return coincideTurno && coincideOrientacion;
  });

  const totalAlumnos = data?.resumenAlumnos?.total ?? 0;
  const activosAlumnos = data?.resumenAlumnos?.activos ?? 0;
  const inactivosAlumnos = data?.resumenAlumnos?.inactivos ?? 0;
  const nuevasInscripciones = data?.resumenAlumnos?.nuevasInscripciones ?? totalAlumnos;

  return h(
    "section",
    { className: "secretaria-dashboard" },

    // Barra superior con datos institucionales (sin switch de roles)
    h(
      "div",
      { className: "secretaria-top-bar" },
      h(
        "div",
        { className: "secretaria-eyebrow" },
        `${data?.institucion?.nombre || user.escuela || "E.E.S.T N° 1 MONTE GRANDE"}`
      )
    ),

    // Título institucional y botón "Actualizar datos"
    h(
      "div",
      { className: "secretaria-title-row" },
      h(
        "div",
        null,
        h("h1", { className: "secretaria-title" }, "Dashboard de Secretaría"),
        lastUpdated
          ? h("p", { className: "secretaria-last-updated" }, `Última actualización: ${formatFechaHora(lastUpdated)}`)
          : h("p", { className: "secretaria-last-updated" }, "Panel de control institucional")
      ),
      h(
        "div",
        { className: "secretaria-title-actions" },
        h(
          "button",
          {
            type: "button",
            className: "btn-actualizar-datos",
            onClick: fetchData
          },
          h(IconoFigma, { className: "btn-actualizar-icon", nombre: "filter" }),
          h("span", null, loading ? "Actualizando..." : "Actualizar datos")
        )
      )
    ),

    // Estado de Carga
    loading && !data ? h(LoadingState, { mensaje: "Consultando base de datos institucional..." }) : null,

    // Estado de Error
    error && !data ? h(ErrorState, { mensaje: error, onRetry: fetchData }) : null,

    // Contenido del Dashboard cuando hay datos
    data
      ? h(
          Fragment,
          null,

          // 1. Banner Principal con Fecha y Escudo Institucional Notorio
          h(
            "div",
            { className: "dashboard-hero-banner" },
            h(
              "div",
              { className: "dashboard-hero-banner__left" },
              h("h2", { className: "dashboard-hero-banner__date" }, formatFechaBanner(new Date())),
              h(
                "p",
                { className: "dashboard-hero-banner__text" },
                "Aquí tenés un resumen de la gestión institucional de la escuela."
              )
            ),
            h(
              "div",
              { className: "dashboard-hero-badge" },
              h(
                "div",
                { className: "school-crest-avatar" },
                h("img", {
                  src: "/assets/tecnica-n1-monte-grande.png",
                  alt: "Escudo E.E.S.T N°1",
                  className: "school-crest-img",
                  onError: (e) => {
                    e.currentTarget.src = "/assets/Técnica_N°1_Monte_Grande.png";
                  }
                })
              ),
              h(
                "div",
                { className: "school-crest-text" },
                h("strong", { className: "school-crest-title" }, "E.E.S.T N°1"),
                h("span", { className: "school-crest-subtitle" }, "Monte Grande")
              )
            )
          ),

          // 2. Resumen General de Alumnos & Distribución por Turnos
          h(
            "div",
            { className: "secretaria-summary-layout" },

            // Columna Izquierda: Grilla 2x2 de métricas con cajas de colores y hover temático
            h(
              "div",
              { className: "kpi-summary-grid" },

              // Card 1: Total de Alumnos (Azul)
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
                  h("span", { className: "kpi-metric-card__label" }, "Total de Alumnos"),
                  h("div", { className: "kpi-metric-card__value" }, totalAlumnos),
                  h(
                    "div",
                    { className: "kpi-metric-card__subrow" },
                    h("span", { className: "kpi-metric-card__period" }, `Ciclo ${data?.institucion?.cicloLectivo || 2026}`),
                    h("span", { className: "kpi-metric-card__trend" }, `↗ +${totalAlumnos} este mes`)
                  )
                )
              ),

              // Card 2: Alumnos Activos (Violeta)
              h(
                "div",
                { className: "kpi-metric-card kpi-metric-card--purple" },
                h(
                  "div",
                  { className: "kpi-metric-card__icon-box kpi-metric-card__icon-box--purple" },
                  h(IconUserVerified, null)
                ),
                h(
                  "div",
                  { className: "kpi-metric-card__content" },
                  h("span", { className: "kpi-metric-card__label" }, "Alumnos Activos"),
                  h("div", { className: "kpi-metric-card__value" }, activosAlumnos),
                  h(
                    "span",
                    { className: "kpi-metric-card__subtext" },
                    `${totalAlumnos ? ((activosAlumnos / totalAlumnos) * 100).toFixed(1).replace(".", ",") : "0"}% del padrón`
                  )
                )
              ),

              // Card 3: Nuevas Inscripciones (Verde)
              h(
                "div",
                { className: "kpi-metric-card kpi-metric-card--green" },
                h(
                  "div",
                  { className: "kpi-metric-card__icon-box kpi-metric-card__icon-box--green" },
                  h(IconUserAdd, null)
                ),
                h(
                  "div",
                  { className: "kpi-metric-card__content" },
                  h("span", { className: "kpi-metric-card__label" }, "Nuevas Inscripciones"),
                  h("div", { className: "kpi-metric-card__value" }, nuevasInscripciones),
                  h("span", { className: "kpi-metric-card__subtext" }, "En proceso")
                )
              ),

              // Card 4: Bajas / Egresos (Ámbar)
              h(
                "div",
                { className: "kpi-metric-card kpi-metric-card--amber" },
                h(
                  "div",
                  { className: "kpi-metric-card__icon-box kpi-metric-card__icon-box--amber" },
                  h(IconUserRemove, null)
                ),
                h(
                  "div",
                  { className: "kpi-metric-card__content" },
                  h("span", { className: "kpi-metric-card__label" }, "Bajas / Egresos"),
                  h("div", { className: "kpi-metric-card__value" }, inactivosAlumnos),
                  h("span", { className: "kpi-metric-card__subtext" }, "Requieren revisión")
                )
              )
            ),

            // Columna Derecha: DISTRIBUCIÓN POR TURNOS con barras de progreso
            h(
              "div",
              { className: "turnos-side-card" },
              h("span", { className: "turnos-side-card__label" }, "DISTRIBUCIÓN POR TURNOS"),
              h(
                "div",
                { className: "turnos-side-card__value" },
                `${data.resumenAlumnos?.porTurno?.length ?? 2} turnos`
              ),
              (data.resumenAlumnos?.porTurno ?? []).map((t) => {
                const pct = t.porcentaje || (totalAlumnos > 0 ? (t.cantidad / totalAlumnos) * 100 : 50);
                return h(
                  "div",
                  { key: t.turno, className: "turno-progress-item" },
                  h(
                    "div",
                    { className: "turno-progress-header" },
                    h("span", { className: "turno-progress-name" }, t.turno),
                    h("span", { className: "turno-progress-count" }, t.cantidad)
                  ),
                  h(
                    "div",
                    { className: "turno-progress-bar-bg" },
                    h("div", {
                      className: "turno-progress-bar-fill",
                      style: { width: `${Math.min(100, Math.max(6, pct))}%` }
                    })
                  )
                );
              })
            )
          ),

          // 2. Accesos Rápidos
          h(
            DashboardCard,
            {
              title: "Accesos Rápidos a Módulos",
              icon: "filter",
              className: "dashboard-card--highlight"
            },
            h(QuickAccessGrid, {
              userPermissions: user.permisos,
              onOpenMatriz: () => setMatrizModalAbierto(true)
            })
          ),

          // 3. Grilla de 2 Columnas Verticales
          h(
            "div",
            { className: "secretaria-grid-2col" },

            // Columna Izquierda: Distribución por Curso y División + Alertas de Secretaría
            h(
              "div",
              { className: "secretaria-grid-column" },

              // 3.1 Tarjeta de Distribución de Cursos y Divisiones
              h(
                DashboardCard,
                {
                  title: "Distribución por Curso y División",
                  icon: "people",
                  badge: `${cursosFiltrados.length} Divisiones`,
                  actions: h(
                    "div",
                    { className: "filters-toolbar" },
                    h(
                      "div",
                      { className: "filter-pills" },
                      ["todos", "mañana", "tarde"].map((turno) =>
                        h(
                          "button",
                          {
                            key: turno,
                            type: "button",
                            className: `filter-pill ${selectedTurnoFilter === turno ? "active" : ""}`,
                            onClick: () => setSelectedTurnoFilter(turno)
                          },
                          turno.charAt(0).toUpperCase() + turno.slice(1)
                        )
                      )
                    )
                  )
                },
                cursosFiltrados.length === 0
                  ? h(EmptyState, { mensaje: "No hay cursos registrados para los filtros seleccionados." })
                  : h(CursoDistribucionGrafico, {
                      cursos: cursosFiltrados,
                      turnoFiltro: selectedTurnoFilter,
                      totalDivisiones: data?.alumnosPorCurso?.length || 19
                    })
              ),

              // 3.2 Tarjeta de Registro de Actividad y Auditoría Reciente
              h(
                DashboardCard,
                {
                  title: "Registro de Actividad y Auditoría Reciente",
                  icon: "activity",
                  badge: `${data.actividadReciente?.length || 0} eventos`,
                  collapsible: true
                },
                data.actividadReciente?.length === 0
                  ? h(EmptyState, { mensaje: "No hay actividades registradas recientemente." })
                  : h(
                      "div",
                      { className: "activity-timeline-list" },
                      data.actividadReciente?.map((item, idx) => {
                        const initials = ["GB", "MP", "GB", "AR"][idx % 4] || "GB";
                        return h(
                          "div",
                          { key: item.id, className: "activity-item-row" },
                          h(
                            "div",
                            { className: "activity-item-left" },
                            h("div", { className: "activity-avatar" }, initials),
                            h(
                              "div",
                              { className: "activity-info" },
                              h("strong", { className: "activity-title" }, item.descripcion),
                              h("span", { className: "activity-subtitle" }, item.recurso || `Por: ${item.usuario}`)
                            )
                          ),
                          h("time", { className: "activity-time" }, item.fecha)
                        );
                      })
                    )
              )
            ),

            // Columna Derecha: Resumen de Inasistencias + Situaciones Académicas Relevantes
            h(
              "div",
              { className: "secretaria-grid-column" },

              // 3.3 Tarjeta de Inasistencias Institucionales
              h(
                DashboardCard,
                {
                  title: "Resumen de Inasistencias Institucionales",
                  icon: "attendance",
                  actions: h(
                    "a",
                    { href: "#/asistencias", className: "attendance-module-link" },
                    "Módulo Asistencias",
                    h(
                      "svg",
                      {
                        width: "13",
                        height: "13",
                        viewBox: "0 0 24 24",
                        fill: "none",
                        stroke: "currentColor",
                        strokeWidth: "2.5",
                        strokeLinecap: "round",
                        strokeLinejoin: "round"
                      },
                      h("polyline", { points: "6 9 12 15 18 9" })
                    )
                  )
                },
                h(
                  "div",
                  { className: "attendance-summary-banner" },
                  h("div", { className: "attendance-metric" },
                    h("strong", null, data.inasistencias?.totalInasistencias || 0),
                    h("span", null, "Total Inasistencias")
                  ),
                  h("div", { className: "attendance-metric text-success" },
                    h("strong", null, data.inasistencias?.justificadas || 0),
                    h("span", null, "Justificadas")
                  ),
                  h("div", { className: "attendance-metric text-danger" },
                    h("strong", null, data.inasistencias?.injustificadas || 0),
                    h("span", null, "Injustificadas")
                  )
                ),
                h("h4", { className: "subsection-title" }, "Alumnos que requieren atención:"),
                data.inasistencias?.alumnosAtencion?.length === 0
                  ? h(EmptyState, { mensaje: "No hay alumnos en situación crítica de inasistencias." })
                  : h(
                      "ul",
                      { className: "attention-list" },
                      data.inasistencias?.alumnosAtencion?.map((al) =>
                        h(
                          "li",
                          { key: al.id, className: "attention-list__item" },
                          h(
                            "div",
                            null,
                            h("strong", { className: "attention-list__name" }, al.nombre),
                            h("span", { className: "attention-list__course" }, `Legajo: ${al.legajo} • Curso: ${al.curso}`)
                          ),
                          h(
                            "div",
                            { className: "attention-list__right" },
                            h("span", { className: "attention-list__faltas" }, `${al.faltas} faltas`),
                            h(StatusBadge, { status: al.estado })
                          )
                        )
                      )
                    )
              ),

              // 3.4 Tarjeta de Situaciones Académicas Relevantes
              h(
                DashboardCard,
                {
                  title: "Situaciones Académicas Relevantes",
                  icon: "academic"
                },
                h(
                  "div",
                  { className: "academic-overview-metrics" },
                  h("div", { className: "academic-badge" },
                    h("strong", null, data.situacionesAcademicas?.totalMateriasPendientes || 0),
                    h("span", null, "Materias Previas")
                  ),
                  h("div", { className: "academic-badge" },
                    h("strong", null, data.situacionesAcademicas?.totalMateriasDesaprobadas || 0),
                    h("span", null, "Materias Desaprobadas")
                  ),
                  h("div", { className: "academic-badge" },
                    h("strong", null, data.situacionesAcademicas?.evaluacionesPendientes || 0),
                    h("span", null, "Mesas de Examen")
                  )
                ),
                h("h4", { className: "subsection-title" }, "Casos para revisión:"),
                data.situacionesAcademicas?.casosDestacados?.length === 0
                  ? h(EmptyState, { mensaje: "Sin casos académicos pendientes de revisión." })
                  : h(
                      "div",
                      { className: "academic-cases" },
                      data.situacionesAcademicas?.casosDestacados?.map((caso) =>
                        h(
                          "div",
                          { key: caso.id, className: "academic-case-card" },
                          h(
                            "div",
                            { className: "academic-case-card__header" },
                            h("strong", null, caso.alumno),
                            h(StatusBadge, { status: caso.situacion })
                          ),
                          h("p", { className: "academic-case-card__detail" }, caso.detalle),
                          h("span", { className: "academic-case-card__course" }, `Curso: ${caso.curso}`)
                        )
                      )
                    )
              )
            )
          )
        )
      : null,
    h(AlumnoMatrizModal, {
      abierto: matrizModalAbierto,
      onCerrar: () => setMatrizModalAbierto(false)
    })
  );
}
