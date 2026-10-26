import assert from "node:assert/strict";
import test from "node:test";
import { areaUtilMm, escalaParaPagina, PAPEL_OFICIO, reglaPagina, rellenoPorFila } from "./impresion.js";

test("la hoja es Oficio horizontal (340 x 216 mm) con 1 cm de margen, no A4 ni Legal", () => {
  assert.deepEqual([PAPEL_OFICIO.anchoMm, PAPEL_OFICIO.altoMm], [340, 216]);
  assert.equal(reglaPagina(), "@page { size: 340mm 216mm; margin: 10mm; }");
  assert.deepEqual(areaUtilMm(), { ancho: 320, alto: 196 });
});

test("la escala nunca agranda, achica lo justo y respeta el minimo legible", () => {
  assert.equal(escalaParaPagina(500, 760), 1);
  assert.equal(escalaParaPagina(0, 760), 1);
  assert.equal(escalaParaPagina(850, 760), 0.894);
  assert.equal(escalaParaPagina(2000, 760), 0.8);
  assert.equal(escalaParaPagina(2000, 760, 0.6), 0.6);
});

test("una planilla que sobra reparte el espacio libre entre sus filas", () => {
  assert.equal(rellenoPorFila(200, 20), 5);
  assert.equal(rellenoPorFila(0, 20), 0);
  assert.equal(rellenoPorFila(-30, 20), 0);
  assert.equal(rellenoPorFila(100, 0), 0);
});
