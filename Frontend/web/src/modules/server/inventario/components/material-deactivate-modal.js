import { h, ActionButton, IconoFigma } from "../../../../layouts/site-layout.js";

export function MaterialDeactivateModal({
  material,
  isOpen,
  onClose,
  onConfirm,
  loading = false
}) {
  if (!isOpen || !material) return null;

  const tieneStock = (material.quantity || 0) > 0;

  return h(
    "div",
    { className: "server-modal-backdrop", onClick: onClose },
    h(
      "div",
      {
        className: "server-modal-content server-modal-content--warning",
        onClick: (e) => e.stopPropagation(),
        role: "dialog",
        "aria-modal": "true",
        "aria-labelledby": "deactivate-modal-title"
      },
      h(
        "div",
        { className: "server-modal-header" },
        h(
          "div",
          { className: "server-modal-icon-badge server-modal-icon-badge--danger" },
          h(IconoFigma, { nombre: "alert", className: "modal-header-icon" })
        ),
        h(
          "div",
          null,
          h("h3", { id: "deactivate-modal-title", className: "server-modal-title" }, "Desactivar Material"),
          h("p", { className: "server-modal-subtitle" }, "Confirmación de baja lógica en inventario de server")
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
          "p",
          null,
          "¿Estás seguro de que deseas desactivar el siguiente material? Dejará de estar disponible para solicitudes y préstamos."
        ),
        h(
          "div",
          { className: "deactivate-item-card" },
          h("div", { className: "deactivate-item-code" }, material.code || "S/C"),
          h("div", { className: "deactivate-item-name" }, material.name),
          h(
            "div",
            { className: "deactivate-item-meta" },
            h("span", null, `Categoría: ${material.category || "General"}`),
            h("span", null, ` • `),
            h("span", null, `Stock actual: ${material.quantity || 0} ${material.unit || "unidades"}`),
            h("span", null, ` • `),
            h("span", null, `Ubicación: ${material.location || "No asignada"}`)
          )
        ),

        tieneStock
          ? h(
              "div",
              { className: "server-alert server-alert--warning" },
              h(IconoFigma, { nombre: "alert", className: "alert-icon" }),
              h(
                "div",
                null,
                h("strong", null, "Atención: "),
                `Este material posee ${material.quantity} unidades en stock. Al desactivarlo, el registro se conserva como baja lógica para mantener la integridad de movimientos y auditoría.`
              )
            )
          : null
      ),

      h(
        "div",
        { className: "server-modal-footer" },
        h(
          ActionButton,
          {
            tone: "secondary",
            onClick: onClose,
            disabled: loading
          },
          "Cancelar"
        ),
        h(
          ActionButton,
          {
            tone: "danger",
            onClick: () => onConfirm(material),
            disabled: loading
          },
          loading ? "Desactivando..." : "Confirmar Desactivación"
        )
      )
    )
  );
}
