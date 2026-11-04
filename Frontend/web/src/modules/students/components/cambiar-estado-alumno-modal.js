import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { h } from "../../../layouts/site-layout.js";
import { StudentsService, formatDni } from "../students-service.js";
import { CustomDatePicker } from "../../../components/common/custom-datepicker.js";
import { CustomSelect } from "../../../components/common/custom-select.js";

const MOTIVOS_BAJA = [
  "Pase a otra institución escolar",
  "Cambio de domicilio / Mudanza",
  "Abandono / Deserción escolar",
  "Inserción laboral / Motivos familiares",
  "Finalización de estudios / Egreso",
  "Otro motivo (especificar)"
];

const MOTIVOS_ALTA = [
  "Reincorporación regular",
  "Cancelación / Anulación de pase escolar",
  "Regularización administrativa de matrícula",
  "Reingreso por pase desde otra institución",
  "Otro motivo (especificar)"
];

export function CambiarEstadoAlumnoModal({
  abierto,
  onCerrar,
  alumno,
  onEstadoCambiado
}) {
  const datosPersonales = alumno?.datosPersonales || alumno || {};
  const informacionEscolar = alumno?.informacionEscolar || {};
  const studentId = datosPersonales.id || alumno?.id;

  const estaActivo =
    informacionEscolar.estado?.toLowerCase() !== "inactivo" &&
    informacionEscolar.isActive !== false;

  const hoyStr = new Date().toISOString().slice(0, 10);

  const [fecha, setFecha] = useState(hoyStr);
  const [motivoPreset, setMotivoPreset] = useState(
    estaActivo ? MOTIVOS_BAJA[0] : MOTIVOS_ALTA[0]
  );
  const [motivoDetalle, setMotivoDetalle] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);

  // Bloquear el scroll del body y html mientras el modal esté abierto
  useEffect(() => {
    if (!abierto) return;
    const originalBodyOverflow = document.body.style.overflow;
    const originalBodyPaddingRight = document.body.style.paddingRight;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.body.style.paddingRight = originalBodyPaddingRight;
      document.documentElement.style.overflow = originalHtmlOverflow;
    };
  }, [abierto]);

  // Reiniciar estado al abrir o cambiar de alumno
  useEffect(() => {
    if (abierto) {
      setFecha(hoyStr);
      setMotivoPreset(estaActivo ? MOTIVOS_BAJA[0] : MOTIVOS_ALTA[0]);
      setMotivoDetalle("");
      setError(null);
      setGuardando(false);
    }
  }, [abierto, estaActivo, hoyStr]);

  // Manejar tecla Escape
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

  const displayNombre =
    datosPersonales.nombreCompleto ||
    `${datosPersonales.apellido || ""}, ${datosPersonales.nombre || ""}`.trim() ||
    "Estudiante";

  const nuevoEstado = estaActivo ? "Inactivo" : "Activo";

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    if (!fecha) {
      setError(
        estaActivo
          ? "Debe indicar la fecha en la que el alumno se fue del colegio."
          : "Debe indicar la fecha de reincorporación."
      );
      return;
    }

    const motivoFinal =
      motivoPreset === "Otro motivo (especificar)"
        ? motivoDetalle.trim()
        : motivoDetalle.trim()
        ? `${motivoPreset} - ${motivoDetalle.trim()}`
        : motivoPreset;

    if (!motivoFinal) {
      setError("Debe especificar el motivo del cambio de estado.");
      return;
    }

    setGuardando(true);
    setError(null);

    try {
      await StudentsService.cambiarEstadoAlumno(studentId, {
        estado: nuevoEstado,
        fecha,
        motivo: motivoFinal
      });

      if (onEstadoCambiado) {
        onEstadoCambiado({
          estado: nuevoEstado,
          fecha,
          motivo: motivoFinal
        });
      }
      if (onCerrar) {
        onCerrar();
      }
    } catch (err) {
      setError(
        err.message ||
          "Ocurrió un error al intentar actualizar el estado del alumno. Reintente nuevamente."
      );
    } finally {
      setGuardando(false);
    }
  };

  const modalContent = h(
    "div",
    {
      className: "modal-overlay cambiar-estado-modal-overlay",
      onClick: (e) => {
        if (e.target === e.currentTarget && !guardando && onCerrar) {
          onCerrar();
        }
      }
    },
    h(
      "div",
      {
        className: "modal-container modal-md cambiar-estado-modal-container",
        role: "dialog",
        "aria-modal": "true"
      },

      // Header del modal
      h(
        "div",
        {
          className: `modal-header cambiar-estado-header ${
            estaActivo ? "cambiar-estado-header--baja" : "cambiar-estado-header--alta"
          }`
        },
        h(
          "div",
          { className: "cambiar-estado-header-title-wrap" },
          h(
            "div",
            {
              className: `cambiar-estado-badge-icon ${
                estaActivo
                  ? "cambiar-estado-badge-icon--danger"
                  : "cambiar-estado-badge-icon--success"
              }`
            },
            h(
              "svg",
              {
                width: "20",
                height: "20",
                viewBox: "0 0 24 24",
                fill: "none",
                stroke: "currentColor",
                strokeWidth: "2",
                strokeLinecap: "round",
                strokeLinejoin: "round"
              },
              estaActivo
                ? [
                    h("path", { key: "p1", d: "M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" }),
                    h("circle", { key: "p2", cx: "8.5", cy: "7", r: "4" }),
                    h("line", { key: "p3", x1: "18", y1: "8", x2: "23", y2: "13" }),
                    h("line", { key: "p4", x1: "23", y1: "8", x2: "18", y2: "13" })
                  ]
                : [
                    h("path", { key: "p1", d: "M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" }),
                    h("circle", { key: "p2", cx: "8.5", cy: "7", r: "4" }),
                    h("polyline", { key: "p3", points: "17 11 19 13 23 9" })
                  ]
            )
          ),
          h(
            "div",
            null,
            h(
              "h2",
              { className: "modal-title" },
              estaActivo ? "Pasar Alumno a Inactivo (Baja Escolar)" : "Reactivar Alumno (Alta Escolar)"
            ),
            h(
              "p",
              { className: "cambiar-estado-subtitle" },
              "Gestión de estado y legajo escolar · Secretaría"
            )
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

      // Cuerpo del Formulario
      h(
        "form",
        { onSubmit: handleSubmit, className: "cambiar-estado-form" },
        h(
          "div",
          { className: "modal-body cambiar-estado-modal-body" },

          // Tarjeta de contexto del Alumno
          h(
            "div",
            { className: "cambiar-estado-student-preview" },
            h(
              "div",
              { className: "cambiar-estado-preview-left" },
              h("div", { className: "preview-student-name" }, displayNombre),
              h(
                "div",
                { className: "preview-student-meta" },
                h("span", null, `DNI: ${formatDni(datosPersonales.dni)}`),
                h("span", { className: "preview-separator" }, "•"),
                h(
                  "span",
                  null,
                  `${informacionEscolar.curso || "1°"} Div. ${informacionEscolar.division || "1"} (${informacionEscolar.turno || "Mañana"})`
                )
              )
            ),
            h(
              "div",
              { className: "cambiar-estado-transition-pill" },
              h(
                "span",
                {
                  className: `preview-status-pill ${
                    estaActivo ? "preview-status-pill--active" : "preview-status-pill--inactive"
                  }`
                },
                estaActivo ? "Activo" : "Inactivo"
              ),
              h("span", { className: "preview-arrow" }, "➔"),
              h(
                "span",
                {
                  className: `preview-status-pill ${
                    !estaActivo ? "preview-status-pill--active" : "preview-status-pill--inactive"
                  } preview-status-pill--target`
                },
                nuevoEstado
              )
            )
          ),

          // Error banner
          error
            ? h(
                "div",
                { className: "cambiar-estado-alert-error" },
                h(
                  "svg",
                  { width: "16", height: "16", viewBox: "0 0 20 20", fill: "currentColor" },
                  h("path", {
                    fillRule: "evenodd",
                    d: "M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z",
                    clipRule: "evenodd"
                  })
                ),
                h("span", null, error)
              )
            : null,

          // Campo 1: Fecha en la que se fue / reactivación con CustomDatePicker
          h(
            "div",
            { className: "cambiar-estado-field" },
            h(
              "label",
              { className: "cambiar-estado-label", htmlFor: "fecha-estado-picker" },
              estaActivo
                ? "Fecha en la que se fue del colegio *"
                : "Fecha de reinicio o reincorporación *"
            ),
            h(CustomDatePicker, {
              id: "fecha-estado-picker",
              value: fecha,
              onChange: (nuevaFecha) => setFecha(nuevaFecha),
              required: true,
              disabled: guardando,
              placeholder: "dd/mm/aaaa"
            }),
            h(
              "span",
              { className: "cambiar-estado-help" },
              estaActivo
                ? "Indique el día exacto de desvinculación, pase o retiro de la institución."
                : "Fecha a partir de la cual vuelve a regir la asistencia escolar."
            )
          ),

          // Campo 2: Motivo predeterminado con CustomSelect (Combobox)
          h(
            "div",
            { className: "cambiar-estado-field" },
            h(
              "label",
              { className: "cambiar-estado-label", htmlFor: "select-motivo-estado" },
              estaActivo ? "Motivo del retiro / baja *" : "Motivo de la reactivación *"
            ),
            h(CustomSelect, {
              id: "select-motivo-estado",
              value: motivoPreset,
              options: (estaActivo ? MOTIVOS_BAJA : MOTIVOS_ALTA).map((m) => ({
                value: m,
                label: m
              })),
              onChange: (val) => setMotivoPreset(val),
              disabled: guardando,
              placeholder: "-- Seleccionar Motivo --"
            })
          ),

          // Campo 3: Detalle o motivo ampliado
          h(
            "div",
            { className: "cambiar-estado-field" },
            h(
              "label",
              { className: "cambiar-estado-label", htmlFor: "textarea-motivo-detalle" },
              motivoPreset === "Otro motivo (especificar)"
                ? "Describa el motivo *"
                : "Detalle o aclaración administrativa (opcional)"
            ),
            h("textarea", {
              id: "textarea-motivo-detalle",
              className: "cambiar-estado-textarea",
              rows: 2,
              placeholder: estaActivo
                ? "Indique escuela de destino, trámite de pase, número de expediente o detalle relevante..."
                : "Aclaraciones sobre la reincorporación...",
              value: motivoDetalle,
              onChange: (e) => setMotivoDetalle(e.target.value),
              disabled: guardando
            })
          ),

          // Aviso institucional informativo
          h(
            "div",
            {
              className: `cambiar-estado-info-banner ${
                estaActivo ? "cambiar-estado-info-banner--danger" : "cambiar-estado-info-banner--info"
              }`
            },
            h(
              "div",
              { className: "info-banner-icon" },
              h(
                "svg",
                { width: "16", height: "16", viewBox: "0 0 20 20", fill: "currentColor" },
                h("path", {
                  fillRule: "evenodd",
                  d: "M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z",
                  clipRule: "evenodd"
                })
              )
            ),
            h(
              "div",
              { className: "info-banner-text" },
              estaActivo
                ? "Al pasar a Inactivo, el alumno quedará excluido de la matrícula activa y de las listas de asistencia diaria, pero todo su historial académico, libro matriz y notas continuarán resguardados."
                : "Al reactivar al alumno, volverá a sumarse a la matrícula activa y aparecerá inmediatamente en los registros de asistencia de su división."
            )
          )
        ),

        // Footer con botones de acción (siempre visible)
        h(
          "div",
          { className: "modal-footer cambiar-estado-footer" },
          h(
            "button",
            {
              type: "button",
              className: "btn-secondary",
              onClick: onCerrar,
              disabled: guardando
            },
            "Cancelar"
          ),
          h(
            "button",
            {
              type: "submit",
              className: `btn-primary ${
                estaActivo ? "btn-danger-confirm" : "btn-success-confirm"
              }`,
              disabled: guardando
            },
            guardando
              ? [
                  h("span", { key: "s1", className: "spinner-inline" }),
                  "Guardando..."
                ]
              : estaActivo
              ? "Confirmar Baja del Alumno"
              : "Confirmar Reactivación"
          )
        )
      )
    )
  );

  return typeof document !== "undefined"
    ? createPortal(modalContent, document.body)
    : modalContent;
}
