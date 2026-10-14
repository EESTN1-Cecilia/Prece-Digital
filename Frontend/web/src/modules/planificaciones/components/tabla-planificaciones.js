/* Tabla de planificaciones reutilizada por el listado y las consultas por
   docente, materia y curso. Cada pantalla elige las columnas por id.

   Las acciones de cada fila salen de `planificacion.acciones`, que calcula el
   backend segun el estado y los permisos del usuario: aca no se decide si se
   puede editar o presentar, solo se muestra lo que la API habilita. */

import { h } from "../../../layouts/site-layout.js";
import { Boton, BotonEnlace, Tabla } from "../../../components/ui/index.js";
import { fecha, fechaCorta } from "../../../utils/formato.js";
import { etiquetaCurso } from "../planificaciones-helpers.js";
import { EstadoPlanificacion } from "./estado-planificacion.js";

const COLUMNAS = {
  id: { id: "id", titulo: "ID", ordenable: true },
  docente: { id: "docente", titulo: "Docente", ordenable: true, celda: (plan) => plan.docente?.nombreCompleto ?? "—" },
  materia: { id: "materia", titulo: "Materia", ordenable: true, celda: (plan) => plan.materia?.nombre ?? "—" },
  anio: { id: "anio", titulo: "Año", celda: (plan) => plan.curso?.anioNombre ?? "—" },
  curso: { id: "curso", titulo: "Curso", ordenable: true, celda: (plan) => etiquetaCurso(plan.curso) },
  division: { id: "division", titulo: "División", celda: (plan) => plan.division?.nombre ?? "—" },
  turno: { id: "turno", titulo: "Turno", celda: (plan) => plan.turnoNombre ?? "—" },
  periodo: { id: "periodo", titulo: "Período", ordenable: true, celda: (plan) => plan.periodo?.etiqueta ?? "—" },
  creadoEn: { id: "creadoEn", titulo: "Creación", ordenable: true, celda: (plan) => fecha(plan.creadoEn) },
  actualizadoEn: { id: "actualizadoEn", titulo: "Última modificación", ordenable: true, celda: (plan) => fecha(plan.actualizadoEn) },
  estado: { id: "estado", titulo: "Estado", ordenable: true, celda: (plan) => h(EstadoPlanificacion, { estado: plan.estado }) },
  fechaPresentacion: { id: "fechaPresentacion", titulo: "Presentación", celda: (plan) => fechaCorta(plan.fechaPresentacion) },
  fechaRevision: { id: "fechaRevision", titulo: "Revisión", celda: (plan) => fechaCorta(plan.fechaRevision) },
  revisor: { id: "revisor", titulo: "Responsable de revisión", celda: (plan) => plan.revisor?.nombre ?? "—" }
};

export const COLUMNAS_LISTADO = Object.keys(COLUMNAS);

export function TablaPlanificaciones({
  columnas = COLUMNAS_LISTADO,
  filas = [],
  titulo = "Planificaciones docentes",
  cargando,
  error,
  onReintentar,
  orden,
  onOrden,
  paginacion,
  vacio,
  onPresentar
}) {
  const definiciones = columnas
    .map((id) => COLUMNAS[id])
    .filter(Boolean)
    /* Sin onOrden la tabla no ofrece ordenar: lo resuelve el backend o nadie. */
    .map((columna) => (onOrden ? columna : { ...columna, ordenable: false }));

  const acciones = (plan) => {
    const disponibles = plan.acciones ?? ["ver"];

    return [
      h(
        BotonEnlace,
        { key: "ver", variante: "contorno", tamano: "chico", href: `#/planificaciones/${encodeURIComponent(plan.id)}` },
        "Ver detalle"
      ),
      disponibles.includes("editar")
        ? h(
            BotonEnlace,
            { key: "editar", variante: "contorno", tamano: "chico", href: `#/planificaciones/${encodeURIComponent(plan.id)}/editar` },
            "Modificar"
          )
        : null,
      disponibles.includes("presentar") && onPresentar
        ? h(Boton, { key: "presentar", variante: "primario", tamano: "chico", onClick: () => onPresentar(plan) }, "Presentar")
        : null
    ];
  };

  return h(Tabla, {
    titulo,
    columnas: definiciones,
    filas,
    cargando,
    error,
    onReintentar,
    orden,
    onOrden,
    acciones,
    vacio,
    paginacion
  });
}
