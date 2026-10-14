import React, { useState } from "react";
import { h, IconoFigma } from "../../layouts/site-layout.js";

/**
 * Contenedor estándar para secciones del dashboard con header, ícono, badge, acciones y funcionalidad desplegable (collapsible).
 */
export function DashboardCard({
  title,
  icon,
  badge,
  actions,
  children,
  className = "",
  id,
  collapsible = true,
  defaultExpanded = true,
  isOpen,
  onToggle
}) {
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);

  // Soporta tanto estado controlado (isOpen, onToggle) como no controlado (internalExpanded)
  const isExpanded = isOpen !== undefined ? isOpen : internalExpanded;

  const toggleExpand = () => {
    if (!collapsible) return;
    if (onToggle) {
      onToggle(!isExpanded);
    } else {
      setInternalExpanded((prev) => !prev);
    }
  };

  const handleHeaderClick = (e) => {
    if (!collapsible) return;
    // Si se hizo clic en un botón, enlace, input, select o filtro, no alternar el colapso
    if (e.target.closest("button:not(.dashboard-card__toggle-btn), a, input, select, .filter-pill, .custom-select-wrapper")) {
      return;
    }
    toggleExpand();
  };

  return h(
    "section",
    {
      className: `dashboard-card ${collapsible ? "dashboard-card--collapsible" : ""} ${isExpanded ? "dashboard-card--expanded" : "dashboard-card--collapsed"} ${className}`,
      id,
      "aria-labelledby": id ? `${id}-title` : undefined
    },
    h(
      "header",
      {
        className: `dashboard-card__header ${collapsible ? "dashboard-card__header--clickable" : ""}`,
        onClick: handleHeaderClick,
        role: collapsible ? "button" : undefined,
        tabIndex: collapsible ? 0 : undefined,
        "aria-expanded": collapsible ? isExpanded : undefined,
        onKeyDown: collapsible
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                toggleExpand();
              }
            }
          : undefined
      },
      h(
        "div",
        { className: "dashboard-card__title-wrap" },
        icon ? h(IconoFigma, { className: "dashboard-card__icon", nombre: icon }) : null,
        h("h2", { id: id ? `${id}-title` : undefined, className: "dashboard-card__title" }, title),
        badge ? h("span", { className: "dashboard-card__badge" }, badge) : null
      ),
      h(
        "div",
        { className: "dashboard-card__header-right" },
        actions
          ? h(
              "div",
              {
                className: "dashboard-card__actions",
                onClick: (e) => e.stopPropagation()
              },
              actions
            )
          : null,
        collapsible
          ? h(
              "button",
              {
                type: "button",
                className: `dashboard-card__toggle-btn ${isExpanded ? "dashboard-card__toggle-btn--expanded" : ""}`,
                onClick: (e) => {
                  e.stopPropagation();
                  toggleExpand();
                },
                "aria-label": isExpanded ? `Contraer ${title || "sección"}` : `Desplegar ${title || "sección"}`
              },
              h(
                "svg",
                {
                  className: "dashboard-card__chevron",
                  width: "18",
                  height: "18",
                  viewBox: "0 0 24 24",
                  fill: "none",
                  stroke: "currentColor",
                  strokeWidth: "2.2",
                  strokeLinecap: "round",
                  strokeLinejoin: "round",
                  "aria-hidden": "true"
                },
                h("polyline", { points: "6 9 12 15 18 9" })
              )
            )
          : null
      )
    ),
    isExpanded ? h("div", { className: "dashboard-card__body" }, children) : null
  );
}

