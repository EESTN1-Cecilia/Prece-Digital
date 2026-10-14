/* Consulta por curso (#/planificaciones/cursos y /:cursoId).

   Todas las planificaciones disponibles para el curso segun los permisos del
   usuario, con filtros por division, materia, ciclo lectivo, periodo y
   estado. Las divisiones salen de la respuesta de la API (todas las del
   curso) y las materias, de las combinaciones del curso. */

import { useMemo, useState } from "react";
import { h } from "../../layouts/site-layout.js";
import { PlanificacionesService } from "./planificaciones-service.js";
import { etiquetaCurso, opcionesDeCatalogo, opcionesDeEstados, opcionesDeFiltros } from "./planificaciones-helpers.js";
import { useCatalogosPlanificaciones, useConsulta } from "./use-planificaciones.js";
import { ConsultaPlanificaciones } from "./components/consulta-planificaciones.js";

const FILTROS_CONSULTA = { divisionId: "", materiaId: "", anioLectivo: "", periodo: "", estado: "" };

export default function PlanificacionesCursoView({ cursoId }) {
  const { catalogos, combinaciones, cargando: cargandoOpciones, error: errorOpciones, recargar: recargarOpciones } =
    useCatalogosPlanificaciones();
  const [filtros, setFiltros] = useState(FILTROS_CONSULTA);

  const base = useMemo(() => opcionesDeFiltros(combinaciones), [combinaciones]);
  const delCurso = useMemo(
    () => opcionesDeFiltros(combinaciones.filter((item) => item.curso.id === cursoId)),
    [combinaciones, cursoId]
  );

  const { datos, cargando, error, recargar } = useConsulta(
    () => PlanificacionesService.porCurso(cursoId, filtros),
    [cursoId, filtros],
    { habilitada: Boolean(cursoId) }
  );

  const cabecera = datos
    ? [
        h("h2", { key: "nombre", className: "planif-ficha__titulo" }, `${etiquetaCurso(datos.curso)} · Turno ${datos.curso?.turnoNombre ?? ""}`),
        h(
          "p",
          { key: "divisiones", className: "planif-ficha__fila" },
          h("span", { className: "planif-ficha__etiqueta" }, "Divisiones"),
          h("span", null, datos.divisiones.length ? datos.divisiones.map((division) => division.nombre).join(", ") : "Sin divisiones")
        )
      ]
    : null;

  return h(ConsultaPlanificaciones, {
    activa: "cursos",
    titulo: "Planificaciones por curso",
    icono: "students",
    selector: {
      id: "consulta-curso",
      etiqueta: "Curso",
      placeholder: cargandoOpciones ? "Cargando cursos..." : "Elegí un curso",
      valor: cursoId,
      opciones: base.cursos,
      onChange: (valor) => {
        setFiltros(FILTROS_CONSULTA);
        window.location.hash = valor ? `#/planificaciones/cursos/${encodeURIComponent(valor)}` : "#/planificaciones/cursos";
      }
    },
    errorOpciones,
    onReintentarOpciones: recargarOpciones,
    camposFiltro: ["divisionId", "materiaId", "anioLectivo", "periodo", "estado"],
    filtros,
    opcionesFiltro: {
      divisionId: (datos?.divisiones ?? []).map((division) => ({ id: division.id, nombre: division.nombre })),
      materiaId: delCurso.materias,
      anioLectivo: base.aniosLectivos,
      periodo: opcionesDeCatalogo(catalogos?.periodos),
      estado: opcionesDeEstados(catalogos)
    },
    onCambiarFiltro: (campo, valor) => setFiltros((actuales) => ({ ...actuales, [campo]: valor })),
    onLimpiarFiltros: () => setFiltros(FILTROS_CONSULTA),
    catalogos,
    datos,
    cargando,
    error,
    onReintentar: recargar,
    cabecera,
    columnas: ["id", "anio", "division", "turno", "materia", "docente", "periodo", "estado", "actualizadoEn"],
    textoSinSeleccion: "Elegí un curso para ver todas sus planificaciones."
  });
}
