import { calcularMetricas } from "./planilla-estructura.js";
import test from "node:test";
import assert from "node:assert/strict";
import { generarPlanillaPdf, nombreArchivoPlanilla, PAGINA } from "./planilla-pdf.js";

const alumnos = (n) =>
  Array.from({ length: n }, (_, i) => ({
    num: i + 1, apellido: `Apellido${i + 1}`, nombre: "Nombre Largo Compuesto", dni: "40123456",
    p1: "7", p2: "8", v1: "TEA", c1: "8", f1: 2, p3: "6", p4: "", v2: "TEP", c2: "6", f2: 1, dic: "-", feb: "-", final: "7"
  }));
const base = { anioLectivo: "2026", materia: "Matemática", curso: "2°", division: "1", turno: "MAÑANA", docente: "Prof. Test", preceptor: "", metricas: calcularMetricas([]) };
const texto = async (blob) => Buffer.from(await blob.arrayBuffer()).toString("latin1");

test("Oficio vertical 21,6 x 33 cm", () => {
  assert.ok(Math.abs(PAGINA.ancho - 612.28) < 0.1 && Math.abs(PAGINA.alto - 935.43) < 0.1);
  assert.ok(PAGINA.alto > PAGINA.ancho);
});

test("hasta ~60 alumnos entran en una sola hoja; muchos mas: varias, con firmas y numeracion", async () => {
  const una = await texto(await generarPlanillaPdf({ ...base, estudiantes: alumnos(5) }));
  assert.match(una, /\/Count 1 /);
  assert.match(una, /MediaBox \[0 0 612\.28 935\.43\]/);
  assert.match(una, /Página 1 de 1/);
  const cuarenta = await texto(await generarPlanillaPdf({ ...base, estudiantes: alumnos(45) }));
  assert.match(cuarenta, /\/Count 1 /);
  const varias = await texto(await generarPlanillaPdf({ ...base, estudiantes: alumnos(80) }));
  assert.match(varias, /\/Count (2|3) /);
  assert.match(varias, /Apellido80/);
  assert.match(varias, /Sello y firma de Direcci/);
});

test("nombre de archivo descriptivo", () => {
  assert.equal(nombreArchivoPlanilla({ ...base }), "Planilla_Calificaciones_2do_1ra_Matematica_2026.pdf");
});
