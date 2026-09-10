import React, { useState, useEffect, useCallback, Fragment } from "react";
import { h, ActionButton, IconoFigma } from "../../layouts/site-layout.js";
import { DashboardCard } from "../../components/dashboard/dashboard-card.js";
import { SummaryCard } from "../../components/dashboard/summary-card.js";
import { AlertCard } from "../../components/dashboard/alert-card.js";
import { QuickAccessGrid } from "../../components/dashboard/quick-access-grid.js";
import { RoleSwitch } from "../../components/common/role-switch.js";
import { LoadingState, EmptyState, ErrorState, StatusBadge, AccessDeniedState } from "../../components/common/state-handlers.js";
import { SecretariaService } from "./secretaria-service.js";
import { AuthService } from "../../services/auth-service.js";

export default function SecretariaDashboardView() {
  const [user, setUser] = useState(AuthService.getCurrentUser());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [selectedTurnoFilter, setSelectedTurnoFilter] = useState("todos");
  const [selectedOrientacionFilter, setSelectedOrientacionFilter] = useState("todas");

  // Escuchar cambios de rol globales
  useEffect(() => {
    const handleRoleChanged = (e) => {
      setUser(e.detail);
    };
    window.addEventListener("auth:role_changed", handleRoleChanged);
    return () => window.removeEventListener("auth:role_changed", handleRoleChanged);
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

  useEffect(() => {
    if (user.rol === "secretaria") {
      fetchData();
    }
  }, [user, fetchData]);

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

  const handleSwitchRole = (newRole) => {
    const updatedUser = AuthService.switchRole(newRole);
    setUser(updatedUser);
  };

  const formatFechaHora = (date) => {
    if (!date) return "";
    return new Intl.DateTimeFormat("es-AR", {
      dateStyle: "short",
      timeStyle: "medium"
    }).format(new Date(date));
  };

  // Si el usuario tiene rol preceptor, mostramos control de acceso con botón para cambiar
  if (user.rol !== "secretaria") {
    return h(
      "section",
      { className: "secretaria-dashboard" },
      h(
        "div",
        { className: "dashboard-top-bar" },
        h(RoleSwitch, { activeRole: user.rol, onToggle: handleSwitchRole })
      ),
      h(AccessDeniedState, {
        rolRequerido: "Secretaría",
        onSwitchRole: handleSwitchRole
      })
    );
  }

  // Filtrado de cursos por turno y orientación
  const cursosFiltrados = (data?.alumnosPorCurso || []).filter((c) => {
    const coincideTurno =
      selectedTurnoFilter === "todos" ||
      c.turnoAula.toLowerCase().includes(selectedTurnoFilter.toLowerCase()) ||
      c.turnoTaller.toLowerCase().includes(selectedTurnoFilter.toLowerCase());

    const coincideOrientacion =
      selectedOrientacionFilter === "todas" ||
      c.orientacion.toLowerCase().includes(selectedOrientacionFilter.toLowerCase());

    return coincideTurno && coincideOrientacion;
  });

  return h(
    "section",
    { className: "secretaria-dashboard" },

    // Barra superior con Switch de Rol y datos institucionales
    h(
      "div",
      { className: "secretaria-top-bar" },
      h(
        "div",
        { className: "secretaria-eyebrow" },
        `${data?.institucion?.nombre || user.escuela} · CICLO ${data?.institucion?.cicloLectivo || user.cicloLectivo || 2026}`
      ),
      h(RoleSwitch, { activeRole: user.rol, onToggle: handleSwitchRole })
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
          : null
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

          // 1. Resumen General de Alumnos (Imitando exactamente el boceto)
          h(
            "div",
            { className: "secretaria-summary-layout" },

            // Columna Izquierda: 3 tarjetas de métricas + Banner celeste
            h(
              "div",
              { className: "summary-main-col" },
              h(
                "div",
                { className: "summary-cards-row" },
                h(
                  "div",
                  { className: "metric-box-card" },
                  h("span", { className: "metric-box-card__label" }, "TOTAL DE ALUMNOS"),
                  h("div", { className: "metric-box-card__value" }, data.resumenAlumnos?.total || 814),
                  h("span", { className: "metric-box-card__subtext" }, `Ciclo ${data?.institucion?.cicloLectivo || 2026}`)
                ),
                h(
                  "div",
                  { className: "metric-box-card" },
                  h("span", { className: "metric-box-card__label" }, "ACTIVOS"),
                  h("div", { className: "metric-box-card__value" }, data.resumenAlumnos?.activos || 792),
                  h(
                    "span",
                    { className: "metric-box-card__subtext" },
                    `${data.resumenAlumnos?.total ? ((data.resumenAlumnos.activos / data.resumenAlumnos.total) * 100).toFixed(1).replace(".", ",") : "97,3"}% del padrón`
                  )
                ),
                h(
                  "div",
                  { className: "metric-box-card" },
                  h("span", { className: "metric-box-card__label" }, "INACTIVOS"),
                  h("div", { className: "metric-box-card__value" }, data.resumenAlumnos?.inactivos || 22),
                  h("span", { className: "metric-box-card__subtext" }, "Requieren revisión")
                )
              ),
              // Banner celeste inferior
              h(
                "div",
                { className: "summary-banner-card" },
                h("h3", { className: "summary-banner-card__title" }, "Resumen general de alumnos"),
                h("p", { className: "summary-banner-card__text" }, "Vista consolidada del ciclo lectivo 2026 con altas, bajas y estado de matrícula por turno.")
              )
            ),

            // Columna Derecha: DISTRIBUCIÓN POR TURNOS con barras de progreso
            h(
              "div",
              { className: "turnos-side-card" },
              h("span", { className: "turnos-side-card__label" }, "DISTRIBUCIÓN POR TURNOS"),
              h("div", { className: "turnos-side-card__value" }, `${data.resumenAlumnos?.porTurno?.length || 2} turnos`),
              (data.resumenAlumnos?.porTurno || [
                { turno: "Mañana", cantidad: 418, porcentaje: 51.3 },
                { turno: "Tarde", cantidad: 396, porcentaje: 48.7 }
              ]).map((t) => {
                const totalAlumnos = data.resumenAlumnos?.total || 814;
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
                      style: { width: `${Math.min(100, Math.max(8, pct))}%` }
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
            h(QuickAccessGrid, { userPermissions: user.permisos || ["all"] })
          ),

          // 2. Alumnos por Curso (27 divisiones de la BD) y 3. Inasistencias
          h(
            "div",
            { className: "secretaria-grid-2col" },

            // Tarjeta de Distribución de Cursos y Divisiones
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
                : h(
                    "div",
                    { className: "table-responsive" },
                    h(
                      "table",
                      { className: "custom-table" },
                      h(
                        "thead",
                        null,
                        h(
                          "tr",
                          null,
                          h("th", null, "Curso / Div"),
                          h("th", null, "Orientación"),
                          h("th", null, "Turno Aula / Taller"),
                          h("th", null, "Alumnos"),
                          h("th", null, "Estado"),
                          h("th", null, "Acción")
                        )
                      ),
                      h(
                        "tbody",
                        null,
                        cursosFiltrados.map((item) =>
                          h(
                            "tr",
                            { key: item.id },
                            h("td", null, h("strong", null, `${item.curso} ${item.division}`)),
                            h("td", null, h("span", { className: "orientation-tag" }, item.orientacion)),
                            h("td", null, `${item.turnoAula} / ${item.turnoTaller}`),
                            h("td", null, `${item.cantidad} (${item.porcentaje}%)`),
                            h("td", null, h(StatusBadge, { status: item.estado })),
                            h(
                              "td",
                              null,
                              h(
                                "a",
                                {
                                  href: `#/alumnos?curso=${encodeURIComponent(item.curso)}&div=${encodeURIComponent(item.division)}`,
                                  className: "table-action-link"
                                },
                                "Ver Alumnos"
                              )
                            )
                          )
                        )
                      )
                    )
                  )
            ),

            // Tarjeta de Inasistencias Institucionales
            h(
              DashboardCard,
              {
                title: "Resumen de Inasistencias Institucionales",
                icon: "clipboard",
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
            )
          ),

          // 4. Alertas de Secretaría y 5. Situaciones Académicas Relevantes (2 Columnas)
          h(
            "div",
            { className: "secretaria-grid-2col" },

            // Tarjeta de Alertas
            h(
              DashboardCard,
              {
                title: "Alertas de Secretaría",
                icon: "filter",
                badge: `${data.alertas?.length || 0} pendientes`
              },
              data.alertas?.length === 0
                ? h(EmptyState, { mensaje: "No hay alertas pendientes." })
                : h(
                    "div",
                    { className: "alerts-container" },
                    data.alertas?.map((alerta) =>
                      h(AlertCard, {
                        key: alerta.id,
                        alert: alerta,
                        onDismiss: handleDismissAlert
                      })
                    )
                  )
            ),

            // Tarjeta de Situaciones Académicas
            h(
              DashboardCard,
              {
                title: "Situaciones Académicas Relevantes",
                icon: "clipboard"
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
          ),

          // 7. Información Reciente / Auditoría
          h(
            DashboardCard,
            {
              title: "Registro de Actividad y Auditoría Reciente",
              icon: "clipboard",
              className: "dashboard-card--full"
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
        )
      : null
  );
}
