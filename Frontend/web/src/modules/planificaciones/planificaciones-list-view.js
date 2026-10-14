/* Consulta general de planificaciones docentes (#/planificaciones).

   - Busqueda por texto contra la API (ID, docente, materia, curso, division)
     con debounce.
   - Filtros combinables con catalogos de la API, chips para quitarlos de a
     uno y limpieza total.
   - Orden y paginacion del lado del backend. Cambiar cualquier criterio
     vuelve a la pagina 1; paginar conserva busqueda, filtros y orden.
   - Los criterios se guardan en sessionStorage para volver del detalle sin
     perderlos.

   Las acciones de cada fila las define el backend (planificacion.acciones). */

import { useEffect, useMemo, useRef, useState } from "react";
import { h, IconoFigma } from "../../layouts/site-layout.js";
import {
  Acciones,
  Alerta,
  Boton,
  BotonEnlace,
  Busqueda,
  MensajeError,
  SinDatos,
  SinResultados
} from "../../components/ui/index.js";
import { usePermisos } from "../../estado/index.js";
import { PERMISOS } from "../../utils/permisos.js";
import { PlanificacionesService } from "./planificaciones-service.js";
import {
  FILTROS_VACIOS,
  ORDEN_INICIAL,
  aplicarFiltro,
  consultaListado,
  guardarCriterios,
  hayCriterios,
  leerCriterios,
  opcionesDeCatalogo,
  opcionesDeEstados,
  opcionesDeFiltros
} from "./planificaciones-helpers.js";
import { useCatalogosPlanificaciones, useConsulta } from "./use-planificaciones.js";
import { NavegacionPlanificaciones } from "./components/navegacion-planificaciones.js";
import { FiltrosActivos, FiltrosPlanificaciones } from "./components/filtros-planificaciones.js";
import { TablaPlanificaciones } from "./components/tabla-planificaciones.js";
import { PresentarPlanificacion } from "./components/presentar-planificacion.js";

const CLAVE_CRITERIOS = "prece.planificaciones.listado";
const ESPERA_BUSQUEDA = 350;
const TAMANOS_PAGINA = [10, 20, 50];

export default function PlanificacionesListView() {
  const { puede } = usePermisos();
  const puedeCargar = puede(PERMISOS.planificacionesEscribir);

  const guardados = useMemo(() => leerCriterios(CLAVE_CRITERIOS) ?? {}, []);

  const [texto, setTexto] = useState(guardados.busqueda ?? "");
  const [busqueda, setBusqueda] = useState(guardados.busqueda ?? "");
  const [filtros, setFiltros] = useState({ ...FILTROS_VACIOS, ...(guardados.filtros ?? {}) });
  const [orden, setOrden] = useState(guardados.orden ?? ORDEN_INICIAL);
  const [porPagina, setPorPagina] = useState(guardados.porPagina ?? 20);
  const [pagina, setPagina] = useState(guardados.pagina ?? 1);

  const [aviso, setAviso] = useState(null);
  const [aPresentar, setAPresentar] = useState(null);

  const { catalogos, combinaciones, error: errorCatalogos, recargar: recargarCatalogos } = useCatalogosPlanificaciones();

  /* Debounce: la API se consulta cuando el tipeo se detiene. */
  useEffect(() => {
    const temporizador = setTimeout(() => setBusqueda(texto), ESPERA_BUSQUEDA);
    return () => clearTimeout(temporizador);
  }, [texto]);

  /* Cambiar un criterio reinicia la paginacion. Se saltea el primer render
     para respetar la pagina restaurada de sessionStorage. */
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

  /* Si la pagina guardada ya no existe (se borraron resultados), volver a la ultima. */
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

  const conCriterios = hayCriterios(busqueda, filtros);
  const paginacion = resultado?.paginacion;

  const presentada = (planificacion) => {
    setAPresentar(null);
    setAviso({ tono: "exito", texto: `La planificación ${planificacion.id} quedó ${planificacion.estado === "corregida" ? "corregida" : "presentada"} para revisión.` });
    recargar();
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
    errorCatalogos ? h(MensajeError, { error: errorCatalogos, onReintentar: recargarCatalogos }) : null,
    h(
      "div",
      { className: "planif-barra", role: "search" },
      h(Busqueda, {
        id: "buscar-planificaciones",
        valor: texto,
        onChange: setTexto,
        onLimpiar: limpiarBusqueda,
        etiqueta: "Buscar por docente, materia, curso, división o ID",
        placeholder: "Buscar por docente, materia, curso, división o ID"
      })
    ),
    h(FiltrosPlanificaciones, { filtros, opciones, onCambiar: cambiarFiltro, idPrefijo: "listado" }),
    h(FiltrosActivos, {
      filtros,
      opciones,
      busqueda,
      onQuitar: quitarFiltro,
      onQuitarBusqueda: limpiarBusqueda,
      onLimpiar: limpiarTodo
    }),
    aviso ? h(Alerta, { tono: aviso.tono, onCerrar: () => setAviso(null) }, aviso.texto) : null,
    h(TablaPlanificaciones, {
      filas: resultado?.data ?? [],
      cargando,
      error,
      onReintentar: recargar,
      orden,
      onOrden: (proximo) => setOrden(proximo?.columna ? proximo : ORDEN_INICIAL),
      onPresentar: setAPresentar,
      vacio: conCriterios
        ? h(SinResultados, {
            texto: "Ninguna planificación coincide con la búsqueda y los filtros aplicados.",
            descripcion: "Probá con otros criterios o limpiá los filtros.",
            accion: h(Boton, { variante: "contorno", onClick: limpiarTodo }, "Limpiar filtros")
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
            { htmlFor: "planif-por-pagina" },
            "Por página ",
            h(
              "select",
              {
                id: "planif-por-pagina",
                value: porPagina,
                onChange: (evento) => setPorPagina(Number(evento.target.value))
              },
              TAMANOS_PAGINA.map((tamano) => h("option", { key: tamano, value: tamano }, String(tamano)))
            )
          )
        )
      : null,
    h(PresentarPlanificacion, {
      planificacion: aPresentar,
      onCerrar: () => setAPresentar(null),
      onPresentada: presentada
    })
  );
}
