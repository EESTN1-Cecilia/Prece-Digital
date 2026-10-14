import React from "react";
import { h } from "../../../layouts/site-layout.js";

// Helper SVG Icons para las métricas de Server / Stock
function IconBoxStack({ className }) {
  return h(
    "svg",
    {
      className: className || "kpi-icon",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "2",
      strokeLinecap: "round",
      strokeLinejoin: "round"
    },
    h("path", { d: "m7.5 4.27 9 5.15" }),
    h("path", { d: "M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" }),
    h("path", { d: "m3.3 7 8.7 5 8.7-5" }),
    h("path", { d: "M12 22V12" })
  );
}

function IconCheckCircle({ className }) {
  return h(
    "svg",
    {
      className: className || "kpi-icon",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "2",
      strokeLinecap: "round",
      strokeLinejoin: "round"
    },
    h("path", { d: "M22 11.08V12a10 10 0 1 1-5.93-9.14" }),
    h("polyline", { points: "22 4 12 14.01 9 11.01" })
  );
}

function IconAlertTriangle({ className }) {
  return h(
    "svg",
    {
      className: className || "kpi-icon",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "2",
      strokeLinecap: "round",
      strokeLinejoin: "round"
    },
    h("path", { d: "m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" }),
    h("line", { x1: "12", y1: "9", x2: "12", y2: "13" }),
    h("line", { x1: "12", y1: "17", x2: "12.01", y2: "17" })
  );
}

function IconSlashCircle({ className }) {
  return h(
    "svg",
    {
      className: className || "kpi-icon",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "2",
      strokeLinecap: "round",
      strokeLinejoin: "round"
    },
    h("circle", { cx: "12", cy: "12", r: "10" }),
    h("line", { x1: "4.93", y1: "4.93", x2: "19.07", y2: "19.07" })
  );
}

