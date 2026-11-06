import assert from "node:assert/strict";
import test from "node:test";
import {
  convertirNotaALetras,
  sanitizarAnio,
  sanitizarCalificacion
} from "./alumno-matriz-wiew.js";

test("las notas aceptan solo valores numéricos entre 0 y 10", () => {
  assert.equal(sanitizarCalificacion("10", "9"), "10");
  assert.equal(sanitizarCalificacion("10.01", "9"), "9");
  assert.equal(sanitizarCalificacion("letra", "9"), "9");
  assert.equal(sanitizarCalificacion("8,5", "9"), "8.5");
  assert.equal(sanitizarCalificacion("8.", "8"), "8.");
  assert.equal(sanitizarCalificacion("8.5", "8."), "8.5");
});

test("la conversión a letras rechaza notas fuera de rango o texto parcial", () => {
  assert.equal(convertirNotaALetras("7.5"), "7.50 (SIETE CON 50/100)");
  assert.equal(convertirNotaALetras("11"), "");
  assert.equal(convertirNotaALetras("8abc"), "");
});

test("el año conserva únicamente cuatro dígitos como máximo", () => {
  assert.equal(sanitizarAnio("20a26"), "2026");
  assert.equal(sanitizarAnio("12345"), "1234");
});
