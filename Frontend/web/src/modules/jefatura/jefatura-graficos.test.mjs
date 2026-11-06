import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { DistribucionAlumnos, escalaDeBarras } from "./jefatura-graficos.js";

const partes = [
  { etiqueta: "Ciclo Básico", detalle: "1° a 3° año", valor: 8, tono: "basico" },
  { etiqueta: "Programación", detalle: "4° a 7°", valor: 10, tono: "programacion" },
  { etiqueta: "Informática", detalle: "4° a 7°", valor: 4, tono: "informatica" }
];

test("la escala de barras se deriva del mayor valor y conserva el eje de conteos", () => {
  assert.deepEqual(escalaDeBarras(partes), [
    { valor: 0, posicion: "0%" },
    { valor: 3, posicion: "25%" },
    { valor: 6, posicion: "50%" },
    { valor: 9, posicion: "75%" },
    { valor: 12, posicion: "100%" }
  ]);
  assert.deepEqual(escalaDeBarras([{ valor: 0 }]), []);
});

test("la distribución se representa con barras y conserva conteos y porcentajes", () => {
  const markup = renderToStaticMarkup(DistribucionAlumnos({ partes, titulo: "Matrícula por orientación" }));

  assert.match(markup, /Matrícula por orientación\. Ciclo Básico: 8, Programación: 10, Informática: 4/);
  assert.match(markup, /jf-tono--basico[^>]*style="width:80%"/);
  assert.match(markup, /jf-tono--programacion[^>]*style="width:100%"/);
  assert.match(markup, /jf-tono--informatica[^>]*style="width:40%"/);
  assert.match(markup, /<strong>22<\/strong> alumnos en total/);
  assert.match(markup, /18 %/);
  assert.doesNotMatch(markup, /<svg|<circle/);
});
