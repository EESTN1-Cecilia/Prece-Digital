import { h, IconoFigma } from "../../layouts/site-layout.js";
import { StatusBadge } from "../common/state-handlers.js";

/**
 * Tarjeta de alerta individual para el panel de alertas de Secretaría.
 * Sin emojis, usando IconoFigma y tipografía limpia.
 */
export function AlertCard({ alert, onDismiss, onAction }) {
  const { id, tipo, titulo, descripcion, alumno, fecha, prioridad, recurso } = alert;

  return h(
    "article",
    {
      className: `alert-item alert-item--priority-${prioridad || "media"}`,
      key: id
    },
    h(
      "div",
      { className: "alert-item__header" },
      h(
        "div",
        { className: "alert-item__meta" },
        h(StatusBadge, { status: prioridad, label: `Prioridad ${prioridad?.toUpperCase()}` }),
        h("span", { className: "alert-item__type" }, tipo),
        h("time", { className: "alert-item__date" }, fecha)
      ),
      onDismiss
        ? h(
            "button",
            {
              className: "alert-item__dismiss-btn",
              type: "button",
              onClick: () => onDismiss(id),
              "aria-label": "Marcar como atendida",
              title: "Marcar como atendida"
            },
            "Atender"
          )
        : null
    ),
    h("h3", { className: "alert-item__title" }, titulo),
    h("p", { className: "alert-item__description" }, descripcion),
    h(
      "div",
      { className: "alert-item__footer" },
      alumno
        ? h(
            "div",
            { className: "alert-item__student-wrap" },
            h(IconoFigma, { className: "alert-item__student-icon", nombre: "user-search" }),
            h("span", { className: "alert-item__student" }, alumno)
          )
        : null,
      recurso
        ? h(
            "a",
            {
              className: "alert-item__link",
              href: recurso,
              onClick: onAction ? (e) => onAction(e, alert) : undefined
            },
            "Ver Detalle"
          )
        : null
    )
  );
}
