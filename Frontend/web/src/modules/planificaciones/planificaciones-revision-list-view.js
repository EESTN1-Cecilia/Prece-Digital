/* Bandeja de revision de Jefatura (#/planificaciones/revision).

   Usa el listado existente y agrega los criterios propios de revision:
   estados prioritarios, fechas de presentacion y fechas de revision. */

import { useEffect, useMemo, useRef, useState } from "react";
import { h, IconoFigma } from "../../layouts/site-layout.js";
import { Alerta, Boton, BotonEnlace, Busqueda, Campo, MensajeError, SinDatos, SinResultados } from "../../components/ui/index.js";
import { PlanificacionesService } from "./planificaciones-service.js";
import {
  ESTADOS_REVISION_PRIORITARIOS,
  FILTROS_VACIOS,
  ORDEN_INICIAL,
  aplicarFiltro,
  consultaListado,
  guardarCriterios,
  hayCriterios,
  leerCriterios,
  nombreDeEstado,
  opcionesDeCatalogo,
  opcionesDeEstados,
  opcionesDeFiltros,
  priorizarRevision
} from "./planificaciones-helpers.js";
import { useCatalogosPlanificaciones, useConsulta } from "./use-planificaciones.js";
import { FiltrosActivos, FiltrosPlanificaciones } from "./components/filtros-planificaciones.js";
import { NavegacionPlanificaciones } from "./components/navegacion-planificaciones.js";
import { TablaPlanificaciones } from "./components/tabla-planificaciones.js";

const CLAVE_CRITERIOS = "prece.planificaciones.revision";
const ESPERA_BUSQUEDA = 350;
const TAMANOS_PAGINA = [10, 20, 50];
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

function FiltrosFechas({ filtros, onCambiar }) {
  return h(
    "div",
    { className: "planif-fechas" },
    h(Campo, {
      id: "revision-fecha-presentacion-desde",
      etiqueta: "Presentación desde",
      tipo: "date",
      valor: filtros.fechaPresentacionDesde ?? "",
      onChange: (valor) => onCambiar("fechaPresentacionDesde", valor)
    }),
    h(Campo, {
      id: "revision-fecha-presentacion-hasta",
      etiqueta: "Presentación hasta",
      tipo: "date",
      valor: filtros.fechaPresentacionHasta ?? "",
      onChange: (valor) => onCambiar("fechaPresentacionHasta", valor)
    }),
    h(Campo, {
      id: "revision-fecha-revision-desde",
      etiqueta: "Revisión desde",
      tipo: "date",
      valor: filtros.fechaRevisionDesde ?? "",
      onChange: (valor) => onCambiar("fechaRevisionDesde", valor)
    }),
    h(Campo, {
      id: "revision-fecha-revision-hasta",
      etiqueta: "Revisión hasta",
      tipo: "date",
      valor: filtros.fechaRevisionHasta ?? "",
      onChange: (valor) => onCambiar("fechaRevisionHasta", valor)
    })
  );
}

