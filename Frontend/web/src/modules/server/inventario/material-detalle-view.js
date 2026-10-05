import React, { useState, useEffect, useCallback } from "react";
import { h, ActionButton, IconoFigma } from "../../../layouts/site-layout.js";
import { DashboardCard } from "../../../components/dashboard/dashboard-card.js";
import { LoadingState, EmptyState, ErrorState } from "../../../components/common/state-handlers.js";
import { InventarioService } from "./inventario-service.js";
import { MaterialStockStatus, MaterialCategoryBadge } from "./components/material-stock-status.js";
import { MaterialDeactivateModal } from "./components/material-deactivate-modal.js";
import { usePermisos, useSesion } from "../../../estado/index.js";
import { PERMISOS } from "../../../utils/permisos.js";

export default function MaterialDetalleView({ match }) {
  const { puede } = usePermisos();
  const canEdit = puede(PERMISOS.inventoryEditar);
  const canManage = puede(PERMISOS.inventoryGestionar);

  // Extraer ID del material de la ruta
  const hash = window.location.hash || "";
  const materialId = match?.parametros?.id || hash.split("/")[2] || "";

  // Estados
  const [material, setMaterial] = useState(null);
  const [movements, setMovements] = useState([]);
  const [activeTab, setActiveTab] = useState("general"); // 'general' | 'stock' | 'location' | 'movements'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [feedback, setFeedback] = useState(null);

  // Modal de Desactivación
  const [isDeactivateOpen, setIsDeactivateOpen] = useState(false);
  const [deactivating, setDeactivating] = useState(false);

  // Cargar datos del material y sus movimientos relacionados
  const fetchMaterialDetail = useCallback(async () => {
    if (!materialId) return;
    setLoading(true);
    setError(null);
    try {
      const [itemRes, movRes] = await Promise.all([
        InventarioService.getMaterial(materialId),
        InventarioService.getMovimientos({ itemId: materialId }).catch(() => ({ data: [] }))
      ]);

      setMaterial(itemRes?.data || itemRes || null);
      setMovements(Array.isArray(movRes) ? movRes : (movRes?.data || []));
    } catch (err) {
      console.error("Error al cargar detalle del material:", err);
      setError(err?.message || "No se pudo recuperar la información del material.");
    } finally {
      setLoading(false);
    }
  }, [materialId]);

  useEffect(() => {
    fetchMaterialDetail();
  }, [fetchMaterialDetail]);

  const handleDeactivate = async () => {
    if (!material) return;
    setDeactivating(true);
    try {
      await InventarioService.deleteMaterial(material.id);
      setFeedback({
        type: "success",
        text: `El material "${material.name}" ha sido dado de baja exitosamente.`
      });
      setIsDeactivateOpen(false);
      fetchMaterialDetail();
    } catch (err) {
      console.error("Error al desactivar:", err);
      setFeedback({
        type: "danger",
        text: err?.message || "No se pudo desactivar el material."
      });
    } finally {
      setDeactivating(false);
    }
  };

  if (loading) {
    return h(
      "section",
      { className: "welcome-panel alumnos-panel server-panel" },
      h(LoadingState, { mensaje: "Cargando ficha y movimientos del material..." })
    );
  }

  if (error || !material) {
    return h(
      "section",
      { className: "welcome-panel alumnos-panel server-panel" },
      h(ErrorState, {
        mensaje: error || "El material solicitado no existe o fue eliminado del sistema.",
        onRetry: fetchMaterialDetail
      })
    );
  }

  const isInactive = material.isActive === false || material.status === "dado_de_baja";
  const total = material.quantity || 0;
  const min = material.minQuantity || 0;
  const diff = total - min;
  const stockRatio = min > 0 ? Math.min(100, Math.round((total / min) * 100)) : 100;

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
            window.location.hash = "#/inventario";
          },
          title: "Volver al Inventario"
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
        h("span", null, "Volver al Inventario")
      ),
      h(
        "div",
        { className: "alumnos-top-badges" },
        h("span", { className: "badge-institucion" }, "E.E.S.T N° 1 Monte Grande"),
        h("span", { className: "badge-ciclo" }, "Ficha Técnica de Material")
      )
    ),

    // Tarjeta Principal Blanca Contenedora
    h(
      DashboardCard,
      {
        title: material.name,
        icon: "clipboard",
        badge: `${material.code || "S/C"} • ${material.status === "disponible" ? "Disponible" : material.status === "en_uso" ? "En Uso" : material.status === "mantenimiento" ? "Mantenimiento" : "Dado de baja"}`,
        className: "dashboard-card--highlight alumnos-main-card",
        collapsible: false,
        actions: h(
          "div",
          { className: "alumnos-header-actions" },
          canEdit && !isInactive
            ? h(
                ActionButton,
                {
                  tone: "primary",
                  icon: "clipboard",
                  onClick: () => {
                    window.location.hash = `#/inventario/${encodeURIComponent(material.id)}/editar`;
                  }
                },
                "Editar Material"
              )
            : null,
          canManage && !isInactive
            ? h(
                "button",
                {
                  type: "button",
                  className: "action-button action-button--danger",
                  onClick: () => setIsDeactivateOpen(true)
                },
                "Desactivar"
              )
            : null
        )
      },

    // Mensaje de feedback
    feedback
      ? h(
          "div",
          { className: `server-alert server-alert--${feedback.type} alert-dismissible` },
          h(IconoFigma, { nombre: "alert", className: "alert-icon" }),
          h("div", { className: "alert-text" }, feedback.text),
          h(
            "button",
            {
              type: "button",
              className: "alert-close-btn",
              onClick: () => setFeedback(null)
            },
            "×"
          )
        )
      : null,

    // Pestañas de Navegación del Detalle
    h(
      "div",
      { className: "detalle-tabs-bar" },
      h(
        "button",
        {
          type: "button",
          className: `detalle-tab-btn ${activeTab === "general" ? "active" : ""}`,
          onClick: () => setActiveTab("general")
        },
        h(IconoFigma, { nombre: "clipboard", className: "tab-icon" }),
        "Información General"
      ),
      h(
        "button",
        {
          type: "button",
          className: `detalle-tab-btn ${activeTab === "stock" ? "active" : ""}`,
          onClick: () => setActiveTab("stock")
        },
        h(IconoFigma, { nombre: "filter", className: "tab-icon" }),
        "Estado del Stock"
      ),
      h(
        "button",
        {
          type: "button",
          className: `detalle-tab-btn ${activeTab === "location" ? "active" : ""}`,
          onClick: () => setActiveTab("location")
        },
        h(IconoFigma, { nombre: "attendance", className: "tab-icon" }),
        "Ubicación y Espacio"
      ),
      h(
        "button",
        {
          type: "button",
          className: `detalle-tab-btn ${activeTab === "movements" ? "active" : ""}`,
          onClick: () => setActiveTab("movements")
        },
        h(IconoFigma, { nombre: "activity", className: "tab-icon" }),
        `Movimientos Relacionados (${movements.length})`
      )
    ),

    // Contenido de la pestaña activa
    activeTab === "general"
      ? h(
          "div",
          { className: "detalle-section-card" },
          h("h3", { className: "section-card-title" }, "Ficha Técnica y Descripción"),
          h(
            "div",
            { className: "detalle-grid-2" },
            h(
              "div",
              { className: "detalle-field-group" },
              h("span", { className: "detalle-field-label" }, "Nombre Oficial"),
              h("span", { className: "detalle-field-val font-semibold" }, material.name)
            ),
            h(
              "div",
              { className: "detalle-field-group" },
              h("span", { className: "detalle-field-label" }, "Código Institucional"),
              h("span", { className: "detalle-field-val font-mono" }, material.code || "S/C")
            ),
            h(
              "div",
              { className: "detalle-field-group" },
              h("span", { className: "detalle-field-label" }, "Categoría"),
              h("div", { className: "detalle-field-val" },
                h(MaterialCategoryBadge, { category: material.category })
              )
            ),
            h(
              "div",
              { className: "detalle-field-group" },
              h("span", { className: "detalle-field-label" }, "Estado Operativo"),
              h("span", { className: "detalle-field-val" }, (material.status || "disponible").toUpperCase())
            ),
            h(
              "div",
              { className: "detalle-field-group" },
              h("span", { className: "detalle-field-label" }, "Marca"),
              h("span", { className: "detalle-field-val" }, material.brand || "Sin especificar")
            ),
            h(
              "div",
              { className: "detalle-field-group" },
              h("span", { className: "detalle-field-label" }, "Modelo"),
              h("span", { className: "detalle-field-val" }, material.model || "Sin especificar")
            ),
            h(
              "div",
              { className: "detalle-field-group" },
              h("span", { className: "detalle-field-label" }, "Número de Serie / Identificador"),
              h("span", { className: "detalle-field-val font-mono" }, material.serialNumber || "No registrado")
            ),
            h(
              "div",
              { className: "detalle-field-group" },
              h("span", { className: "detalle-field-label" }, "Unidad de Medida"),
              h("span", { className: "detalle-field-val" }, material.unit || "unidad")
            ),
            h(
              "div",
              { className: "detalle-field-group" },
              h("span", { className: "detalle-field-label" }, "Fecha de Alta"),
              h("span", { className: "detalle-field-val font-mono text-muted" },
                material.createdAt ? new Date(material.createdAt).toLocaleString("es-AR") : "N/D"
              )
            ),
            h(
              "div",
              { className: "detalle-field-group" },
              h("span", { className: "detalle-field-label" }, "Última Actualización"),
              h("span", { className: "detalle-field-val font-mono text-muted" },
                material.updatedAt ? new Date(material.updatedAt).toLocaleString("es-AR") : "N/D"
              )
            )
          ),
          h(
            "div",
            { className: "detalle-field-full" },
            h("span", { className: "detalle-field-label" }, "Descripción"),
            h("p", { className: "detalle-field-desc" }, material.description || "Sin descripción adicional.")
          ),
          material.notes
            ? h(
                "div",
                { className: "detalle-field-full" },
                h("span", { className: "detalle-field-label" }, "Observaciones y Notas"),
                h("p", { className: "detalle-field-desc" }, material.notes)
              )
            : null
        )
      : activeTab === "stock"
      ? h(
          "div",
          { className: "detalle-section-card" },
          h("h3", { className: "section-card-title" }, "Control y Métricas de Stock"),
          h(
            "div",
            { className: "stock-metrics-grid" },
            h(
              "div",
              { className: "stock-metric-card" },
              h("span", { className: "stock-metric-label" }, "Stock Físico Total"),
              h("span", { className: "stock-metric-value font-mono" }, `${total} ${material.unit || "u."}`),
              h("span", { className: "stock-metric-sub" }, "En custodia institucional")
            ),
            h(
              "div",
              { className: "stock-metric-card" },
              h("span", { className: "stock-metric-label" }, "Stock Mínimo"),
              h("span", { className: "stock-metric-value font-mono" }, `${min} ${material.unit || "u."}`),
              h("span", { className: "stock-metric-sub" }, "Umbral de reposición")
            ),
            h(
              "div",
              { className: `stock-metric-card ${diff < 0 ? "stock-metric-card--danger" : diff === 0 ? "stock-metric-card--warning" : "stock-metric-card--success"}` },
              h("span", { className: "stock-metric-label" }, "Diferencia vs Mínimo"),
              h("span", { className: "stock-metric-value font-mono" }, `${diff >= 0 ? "+" : ""}${diff}`),
              h("span", { className: "stock-metric-sub" }, diff < 0 ? "Por debajo del límite" : diff === 0 ? "En el límite justo" : "Stock suficiente")
            ),
            h(
              "div",
              { className: "stock-metric-card" },
              h("span", { className: "stock-metric-label" }, "Disponibilidad"),
              h("div", { className: "stock-metric-badge-container" },
                h(MaterialStockStatus, { quantity: total, minQuantity: min, status: material.status })
              ),
              h("span", { className: "stock-metric-sub" }, `Estado: ${material.status}`)
            )
          ),
          h(
            "div",
            { className: "stock-level-bar-container" },
            h("div", { className: "stock-level-header" },
              h("span", { className: "font-semibold" }, "Nivel de Cobertura de Stock"),
              h("span", { className: "font-mono font-bold" }, `${stockRatio}%`)
            ),
            h(
              "div",
              { className: "stock-progress-track" },
              h("div", {
                className: `stock-progress-fill ${total === 0 ? "fill-danger" : total <= min ? "fill-warning" : "fill-success"}`,
                style: { width: `${Math.min(100, stockRatio)}%` }
              })
            )
          )
        )
      : activeTab === "location"
      ? h(
          "div",
          { className: "detalle-section-card" },
          h("h3", { className: "section-card-title" }, "Ubicación Física y Asignación"),
          h(
            "div",
            { className: "detalle-grid-2" },
            h(
              "div",
              { className: "detalle-field-group" },
              h("span", { className: "detalle-field-label" }, "Ubicación Específica (Estante/Rack)"),
              h("span", { className: "detalle-field-val font-semibold" }, material.location || "Server Central")
            ),
            h(
              "div",
              { className: "detalle-field-group" },
              h("span", { className: "detalle-field-label" }, "Sector / Espacio ID"),
              h("span", { className: "detalle-field-val font-mono" }, material.spaceId || "server-1")
            ),
            h(
              "div",
              { className: "detalle-field-group" },
              h("span", { className: "detalle-field-label" }, "Institución"),
              h("span", { className: "detalle-field-val" }, "E.E.S.T N° 1 MONTE GRANDE")
            ),
            h(
              "div",
              { className: "detalle-field-group" },
              h("span", { className: "detalle-field-label" }, "Área Responsable"),
              h("span", { className: "detalle-field-val" }, "Server / Sector de Recursos")
            )
          )
        )
      : h(
          "div",
          { className: "detalle-section-card" },
          h("h3", { className: "section-card-title" }, "Historial de Movimientos de Inventario"),
          movements.length === 0
            ? h(EmptyState, { mensaje: "No hay movimientos registrados para este material." })
            : h(
                "div",
                { className: "server-table-container" },
                h(
                  "table",
                  { className: "server-data-table", "aria-label": "Movimientos de stock del material" },
                  h(
                    "thead",
                    null,
                    h(
                      "tr",
                      null,
                      h("th", { scope: "col" }, "Fecha y Hora"),
                      h("th", { scope: "col" }, "Tipo de Movimiento"),
                      h("th", { scope: "col" }, "Cantidad"),
                      h("th", { scope: "col" }, "Origen / Destino"),
                      h("th", { scope: "col" }, "Registrado Por"),
                      h("th", { scope: "col" }, "Motivo / Notas")
                    )
                  ),
                  h(
                    "tbody",
                    null,
                    movements.map((mov) => {
                      const dateObj = new Date(mov.createdAt);
                      const typeClass =
                        mov.type === "ingreso"
                          ? "server-badge-disponible"
                          : mov.type === "egreso"
                          ? "server-badge-bajo"
                          : "server-badge-normal";

                      return h(
                        "tr",
                        { key: mov.id, className: "server-table-row" },
                        h(
                          "td",
                          { className: "font-mono text-muted" },
                          !isNaN(dateObj.getTime())
                            ? `${dateObj.toLocaleDateString("es-AR")} ${dateObj.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}`
                            : "N/D"
                        ),
                        h(
                          "td",
                          null,
                          h("span", { className: `server-badge ${typeClass}` }, (mov.type || "movimiento").toUpperCase())
                        ),
                        h(
                          "td",
                          { className: "font-mono font-bold" },
                          `${mov.type === "ingreso" ? "+" : mov.type === "egreso" ? "-" : ""}${mov.quantity} ${material.unit || "u."}`
                        ),
                        h(
                          "td",
                          null,
                          mov.toSpaceId || mov.fromSpaceId || "Server Central"
                        ),
                        h(
                          "td",
                          { className: "font-mono" },
                          mov.createdBy || "usr-server"
                        ),
                        h(
                          "td",
                          { className: "text-muted" },
                          mov.notes || "Sin observaciones"
                        )
                      );
                    })
                  )
                )
              )
        )
    ),

    // Modal de confirmación para desactivar
    h(MaterialDeactivateModal, {
      material,
      isOpen: isDeactivateOpen,
      onClose: () => setIsDeactivateOpen(false),
      onConfirm: handleDeactivate,
      loading: deactivating
    })
  );
}
