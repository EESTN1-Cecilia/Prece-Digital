import assert from "node:assert/strict";
import test from "node:test";
import {
  diasModificados,
  etiquetaTurno,
  expandirClases,
  filtrarAlumnos,
  hoyLocal,
  indicadores,
  planillaDesdeTomas,
  primerDiaDelMes,
  rangoDelMes,
  resumenRegistros,
  tomasParaGuardar
} from "./portal-docente-logica.js";

const CURSOS = [
  { id: "1-1", anio: 1, division: "1", materias: ["Matemática I", "Física"], turno: "manana", cantidadAlumnos: 3 },
  { id: "2-1", anio: 2, division: "1", materias: [], turno: "tarde", cantidadAlumnos: 2 }
];

const ALUMNOS = [
  { id: "a2", apellido: "Pérez", nombre: "Ana", dni: "40111222" },
  { id: "a1", apellido: "Acosta", nombre: "Luis", dni: "40333444" },
  { id: "a3", apellido: "Ríos", nombre: "Zoe", dni: "40555666" }
];

test("cada division + materia es una clase distinta; sin materia, una sola", () => {
  const clases = expandirClases(CURSOS);
  assert.deepEqual(clases.map((clase) => clase.clave), ["1-1|Matemática I", "1-1|Física", "2-1|"]);
  assert.equal(clases[0].turno, "Mañana");
  assert.equal(etiquetaTurno(null), null);
});

test("indicadores del inicio salen de los cursos reales", () => {
  assert.deepEqual(indicadores(CURSOS), { clases: 3, divisiones: 2, materias: 2, alumnos: 5 });
  assert.deepEqual(indicadores([]), { clases: 0, divisiones: 0, materias: 0, alumnos: 0 });
});

test("busqueda sin tildes por apellido, nombre o DNI y orden alfabetico", () => {
  assert.deepEqual(filtrarAlumnos(ALUMNOS).map((a) => a.id), ["a1", "a2", "a3"]);
  assert.deepEqual(filtrarAlumnos(ALUMNOS, "", "desc").map((a) => a.id), ["a3", "a2", "a1"]);
  assert.deepEqual(filtrarAlumnos(ALUMNOS, "perez").map((a) => a.id), ["a2"]);
  assert.deepEqual(filtrarAlumnos(ALUMNOS, "40555").map((a) => a.id), ["a3"]);
});

test("el resumen de una toma cuenta los alumnos sin marcar", () => {
  assert.deepEqual(resumenRegistros(ALUMNOS, { a1: "ausente", a2: "tarde" }), { total: 3, presente: 0, ausente: 1, tarde: 1, sinMarcar: 1 });
});

test("fechas locales y rango del mes", () => {
  const fecha = new Date(2026, 9, 23, 23, 30);
  assert.equal(hoyLocal(fecha), "2026-10-23");
  assert.equal(primerDiaDelMes(fecha), "2026-10-01");
  assert.deepEqual(rangoDelMes(2026, 2), { desde: "2026-02-01", hasta: "2026-02-28" });
});

const ALUMNOS_PLANILLA = [
  { id: "a1", orden: 1, apellido: "Acosta", nombre: "Luis", genero: null },
  { id: "a2", orden: 2, apellido: "Pérez", nombre: "Ana", genero: "F" }
];

const TOMAS = [
  { id: "t1", fecha: "2026-10-05", registros: [{ alumnoId: "a1", estado: "presente" }, { alumnoId: "a2", estado: "tarde" }] },
  { id: "t2", fecha: "2026-09-30", registros: [{ alumnoId: "a1", estado: "ausente" }] }
];

test("la planilla mensual se arma con las tomas del mes y deja vacios los dias sin clase", () => {
  const planilla = planillaDesdeTomas({ cursoId: "1-1", materia: "Física", mes: 10, anio: 2026, alumnos: ALUMNOS_PLANILLA, tomas: TOMAS });
  assert.deepEqual(planilla.registros, { 1: { 5: "P" }, 2: { 5: "T" } });
  assert.deepEqual(planilla.tomasPorDia, { 5: "t1" });
  assert.equal(planilla.alumnos[0].apellido, "ACOSTA");
  assert.equal(planilla.alumnos[0].genero, null);
});

test("al guardar se envian completos solo los dias modificados", () => {
  const original = planillaDesdeTomas({ cursoId: "1-1", materia: "Física", mes: 10, anio: 2026, alumnos: ALUMNOS_PLANILLA, tomas: TOMAS });
  const editada = structuredClone(original);
  editada.registros[1][5] = "A";
  editada.registros[1][6] = "P";
  editada.registros[2][6] = "P";
  editada.registros[1][7] = "P";

  assert.deepEqual(diasModificados(editada, original), [5, 6, 7]);
  const { tomas, incompletos } = tomasParaGuardar(editada, original);
  assert.deepEqual(incompletos, [7]);
  assert.deepEqual(tomas, [
    { fecha: "2026-10-05", registros: [{ alumnoId: "a1", estado: "ausente" }, { alumnoId: "a2", estado: "tarde" }] },
    { fecha: "2026-10-06", registros: [{ alumnoId: "a1", estado: "presente" }, { alumnoId: "a2", estado: "presente" }] }
  ]);
});