export default function PlanificacionesRevisionListView() {
  const guardados = useMemo(() => leerCriterios(CLAVE_CRITERIOS) ?? {}, []);

  const [texto, setTexto] = useState(guardados.busqueda ?? "");
  const [busqueda, setBusqueda] = useState(guardados.busqueda ?? "");
  const [filtros, setFiltros] = useState({ ...FILTROS_VACIOS, ...(guardados.filtros ?? {}) });
  const [orden, setOrden] = useState(guardados.orden ?? ORDEN_INICIAL);
  const [porPagina, setPorPagina] = useState(guardados.porPagina ?? 20);
  const [pagina, setPagina] = useState(guardados.pagina ?? 1);

  const { catalogos, combinaciones, error: errorCatalogos, recargar: recargarCatalogos } = useCatalogosPlanificaciones();

  useEffect(() => {
    const temporizador = setTimeout(() => setBusqueda(texto), ESPERA_BUSQUEDA);
    return () => clearTimeout(temporizador);
  }, [texto]);

  const primerRender = useRef(true);

  useEffect(() => {
    if (primerRender.current) {
      primerRender.current = false;
      return;
    }

    setPagina(1);
  }, [busqueda, filtros, orden, porPagina]);

  useEffect(() => {
    guardarCriterios(CLAVE_CRITERIOS, { busqueda, filtros, orden, porPagina, pagina });
  }, [busqueda, filtros, orden, porPagina, pagina]);

  const { datos: resultado, cargando, error, recargar } = useConsulta(
    () => PlanificacionesService.listar(consultaListado({ busqueda, filtros, pagina, porPagina, orden })),
    [busqueda, filtros, pagina, porPagina, orden]
  );

  useEffect(() => {
    const totalPaginas = resultado?.paginacion?.totalPaginas ?? 0;

    if (totalPaginas > 0 && pagina > totalPaginas) {
      setPagina(totalPaginas);
    }
  }, [resultado, pagina]);

  const opciones = useMemo(() => {
    const deCombinaciones = opcionesDeFiltros(combinaciones, filtros);

    return {
      ...deCombinaciones,
      anioLectivo: deCombinaciones.aniosLectivos,
      docenteId: deCombinaciones.docentes,
      materiaId: deCombinaciones.materias,
      cursoId: deCombinaciones.cursos,
      divisionId: deCombinaciones.divisiones,
      anio: opcionesDeCatalogo(catalogos?.aniosCurso),
      turno: opcionesDeCatalogo(catalogos?.turnos),
      periodo: opcionesDeCatalogo(catalogos?.periodos),
      estado: opcionesDeEstados(catalogos)
    };
  }, [combinaciones, catalogos, filtros]);

  const cambiarFiltro = (campo, valor) => setFiltros((actuales) => aplicarFiltro(actuales, campo, valor, combinaciones));
  const quitarFiltro = (campo) => cambiarFiltro(campo, "");

  const limpiarBusqueda = () => {
    setTexto("");
    setBusqueda("");
  };

  const limpiarTodo = () => {
    limpiarBusqueda();
    setFiltros(FILTROS_VACIOS);
  };

  const filas = useMemo(() => priorizarRevision(resultado?.data ?? []), [resultado]);
  const conCriterios = hayCriterios(busqueda, filtros);
  const paginacion = resultado?.paginacion;

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
        "Revisión de contenidos"
      ),
      h(BotonEnlace, { variante: "contorno", href: "#/planificaciones" }, "Volver al listado")
    ),
    h(NavegacionPlanificaciones, { activa: "revision" }),
    h(
      Alerta,
      { tono: "info", titulo: "Bandeja de Jefatura" },
      `Se priorizan ${ESTADOS_REVISION_PRIORITARIOS.map(nombreDeEstado).join(", ")}. La comparación con diseño curricular queda pendiente para una etapa posterior.`
    ),
    errorCatalogos ? h(MensajeError, { error: errorCatalogos, onReintentar: recargarCatalogos }) : null,
    h(
      "div",
      { className: "planif-barra", role: "search" },
      h(Busqueda, {
        id: "buscar-planificaciones-revision",
        valor: texto,
        onChange: setTexto,
        onLimpiar: limpiarBusqueda,
        etiqueta: "Buscar por docente, materia, curso, división o ID",
        placeholder: "Buscar por docente, materia, curso, división o ID"
      })
    ),
    h(FiltrosPlanificaciones, { campos: CAMPOS_FILTRO, filtros, opciones, onCambiar: cambiarFiltro, idPrefijo: "revision" }),
    h(FiltrosFechas, { filtros, onCambiar: cambiarFiltro }),
    h(FiltrosActivos, {
      filtros,
      opciones,
      busqueda,
      onQuitar: quitarFiltro,
      onQuitarBusqueda: limpiarBusqueda,
      onLimpiar: limpiarTodo
    }),
    h(TablaPlanificaciones, {
      titulo: "Planificaciones para revisión",
      columnas: COLUMNAS_REVISION,
      filas,
      cargando,
      error,
      onReintentar: recargar,
      orden,
      onOrden: (proximo) => setOrden(proximo?.columna ? proximo : ORDEN_INICIAL),
      vacio: conCriterios
        ? h(SinResultados, {
            texto: "Ninguna planificación coincide con la búsqueda y los filtros aplicados.",
            descripcion: "Probá con otros criterios o limpiá los filtros.",
            accion: h(Boton, { variante: "contorno", onClick: limpiarTodo }, "Limpiar filtros")
          })
        : h(SinDatos, {
            titulo: "No hay planificaciones para revisar.",
            descripcion: "Cuando los docentes presenten contenidos, van a aparecer en esta bandeja."
          }),
      paginacion: paginacion
        ? {
            pagina: paginacion.pagina,
            paginas: Math.max(1, paginacion.totalPaginas),
            total: paginacion.total,
            etiquetaTotal: paginacion.total === 1 ? "planificación" : "planificaciones",
            onPagina: setPagina
          }
        : undefined
    }),
    paginacion && paginacion.total > 0
      ? h(
          "div",
          { className: "planif-por-pagina" },
          h(
            "label",
            { htmlFor: "planif-revision-por-pagina" },
            "Por página ",
            h(
              "select",
              {
                id: "planif-revision-por-pagina",
                value: porPagina,
                onChange: (evento) => setPorPagina(Number(evento.target.value))
              },
              TAMANOS_PAGINA.map((tamano) => h("option", { key: tamano, value: tamano }, String(tamano)))
            )
          )
        )
      : null
  );
}
