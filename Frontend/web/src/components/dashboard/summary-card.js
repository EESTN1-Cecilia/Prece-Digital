import { h } from "../../layouts/site-layout.js";

/**
 * Tarjeta de métrica/resumen numérico institucional.
 */
export function SummaryCard({
  label,
  value,
  subtitle,
  variant = "default",
  trend,
  onClick
}) {
  const isClickable = typeof onClick === "function";

  return h(
    "div",
    {
      className: `summary-card summary-card--${variant}${isClickable ? " summary-card--clickable" : ""}`,
      onClick: isClickable ? onClick : undefined,
      role: isClickable ? "button" : undefined,
      tabIndex: isClickable ? 0 : undefined
    },
    h("div", { className: "summary-card__header" },
      h("span", { className: "summary-card__label" }, label),
      trend ? h("span", { className: `summary-card__trend summary-card__trend--${trend.type || "neutral"}` }, trend.text) : null
    ),
    h("div", { className: "summary-card__value" }, value),
    subtitle ? h("p", { className: "summary-card__subtitle" }, subtitle) : null
  );
}
