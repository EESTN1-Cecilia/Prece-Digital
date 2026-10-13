import React, { useState, useMemo } from "react";
import { h } from "../../../layouts/site-layout.js";

// Íconos auxiliares
function IconCheck({ className = "w-4 h-4", width = "16", height = "16" }) {
  return h(
    "svg",
    { className, width, height, viewBox: "0 0 20 20", fill: "currentColor", "aria-hidden": "true", style: { flexShrink: 0 } },
    h("path", { fillRule: "evenodd", d: "M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z", clipRule: "evenodd" })
  );
}

function IconX({ className = "w-4 h-4", width = "16", height = "16" }) {
  return h(
    "svg",
    { className, width, height, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", style: { flexShrink: 0 } },
    h("line", { x1: "18", y1: "6", x2: "6", y2: "18" }),
    h("line", { x1: "6", y1: "6", x2: "18", y2: "18" })
  );
}

function IconShieldLock({ className = "w-5 h-5", width = "20", height = "20" }) {
  return h(
    "svg",
    { className, width, height, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", style: { flexShrink: 0 } },
    h("path", { d: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" }),
    h("rect", { x: "9", y: "10", width: "6", height: "5", rx: "1" }),
    h("path", { d: "M10 10V8a2 2 0 0 1 4 0v2" })
  );
}

function IconFileSpreadsheet({ className = "w-4 h-4", width = "16", height = "16" }) {
  return h(
    "svg",
    { className, width, height, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", style: { flexShrink: 0 } },
    h("path", { d: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" }),
    h("polyline", { points: "14 2 14 8 20 8" }),
    h("path", { d: "M8 13h2" }),
    h("path", { d: "M14 13h2" }),
    h("path", { d: "M8 17h2" }),
    h("path", { d: "M14 17h2" })
  );
}

function IconClock({ className = "w-4 h-4", width = "16", height = "16" }) {
  return h(
    "svg",
    { className, width, height, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", style: { flexShrink: 0 } },
    h("circle", { cx: "12", cy: "12", r: "10" }),
    h("polyline", { points: "12 6 12 12 16 14" })
  );
}

function IconServer({ className = "w-4 h-4", width = "16", height = "16" }) {
  return h(
    "svg",
    { className, width, height, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", style: { flexShrink: 0 } },
    h("rect", { x: "2", y: "2", width: "20", height: "8", rx: "2", ry: "2" }),
    h("rect", { x: "2", y: "14", width: "20", height: "8", rx: "2", ry: "2" }),
    h("line", { x1: "6", y1: "6", x2: "6.01", y2: "6" }),
    h("line", { x1: "6", y1: "18", x2: "6.01", y2: "18" })
  );
}

export function HabilitarPedidosSection({
  pedidos = [],
  alAprobar,
  alRechazar,
  alCrearPrueba
}) {
  const [filtroEstado, setFiltroEstado] = useState("todos"); // 'todos' | 'pendiente' | 'aprobado' | 'rechazado'
  const [filtroSector, setFiltroSector] = useState("todos"); // 'todos' | 'Server' | 'Secretaría' | 'Preceptoría'
  const [busqueda, setBusqueda] = useState("");
  const [pedidoPrevisualizando, setPedidoPrevisualizando] = useState(null);
  const [cargandoId, setCargandoId] = useState(null);

  // Conteos calculados
  const conteoPendientes = useMemo(() => pedidos.filter((p) => p.estado === "pendiente").length, [pedidos]);
  const conteoAprobados = useMemo(() => pedidos.filter((p) => p.estado === "aprobado").length, [pedidos]);
  const conteoRechazados = useMemo(() => pedidos.filter((p) => p.estado === "rechazado").length, [pedidos]);

  // Filtrado
  const pedidosFiltrados = useMemo(() => {
    return pedidos.filter((p) => {
      if (filtroEstado !== "todos" && p.estado !== filtroEstado) return false;
      if (filtroSector !== "todos" && p.sector !== filtroSector) return false;
      if (busqueda.trim()) {
        const q = busqueda.trim().toLowerCase();
        const enTitulo = (p.titulo || "").toLowerCase().includes(q);
        const enSolicitante = (p.solicitante || "").toLowerCase().includes(q);
        const enCodigo = (p.codigo || "").toLowerCase().includes(q);
        const enSector = (p.sector || "").toLowerCase().includes(q);
        if (!enTitulo && !enSolicitante && !enCodigo && !enSector) return false;
      }
      return true;
    });
  }, [pedidos, filtroEstado, filtroSector, busqueda]);

  const handleAprobarConFeedback = async (id) => {
    setCargandoId(id);
    try {
      await alAprobar(id);
      if (pedidoPrevisualizando?.id === id) {
        setPedidoPrevisualizando((prev) => (prev ? { ...prev, estado: "aprobado" } : null));
      }
    } finally {
      setCargandoId(null);
    }
  };

  const handleRechazarConFeedback = async (id) => {
    setCargandoId(id);
    try {
      await alRechazar(id);
      if (pedidoPrevisualizando?.id === id) {
        setPedidoPrevisualizando((prev) => (prev ? { ...prev, estado: "rechazado" } : null));
      }
    } finally {
      setCargandoId(null);
    }
  };

  return h(
    "div",
    { className: "director-pedidos-section" },

    // Encabezado Principal de la Sección
    h(
      "div",
      { className: "director-pedidos-hero" },
      h(
        "div",
        { className: "director-pedidos-hero__text" },
        h("span", { className: "director-pedidos-tag" }, "Control y Aprobación Directiva"),
        h("h2", { className: "director-pedidos-title" }, "Habilitación de Pedidos y Planillas"),
        h(
          "p",
          { className: "director-pedidos-subtitle" },
          "Autorización de cambios críticos: planillas de Server, rectificación de calificaciones e inventario. Hasta que el Director no lo apruebe, los datos permanecen congelados y no se actualizan."
        )
      ),
      h(
        "div",
        { className: "director-pedidos-hero__actions" },
        h(
          "button",
          {
            type: "button",
            className: "btn-director-simular-pedido",
            onClick: () => alCrearPrueba("Server")
          },
          h(IconServer, { width: "16", height: "16" }),
          h("span", null, "+ Simular Pedido de Server")
        )
      )
    ),

    // Banner Informativo de Bloqueo / Seguridad
    h(
      "div",
      { className: "director-pedidos-security-banner" },
      h(
        "div",
        { className: "director-pedidos-security-icon" },
        h(IconShieldLock, { width: "22", height: "22" })
      ),
      h(
        "div",
        { className: "director-pedidos-security-content" },
        h("strong", null, "Mecanismo de Salvaguarda Escolar Activo:"),
        h(
          "span",
          null,
          " Las planillas y solicitudes cargadas por personal de Server o secretaría no impactan en las bases de datos de alumnos hasta contar con la firma/aprobación explícita del Director escolar."
        )
      )
    ),

    // Métricas Resumen de Pedidos
    h(
      "div",
      { className: "director-pedidos-stats-grid" },
      h(
        "div",
        {
          className: `director-pedidos-stat-card director-pedidos-stat-card--amber ${filtroEstado === "pendiente" ? "director-pedidos-stat-card--active" : ""}`,
          onClick: () => setFiltroEstado("pendiente")
        },
        h("span", { className: "director-pedidos-stat-label" }, "Pendientes de Aprobación"),
        h("strong", { className: "director-pedidos-stat-val text-amber-600" }, conteoPendientes),
        h("span", { className: "director-pedidos-stat-desc" }, "Requieren tu autorización")
      ),
      h(
        "div",
        {
          className: `director-pedidos-stat-card director-pedidos-stat-card--emerald ${filtroEstado === "aprobado" ? "director-pedidos-stat-card--active" : ""}`,
          onClick: () => setFiltroEstado("aprobado")
        },
        h("span", { className: "director-pedidos-stat-label" }, "Habilitados / Aprobados"),
        h("strong", { className: "director-pedidos-stat-val text-emerald-600" }, conteoAprobados),
        h("span", { className: "director-pedidos-stat-desc" }, "Planillas actualizadas")
      ),
      h(
        "div",
        {
          className: `director-pedidos-stat-card director-pedidos-stat-card--rose ${filtroEstado === "rechazado" ? "director-pedidos-stat-card--active" : ""}`,
          onClick: () => setFiltroEstado("rechazado")
        },
        h("span", { className: "director-pedidos-stat-label" }, "Rechazados"),
        h("strong", { className: "director-pedidos-stat-val text-rose-600" }, conteoRechazados),
        h("span", { className: "director-pedidos-stat-desc" }, "Cambios descartados")
      ),
      h(
        "div",
        {
          className: `director-pedidos-stat-card director-pedidos-stat-card--slate ${filtroEstado === "todos" ? "director-pedidos-stat-card--active" : ""}`,
          onClick: () => setFiltroEstado("todos")
        },
        h("span", { className: "director-pedidos-stat-label" }, "Total Expedientes"),
        h("strong", { className: "director-pedidos-stat-val text-slate-700" }, pedidos.length),
        h("span", { className: "director-pedidos-stat-desc" }, "Historial consolidado")
      )
    ),

    // Barra de Filtros y Búsqueda
    h(
      "div",
      { className: "director-pedidos-filters-bar" },
      // Filtros por Estado (Pills)
      h(
        "div",
        { className: "director-pedidos-state-pills" },
        [
          { id: "todos", label: "Todos", count: pedidos.length },
          { id: "pendiente", label: "Pendientes", count: conteoPendientes },
          { id: "aprobado", label: "Habilitados", count: conteoAprobados },
          { id: "rechazado", label: "Rechazados", count: conteoRechazados }
        ].map((f) =>
          h(
            "button",
            {
              key: f.id,
              type: "button",
              className: `director-pedidos-pill ${filtroEstado === f.id ? "director-pedidos-pill--active" : ""}`,
              onClick: () => setFiltroEstado(f.id)
            },
            `${f.label} (${f.count})`
          )
        )
      ),

      // Filtro por Sector y Buscador
      h(
        "div",
        { className: "director-pedidos-secondary-filters" },
        h(
          "select",
          {
            className: "director-pedidos-select",
            value: filtroSector,
            onChange: (e) => setFiltroSector(e.target.value)
          },
          h("option", { value: "todos" }, "Todos los sectores"),
          h("option", { value: "Server" }, "Server y Pañol"),
          h("option", { value: "Secretaría" }, "Secretaría Académica"),
          h("option", { value: "Preceptoría" }, "Preceptoría")
        ),
        h("input", {
          type: "text",
          className: "director-pedidos-search",
          placeholder: "Buscar por título, código o solicitante...",
          value: busqueda,
          onChange: (e) => setBusqueda(e.target.value)
        })
      )
    ),

    // Lista de Pedidos
    pedidosFiltrados.length === 0
      ? h(
          "div",
          { className: "director-pedidos-empty" },
          h(IconFileSpreadsheet, { width: "36", height: "36", className: "text-slate-400" }),
          h("h3", null, "No se encontraron pedidos con los filtros aplicados"),
          h("p", null, "Prueba cambiando el estado, el sector o genera un pedido de prueba.")
        )
      : h(
          "div",
          { className: "director-pedidos-list" },
          pedidosFiltrados.map((pedido) =>
            h(
              "article",
              {
                key: pedido.id,
                className: `director-pedido-card director-pedido-card--${pedido.estado}`
              },

              // Encabezado de la tarjeta
              h(
                "div",
                { className: "director-pedido-card__header" },
                h(
                  "div",
                  { className: "director-pedido-card__badges" },
                  h(
                    "span",
                    {
                      className: `director-pedido-sector-badge director-pedido-sector-badge--${(pedido.sector || "").toLowerCase()}`
                    },
                    pedido.sector === "Server" ? h(IconServer, { width: "13", height: "13" }) : null,
                    pedido.sector
                  ),
                  h(
                    "span",
                    {
                      className: `director-pedido-status-badge director-pedido-status-badge--${pedido.estado}`
                    },
                    pedido.estado === "pendiente"
                      ? [h(IconClock, { width: "12", height: "12" }), " Pendiente de Aprobación"]
                      : pedido.estado === "aprobado"
                      ? [h(IconCheck, { width: "12", height: "12" }), " Habilitado"]
                      : [h(IconX, { width: "12", height: "12" }), " Rechazado"]
                  ),
                  h("span", { className: "director-pedido-code" }, pedido.codigo)
                ),
                h("span", { className: "director-pedido-date" }, pedido.fecha)
              ),

              // Cuerpo con título y justificación
              h(
                "div",
                { className: "director-pedido-card__body" },
                h("h3", { className: "director-pedido-title" }, pedido.titulo),
                h(
                  "div",
                  { className: "director-pedido-author" },
                  h("strong", null, pedido.solicitante),
                  h("span", null, ` · ${pedido.rolSolicitante}`)
                ),
                h("p", { className: "director-pedido-detail" }, pedido.detalle),

                // Ficha técnica del pedido
                h(
                  "div",
                  { className: "director-pedido-meta-grid" },
                  pedido.archivo
                    ? h(
                        "div",
                        { className: "director-pedido-meta-item" },
                        h("span", { className: "director-pedido-meta-label" }, "Planilla / Archivo:"),
                        h(
                          "button",
                          {
                            type: "button",
                            className: "director-pedido-file-link",
                            onClick: () => setPedidoPrevisualizando(pedido)
                          },
                          h(IconFileSpreadsheet, { width: "14", height: "14" }),
                          h("span", null, pedido.archivo)
                        )
                      )
                    : null,
                  pedido.alcance
                    ? h(
                        "div",
                        { className: "director-pedido-meta-item" },
                        h("span", { className: "director-pedido-meta-label" }, "Alcance:"),
                        h("strong", null, pedido.alcance)
                      )
                    : null,
                  pedido.impacto
                    ? h(
                        "div",
                        { className: "director-pedido-meta-item" },
                        h("span", { className: "director-pedido-meta-label" }, "Impacto en Base de Datos:"),
                        h("strong", { className: "text-blue-700" }, pedido.impacto)
                      )
                    : null
                )
              ),

              // Pie de Decisión Directiva
              h(
                "div",
                { className: "director-pedido-card__footer" },
                pedido.estado === "pendiente"
                  ? [
                      h(
                        "div",
                        { className: "director-pedido-lock-notice" },
                        h("span", null, "🔒 Los cambios no se aplicarán hasta que confirmes la habilitación.")
                      ),
                      h(
                        "div",
                        { className: "director-pedido-card__actions" },
                        pedido.datosPlanilla && pedido.datosPlanilla.length > 0
                          ? h(
                              "button",
                              {
                                type: "button",
                                className: "btn-director-preview-planilla",
                                onClick: () => setPedidoPrevisualizando(pedido)
                              },
                              "Ver Planilla"
                            )
                          : null,
                        h(
                          "button",
                          {
                            type: "button",
                            className: "btn-director-rechazar-pedido",
                            disabled: cargandoId === pedido.id,
                            onClick: () => handleRechazarConFeedback(pedido.id)
                          },
                          "Rechazar"
                        ),
                        h(
                          "button",
                          {
                            type: "button",
                            className: "btn-director-habilitar-pedido",
                            disabled: cargandoId === pedido.id,
                            onClick: () => handleAprobarConFeedback(pedido.id)
                          },
                          h(IconCheck, { width: "16", height: "16" }),
                          h("span", null, cargandoId === pedido.id ? "Habilitando..." : "Habilitar y Actualizar")
                        )
                      )
                    ]
                  : pedido.estado === "aprobado"
                  ? h(
                      "div",
                      { className: "director-pedido-approved-badge-box" },
                      h(IconCheck, { width: "16", height: "16", className: "text-emerald-600" }),
                      h(
                        "span",
                        null,
                        `Planilla HABILITADA por Dirección — Cambios aplicados con éxito (${pedido.aprobadoEn || "Registrado"}).`
                      ),
                      pedido.datosPlanilla
                        ? h(
                            "button",
                            {
                              type: "button",
                              className: "btn-director-link-small",
                              onClick: () => setPedidoPrevisualizando(pedido)
                            },
                            "Ver Planilla Aplicada"
                          )
                        : null
                    )
                  : h(
                      "div",
                      { className: "director-pedido-rejected-badge-box" },
                      h(IconX, { width: "16", height: "16", className: "text-rose-600" }),
                      h(
                        "span",
                        null,
                        `Pedido RECHAZADO por Dirección — Las planillas no fueron actualizadas en el sistema.`
                      )
                    )
              )
            )
          )
        ),

    // Modal de Previsualización de Planilla
    pedidoPrevisualizando
      ? h(
          "div",
          { className: "director-modal-backdrop", onClick: () => setPedidoPrevisualizando(null) },
          h(
            "div",
            {
              className: "director-modal-dialog director-modal-dialog--wide",
              onClick: (e) => e.stopPropagation()
            },
            h(
              "div",
              { className: "director-modal-header" },
              h(
                "div",
                null,
                h("span", { className: "director-modal-tag" }, `Sector: ${pedidoPrevisualizando.sector}`),
                h("h3", { className: "director-modal-title" }, `Planilla: ${pedidoPrevisualizando.archivo || "Datos a Impactar"}`),
                h(
                  "p",
                  { className: "director-modal-subtitle" },
                  `${pedidoPrevisualizando.alcance} · Solicitado por ${pedidoPrevisualizando.solicitante}`
                )
              ),
              h(
                "button",
                {
                  type: "button",
                  className: "director-modal-close-btn",
                  onClick: () => setPedidoPrevisualizando(null)
                },
                "✕"
              )
            ),

            h(
              "div",
              { className: "director-modal-body" },
              h(
                "div",
                { className: "director-preview-table-wrap" },
                h(
                  "table",
                  { className: "director-preview-table" },
                  h(
                    "thead",
                    null,
                    h(
                      "tr",
                      null,
                      h("th", null, "#"),
                      h("th", null, "Alumno / Registro"),
                      h("th", null, "Materia / Detalle"),
                      h("th", null, "Dato Anterior"),
                      h("th", null, "Nuevo Dato a Actualizar"),
                      h("th", null, "Estado")
                    )
                  ),
                  h(
                    "tbody",
                    null,
                    (pedidoPrevisualizando.datosPlanilla || []).map((fila, idx) =>
                      h(
                        "tr",
                        { key: idx },
                        h("td", { className: "text-slate-400" }, idx + 1),
                        h("td", { className: "font-semibold text-slate-800" }, fila.alumno),
                        h("td", null, fila.materia),
                        h("td", { className: "text-slate-500 line-through" }, fila.anterior),
                        h("td", { className: "font-bold text-emerald-700" }, fila.nueva),
                        h(
                          "td",
                          null,
                          h("span", { className: "director-badge-table-modified" }, fila.estado || "Modificado")
                        )
                      )
                    )
                  )
                )
              )
            ),

            h(
              "div",
              { className: "director-modal-footer" },
              h(
                "button",
                {
                  type: "button",
                  className: "btn-director-modal-secondary",
                  onClick: () => setPedidoPrevisualizando(null)
                },
                "Cerrar Previsualización"
              ),
              pedidoPrevisualizando.estado === "pendiente"
                ? h(
                    "button",
                    {
                      type: "button",
                      className: "btn-director-modal-primary-green",
                      onClick: () => handleAprobarConFeedback(pedidoPrevisualizando.id)
                    },
                    h(IconCheck, { width: "16", height: "16" }),
                    h("span", null, "Habilitar y Aplicar Cambios Ahora")
                  )
                : null
            )
          )
        )
      : null
  );
}
