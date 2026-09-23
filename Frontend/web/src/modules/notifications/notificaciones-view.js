import React, { useState, useMemo } from "react";
import { h, ActionButton, IconoFigma } from "../../layouts/site-layout.js";
import { DashboardCard } from "../../components/dashboard/dashboard-card.js";
import { EmptyState, LoadingState, StatusBadge } from "../../components/common/state-handlers.js";
import { useNotificaciones } from "../../estado/hooks.js";
import { fecha } from "../../utils/formato.js";

function IconNotificationBell({ className = "notif-box-icon" }) {
  return h(
    "svg",
    {
      className,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "2.2",
      strokeLinecap: "round",
      strokeLinejoin: "round",
      "aria-hidden": "true"
    },
    h("path", { d: "M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" }),
    h("path", { d: "M13.73 21a2 2 0 0 1-3.46 0" })
  );
}

function IconNotificationAlert({ className = "notif-box-icon" }) {
  return h(
    "svg",
    {
      className,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "2.2",
      strokeLinecap: "round",
      strokeLinejoin: "round",
      "aria-hidden": "true"
    },
    h("path", { d: "M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" }),
    h("line", { x1: "12", y1: "9", x2: "12", y2: "13" }),
    h("line", { x1: "12", y1: "17", x2: "12.01", y2: "17" })
  );
}

function IconNotificationAcademic({ className = "notif-box-icon" }) {
  return h(
    "svg",
    {
      className,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "2.2",
      strokeLinecap: "round",
      strokeLinejoin: "round",
      "aria-hidden": "true"
    },
    h("path", { d: "M22 10v6M2 10l10-5 10 5-10 5z" }),
    h("path", { d: "M6 12v5c3 3 9 3 12 0v-5" })
  );
}