export function StockSummary({ resumen, filtroActivo, onSeleccionarFiltro, onSeleccionarCategoria }) {
  const total = resumen?.totalMateriales ?? 0;
  const disponibles = resumen?.disponibles ?? 0;
  const stockBajo = resumen?.stockBajo ?? 0;
  const sinStock = resumen?.sinStock ?? 0;
  const porCategoria = resumen?.porCategoria ?? [];

  const pctDisponibles = total > 0 ? ((disponibles / total) * 100).toFixed(1).replace(".", ",") : "0";

  return h(
    "div",
    { className: "server-summary-container" },

    // Fila superior: Las 4 tarjetas de métricas (2x2 compactas)
    h(
      "div",
      { className: "kpi-summary-grid server-kpi-grid-compact" },

      // Card 1: Total de Materiales (Azul)
      h(
        "div",
        {
          className: `kpi-metric-card kpi-metric-card--blue ${filtroActivo === "todos" ? "kpi-metric-card--active" : ""}`,
          role: "button",
          tabIndex: 0,
          onClick: () => onSeleccionarFiltro && onSeleccionarFiltro("todos"),
          title: "Ver todos los materiales"
        },
        h(
          "div",
          { className: "kpi-metric-card__icon-box kpi-metric-card__icon-box--blue" },
          h(IconBoxStack, null)
        ),
        h(
          "div",
          { className: "kpi-metric-card__content" },
          h("span", { className: "kpi-metric-card__label" }, "Total de Materiales"),
          h("div", { className: "kpi-metric-card__value" }, total),
          h(
            "div",
            { className: "kpi-metric-card__subrow" },
            h("span", { className: "kpi-metric-card__period" }, `${resumen?.totalCategorias ?? 0} categorías`),
            h("span", { className: "kpi-metric-card__trend" }, `${resumen?.totalUbicaciones ?? 1} ubicaciones`)
          )
        )
      ),

      // Card 2: Materiales Disponibles (Verde)
      h(
        "div",
        {
          className: `kpi-metric-card kpi-metric-card--green ${filtroActivo === "disponible" ? "kpi-metric-card--active" : ""}`,
          role: "button",
          tabIndex: 0,
          onClick: () => onSeleccionarFiltro && onSeleccionarFiltro("disponible"),
          title: "Ver materiales disponibles"
        },
        h(
          "div",
          { className: "kpi-metric-card__icon-box kpi-metric-card__icon-box--green" },
          h(IconCheckCircle, null)
        ),
        h(
          "div",
          { className: "kpi-metric-card__content" },
          h("span", { className: "kpi-metric-card__label" }, "Materiales Disponibles"),
          h("div", { className: "kpi-metric-card__value" }, disponibles),
          h(
            "span",
            { className: "kpi-metric-card__subtext" },
            `${pctDisponibles}% del inventario disponible`
          )
        )
      ),

      // Card 3: Stock Bajo (Ámbar)
      h(
        "div",
        {
          className: `kpi-metric-card kpi-metric-card--amber ${filtroActivo === "bajo" ? "kpi-metric-card--active" : ""}`,
          role: "button",
          tabIndex: 0,
          onClick: () => onSeleccionarFiltro && onSeleccionarFiltro("bajo"),
          title: "Ver materiales con stock bajo"
        },
        h(
          "div",
          { className: "kpi-metric-card__icon-box kpi-metric-card__icon-box--amber" },
          h(IconAlertTriangle, null)
        ),
        h(
          "div",
          { className: "kpi-metric-card__content" },
          h("span", { className: "kpi-metric-card__label" }, "Stock Bajo"),
          h("div", { className: "kpi-metric-card__value text-warning" }, stockBajo),
          h(
            "span",
            { className: "kpi-metric-card__subtext" },
            stockBajo > 0 ? "Por debajo del stock mínimo" : "Sin alertas de reposición"
          )
        )
      ),

      // Card 4: Sin Stock / Agotados (Rojo)
      h(
        "div",
        {
          className: `kpi-metric-card kpi-metric-card--red ${filtroActivo === "agotado" ? "kpi-metric-card--active" : ""}`,
          role: "button",
          tabIndex: 0,
          onClick: () => onSeleccionarFiltro && onSeleccionarFiltro("agotado"),
          title: "Ver materiales agotados"
        },
        h(
          "div",
          { className: "kpi-metric-card__icon-box kpi-metric-card__icon-box--red" },
          h(IconSlashCircle, null)
        ),
        h(
          "div",
          { className: "kpi-metric-card__content" },
          h("span", { className: "kpi-metric-card__label" }, "Sin Stock / Agotados"),
          h("div", { className: "kpi-metric-card__value text-danger" }, sinStock),
          h(
            "span",
            { className: "kpi-metric-card__subtext" },
            sinStock > 0 ? "Requieren compra o reposición" : "Inventario con disponibilidad"
          )
        )
      )
    ),

    // Fila inferior: DISTRIBUCIÓN POR CATEGORÍA de borde a borde en 3 columnas
    h(
      "div",
      { className: "server-categories-banner" },
      h(
        "div",
        { className: "server-categories-header" },
        h("span", { className: "server-categories-label" }, "DISTRIBUCIÓN POR CATEGORÍA"),
        h("span", { className: "server-categories-count" }, `${porCategoria.length} categorías`)
      ),
      h(
        "div",
        { className: "server-categories-grid-3col" },
        porCategoria.length === 0
          ? h("p", { className: "text-muted small col-span-3" }, "Sin categorías registradas")
          : porCategoria.map((c) => {
              const pct = c.porcentaje || (total > 0 ? (c.totalItems / total) * 100 : 0);
              return h(
                "div",
                {
                  key: c.categoria,
                  className: "server-category-card cursor-pointer",
                  onClick: () => onSeleccionarCategoria && onSeleccionarCategoria(c.categoria),
                  title: `Filtrar por categoría ${c.nombre}`
                },
                h(
                  "div",
                  { className: "turno-progress-header" },
                  h("span", { className: "turno-progress-name" }, c.nombre),
                  h("span", { className: "turno-progress-count" }, `${c.totalItems} (${c.cantidadTotal} uds)`)
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
    )
  );
}
