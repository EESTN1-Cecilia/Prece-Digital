/* Consulta por docente (#/planificaciones/docentes y /:docenteId).

   Muestra el docente, las materias a cargo, sus cursos/divisiones con el
   periodo, la cantidad de planificaciones por estado y la ultima
   actualizacion, y el listado con acceso al detalle.

   Un docente acotado solo ve su propio legajo: las opciones de la API ya
   vienen filtradas, y si hay un unico docente se abre directamente. */

import { useEffect, useMemo, useState } from "react";
import { h } from "../../layouts/site-layout.js";
import { Badge } from "../../components/ui/index.js";
import { PlanificacionesService } from "./planificaciones-service.js";
import { etiquetaCurso, opcionesDeCatalogo, opcionesDeEstados, opcionesDeFiltros } from "./planificaciones-helpers.js";
import { useCatalogosPlanificaciones, useConsulta } from "./use-planificaciones.js";
import { ConsultaPlanificaciones } from "./components/consulta-planificaciones.js";

const FILTROS_CONSULTA = { anioLectivo: "", periodo: "", estado: "" };

export default function PlanificacionesDocenteView({ docenteId }) {
  const { catalogos, combinaciones, cargando: cargandoOpciones, error: errorOpciones, recargar: recargarOpciones } =
    useCatalogosPlanificaciones();
  const [filtros, setFiltros] = useState(FILTROS_CONSULTA);

  const base = useMemo(() => opcionesDeFiltros(combinaciones), [combinaciones]);

  useEffect(() => {
    if (!docenteId && !cargandoOpciones && base.docentes.length === 1) {
      window.location.hash = `#/planificaciones/docentes/${encodeURIComponent(base.docentes[0].id)}`;
    }
  }, [docenteId, cargandoOpciones, base.docentes]);

  const { datos, cargando, error, recargar } = useConsulta(
    () => PlanificacionesService.porDocente(docenteId, filtros),
    [docenteId, filtros],
    { habilitada: Boolean(docenteId) }
  );

  const opcionesFiltro = {
    anioLectivo: base.aniosLectivos,
    periodo: opcionesDeCatalogo(catalogos?.periodos),
    estado: opcionesDeEstados(catalogos)
  };

  const cabecera = datos
    ? [
        h("h2", { key: "nombre", className: "planif-ficha__titulo" }, datos.docente?.nombreCompleto),
        h(
          "div",
          { key: "materias", className: "planif-ficha__fila" },
          h("span", { className: "planif-ficha__etiqueta" }, "Materias a cargo"),
          datos.materias.length
            ? h("span", { className: "planif-ficha__badges" }, datos.materias.map((materia) => h(Badge, { key: materia.id, tono: "info" }, materia.nombre)))
            : h("span", null, "Sin materias vigentes")
        ),
        h(
          "div",
          { key: "cursos", className: "planif-ficha__fila" },
          h("span", { className: "planif-ficha__etiqueta" }, "Cursos y divisiones"),
          datos.cursos.length
            ? h(
                "ul",
                { className: "planif-ficha__lista" },
                datos.cursos.map((item, indice) =>
                  h(
                    "li",
                    { key: `${item.curso.id}-${item.division?.id ?? "todas"}-${indice}` },
                    `${etiquetaCurso(item.curso)} · ${item.curso.turnoNombre} · ${item.division ? `División ${item.division.nombre}` : "Todas las divisiones"} · ${item.materia?.nombre ?? ""} · ${item.periodo}`
                  )
                )
              )
            : h("span", null, "Sin cursos vigentes")
        )
      ]
    : null;

  return h(ConsultaPlanificaciones, {
    activa: "docentes",
    titulo: "Planificaciones por docente",
    icono: "people",
    selector: {
      id: "consulta-docente",
      etiqueta: "Docente",
      placeholder: cargandoOpciones ? "Cargando docentes..." : "Elegí un docente",
      valor: docenteId,
      opciones: base.docentes,
      onChange: (valor) => {
        window.location.hash = valor ? `#/planificaciones/docentes/${encodeURIComponent(valor)}` : "#/planificaciones/docentes";
      }
    },
    errorOpciones,
    onReintentarOpciones: recargarOpciones,
    camposFiltro: ["anioLectivo", "periodo", "estado"],
    filtros,
    opcionesFiltro,
    onCambiarFiltro: (campo, valor) => setFiltros((actuales) => ({ ...actuales, [campo]: valor })),
    onLimpiarFiltros: () => setFiltros(FILTROS_CONSULTA),
    catalogos,
    datos,
    cargando,
    error,
    onReintentar: recargar,
    cabecera,
    columnas: ["id", "materia", "anio", "curso", "division", "periodo", "estado", "actualizadoEn"],
    textoSinSeleccion: "Elegí un docente para ver sus planificaciones."
  });
}
