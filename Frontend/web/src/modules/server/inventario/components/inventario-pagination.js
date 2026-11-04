import { h } from "../../../../layouts/site-layout.js";
import { CustomSelect } from "../../../../components/common/custom-select.js";

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
        h("span", { className: "inventario-pagination__size-label" }, "Por página:"),
        h(CustomSelect, {
          id: "page-size-select",
          className: "pagination-custom-select",
          dropUp: true,
          value: String(pageSize),
          ariaLabel: "Cantidad de materiales por página",
          options: [
            { value: "5", label: "5 por pág." },
            { value: "10", label: "10 por pág." },
            { value: "25", label: "25 por pág." },
            { value: "50", label: "50 por pág." }
          ],
          onChange: (val) => onPageSizeChange(Number(val))
        })
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
