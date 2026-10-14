/* Bandeja de revision de Jefatura (#/planificaciones/revision).

   Mismo listado que #/planificaciones (useListadoPlanificaciones) con los
   criterios propios de revision:
   - Solo lo que ya se presento: sin un estado elegido, se piden los
     `catalogos.estadosBandejaRevision` (todos menos borrador).
   - Orden por defecto `revision` del backend: pendientes primero
     (`catalogos.prioridadRevision`) en todas las paginas, no solo en la
     visible. Ordenar por una columna lo reemplaza; la tercera vuelta vuelve
     a la prioridad.
   - Filtros por fecha de presentacion y de revision (el backend valida el
     rango). */

import { useMemo } from "react";
import { h, IconoFigma } from "../../layouts/site-layout.js";
import { Alerta, Boton, Busqueda, Campo, MensajeError, SinDatos, SinResultados } from "../../components/ui/index.js";
import { ORDEN_REVISION, rangosInvalidos, sinRangosInvalidos } from "./planificaciones-helpers.js";
import { useListadoPlanificaciones } from "./use-planificaciones.js";
import { FiltrosActivos, FiltrosPlanificaciones } from "./components/filtros-planificaciones.js";
import { NavegacionPlanificaciones } from "./components/navegacion-planificaciones.js";
import { TablaPlanificaciones } from "./components/tabla-planificaciones.js";
import { PorPagina } from "./components/por-pagina.js";

const CLAVE_CRITERIOS = "prece.planificaciones.revision";
const COLUMNAS_REVISION = [
  "id",
  "docente",
  "materia",
  "curso",
  "division",
  "periodo",
  "estado",
  "fechaPresentacion",
  "fechaRevision",
  "cantidadObservaciones"
];
const CAMPOS_FILTRO = ["anioLectivo", "docenteId", "materiaId", "anio", "turno", "cursoId", "divisionId", "periodo", "estado"];

const FECHAS = [
  { campo: "fechaPresentacionDesde", etiqueta: "Presentación desde" },
  { campo: "fechaPresentacionHasta", etiqueta: "Presentación hasta" },
  { campo: "fechaRevisionDesde", etiqueta: "Revisión desde" },
  { campo: "fechaRevisionHasta", etiqueta: "Revisión hasta" }
];

function FiltrosFechas({ filtros, onCambiar }) {
  return h(
    "div",
    { className: "planif-fechas" },
    FECHAS.map(({ campo, etiqueta }) =>
      h(Campo, {
        key: campo,
        id: `revision-${campo}`,
        etiqueta,
        tipo: "date",
        valor: filtros[campo] ?? "",
        onChange: (valor) => onCambiar(campo, valor)
      })
    )
  );
}

/* Sin estado elegido, la bandeja excluye borradores. Un rango de fechas
   invertido no se envia (se avisa en pantalla). */
function ajustarConsulta(consulta, catalogos) {
  const limpia = sinRangosInvalidos(consulta);

  if (limpia.estado || !catalogos?.estadosBandejaRevision?.length) {
    return limpia;
  }

  return { ...limpia, estados: catalogos.estadosBandejaRevision.join(",") };
}

export default function PlanificacionesRevisionListView() {
  const listado = useListadoPlanificaciones({
    claveCriterios: CLAVE_CRITERIOS,
    ordenInicial: ORDEN_REVISION,
    ajustarConsulta,
    /* Sin el catalogo no se sabe que estados excluir: se espera para no
       mostrar por un instante los borradores. */
    esperarCatalogos: true
  });
  const { resultado, catalogos } = listado;
  const paginacion = resultado?.paginacion;

  /* El filtro de estado solo ofrece los estados revisables. */
  const opciones = useMemo(() => {
    const revisables = catalogos?.estadosBandejaRevision;
    return revisables
      ? { ...listado.opciones, estado: listado.opciones.estado.filter((opcion) => revisables.includes(opcion.id)) }
      : listado.opciones;
  }, [listado.opciones, catalogos]);

  return h(
    "section",
    { className: "data-panel planif", "aria-labelledby": "revision-planificaciones-titulo" },
    h(
      "div",
      { className: "data-panel__top" },
      h(
        "h1",
        { id: "revision-planificaciones-titulo" },
        h(IconoFigma, { className: "people-icon", nombre: "clipboard" }),
        "Revisión de planificaciones"
      )
    ),
    h(NavegacionPlanificaciones, { activa: "revision" }),
    h("p", { className: "data-nota" }, "Primero se muestran las planificaciones pendientes de revisión: presentadas, corregidas, en revisión y observadas."),
    listado.errorCatalogos ? h(MensajeError, { error: listado.errorCatalogos, onReintentar: listado.recargarCatalogos }) : null,
    h(
      "div",
      { className: "planif-barra", role: "search" },
      h(Busqueda, {
        id: "buscar-planificaciones-revision",
        valor: listado.texto,
        onChange: listado.setTexto,
        onLimpiar: listado.limpiarBusqueda,
        etiqueta: "Buscar por docente, materia, curso, división o ID",
        placeholder: "Buscar por docente, materia, curso, división o ID"
      })
    ),
    h(FiltrosPlanificaciones, { campos: CAMPOS_FILTRO, filtros: listado.filtros, opciones, onCambiar: listado.cambiarFiltro, idPrefijo: "revision" }),
    h(FiltrosFechas, { filtros: listado.filtros, onCambiar: listado.cambiarFiltro }),
    rangosInvalidos(listado.filtros).map((rango) =>
      h(
        Alerta,
        { key: rango.nombre, tono: "advertencia" },
        `La fecha de ${rango.nombre} "hasta" es anterior a la fecha "desde": ese rango no se aplica.`
      )
    ),
    h(FiltrosActivos, {
      filtros: listado.filtros,
      opciones,
      busqueda: listado.busqueda,
      onQuitar: listado.quitarFiltro,
      onQuitarBusqueda: listado.limpiarBusqueda,
      onLimpiar: listado.limpiarTodo
    }),
    h(TablaPlanificaciones, {
      titulo: "Planificaciones para revisión",
      columnas: COLUMNAS_REVISION,
      filas: resultado?.data ?? [],
      cargando: listado.cargando,
      error: listado.error,
      onReintentar: listado.recargar,
      orden: listado.orden,
      onOrden: listado.cambiarOrden,
      vacio: listado.conCriterios
        ? h(SinResultados, {
            texto: "Ninguna planificación coincide con la búsqueda y los filtros aplicados.",
            descripcion: "Probá con otros criterios o limpiá los filtros.",
            accion: h(Boton, { variante: "contorno", onClick: listado.limpiarTodo }, "Limpiar filtros")
          })
        : h(SinDatos, {
            titulo: "No hay planificaciones para revisar.",
            descripcion: "Cuando los docentes presenten sus planificaciones, van a aparecer en esta bandeja."
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
      ? h(PorPagina, { id: "planif-revision-por-pagina", valor: listado.porPagina, onCambiar: listado.setPorPagina })
      : null
  );
}
