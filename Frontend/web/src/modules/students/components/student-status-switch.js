import { h } from "../../../layouts/site-layout.js";
import { StatusBadge } from "./student-badges.js";

/**
 * StudentStatusSwitch: Componente switch interactivo para Secretaría
 * Permite cambiar el estado del alumno entre Activo e Inactivo.
 * Si el usuario no tiene permisos de Secretaría/Dirección, muestra el badge regular.
 */
export function StudentStatusSwitch({
  estado,
  isActive,
  esSecretaria = false,
  fechaBaja = null,
  motivoBaja = null,
  onClick,
  disabled = false
}) {
  const activo = isActive !== undefined
    ? Boolean(isActive)
    : (estado || "").toLowerCase() !== "inactivo";

  if (!esSecretaria) {
    return h(StatusBadge, {
      status: activo ? "Activo" : "Inactivo",
      label: activo ? "Activo" : "Inactivo"
    });
  }

  return h(
    "div",
    {
      className: "student-status-switch-wrapper",
      title: activo
        ? "Haga clic para pasar a Inactivo (registrar motivo y fecha de egreso)"
        : `Alumno Inactivo${fechaBaja ? ` desde el ${fechaBaja}` : ""}${motivoBaja ? ` (${motivoBaja})` : ""}. Haga clic para Reactivar.`
    },
    h(
      "button",
      {
        type: "button",
        role: "switch",
        "aria-checked": activo,
        "aria-label": `Estado del alumno: ${activo ? "Activo" : "Inactivo"}. Cambiar estado.`,
        className: `student-status-switch-btn ${
          activo ? "student-status-switch-btn--active" : "student-status-switch-btn--inactive"
        }`,
        onClick: (e) => {
          e.preventDefault();
          if (!disabled && onClick) {
            onClick();
          }
        },
        disabled
      },
      // Track + Thumb
      h(
        "span",
        {
          className: `student-status-switch-track ${
            activo ? "student-status-switch-track--active" : "student-status-switch-track--inactive"
          }`
        },
        h("span", {
          className: `student-status-switch-thumb ${
            activo ? "student-status-switch-thumb--active" : "student-status-switch-thumb--inactive"
          }`
        })
      ),

      // Etiqueta de texto del estado
      h(
        "span",
        {
          className: `student-status-switch-label ${
            activo ? "student-status-switch-label--active" : "student-status-switch-label--inactive"
          }`
        },
        activo ? "Activo" : "Inactivo"
      ),

      // Píldora indicadora de Secretaría
      h(
        "span",
        { className: "student-status-switch-role-badge" },
        "Secretaría"
      )
    )
  );
}
