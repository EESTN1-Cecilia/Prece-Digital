import { h, IconoFigma } from "../../../../layouts/site-layout.js";
import { MaterialStockStatus, MaterialCategoryBadge } from "./material-stock-status.js";

export function InventarioTable({
  materials = [],
  viewMode = "table",
  sortBy = "name",
  sortOrder = "asc",
  onSort,
  onOpenStock,
  onDeactivate,
  canEdit = true,
  canManage = true
}) {
  const renderSortIndicator = (fieldKey) => {
    if (sortBy !== fieldKey) return null;
    return h(
      "span",
      { className: "sort-indicator-icon", "aria-hidden": "true" },
      sortOrder === "asc" ? " ▲" : " ▼"
    );
  };

  if (viewMode === "grid" || viewMode === "card") {
    return h(
      "div",
      { className: "students-cards-grid inventory-cards-grid" },
      materials.map((item) => {
        const isBajo = item.quantity <= item.minQuantity && item.quantity > 0;
        const isAgotado = item.quantity === 0;
        const isInactive = item.isActive === false || item.status === "dado_de_baja";

        return h(
          "article",
          {
            key: item.id,
            className: `student-mini-card inventory-card-item ${isAgotado ? "inventory-card--danger" : isBajo ? "inventory-card--warning" : ""}`
          },
          h(
            "div",
            { className: "student-mini-card__header" },
            h(
              "div",
              null,
              h("span", { className: "inventory-card-code font-mono" }, item.code || "S/C"),
              h("h4", { className: "student-mini-card__name" }, item.name)
            ),
            h(MaterialCategoryBadge, { category: item.category })
          ),

          item.description
            ? h("p", { className: "inventory-card-desc" }, item.description)
            : null,

          h(
            "div",
            { className: "student-mini-card__data inventory-card-data" },
            h(
              "div",
              { className: "data-item" },
              h("span", { className: "data-label" }, "Stock Físico"),
              h("span", { className: "data-value font-bold" }, `${item.quantity || 0} ${item.unit || "unid."}`)
            ),
            h(
              "div",
              { className: "data-item" },
              h("span", { className: "data-label" }, "Mínimo"),
              h("span", { className: "data-value text-muted" }, `${item.minQuantity || 0}`)
            ),
            h(
              "div",
              { className: "data-item" },
              h("span", { className: "data-label" }, "Estado"),
              h(MaterialStockStatus, { quantity: item.quantity, minQuantity: item.minQuantity, status: item.status })
            )
          ),

          h(
            "div",
            { className: "inventory-card-location" },
            h(IconoFigma, { nombre: "filter", className: "loc-icon" }),
            h("span", null, item.location || "Server Central")
          ),

          h(
            "div",
            { className: "student-mini-card__actions inventory-card-actions" },
            h(
              "button",
              {
                type: "button",
                className: "table-action-link btn-action-stock",
                onClick: () => onOpenStock(item),
                title: "Consultar métricas de stock"
              },
              "Stock"
            ),
            h(
              "a",
              {
                href: `#/inventario/${encodeURIComponent(item.id)}`,
                className: "table-action-link btn-ver-ficha-inline",
                title: "Ver detalle completo del material"
              },
              "Detalle"
            ),
            canEdit && !isInactive
              ? h(
                  "a",
                  {
                    href: `#/inventario/${encodeURIComponent(item.id)}/editar`,
                    className: "table-action-link btn-action-edit",
                    title: "Editar información del material"
                  },
                  "Editar"
                )
              : null,
            canManage && !isInactive
              ? h(
                  "button",
                  {
                    type: "button",
                    className: "table-action-link btn-action-danger",
                    onClick: () => onDeactivate(item),
                    title: "Dar de baja material"
                  },
                  "Desactivar"
                )
              : null
          )
        );
      })
    );
  }

  // Vista en Tabla estándar institucional
  return h(
    "div",
    { className: "table-responsive server-inventory-table-wrap" },
    h(
      "table",
      { className: "custom-table alumnos-table server-inventory-table", "aria-label": "Listado de materiales de inventario" },
      h(
        "thead",
        null,
        h(
          "tr",
          null,
          h(
            "th",
            {
              onClick: () => onSort("code", sortBy === "code" && sortOrder === "asc" ? "desc" : "asc"),
              className: "sortable-th",
              title: "Ordenar por Código"
            },
            "Código",
            renderSortIndicator("code")
          ),
          h(
            "th",
            {
              onClick: () => onSort("name", sortBy === "name" && sortOrder === "asc" ? "desc" : "asc"),
              className: "sortable-th",
              title: "Ordenar por Material"
            },
            "Material / Descripción",
            renderSortIndicator("name")
          ),
          h(
            "th",
            {
              onClick: () => onSort("category", sortBy === "category" && sortOrder === "asc" ? "desc" : "asc"),
              className: "sortable-th",
              title: "Ordenar por Categoría"
            },
            "Categoría",
            renderSortIndicator("category")
          ),
          h(
            "th",
            {
              onClick: () => onSort("quantity", sortBy === "quantity" && sortOrder === "asc" ? "desc" : "asc"),
              className: "sortable-th",
              title: "Ordenar por Stock Disponible"
            },
            "Stock Disponible",
            renderSortIndicator("quantity")
          ),
          h("th", null, "Mínimo"),
          h(
            "th",
            {
              onClick: () => onSort("location", sortBy === "location" && sortOrder === "asc" ? "desc" : "asc"),
              className: "sortable-th",
              title: "Ordenar por Ubicación"
            },
            "Ubicación",
            renderSortIndicator("location")
          ),
          h(
            "th",
            {
              onClick: () => onSort("status", sortBy === "status" && sortOrder === "asc" ? "desc" : "asc"),
              className: "sortable-th",
              title: "Ordenar por Estado"
            },
            "Estado",
            renderSortIndicator("status")
          ),
          h("th", { className: "text-center" }, "Acciones")
        )
      ),
      h(
        "tbody",
        null,
        materials.map((item) => {
          const isAgotado = item.quantity === 0;
          const isBajo = item.quantity <= item.minQuantity && item.quantity > 0;
          const isInactive = item.isActive === false || item.status === "dado_de_baja";

          return h(
            "tr",
            {
              key: item.id,
              className: `alumno-row inventory-row ${isAgotado ? "row-danger" : isBajo ? "row-warning" : isInactive ? "row-inactive" : ""}`
            },
            h(
              "td",
              { className: "font-mono font-bold text-slate-800" },
              item.code || "S/C"
            ),
            h(
              "td",
              null,
              h(
                "div",
                { className: "material-name-cell" },
                h(
                  "a",
                  {
                    href: `#/inventario/${encodeURIComponent(item.id)}`,
                    className: "material-name-link font-semibold text-primary"
                  },
                  item.name
                ),
                item.brand || item.model
                  ? h(
                      "span",
                      { className: "material-brand-sub text-muted" },
                      [item.brand, item.model].filter(Boolean).join(" • ")
                    )
                  : null
              )
            ),
            h(
              "td",
              null,
              h(MaterialCategoryBadge, { category: item.category })
            ),
            h(
              "td",
              { className: "font-mono font-bold text-slate-900" },
              `${item.quantity || 0} ${item.unit || "unid."}`
            ),
            h(
              "td",
              { className: "font-mono text-muted" },
              `${item.minQuantity || 0}`
            ),
            h(
              "td",
              { className: "text-slate-600" },
              item.location || "Server Central"
            ),
            h(
              "td",
              null,
              h(MaterialStockStatus, {
                quantity: item.quantity,
                minQuantity: item.minQuantity,
                status: item.status
              })
            ),
            h(
              "td",
              { className: "text-center" },
              h(
                "div",
                { className: "table-actions-inline" },
                h(
                  "button",
                  {
                    type: "button",
                    className: "table-action-link btn-action-stock",
                    onClick: () => onOpenStock(item),
                    title: "Consultar Stock"
                  },
                  "Stock"
                ),
                h(
                  "a",
                  {
                    href: `#/inventario/${encodeURIComponent(item.id)}`,
                    className: "table-action-link btn-ver-ficha-inline",
                    title: "Ver detalle completo"
                  },
                  "Detalle"
                ),
                canEdit && !isInactive
                  ? h(
                      "a",
                      {
                        href: `#/inventario/${encodeURIComponent(item.id)}/editar`,
                        className: "table-action-link btn-action-edit",
                        title: "Editar material"
                      },
                      "Editar"
                    )
                  : null,
                canManage && !isInactive
                  ? h(
                      "button",
                      {
                        type: "button",
                        className: "table-action-link btn-action-danger",
                        onClick: () => onDeactivate(item),
                        title: "Dar de baja material"
                      },
                      "Desactivar"
                    )
                  : null
              )
            )
          );
        })
      )
    )
  );
}