function IconNotificationFile({ className = "notif-box-icon" }) {
  return h(
    "svg",
    {
      className,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "2.2",
      strokeLinecap: "round",
      strokeLinejoin: "round",
      "aria-hidden": "true"
    },
    h("path", { d: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" }),
    h("polyline", { points: "14 2 14 8 20 8" }),
    h("line", { x1: "16", y1: "13", x2: "8", y2: "13" }),
    h("line", { x1: "16", y1: "17", x2: "8", y2: "17" }),
    h("line", { x1: "10", y1: "9", x2: "8", y2: "9" })
  );
}

function renderNotificationIcon(notif, esUrgente) {
  if (esUrgente) {
    return h(IconNotificationAlert, { className: "notif-box-icon" });
  }
  const tipo = String(notif.tipo || "").toLowerCase();
  const titulo = String(notif.titulo || "").toLowerCase();
  if (tipo.includes("academic") || titulo.includes("materia") || titulo.includes("desaprobada") || titulo.includes("calificación")) {
    return h(IconNotificationAcademic, { className: "notif-box-icon" });
  }
  if (tipo.includes("document") || titulo.includes("legajo") || titulo.includes("constancia")) {
    return h(IconNotificationFile, { className: "notif-box-icon" });
  }
  return h(IconNotificationBell, { className: "notif-box-icon" });
}
function IconCheck({ className = "notif-btn-icon" }) {
  return h(
    "svg",
    {
      className,
      viewBox: "0 0 20 20",
      fill: "currentColor",
      "aria-hidden": "true"
    },
    h("path", {
      fillRule: "evenodd",
      d: "M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z",
      clipRule: "evenodd"
    })
  );
}

function IconTrash({ className = "notif-btn-icon" }) {
  return h(
    "svg",
    {
      className,
      viewBox: "0 0 20 20",
      fill: "currentColor",
      "aria-hidden": "true"
    },
    h("path", {
      fillRule: "evenodd",
      d: "M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z",
      clipRule: "evenodd"
    })
  );
}

export default function NotificacionesView() {
  const { items, noLeidas, cargando, alternarLeida, marcarTodasLeidas, descartar } = useNotificaciones();
  const [filtroEstado, setFiltroEstado] = useState("todas"); // 'todas' | 'no-leidas' | 'urgentes' | 'leidas'
  const [busqueda, setBusqueda] = useState("");

  const conteos = useMemo(() => {
    const total = items.length;
    const sinLeer = items.filter((n) => !n.leida).length;
    const urgentes = items.filter((n) => String(n.tipo).toLowerCase().includes("urgente") || String(n.tipo).toLowerCase().includes("crítico") || String(n.tipo).toLowerCase().includes("alerta")).length;
    const leidas = items.filter((n) => n.leida).length;
    return { total, sinLeer, urgentes, leidas };
  }, [items]);

  const notificacionesFiltradas = useMemo(() => {
    return items.filter((notif) => {
      // Filtro por estado
      if (filtroEstado === "no-leidas" && notif.leida) return false;
      if (filtroEstado === "leidas" && !notif.leida) return false;
      if (filtroEstado === "urgentes") {
        const esUrg =
          String(notif.tipo).toLowerCase().includes("urgente") ||
          String(notif.tipo).toLowerCase().includes("crítico") ||
          String(notif.tipo).toLowerCase().includes("alerta");
        if (!esUrg) return false;
      }

      // Filtro por búsqueda de texto
      if (busqueda.trim()) {
        const q = busqueda.trim().toLowerCase();
        const enTitulo = (notif.titulo || "").toLowerCase().includes(q);
        const enDetalle = (notif.detalle || "").toLowerCase().includes(q);
        const enAlumno = (notif.alumno || "").toLowerCase().includes(q);
        const enCurso = (notif.curso || "").toLowerCase().includes(q);
        if (!enTitulo && !enDetalle && !enAlumno && !enCurso) return false;
      }

      return true;
    });
  }, [items, filtroEstado, busqueda]);

  return h(
    "section",
    { className: "welcome-panel notificaciones-panel" },

    // Barra superior
    h(
      "div",
      { className: "dashboard-top-bar alumnos-top-nav" },
      h(
        "button",
        {
          type: "button",
          className: "btn-volver-atras",
          onClick: () => {
            window.location.hash = "#/inicio";
          },
          title: "Volver al dashboard",
          "aria-label": "Volver al dashboard"
        },
        h(
          "svg",
          {
            className: "btn-volver-atras__icon",
            viewBox: "0 0 20 20",
            fill: "currentColor",
            "aria-hidden": "true"
          },
          h("path", {
            fillRule: "evenodd",
            d: "M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z",
            clipRule: "evenodd"
          })
        ),
        h("span", null, "Volver al Dashboard")
      ),
      h(
        "div",
        { className: "alumnos-top-badges" },
        h("span", { className: "badge-institucion" }, "E.E.S.T N°1 Monte Grande"),
        h("span", { className: "badge-ciclo" }, `${noLeidas} sin leer`)
      )
    ),

    // Tarjeta Principal de Notificaciones
    h(
      DashboardCard,
      {
        title: "Centro de Notificaciones y Alertas",
        icon: "alert",
        badge: `${conteos.total} registradas`,
        className: "dashboard-card--highlight alumnos-main-card",
        collapsible: false,
        actions: h(
          "div",
          { className: "alumnos-header-actions" },
          noLeidas > 0
            ? h(
                "button",
                {
                  type: "button",
                  className: "action-button action-button--secondary",
                  onClick: marcarTodasLeidas,
                  title: "Marcar todas las notificaciones como leídas"
                },
                h(IconCheck, null),
                h("span", null, "Marcar todas como leídas")
              )
            : null
        )
      },

      // Toolbar de Filtros y Búsqueda
      h(
        "div",
        { className: "notificaciones-toolbar" },
        // Buscador
        h(
          "div",
          { className: "search-input-wrapper notificaciones-search-wrap" },
          h(IconoFigma, { className: "search-input-icon", nombre: "search" }),
          h("input", {
            type: "text",
            className: "search-input",
            placeholder: "Buscar en notificaciones y alertas...",
            value: busqueda,
            onChange: (e) => setBusqueda(e.target.value),
            "aria-label": "Buscar notificaciones"
          }),
          busqueda
            ? h(
                "button",
                {
                  type: "button",
                  className: "search-clear-btn",
                  onClick: () => setBusqueda(""),
                  "aria-label": "Limpiar búsqueda"
                },
                "✕"
              )
            : null
        ),

        // Píldoras de Filtro
        h(
          "div",
          { className: "notificaciones-filter-pills" },
          [
            { id: "todas", label: `Todas (${conteos.total})` },
            { id: "no-leidas", label: `No leídas (${conteos.sinLeer})` },
            { id: "urgentes", label: `Alertas Urgentes (${conteos.urgentes})` },
            { id: "leidas", label: `Leídas (${conteos.leidas})` }
          ].map((pill) =>
            h(
              "button",
              {
                key: pill.id,
                type: "button",
                className: `notif-filter-pill ${filtroEstado === pill.id ? "active" : ""}`,
                onClick: () => setFiltroEstado(pill.id)
              },
              pill.label
            )
          )
        )
      ),

      // Estado de Carga
      cargando ? h(LoadingState, { mensaje: "Cargando notificaciones..." }) : null,

      // Estado Vacío
      !cargando && notificacionesFiltradas.length === 0
        ? h(EmptyState, {
            mensaje: busqueda || filtroEstado !== "todas"
              ? "No hay notificaciones que coincidan con los filtros aplicados."
              : "No tenés notificaciones pendientes en este momento."
          })
        : null,

      // Lista Detallada de Notificaciones
      !cargando && notificacionesFiltradas.length > 0
        ? h(
            "div",
            { className: "notificaciones-cards-list" },
            notificacionesFiltradas.map((notif) => {
              const esUrgente =
                String(notif.tipo).toLowerCase().includes("urgente") ||
                String(notif.tipo).toLowerCase().includes("crítico") ||
                String(notif.tipo).toLowerCase().includes("alerta");

              const esAcademico =
                String(notif.tipo || "").toLowerCase().includes("academic") ||
                String(notif.titulo || "").toLowerCase().includes("materia") ||
                String(notif.titulo || "").toLowerCase().includes("desaprobada");
              const esDocumento =
                String(notif.tipo || "").toLowerCase().includes("document") ||
                String(notif.titulo || "").toLowerCase().includes("legajo");

              const boxClass = esUrgente
                ? "notif-type-icon-box--urgent"
                : esAcademico
                ? "notif-type-icon-box--academic"
                : esDocumento
                ? "notif-type-icon-box--document"
                : "notif-type-icon-box--info";

              return h(
                "article",
                {
                  key: notif.id,
                  className: `notificacion-full-card ${notif.leida ? "notificacion-full-card--read" : "notificacion-full-card--unread"} ${esUrgente ? "notificacion-full-card--urgent" : ""}`
                },
                // Encabezado de la Tarjeta
                h(
                  "div",
                  { className: "notificacion-full-card__header" },
                  h(
                    "div",
                    { className: "notificacion-full-card__left" },
                    h(
                      "div",
                      {
                        className: `notif-type-icon-box ${boxClass}`
                      },
                      renderNotificationIcon(notif, esUrgente)
                    ),
                    h(
                      "div",
                      null,
                      h("h3", { className: "notif-full-title" }, notif.titulo),
                      h(
                        "div",
                        { className: "notif-full-meta" },
                        h("span", { className: "notif-time-badge" }, fecha(notif.creadaEn)),
                        notif.alumno
                          ? h("span", { className: "notif-context-pill" }, `Alumno: ${notif.alumno}`)
                          : null,
                        notif.curso
                          ? h("span", { className: "notif-context-pill notif-context-pill--course" }, `Curso: ${notif.curso}`)
                          : null,
                        !notif.leida
                          ? h("span", { className: "notif-status-badge-unread" }, "● Sin leer")
                          : h("span", { className: "notif-status-badge-read" }, "Leída")
                      )
                    )
                  ),
                  // Acciones en la cabecera
                  h(
                    "div",
                    { className: "notificacion-full-card__actions" },
                    h(
                      "button",
                      {
                        type: "button",
                        className: `btn-notif-action ${notif.leida ? "btn-notif-action--toggle-unread" : "btn-notif-action--mark-read"}`,
                        onClick: () => alternarLeida(notif.id, !notif.leida),
                        title: notif.leida ? "Marcar como no leída" : "Marcar como leída"
                      },
                      h(IconCheck, null),
                      h("span", null, notif.leida ? "Marcar no leída" : "Marcar leída")
                    ),
                    h(
                      "button",
                      {
                        type: "button",
                        className: "btn-notif-action btn-notif-action--dismiss",
                        onClick: () => descartar(notif.id),
                        title: "Descartar notificación"
                      },
                      h(IconTrash, null),
                      h("span", null, "Descartar")
                    )
                  )
                ),

                // Cuerpo de la Notificación
                h(
                  "div",
                  { className: "notificacion-full-card__body" },
                  h("p", { className: "notif-full-detail" }, notif.detalle)
                ),

                // Pie de la Notificación (Enlace de destino si existe)
                notif.destino
                  ? h(
                      "div",
                      { className: "notificacion-full-card__footer" },
                      h(
                        "a",
                        {
                          href: notif.destino,
                          className: "notif-destination-link"
                        },
                        "Ir al detalle ➔"
                      )
                    )
                  : null
              );
            })
          )
        : null
    )
  );
}
