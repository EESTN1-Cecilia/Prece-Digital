import React from "react";
import { h, IconoFigma } from "../../../layouts/site-layout.js";
import { EmptyState, StatusBadge } from "../../../components/common/state-handlers.js";

export function ReservationsSummary({
  reservas = [],
  onAprobarReserva,
  onRechazarReserva,
  onCancelarReserva
}) {
  if (!reservas || reservas.length === 0) {
    return h(EmptyState, { mensaje: "No hay reservas programadas para el período seleccionado." });
  }

  return h(
    "div",
    { className: "server-reservations-list" },
    reservas.map((res) => {
      const esPendiente = res.estado === "pendiente";
      const esConfirmada = res.estado === "confirmada";

      return h(
        "div",
        {
          key: res.id,
          className: `server-reservation-card ${res.esHoy ? "server-reservation-card--today" : ""}`
        },
        h(
          "div",
          { className: "server-reservation-top" },
          h(
            "div",
            { className: "server-reservation-resource" },
            h("strong", { className: "reservation-resource-title" }, res.recursoNombre),
            res.esHoy
              ? h("span", { className: "server-today-pill" }, "HOY")
              : h("span", { className: "server-date-pill" }, res.fecha)
          ),
          h(StatusBadge, { status: res.estado })
        ),
        h(
          "div",
          { className: "server-reservation-body" },
          h(
            "div",
            { className: "reservation-info-row" },
            h("span", { className: "reservation-label" }, "Horario:"),
            h("strong", { className: "reservation-time" }, `${res.horaInicio} a ${res.horaFin} hs`)
          ),
          h(
            "div",
            { className: "reservation-info-row" },
            h("span", { className: "reservation-label" }, "Solicitante:"),
            h("span", null, `${res.solicitante} (${res.sector})`)
          ),
          res.proposito
            ? h(
                "p",
                { className: "reservation-purpose" },
                `"${res.proposito}"`
              )
            : null
        ),
        h(
          "div",
          { className: "server-reservation-actions" },
          esPendiente
            ? h(
                "div",
                { className: "reservation-btn-group" },
                h(
                  "button",
                  {
                    type: "button",
                    className: "btn-table-action btn-table-action--success",
                    onClick: () => onAprobarReserva && onAprobarReserva(res.id)
                  },
                  "✓ Aprobar"
                ),
                h(
                  "button",
                  {
                    type: "button",
                    className: "btn-table-action btn-table-action--danger",
                    onClick: () => onRechazarReserva && onRechazarReserva(res.id)
                  },
                  "✕ Rechazar"
                )
              )
            : esConfirmada
              ? h(
                  "button",
                  {
                    type: "button",
                    className: "btn-table-action btn-table-action--subtle",
                    onClick: () => onCancelarReserva && onCancelarReserva(res.id)
                  },
                  "Cancelar Reserva"
                )
              : null
        )
      );
    })
  );
}
