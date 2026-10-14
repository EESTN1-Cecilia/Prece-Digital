/* Consulta por materia (#/planificaciones/materias y /:materiaId).

   Lista las planificaciones de una materia con docente, año, curso,
   division, turno, periodo, estado y fecha de actualizacion. Un docente
   acotado solo ve las propias: lo resuelve el backend. */

import { useMemo, useState } from "react";
import { h } from "../../layouts/site-layout.js";
import { PlanificacionesService } from "./planificaciones-service.js";
import { opcionesDeCatalogo, opcionesDeEstados, opcionesDeFiltros } from "./planificaciones-helpers.js";
import { useCatalogosPlanificaciones, useConsulta } from "./use-planificaciones.js";
import { ConsultaPlanificaciones } from "./components/consulta-planificaciones.js";

const FILTROS_CONSULTA = { anioLectivo: "", periodo: "", estado: "" };

export default function PlanificacionesMateriaView({ materiaId }) {
  const { catalogos, combinaciones, cargando: cargandoOpciones, error: errorOpciones, recargar: recargarOpciones } =
    useCatalogosPlanificaciones();
  const [filtros, setFiltros] = useState(FILTROS_CONSULTA);

  const base = useMemo(() => opcionesDeFiltros(combinaciones), [combinaciones]);

  const { datos, cargando, error, recargar } = useConsulta(
    () => PlanificacionesService.porMateria(materiaId, filtros),
    [materiaId, filtros],
    { habilitada: Boolean(materiaId) }
  );

  const cabecera = datos
    ? [
        h("h2", { key: "nombre", className: "planif-ficha__titulo" }, datos.materia?.nombre),
        h(
          "p",
          { key: "docentes", className: "planif-ficha__fila" },
          h("span", { className: "planif-ficha__etiqueta" }, "Docentes con planificación"),
          h("span", null, String(new Set(datos.planificaciones.map((plan) => plan.docenteId)).size))
        )
      ]
    : null;

  return h(ConsultaPlanificaciones, {
    activa: "materias",
    titulo: "Planificaciones por materia",
    icono: "academic",
    selector: {
      id: "consulta-materia",
      etiqueta: "Materia",
      placeholder: cargandoOpciones ? "Cargando materias..." : "Elegí una materia",
      valor: materiaId,
      opciones: base.materias,
      onChange: (valor) => {
        window.location.hash = valor ? `#/planificaciones/materias/${encodeURIComponent(valor)}` : "#/planificaciones/materias";
      }
    },
    errorOpciones,
    onReintentarOpciones: recargarOpciones,
    camposFiltro: ["anioLectivo", "periodo", "estado"],
    filtros,
    opcionesFiltro: {
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
    columnas: ["id", "docente", "anio", "curso", "division", "turno", "periodo", "estado", "actualizadoEn"],
    textoSinSeleccion: "Elegí una materia para ver sus planificaciones."
  });
}
