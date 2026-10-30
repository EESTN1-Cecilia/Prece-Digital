/* Mi Situacion Academica: materias con TEP, notas menores a 6 y materias
   pendientes de aprobacion, en la tabla Materia | Docente | Periodo |
   Calificacion | Estado. */

import { useState } from "react";
import { h, Cargando, Encabezado, ErrorCarga, EstadoBadge, Indicador, Materia, Tarjeta, Vacio, useDatos } from "./componentes.js";
import { obtenerSituacion } from "./portal-api.js";

const A_REVISAR = ["tep", "ted", "debajo_de_6", "pendiente"];

export default function SituacionAlumnoView() {
  const [soloRevisar, setSoloRevisar] = useState(true);
  const { cargando, error, datos, recargar } = useDatos(() => obtenerSituacion(), []);

  if (cargando && !datos) return h(Cargando);
  if (error) return h(ErrorCarga, { error, onReintentar: recargar });

  const { filas, totales, cicloLectivo, aclaracion, materiasSinCalificacion } = datos;
  const visibles = soloRevisar ? filas.filter((fila) => A_REVISAR.includes(fila.estado)) : filas;

  return h(
    "div",
    { className: "pa-pagina" },
    h(Encabezado, { titulo: "Mi Situación Académica", descripcion: `Ciclo lectivo ${cicloLectivo}` }),
    h(
      "div",
      { className: "pa-indicadores pa-indicadores--cuatro" },
      h(Indicador, { icono: "alerta", etiqueta: "Materias con TEP", valor: totales.conTep, tono: totales.conTep ? "alerta" : "neutro" }),
      h(Indicador, { icono: "grafico", etiqueta: "Materias con nota menor a 6", valor: totales.debajoDe6, tono: totales.debajoDe6 ? "peligro" : "neutro" }),
      h(Indicador, { icono: "reloj", etiqueta: "Pendientes de aprobación", valor: totales.pendientes, tono: totales.pendientes ? "pendiente" : "neutro" }),
      h(Indicador, { icono: "tilde", etiqueta: "Períodos aprobados", valor: totales.aprobadas, tono: "ok" })
    ),
    h(
      Tarjeta,
      {
        titulo: "Detalle por materia",
        acciones: h(
          "div",
          { className: "pa-filtros", role: "group", "aria-label": "Qué mostrar" },
          h("button", { type: "button", className: `pa-chip ${soloRevisar ? "pa-chip--activo" : ""}`, "aria-pressed": soloRevisar, onClick: () => setSoloRevisar(true) }, "A revisar"),
          h("button", { type: "button", className: `pa-chip ${!soloRevisar ? "pa-chip--activo" : ""}`, "aria-pressed": !soloRevisar, onClick: () => setSoloRevisar(false) }, "Todas")
        )
      },
      visibles.length === 0
        ? h(Vacio, {
            titulo: soloRevisar ? "No tenés materias con TEP, notas menores a 6 ni pendientes." : "Todavía no hay calificaciones registradas.",
            descripcion: soloRevisar && filas.length ? "Elegí «Todas» para ver el resto de tus calificaciones." : null
          })
        : h(
            "div",
            { className: "pa-tabla-envoltorio" },
            h(
              "table",
              { className: "pa-tabla" },
              h("thead", null, h("tr", null, ["Materia", "Docente", "Período", "Calificación", "Estado"].map((titulo) => h("th", { scope: "col", key: titulo }, titulo)))),
              h(
                "tbody",
                null,
                visibles.map((fila, indice) =>
                  h(
                    "tr",
                    { key: `${fila.materiaId}-${fila.periodo}-${indice}` },
                    h("th", { scope: "row", "data-titulo": "Materia" }, h(Materia, { nombre: fila.materia })),
                    h("td", { "data-titulo": "Docente" }, fila.docente ?? "—"),
                    h("td", { "data-titulo": "Período" }, fila.periodo),
                    h("td", { "data-titulo": "Calificación", className: "pa-tabla__numero" }, fila.calificacion ?? "—"),
                    h("td", { "data-titulo": "Estado" }, h(EstadoBadge, { estado: fila.estado, etiqueta: fila.estadoEtiqueta }))
                  )
                )
              )
            )
          ),
      materiasSinCalificacion.length && !soloRevisar
        ? h("p", { className: "pa-nota" }, `Sin calificaciones registradas todavía: ${materiasSinCalificacion.map((materia) => materia.materia).join(", ")}.`)
        : null,
      h("p", { className: "pa-nota" }, aclaracion, " En cada período se toma la última calificación que registró el docente.")
    )
  );
}
