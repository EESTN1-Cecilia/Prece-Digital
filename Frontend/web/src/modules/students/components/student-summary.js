import { h, IconoFigma } from "../../../layouts/site-layout.js";
import { StudentBasicInfo } from "./student-basic-info.js";
import { StudentSchoolInfo } from "./student-school-info.js";
import { StudentAcademicStatus } from "./student-academic-status.js";
import { StudentAttendanceSummary } from "./student-attendance-summary.js";
import { StudentAlertList } from "./student-alert-list.js";
import { StudentProfileLink } from "./student-profile-link.js";
import { StatusBadge, ConditionBadge } from "./student-badges.js";

/**
 * StudentSummary: Componente contenedor principal para la Ficha Resumida del Alumno
 */
export function StudentSummary({
  resumen,
  onRefresh,
  refreshing = false,
  onBack
}) {
  if (!resumen) return null;

  const {
    datosPersonales = {},
    informacionEscolar = {},
    estadoAcademico = {},
    inasistencias = {},
    alertas = [],
    actualizadoEn
  } = resumen;

  const displayNombreCompleto =
    datosPersonales.nombreCompleto ||
    `${datosPersonales.apellido || ""}, ${datosPersonales.nombre || ""}`.trim() ||
    "Estudiante";

  const formatearFechaHora = (isoStr) => {
    if (!isoStr) return "Reciente";
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return "Reciente";
    }
  };

  return h(
    "div",
    { className: "student-summary-container" },

    // 1. Barra superior de navegación y acciones
    h(
      "div",
      { className: "student-summary-top-bar" },
      h(
        "button",
        {
          type: "button",
          className: "btn-volver-atras",
          onClick: () => {
            if (onBack) {
              onBack();
            } else {
              window.location.hash = "#/alumnos";
            }
          },
          title: "Volver al listado de alumnos",
          "aria-label": "Volver al listado de alumnos"
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
        h("span", null, "Volver al Listado")
      ),

      h(
        "div",
        { className: "student-summary-header-actions" },
        actualizadoEn
          ? h(
              "span",
              { className: "last-updated-text" },
              `Última actualización: ${formatearFechaHora(actualizadoEn)}`
            )
          : null,
        onRefresh
          ? h(
              "button",
              {
                type: "button",
                className: `btn-refresh-data ${refreshing ? "spinning" : ""}`,
                onClick: onRefresh,
                disabled: refreshing,
                title: "Actualizar datos del alumno desde la API",
                "aria-label": "Actualizar datos del alumno"
              },
              h(
                "svg",
                {
                  className: "refresh-icon",
                  viewBox: "0 0 20 20",
                  fill: "none",
                  stroke: "currentColor",
                  strokeWidth: "2"
                },
                h("path", {
                  d: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                })
              ),
              h("span", null, refreshing ? "Actualizando..." : "Actualizar")
            )
          : null,
        // Acción de perfil completo estilizada
        h(StudentProfileLink, {
          alumnoId: datosPersonales.id,
          url: resumen.perfilCompletoUrl,
          label: "Ver Perfil Completo"
        })
      )
    ),

    // 2. Banner de Resumen Ejecutivo del Alumno
    h(
      "div",
      { className: "student-summary-hero-card" },
      h(
        "div",
        { className: "student-hero-content" },
        h(
          "div",
          { className: "student-hero-avatar-wrap" },
          h(IconoFigma, {
            className: "student-hero-avatar-icon",
            nombre: "avatar"
          })
        ),
        h(
          "div",
          { className: "student-hero-info" },
          h(
            "div",
            { className: "student-hero-title-row" },
            h("h1", { className: "student-hero-name" }, displayNombreCompleto),
            h(StatusBadge, {
              status: informacionEscolar.estado,
              label: informacionEscolar.estado
            }),
            h(ConditionBadge, { condicion: informacionEscolar.condicion })
          ),
          h(
            "div",
            { className: "student-hero-meta" },
            h("span", { className: "hero-pill" }, `DNI: ${datosPersonales.dni || "S/D"}`),
            h(
              "span",
              { className: "hero-pill highlight" },
              `${informacionEscolar.curso || "1°"} Div. ${informacionEscolar.division || "1"} (${informacionEscolar.turno || "Mañana"})`
            ),
            h(
              "span",
              { className: "hero-pill" },
              `Legajo: ${datosPersonales.legajo || (datosPersonales.id ? `ID: ${datosPersonales.id}` : "S/N")}`
            ),
            informacionEscolar.orientacion
              ? h(
                  "span",
                  { className: "hero-pill orientation" },
                  informacionEscolar.orientacion
                )
              : null
          )
        )
      )
    ),

    // 3. Grid de Bloques Desplegables de Información Resumida
    h(
      "div",
      { className: "student-summary-grid" },
      // Columna Izquierda: Datos Personales e Información Escolar
      h(
        "div",
        { className: "student-summary-column" },
        h(StudentBasicInfo, { alumno: datosPersonales }),
        h(StudentSchoolInfo, { escolar: informacionEscolar })
      ),

      // Columna Derecha: Estado Académico, Inasistencias y Alertas
      h(
        "div",
        { className: "student-summary-column" },
        h(StudentAcademicStatus, { academico: estadoAcademico }),
        h(StudentAttendanceSummary, { inasistencias: inasistencias }),
        h(StudentAlertList, { alertas: alertas })
      )
    )
  );
}
