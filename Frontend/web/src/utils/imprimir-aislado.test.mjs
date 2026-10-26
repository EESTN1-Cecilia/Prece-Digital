import assert from "node:assert/strict";
import test from "node:test";
import { documentoDeImpresion, reglasQueCoinciden } from "./imprimir-aislado.js";

test("reglasQueCoinciden copia solo las reglas del documento, sin @media ni @page ajenos", () => {
  const reglas = [
    ".boletin-impreso { color: red; }",
    ".portal__banda { background: blue; }",
    "@media print { body * { visibility: hidden; } }",
    "@page { size: A4 portrait; }",
    ".boletin-impreso__tabla td { padding: 1mm; }"
  ];

  assert.deepEqual(reglasQueCoinciden(reglas, ["boletin-impreso"]), [
    ".boletin-impreso { color: red; }",
    ".boletin-impreso__tabla td { padding: 1mm; }"
  ]);
});

test("documentoDeImpresion arma un documento aislado con base, titulo escapado y estilos", () => {
  const html = documentoDeImpresion({ titulo: "Boletines 1° <1>", base: "http://localhost:5174/", estilos: "@page { margin: 4mm; }", html: "<main>x</main>" });

  assert.match(html, /^<!doctype html>/);
  assert.match(html, /<base href="http:\/\/localhost:5174\/">/);
  assert.match(html, /<title>Boletines 1° &lt;1&gt;<\/title>/);
  assert.match(html, /<style>@page \{ margin: 4mm; \}<\/style>/);
  assert.match(html, /<body><main>x<\/main><\/body>/);
});
