/* Boletin academico de un alumno: lo usan el portal del alumno y el personal
   (preceptor, secretaria, direccion). Es un solo componente sobre un solo
   calculo del backend (student-portal.service boletin), asi ambos ven
   exactamente lo mismo para el mismo alumno, periodo y ciclo lectivo. */

import { h, EstadoBadge, Materia, Vacio, fechaCorta } from "../alumno-portal/componentes.js";

function Celda({ resultado }) {
  if (!resultado) return h("td", { className: "pa-boletin__nota pa-boletin__nota--vacia" }, "—");
  const marcada = resultado.estado === "tep" || resultado.estado === "ted" || resultado.estado === "debajo_de_6";
  return h(
    "td",
    { className: `pa-boletin__nota ${marcada ? `pa-boletin__nota--${resultado.estado}` : ""}`, title: `${resultado.tipoEvaluacion.replace("_", " ")} · ${fechaCorta(resultado.fecha)}` },
    resultado.valor
  );
}

export function estadoMateria(materia) {
  if (materia.situacionOficial) {
    const { tipo, tipoEtiqueta, estadoEtiqueta } = materia.situacionOficial;
    return tipo === "cursada" ? estadoEtiqueta : `${tipoEtiqueta} · ${estadoEtiqueta}`;
  }
  return null;
}

/* Resumen del boletin: solo cuenta lo que ya figura en el documento. */
export function resumenBoletin({ materias, inasistencias, materiasPendientes }) {
  const aRevisar = materias.filter((materia) => ["tep", "ted", "debajo_de_6"].includes(materia.estadoActual)).length;
  return [
    ["Materias", materias.length],
    ["Aprobadas", materias.filter((materia) => materia.estadoActual === "aprobada").length],
    ["A revisar", aRevisar],
    ["Ausentes", inasistencias.ausentes],
    ["Previas pendientes", materiasPendientes.length]
  ];
}

export function BoletinDocumento({ datos }) {
  const { alumno, materias, inasistencias, materiasPendientes, cicloLectivo, criterio } = datos;

  return h(
    "article",
    { className: "pa-boletin", "aria-label": `Boletín ${cicloLectivo}` },
    h(
      "header",
      { className: "pa-boletin__cabecera" },
      h("img", { src: "/assets/tecnica-n1-monte-grande.png", alt: "Logo E.E.S.T. N°1", className: "pa-boletin__logo" }),
      h(
        "div",
        { className: "pa-boletin__institucion" },
        h("p", { className: "pa-boletin__escuela" }, "E.E.S.T. N°1 Monte Grande"),
        h("h2", { className: "pa-boletin__titulo" }, `Boletín de calificaciones · Ciclo lectivo ${cicloLectivo}`)
      )
    ),
    h(
      "dl",
      { className: "pa-boletin__alumno" },
      h("div", null, h("dt", null, "Alumno/a"), h("dd", null, alumno.nombreCompleto)),
      h("div", null, h("dt", null, "DNI"), h("dd", null, alumno.dni)),
      h("div", null, h("dt", null, "Curso y división"), h("dd", null, alumno.cursoDivision ?? "Sin registro")),
      h("div", null, h("dt", null, "Ciclo lectivo"), h("dd", null, cicloLectivo))
    ),
    h(
      "ul",
      { className: "pa-boletin__resumen", "aria-label": "Resumen del boletín" },
      resumenBoletin(datos).map(([etiqueta, valor]) => h("li", { key: etiqueta }, h("strong", null, valor), h("span", null, etiqueta)))
    ),
    materias.length === 0
      ? h(Vacio, { titulo: "Todavía no hay calificaciones registradas para este ciclo." })
      : h(
          "div",
          { className: "pa-tabla-envoltorio" },
          h(
            "table",
            { className: "pa-tabla pa-boletin__tabla" },
            h(
              "thead",
              null,
              h(
                "tr",
                null,
                h("th", { scope: "col" }, "Materia"),
                h("th", { scope: "col" }, "1° C"),
                h("th", { scope: "col" }, "2° C"),
                h("th", { scope: "col" }, "Final"),
                h("th", { scope: "col" }, "Estado")
              )
            ),
            h(
              "tbody",
              null,
              materias.map((materia) =>
                h(
                  "tr",
                  { key: materia.materiaId },
                  h("th", { scope: "row" }, h("span", { className: "pa-boletin__materia" }, h(Materia, { nombre: materia.materia })), materia.docente ? h("span", { className: "pa-boletin__docente" }, materia.docente) : null),
                  h(Celda, { resultado: materia.periodos.c1.resultado }),
                  h(Celda, { resultado: materia.periodos.c2.resultado }),
                  h(Celda, { resultado: materia.periodos.final.resultado }),
                  h(
                    "td",
                    null,
                    h(EstadoBadge, { estado: materia.estadoActual, etiqueta: materia.estadoActualEtiqueta }),
                    estadoMateria(materia) ? h("span", { className: "pa-boletin__situacion" }, estadoMateria(materia)) : null
                  )
                )
              )
            )
          )
        ),
    h(
      "section",
      { className: "pa-boletin__pie" },
      h(
        "div",
        { className: "pa-boletin__bloque" },
        h("h3", null, "Inasistencias"),
        h(
          "p",
          null,
          `${inasistencias.ausentes} ausente(s) de jornada completa: ${inasistencias.ausentesJustificados} justificada(s), ${inasistencias.ausentesInjustificados} injustificada(s).`
        ),
        inasistencias.llegadasTarde || inasistencias.ausentesParciales
          ? h("p", null, `Llegadas tarde: ${inasistencias.llegadasTarde}. Retiros anticipados: ${inasistencias.ausentesParciales}.`)
          : null
      ),
      h(
        "div",
        { className: "pa-boletin__bloque" },
        h("h3", null, "Materias pendientes de aprobación"),
        materiasPendientes.length
          ? h(
              "ul",
              null,
              materiasPendientes.map((previa) =>
                h("li", { key: previa.id }, `${previa.materia} — ciclo ${previa.anioCursada}${previa.cursoOrigen?.etiqueta ? ` (${previa.cursoOrigen.etiqueta})` : ""}`)
              )
            )
          : h("p", null, "No tiene materias pendientes.")
      )
    ),
    h("p", { className: "pa-nota pa-boletin__criterio" }, criterio, " TEP: trayectoria educativa en proceso. TED: trayectoria educativa con dificultad."),
    h(
      "div",
      { className: "pa-boletin__firmas", "aria-hidden": "true" },
      h("div", null, h("span", null, "Firma del preceptor/a")),
      h("div", null, h("span", null, "Firma y sello de Dirección"))
    ),
    h("p", { className: "pa-boletin__emision" }, `Consulta generada el ${new Date().toLocaleDateString("es-AR")} desde Prece Digital.`)
  );
}
