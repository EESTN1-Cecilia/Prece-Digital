import React from "react";
import { h, ActionButton, IconoFigma } from "../../../layouts/site-layout.js";
import { PERMISOS, puede as tienePermiso } from "../../../utils/permisos.js";

export function QuickActions({
  userPermissions = [],
  onOpenNuevoMaterial,
  onOpenRegistrarMovimiento,
  onVerSolicitudes,
  onVerReservas,
  onVerMovimientos
}) {
  const accesos = [
    {
      id: "inventario",
      label: "Inventario",
      icon: "clipboard",
      href: "#/inventario",
      tone: "primary"
    },
    {
      id: "movimientos",
      label: "Movimientos",
      icon: "activity",
      onClick: () => {
        const el = document.getElementById("seccion-movimientos") || document.querySelector(".server-grid-2col");
        if (el) el.scrollIntoView({ behavior: "smooth" });
      },
      tone: "primary"
    },
    {
      id: "solicitudes",
      label: "Solicitudes",
      icon: "clipboard",
      onClick: onVerSolicitudes,
      tone: "primary"
    },
    {
      id: "reservas",
      label: "Reservas",
      icon: "attendance",
      onClick: onVerReservas,
      tone: "primary"
    }
  ];

  return h(
    "div",
    { className: "quick-access-grid" },
    accesos
      .filter((item) => item.visible !== false)
      .map((item) =>
        item.onClick
          ? h(
              "div",
              { key: item.id, className: "quick-access-link" },
              h(
                ActionButton,
                {
                  icon: item.icon,
                  tone: item.tone || "primary",
                  onClick: item.onClick
                },
                item.label
              )
            )
          : h(
              "a",
              { key: item.id, href: item.href, className: "quick-access-link" },
              h(
                ActionButton,
                {
                  icon: item.icon,
                  tone: item.tone || "primary"
                },
                item.label
              )
            )
      )
  );
}
