import React, { useState, useEffect, useCallback, useMemo, Fragment } from "react";
import { h, IconoFigma } from "../../layouts/site-layout.js";
import { DashboardCard } from "../../components/dashboard/dashboard-card.js";
import { LoadingState, EmptyState, ErrorState } from "../../components/common/state-handlers.js";
import { useUsuarioActual } from "../../estado/index.js";
import { ServerService } from "./server-service.js";
import { StockSummary } from "./components/stock-summary.js";
import { QuickActions } from "./components/quick-actions.js";
import { DashboardFilters } from "./components/dashboard-filters.js";
import { MaterialSummary } from "./components/material-summary.js";
import { PendingRequests } from "./components/pending-requests.js";
import { ReservationsSummary } from "./components/reservations-summary.js";
import { RecentMovements } from "./components/recent-movements.js";
import {
  MaterialDetalleModal,
  CargarMaterialModal,
  RegistrarMovimientoModal,
  GestionarSolicitudModal
} from "./components/server-modals.js";

export default function ServerDashboardView() {
  const user = useUsuarioActual();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Estados de Filtros
  const [busqueda, setBusqueda] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("todas");
  const [filtroStock, setFiltroStock] = useState("todos");

  // Estados de Modales
  const [materialSeleccionado, setMaterialSeleccionado] = useState(null);
  const [modalDetalleAbierto, setModalDetalleAbierto] = useState(false);
  const [modalNuevoMaterialAbierto, setModalNuevoMaterialAbierto] = useState(false);
  const [materialParaMovimiento, setMaterialParaMovimiento] = useState(null);
  const [modalMovimientoAbierto, setModalMovimientoAbierto] = useState(false);
  const [solicitudSeleccionada, setSolicitudSeleccionada] = useState(null);
  const [modalSolicitudAbierto, setModalSolicitudAbierto] = useState(false);

  // Consulta de datos de la API
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await ServerService.getDashboardData();
      setData(result);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err.message || "Error al consultar los datos del sector Server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAprobarReserva = async (reservaId) => {
    await ServerService.approveReservation(reservaId);
    fetchData();
  };

  const handleRechazarReserva = async (reservaId) => {
    await ServerService.rejectReservation(reservaId);
    fetchData();
  };

  const handleCancelarReserva = async (reservaId) => {
    await ServerService.cancelReservation(reservaId);
    fetchData();
  };

  const handleVerDetalleMaterial = (material) => {
    setMaterialSeleccionado(material);
    setModalDetalleAbierto(true);
  };

  const handleAbrirMovimiento = (material = null) => {
    setMaterialParaMovimiento(material || (data?.materiales ? data.materiales[0] : null));
    setModalMovimientoAbierto(true);
  };

  const handleGestionarSolicitud = (solicitud) => {
    setSolicitudSeleccionada(solicitud);
    setModalSolicitudAbierto(true);
  };

  const handleLimpiarFiltros = () => {
    setBusqueda("");
    setFiltroCategoria("todas");
    setFiltroStock("todos");
  };

  // Formato de fechas
  const formatFechaHora = (date) => {
    if (!date) return "";
    return new Intl.DateTimeFormat("es-AR", {
      dateStyle: "short",
      timeStyle: "medium"
    }).format(new Date(date));
  };

  const formatFechaBanner = (date) => {
    const d = date ? new Date(date) : new Date();
    const options = { weekday: "long", day: "numeric", month: "long", year: "numeric" };
    const raw = new Intl.DateTimeFormat("es-AR", options).format(d);
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  };

  // Filtrado reactivo de materiales
  const materialesFiltrados = useMemo(() => {
    if (!data?.materiales) return [];

    return data.materiales.filter((item) => {
      // Filtro por texto
      const textoBuscado = busqueda.toLowerCase().trim();
      const coincideTexto =
        !textoBuscado ||
        item.name.toLowerCase().includes(textoBuscado) ||
        (item.code && item.code.toLowerCase().includes(textoBuscado)) ||
        (item.brand && item.brand.toLowerCase().includes(textoBuscado)) ||
        (item.location && item.location.toLowerCase().includes(textoBuscado)) ||
        (item.category && item.category.toLowerCase().includes(textoBuscado));

      // Filtro por categoría
      const coincideCategoria =
        filtroCategoria === "todas" ||
        (item.category && item.category.toLowerCase() === filtroCategoria.toLowerCase());

      // Filtro por estado de stock
      let coincideStock = true;
      if (filtroStock === "agotado") {
        coincideStock = item.quantity === 0;
      } else if (filtroStock === "bajo") {
        coincideStock = item.quantity > 0 && item.quantity <= item.minQuantity;
      } else if (filtroStock === "disponible") {
        coincideStock = item.quantity > item.minQuantity && item.status !== "en_uso";
      } else if (filtroStock === "en_uso") {
        coincideStock = item.status === "en_uso";
      }

      return coincideTexto && coincideCategoria && coincideStock;
    });
  }, [data?.materiales, busqueda, filtroCategoria, filtroStock]);

  return h(
    "section",
    { className: "secretaria-dashboard server-dashboard" },

    // 1. Barra superior: Eyebrow institucional
    h(
      "div",
      { className: "secretaria-top-bar" },
      h(
        "div",
        { className: "secretaria-eyebrow" },
        `${data?.institucion?.nombre || user.escuela || "E.E.S.T N° 1 MONTE GRANDE"} • ${data?.institucion?.sector || "MÓDULO SERVER / RECURSOS"}`
      )
    ),

    // 2. Fila de Título y Botón "Actualizar datos"
    h(
      "div",
      { className: "secretaria-title-row" },
      h(
        "div",
        null,
        h("h1", { className: "secretaria-title" }, "Tablero de Server"),
        lastUpdated
          ? h("p", { className: "secretaria-last-updated" }, `Última actualización: ${formatFechaHora(lastUpdated)}`)
          : h("p", { className: "secretaria-last-updated" }, "Centro de consulta y control de stock, materiales, reservas y movimientos")
      ),
      h(
        "div",
        { className: "secretaria-title-actions" },
        h(
          "button",
          {
            type: "button",
            className: "btn-actualizar-datos",
            onClick: fetchData
          },
          h(IconoFigma, { className: "btn-actualizar-icon", nombre: "filter" }),
          h("span", null, loading ? "Actualizando..." : "Actualizar datos")
        )
      )
    ),

    // Estado de Carga inicial
    loading && !data ? h(LoadingState, { mensaje: "Consultando inventario y recursos del servidor..." }) : null,

    // Estado de Error inicial
    error && !data ? h(ErrorState, { mensaje: error, onRetry: fetchData }) : null,

    // Contenido del Dashboard cuando hay datos
    data
      ? h(
          Fragment,
          null,

          // 3. Hero Banner Principal con Fecha y Escudo Institucional
          h(
            "div",
            { className: "dashboard-hero-banner" },
            h(
              "div",
              { className: "dashboard-hero-banner__left" },
              h("h2", { className: "dashboard-hero-banner__date" }, formatFechaBanner(new Date())),
              h(
                "p",
                { className: "dashboard-hero-banner__text" },
                "Control centralizado de stock disponible, alertas de recursos, solicitudes y movimientos recientes."
              )
            ),
            h(
              "div",
              { className: "dashboard-hero-badge" },
              h(
                "div",
                { className: "school-crest-avatar" },
                h("img", {
                  src: "/assets/tecnica-n1-monte-grande.png",
                  alt: "Escudo E.E.S.T N°1",
                  className: "school-crest-img",
                  onError: (e) => {
                    e.currentTarget.src = "/assets/Técnica_N°1_Monte_Grande.png";
                  }
                })
              ),
              h(
                "div",
                { className: "school-crest-text" },
                h("strong", { className: "school-crest-title" }, "E.E.S.T N°1"),
                h("span", { className: "school-crest-subtitle" }, "Server & Recursos")
              )
            )
          ),

          // 4. Resumen de Stock (4 KPI cards + Distribución por Categoría)
          h(StockSummary, {
            resumen: data.resumenStock,
            filtroActivo: filtroStock,
            onSeleccionarFiltro: (nuevoFiltro) => setFiltroStock(filtroStock === nuevoFiltro ? "todos" : nuevoFiltro),
            onSeleccionarCategoria: (cat) => setFiltroCategoria(filtroCategoria === cat ? "todas" : cat)
          }),

          // 5. Accesos Rápidos
          h(
            DashboardCard,
            {
              title: "Accesos Rápidos del Módulo Server",
              icon: "filter",
              className: "dashboard-card--highlight"
            },
            h(QuickActions, {
              userPermissions: user.permisos,
              onOpenNuevoMaterial: () => setModalNuevoMaterialAbierto(true),
              onOpenRegistrarMovimiento: () => handleAbrirMovimiento(),
              onVerSolicitudes: () => {
                const el = document.getElementById("seccion-solicitudes");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              },
              onVerReservas: () => {
                const el = document.getElementById("seccion-reservas");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }
            })
          ),

          // 6. Barra de Filtros del Dashboard
          h(DashboardFilters, {
            busqueda,
            onCambioBusqueda: setBusqueda,
            categoriaSeleccionada: filtroCategoria,
            onSeleccionarCategoria: setFiltroCategoria,
            estadoSeleccionado: filtroStock,
            onSeleccionarEstado: setFiltroStock,
            categorias: data.catalogos?.categorias || ["tecnologia", "material", "equipamiento", "herramienta", "mobiliario"],
            onLimpiarFiltros: handleLimpiarFiltros
          }),

          // 7. Tarjeta Completa (Larga) de Resumen de Materiales e Inventario
          h(
            DashboardCard,
            {
              title: "Resumen de Materiales e Inventario",
              icon: "people",
              badge: `${materialesFiltrados.length} Materiales`,
              actions: h(
                "div",
                { className: "server-card-header-actions" },
                h(
                  "a",
                  {
                    href: "#/inventario",
                    className: "btn-card-action-subtle"
                  },
                  "Ver Módulo Inventario →"
                )
              )
            },
            h(MaterialSummary, {
              materiales: materialesFiltrados,
              onVerDetalle: handleVerDetalleMaterial,
              onRegistrarMovimiento: handleAbrirMovimiento
            })
          ),

          // 8. Grilla de 2 Columnas: Movimientos Recientes (izq) y Solicitudes + Reservas + Alertas (der)
          h(
            "div",
            { className: "secretaria-grid-2col server-grid-2col" },

            // Columna Izquierda: Historial de Movimientos Recientes
            h(
              "div",
              { id: "seccion-movimientos", className: "secretaria-grid-column" },
              h(
                DashboardCard,
                {
                  title: "Historial de Movimientos Recientes",
                  icon: "activity",
                  badge: `${data.movimientosRecientes?.length || 0} Eventos`,
                  collapsible: true
                },
                h(RecentMovements, {
                  movimientos: data.movimientosRecientes || [],
                  onVerDetalleMaterial: (item) => {
                    const fullItem = data.materiales?.find((m) => m.id === item.id);
                    handleVerDetalleMaterial(fullItem || item);
                  }
                })
              )
            ),

            // Columna Derecha: Solicitudes + Reservas + Alertas
            h(
              "div",
              { className: "secretaria-grid-column" },

              // 8.1 Tarjeta de Solicitudes Pendientes
              h(
                "div",
                { id: "seccion-solicitudes" },
                h(
                  DashboardCard,
                  {
                    title: "Solicitudes Pendientes de Atención",
                    icon: "clipboard",
                    badge: `${data.contadorPendientes || 0} Pendientes`
                  },
                  h(PendingRequests, {
                    solicitudes: data.solicitudesPendientes || [],
                    onGestionarSolicitud: handleGestionarSolicitud
                  })
                )
              ),

              // 8.2 Tarjeta de Reservas y Préstamos
              h(
                "div",
                { id: "seccion-reservas" },
                h(
                  DashboardCard,
                  {
                    title: "Control de Reservas y Préstamos",
                    icon: "attendance",
                    badge: `${data.reservas?.length || 0} Programadas`
                  },
                  h(ReservationsSummary, {
                    reservas: data.reservas || [],
                    onAprobarReserva: handleAprobarReserva,
                    onRechazarReserva: handleRechazarReserva,
                    onCancelarReserva: handleCancelarReserva
                  })
                )
              )
            )
          )

        )
      : null,

    // Modales interactivos
    h(MaterialDetalleModal, {
      material: materialSeleccionado,
      abierto: modalDetalleAbierto,
      onCerrar: () => {
        setModalDetalleAbierto(false);
        setMaterialSeleccionado(null);
      },
      onRegistrarMovimiento: handleAbrirMovimiento
    }),

    h(CargarMaterialModal, {
      abierto: modalNuevoMaterialAbierto,
      onCerrar: () => setModalNuevoMaterialAbierto(false),
      onGuardadoExitoso: fetchData
    }),

    h(RegistrarMovimientoModal, {
      materialInicial: materialParaMovimiento,
      materiales: data?.materiales || [],
      abierto: modalMovimientoAbierto,
      onCerrar: () => {
        setModalMovimientoAbierto(false);
        setMaterialParaMovimiento(null);
      },
      onMovimientoExitoso: fetchData
    }),

    h(GestionarSolicitudModal, {
      solicitud: solicitudSeleccionada,
      abierto: modalSolicitudAbierto,
      onCerrar: () => {
        setModalSolicitudAbierto(false);
        setSolicitudSeleccionada(null);
      },
      onEstadoActualizado: fetchData
    })
  );
}
