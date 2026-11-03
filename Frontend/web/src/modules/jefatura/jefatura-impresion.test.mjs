import assert from "node:assert/strict";
import test from "node:test";
import { armarDocumento, escaparHtml } from "./jefatura-impresion.js";
import { sesionesDeGrupo } from "./talleres-cronograma.js";

const resumen = (total, F, M) => ({ total, F, M, X: 0 });

const datos = {
  escuela: "E.E.S.T. N°1 Cecilia Berdichevski",
  curso: "1°1",
  ciclo: "Ciclo Básico",
  ahora: new Date(2026, 10, 3, 9, 30),
  grupos: [
    {
      letra: "A",
      codigo: "1.1",
      resumen: resumen(2, 1, 1),
      sesiones: sesionesDeGrupo("1.1"),
      alumnos: [
        { apellido: "Pérez <b>", nombre: "Ana", genero: "Mujer" },
        { apellido: "Gómez", nombre: "Luis", genero: "Varón" }
      ]
    },
    { letra: "B", codigo: "1.3", resumen: resumen(0, 0, 0), sesiones: [], alumnos: [] }
  ]
};

test("escaparHtml neutraliza etiquetas y comillas", () => {
  assert.equal(escaparHtml(`<a href="x">&'`), "&lt;a href=&quot;x&quot;&gt;&amp;&#39;");
  assert.equal(escaparHtml(null), "");
});

test("el documento completo trae una pagina por grupo", () => {
  const html = armarDocumento(datos);
  assert.equal(html.match(/<section class="pagina">/g).length, 2);
  assert.match(html, /Ciclo lectivo<\/span><strong>2026/);
  assert.match(html, /Grupo de taller<\/dt><dd>1\.3/);
});

test("imprimir un solo grupo deja solo ese grupo", () => {
  const html = armarDocumento(datos, "B");
  assert.equal(html.match(/<section class="pagina">/g).length, 1);
  assert.match(html, /Grupo 1\.3/);
  assert.match(html, /TAL-1\.3-2026/);
  assert.doesNotMatch(html, /Gómez/);
});

test("los nombres se escapan y la nomina va numerada", () => {
  const html = armarDocumento(datos, "A");
  assert.match(html, /Pérez &lt;b&gt;/);
  assert.match(html, /<td class="num">2<\/td>/);
  assert.match(html, /Total del grupo: <strong>2<\/strong>/);
});

test("un grupo sin cronograma ni alumnos muestra avisos", () => {
  const html = armarDocumento(datos, "B");
  assert.match(html, /no figura en la planilla/);
  assert.match(html, /no tiene alumnos asignados/);
});
