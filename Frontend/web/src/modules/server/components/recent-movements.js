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
            isIngreso ? "📥" : isEgreso ? "📤" : "🔄"
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
