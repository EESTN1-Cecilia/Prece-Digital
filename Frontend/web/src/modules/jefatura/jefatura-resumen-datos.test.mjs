import assert from "node:assert/strict";
import test from "node:test";
import { alumnosPorCategoria, categoriaDeDivision, resumenAlumnosPorAnio } from "./jefatura-resumen-datos.js";

test("1° a 3° es ciclo basico sin importar la orientacion", () => {
  assert.equal(categoriaDeDivision({ anio: 2, division: "1", orientacion: "Ciclo Básico" }), "basico");
});

test("la orientacion informada por la API manda", () => {
  assert.equal(categoriaDeDivision({ anio: 4, division: "1", orientacion: "Técnico en Programación" }), "programacion");
  assert.equal(categoriaDeDivision({ anio: 7, division: "2", orientacion: "Técnico en Informática" }), "informatica");
});

test("sin orientacion se usa el catalogo de la escuela", () => {
  assert.equal(categoriaDeDivision({ anio: 5, division: "3" }), "programacion");
  assert.equal(categoriaDeDivision({ anio: 5, division: "1" }), "informatica");
  assert.equal(categoriaDeDivision({ anio: 7, division: "2" }), "programacion");
});

test("el reparto suma el total de alumnos", () => {
  const filas = resumenAlumnosPorAnio([
    { anio: 1, division: "1", cantidad: 30, activos: 30 },
    { anio: 4, division: "1", cantidad: 20, activos: 20, orientacion: "Técnico en Informática" },
    { anio: 4, division: "3", cantidad: 10, activos: 10, orientacion: "Técnico en Programación" }
  ]);
  assert.deepEqual(alumnosPorCategoria(filas), { basico: 30, programacion: 10, informatica: 20 });
  assert.equal(filas[3].alumnos, 30);
});
