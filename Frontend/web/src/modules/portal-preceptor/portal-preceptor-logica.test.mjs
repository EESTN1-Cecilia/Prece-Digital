import assert from "node:assert/strict";
import test from "node:test";
import { diasParaGuardar, resumenCursos } from "./portal-preceptor-logica.js";

const ALUMNOS = [
  { id: "a1", orden: 1 },
  { id: "a2", orden: 2 }
];

test("diasParaGuardar envia solo los dias modificados y los alumnos marcados", () => {
  const original = { anio: 2026, mes: 10, alumnos: ALUMNOS, registros: { 1: { 5: "P" }, 2: { 5: "P" } } };
  const planilla = { anio: 2026, mes: 10, alumnos: ALUMNOS, registros: { 1: { 5: "P", 6: "A" }, 2: { 5: "T", 6: "" } } };

  assert.deepEqual(diasParaGuardar(planilla, original), [
    { fecha: "2026-10-05", registros: [{ alumnoId: "a1", estado: "presente" }, { alumnoId: "a2", estado: "tarde" }] },
    { fecha: "2026-10-06", registros: [{ alumnoId: "a1", estado: "ausente" }] }
  ]);
});

test("un dia vaciado por completo no se envia", () => {
  const original = { anio: 2026, mes: 10, alumnos: ALUMNOS, registros: { 1: {}, 2: {} } };
  const planilla = { anio: 2026, mes: 10, alumnos: ALUMNOS, registros: { 1: { 7: "" }, 2: {} } };
  assert.deepEqual(diasParaGuardar(planilla, original), []);
});

test("resumenCursos suma alumnos y junta los turnos", () => {
  assert.deepEqual(
    resumenCursos([
      { cantidadAlumnos: 30, turno: "mañana" },
      { cantidadAlumnos: 25, turno: "mañana" },
      { cantidadAlumnos: null, turno: "tarde" }
    ]),
    { divisiones: 3, alumnos: 55, turnos: ["mañana", "tarde"] }
  );
});
