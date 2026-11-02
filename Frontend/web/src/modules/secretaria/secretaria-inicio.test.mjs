import assert from "node:assert/strict";
import test from "node:test";
import { ACCIONES, DOCUMENTOS, fechaLarga, itemsParaRevisar, plural, saludo } from "./secretaria-inicio.js";

const tablero = {
  alertas: [
    { id: "alt-doc-alu-9", titulo: "Legajo incompleto", alumno: "Garcia, Sofia (4° 1)", prioridad: "media", recurso: "#/alumnos/alu-9" },
    { id: "alt-acad-alu-3", titulo: "3 materia(s) desaprobadas o pendientes", alumno: "Fernández Díaz, Diego (4° 1)", prioridad: "alta", recurso: "#/alumnos/alu-3" },
    { id: "alt-cond-alu-3", titulo: "Alumno en condición irregular", alumno: "Fernández Díaz, Diego (4° 1)", prioridad: "alta", recurso: "#/alumnos/alu-3" }
  ],
  inasistencias: {
    alumnosAtencion: [{ id: "alu-5", nombre: "Soria Ríos, Florencia", curso: "1° 1", injustificadas: 2, pendientes: 1, estado: "En riesgo" }]
  }
};

test("una fila por alumno, lo urgente primero y en palabras simples", () => {
  const items = itemsParaRevisar(tablero);

  assert.equal(items.length, 3);
  assert.equal(items[0].alumno, "Fernández Díaz, Diego (4° 1)");
  assert.equal(items[0].urgencia, "alta");
  assert.deepEqual(items[0].motivos, ["3 materias sin aprobar.", "Su condición figura como irregular."]);
  assert.deepEqual(items[0].alertaIds, ["alt-acad-alu-3", "alt-cond-alu-3"]);
  assert.deepEqual(items[1].motivos, ["Faltan datos en el legajo: fecha de nacimiento o domicilio."]);
  assert.deepEqual(items[2].motivos, ["3 faltas sin justificar: 2 sin justificación y 1 esperando nota."]);
  assert.equal(items[2].href, "#/alumnos/alu-5");
});

test("las faltas se suman a la fila del alumno y no se pueden marcar como revisadas", () => {
  const conFaltas = {
    alertas: [{ id: "alt-doc-alu-5", titulo: "Legajo incompleto", alumno: "Soria Ríos, Florencia (1° 1)", prioridad: "media", recurso: "#/alumnos/alu-5" }],
    inasistencias: tablero.inasistencias
  };
  const [fila] = itemsParaRevisar(conFaltas);
  assert.equal(fila.motivos.length, 2);
  assert.deepEqual(fila.alertaIds, ["alt-doc-alu-5"]);
  assert.deepEqual(itemsParaRevisar({ inasistencias: tablero.inasistencias })[0].alertaIds, []);
  assert.deepEqual(itemsParaRevisar(null), []);
});

test("cada tarea navega a una ruta o abre un modal conocido", () => {
  const modales = ["documentos", "libro-matriz"];
  for (const accion of ACCIONES) {
    assert.ok(accion.href?.startsWith("#/") || modales.includes(accion.id), accion.id);
  }
  assert.deepEqual(DOCUMENTOS.map((documento) => documento.tipo), ["alumno_regular", "situacion_academica", "tramite_pase", "rite"]);
});

test("textos de saludo, fecha y plurales", () => {
  assert.equal(saludo(new Date(2026, 10, 2, 9), "Marta"), "Buenos días, Marta");
  assert.equal(saludo(new Date(2026, 10, 2, 16)), "Buenas tardes");
  assert.equal(saludo(new Date(2026, 10, 2, 21)), "Buenas noches");
  assert.match(fechaLarga(new Date(2026, 10, 2, 12)), /^Hoy es lunes 2 de noviembre de 2026$/);
  assert.equal(plural(1, "falta", "faltas"), "1 falta");
  assert.equal(plural(4, "falta", "faltas"), "4 faltas");
});
