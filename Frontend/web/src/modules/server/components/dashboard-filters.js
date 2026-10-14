import React from "react";
import { h, IconoFigma } from "../../../layouts/site-layout.js";

export function DashboardFilters({
  busqueda,
  onCambioBusqueda,
  categoriaSeleccionada,
  onSeleccionarCategoria,
  estadoSeleccionado,
  onSeleccionarEstado,
  categorias = ["tecnologia", "material", "equipamiento", "herramienta", "mobiliario"],
  onLimpiarFiltros
}) {
  const hayFiltrosActivos =
    Boolean(busqueda) ||
    (categoriaSeleccionada && categoriaSeleccionada !== "todas") ||
    (estadoSeleccionado && estadoSeleccionado !== "todos");

  const estados = [
    { id: "todos", label: "Todos" },
    { id: "bajo", label: "Stock Bajo" },
    { id: "agotado", label: "Sin Stock" },
    { id: "disponible", label: "Disponibles" },
    { id: "en_uso", label: "En Uso" }
  ];

  return h(
    "div",
    { className: "server-dashboard-filters" },

    // Fila superior: Barra de búsqueda + Botón limpiar
    h(
      "div",
      { className: "server-filters-top" },
      h(
        "div",
        { className: "server-search-box" },
        h(IconoFigma, { className: "server-search-icon", nombre: "search" }),
        h("input", {
          type: "text",
          className: "server-search-input",
          placeholder: "Buscar material por nombre, código, marca o ubicación...",
          value: busqueda || "",
          onChange: (e) => onCambioBusqueda && onCambioBusqueda(e.target.value)
        }),
        busqueda
          ? h(
              "button",
              {
                type: "button",
                className: "server-search-clear-btn",
                onClick: () => onCambioBusqueda && onCambioBusqueda("")
              },
              "×"
            )
          : null
      ),
      hayFiltrosActivos
        ? h(
            "button",
            {
              type: "button",
              className: "btn-limpiar-filtros",
              onClick: onLimpiarFiltros
            },
            h(IconoFigma, { className: "btn-limpiar-icon", nombre: "filter" }),
            "Limpiar filtros"
          )
        : null
    ),

    // Fila de Pills: Categorías y Estados
    h(
      "div",
      { className: "server-filters-pills-row" },
      h(
        "div",
        { className: "filter-pills-group" },
        h("span", { className: "filter-group-label" }, "Categoría:"),
        h(
          "button",
          {
            type: "button",
            className: `filter-pill ${categoriaSeleccionada === "todas" ? "active" : ""}`,
            onClick: () => onSeleccionarCategoria && onSeleccionarCategoria("todas")
          },
          "Todas"
        ),
        categorias.map((cat) =>
          h(
            "button",
            {
              key: cat,
              type: "button",
              className: `filter-pill ${categoriaSeleccionada === cat ? "active" : ""}`,
              onClick: () => onSeleccionarCategoria && onSeleccionarCategoria(cat)
            },
            cat.charAt(0).toUpperCase() + cat.slice(1)
          )
        )
      ),

      h(
        "div",
        { className: "filter-pills-group" },
        h("span", { className: "filter-group-label" }, "Estado de Stock:"),
        estados.map((est) =>
          h(
            "button",
            {
              key: est.id,
              type: "button",
              className: `filter-pill ${estadoSeleccionado === est.id ? "active" : ""}`,
              onClick: () => onSeleccionarEstado && onSeleccionarEstado(est.id)
            },
            est.label
          )
        )
      )
    )
  );
}
