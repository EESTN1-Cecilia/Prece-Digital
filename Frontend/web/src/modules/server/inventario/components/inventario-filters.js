import { h, IconoFigma } from "../../../../layouts/site-layout.js";

export function InventarioFilters({
  search = "",
  onSearchChange,
  onClearSearch,
  category = "todos",
  onCategoryChange,
  stockCondition = "todos",
  onStockConditionChange,
  includeInactive = false,
  onIncludeInactiveChange,
  categoriesList = ["tecnologia", "equipamiento", "material", "herramienta", "mobiliario", "otro"],
  onClearAllFilters,
  viewMode = "table",
  onViewModeChange
}) {
  const isFiltered =
    Boolean(search && search.trim()) ||
    (category && category !== "todos" && category !== "todas") ||
    (stockCondition && stockCondition !== "todos") ||
    includeInactive;

  const stockOptions = [
    { id: "todos", label: "Todos" },
    { id: "stock_bajo", label: "Stock Bajo" },
    { id: "sin_stock", label: "Sin Stock" },
    { id: "con_stock", label: "Disponibles" },
    { id: "en_uso", label: "En Uso" }
  ];

  return h(
    "div",
    { className: "server-dashboard-filters inventario-dashboard-filters" },

    // Fila 1: Buscador + Switch de Vista
    h(
      "div",
      { className: "server-filters-top" },
      h(
        "div",
        { className: "server-search-box flex-1" },
        h(IconoFigma, { className: "server-search-icon", nombre: "search" }),
        h("input", {
          type: "text",
          className: "server-search-input",
          placeholder: "Buscar material por nombre, código, marca o ubicación...",
          value: search || "",
          onChange: (e) => onSearchChange && onSearchChange(e.target.value),
          "aria-label": "Buscar en el inventario"
        }),
        search
          ? h(
              "button",
              {
                type: "button",
                className: "server-search-clear-btn",
                onClick: onClearSearch,
                "aria-label": "Limpiar búsqueda"
              },
              "×"
            )
          : null
      ),

      // Switch de Vista: Tabla vs Tarjetas
      h(
        "div",
        { className: "view-mode-toggle", role: "group", "aria-label": "Modo de visualización" },
        h(
          "button",
          {
            type: "button",
            className: `view-mode-btn ${viewMode === "table" ? "active" : ""}`,
            onClick: () => onViewModeChange("table"),
            title: "Vista en tabla",
            "aria-label": "Vista en tabla"
          },
          h(
            "svg",
            {
              className: "view-mode-icon",
              viewBox: "0 0 20 20",
              fill: "none",
              stroke: "currentColor",
              strokeWidth: "2.2",
              strokeLinecap: "round"
            },
            h("circle", { cx: "4", cy: "5.5", r: "1", fill: "currentColor", stroke: "none" }),
            h("line", { x1: "8", y1: "5.5", x2: "16.5", y2: "5.5" }),
            h("circle", { cx: "4", cy: "10", r: "1", fill: "currentColor", stroke: "none" }),
            h("line", { x1: "8", y1: "10", x2: "16.5", y2: "10" }),
            h("circle", { cx: "4", cy: "14.5", r: "1", fill: "currentColor", stroke: "none" }),
            h("line", { x1: "8", y1: "14.5", x2: "16.5", y2: "14.5" })
          )
        ),
        h(
          "button",
          {
            type: "button",
            className: `view-mode-btn ${viewMode === "grid" || viewMode === "card" ? "active" : ""}`,
            onClick: () => onViewModeChange("grid"),
            title: "Vista en tarjetas",
            "aria-label": "Vista en tarjetas"
          },
          h(
            "svg",
            {
              className: "view-mode-icon",
              viewBox: "0 0 20 20",
              fill: "none",
              stroke: "currentColor",
              strokeWidth: "2",
              strokeLinecap: "round"
            },
            h("rect", { x: "3", y: "3.5", width: "5.5", height: "5.5", rx: "1.2" }),
            h("rect", { x: "11.5", y: "3.5", width: "5.5", height: "5.5", rx: "1.2" }),
            h("rect", { x: "3", y: "11", width: "5.5", height: "5.5", rx: "1.2" }),
            h("rect", { x: "11.5", y: "11", width: "5.5", height: "5.5", rx: "1.2" })
          )
        )
      ),

      isFiltered
        ? h(
            "button",
            {
              type: "button",
              className: "btn-limpiar-filtros",
              onClick: onClearAllFilters
            },
            h(IconoFigma, { className: "btn-limpiar-icon", nombre: "filter" }),
            "Limpiar filtros"
          )
        : null
    ),

    // Fila 2: Pills de Categorías
    h(
      "div",
      { className: "server-filters-pills-row" },
      h(
        "div",
        { className: "filter-pills-group" },
        h("span", { className: "filter-group-label" }, "CATEGORÍA:"),
        h(
          "button",
          {
            type: "button",
            className: `filter-pill ${category === "todos" || category === "todas" ? "active" : ""}`,
            onClick: () => onCategoryChange && onCategoryChange("todos")
          },
          "Todas"
        ),
        categoriesList.map((cat) =>
          h(
            "button",
            {
              key: cat,
              type: "button",
              className: `filter-pill ${category === cat ? "active" : ""}`,
              onClick: () => onCategoryChange && onCategoryChange(cat)
            },
            cat.charAt(0).toUpperCase() + cat.slice(1)
          )
        )
      )
    ),

    // Fila 3: Pills de Estado de Stock + Checkbox de Dados de Baja
    h(
      "div",
      { className: "server-filters-pills-row" },
      h(
        "div",
        { className: "filter-pills-group flex-1 flex-wrap" },
        h("span", { className: "filter-group-label" }, "ESTADO DE STOCK:"),
        stockOptions.map((st) =>
          h(
            "button",
            {
              key: st.id,
              type: "button",
              className: `filter-pill ${stockCondition === st.id ? "active" : ""}`,
              onClick: () => onStockConditionChange && onStockConditionChange(st.id)
            },
            st.label
          )
        )
      ),
      h(
        "div",
        { className: "checkbox-filter-box" },
        h(
          "label",
          { className: "checkbox-label" },
          h("input", {
            type: "checkbox",
            checked: includeInactive,
            onChange: (e) => onIncludeInactiveChange && onIncludeInactiveChange(e.target.checked)
          }),
          "Ver Dados de Baja"
        )
      )
    )
  );
}
