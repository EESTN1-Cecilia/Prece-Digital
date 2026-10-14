/* Cargar (#/planificaciones/nueva) y modificar (#/planificaciones/:id/editar)
   una planificacion docente.

   Datos generales en cascada, cargados desde la API y respetando las
   relaciones existentes (asignaciones de materia del modulo docentes):

       Ciclo lectivo
        └── Curso (año + turno + orientacion)
             └── Division
                  └── Materia
                       └── Docente
                            └── Periodo

   Cambiar un nivel limpia los siguientes; un nivel con una sola opcion se
   completa solo (por ejemplo, el docente cuando carga el propio docente). El
   turno se hereda del curso y se muestra como dato.

   Las secciones de contenido salen del catalogo de la API. La validacion
   definitiva (relaciones, duplicados, permisos, estado editable) la hace el
   backend; sus errores por campo se muestran al lado de cada campo. */

import { useEffect, useMemo, useRef, useState } from "react";
import { h, IconoFigma } from "../../layouts/site-layout.js";
import {
  Acciones,
  Alerta,
  AreaTexto,
  Boton,
  BotonEnlace,
  Campo,
  CargandoPantalla,
  MensajeError,
  Select,
  SinDatos
} from "../../components/ui/index.js";
import { PlanificacionesService } from "./planificaciones-service.js";
import {
  cambiarEnCascada,
  completarUnicos,
  datosParaEnviar,
  formularioDesdePlanificacion,
  nombreDeEstado,
  opcionesDeCatalogo,
  opcionesEnCascada,
  separarErrores,
  validarGenerales
} from "./planificaciones-helpers.js";
import { useCatalogosPlanificaciones, useConsulta } from "./use-planificaciones.js";

const LIMITE_SECCION = 5000;

