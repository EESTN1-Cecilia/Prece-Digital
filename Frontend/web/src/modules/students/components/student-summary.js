import React, { useState, useEffect } from "react";
import { h, IconoFigma } from "../../../layouts/site-layout.js";
import { StudentBasicInfo } from "./student-basic-info.js";
import { StudentSchoolInfo } from "./student-school-info.js";
import { StudentAcademicStatus } from "./student-academic-status.js";
import { StudentAttendanceSummary } from "./student-attendance-summary.js";
import { StudentAlertList } from "./student-alert-list.js";
import { StudentProfileLink } from "./student-profile-link.js";
import { StatusBadge, ConditionBadge } from "./student-badges.js";
import { BoletinDigitalModal } from "./boletin-digital-modal.js";
import { StudentStatusSwitch } from "./student-status-switch.js";
import { CambiarEstadoAlumnoModal } from "./cambiar-estado-alumno-modal.js";
import { obtenerLibroFolioLegajo } from "../students-service.js";
import { useUsuarioActual } from "../../../estado/index.js";

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

  const usuarioActual = useUsuarioActual();
  const esSecretaria =
    usuarioActual?.rol === "secretaria" ||
    usuarioActual?.roles?.includes("secretario") ||
    usuarioActual?.roles?.includes("admin") ||
    usuarioActual?.roles?.includes("director") ||
    usuarioActual?.permisos?.includes("students.write");

  const [boletinOpen, setBoletinOpen] = useState(false);
  const [modalEstadoOpen, setModalEstadoOpen] = useState(false);
  const [estadoLocal, setEstadoLocal] = useState(null);
  const [fechaBajaLocal, setFechaBajaLocal] = useState(null);
  const [motivoBajaLocal, setMotivoBajaLocal] = useState(null);
  const [mensajeFeedback, setMensajeFeedback] = useState(null);
  const [, setVersion] = useState(0);

  useEffect(() => {
    const handleUpdate = () => setVersion((v) => v + 1);
    window.addEventListener("prece:libro-folio-updated", handleUpdate);
    return () => window.removeEventListener("prece:libro-folio-updated", handleUpdate);
  }, []);

  useEffect(() => {
    const handleStatusUpdate = (e) => {
      if (e?.detail?.studentId === resumen?.datosPersonales?.id) {
        setEstadoLocal(e.detail.estado);
        if (e.detail.fecha) setFechaBajaLocal(e.detail.fecha);
        if (e.detail.motivo) setMotivoBajaLocal(e.detail.motivo);
      }
    };
    window.addEventListener("prece:student-status-changed", handleStatusUpdate);
    return () => window.removeEventListener("prece:student-status-changed", handleStatusUpdate);
  }, [resumen?.datosPersonales?.id]);

  const {
    datosPersonales = {},
    informacionEscolar = {},
    estadoAcademico = {},
    inasistencias = {},
    alertas = [],
    actualizadoEn
  } = resumen;

  const infoLegajo = obtenerLibroFolioLegajo({
    ...datosPersonales,
    ...informacionEscolar,
    id: datosPersonales.id,
    studentId: datosPersonales.id
  });

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

  const estadoEfectivo = estadoLocal || informacionEscolar.estado || "Activo";
  const esInactivo =
    estadoEfectivo.toLowerCase() === "inactivo" ||
    (estadoLocal === null && informacionEscolar.isActive === false);
  const fechaBajaEfectiva = fechaBajaLocal || informacionEscolar.fechaBaja;
  const motivoBajaEfectivo = motivoBajaLocal || informacionEscolar.motivoBaja;

  return h(
    "div",
    { className: "student-summary-container" },

    // Notificación flotante de confirmación de cambio de estado
    mensajeFeedback
      ? h(
          "div",
          { className: "student-summary-feedback-alert" },
          h(
            "svg",
            { width: "16", height: "16", viewBox: "0 0 20 20", fill: "currentColor" },
            h("path", {
              fillRule: "evenodd",
              d: "M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z",
              clipRule: "evenodd"
            })
          ),
          h("span", null, mensajeFeedback)
        )
      : null,

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
          : null
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
          { className: "student-hero-left" },
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
              h(StudentStatusSwitch, {
                estado: estadoEfectivo,
                isActive: !esInactivo,
                esSecretaria,
                fechaBaja: fechaBajaEfectiva,
                motivoBaja: motivoBajaEfectivo,
                onClick: () => setModalEstadoOpen(true)
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
                { className: "hero-pill font-mono", title: `Libro: ${infoLegajo.libro} · Folio: ${infoLegajo.folio} · N° Legajo: ${infoLegajo.numLegajo}` },
                `Legajo: (${infoLegajo.libro}-${infoLegajo.folio}-${infoLegajo.numLegajo})`
              ),
              informacionEscolar.orientacion
                ? h(
                    "span",
                    { className: "hero-pill orientation" },
                    informacionEscolar.orientacion
                  )
                : null,
              esInactivo
                ? h(
                    "span",
                    {
                      className: "hero-pill hero-pill--inactivo",
                      title: `Baja escolar registrada. Fecha: ${fechaBajaEfectiva || "No indicada"}${motivoBajaEfectivo ? ` · Motivo: ${motivoBajaEfectivo}` : ""}`
                    },
                    h(
                      "svg",
                      {
                        className: "hero-pill-icon",
                        width: "12",
                        height: "12",
                        viewBox: "0 0 20 20",
                        fill: "currentColor"
                      },
                      h("path", {
                        fillRule: "evenodd",
                        d: "M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z",
                        clipRule: "evenodd"
                      })
                    ),
                    `Baja escolar: ${fechaBajaEfectiva || "Registrada"}${motivoBajaEfectivo ? ` (${motivoBajaEfectivo})` : ""}`
                  )
                : null
            )
          )
        ),
        h(
          "div",
          { className: "student-hero-right" },
          h(
            "button",
            {
              type: "button",
              className: "btn-boletin-digital-styled",
              onClick: () => setBoletinOpen(true),
              title: "Consultar y editar Boletín Digital de Calificaciones (1° a 7° Año)",
              "aria-label": "Boletín Digital"
            },
            h(
              "svg",
              {
                className: "btn-boletin-icon",
                viewBox: "0 0 24 24",
                fill: "none",
                stroke: "currentColor",
                strokeWidth: "2",
                strokeLinecap: "round",
                strokeLinejoin: "round",
                "aria-hidden": "true"
              },
              h("path", { d: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" }),
              h("polyline", { points: "14 2 14 8 20 8" }),
              h("line", { x1: "16", y1: "13", x2: "8", y2: "13" }),
              h("line", { x1: "16", y1: "17", x2: "8", y2: "17" }),
              h("polyline", { points: "10 9 9 9 8 9" })
            ),
            h("span", null, "Boletín Digital")
          ),
          h(StudentProfileLink, {
            alumnoId: datosPersonales.id,
            url: resumen.perfilCompletoUrl,
            label: "Ver Perfil Completo"
          })
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
    ),

    // Modal de Boletín Digital Oficial
    boletinOpen
      ? h(BoletinDigitalModal, {
          abierto: boletinOpen,
          onCerrar: () => setBoletinOpen(false),
          alumno: resumen
        })
      : null,

    // Modal de Cambio de Estado del Alumno (Secretaría)
    modalEstadoOpen
      ? h(CambiarEstadoAlumnoModal, {
          abierto: modalEstadoOpen,
          onCerrar: () => setModalEstadoOpen(false),
          alumno: {
            ...resumen,
            datosPersonales,
            informacionEscolar: {
              ...informacionEscolar,
              estado: estadoEfectivo,
              isActive: !esInactivo,
              fechaBaja: fechaBajaEfectiva,
              motivoBaja: motivoBajaEfectivo
            }
          },
          onEstadoCambiado: ({ estado, fecha, motivo }) => {
            setEstadoLocal(estado);
            setFechaBajaLocal(fecha);
            setMotivoBajaLocal(motivo);
            setMensajeFeedback(
              estado === "Inactivo"
                ? `El alumno fue pasado a Inactivo correctamente con fecha de egreso ${fecha}.`
                : `El alumno fue reactivado exitosamente con fecha ${fecha}.`
            );
            setTimeout(() => setMensajeFeedback(null), 6000);
            if (onRefresh) onRefresh();
          }
        })
      : null
  );
}
