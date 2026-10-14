import React, { useEffect, useMemo, useState } from "react";
import { h, IconoFigma } from "../../layouts/site-layout.js";
import { DashboardCard } from "../../components/dashboard/dashboard-card.js";
import { EmptyState, LoadingState } from "../../components/common/state-handlers.js";
import { useUsuarioActual } from "../../estado/index.js";
import { DirectorService, ROLES_DISPONIBLES } from "./director-service.js";
import { NuevoPerfilModal } from "./components/nuevo-perfil-modal.js";
import { EditarRolesModal } from "./components/editar-roles-modal.js";
import { HabilitarPedidosSection } from "./components/habilitar-pedidos-section.js";
import { AsignacionesSection } from "./components/asignaciones-section.js";
import { fecha } from "../../utils/formato.js";



// Íconos auxiliares con dimensiones explícitas (Sin emojis)
function IconPlus({ className = "w-4 h-4", width = "16", height = "16" }) {
  return h(
    "svg",
    { className, width, height, viewBox: "0 0 20 20", fill: "currentColor", "aria-hidden": "true", style: { flexShrink: 0 } },
    h("path", { d: "M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" })
  );
}

function IconUsers({ className = "w-4 h-4", width = "16", height = "16" }) {
  return h(
    "svg",
    { className, width, height, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", style: { flexShrink: 0 } },
    h("path", { d: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" }),
    h("circle", { cx: "9", cy: "7", r: "4" }),
    h("path", { d: "M23 21v-2a4 4 0 0 0-3-3.87" }),
    h("path", { d: "M16 3.13a4 4 0 0 1 0 7.75" })
  );
}

function IconAward({ className = "w-6 h-6", width = "24", height = "24" }) {
  return h(
    "svg",
    { className, width, height, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", style: { flexShrink: 0 } },
    h("circle", { cx: "12", cy: "8", r: "7" }),
    h("polyline", { points: "8.21 13.89 7 23 12 20 17 23 15.79 13.88" })
  );
}

function IconCheck({ className = "w-4 h-4", width = "16", height = "16" }) {
  return h(
    "svg",
    { className, width, height, viewBox: "0 0 20 20", fill: "currentColor", "aria-hidden": "true", style: { flexShrink: 0 } },
    h("path", { fillRule: "evenodd", d: "M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z", clipRule: "evenodd" })
  );
}

function IconShield({ className = "w-5 h-5", width = "20", height = "20" }) {
  return h(
    "svg",
    { className, width, height, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", style: { flexShrink: 0 } },
    h("path", { d: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" })
  );
}

function IconChart({ className = "w-4 h-4", width = "16", height = "16" }) {
  return h(
    "svg",
    { className, width, height, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", style: { flexShrink: 0 } },
    h("line", { x1: "18", y1: "20", x2: "18", y2: "10" }),
    h("line", { x1: "12", y1: "20", x2: "12", y2: "4" }),
    h("line", { x1: "6", y1: "20", x2: "6", y2: "14" })
  );
}

function IconSchool({ className = "w-4 h-4", width = "16", height = "16" }) {
  return h(
    "svg",
    { className, width, height, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", style: { flexShrink: 0 } },
    h("path", { d: "M22 10v6M2 10l10-5 10 5-10 5z" }),
    h("path", { d: "M6 12v5c3 3 9 3 12 0v-5" })
  );
}

function IconAlert({ className = "w-4 h-4", width = "16", height = "16" }) {
  return h(
    "svg",
    { className, width, height, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", style: { flexShrink: 0 } },
    h("path", { d: "m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" }),
    h("line", { x1: "12", y1: "9", x2: "12", y2: "13" }),
    h("line", { x1: "12", y1: "17", x2: "12.01", y2: "17" })
  );
}

function IconClipboard({ className = "w-5 h-5", width = "20", height = "20" }) {
  return h(
    "svg",
    { className, width, height, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", style: { flexShrink: 0 } },
    h("path", { d: "M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" }),
    h("rect", { x: "8", y: "2", width: "8", height: "4", rx: "1", ry: "1" })
  );
}

function IconClock({ className = "w-5 h-5", width = "20", height = "20" }) {
  return h(
    "svg",
    { className, width, height, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", style: { flexShrink: 0 } },
    h("circle", { cx: "12", cy: "12", r: "10" }),
    h("polyline", { points: "12 6 12 12 16 14" })
  );
}

function IconServer({ className = "w-5 h-5", width = "20", height = "20" }) {
  return h(
    "svg",
    { className, width, height, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", style: { flexShrink: 0 } },
    h("rect", { x: "2", y: "2", width: "20", height: "8", rx: "2", ry: "2" }),
    h("rect", { x: "2", y: "14", width: "20", height: "8", rx: "2", ry: "2" }),
    h("line", { x1: "6", y1: "6", x2: "6.01", y2: "6" }),
    h("line", { x1: "6", y1: "18", x2: "6.01", y2: "18" })
  );
}

function IconWrench({ className = "w-5 h-5", width = "20", height = "20" }) {
  return h(
    "svg",
    { className, width, height, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", style: { flexShrink: 0 } },
    h("path", { d: "M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" })
  );
}

function IconSettings({ className = "w-3.5 h-3.5", width = "14", height = "14" }) {
  return h(
    "svg",
    { className, width, height, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", style: { flexShrink: 0 } },
    h("circle", { cx: "12", cy: "12", r: "3" }),
    h("path", { d: "M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" })
  );
}

export default function DirectorDashboardView() {
  const usuario = useUsuarioActual();

  const [resumen, setResumen] = useState(null);
  const [personal, setPersonal] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [pestanaActiva, setPestanaActiva] = useState("general"); // 'general' | 'personal' | 'asignaciones' | 'supervision' | 'pedidos' | 'alertas'
  const [modoAsistencia, setModoAsistencia] = useState("porcentaje"); // 'porcentaje' | 'cantidad'
  const [modoAlumnos, setModoAlumnos] = useState("cantidad"); // 'cantidad' | 'porcentaje'

  // Opciones de visualización (deshabilitar Server, Jefatura y Habilitar Pedidos sin borrar código)
  const MOSTRAR_SERVER = false;
  const MOSTRAR_JEFATURA = false;
  const MOSTRAR_HABILITAR_PEDIDOS = false;

  // Filtros de personal
  const [busquedaPersonal, setBusquedaPersonal] = useState("");
  const [filtroRol, setFiltroRol] = useState("todos");
  const [filtroEstado, setFiltroEstado] = useState("todos");

  // Modales
  const [modalNuevoAbierto, setModalNuevoAbierto] = useState(false);
  const [usuarioEditandoRoles, setUsuarioEditandoRoles] = useState(null);

  // Mensajes de notificación temporal
  const [toastMensaje, setToastMensaje] = useState(null);

  const cargarDatos = async () => {
    setCargando(true);
    try {
      const [resumenData, personalData, pedidosData] = await Promise.all([
        DirectorService.getDashboardConsolidado(),
        DirectorService.listarPerfiles(),
        DirectorService.listarPedidos()
      ]);
      setResumen(resumenData);
      setPersonal(personalData);
      setPedidos(pedidosData);
    } catch {
      // Ignorar fallback silencioso
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const mostrarToast = (mensaje) => {
    setToastMensaje(mensaje);
    setTimeout(() => setToastMensaje(null), 3500);
  };

  const handleAprobarPedido = async (id) => {
    try {
      const lista = await DirectorService.aprobarPedido(id);
      setPedidos(lista);
      mostrarToast("Pedido habilitado con éxito. Las planillas de Server se han actualizado.");
    } catch {
      mostrarToast("No se pudo habilitar el pedido.");
    }
  };

  const handleRechazarPedido = async (id) => {
    try {
      const lista = await DirectorService.rechazarPedido(id);
      setPedidos(lista);
      mostrarToast("Pedido rechazado. No se modificó ninguna planilla.");
    } catch {
      mostrarToast("No se pudo rechazar el pedido.");
    }
  };

  const handleCrearPedidoPrueba = async (sector = "Server") => {
    try {
      const lista = await DirectorService.crearPedidoPrueba(sector);
      setPedidos(lista);
      mostrarToast(`Nuevo pedido de ${sector} generado y en espera de autorización.`);
    } catch {
      mostrarToast("Error al simular pedido.");
    }
  };

  const pedidosPendientesCount = useMemo(() => {
    return pedidos.filter((p) => p.estado === "pendiente").length;
  }, [pedidos]);

  const handlePerfilCreado = (nuevo) => {
    mostrarToast(`Perfil de ${nuevo.displayName || nuevo.nombre} creado con éxito.`);
    cargarDatos();
  };

  const handleRolesActualizados = (usuarioId, nuevosRoles) => {
    setPersonal((prev) =>
      prev.map((u) => {
        if (u.id === usuarioId) {
          const rolesMapeados = nuevosRoles.map((rId) => {
            const cat = ROLES_DISPONIBLES.find((c) => c.id === rId);
            return { id: rId, nombre: cat?.nombre || rId, color: cat?.color || "#64748b" };
          });
          return { ...u, roles: rolesMapeados };
        }
        return u;
      })
    );
    mostrarToast("Roles del usuario actualizados correctamente.");
  };

  const handleToggleEstado = async (u) => {
    const nuevoEstado = u.estado === "activo" ? "inactivo" : "activo";
    try {
      await DirectorService.alternarEstadoUsuario(u.id, nuevoEstado);
      setPersonal((prev) =>
        prev.map((item) => (item.id === u.id ? { ...item, estado: nuevoEstado } : item))
      );
      mostrarToast(`Usuario ${u.nombreCompleto} marcado como ${nuevoEstado}.`);
    } catch {
      mostrarToast("No se pudo cambiar el estado del usuario.");
    }
  };

  // Filtrar personal
  const personalFiltrado = useMemo(() => {
    return personal.filter((p) => {
      if (filtroEstado !== "todos" && p.estado !== filtroEstado) return false;
      if (filtroRol !== "todos" && !p.roles.some((r) => r.id === filtroRol)) return false;
      if (busquedaPersonal.trim()) {
        const q = busquedaPersonal.trim().toLowerCase();
        const enNombre = p.nombreCompleto.toLowerCase().includes(q);
        const enEmail = p.email.toLowerCase().includes(q);
        const enDni = String(p.dni).includes(q);
        const enArea = String(p.area).toLowerCase().includes(q);
        if (!enNombre && !enEmail && !enDni && !enArea) return false;
      }
      return true;
    });
  }, [personal, busquedaPersonal, filtroRol, filtroEstado]);

  const fechaHoy = new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(new Date());

  return h(
    "div",
    { className: "director-page-container" },

    // Toast de Notificación Flotante
    toastMensaje
      ? h(
        "div",
        { className: "director-toast" },
        h(IconCheck, { className: "w-4 h-4 text-emerald-400" }),
        h("span", null, toastMensaje)
      )
      : null,

    // Panel Lateral a la Izquierda (Fuera del dashboard)
    h(
      "aside",
      { className: "director-sidebar-access", "aria-label": "Accesos Rápidos Institucionales" },
      h(
        "div",
        { className: "director-sidebar-access__header" },
        h("span", { className: "director-sidebar-access__tag" }, "Accesos Rápidos"),
        h("h2", { className: "director-sidebar-access__title" }, "Panel de Accesos"),
        h("p", { className: "director-sidebar-access__subtitle" }, "Navegación directa por áreas y sectores")
      ),
      h(
        "nav",
        { className: "director-sidebar-nav-grouped" },

        [
          // --- Secretaría ---
          h("div", { key: "side-div-sec", className: "director-sidebar-divider-label" }, "Secretaría"),
          h(
            "a",
            { key: "side-link-sec", href: "#/secretaria", className: "director-sidebar-item director-sidebar-item--sec" },
            h("div", { className: "director-sidebar-icon director-sidebar-icon--sec" }, h(IconClipboard, { width: "16", height: "16" })),
            h(
              "div",
              { className: "director-sidebar-item-text" },
              h("strong", null, "Secretaría"),
              h("span", null, "Legajos y Documentación")
            ),
            h("span", { className: "director-sidebar-item-arrow" }, "➔")
          ),
          h(
            "a",
            { key: "side-link-alu", href: "#/alumnos", className: "director-sidebar-sub-btn" },
            h(IconUsers, { width: "15", height: "15" }),
            h("span", null, "Alumnos")
          ),
          h(
            "a",
            { key: "side-link-cur", href: "#/cursos", className: "director-sidebar-sub-btn" },
            h(IconSchool, { width: "15", height: "15" }),
            h("span", null, "Cursos")
          ),

          // --- Preceptoría ---
          h("div", { key: "side-div-prec", className: "director-sidebar-divider-label" }, "Preceptoría"),
          h(
            "a",
            { key: "side-link-prec", href: "#/preceptoria", className: "director-sidebar-item director-sidebar-item--prec" },
            h("div", { className: "director-sidebar-icon director-sidebar-icon--prec" }, h(IconClock, { width: "16", height: "16" })),
            h(
              "div",
              { className: "director-sidebar-item-text" },
              h("strong", null, "Preceptoría"),
              h("span", null, "Asistencias y Cursos")
            ),
            h("span", { className: "director-sidebar-item-arrow" }, "➔")
          ),
          h(
            "a",
            { key: "side-link-asist", href: "#/asistencias", className: "director-sidebar-sub-btn" },
            h(IconClock, { width: "15", height: "15" }),
            h("span", null, "Asistencias")
          ),

          // --- Server (deshabilitado según configuración) ---
          ...(MOSTRAR_SERVER
            ? [
              h("div", { key: "side-div-srv", className: "director-sidebar-divider-label" }, "Server"),
              h(
                "a",
                { key: "side-link-srv", href: "#/server", className: "director-sidebar-item director-sidebar-item--srv" },
                h("div", { className: "director-sidebar-icon director-sidebar-icon--srv" }, h(IconServer, { width: "16", height: "16" })),
                h(
                  "div",
                  { className: "director-sidebar-item-text" },
                  h("strong", null, "Server"),
                  h("span", null, "Stock y Equipamiento")
                ),
                h("span", { className: "director-sidebar-item-arrow" }, "➔")
              ),
              h(
                "a",
                { key: "side-link-inv", href: "#/inventario", className: "director-sidebar-sub-btn" },
                h(IconServer, { width: "15", height: "15" }),
                h("span", null, "Inventario")
              )
            ]
            : []),

          // --- Jefatura (deshabilitado según configuración) ---
          ...(MOSTRAR_JEFATURA
            ? [
              h("div", { key: "side-div-jef", className: "director-sidebar-divider-label" }, "Jefatura"),
              h(
                "a",
                { key: "side-link-jef", href: "#/jefatura", className: "director-sidebar-item director-sidebar-item--jef" },
                h("div", { className: "director-sidebar-icon director-sidebar-icon--jef" }, h(IconWrench, { width: "16", height: "16" })),
                h(
                  "div",
                  { className: "director-sidebar-item-text" },
                  h("strong", null, "Jefatura"),
                  h("span", null, "Talleres y Grillas")
                ),
                h("span", { className: "director-sidebar-item-arrow" }, "➔")
              ),
              h(
                "a",
                { key: "side-link-tal", href: "#/jefatura", className: "director-sidebar-sub-btn" },
                h(IconWrench, { width: "15", height: "15" }),
                h("span", null, "Talleres")
              )
            ]
            : [])
        ]
      )
    ),

    // Dashboard a la Derecha (No centrado, ocupando el espacio restante)
    h(
      "section",
      { className: "director-dashboard-wrapper" },

      // Barra Superior Institucional (Sin contenedor blanco de fondo)
      h(
        "div",
        { className: "director-top-bar" },
        h(
          "div",
          { className: "director-top-title-wrap" },
          h("span", { className: "director-badge-main" }, "Dirección General"),
          h("span", { className: "badge-institucion" }, "E.E.S.T N°1 Monte Grande")
        ),
        h(
          "div",
          { className: "alumnos-top-badges" },
          h("span", { className: "badge-ciclo" }, `Ciclo Lectivo ${new Date().getFullYear()}`),
          h("span", { className: "badge-ciclo badge-ciclo--status" }, "● Turno Activo")
        )
      ),

      // Hero Banner Directivo
      h(
        "div",
        { className: "director-hero-banner" },
        h(
          "div",
          { className: "director-hero-left" },
          h(
            "div",
            { className: "director-hero-icon-box" },
            h(IconAward, { className: "director-hero-icon" })
          ),
          h(
            "div",
            null,
            h("span", { className: "director-hero-date" }, fechaHoy.charAt(0).toUpperCase() + fechaHoy.slice(1)),
            h(
              "h1",
              { className: "director-hero-title" },
              `Panel Ejecutivo de Dirección`
            ),
            h(
              "p",
              { className: "director-hero-subtitle" },
              `Bienvenido/a, ${usuario.nombre || "Director"}. Supervisión general de secretaría, personal y preceptoría.`
            )
          )
        ),
        h(
          "div",
          { className: "director-hero-actions" },
          h(
            "button",
            {
              type: "button",
              className: "btn-director-hero-primary",
              onClick: () => setModalNuevoAbierto(true)
            },
            h(IconPlus, null),
            h("span", null, "Crear Nuevo Perfil")
          ),
          h(
            "button",
            {
              type: "button",
              className: "btn-director-hero-secondary",
              onClick: () => setPestanaActiva("personal")
            },
            h(IconUsers, null),
            h("span", null, "Ver Personal")
          )
        )
      ),

      // Navegación de Pestañas (con íconos SVG)
      h(
        "div",
        { className: "director-tabs-nav" },
        [
          { id: "general", label: "Tablero General", icon: IconChart },
          { id: "personal", label: `Gestión de Personal y Roles (${personal.length})`, icon: IconUsers },
          { id: "asignaciones", label: "Asignaciones", icon: IconSchool },
          { id: "supervision", label: "Supervisión de Áreas", icon: IconSchool },
          ...(MOSTRAR_HABILITAR_PEDIDOS
            ? [
              {
                id: "pedidos",
                label: "Habilitar Pedidos",
                icon: IconClipboard,
                badge: pedidosPendientesCount > 0 ? pedidosPendientesCount : null
              }
            ]
            : []),
          { id: "alertas", label: "Alertas", icon: IconAlert }
        ].map((tab) =>
          h(
            "button",
            {
              key: tab.id,
              type: "button",
              className: `director-tab-btn ${pestanaActiva === tab.id ? "director-tab-btn--active" : ""}`,
              onClick: () => setPestanaActiva(tab.id)
            },
            h(tab.icon, { width: "15", height: "15" }),
            h("span", null, tab.label),
            tab.badge
              ? h("span", { className: "director-tab-badge-amber" }, tab.badge)
              : null
          )
        )
      ),

      cargando
        ? h(LoadingState, { mensaje: "Cargando métricas y datos institucionales..." })
        : null,

      // ==========================================
      // PESTAÑA 1: TABLERO GENERAL (Restaurado a ancho completo en el dashboard)
      // ==========================================
      !cargando && pestanaActiva === "general"
        ? h(
          "div",
          { className: "director-section-content" },

          // Grid de KPIs Ejecutivos (4 en línea ocupando todo el ancho)
          h(
            "div",
            { className: "director-kpis-grid" },

            // KPI 1: Alumnos (Ocupa 2 columnas con gráfico horizontal de cada turno y selector num / %)
            h(
              "div",
              { className: "director-kpi-card director-kpi-card--blue director-kpi-card--wide" },
              h(
                "div",
                { className: "director-kpi-asistencias-layout" },
                // Lado izquierdo: Total alumnos, badge de cursos, toggle num/%, y footer
                h(
                  "div",
                  { className: "director-kpi-asistencias-left" },
                  h(
                    "div",
                    { className: "director-asistencia-header-left" },
                    h("span", { className: "director-kpi-label" }, "Alumnos")
                  ),
                  // Elementos independientes posicionados a la derecha
                  h(
                    "div",
                    { className: "director-asistencia-header-badge-float" },
                    h("span", { className: "director-kpi-badge director-kpi-badge--blue" }, "32 Cursos")
                  ),
                  h(
                    "div",
                    { className: "director-asistencia-toggle-float" },
                    h(
                      "div",
                      { className: "director-asistencia-toggle-group", role: "group", "aria-label": "Modo de visualización alumnos" },
                      h(
                        "button",
                        {
                          type: "button",
                          className: `director-asistencia-toggle-btn ${modoAlumnos === "cantidad" ? "director-asistencia-toggle-btn--active-blue" : ""}`,
                          onClick: () => setModoAlumnos("cantidad")
                        },
                        "num"
                      ),
                      h(
                        "button",
                        {
                          type: "button",
                          className: `director-asistencia-toggle-btn ${modoAlumnos === "porcentaje" ? "director-asistencia-toggle-btn--active-blue" : ""}`,
                          onClick: () => setModoAlumnos("porcentaje")
                        },
                        "%"
                      )
                    )
                  ),
                  h(
                    "div",
                    { className: "director-kpi-value" },
                    modoAlumnos === "porcentaje"
                      ? "100%"
                      : `${resumen?.alumnos?.totalActivos ?? 840}`
                  ),
                  h(
                    "div",
                    { className: "director-kpi-footer" },
                    h(
                      "span",
                      null,
                      modoAlumnos === "porcentaje"
                        ? `${resumen?.alumnos?.totalActivos ?? 840} alumnos matriculados`
                        : "32 divisiones activas"
                    )
                  )
                ),

                // Lado derecho: Gráfico Horizontal de cantidad/porcentaje por cada turno
                (() => {
                  const totalAlumnos = resumen?.alumnos?.totalActivos ?? 840;
                  const turnoManana = resumen?.alumnos?.turnoManana ?? 450;
                  const turnoTarde = resumen?.alumnos?.turnoTarde ?? 390;
                  const turnoTaller = resumen?.alumnos?.turnoTaller ?? 525;

                  const pctManana = Math.round(((turnoManana / totalAlumnos) * 100) * 10) / 10;
                  const pctTarde = Math.round(((turnoTarde / totalAlumnos) * 100) * 10) / 10;
                  const pctTaller = Math.round(((turnoTaller / totalAlumnos) * 100) * 10) / 10;

                  const datosTurnosAlumnos = [
                    {
                      label: "Mañana",
                      porcentaje: pctManana,
                      cantidad: turnoManana,
                      color: "#10b981",
                      anchoPct: modoAlumnos === "porcentaje"
                        ? pctManana
                        : Math.min(100, (turnoManana / totalAlumnos) * 100)
                    },
                    {
                      label: "Tarde",
                      porcentaje: pctTarde,
                      cantidad: turnoTarde,
                      color: "#3b82f6",
                      anchoPct: modoAlumnos === "porcentaje"
                        ? pctTarde
                        : Math.min(100, (turnoTarde / totalAlumnos) * 100)
                    },
                    {
                      label: "Taller",
                      porcentaje: pctTaller,
                      cantidad: turnoTaller,
                      color: "#f59e0b",
                      anchoPct: modoAlumnos === "porcentaje"
                        ? pctTaller
                        : Math.min(100, (turnoTaller / totalAlumnos) * 100)
                    }
                  ];

                  const posicionMediaAlumnosPct = modoAlumnos === "porcentaje"
                    ? 50
                    : Math.min(100, Math.max(0, (500 / totalAlumnos) * 100));

                  const marcasEje = modoAlumnos === "porcentaje"
                    ? ["0%", "50%", "100%"]
                    : ["0", "500", String(totalAlumnos)];

                  return h(
                    "div",
                    { className: "director-hchart-container" },
                    // Eje X superior con marcas de escala (0, 500, 840 o 0%, 50%, 100%)
                    h(
                      "div",
                      { className: "director-hchart-axis-x" },
                      h("span", { className: "director-hchart-axis-mark director-hchart-axis-mark--start" }, marcasEje[0]),
                      h("span", {
                        className: "director-hchart-axis-mark director-hchart-axis-mark--mid",
                        style: { left: `${posicionMediaAlumnosPct}%` }
                      }, marcasEje[1]),
                      h("span", { className: "director-hchart-axis-mark director-hchart-axis-mark--end" }, marcasEje[2])
                    ),
                    // Área de trazado con líneas guía verticales detrás y barras
                    h(
                      "div",
                      { className: "director-hchart-plot-area" },
                      h(
                        "div",
                        { className: "director-hchart-grid-lines" },
                        h("div", { className: "director-hchart-grid-line director-hchart-grid-line--start" }),
                        h("div", {
                          className: "director-hchart-grid-line director-hchart-grid-line--mid",
                          style: { left: `${posicionMediaAlumnosPct}%` }
                        }),
                        h("div", { className: "director-hchart-grid-line director-hchart-grid-line--end" })
                      ),
                      datosTurnosAlumnos.map((item) =>
                        h(
                          "div",
                          { key: item.label, className: "director-hchart-row" },
                          h("span", { className: "director-hchart-label" }, item.label),
                          h(
                            "div",
                            { className: "director-hchart-track" },
                            h("div", {
                              className: "director-hchart-bar",
                              style: {
                                width: `${item.anchoPct}%`,
                                backgroundColor: item.color
                              }
                            })
                          ),
                          h(
                            "span",
                            { className: "director-hchart-val" },
                            modoAlumnos === "porcentaje"
                              ? `${item.porcentaje}%`
                              : `${item.cantidad}`
                          )
                        )
                      )
                    )
                  );
                })()
              )
            ),

            // KPI 2: Asistencias (Ocupa 2 columnas con gráfico horizontal y selector % / num)
            h(
              "div",
              { className: "director-kpi-card director-kpi-card--emerald director-kpi-card--wide" },
              h(
                "div",
                { className: "director-kpi-asistencias-layout" },
                // Lado izquierdo: Tasa global, badge con toggle, y alertas
                h(
                  "div",
                  { className: "director-kpi-asistencias-left" },
                  h(
                    "div",
                    { className: "director-asistencia-header-left" },
                    h("span", { className: "director-kpi-label" }, "Asistencias")
                  ),
                  // Elementos independientes posicionados a la derecha
                  h(
                    "div",
                    { className: "director-asistencia-header-badge-float" },
                    h("span", { className: "director-kpi-badge director-kpi-badge--emerald" }, "Promedio Hoy")
                  ),
                  h(
                    "div",
                    { className: "director-asistencia-toggle-float" },
                    h(
                      "div",
                      { className: "director-asistencia-toggle-group", role: "group", "aria-label": "Modo de visualización" },
                      h(
                        "button",
                        {
                          type: "button",
                          className: `director-asistencia-toggle-btn ${modoAsistencia === "cantidad" ? "director-asistencia-toggle-btn--active" : ""}`,
                          onClick: () => setModoAsistencia("cantidad")
                        },
                        "num"
                      ),
                      h(
                        "button",
                        {
                          type: "button",
                          className: `director-asistencia-toggle-btn ${modoAsistencia === "porcentaje" ? "director-asistencia-toggle-btn--active" : ""}`,
                          onClick: () => setModoAsistencia("porcentaje")
                        },
                        "%"
                      )
                    )
                  ),
                  h(
                    "div",
                    { className: "director-kpi-value" },
                    modoAsistencia === "porcentaje"
                      ? `${resumen?.asistencia?.tasaGeneral ?? 94.2}%`
                      : `${resumen?.asistencia?.presentesHoy ?? 791}`
                  ),
                  h(
                    "div",
                    { className: "director-kpi-footer" },
                    h(
                      "span",
                      null,
                      modoAsistencia === "porcentaje"
                        ? `${resumen?.asistencia?.presentesHoy ?? 791} presentes`
                        : `de ${resumen?.alumnos?.totalActivos ?? 840} alumnos`
                    ),
                    h("span", null, `·`),
                    h("span", { className: "text-rose-600 font-semibold" }, `${resumen?.asistencia?.alertasConsecutivas ?? 3} alertas faltas`)
                  )
                ),

                // Lado derecho: Gráfico Horizontal con escala numérica/porcentaje ARRIBA
                (() => {
                  const totalAlumnos = resumen?.alumnos?.totalActivos ?? 840;
                  // Datos de cada turno (porcentaje y cantidad de alumnos)
                  const datosTurnos = [
                    {
                      label: "Mañana",
                      porcentaje: 94.2,
                      cantidad: 424,
                      color: "#10b981",
                      anchoPct: modoAsistencia === "porcentaje" ? 94.2 : Math.min(100, (424 / totalAlumnos) * 100)
                    },
                    {
                      label: "Tarde",
                      porcentaje: 92.8,
                      cantidad: 362,
                      color: "#3b82f6",
                      anchoPct: modoAsistencia === "porcentaje" ? 92.8 : Math.min(100, (362 / totalAlumnos) * 100)
                    },
                    {
                      label: "Taller",
                      porcentaje: 96.4,
                      cantidad: 505,
                      color: "#f59e0b",
                      anchoPct: modoAsistencia === "porcentaje" ? 96.4 : Math.min(100, (505 / totalAlumnos) * 100)
                    }
                  ];

                  const posicionMediaAsistenciaPct = modoAsistencia === "porcentaje"
                    ? 50
                    : Math.min(100, Math.max(0, (500 / totalAlumnos) * 100));

                  // Marcas del eje superior (0%, 50%, 100% o 0, 500, 840)
                  const marcasEje = modoAsistencia === "porcentaje"
                    ? ["0%", "50%", "100%"]
                    : ["0", "500", String(totalAlumnos)];

                  return h(
                    "div",
                    { className: "director-hchart-container" },
                    // 1. Eje X superior con etiquetas de escala (0%, 50%, 100% o 0, 500, 840)
                    h(
                      "div",
                      { className: "director-hchart-axis-x" },
                      h("span", { className: "director-hchart-axis-mark director-hchart-axis-mark--start" }, marcasEje[0]),
                      h("span", {
                        className: "director-hchart-axis-mark director-hchart-axis-mark--mid",
                        style: { left: `${posicionMediaAsistenciaPct}%` }
                      }, marcasEje[1]),
                      h("span", { className: "director-hchart-axis-mark director-hchart-axis-mark--end" }, marcasEje[2])
                    ),
                    // 2. Área de trazado con líneas guía verticales detrás y barras
                    h(
                      "div",
                      { className: "director-hchart-plot-area" },
                      // 3 líneas guía verticales de fondo
                      h(
                        "div",
                        { className: "director-hchart-grid-lines" },
                        h("div", { className: "director-hchart-grid-line director-hchart-grid-line--start" }),
                        h("div", {
                          className: "director-hchart-grid-line director-hchart-grid-line--mid",
                          style: { left: `${posicionMediaAsistenciaPct}%` }
                        }),
                        h("div", { className: "director-hchart-grid-line director-hchart-grid-line--end" })
                      ),
                      // Filas de barras horizontales
                      datosTurnos.map((item) =>
                        h(
                          "div",
                          { key: item.label, className: "director-hchart-row" },
                          h("span", { className: "director-hchart-label" }, item.label),
                          h(
                            "div",
                            { className: "director-hchart-track" },
                            h("div", {
                              className: "director-hchart-bar",
                              style: {
                                width: `${item.anchoPct}%`,
                                backgroundColor: item.color
                              }
                            })
                          ),
                          h(
                            "span",
                            { className: "director-hchart-val" },
                            modoAsistencia === "porcentaje"
                              ? `${item.porcentaje}%`
                              : `${item.cantidad}`
                          )
                        )
                      )
                    )
                  );
                })()
              )
            ),

            // KPI 3: Personal (Ubicado abajo, 1 cuadrado como antes)
            h(
              "div",
              { className: "director-kpi-card director-kpi-card--purple" },
              h(
                "div",
                { className: "director-kpi-card__header" },
                h("span", { className: "director-kpi-label" }, "Personal"),
                h("span", { className: "director-kpi-badge director-kpi-badge--purple" }, "7 Roles")
              ),
              h("div", { className: "director-kpi-value" }, `${resumen?.personal?.totalUsuarios ?? personal.length}`),
              h(
                "div",
                { className: "director-kpi-footer" },
                h("span", null, `${resumen?.personal?.activos ?? personal.length} usuarios activos`)
              )
            ),

            // KPI 4: Pañol (deshabilitado si !MOSTRAR_SERVER)
            MOSTRAR_SERVER
              ? h(
                "div",
                { className: "director-kpi-card director-kpi-card--amber" },
                h(
                  "div",
                  { className: "director-kpi-card__header" },
                  h("span", { className: "director-kpi-label" }, "Pañol"),
                  h("span", { className: "director-kpi-badge director-kpi-badge--amber" }, "Recursos")
                ),
                h("div", { className: "director-kpi-value" }, `${resumen?.serverPañol?.totalItems ?? 24} ítems`),
                h(
                  "div",
                  { className: "director-kpi-footer" },
                  h("span", { className: "text-amber-700 font-medium" }, `${resumen?.serverPañol?.solicitudesPendientes ?? 2} solicitudes pend.`),
                  h("span", null, `·`),
                  h("span", { className: "text-rose-600 font-medium" }, `${resumen?.serverPañol?.sinStock ?? 2} sin stock`)
                )
              )
              : null
          ),

          // Accesos Rápidos de Supervisión Directiva (si Server o Jefatura estuviesen activos)
          (MOSTRAR_SERVER || MOSTRAR_JEFATURA)
            ? h(
              "div",
              { className: "director-supervision-cards-grid" },
              MOSTRAR_SERVER
                ? h(
                  "div",
                  { className: "director-access-box" },
                  h(
                    "div",
                    { className: "director-access-box__header" },
                    h("div", { className: "director-access-icon-wrap director-access-icon-wrap--srv" }, h(IconServer, { width: "20", height: "20", className: "text-emerald-600" })),
                    h("h3", { className: "director-access-title" }, "Server")
                  ),
                  h("p", { className: "director-access-desc" }, "Control de stock de materiales, equipamiento técnico, reservas de laboratorios y solicitudes."),
                  h(
                    "div",
                    { className: "director-access-actions" },
                    h(
                      "a",
                      { href: "#/server", className: "director-btn-navy" },
                      "Ir a Server"
                    )
                  )
                )
                : null,
              MOSTRAR_JEFATURA
                ? h(
                  "div",
                  { className: "director-access-box" },
                  h(
                    "div",
                    { className: "director-access-box__header" },
                    h("div", { className: "director-access-icon-wrap director-access-icon-wrap--jef" }, h(IconWrench, { width: "20", height: "20", className: "text-amber-600" })),
                    h("h3", { className: "director-access-title" }, "Jefatura de Área y Talleres")
                  ),
                  h("p", { className: "director-access-desc" }, "Grilla horaria de talleres, distribución de espacios y seguimiento de materias técnicas."),
                  h(
                    "div",
                    { className: "director-access-actions" },
                    h(
                      "a",
                      { href: "#/jefatura", className: "director-btn-navy" },
                      "Ir a Jefatura"
                    )
                  )
                )
                : null
            )
            : null
        )
        : null,

      // =========================================================================
      // PESTAÑA 2: GESTIÓN DE PERSONAL Y PERFILES (CON CREACIÓN Y ASIGNACIÓN DE ROLES)
      // =========================================================================
      !cargando && pestanaActiva === "personal"
        ? h(
          "div",
          { className: "director-section-content" },

          h(
            DashboardCard,
            {
              title: "Gestión de Personal y Asignación de Roles",
              icon: "people",
              badge: `${personalFiltrado.length} de ${personal.length} miembros`,
              className: "dashboard-card--highlight director-main-card",
              collapsible: false,
              actions: h(
                "button",
                {
                  type: "button",
                  className: "btn-director-primary",
                  onClick: () => setModalNuevoAbierto(true)
                },
                h(IconPlus, { width: "15", height: "15" }),
                h("span", null, "Crear Nuevo Perfil")
              )
            },

            // Toolbar de Filtros y Búsqueda de Personal
            h(
              "div",
              { className: "director-personal-toolbar" },

              // Buscador
              h(
                "div",
                { className: "search-input-wrapper director-search-wrap" },
                h(IconoFigma, { className: "search-input-icon", nombre: "search" }),
                h("input", {
                  type: "text",
                  className: "search-input",
                  placeholder: "Buscar por nombre, apellido, DNI, email o área...",
                  value: busquedaPersonal,
                  onChange: (e) => setBusquedaPersonal(e.target.value),
                  "aria-label": "Buscar personal"
                }),
                busquedaPersonal
                  ? h(
                    "button",
                    {
                      type: "button",
                      className: "search-clear-btn",
                      onClick: () => setBusquedaPersonal(""),
                      "aria-label": "Limpiar"
                    },
                    "✕"
                  )
                  : null
              ),

              // Selector de Rol
              h(
                "select",
                {
                  className: "director-filter-select",
                  value: filtroRol,
                  onChange: (e) => setFiltroRol(e.target.value),
                  "aria-label": "Filtrar por rol"
                },
                h("option", { value: "todos" }, "Todos los Roles"),
                ROLES_DISPONIBLES.map((rol) =>
                  h("option", { key: rol.id, value: rol.id }, `Rol: ${rol.nombre}`)
                )
              ),

              // Selector de Estado
              h(
                "select",
                {
                  className: "director-filter-select",
                  value: filtroEstado,
                  onChange: (e) => setFiltroEstado(e.target.value),
                  "aria-label": "Filtrar por estado"
                },
                h("option", { value: "todos" }, "Todos los Estados"),
                h("option", { value: "activo" }, "Solo Activos"),
                h("option", { value: "inactivo" }, "Solo Inactivos")
              )
            ),

            // Tabla de Personal
            personalFiltrado.length === 0
              ? h(EmptyState, {
                mensaje: busquedaPersonal || filtroRol !== "todos" || filtroEstado !== "todos"
                  ? "No hay personal que coincida con los filtros aplicados."
                  : "No hay usuarios registrados en el sistema."
              })
              : h(
                "div",
                { className: "director-table-responsive" },
                h(
                  "table",
                  { className: "director-table" },
                  h(
                    "thead",
                    null,
                    h(
                      "tr",
                      null,
                      h("th", null, "Personal / Usuario"),
                      h("th", null, "Contacto y DNI"),
                      h("th", null, "Área / Sector"),
                      h("th", null, "Roles Asignados"),
                      h("th", null, "Estado"),
                      h("th", { style: { textAlign: "right" } }, "Acciones")
                    )
                  ),
                  h(
                    "tbody",
                    null,
                    personalFiltrado.map((p) =>
                      h(
                        "tr",
                        { key: p.id, className: p.estado === "inactivo" ? "director-row--inactive" : "" },

                        // Columna 1: Nombre y Avatar
                        h(
                          "td",
                          null,
                          h(
                            "div",
                            { className: "director-user-cell" },
                            h(
                              "div",
                              { className: "director-user-avatar" },
                              p.nombreCompleto.charAt(0).toUpperCase()
                            ),
                            h(
                              "div",
                              null,
                              h("strong", { className: "director-user-name" }, p.nombreCompleto),
                              h("span", { className: "director-user-id" }, `ID: ${p.id}`)
                            )
                          )
                        ),

                        // Columna 2: Contacto
                        h(
                          "td",
                          null,
                          h("div", { className: "director-contact-email" }, p.email),
                          h("span", { className: "director-contact-dni" }, `DNI: ${p.dni}`)
                        ),

                        // Columna 3: Área
                        h(
                          "td",
                          null,
                          h("span", { className: "director-area-badge" }, p.area)
                        ),

                        // Columna 4: Roles
                        h(
                          "td",
                          null,
                          h(
                            "div",
                            { className: "director-roles-badges-wrap" },
                            p.roles.map((r) =>
                              h(
                                "span",
                                {
                                  key: r.id,
                                  className: `director-role-pill director-role-pill--${r.id}`,
                                  style: { borderLeftColor: r.color }
                                },
                                r.nombre
                              )
                            )
                          )
                        ),

                        // Columna 5: Estado
                        h(
                          "td",
                          null,
                          h(
                            "span",
                            {
                              className: `director-status-tag ${p.estado === "activo" ? "director-status-tag--active" : "director-status-tag--inactive"}`
                            },
                            p.estado === "activo" ? "● Activo" : "○ Inactivo"
                          )
                        ),

                        // Columna 6: Acciones
                        h(
                          "td",
                          { style: { textAlign: "right" } },
                          h(
                            "div",
                            { className: "director-actions-cell" },
                            h(
                              "button",
                              {
                                type: "button",
                                className: "btn-director-action-edit-roles",
                                onClick: () => setUsuarioEditandoRoles(p),
                                title: "Modificar roles del usuario"
                              },
                              h(IconSettings, { width: "13", height: "13" }),
                              h("span", null, "Roles")
                            ),
                            h(
                              "button",
                              {
                                type: "button",
                                className: `btn-director-action-toggle ${p.estado === "activo" ? "btn-director-action-toggle--deactivate" : "btn-director-action-toggle--activate"}`,
                                onClick: () => handleToggleEstado(p),
                                title: p.estado === "activo" ? "Desactivar cuenta" : "Reactivar cuenta"
                              },
                              p.estado === "activo" ? "Suspender" : "Activar"
                            )
                          )
                        )
                      )
                    )
                  )
                )
              )
          )
        )
        : null,

      // =========================================================================
      // PESTAÑA: ASIGNACIONES (Preceptores y Profesores a Cursos)
      // =========================================================================
      !cargando && pestanaActiva === "asignaciones"
        ? h(AsignacionesSection, {
          personal,
          onMostrarToast: mostrarToast
        })
        : null,

      // =========================================================================
      // PESTAÑA 3: SUPERVISIÓN DE ÁREAS
      // =========================================================================
      !cargando && pestanaActiva === "supervision"
        ? h(
          "div",
          { className: "director-section-content" },

          h(
            "div",
            { className: "director-supervision-detailed-grid" },

            // Bloque 1: Resumen de Secretaría
            h(
              DashboardCard,
              {
                title: "Supervisión de Secretaría Académica",
                icon: "students",
                className: "dashboard-card--highlight",
                collapsible: false
              },
              h(
                "div",
                { className: "director-supervision-block" },
                h(
                  "div",
                  { className: "director-metrics-mini-row" },
                  h(
                    "div",
                    { className: "director-metric-mini" },
                    h("span", { className: "director-metric-mini__label" }, "Matrícula Activa"),
                    h("strong", { className: "director-metric-mini__val" }, resumen?.alumnos?.totalActivos ?? 840)
                  ),
                  h(
                    "div",
                    { className: "director-metric-mini" },
                    h("span", { className: "director-metric-mini__label" }, "Cursos Totales"),
                    h("strong", { className: "director-metric-mini__val" }, "32 Divisiones")
                  ),
                  h(
                    "div",
                    { className: "director-metric-mini" },
                    h("span", { className: "director-metric-mini__label" }, "Alumnos en Riesgo"),
                    h("strong", { className: "director-metric-mini__val text-rose-600" }, `${resumen?.alumnos?.alumnosEnRiesgo ?? 12} casos`)
                  )
                ),
                h(
                  "div",
                  { className: "director-card-quick-links" },
                  h("a", { href: "#/secretaria", className: "director-link-btn" }, "Abrir Tablero de Secretaría ➔"),
                  h("a", { href: "#/alumnos", className: "director-link-btn-outline" }, "Ver Legajos de Alumnos")
                )
              )
            ),

            // Bloque 2: Resumen de Preceptoría
            h(
              DashboardCard,
              {
                title: "Supervisión de Preceptoría y Turnos",
                icon: "attendance",
                className: "dashboard-card--highlight",
                collapsible: false
              },
              h(
                "div",
                { className: "director-supervision-block" },
                h(
                  "div",
                  { className: "director-metrics-mini-row" },
                  h(
                    "div",
                    { className: "director-metric-mini" },
                    h("span", { className: "director-metric-mini__label" }, "Asistencia General"),
                    h("strong", { className: "director-metric-mini__val" }, `${resumen?.asistencia?.tasaGeneral ?? 94.2}%`)
                  ),
                  h(
                    "div",
                    { className: "director-metric-mini" },
                    h("span", { className: "director-metric-mini__label" }, "Preceptores"),
                    h("strong", { className: "director-metric-mini__val" }, "8 Asignados")
                  ),
                  h(
                    "div",
                    { className: "director-metric-mini" },
                    h("span", { className: "director-metric-mini__label" }, "Inasistencias Críticas"),
                    h("strong", { className: "director-metric-mini__val text-amber-600" }, `${resumen?.asistencia?.alertasConsecutivas ?? 3} en seguimiento`)
                  )
                ),
                h(
                  "div",
                  { className: "director-card-quick-links" },
                  h("a", { href: "#/preceptoria", className: "director-link-btn" }, "Abrir Tablero de Preceptoría ➔"),
                  h("a", { href: "#/preceptoria/observaciones", className: "director-link-btn-outline" }, "Libro de Observaciones")
                )
              )
            ),

            // Bloque 3: Resumen de Server y Pañol (deshabilitado si !MOSTRAR_SERVER)
            MOSTRAR_SERVER
              ? h(
                DashboardCard,
                {
                  title: "Supervisión de Server, Pañol e Infraestructura",
                  icon: "filter",
                  className: "dashboard-card--highlight",
                  collapsible: false
                },
                h(
                  "div",
                  { className: "director-supervision-block" },
                  h(
                    "div",
                    { className: "director-metrics-mini-row" },
                    h(
                      "div",
                      { className: "director-metric-mini" },
                      h("span", { className: "director-metric-mini__label" }, "Materiales Registrados"),
                      h("strong", { className: "director-metric-mini__val" }, resumen?.serverPañol?.totalItems ?? 24)
                    ),
                    h(
                      "div",
                      { className: "director-metric-mini" },
                      h("span", { className: "director-metric-mini__label" }, "Sin Stock"),
                      h("strong", { className: "director-metric-mini__val text-rose-600" }, `${resumen?.serverPañol?.sinStock ?? 2} ítems`)
                    ),
                    h(
                      "div",
                      { className: "director-metric-mini" },
                      h("span", { className: "director-metric-mini__label" }, "Solicitudes de Taller"),
                      h("strong", { className: "director-metric-mini__val text-blue-600" }, `${resumen?.serverPañol?.solicitudesPendientes ?? 2} pendientes`)
                    )
                  ),
                  h(
                    "div",
                    { className: "director-card-quick-links" },
                    h("a", { href: "#/server", className: "director-link-btn" }, "Abrir Tablero de Server ➔"),
                    h("a", { href: "#/inventario", className: "director-link-btn-outline" }, "Ver Inventario de Pañol")
                  )
                )
              )
              : null
          )
        )
        : null,

      // =========================================================================
      // PESTAÑA 4: ALERTAS INSTITUCIONALES CONSOLIDADAS
      // =========================================================================
      !cargando && pestanaActiva === "alertas"
        ? h(
          "div",
          { className: "director-section-content" },

          h(
            DashboardCard,
            {
              title: "Alertas y Novedades Institucionales",
              icon: "alert",
              badge: "Atención Requerida",
              className: "dashboard-card--highlight",
              collapsible: false
            },
            h(
              "div",
              { className: "director-alerts-list" },
              [
                {
                  id: "alt-1",
                  tipo: "academica",
                  badge: "Académica",
                  titulo: "12 Alumnos con más de 3 materias previas para mesa de examen",
                  detalle: "Se requiere coordinar el cronograma de tutorías e intensificación del Ciclo Superior.",
                  area: "Secretaría",
                  link: "#/secretaria"
                },
                {
                  id: "alt-2",
                  tipo: "asistencia",
                  badge: "Asistencia",
                  titulo: "3 Alumnos con inasistencias consecutivas sin justificar",
                  detalle: "Pérez Martín (3° 1°) y dos alumnos más acumulan 3 o más faltas seguidas en el turno mañana.",
                  area: "Preceptoría",
                  link: "#/preceptoria"
                },
                {
                  id: "alt-3",
                  tipo: "recursos",
                  badge: "Pañol & Server",
                  titulo: "Stock crítico de cables UTP y fichas RJ45 en Pañol",
                  detalle: "Insumos agotados para la próxima clase práctica de Redes y Telecomunicaciones.",
                  area: "Server",
                  link: "#/inventario"
                }
              ].map((alerta) =>
                h(
                  "div",
                  { key: alerta.id, className: `director-alert-item director-alert-item--${alerta.tipo}` },
                  h(
                    "div",
                    { className: "director-alert-item__top" },
                    h("span", { className: `director-alert-badge director-alert-badge--${alerta.tipo}` }, alerta.badge),
                    h("span", { className: "director-alert-area" }, `Área: ${alerta.area}`)
                  ),
                  h("h4", { className: "director-alert-title" }, alerta.titulo),
                  h("p", { className: "director-alert-detail" }, alerta.detalle),
                  h("a", { href: alerta.link, className: "director-alert-link" }, "Ver detalle de la situación ➔")
                )
              )
            )
          )
        )
        : null,

      // =========================================================================
      // PESTAÑA 5: HABILITACIÓN DE PEDIDOS (deshabilitada según configuración)
      // =========================================================================
      !cargando && pestanaActiva === "pedidos" && MOSTRAR_HABILITAR_PEDIDOS
        ? h(
          "div",
          { className: "director-section-content" },
          h(HabilitarPedidosSection, {
            pedidos,
            alAprobar: handleAprobarPedido,
            alRechazar: handleRechazarPedido,
            alCrearPrueba: handleCrearPedidoPrueba
          })
        )
        : null,

      // Modal para Crear Nuevo Perfil con Asignación de Roles
      h(NuevoPerfilModal, {
        abierto: modalNuevoAbierto,
        alCerrar: () => setModalNuevoAbierto(false),
        alPerfilCreado: handlePerfilCreado
      }),

      // Modal para Editar Roles de un Usuario Existente
      h(EditarRolesModal, {
        usuario: usuarioEditandoRoles,
        abierto: Boolean(usuarioEditandoRoles),
        alCerrar: () => setUsuarioEditandoRoles(null),
        alRolesActualizados: handleRolesActualizados
      })
    )
  );
}

