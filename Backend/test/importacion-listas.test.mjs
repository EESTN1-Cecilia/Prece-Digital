import test from "node:test";
import assert from "node:assert/strict";

import { analizar, detectarEstructura, normalizarCurso, separarNombre } from "../modules/students/importacion/listas.mjs";

test("normalizarCurso: variantes de año y division al formato 1°2°", () => {
  for (const entrada of ["1° División 2", "1ro 2", "1.º 2", "1°2°", " 1 °  2 ° ", "1° DIVISIÓN 2", "1ro División 2", "1º2º"]) {
    assert.deepEqual(normalizarCurso(entrada), { curso: 1, division: "2", etiqueta: "1°2°" }, entrada);
  }
  assert.equal(normalizarCurso("3° División 6").etiqueta, "3°6°");
  assert.equal(normalizarCurso("7°1°").etiqueta, "7°1°");
  assert.equal(normalizarCurso("9°1°"), null);
  assert.equal(normalizarCurso("Primero"), null);
});

test("separarNombre conserva todas las palabras y marca la estimacion", () => {
  assert.deepEqual(separarNombre("PEREZ ANA"), { apellido: "PEREZ", nombre: "ANA", dividido: false });
  assert.deepEqual(separarNombre("PEREZ ANA LAURA"), { apellido: "PEREZ", nombre: "ANA LAURA", dividido: true });
  assert.deepEqual(separarNombre("BRAVO CASTELLANO LORENZO MARTIN"), { apellido: "BRAVO CASTELLANO", nombre: "LORENZO MARTIN", dividido: true });
});

/* Planilla con el encabezado en otra fila/columna, bloques varones/mujeres y totales. */
const filas = (desplazamiento = 0) => {
  const f = [];
  f.push([null, "PRECEPTOR 2°1°"]);
  f.push([null, "Nº DE ORDEN", "APELLIDO Y NOMBRE", "PROVIENE DE"].slice(0, 4));
  f.push([null, 1, "PEREZ ANA LAURA", "INGRESANTE"]);
  f.push([null, 2, "GOMEZ JUAN", null]);
  f.push([null, 3, "gomez   juan", null]); // duplicado dentro de la lista
  f.push([null, null, "Varones Presentes"]);
  f.push([null, null, "Varones Totales"]);
  f.push([null, 1, "LOPEZ MARIA ELENA", null]);
  f.push([null, null, "Total Mujeres"]);
  f.push([null, null, "Totales"]);
  void desplazamiento;
  return f;
};

test("detectarEstructura ubica encabezado y columnas por contenido", () => {
  const e = detectarEstructura(filas());
  assert.equal(e.filaEncabezado, 1);
  assert.equal(e.colNombre, 2);
  assert.equal(e.colOrden, 1);
});

test("analizar: bloques por genero, duplicados y sin inventar datos", () => {
  const r = analizar([{ archivo: "2° AÑO/2°1°.xlsx", hoja: "2°1°", etiquetaArchivo: "2°1°", filas: filas() }]);
  assert.equal(r.alumnos.length, 3);
  assert.deepEqual(r.alumnos.map((a) => a.genero), ["masculino", "masculino", "femenino"]);
  assert.ok(r.alumnos.every((a) => a.curso === 2 && a.division === "1" && a.etiqueta === "2°1°"));
  assert.ok(r.alumnos.every((a) => a.dni === undefined)); // las planillas no traen DNI
  assert.deepEqual(r.pendientes.map((p) => p.motivo), ["duplicado_en_lista"]);
  assert.equal(r.porCurso["2°1°"].importables, 3);
});

test("analizar: la misma persona en dos divisiones queda como conflicto, no se reasigna", () => {
  const lista = (etiqueta) => ({ archivo: `${etiqueta}.xlsx`, hoja: etiqueta, etiquetaArchivo: etiqueta, filas: filas() });
  const r = analizar([lista("2°1°"), lista("2°2°")]);
  assert.equal(r.alumnos.length, 0);
  assert.equal(r.pendientes.filter((p) => p.motivo === "conflicto_entre_listas").length, 6);
});

test("analizar: curso inexistente o archivo sin encabezado -> pendiente", () => {
  const r = analizar([
    { archivo: "9°9°.xlsx", hoja: "x", etiquetaArchivo: "9°9°", filas: filas() },
    { archivo: "2°1°.xlsx", hoja: "x", etiquetaArchivo: "2°1°", filas: [["sin", "encabezado"]] }
  ]);
  assert.deepEqual(r.pendientes.map((p) => p.motivo), ["curso_no_reconocido", "estructura_ambigua"]);
});
