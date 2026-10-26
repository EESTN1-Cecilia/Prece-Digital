/* Boletin de calificaciones para imprimir desde preceptoria, con el mismo
   diseno que el Boletin Digital de Secretaria (mismas clases de
   styles/documentos/boletin.css) y los mismos datos: el boletin compartido
   que completan los docentes y Secretaria. Es de solo lectura.

   Datos personales al minimo: apellido y nombre, curso, turno y numero de
   lista; sin DNI, legajo, domicilio ni contactos. */

import { h } from "../../../layouts/site-layout.js";
import { etiquetaTurno } from "../../portal-docente/portal-docente-logica.js";
import { contarFaltantes, filasDelBoletin, promedioGeneral } from "../boletines-logica.js";

const COLUMNAS = [
  { campo: "informe1", clase: "boletin-grade-cell", colorear: true },
  { campo: "informe2", clase: "boletin-grade-cell", colorear: true },
  { campo: "promedioAnual", clase: "boletin-grade-cell boletin-grade-cell--highlight", colorear: true },
  { campo: "diciembre", clase: "boletin-grade-cell" },
  { campo: "febrero", clase: "boletin-grade-cell" },
  { campo: "definitiva", clase: "boletin-grade-cell boletin-grade-cell--highlight-def", colorear: true, negrita: true }
];

const MESES_PENDIENTES = ["abril", "mayo", "agosto", "octubre"];

function claseNota(valor) {
  const numero = parseFloat(String(valor).replace(",", "."));
  if (Number.isNaN(numero)) return "";
  return numero >= 7 ? " grade--approved" : " grade--disapproved";
}

function Valor({ valor, clase = "boletin-grade-input", colorear = false, negrita = false }) {
  return h(
    "span",
    { className: `${clase} boletin-valor${colorear ? claseNota(valor) : ""}`, style: negrita ? { fontWeight: 900 } : undefined },
    valor || ""
  );
}

function Dato({ etiqueta, valor, ancho = false }) {
  return h(
    "div",
    { className: "boletin-data-item", style: ancho ? { gridColumn: "span 2" } : undefined },
    h("span", { className: "boletin-data-label" }, etiqueta),
    h("span", { className: "boletin-data-value" }, valor)
  );
}

function pendientesParaMostrar(pendientes = []) {
  const conDatos = pendientes.filter((fila) => Object.values(fila ?? {}).some((valor) => String(valor ?? "").trim()));
  const filas = conDatos.length ? conDatos : [];
  while (filas.length < 2) filas.push({});
  return filas;
}

