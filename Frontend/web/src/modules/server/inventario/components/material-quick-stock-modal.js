import { h, ActionButton, IconoFigma } from "../../../../layouts/site-layout.js";
import { MaterialStockStatus } from "./material-stock-status.js";

export function MaterialQuickStockModal({
  material,
  isOpen,
  onClose
}) {
  if (!isOpen || !material) return null;

  const total = material.quantity || 0;
  const min = material.minQuantity || 0;
  const diff = total - min;
  const isBajo = total <= min && total > 0;
  const isAgotado = total === 0;

  return h(
    "div",
    { className: "server-modal-backdrop", onClick: onClose },
    h(
      "div",
      {
        className: "server-modal-content server-modal-content--stock",
        onClick: (e) => e.stopPropagation(),
        role: "dialog",
        "aria-modal": "true",
        "aria-labelledby": "stock-modal-title"
      },
      h(
        "div",
        { className: "server-modal-header" },
        h(
          "div",
          { className: "server-modal-icon-badge" },
          h(IconoFigma, { nombre: "clipboard", className: "modal-header-icon" })
        ),
        h(
          "div",
          null,
          h("h3", { id: "stock-modal-title", className: "server-modal-title" }, `Consulta de Stock: ${material.name}`),
          h("p", { className: "server-modal-subtitle" }, `Código: ${material.code || "S/C"} | Categoría: ${material.category || "General"}`)
        ),
        h(
          "button",
          {
            type: "button",
            className: "server-modal-close-btn",
            onClick: onClose,
            "aria-label": "Cerrar modal"
          },
          "×"
        )
      ),

      h(
        "div",
        { className: "server-modal-body" },
        h(
          "div",
          { className: "stock-metrics-grid" },
          h(
            "div",
            { className: "stock-metric-card" },
            h("span", { className: "stock-metric-label" }, "Stock Físico Total"),
            h("span", { className: "stock-metric-value" }, `${total} ${material.unit || "unid."}`),
            h("span", { className: "stock-metric-sub" }, "En custodia institucional")
          ),
          h(
            "div",
            { className: "stock-metric-card" },
            h("span", { className: "stock-metric-label" }, "Stock Mínimo Requerido"),
            h("span", { className: "stock-metric-value" }, `${min} ${material.unit || "unid."}`),
            h("span", { className: "stock-metric-sub" }, "Umbral de reposición")
          ),
          h(
            "div",
            { className: `stock-metric-card ${diff < 0 ? "stock-metric-card--danger" : diff === 0 ? "stock-metric-card--warning" : "stock-metric-card--success"}` },
            h("span", { className: "stock-metric-label" }, "Diferencia vs Mínimo"),
            h("span", { className: "stock-metric-value" }, `${diff >= 0 ? "+" : ""}${diff}`),
            h("span", { className: "stock-metric-sub" }, diff < 0 ? "Por debajo del límite" : diff === 0 ? "En el límite justo" : "Stock suficiente")
          ),
          h(
            "div",
            { className: "stock-metric-card" },
            h("span", { className: "stock-metric-label" }, "Estado de Disponibilidad"),
            h("div", { className: "stock-metric-badge-container" },
              h(MaterialStockStatus, { quantity: total, minQuantity: min, status: material.status })
            ),
            h("span", { className: "stock-metric-sub" }, `Ubicación: ${material.location || "Server Central"}`)
          )
        ),

        isAgotado || isBajo
          ? h(
              "div",
              { className: `server-alert ${isAgotado ? "server-alert--danger" : "server-alert--warning"}` },
              h(IconoFigma, { nombre: "alert", className: "alert-icon" }),
              h(
                "div",
                null,
                h("strong", null, isAgotado ? "Material Agotado: " : "Alerta de Stock Crítico: "),
                isAgotado
                  ? "Este recurso no cuenta con unidades disponibles para entrega. Es prioritario iniciar una orden de reposición."
                  : `Se aconseja reponer al menos ${min - total + 2} ${material.unit || "unidades"} para mantener el nivel operativo.`
              )
            )
          : null,

        h(
          "div",
          { className: "stock-detail-metadata" },
          h("div", { className: "metadata-row" },
            h("span", { className: "metadata-label" }, "Marca / Modelo:"),
            h("span", { className: "metadata-val" }, [material.brand, material.model].filter(Boolean).join(" ") || "No especificado")
          ),
          h("div", { className: "metadata-row" },
            h("span", { className: "metadata-label" }, "N° Serie / Identificador:"),
            h("span", { className: "metadata-val" }, material.serialNumber || "N/A")
          ),
          h("div", { className: "metadata-row" },
            h("span", { className: "metadata-label" }, "Ubicación detallada:"),
            h("span", { className: "metadata-val" }, material.location || "Server Central")
          ),
          material.description
            ? h("div", { className: "metadata-row" },
                h("span", { className: "metadata-label" }, "Descripción:"),
                h("span", { className: "metadata-val" }, material.description)
              )
            : null
        )
      ),

      h(
        "div",
        { className: "server-modal-footer" },
        h(
          "a",
          {
            href: `#/inventario/${encodeURIComponent(material.id)}`,
            className: "action-button action-button--primary"
          },
          "Ver Detalle Completo"
        ),
        h(
          ActionButton,
          {
            tone: "secondary",
            onClick: onClose
          },
          "Cerrar"
        )
      )
    )
  );
}
