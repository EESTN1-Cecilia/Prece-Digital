import React from "react";
import { h, IconoFigma } from "../../../layouts/site-layout.js";
import { EmptyState, StatusBadge } from "../../../components/common/state-handlers.js";

function getPriorityBadge(prioridad) {
  const p = (prioridad || "normal").toLowerCase();
  const styles = {
    urgente: "status-badge--danger",
    alta: "status-badge--warning",
    normal: "status-badge--info",
    baja: "status-badge--normal"
  };
  const cls = styles[p] || "status-badge--normal";
  return h("span", { className: `status-badge ${cls}` }, prioridad ? prioridad.toUpperCase() : "NORMAL");
}

export function PendingRequests({
  solicitudes = [],
  onGestionarSolicitud,
  onVerTodas
}) {
  if (!solicitudes || solicitudes.length === 0) {
    return h(EmptyState, { mensaje: "No hay solicitudes pendientes que requieran atención en este momento." });
  }

  return h(
    "div",
    { className: "server-requests-list" },
    solicitudes.map((req) =>
      h(
        "div",
        { key: req.id, className: "server-request-card" },
        h(
          "div",
          { className: "server-request-header" },
          h(
            "div",
            { className: "server-request-title-wrap" },
            h("strong", { className: "server-request-title" }, req.titulo),
            h(
              "span",
              { className: "server-request-requester" },
              `Solicitante: ${req.solicitante} • Sector: ${req.sector}`
            )
          ),
          h(
            "div",
            { className: "server-request-badges" },
            getPriorityBadge(req.prioridad),
            h(StatusBadge, { status: req.estado })
          )
        ),
        h(
          "p",
          { className: "server-request-desc" },
          req.descripcion
        ),
        h(
          "div",
          { className: "server-request-footer" },
          h(
            "div",
            { className: "server-request-meta" },
            req.fechaLimite
              ? h("span", { className: "server-request-due text-warning" }, `Límite: ${req.fechaLimite}`)
              : null,
            h("span", { className: "server-request-date" }, `Fecha: ${req.fecha || "Reciente"}`)
          ),
          h(
            "button",
            {
              type: "button",
              className: "btn-table-action btn-table-action--primary",
              onClick: () => onGestionarSolicitud && onGestionarSolicitud(req)
            },
            "Gestionar Pedido"
          )
        )
      )
    )
  );
}
