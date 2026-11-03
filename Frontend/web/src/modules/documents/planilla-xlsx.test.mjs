import { calcularMetricas } from "./planilla-estructura.js";
import test from "node:test";
import assert from "node:assert/strict";
import { generarPlanillaXlsx } from "./planilla-xlsx.js";
import { crc32 } from "../../utils/zip-store.js";

const alumnos = (n) =>
  Array.from({ length: n }, (_, i) => ({ num: i + 1, apellido: `Apellido${i + 1}`, nombre: "Nombre", dni: "40123456", p1: "7", p2: "8", v1: "TEA", c1: "8", f1: 2, p3: "6", p4: "", v2: "TEP", c2: "6", f2: 1, dic: "", feb: "", final: "7" }));
const base = { anioLectivo: "2026", materia: "Matemática", curso: "2°", division: "1", turno: "MAÑANA", docente: "Prof. Test", preceptor: "", metricas: calcularMetricas([]) };
const texto = (bytes) => Buffer.from(bytes).toString("utf8");

test("crc32 estandar", () => assert.equal(crc32(new TextEncoder().encode("123456789")), 0xcbf43926));

test("xlsx valido: zip, hoja, Oficio vertical, filas de titulo y filtro", () => {
  const bytes = generarPlanillaXlsx({ ...base, estudiantes: alumnos(3) });
  const t = texto(bytes);
  assert.equal(bytes[0], 0x50);
  assert.equal(bytes[1], 0x4b);
  for (const parte of ["xl/workbook.xml", "xl/styles.xml", "xl/worksheets/sheet1.xml"]) assert.ok(t.includes(parte), parte);
  assert.match(t, /paperSize="14" orientation="portrait" fitToWidth="1" fitToHeight="1"/);
  assert.match(t, /Print_Titles[^<]*>Planilla!\$11:\$12/);
  assert.match(t, /<autoFilter ref="A12:N15"\/>/);
  assert.match(t, /<pane ySplit="12"/);
  assert.match(t, /PLANILLA OFICIAL DE CALIFICACIONES 2026/);
  assert.doesNotMatch(t, /<f>/); // sin formulas
});

test("notas e inasistencias se guardan como numeros", () => {
  const t = texto(generarPlanillaXlsx({ ...base, estudiantes: alumnos(1) }));
  assert.match(t, /<c r="F13" s="\d+"><v>8<\/v><\/c>/); // calificacion 1C
  assert.match(t, /<c r="G13" s="\d+"><v>2<\/v><\/c>/); // inasistencias 1C
});
