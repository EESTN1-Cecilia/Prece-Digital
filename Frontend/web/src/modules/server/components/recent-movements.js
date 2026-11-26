import React from "react";
import { h } from "../../../layouts/site-layout.js";
import { EmptyState } from "../../../components/common/state-handlers.js";

function getMovementTypeBadge(tipo) {
  const t = (tipo || "").toLowerCase();
  const styles = {
    ingreso: "badge-move--ingreso",
    egreso: "badge-move--egreso",
    transferencia: "badge-move--transferencia",
    ajuste: "badge-move--ajuste"
  };
  const cls = styles[t] || "badge-move--default";
  const label = t.charAt(0).toUpperCase() + t.slice(1);
  return h("span", { className: `movement-type-badge ${cls}` }, label);
}

export function RecentMovements({
  movimientos = [],
  onVerDetalleMaterial
}) {
  if (!movimientos || movimientos.length === 0) {
    return h(EmptyState, { mensaje: "No hay movimientos registrados recientemente en el sector Server." });
  }

  return h(
    "div",
    { className: "activity-timeline-list server-movements-list" },
    movimientos.map((mov) => {
      const isIngreso = mov.tipo === "ingreso";
      const isEgreso = mov.tipo === "egreso";
      const qtySign = isIngreso ? "+" : isEgreso ? "-" : "";

      return h(
        "div",
        { key: mov.id, className: "activity-item-row server-movement-row" },
        h(
          "div",
          { className: "activity-item-left" },
          h(
            "div",
            { className: `activity-avatar movement-avatar movement-avatar--${mov.tipo}` },
            isIngreso
              ? h("svg", { width: "15", height: "15", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" }, h("path", { d: "M12 3v12" }), h("polyline", { points: "7 10 12 15 17 10" }), h("path", { d: "M5 21h14" }))
              : isEgreso
              ? h("svg", { width: "15", height: "15", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" }, h("path", { d: "M12 15V3" }), h("polyline", { points: "7 8 12 3 17 8" }), h("path", { d: "M5 21h14" }))
              : h("svg", { width: "15", height: "15", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" }, h("polyline", { points: "23 4 23 10 17 10" }), h("polyline", { points: "1 20 1 14 7 14" }), h("path", { d: "M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" }))
          ),
          h(
            "div",
            { className: "activity-info" },
            h(
              "div",
              { className: "movement-title-line" },
              h(
                "strong",
                {
                  className: "activity-title cursor-pointer hover-underline",
                  onClick: () => onVerDetalleMaterial && mov.itemId && onVerDetalleMaterial({ id: mov.itemId, name: mov.material })
                },
                mov.material
              ),
              getMovementTypeBadge(mov.tipo)
            ),
            h(
              "span",
              { className: "activity-subtitle" },
              `Cant: ${qtySign}${mov.cantidad} ${mov.unidad || "uds"} • ${mov.motivo} • Por: ${mov.usuario}`
            )
          )
        ),
        h(
          "div",
          { className: "movement-time-box" },
          h("time", { className: "activity-time" }, mov.fecha),
          mov.hora ? h("span", { className: "movement-time-sub" }, mov.hora) : null
        )
      );
    })
  );
}
