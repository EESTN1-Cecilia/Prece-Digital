import React, { useState, useEffect, useCallback, useMemo } from "react";
import { h, ActionButton, IconoFigma } from "../../../layouts/site-layout.js";
import { DashboardCard } from "../../../components/dashboard/dashboard-card.js";
import { LoadingState, EmptyState, ErrorState } from "../../../components/common/state-handlers.js";
import { InventarioService } from "./inventario-service.js";
import { InventarioFilters } from "./components/inventario-filters.js";
import { InventarioTable } from "./components/inventario-table.js";
import { MaterialDeactivateModal } from "./components/material-deactivate-modal.js";
import { MaterialQuickStockModal } from "./components/material-quick-stock-modal.js";
import { usePermisos } from "../../../estado/index.js";
import { PERMISOS } from "../../../utils/permisos.js";

export default function InventarioListView() {
  const { puede } = usePermisos();
  const canCreate = puede(PERMISOS.inventoryCrear);
  const canEdit = puede(PERMISOS.inventoryEditar);
  const canManage = puede(PERMISOS.inventoryGestionar);

  // Estados de datos
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [feedbackMessage, setFeedbackMessage] = useState(null);

  // Filtros y Búsqueda
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("todos");
  const [selectedStatus, setSelectedStatus] = useState("todos");
  const [selectedLocation, setSelectedLocation] = useState("todas");
  const [selectedStockCondition, setSelectedStockCondition] = useState("todos");
  const [includeInactive, setIncludeInactive] = useState(false);
  const [viewMode, setViewMode] = useState("table");

  // Ordenamiento y Paginación
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modales
  const [deactivateItem, setDeactivateItem] = useState(null);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [stockModalItem, setStockModalItem] = useState(null);

  // Debounce para búsqueda en tiempo real
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  // Carga de datos de inventario desde la API
  const fetchInventory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await InventarioService.getMateriales({
        category: selectedCategory !== "todos" ? selectedCategory : undefined,
        status: selectedStatus !== "todos" ? selectedStatus : undefined,
        includeInactive: includeInactive ? "true" : "false"
      });

      const list = Array.isArray(res) ? res : (res?.data || []);
      setItems(list);
    } catch (err) {
      console.error("Error al cargar inventario:", err);
      setError(err?.message || "No se pudo obtener el inventario de materiales desde el servidor.");
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, selectedStatus, includeInactive]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  // Listas dinámicas para filtros
  const categoriesList = useMemo(() => {
    const set = new Set();
    items.forEach((i) => { if (i.category) set.add(i.category); });
    ["tecnologia", "equipamiento", "material", "herramienta", "mobiliario", "otro"].forEach((c) => set.add(c));
    return Array.from(set);
  }, [items]);

  const locationsList = useMemo(() => {
    const set = new Set();
    items.forEach((i) => { if (i.location) set.add(i.location); });
    return Array.from(set);
  }, [items]);

  const statusesList = useMemo(() => {
    return ["disponible", "en_uso", "mantenimiento", "dado_de_baja"];
  }, []);

  // Métricas agregadas de stock
  const metrics = useMemo(() => {
    let totalStock = 0;
    let disponibles = 0;
    let stockBajo = 0;
    let sinStock = 0;
    const catSet = new Set();

    items.forEach((i) => {
      totalStock += (i.quantity || 0);
      if (i.category) catSet.add(i.category);
      if (i.quantity === 0) {
        sinStock++;
      } else if (i.quantity <= (i.minQuantity || 0)) {
        stockBajo++;
      } else {
        disponibles++;
      }
    });

    return {
      totalMateriales: items.length,
      totalStock,
      disponibles,
      stockBajo,
      sinStock,
      totalCategorias: catSet.size
    };
  }, [items]);

  // Filtrado en memoria (búsqueda multicampo, ubicación y condición de stock)
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (debouncedSearch.trim()) {
        const q = debouncedSearch.toLowerCase().trim();
        const matchName = (item.name || "").toLowerCase().includes(q);
        const matchCode = (item.code || "").toLowerCase().includes(q);
        const matchDesc = (item.description || "").toLowerCase().includes(q);
        const matchCat = (item.category || "").toLowerCase().includes(q);
        const matchLoc = (item.location || "").toLowerCase().includes(q);
        const matchId = (item.id || "").toLowerCase().includes(q);

        if (!matchName && !matchCode && !matchDesc && !matchCat && !matchLoc && !matchId) {
          return false;
        }
      }

      if (selectedLocation !== "todas" && selectedLocation !== "") {
        if (item.location !== selectedLocation) return false;
      }

      if (selectedStockCondition === "con_stock") {
        if ((item.quantity || 0) <= 0) return false;
      } else if (selectedStockCondition === "stock_bajo") {
        if ((item.quantity || 0) <= 0 || (item.quantity || 0) > (item.minQuantity || 0)) return false;
      } else if (selectedStockCondition === "sin_stock") {
        if ((item.quantity || 0) > 0) return false;
      } else if (selectedStockCondition === "en_uso") {
        if (item.status !== "en_uso") return false;
      }

      return true;
    });
  }, [items, debouncedSearch, selectedLocation, selectedStockCondition]);

  // Ordenamiento
  const sortedItems = useMemo(() => {
    const list = [...filteredItems];
    list.sort((a, b) => {
      let valA = a[sortBy];
      let valB = b[sortBy];

      if (typeof valA === "string") valA = valA.toLowerCase();
      if (typeof valB === "string") valB = valB.toLowerCase();
      if (valA === undefined || valA === null) valA = "";
      if (valB === undefined || valB === null) valB = "";

      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [filteredItems, sortBy, sortOrder]);

  // Paginación
  const totalPages = Math.max(1, Math.ceil(sortedItems.length / pageSize));
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedItems.slice(start, start + pageSize);
  }, [sortedItems, currentPage, pageSize]);

  // Handlers
  const handleSort = (fieldKey, order) => {
    setSortBy(fieldKey);
    setSortOrder(order);
  };

  const handleClearAllFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setSelectedCategory("todos");
    setSelectedStatus("todos");
    setSelectedLocation("todas");
    setSelectedStockCondition("todos");
    setIncludeInactive(false);
    setCurrentPage(1);
  };

  const handleConfirmDeactivate = async (item) => {
    setIsDeactivating(true);
    try {
      await InventarioService.deleteMaterial(item.id);
      setFeedbackMessage({
        type: "success",
        text: `El material "${item.name}" (${item.code || item.id}) ha sido dado de baja correctamente.`
      });
      setDeactivateItem(null);
      fetchInventory();
    } catch (err) {
      console.error("Error al desactivar material:", err);
      setFeedbackMessage({
        type: "danger",
        text: err?.message || "No se pudo desactivar el material. Verifique los permisos o el estado del recurso."
      });
    } finally {
      setIsDeactivating(false);
    }
  };

  return h(
    "section",
    { className: "welcome-panel alumnos-panel server-panel" },

    // Barra superior institucional
    h(
      "div",
      { className: "dashboard-top-bar alumnos-top-nav" },
      h(
        "button",
        {
          type: "button",
          className: "btn-volver-atras",
          onClick: () => {
            window.location.hash = "#/server";
          },
          title: "Volver al Dashboard de Server"
        },
        h(
          "svg",
          {
            className: "btn-volver-atras__icon",
            viewBox: "0 0 20 20",
            fill: "currentColor"
          },
          h("path", {
            fillRule: "evenodd",
            d: "M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z",
            clipRule: "evenodd"
          })
        ),
        h("span", null, "Volver a Server")
      ),
      h(
        "div",
        { className: "alumnos-top-badges" },
        h("span", { className: "badge-institucion" }, "E.E.S.T N° 1 Monte Grande"),
        h("span", { className: "badge-ciclo" }, "Server & Recursos 2026")
      )
    ),

    // Encabezado descriptivo de la página
    h(
      "div",
      { className: "alumnos-header-block" },
      h(
        "div",
        { className: "alumnos-title-row" },
        h("h1", { className: "alumnos-page-title" }, "Inventario de Materiales de Server"),
        h("span", { className: "alumnos-school-badge" }, "E.E.S.T N° 1 Monte Grande")
      ),
      h(
        "p",
        { className: "alumnos-intro-desc" },
        "Administración centralizada de existencias, insumos técnicos, herramientas y equipamiento institucional."
      )
    ),

    // Mensaje de feedback temporal
    feedbackMessage
      ? h(
          "div",
          { className: `server-alert server-alert--${feedbackMessage.type} alert-dismissible` },
          h(IconoFigma, { nombre: "alert", className: "alert-icon" }),
          h("div", { className: "alert-text" }, feedbackMessage.text),
          h(
            "button",
            {
              type: "button",
              className: "alert-close-btn",
              onClick: () => setFeedbackMessage(null)
            },
            "×"
          )
        )
      : null,

  // Tarjetas de Métricas de Inventario (Estilo KPI institucional para Server)
    h(
      "div",
      { className: "kpi-summary-grid inventario-kpi-row" },

      // 1. Total Materiales (Azul)
      h(
        "div",
        {
          className: `kpi-metric-card kpi-metric-card--blue kpi-metric-card--clickable ${selectedStockCondition === "todos" ? "kpi-metric-card--active" : ""}`,
          role: "button",
          tabIndex: 0,
          onClick: () => {
            setSelectedStockCondition("todos");
            setCurrentPage(1);
          },
          title: "Filtrar todos los materiales"
        },
        h(
          "div",
          { className: "kpi-metric-card__icon-box kpi-metric-card__icon-box--blue" },
          h(IconoFigma, { nombre: "clipboard", className: "kpi-card-icon" })
        ),
        h(
          "div",
          { className: "kpi-metric-card__content" },
          h("span", { className: "kpi-metric-card__label" }, "Total Materiales"),
          h("div", { className: "kpi-metric-card__value" }, metrics.totalMateriales),
          h(
            "div",
            { className: "kpi-metric-card__subrow" },
            h("span", { className: "kpi-metric-card__period" }, `${metrics.totalStock} unidades físicas`),
            h("span", { className: "kpi-metric-card__trend" }, `${metrics.totalCategorias} categorías`)
          )
        )
      ),

      // 2. En Stock / Disponibles (Verde)
      h(
        "div",
        {
          className: `kpi-metric-card kpi-metric-card--green kpi-metric-card--clickable ${selectedStockCondition === "con_stock" ? "kpi-metric-card--active" : ""}`,
          role: "button",
          tabIndex: 0,
          onClick: () => {
            setSelectedStockCondition("con_stock");
            setCurrentPage(1);
          },
          title: "Filtrar materiales con stock disponible"
        },
        h(
          "div",
          { className: "kpi-metric-card__icon-box kpi-metric-card__icon-box--green" },
          h(IconoFigma, { nombre: "attendance", className: "kpi-card-icon" })
        ),
        h(
          "div",
          { className: "kpi-metric-card__content" },
          h("span", { className: "kpi-metric-card__label" }, "En Stock / Disponibles"),
          h("div", { className: "kpi-metric-card__value" }, metrics.disponibles),
          h(
            "div",
            { className: "kpi-metric-card__subrow" },
            h("span", { className: "kpi-metric-card__period" }, "Disponibles en Server"),
            h("span", { className: "kpi-metric-card__trend text-success font-semibold" }, "Listos para entrega")
          )
        )
      ),

      // 3. Stock Bajo (Ámbar)
      h(
        "div",
        {
          className: `kpi-metric-card kpi-metric-card--amber kpi-metric-card--clickable ${selectedStockCondition === "stock_bajo" ? "kpi-metric-card--active" : ""}`,
          role: "button",
          tabIndex: 0,
          onClick: () => {
            setSelectedStockCondition("stock_bajo");
            setCurrentPage(1);
          },
          title: "Filtrar materiales con stock bajo"
        },
        h(
          "div",
          { className: "kpi-metric-card__icon-box kpi-metric-card__icon-box--amber" },
          h(IconoFigma, { nombre: "alert", className: "kpi-card-icon" })
        ),
        h(
          "div",
          { className: "kpi-metric-card__content" },
          h("span", { className: "kpi-metric-card__label" }, "Stock Bajo (Crítico)"),
          h("div", { className: "kpi-metric-card__value text-warning" }, metrics.stockBajo),
          h(
            "div",
            { className: "kpi-metric-card__subrow" },
            h("span", { className: "kpi-metric-card__period" }, "Por debajo del mínimo"),
            h("span", { className: "kpi-metric-card__trend text-warning font-semibold" }, "Requiere compra")
          )
        )
      ),

      // 4. Materiales Agotados (Rojo)
      h(
        "div",
        {
          className: `kpi-metric-card kpi-metric-card--red kpi-metric-card--clickable ${selectedStockCondition === "sin_stock" ? "kpi-metric-card--active" : ""}`,
          role: "button",
          tabIndex: 0,
          onClick: () => {
            setSelectedStockCondition("sin_stock");
            setCurrentPage(1);
          },
          title: "Filtrar materiales sin stock"
        },
        h(
          "div",
          { className: "kpi-metric-card__icon-box kpi-metric-card__icon-box--red" },
          h(IconoFigma, { nombre: "filter", className: "kpi-card-icon" })
        ),
        h(
          "div",
          { className: "kpi-metric-card__content" },
          h("span", { className: "kpi-metric-card__label" }, "Materiales Agotados"),
          h("div", { className: "kpi-metric-card__value text-danger" }, metrics.sinStock),
          h(
            "div",
            { className: "kpi-metric-card__subrow" },
            h("span", { className: "kpi-metric-card__period" }, "0 unidades disponibles"),
            h("span", { className: "kpi-metric-card__trend text-danger font-semibold" }, "Sin stock")
          )
        )
      )
    ),

    // Tarjeta Principal del Catálogo de Inventario
    h(
      DashboardCard,
      {
        title: "Catálogo General de Materiales y Recursos",
        icon: "clipboard",
        badge: `${sortedItems.length} materiales listados`,
        className: "dashboard-card--highlight alumnos-main-card inventario-main-card",
        collapsible: false,
        actions: h(
          "div",
          { className: "alumnos-header-actions" },
          h(
            "button",
            {
              type: "button",
              className: "action-button action-button--secondary",
              onClick: fetchInventory,
              disabled: loading,
              title: "Refrescar datos desde la API"
            },
            "Actualizar"
          ),
          canCreate
            ? h(
                ActionButton,
                {
                  tone: "primary",
                  icon: "clipboard",
                  onClick: () => {
                    window.location.hash = "#/inventario/nuevo";
                  }
                },
                "+ Registrar Material"
              )
            : null
        )
      },

      // Barra de Búsqueda y Filtros con diseño de Pills
      h(InventarioFilters, {
        search,
        onSearchChange: setSearch,
        onClearSearch: () => setSearch(""),
        category: selectedCategory,
        onCategoryChange: (cat) => { setSelectedCategory(cat); setCurrentPage(1); },
        stockCondition: selectedStockCondition,
        onStockConditionChange: (cond) => { setSelectedStockCondition(cond); setCurrentPage(1); },
        includeInactive,
        onIncludeInactiveChange: (inc) => { setIncludeInactive(inc); setCurrentPage(1); },
        categoriesList,
        onClearAllFilters: handleClearAllFilters,
        viewMode,
        onViewModeChange: setViewMode
      }),

      // Estado de Carga
      loading ? h(LoadingState, { mensaje: "Cargando existencias y catálogo de materiales..." }) : null,

      // Estado de Error
      error ? h(ErrorState, { mensaje: error, onRetry: fetchInventory }) : null,

      // Estado Vacío
      !loading && !error && sortedItems.length === 0
        ? h(EmptyState, {
            mensaje: debouncedSearch.trim() || selectedCategory !== "todos" || selectedStatus !== "todos" || selectedLocation !== "todas" || selectedStockCondition !== "todos"
              ? "No se encontraron materiales que coincidan con los criterios y filtros seleccionados."
              : "No hay materiales registrados en el inventario institucional.",
            action: h(
              "button",
              {
                type: "button",
                className: "action-button action-button--secondary",
                onClick: handleClearAllFilters
              },
              "Restablecer Filtros"
            )
          })
        : null,

      // Contenido de la Tabla / Tarjetas
      !loading && !error && sortedItems.length > 0
        ? h(
            React.Fragment,
            null,
            h(InventarioTable, {
              materials: paginatedItems,
              viewMode,
              sortBy,
              sortOrder,
              onSort: handleSort,
              onOpenStock: (item) => setStockModalItem(item),
              onDeactivate: (item) => setDeactivateItem(item),
              canEdit,
              canManage
            }),

            // Paginación y Barra Inferior
            h(
              "div",
              { className: "alumnos-pagination-row" },
              h(
                "div",
                { className: "pagination-info" },
                h(
                  "span",
                  { className: "pagination-counter-text" },
                  `Página ${currentPage} de ${totalPages} • Mostrando ${Math.min((currentPage - 1) * pageSize + 1, sortedItems.length)}-${Math.min(currentPage * pageSize, sortedItems.length)} de ${sortedItems.length} materiales`
                )
              ),
              h(
                "div",
                { className: "pagination-controls-buttons" },
                h(
                  "button",
                  {
                    type: "button",
                    className: "pagination-btn",
                    disabled: currentPage <= 1,
                    onClick: () => setCurrentPage(1),
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
                    onClick: () => setCurrentPage((prev) => Math.max(1, prev - 1)),
                    title: "Página anterior"
                  },
                  "‹ Ant"
                ),
                h(
                  "span",
                  { className: "pagination-current-badge" },
                  `Pág. ${currentPage}`
                ),
                h(
                  "button",
                  {
                    type: "button",
                    className: "pagination-btn",
                    disabled: currentPage >= totalPages,
                    onClick: () => setCurrentPage((prev) => Math.min(totalPages, prev + 1)),
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
                    onClick: () => setCurrentPage(totalPages),
                    title: "Última página"
                  },
                  "»"
                )
              ),
              h(
                "div",
                { className: "alumnos-bottom-actions" },
                h(
                  "div",
                  { className: "inventario-page-size-picker" },
                  h("span", { className: "text-muted text-xs" }, "Por pág:"),
                  h(
                    "select",
                    {
                      className: "select-filter select-filter--sm",
                      value: pageSize,
                      onChange: (e) => {
                        setPageSize(Number(e.target.value));
                        setCurrentPage(1);
                      }
                    },
                    h("option", { value: 5 }, "5"),
                    h("option", { value: 10 }, "10"),
                    h("option", { value: 25 }, "25"),
                    h("option", { value: 50 }, "50")
                  )
                )
              )
            )
          )
        : null
    ),

    // Modal de Confirmación para Desactivar Material
    h(MaterialDeactivateModal, {
      material: deactivateItem,
      isOpen: Boolean(deactivateItem),
      onClose: () => setDeactivateItem(null),
      onConfirm: handleConfirmDeactivate,
      loading: isDeactivating
    }),

    // Modal de Consulta Rápida de Stock
    h(MaterialQuickStockModal, {
      material: stockModalItem,
      isOpen: Boolean(stockModalItem),
      onClose: () => setStockModalItem(null)
    })
  );
}
