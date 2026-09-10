import { h } from "../../layouts/site-layout.js";

/**
 * Control segmentado para alternar entre los Dashboards de Preceptoría y Secretaría.
 * Estilo pastilla fiel al boceto institucional.
 */
export function RoleSwitch({ activeRole, onToggle }) {
  const isSecretaria = activeRole === "secretaria";

  return h(
    "div",
    { className: "role-segmented-control", "aria-label": "Selector de Rol Institucional" },
    h(
      "button",
      {
        type: "button",
        className: `role-segment-btn ${!isSecretaria ? "active" : ""}`,
        onClick: () => onToggle("preceptor"),
        "aria-pressed": !isSecretaria
      },
      "Preceptoría"
    ),
    h(
      "button",
      {
        type: "button",
        className: `role-segment-btn ${isSecretaria ? "active" : ""}`,
        onClick: () => onToggle("secretaria"),
        "aria-pressed": isSecretaria
      },
      "Secretaría"
    )
  );
}