export function BoletinImpreso({ boletin, contexto, planes }) {
  const { alumno, calificaciones, materiasPendientes, inasistencias, cicloLectivo, orden, anio } = boletin;
  const secciones = filasDelBoletin({ planes, anio: anio ?? alumno.curso, orientacion: contexto?.orientacion, calificaciones });
  const faltantes = contarFaltantes(secciones);
  const turno = etiquetaTurno(contexto?.turno);
  const totalInasistencias = inasistencias?.total ?? inasistencias?.ausentes ?? 0;

  return h(
    "article",
    { className: "boletin-paper-card boletin-oficial", "aria-label": `Boletín de ${alumno.apellido}, ${alumno.nombre}` },
    h(
      "div",
      { className: "boletin-school-header" },
      h("div", { className: "boletin-school-logo-wrap" }, h("img", { src: "/assets/logo_tec.png", alt: "Escudo E.E.S.T. N° 1", className: "boletin-school-logo-img" })),
      h(
        "div",
        { className: "boletin-school-text-wrap" },
        h("p", { className: "boletin-school-ministry" }, "DIRECCIÓN GENERAL DE CULTURA Y EDUCACIÓN • PROVINCIA DE BUENOS AIRES"),
        h("h2", { className: "boletin-school-name" }, "E.E.S.T. N° 1 \"CECILIA BERDICHEVSKI\""),
        h("h4", { className: "boletin-school-doc-title" }, `BOLETÍN DE CALIFICACIONES • ${anio ?? alumno.curso}° AÑO`)
      )
    ),
    h(
      "div",
      { className: "boletin-student-data-grid" },
      h(Dato, { etiqueta: "Apellido y Nombre:", valor: `${alumno.apellido}, ${alumno.nombre}`, ancho: true }),
      h(Dato, { etiqueta: "Año/Div:", valor: `${alumno.curso}° ${alumno.division}` }),
      h(Dato, { etiqueta: "Ciclo Lectivo:", valor: String(cicloLectivo) }),
      h(Dato, { etiqueta: "Turno:", valor: turno ?? "—" }),
      h(Dato, { etiqueta: "N° de lista:", valor: orden ? String(orden) : "—" })
    ),
    h(
      "table",
      { className: "boletin-grades-table" },
      h(
        "colgroup",
        null,
        ["30%", "9.5%", "9.5%", "10.5%", "9.5%", "9.5%", "11.5%", "10%"].map((ancho, indice) => h("col", { key: indice, style: { width: ancho } }))
      ),
      h(
        "thead",
        null,
        h(
          "tr",
          null,
          h("th", { className: "col-materia" }, "MATERIAS"),
          h("th", { className: "col-informe" }, "1° INFORME"),
          h("th", { className: "col-informe" }, "2° INFORME"),
          h("th", { className: "col-promedio" }, "PROMEDIO ANUAL"),
          h("th", { className: "col-instancia" }, "DICIEMBRE"),
          h("th", { className: "col-instancia" }, "FEBRERO"),
          h("th", { className: "col-definitiva" }, "CALIF. DEFINITIVA"),
          h("th", { className: "col-firmas" }, "FIRMAS")
        )
      ),
      h(
        "tbody",
        null,
        secciones.flatMap((seccion) => [
          h("tr", { key: `t-${seccion.titulo}` }, h("td", { colSpan: 8, className: "boletin-category-row" }, seccion.titulo)),
          ...seccion.filas.map((fila) =>
            h(
              "tr",
              { key: `${seccion.titulo}-${fila.materia}` },
              h("td", { className: "boletin-subject-name" }, fila.materia),
              COLUMNAS.map((columna) =>
                h("td", { key: columna.campo, className: columna.clase }, h(Valor, { valor: fila.notas[columna.campo], colorear: columna.colorear, negrita: columna.negrita }))
              ),
              h("td", { style: { textAlign: "center", color: "#64748b", fontSize: "10px" } }, "")
            )
          )
        ]),
        h(
          "tr",
          { className: "boletin-summary-row" },
          h(
            "td",
            { colSpan: 3 },
            h(
              "div",
              { className: "boletin-summary-inasistencias" },
              h("span", { className: "boletin-inasistencias-label" }, "INASISTENCIA TOTAL:"),
              h(Valor, { valor: String(totalInasistencias), clase: "boletin-inasistencias-input" }),
              h("span", { style: { fontSize: "11px", color: "#64748b" } }, "días")
            )
          ),
          h("td", { colSpan: 3, style: { textAlign: "right", fontWeight: 800 } }, "PROMEDIO GENERAL ANUAL:"),
          h("td", { className: "boletin-promedio-general-val" }, promedioGeneral(secciones)),
          h("td", null, "")
        )
      )
    ),
    faltantes
      ? h("p", { className: "boletin-oficial__faltantes" }, `Materias sin calificaciones cargadas: ${faltantes}.`)
      : null,
    h(
      "div",
      { className: "boletin-pendientes-section" },
      h("h5", { className: "boletin-pendientes-title" }, "MATERIAS PENDIENTES DE ACREDITACIÓN / REGULARIZACIÓN"),
      h(
        "table",
        { className: "boletin-pendientes-table" },
        h(
          "colgroup",
          null,
          ["32%", "10%", ...Array(8).fill("7.25%")].map((ancho, indice) => h("col", { key: indice, style: { width: ancho } }))
        ),
        h(
          "thead",
          null,
          h(
            "tr",
            null,
            h("th", { rowSpan: 2 }, "MATERIAS PENDIENTES"),
            h("th", { rowSpan: 2 }, "AÑO"),
            ["Abril", "Mayo", "Agosto", "Octubre"].map((mes) => h("th", { key: mes, colSpan: 2 }, mes))
          ),
          h("tr", null, MESES_PENDIENTES.flatMap((mes) => [h("th", { key: `${mes}-c` }, "CALIF"), h("th", { key: `${mes}-l` }, "L/F")]))
        ),
        h(
          "tbody",
          null,
          pendientesParaMostrar(materiasPendientes).map((fila, indice) =>
            h(
              "tr",
              { key: indice },
              h("td", null, h(Valor, { valor: fila.materia, clase: "boletin-input-table-pending" })),
              h("td", null, h(Valor, { valor: fila.anio, clase: "boletin-input-table-pending" })),
              MESES_PENDIENTES.flatMap((mes) => [
                h("td", { key: `${mes}-c` }, h(Valor, { valor: fila[`${mes}Calif`], clase: "boletin-input-table-pending" })),
                h("td", { key: `${mes}-l` }, h(Valor, { valor: fila[`${mes}LF`], clase: "boletin-input-table-pending" }))
              ])
            )
          )
        )
      )
    ),
    h(
      "div",
      { className: "boletin-signatures-grid" },
      [
        ["Autoridad Escolar", "Firma y Sello Dirección"],
        ["Preceptor", "Firma Preceptor a Cargo"],
        ["Adulto Responsable", "Firma Padre / Madre / Tutor"]
      ].map(([titulo, detalle]) =>
        h(
          "div",
          { key: titulo, className: "boletin-signature-box" },
          h("div", { className: "boletin-signature-line" }),
          h("span", { className: "boletin-signature-label" }, titulo),
          h("span", { className: "boletin-signature-sub" }, detalle)
        )
      )
    )
  );
}
