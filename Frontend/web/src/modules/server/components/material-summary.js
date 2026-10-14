import React from "react";
import { h, IconoFigma } from "../../../layouts/site-layout.js";
import { EmptyState } from "../../../components/common/state-handlers.js";

function getStockBadge(item) {
  if (item.quantity === 0) {
    return h("span", { className: "status-badge status-badge--danger" }, "Sin stock");
  }
  if (item.quantity <= item.minQuantity) {
    return h("span", { className: "status-badge status-badge--warning" }, "Stock bajo");
  }
  if (item.status === "en_uso") {
    return h("span", { className: "status-badge status-badge--info" }, "En uso");
  }
  return h("span", { className: "status-badge status-badge--success" }, "Disponible");
}

function getCategoryBadge(categoria) {
  const cat = (categoria || "otro").toLowerCase();
  const colors = {
    tecnologia: "badge-blue",
    material: "badge-purple",
    equipamiento: "badge-cyan",
    herramienta: "badge-amber",
    mobiliario: "badge-slate"
  };
  const colorClass = colors[cat] || "badge-slate";
  return h("span", { className: `server-cat-tag ${colorClass}` }, categoria || "General");
}

export function MaterialSummary({
  materiales = [],
  onVerDetalle,
  onRegistrarMovimiento
}) {
  if (!materiales || materiales.length === 0) {
    return h(EmptyState, { mensaje: "No se encontraron materiales que coincidan con los filtros seleccionados." });
  }

  return h(
    "div",
    { className: "server-table-container" },
    h(
      "table",
      { className: "server-table" },
      h(
        "thead",
        null,
        h(
          "tr",
          null,
          h("th", null, "Material / Código"),
          h("th", null, "Categoría"),
          h("th", { className: "text-center" }, "Stock"),
          h("th", null, "Ubicación"),
          h("th", null, "Estado"),
          h("th", { className: "text-right" }, "Acciones")
        )
      ),
      h(
        "tbody",
        null,
        materiales.map((item) =>
          h(
            "tr",
            { key: item.id, className: "server-table-row" },
            h(
              "td",
              null,
              h(
                "div",
                { className: "server-item-cell" },
                h("strong", { className: "server-item-name" }, item.name),
                h(
                  "span",
                  { className: "server-item-code" },
                  `${item.code || item.id} • ${item.brand || "Sin marca"} ${item.model || ""}`.trim()
                )
              )
            ),
            h("td", null, getCategoryBadge(item.category)),
            h(
              "td",
              { className: "text-center" },
              h(
                "div",
                { className: "stock-quantity-cell" },
                h(
                  "strong",
                  { className: `stock-qty-val ${item.quantity === 0 ? "text-danger" : item.quantity <= item.minQuantity ? "text-warning" : "text-success"}` },
                  `${item.quantity} ${item.unit || "uds"}`
                ),
                h("span", { className: "stock-min-sub" }, `Mín: ${item.minQuantity}`)
              )
            ),
            h(
              "td",
              null,
              h("span", { className: "server-location-tag" }, item.location || item.spaceId || "Server Central")
            ),
            h("td", null, getStockBadge(item)),
            h(
              "td",
              { className: "text-right" },
              h(
                "div",
                { className: "server-row-actions" },
                h(
                  "button",
                  {
                    type: "button",
                    className: "btn-table-action btn-table-action--view",
                    onClick: () => {
                      if (item?.id) {
                        window.location.hash = `#/inventario/${encodeURIComponent(item.id)}`;
                      } else {
                        window.location.hash = "#/inventario";
                      }
                    },
                    title: "Ver en inventario institucional"
                  },
                  h(IconoFigma, { className: "btn-action-icon", nombre: "eye" }),
                  "Detalle"
                )
              )
            )
          )
        )
      )
    )
  );
}
