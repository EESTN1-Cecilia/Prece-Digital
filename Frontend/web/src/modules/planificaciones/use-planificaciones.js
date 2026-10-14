/* Hooks del modulo de planificaciones.

   Concentran la carga de catalogos y consultas para que cada pantalla no
   repita el patron cargando/error/reintento ni descarte mal una respuesta
   que llega tarde (la bandera `vigente` ignora pedidos ya reemplazados). */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

/* Catalogo (estados, secciones, turnos, periodos) + combinaciones planificables.
   `incluirInactivas` suma asignaciones dadas de baja: sirve para filtrar y
   consultar planificaciones historicas, no para cargar nuevas. */
export function useCatalogosPlanificaciones({ incluirInactivas = true } = {}) {
  const [estado, setEstado] = useState({ catalogos: null, combinaciones: [], cargando: true, error: null });
  const [recarga, setRecarga] = useState(0);

  useEffect(() => {
    let vigente = true;
    setEstado((actual) => ({ ...actual, cargando: true, error: null }));

    Promise.all([
      PlanificacionesService.obtenerCatalogos(),
      PlanificacionesService.obtenerOpciones(incluirInactivas ? { incluirInactivas: "true" } : {})
    ])
      .then(([catalogos, opciones]) => {
        if (vigente) {
          setEstado({ catalogos, combinaciones: opciones?.combinaciones ?? [], cargando: false, error: null });
        }
      })
      .catch((fallo) => {
        if (vigente) {
          setEstado({ catalogos: null, combinaciones: [], cargando: false, error: fallo });
        }
      });

    return () => {
      vigente = false;
    };
  }, [incluirInactivas, recarga]);

  const recargar = useCallback(() => setRecarga((valor) => valor + 1), []);

  return { ...estado, recargar };
}

/* Consulta generica: vuelve a pedir cuando cambian las dependencias y expone
   `recargar` para despues de una operacion. Sin `habilitada` no pide nada
   (por ejemplo, mientras no se eligio un docente). */
export function useConsulta(cargar, dependencias, { habilitada = true } = {}) {
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(habilitada);
  const [error, setError] = useState(null);
  const [recarga, setRecarga] = useState(0);

  useEffect(() => {
    if (!habilitada) {
      setDatos(null);
      setCargando(false);
      setError(null);
      return undefined;
    }

    let vigente = true;
    setCargando(true);

    cargar()
      .then((respuesta) => {
        if (vigente) {
          setDatos(respuesta);
          setError(null);
        }
      })
      .catch((fallo) => {
        if (vigente) {
          /* No se dejan en pantalla datos de una consulta anterior. */
          setDatos(null);
          setError(fallo);
        }
      })
      .finally(() => {
        if (vigente) {
          setCargando(false);
        }
      });

    return () => {
      vigente = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...dependencias, habilitada, recarga]);

  const recargar = useCallback(() => setRecarga((valor) => valor + 1), []);

  return { datos, cargando, error, recargar };
}

const ESPERA_BUSQUEDA = 350;

/* Estado completo de un listado paginado de planificaciones: busqueda con
   debounce, filtros, orden, paginacion, criterios guardados en sessionStorage
   y opciones de los filtros. Lo comparten el listado general y la bandeja de
   revision, que solo cambian la clave de guardado, el orden inicial y
   `ajustarConsulta` (por ejemplo, para excluir borradores).

   Cambiar un criterio vuelve a la pagina 1; paginar conserva todo. */
export function useListadoPlanificaciones({ claveCriterios, ordenInicial = ORDEN_INICIAL, ajustarConsulta, esperarCatalogos = false } = {}) {
  const guardados = useMemo(() => leerCriterios(claveCriterios) ?? {}, [claveCriterios]);

  const [texto, setTexto] = useState(guardados.busqueda ?? "");
  const [busqueda, setBusqueda] = useState(guardados.busqueda ?? "");
  const [filtros, setFiltros] = useState({ ...FILTROS_VACIOS, ...(guardados.filtros ?? {}) });
  const [orden, setOrden] = useState(guardados.orden ?? ordenInicial);
  const [porPagina, setPorPagina] = useState(guardados.porPagina ?? 20);
  const [pagina, setPagina] = useState(guardados.pagina ?? 1);

  const catalogo = useCatalogosPlanificaciones();
  const { catalogos, combinaciones } = catalogo;

  /* Debounce: la API se consulta cuando el tipeo se detiene. */
  useEffect(() => {
    const temporizador = setTimeout(() => setBusqueda(texto), ESPERA_BUSQUEDA);
    return () => clearTimeout(temporizador);
  }, [texto]);

  /* Se saltea el primer render para respetar la pagina restaurada. */
  const primerRender = useRef(true);

  useEffect(() => {
    if (primerRender.current) {
      primerRender.current = false;
      return;
    }

    setPagina(1);
  }, [busqueda, filtros, orden, porPagina]);

  useEffect(() => {
    guardarCriterios(claveCriterios, { busqueda, filtros, orden, porPagina, pagina });
  }, [claveCriterios, busqueda, filtros, orden, porPagina, pagina]);

  const consulta = useMemo(() => {
    const base = consultaListado({ busqueda, filtros, pagina, porPagina, orden });
    return ajustarConsulta ? ajustarConsulta(base, catalogos) : base;
  }, [busqueda, filtros, pagina, porPagina, orden, ajustarConsulta, catalogos]);

  const { datos: resultado, cargando, error, recargar } = useConsulta(
    () => PlanificacionesService.listar(consulta),
    [JSON.stringify(consulta)],
    { habilitada: !esperarCatalogos || Boolean(catalogos) }
  );

  /* Si la pagina guardada ya no existe, volver a la ultima disponible. */
  useEffect(() => {
    const totalPaginas = resultado?.paginacion?.totalPaginas ?? 0;

    if (totalPaginas > 0 && pagina > totalPaginas) {
      setPagina(totalPaginas);
    }
  }, [resultado, pagina]);

  const opciones = useMemo(() => {
    const deCombinaciones = opcionesDeFiltros(combinaciones, filtros);

    return {
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

  const cambiarFiltro = useCallback(
    (campo, valor) => setFiltros((actuales) => aplicarFiltro(actuales, campo, valor, combinaciones)),
    [combinaciones]
  );

  const limpiarBusqueda = useCallback(() => {
    setTexto("");
    setBusqueda("");
  }, []);

  const limpiarTodo = useCallback(() => {
    setTexto("");
    setBusqueda("");
    setFiltros(FILTROS_VACIOS);
  }, []);

  return {
    texto,
    setTexto,
    busqueda,
    filtros,
    cambiarFiltro,
    quitarFiltro: (campo) => cambiarFiltro(campo, ""),
    limpiarBusqueda,
    limpiarTodo,
    conCriterios: hayCriterios(busqueda, filtros),
    orden,
    /* La tercera vuelta del encabezado quita el orden: se vuelve al inicial. */
    cambiarOrden: (proximo) => setOrden(proximo?.columna ? proximo : ordenInicial),
    porPagina,
    setPorPagina,
    setPagina,
    opciones,
    catalogos,
    errorCatalogos: catalogo.error,
    recargarCatalogos: catalogo.recargar,
    resultado,
    /* Mientras se espera el catalogo, la tabla muestra la carga. */
    cargando: cargando || (esperarCatalogos && catalogo.cargando),
    error,
    recargar
  };
}
