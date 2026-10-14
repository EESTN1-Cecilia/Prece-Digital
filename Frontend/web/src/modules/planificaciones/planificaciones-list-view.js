/* Consulta general de planificaciones docentes (#/planificaciones).

   - Busqueda por texto contra la API (ID, docente, materia, curso, division)
     con debounce.
   - Filtros combinables con catalogos de la API, chips para quitarlos de a
     uno y limpieza total.
   - Orden y paginacion del lado del backend. Cambiar cualquier criterio
     vuelve a la pagina 1; paginar conserva busqueda, filtros y orden.
   - Los criterios se guardan en sessionStorage para volver del detalle sin
     perderlos.

   El estado del listado vive en useListadoPlanificaciones (compartido con la
   bandeja de revision). Las acciones de cada fila las define el backend. */

import { useState } from "react";
import { h, IconoFigma } from "../../layouts/site-layout.js";
import { Acciones, Alerta, Boton, BotonEnlace, Busqueda, MensajeError, SinDatos, SinResultados } from "../../components/ui/index.js";
import { usePermisos } from "../../estado/index.js";
import { PERMISOS } from "../../utils/permisos.js";
import { useListadoPlanificaciones } from "./use-planificaciones.js";
import { NavegacionPlanificaciones } from "./components/navegacion-planificaciones.js";
import { FiltrosActivos, FiltrosPlanificaciones } from "./components/filtros-planificaciones.js";
import { TablaPlanificaciones } from "./components/tabla-planificaciones.js";
import { PresentarPlanificacion } from "./components/presentar-planificacion.js";
import { PorPagina } from "./components/por-pagina.js";

const CLAVE_CRITERIOS = "prece.planificaciones.listado";

export default function PlanificacionesListView() {
  const { puede } = usePermisos();
  const puedeCargar = puede(PERMISOS.planificacionesEscribir);

  const listado = useListadoPlanificaciones({ claveCriterios: CLAVE_CRITERIOS });
  const { resultado } = listado;
  const paginacion = resultado?.paginacion;

  const [aviso, setAviso] = useState(null);
  const [aPresentar, setAPresentar] = useState(null);

  const presentada = (planificacion) => {
    setAPresentar(null);
    setAviso(`La planificación ${planificacion.id} quedó ${planificacion.estado === "corregida" ? "corregida" : "presentada"} para revisión.`);
    listado.recargar();
  };

  return h(
    "section",
    { className: "data-panel planif", "aria-labelledby": "planificaciones-titulo" },
    h(
      "div",
      { className: "data-panel__top" },
      h(
        "h1",
        { id: "planificaciones-titulo" },
        h(IconoFigma, { className: "people-icon", nombre: "clipboard" }),
        "Planificaciones docentes"
      ),
      h(
        Acciones,
        null,
        puedeCargar ? h(BotonEnlace, { variante: "primario", href: "#/planificaciones/nueva" }, "Cargar planificación") : null
      )
    ),
    h(NavegacionPlanificaciones, { activa: "listado" }),
    listado.errorCatalogos ? h(MensajeError, { error: listado.errorCatalogos, onReintentar: listado.recargarCatalogos }) : null,
    h(
      "div",
      { className: "planif-barra", role: "search" },
      h(Busqueda, {
        id: "buscar-planificaciones",
        valor: listado.texto,
        onChange: listado.setTexto,
        onLimpiar: listado.limpiarBusqueda,
        etiqueta: "Buscar por docente, materia, curso, división o ID",
        placeholder: "Buscar por docente, materia, curso, división o ID"
      })
    ),
    h(FiltrosPlanificaciones, { filtros: listado.filtros, opciones: listado.opciones, onCambiar: listado.cambiarFiltro, idPrefijo: "listado" }),
    h(FiltrosActivos, {
      filtros: listado.filtros,
      opciones: listado.opciones,
      busqueda: listado.busqueda,
      onQuitar: listado.quitarFiltro,
      onQuitarBusqueda: listado.limpiarBusqueda,
      onLimpiar: listado.limpiarTodo
    }),
    aviso ? h(Alerta, { tono: "exito", onCerrar: () => setAviso(null) }, aviso) : null,
    h(TablaPlanificaciones, {
      filas: resultado?.data ?? [],
      cargando: listado.cargando,
      error: listado.error,
      onReintentar: listado.recargar,
      orden: listado.orden,
      onOrden: listado.cambiarOrden,
      onPresentar: setAPresentar,
      vacio: listado.conCriterios
        ? h(SinResultados, {
            texto: "Ninguna planificación coincide con la búsqueda y los filtros aplicados.",
            descripcion: "Probá con otros criterios o limpiá los filtros.",
            accion: h(Boton, { variante: "contorno", onClick: listado.limpiarTodo }, "Limpiar filtros")
          })
        : h(SinDatos, {
            titulo: "Todavía no hay planificaciones registradas.",
            descripcion: puedeCargar ? "Cargá la primera para comenzar." : undefined,
            accion: puedeCargar
              ? h(BotonEnlace, { variante: "primario", href: "#/planificaciones/nueva" }, "Cargar planificación")
              : undefined
          }),
      paginacion: paginacion
        ? {
            pagina: paginacion.pagina,
            paginas: Math.max(1, paginacion.totalPaginas),
            total: paginacion.total,
            etiquetaTotal: paginacion.total === 1 ? "planificación" : "planificaciones",
            onPagina: listado.setPagina
          }
        : undefined
    }),
    paginacion && paginacion.total > 0
      ? h(PorPagina, { id: "planif-por-pagina", valor: listado.porPagina, onCambiar: listado.setPorPagina })
      : null,
    h(PresentarPlanificacion, {
      planificacion: aPresentar,
      onCerrar: () => setAPresentar(null),
      onPresentada: presentada
    })
  );
}
