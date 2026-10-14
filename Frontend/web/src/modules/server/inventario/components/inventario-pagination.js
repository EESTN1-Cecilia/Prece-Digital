import { h } from "../../../../layouts/site-layout.js";

export function InventarioPagination({
  currentPage = 1,
  totalPages = 1,
  totalItems = 0,
  pageSize = 10,
  onPageChange,
  onPageSizeChange
}) {
  if (totalItems === 0) return null;

  const startItem = Math.min((currentPage - 1) * pageSize + 1, totalItems);
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return h(
    "div",
    { className: "inventario-pagination" },
    h(
      "div",
      { className: "inventario-pagination__info" },
      h("span", null, `Mostrando ${startItem} - ${endItem} de ${totalItems} materiales`)
    ),
    h(
      "div",
      { className: "inventario-pagination__controls" },
      h(
        "div",
        { className: "inventario-pagination__size" },
        h("label", { htmlFor: "page-size-select" }, "Por página:"),
        h(
          "select",
          {
            id: "page-size-select",
            className: "custom-select-native",
            value: pageSize,
            onChange: (e) => onPageSizeChange(Number(e.target.value))
          },
          h("option", { value: 5 }, "5"),
          h("option", { value: 10 }, "10"),
          h("option", { value: 25 }, "25"),
          h("option", { value: 50 }, "50")
        )
      ),
      h(
        "div",
        { className: "inventario-pagination__buttons" },
        h(
          "button",
          {
            type: "button",
            className: "pagination-btn",
            disabled: currentPage <= 1,
            onClick: () => onPageChange(1),
            title: "Primera página"
          },
          "«"
        ),
        h(
          "button",
          {
            type: "button",
            className: "pagination-btn",
            disabled: currentPage <= 1,
            onClick: () => onPageChange(currentPage - 1),
            title: "Página anterior"
          },
          "‹ Ant"
        ),
        h(
          "span",
          { className: "pagination-page-indicator" },
          `Página ${currentPage} de ${Math.max(1, totalPages)}`
        ),
        h(
          "button",
          {
            type: "button",
            className: "pagination-btn",
            disabled: currentPage >= totalPages,
            onClick: () => onPageChange(currentPage + 1),
            title: "Página siguiente"
          },
          "Sig ›"
        ),
        h(
          "button",
          {
            type: "button",
            className: "pagination-btn",
            disabled: currentPage >= totalPages,
            onClick: () => onPageChange(totalPages),
            title: "Última página"
          },
          "»"
        )
      )
    )
  );
}
