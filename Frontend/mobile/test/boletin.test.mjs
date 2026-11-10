/* Boletin en Mobile: mismo agrupado que la web y HTML del PDF seguro. */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { agruparMaterias, boletinHtml, esNotaMarcada, esc, estadoMateria, nombreArchivoBoletin, resumenBoletin } from "../src/utils/boletin.js";

const periodo = (valor, estado) => ({ resultado: valor === null ? null : { valor, estado, fecha: "2026-05-10", tipoEvaluacion: "trimestral" } });

function materia(nombre, c1, c2, fin, estadoActual = "aprobada") {
  return {
    materiaId: nombre,
    materia: nombre,
    docente: "Pérez, Ana",
    periodos: { c1: periodo(c1, "aprobada"), c2: periodo(c2, "debajo_de_6"), final: periodo(fin, "aprobada") },
    estadoActual,
    estadoActualEtiqueta: estadoActual === "aprobada" ? "Aprobada" : "Nota inferior a 6",
    situacionOficial: null
  };
}

const datos = {
  cicloLectivo: 2026,
  criterio: "Cada período muestra la última calificación registrada.",
  alumno: { nombreCompleto: "Demo, Alumno <b>", dni: "40000001", cursoDivision: "1° 1°", curso: 1, orientacion: null },
  materias: [materia("Matemática", "9", "7", null), materia("Lengua y Literatura", "5", "4", null, "debajo_de_6")],
  inasistencias: { ausentes: 2, ausentesJustificados: 1, ausentesInjustificados: 1, llegadasTarde: 0, ausentesParciales: 0 },
  materiasPendientes: []
};

describe("boletin", () => {
  it("resume solo lo que figura en el documento", () => {
    const resumen = Object.fromEntries(resumenBoletin(datos));
    assert.equal(resumen.Materias, 2);
    assert.equal(resumen.Aprobadas, 1);
    assert.equal(resumen["A revisar"], 1);
    assert.equal(resumen.Ausentes, 2);
  });

  it("agrupa con el mismo codigo de la web y completa el final como la web", () => {
    const grupos = agruparMaterias(datos);
    assert.ok(grupos.length >= 1);
    assert.equal(grupos[0].titulo, "FORMACIÓN GENERAL");
    const mate = grupos.flatMap((g) => g.materias).find((m) => m.materia === "Matemática");
    assert.equal(mate.periodos.final.resultado.valor, "8");
  });

  it("marca TEP, TED y notas menores a 6", () => {
    assert.equal(esNotaMarcada({ estado: "tep" }), true);
    assert.equal(esNotaMarcada({ estado: "aprobada" }), false);
    assert.equal(esNotaMarcada(null), false);
  });

  it("describe la situacion oficial de una materia", () => {
    assert.equal(estadoMateria({ situacionOficial: null }), null);
    assert.equal(estadoMateria({ situacionOficial: { tipo: "cursada", tipoEtiqueta: "Cursada", estadoEtiqueta: "Regular" } }), "Regular");
    assert.equal(estadoMateria({ situacionOficial: { tipo: "previa", tipoEtiqueta: "Previa", estadoEtiqueta: "Pendiente" } }), "Previa · Pendiente");
  });

  it("arma un nombre de archivo seguro", () => {
    assert.equal(nombreArchivoBoletin({ alumno: { nombreCompleto: "Pérez López, Ana" }, cicloLectivo: 2026 }), "Boletin-Perez-Lopez-Ana-2026.pdf");
    assert.equal(nombreArchivoBoletin({ alumno: { nombreCompleto: "../../etc/passwd" }, cicloLectivo: 2026 }).includes("/"), false);
  });

  it("el HTML del PDF escapa los datos y trae las secciones del boletin", () => {
    assert.equal(esc(`<script>"x"&'`), "&lt;script&gt;&quot;x&quot;&amp;&#39;");
    const html = boletinHtml(datos, { logo: "data:image/png;base64,AAAA", emitido: "09/11/2026" });
    assert.ok(!html.includes("<b>"), "no debe pasar HTML del alumno sin escapar");
    assert.ok(html.includes("Demo, Alumno &lt;b&gt;"));
    for (const texto of ["BOLETÍN DE CALIFICACIONES", "FORMACIÓN GENERAL", "Matemática", "Inasistencias", "Materias pendientes de aprobación", "Firma del preceptor/a", "09/11/2026", "data:image/png;base64,AAAA"]) {
      assert.ok(html.includes(texto), `falta: ${texto}`);
    }
  });

  it("sin materias informa que no hay calificaciones", () => {
    const html = boletinHtml({ ...datos, materias: [] });
    assert.ok(html.includes("Todavía no hay calificaciones registradas"));
  });
});
