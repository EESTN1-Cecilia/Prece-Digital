import assert from "node:assert/strict";
import test from "node:test";
import { AsistenciasService } from "./asistencias-service.js";

const alumnos = [
  { id: "a", orden: 1, apellido: "ALVAREZ", nombre: "Ana" },
  { id: "b", orden: 2, apellido: "BENITEZ", nombre: "Beto" }
];
const contexto = { cursoId: "1-1", mes: 4, anio: 2026, materia: null };

test("la planilla del servidor (por alumno) se muestra en la fila de cada alumno", () => {
  const guardada = { registros: { b: { 1: "A" }, a: { 2: "T" } }, observacionesPorAlumno: { b: "Certificado" }, version: 3 };
  const planilla = AsistenciasService._aPantalla(guardada, alumnos, contexto);
  assert.equal(planilla.registros[2][1], "A", "Beto (orden 2) tiene el ausente del día 1");
  assert.equal(planilla.registros[1][2], "T");
  assert.equal(planilla.registros[1][1], "P", "lo no marcado queda presente en día hábil (1/4/2026 es miércoles)");
  assert.equal(planilla.registros[1][4], "—", "4/4/2026 es sábado");
  assert.equal(planilla.observacionesPorAlumno[2], "Certificado");
  assert.equal(planilla.version, 3);
});

test("si entra un alumno nuevo y cambia el orden, las marcas siguen siendo de cada alumno", () => {
  const guardada = { registros: { b: { 1: "A" } }, version: 1 };
  const conNuevo = [{ id: "aa", orden: 1, apellido: "AAA", nombre: "Nuevo" }, { ...alumnos[0], orden: 2 }, { ...alumnos[1], orden: 3 }];
  const planilla = AsistenciasService._aPantalla(guardada, conNuevo, contexto);
  assert.equal(planilla.registros[3][1], "A", "Beto ahora es el orden 3 y conserva su ausente");
  assert.equal(planilla.registros[1][1], "P", "el alumno nuevo no hereda marcas ajenas");
});

test("al guardar se envia por id de alumno con la version leida", () => {
  const planilla = AsistenciasService._aPantalla({ registros: {}, version: 2 }, alumnos, contexto);
  planilla.registros[2][3] = "J";
  planilla.observacionesPorAlumno[1] = "  Llegó tarde  ";
  const cuerpo = AsistenciasService._aServidor(planilla);
  assert.equal(cuerpo.version, 2);
  assert.equal(cuerpo.registros.b[3], "J");
  assert.equal(cuerpo.observacionesPorAlumno.a, "Llegó tarde");
  assert.deepEqual(Object.keys(cuerpo.registros).sort(), ["a", "b"]);
});

test("una copia vieja del navegador se convierte buscando cada alumno por su id", () => {
  /* En la copia vieja Beto era el orden 1; hoy es el orden 2. */
  const copia = { alumnos: [{ id: "b", orden: 1 }, { id: "a", orden: 2 }], registros: { 1: { 5: "A" }, 2: { 6: "T" } }, observacionesPorAlumno: { 1: "Obs de Beto" } };
  const planilla = AsistenciasService._desdeCopiaLocal(copia, alumnos, contexto);
  assert.equal(planilla.registros[2][5], "A");
  assert.equal(planilla.registros[1][6], "T");
  assert.equal(planilla.observacionesPorAlumno[2], "Obs de Beto");
  assert.equal(planilla.version, 0, "se sube como planilla nueva");
});
