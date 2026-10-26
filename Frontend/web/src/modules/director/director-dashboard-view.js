import React, { useEffect, useMemo, useState } from "react";
import { h, IconoFigma } from "../../layouts/site-layout.js";
import { DashboardCard } from "../../components/dashboard/dashboard-card.js";
import { EmptyState, LoadingState } from "../../components/common/state-handlers.js";
import { useUsuarioActual } from "../../estado/index.js";
import { DirectorService, ROLES_DISPONIBLES } from "./director-service.js";
import { NuevoPerfilModal } from "./components/nuevo-perfil-modal.js";
import { EditarRolesModal } from "./components/editar-roles-modal.js";
import { PersonalView } from "./components/personal-view.js";
import { HabilitarPedidosSection } from "./components/habilitar-pedidos-section.js";
import { AsignacionesSection } from "./components/asignaciones-section.js";
import { PanelAccesos } from "./components/panel-accesos.js";
import { InformesView } from "../informes/informes-view.js";
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
  const [areas, setAreas] = useState([]);
  const [institucion, setInstitucion] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [errorPersonal, setErrorPersonal] = useState(null);
  const [pestanaActiva, setPestanaActiva] = useState("general"); // 'general' | 'personal' | 'asignaciones' | 'supervision' | 'informes' | 'pedidos' | 'alertas'
  const [modoAsistencia, setModoAsistencia] = useState("porcentaje"); // 'porcentaje' | 'cantidad'
  const [modoAlumnos, setModoAlumnos] = useState("cantidad"); // 'cantidad' | 'porcentaje'

  // Opciones de visualización (deshabilitar Server, Jefatura y Habilitar Pedidos sin borrar código)
  const MOSTRAR_SERVER = false;
  const MOSTRAR_JEFATURA = false;
  const MOSTRAR_HABILITAR_PEDIDOS = false;

  // Modales
  const [modalNuevoAbierto, setModalNuevoAbierto] = useState(false);
  const [usuarioEditandoRoles, setUsuarioEditandoRoles] = useState(null);

  // Mensajes de notificación temporal
  const [toastMensaje, setToastMensaje] = useState(null);

  const cargarDatos = async () => {
    setCargando(true);
    setErrorPersonal(null);

    const [resumenResultado, personalResultado, pedidosResultado, areasResultado, institucionResultado] =
      await Promise.allSettled([
        DirectorService.getDashboardConsolidado(),
        DirectorService.listarPerfiles(),
        DirectorService.listarPedidos(),
        DirectorService.listarAreas(),
        DirectorService.obtenerInstitucion()
      ]);

    if (resumenResultado.status === "fulfilled") {
      setResumen(resumenResultado.value);
    }

    if (personalResultado.status === "fulfilled") {
      setPersonal(personalResultado.value.items);
    } else {
      setPersonal([]);
      setErrorPersonal(personalResultado.reason);
    }

    if (pedidosResultado.status === "fulfilled") {
      setPedidos(pedidosResultado.value);
    }

    if (areasResultado.status === "fulfilled") {
      setAreas(areasResultado.value);
    }

    if (institucionResultado.status === "fulfilled") {
      setInstitucion(institucionResultado.value);
    }

    setCargando(false);
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

  /* Alertas institucionales: se arman con lo que reporta cada modulo. Si un
     modulo no esta disponible (o no se tiene permiso) no se inventa ninguna
     alerta: simplemente no aparece. */
  const alertas = useMemo(() => {
    const lista = [];

    for (const alerta of resumen?.alumnos?.alertas ?? []) {
      lista.push({
        id: alerta.id,
        tipo: "academica",
        badge: alerta.tipo ?? "Académica",
        titulo: alerta.titulo,
        detalle: [alerta.alumno, alerta.descripcion].filter(Boolean).join(" · "),
        area: "Secretaría",
        link: alerta.recurso ?? null
      });
    }

    for (const alerta of resumen?.serverPañol?.alertas ?? []) {
      lista.push({
        id: alerta.id,
        tipo: "recursos",
        badge: alerta.tipo === "solicitud_urgente" ? "Solicitud" : "Pañol & Server",
        titulo: alerta.titulo,
        detalle: alerta.descripcion,
        area: "Server y Pañol",
        link: "#/inventario"
      });
    }

    return lista;
  }, [resumen]);

  const alertasTotales = alertas.length;

  /* Asistencias: los porcentajes y el detalle por division se calculan con los
     totales reales del modulo de inasistencias. Cuando ese modulo no esta
     disponible la vista lo dice en lugar de mostrar una cifra inventada. */
  const asistencias = useMemo(() => {
    const bloque = resumen?.asistencia;
    const disponible = Boolean(bloque?.disponible);

    const total = disponible ? (bloque.totalInasistencias ?? 0) : 0;
    const justificadas = disponible ? (bloque.justificadas ?? 0) : 0;
    const sinJustificar = disponible ? (bloque.noJustificadas ?? 0) : 0;
    const pendientes = disponible ? (bloque.pendientes ?? 0) : 0;

    const filas = (bloque?.porDivision ?? [])
      .map((division) => {
        const cantidad = division.total ?? 0;
        const sinJustificarDivision = division.noJustificadas ?? 0;

        return {
          id: `${division.curso}-${division.division}`,
          label: `${division.curso}° ${division.division}`,
          cantidad,
          sinJustificar: sinJustificarDivision,
          porcentaje: cantidad > 0 ? Math.round((sinJustificarDivision / cantidad) * 1000) / 10 : 0
        };
      })
      .sort((una, otra) => otra.cantidad - una.cantidad);

    return {
      disponible,
      total,
      justificadas,
      sinJustificar,
      pendientes,
      filas,
      maximo: filas.reduce((mayor, fila) => Math.max(mayor, fila.cantidad), 0),
      porcentajeSinJustificar: total > 0 ? Math.round((sinJustificar / total) * 1000) / 10 : 0
    };
  }, [resumen]);

  /* Roles que estan en uso: sale del listado real de personal, no de un numero
     fijo. */
  const rolesEnUso = useMemo(
    () => Object.keys(resumen?.personal?.porRol ?? {}).length,
    [resumen]
  );

  /* Preceptores activos: cuenta de personas con el rol, sobre el personal real. */
  const preceptoresActivos = useMemo(
    () => personal.filter((u) => u.estado === "activo" && (u.roles ?? []).some((rol) => rol.id === "preceptor")).length,
    [personal]
  );

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
    h(PanelAccesos, { mostrarServer: MOSTRAR_SERVER, mostrarJefatura: MOSTRAR_JEFATURA }),

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
          h("span", { className: "director-badge-main" }, institucion?.dependencia ?? "Dirección General"),
          h("span", { className: "badge-institucion" }, institucion?.nombre ?? "—")
        ),
        h(
          "div",
          { className: "alumnos-top-badges" },
          h("span", { className: "badge-ciclo" }, `Ciclo Lectivo ${institucion?.cicloLectivo ?? "—"}`),
          h(
            "span",
            { className: "badge-ciclo badge-ciclo--status" },
            institucion?.turnoActivo ? "Turno Activo" : "Turno Inactivo"
          )
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
          { id: "informes", label: "Informes", icon: IconClipboard },
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
                    h(
                      "span",
                      { className: "director-kpi-badge director-kpi-badge--blue" },
                      resumen?.alumnos?.disponible
                        ? `${resumen.alumnos.divisiones} ${resumen.alumnos.divisiones === 1 ? "Curso" : "Cursos"}`
                        : "Sin datos"
                    )
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
                    !resumen?.alumnos?.disponible
                      ? "—"
                      : modoAlumnos === "porcentaje"
                        ? "100%"
                        : `${resumen.alumnos.totalActivos}`
                  ),
                  h(
                    "div",
                    { className: "director-kpi-footer" },
                    h(
                      "span",
                      null,
                      !resumen?.alumnos?.disponible
                        ? "Datos de matrícula no disponibles"
                        : modoAlumnos === "porcentaje"
                          ? `${resumen.alumnos.totalActivos} alumnos matriculados`
                          : `${resumen.alumnos.divisiones} divisiones activas`
                    )
                  )
                ),

                // Lado derecho: Grafico horizontal con la distribucion por turno
                (() => {
                  const totalAlumnos = resumen?.alumnos?.totalActivos ?? 0;
                  const porTurno = resumen?.alumnos?.porTurno ?? [];

                  const COLORES = ["#10b981", "#3b82f6", "#f59e0b", "#8b5cf6"];

                  const datosTurnosAlumnos = porTurno.map((turno, indice) => {
                    const cantidad = turno.cantidad ?? 0;
                    const porcentaje =
                      totalAlumnos > 0
                        ? Math.round((cantidad / totalAlumnos) * 1000) / 10
                        : (turno.porcentaje ?? 0);

                    return {
                      label: turno.turno ?? "Turno",
                      porcentaje,
                      cantidad,
                      color: COLORES[indice % COLORES.length],
                      anchoPct:
                        modoAlumnos === "porcentaje"
                          ? porcentaje
                          : totalAlumnos > 0
                            ? Math.min(100, (cantidad / totalAlumnos) * 100)
                            : 0
                    };
                  });

                  if (!datosTurnosAlumnos.length) {
                    return h(
                      "p",
                      { className: "director-kpi-sin-datos" },
                      "La distribucion por turno no esta disponible."
                    );
                  }

                  const posicionMediaAlumnosPct = modoAlumnos === "porcentaje"
                    ? 50
                    : Math.min(100, Math.max(0, (totalAlumnos / 2 / totalAlumnos) * 100));

                  const marcasEje = modoAlumnos === "porcentaje"
                    ? ["0%", "50%", "100%"]
                    : ["0", String(Math.round(totalAlumnos / 2)), String(totalAlumnos)];

                  return h(
                    "div",
                    { className: "director-hchart-container" },
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

            // KPI 2: Asistencias (datos reales del modulo de inasistencias)
            h(
              "div",
              { className: "director-kpi-card director-kpi-card--emerald director-kpi-card--wide" },
              h(
                "div",
                { className: "director-kpi-asistencias-layout" },
                // Lado izquierdo: total de inasistencias, badge con toggle y desglose
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
                    h(
                      "span",
                      { className: "director-kpi-badge director-kpi-badge--emerald" },
                      asistencias.disponible ? "Inasistencias" : "Sin datos"
                    )
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
                    !asistencias.disponible
                      ? "—"
                      : modoAsistencia === "porcentaje"
                        ? `${asistencias.porcentajeSinJustificar}%`
                        : `${asistencias.total}`
                  ),
                  h(
                    "div",
                    { className: "director-kpi-footer" },
                    !asistencias.disponible
                      ? h("span", null, "El módulo de asistencia no está disponible.")
                      : [
                          h("span", { key: "justificadas" }, `${asistencias.justificadas} justificadas`),
                          h("span", { key: "sep1" }, `·`),
                          h(
                            "span",
                            { key: "sin-justificar", className: "text-rose-600 font-semibold" },
                            `${asistencias.sinJustificar} sin justificar`
                          ),
                          h("span", { key: "sep2" }, `·`),
                          h("span", { key: "pendientes" }, `${asistencias.pendientes} pendientes`)
                        ]
                  )
                ),

                // Lado derecho: Gráfico Horizontal con escala numérica/porcentaje ARRIBA
                (() => {
                  if (!asistencias.disponible) {
                    return h(
                      "p",
                      { className: "director-kpi-sin-datos" },
                      "No hay datos de asistencia para mostrar."
                    );
                  }

                  if (!asistencias.filas.length) {
                    return h(
                      "p",
                      { className: "director-kpi-sin-datos" },
                      "No hay inasistencias registradas en el período."
                    );
                  }

                  /* El color de cada barra sale de la proporción real de
                     inasistencias sin justificar de la division. */
                  const colorDe = (porcentaje) => {
                    if (porcentaje >= 50) return "#e11d48";
                    if (porcentaje >= 25) return "#f59e0b";
                    return "#10b981";
                  };

                  const filas = asistencias.filas.map((fila) => ({
                    ...fila,
                    anchoPct:
                      modoAsistencia === "porcentaje"
                        ? fila.porcentaje
                        : asistencias.maximo > 0
                          ? Math.min(100, (fila.cantidad / asistencias.maximo) * 100)
                          : 0,
                    color: colorDe(fila.porcentaje)
                  }));

                  const posicionMediaAsistenciaPct = 50;

                  // Marcas del eje superior (0%, 50%, 100% o 0, mitad, maximo)
                  const marcasEje = modoAsistencia === "porcentaje"
                    ? ["0%", "50%", "100%"]
                    : ["0", String(Math.round(asistencias.maximo / 2)), String(asistencias.maximo)];

                  return h(
                    "div",
                    { className: "director-hchart-container" },
                    // 1. Eje X superior con etiquetas de escala
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
                      filas.map((item) =>
                        h(
                          "div",
                          { key: item.id, className: "director-hchart-row" },
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
                h(
                  "span",
                  { className: "director-kpi-badge director-kpi-badge--purple" },
                  resumen?.personal?.disponible ? `${rolesEnUso} Roles` : "Sin datos"
                )
              ),
              h(
                "div",
                { className: "director-kpi-value" },
                resumen?.personal?.disponible ? `${resumen.personal.totalUsuarios}` : "—"
              ),
              h(
                "div",
                { className: "director-kpi-footer" },
                resumen?.personal?.disponible
                  ? h("span", null, `${resumen.personal.activos} usuarios activos`)
                  : h("span", null, "Datos de personal no disponibles")
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
                h("div", { className: "director-kpi-value" }, resumen?.serverPañol?.disponible ? `${resumen.serverPañol.totalItems} ítems` : "—"),
                h(
                  "div",
                  { className: "director-kpi-footer" },
                  resumen?.serverPañol?.disponible
                    ? [
                        h("span", { key: "sol", className: "text-amber-700 font-medium" }, `${resumen.serverPañol.solicitudesPendientes} solicitudes pend.`),
                        h("span", { key: "sep" }, `·`),
                        h("span", { key: "stock", className: "text-rose-600 font-medium" }, `${resumen.serverPañol.sinStock} sin stock`)
                      ]
                    : h("span", null, "Datos de Server no disponibles")
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
              badge: `${personal.length} ${personal.length === 1 ? "miembro" : "miembros"}`,
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

            h(PersonalView, {
              personal,
              areas,
              error: errorPersonal,
              onReintentar: cargarDatos,
              onEditarRoles: (persona) => setUsuarioEditandoRoles(persona),
              onCambiarEstado: handleToggleEstado,
              onCrearPerfil: () => setModalNuevoAbierto(true)
            })
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
                    h(
                      "strong",
                      { className: "director-metric-mini__val" },
                      resumen?.alumnos?.disponible ? `${resumen.alumnos.totalActivos}` : "—"
                    )
                  ),
                  h(
                    "div",
                    { className: "director-metric-mini" },
                    h("span", { className: "director-metric-mini__label" }, "Cursos Totales"),
                    h(
                      "strong",
                      { className: "director-metric-mini__val" },
                      resumen?.alumnos?.disponible ? `${resumen.alumnos.divisiones} Divisiones` : "—"
                    )
                  ),
                  h(
                    "div",
                    { className: "director-metric-mini" },
                    h("span", { className: "director-metric-mini__label" }, "Alumnos en Riesgo"),
                    h(
                      "strong",
                      { className: "director-metric-mini__val text-rose-600" },
                      resumen?.alumnos?.disponible ? `${resumen.alumnos.alumnosEnRiesgo} casos` : "—"
                    )
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
                    h("span", { className: "director-metric-mini__label" }, "Inasistencias Registradas"),
                    h(
                      "strong",
                      { className: "director-metric-mini__val" },
                      asistencias.disponible ? `${asistencias.total}` : "—"
                    )
                  ),
                  h(
                    "div",
                    { className: "director-metric-mini" },
                    h("span", { className: "director-metric-mini__label" }, "Preceptores Activos"),
                    h("strong", { className: "director-metric-mini__val" }, `${preceptoresActivos}`),
                  ),
                  h(
                    "div",
                    { className: "director-metric-mini" },
                    h("span", { className: "director-metric-mini__label" }, "Inasistencias Sin Justificar"),
                    h(
                      "strong",
                      { className: "director-metric-mini__val text-amber-600" },
                      asistencias.disponible ? `${asistencias.sinJustificar} en seguimiento` : "—"
                    )
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
                      h(
                        "strong",
                        { className: "director-metric-mini__val" },
                        resumen?.serverPañol?.disponible ? `${resumen.serverPañol.totalItems}` : "—"
                      )
                    ),
                    h(
                      "div",
                      { className: "director-metric-mini" },
                      h("span", { className: "director-metric-mini__label" }, "Sin Stock"),
                      h(
                        "strong",
                        { className: "director-metric-mini__val text-rose-600" },
                        resumen?.serverPañol?.disponible ? `${resumen.serverPañol.sinStock} ítems` : "—"
                      )
                    ),
                    h(
                      "div",
                      { className: "director-metric-mini" },
                      h("span", { className: "director-metric-mini__label" }, "Solicitudes de Taller"),
                      h(
                        "strong",
                        { className: "director-metric-mini__val text-blue-600" },
                        resumen?.serverPañol?.disponible ? `${resumen.serverPañol.solicitudesPendientes} pendientes` : "—"
                      )
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
      // =========================================================================
      // PESTAÑA: INFORMES DE DIRECCIÓN
      // =========================================================================
      !cargando && pestanaActiva === "informes"
        ? h(InformesView, { institucion, onAviso: mostrarToast })
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
              badge: alertasTotales > 0 ? `${alertasTotales} activas` : "Sin alertas",
              className: "dashboard-card--highlight",
              collapsible: false
            },
            alertasTotales === 0
              ? h(
                  "p",
                  { className: "director-alerts-vacio" },
                  "No hay alertas registradas en los módulos de la institución."
                )
              : h(
                  "div",
                  { className: "director-alerts-list" },
                  alertas.map((alerta) =>
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
                      alerta.link
                        ? h("a", { href: alerta.link, className: "director-alert-link" }, "Ver detalle de la situación")
                        : null
                    )
                  )
                )
          )
        )
        : null,
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

