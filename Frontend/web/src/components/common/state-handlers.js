import { h, ActionButton, IconoFigma } from "../../layouts/site-layout.js";

export function LoadingState({ mensaje = "Cargando información..." }) {
  return h(
    "div",
    { className: "state-loading", "aria-live": "polite" },
    h("div", { className: "state-loading__spinner" }),
    h("p", null, mensaje)
  );
}

export function EmptyState({ mensaje = "No se encontraron datos disponibles." }) {
  return h(
    "div",
    { className: "state-empty" },
    h(IconoFigma, { className: "state-icon", nombre: "filter" }),
    h("p", null, mensaje)
  );
}

export function ErrorState({ mensaje = "Ocurrió un error al consultar la información.", onRetry }) {
  return h(
    "div",
    { className: "state-error", role: "alert" },
    h(IconoFigma, { className: "state-icon", nombre: "support" }),
    h("p", null, mensaje),
    onRetry
      ? h(
          "button",
          { className: "state-error__retry-btn", type: "button", onClick: onRetry },
          "Reintentar"
        )
      : null
  );
}

export function AccessDeniedState({ rolRequerido = "Secretaría", onSwitchRole }) {
  return h(
    "div",
    { className: "state-access-denied", role: "alert" },
    h(IconoFigma, { className: "state-icon", nombre: "support" }),
    h("h2", null, "Acceso Denegado"),
    h(
      "p",
      null,
      `Esta sección requiere permisos del rol de ${rolRequerido}. Tu usuario actual no tiene asignado este módulo.`
    ),
    onSwitchRole
      ? h(
          "div",
          { className: "state-access-denied__actions" },
          h(
            ActionButton,
            { tone: "primary", onClick: () => onSwitchRole("secretaria") },
            "Cambiar a Rol Secretaría"
          ),
          h(
            ActionButton,
            { tone: "secondary", onClick: () => onSwitchRole("preceptor") },
            "Ir a Dashboard Preceptoría"
          )
        )
      : null
  );
}

export function StatusBadge({ status, label }) {
  const normStatus = (status || "").toLowerCase();
  let modifier = "normal";

  if (normStatus.includes("crítico") || normStatus.includes("alta") || normStatus.includes("inactivo") || normStatus.includes("desaprobada")) {
    modifier = "danger";
  } else if (normStatus.includes("seguimiento") || normStatus.includes("media") || normStatus.includes("riesgo") || normStatus.includes("previa")) {
    modifier = "warning";
  } else if (normStatus.includes("activo") || normStatus.includes("normal") || normStatus.includes("baja") || normStatus.includes("completo")) {
    modifier = "success";
  }

  return h(
    "span",
    { className: `status-badge status-badge--${modifier}` },
    label || status
  );
}