export default function PlanificacionFormView({ id }) {
  const esAlta = !id;

  const { catalogos, combinaciones, cargando: cargandoCatalogos, error: errorCatalogos, recargar } =
    useCatalogosPlanificaciones({ incluirInactivas: false });
  const { datos: plan, cargando: cargandoPlan, error: errorPlan } = useConsulta(
    () => PlanificacionesService.obtener(id),
    [id],
    { habilitada: !esAlta }
  );

  const [formulario, setFormulario] = useState(() => formularioDesdePlanificacion(null));
  const [errores, setErrores] = useState({ generales: {}, contenido: {} });
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const inicializado = useRef(false);

  const periodos = useMemo(() => opcionesDeCatalogo(catalogos?.periodos), [catalogos]);
  const secciones = catalogos?.secciones ?? [];

  /* Estado inicial: en alta, completar los niveles con opcion unica; en
     edicion, los datos de la planificacion. Se hace una sola vez. */
  useEffect(() => {
    if (inicializado.current || cargandoCatalogos || !catalogos) {
      return;
    }

    if (esAlta) {
      inicializado.current = true;
      setFormulario((actual) => ({ ...actual, generales: completarUnicos(combinaciones, actual.generales, periodos) }));
    } else if (plan) {
      inicializado.current = true;
      setFormulario(formularioDesdePlanificacion(plan));
    }
  }, [esAlta, plan, catalogos, cargandoCatalogos, combinaciones, periodos]);

  const opciones = useMemo(
    () => opcionesEnCascada(combinaciones, formulario.generales, periodos.length ? periodos : undefined),
    [combinaciones, formulario.generales, periodos]
  );

  const cambiarGeneral = (campo) => (valor) => {
    setFormulario((actual) => ({
      ...actual,
      generales: completarUnicos(combinaciones, cambiarEnCascada(actual.generales, campo, valor), periodos)
    }));
    setErrores((actuales) => ({ ...actuales, generales: { ...actuales.generales, [campo]: undefined } }));
  };

  const cambiarSeccion = (seccion) => (valor) => {
    setFormulario((actual) => ({ ...actual, contenido: { ...actual.contenido, [seccion]: valor } }));
    setErrores((actuales) => ({ ...actuales, contenido: { ...actuales.contenido, [seccion]: undefined } }));
  };

  const enviar = async (evento) => {
    evento.preventDefault();

    if (guardando) {
      return;
    }

    setError(null);
    const locales = validarGenerales(formulario.generales);

    if (locales) {
      setErrores({ generales: locales, contenido: {} });
      return;
    }

    setErrores({ generales: {}, contenido: {} });
    setGuardando(true);

    try {
      const datos = datosParaEnviar(formulario, secciones);
      const guardada = esAlta ? await PlanificacionesService.crear(datos) : await PlanificacionesService.actualizar(id, datos);

      window.location.hash = `#/planificaciones/${encodeURIComponent(guardada.id)}?${esAlta ? "creada" : "guardada"}=1`;
    } catch (fallo) {
      if (fallo.campos) {
        setErrores(separarErrores(fallo.campos));
      }

      /* El mensaje general se muestra siempre: un 409 o un 403 no traen campos. */
      setError(fallo);
    } finally {
      setGuardando(false);
    }
  };

  const volver = esAlta ? "#/planificaciones" : `#/planificaciones/${encodeURIComponent(id)}`;
  const titulo = esAlta ? "Cargar planificación" : `Modificar planificación ${id}`;

  const encabezado = h(
    "div",
    { className: "data-panel__top" },
    h("h1", { id: "planif-form-titulo" }, h(IconoFigma, { className: "people-icon", nombre: "clipboard" }), titulo),
    h(BotonEnlace, { variante: "contorno", href: volver }, "Cancelar")
  );

  if (cargandoCatalogos || (!esAlta && cargandoPlan)) {
    return h("section", { className: "data-panel planif" }, h(CargandoPantalla, { texto: "Cargando los datos del formulario..." }));
  }

  if (errorCatalogos || errorPlan) {
    return h(
      "section",
      { className: "data-panel planif" },
      encabezado,
      h(MensajeError, { error: errorCatalogos ?? errorPlan, onReintentar: errorCatalogos ? recargar : undefined })
    );
  }

  if (!esAlta && plan && !(plan.acciones ?? []).includes("editar")) {
    return h(
      "section",
      { className: "data-panel planif" },
      encabezado,
      h(
        Alerta,
        { tono: "advertencia" },
        `La planificación está ${nombreDeEstado(plan.estado).toLowerCase()} y no se puede modificar, o no tenés permiso para hacerlo.`
      )
    );
  }

  if (esAlta && !combinaciones.length) {
    return h(
      "section",
      { className: "data-panel planif" },
      encabezado,
      h(SinDatos, {
        titulo: "No hay materias asignadas para planificar.",
        descripcion: "Las combinaciones de curso, división y materia salen de las asignaciones docentes vigentes."
      })
    );
  }

  const { generales } = formulario;
  const erroresGenerales = errores.generales;

  return h(
    "section",
    { className: "data-panel planif", "aria-labelledby": "planif-form-titulo" },
    encabezado,
    error ? h(MensajeError, { error }) : null,
    h(
      "form",
      { className: "data-formulario", onSubmit: enviar, noValidate: true },
      h(
        "fieldset",
        { className: "planif-form__bloque", disabled: guardando || undefined },
        h("legend", null, "Datos generales"),
        h(
          "div",
          { className: "data-formulario__campos" },
          h(Select, {
            id: "planif-anio-lectivo",
            etiqueta: "Ciclo lectivo",
            requerido: true,
            placeholder: "Elegí el ciclo lectivo",
            valor: generales.anioLectivo,
            opciones: opciones.aniosLectivos,
            error: erroresGenerales.anioLectivo,
            onChange: cambiarGeneral("anioLectivo")
          }),
          h(Select, {
            id: "planif-curso",
            etiqueta: "Curso",
            requerido: true,
            placeholder: generales.anioLectivo ? "Elegí el curso" : "Primero elegí el ciclo lectivo",
            valor: generales.cursoId,
            opciones: opciones.cursos,
            deshabilitado: !opciones.cursos.length,
            error: erroresGenerales.cursoId,
            onChange: cambiarGeneral("cursoId")
          }),
          h(Select, {
            id: "planif-division",
            etiqueta: "División",
            requerido: true,
            placeholder: generales.cursoId ? "Elegí la división" : "Primero elegí el curso",
            valor: generales.divisionId,
            opciones: opciones.divisiones,
            deshabilitado: !opciones.divisiones.length,
            error: erroresGenerales.divisionId,
            onChange: cambiarGeneral("divisionId")
          }),
          h(Campo, {
            id: "planif-turno",
            etiqueta: "Turno",
            valor: opciones.turno || "—",
            soloLectura: true,
            ayuda: "Se hereda del curso."
          }),
          h(Select, {
            id: "planif-materia",
            etiqueta: "Materia",
            requerido: true,
            placeholder: generales.divisionId ? "Elegí la materia" : "Primero elegí la división",
            valor: generales.materiaId,
            opciones: opciones.materias,
            deshabilitado: !opciones.materias.length,
            error: erroresGenerales.materiaId,
            onChange: cambiarGeneral("materiaId")
          }),
          h(Select, {
            id: "planif-docente",
            etiqueta: "Docente",
            requerido: true,
            placeholder: generales.materiaId ? "Elegí el docente" : "Primero elegí la materia",
            valor: generales.docenteId,
            opciones: opciones.docentes,
            deshabilitado: !opciones.docentes.length,
            error: erroresGenerales.docenteId,
            onChange: cambiarGeneral("docenteId")
          }),
          h(Select, {
            id: "planif-periodo",
            etiqueta: "Período",
            requerido: true,
            placeholder: generales.docenteId ? "Elegí el período" : "Primero elegí el docente",
            valor: generales.periodo,
            opciones: opciones.periodos,
            deshabilitado: !opciones.periodos.length,
            error: erroresGenerales.periodo,
            onChange: cambiarGeneral("periodo")
          })
        )
      ),
      h(
        "fieldset",
        { className: "planif-form__bloque", disabled: guardando || undefined },
        h("legend", null, "Contenido de la planificación"),
        h(
          "p",
          { className: "data-nota" },
          "Las secciones son opcionales para guardar el borrador. Para presentar la planificación tiene que haber al menos una completa."
        ),
        errores.contenido._general ? h(Alerta, { tono: "error" }, errores.contenido._general) : null,
        h(
          "div",
          { className: "planif-form__secciones" },
          secciones.map((seccion) =>
            h(AreaTexto, {
              key: seccion.valor,
              id: `planif-seccion-${seccion.valor}`,
              etiqueta: seccion.descripcion,
              filas: 4,
              maxLength: LIMITE_SECCION,
              valor: formulario.contenido[seccion.valor] ?? "",
              error: errores.contenido[seccion.valor],
              onChange: cambiarSeccion(seccion.valor)
            })
          )
        )
      ),
      h(
        Acciones,
        null,
        h(BotonEnlace, { variante: "texto", href: volver }, "Cancelar"),
        h(Boton, { tipo: "submit", variante: "primario", cargando: guardando }, esAlta ? "Guardar borrador" : "Guardar cambios")
      )
    )
  );
}
