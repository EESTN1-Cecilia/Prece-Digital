import test from "node:test";
import assert from "node:assert/strict";

import { anioDelAlumno, armarBoletinOficial, cicloDeAnio, cuerpoParaGuardar, planDelAnio, promedioGeneral, recalcularNota } from "./boletin-oficial-datos.js";

const alumno = { id: 7, apellido: "Perez", nombre: "Ana", dni: "99.000.007", curso: "2°", division: "1", turno: "Mañana", libro: "2026", folio: "07" };

test("el año sale del curso y el plan trae materias y titulo de taller", () => {
  assert.equal(anioDelAlumno(alumno), 2);
  assert.equal(anioDelAlumno({ curso: "1°1°" }), 1);
  assert.equal(planDelAnio(2).tituloTaller, "TCO. ESPECÍFICA / TALLER");
  assert.equal(planDelAnio(5, "Informática").tituloTaller, "FORMACIÓN TÉCNICA ESPECÍFICA");
  assert.notDeepEqual(planDelAnio(5, "Informática").taller, planDelAnio(5, "Programación").taller);
});

test("recalcularNota: promedio de informes y definitiva con diciembre/febrero", () => {
  assert.equal(recalcularNota({ informe1: "8", informe2: "7" }).promedioAnual, "7.5");
  assert.equal(recalcularNota({ informe1: "8", informe2: "" }).definitiva, "");
  assert.equal(recalcularNota({ informe1: "4", informe2: "5", diciembre: "6" }).definitiva, "6");
  assert.equal(recalcularNota({ informe1: "4", informe2: "5", diciembre: "6", febrero: "7" }).definitiva, "7");
});

test("el boletin se arma con las notas del backend y calcula promedio y definitiva", () => {
  const registro = {
    notas: { "MATEMATICA": { informe1: "9", informe2: "8", diciembre: "", febrero: "" }, "Otra clave": { informe1: "1" } },
    inasistencias: "4",
    pendientes: [{ materia: "FISICA", anio: "1" }],
    libroFolio: { libro: "2026", folio: "07" }
  };
  const b = armarBoletinOficial(alumno, 2, { registro, cicloLectivo: 2026 });
  assert.equal(b.notas["MATEMÁTICA"].informe1, "9"); // el nombre del backend (sin tilde) se reconoce
  assert.equal(b.notas["MATEMÁTICA"].definitiva, "8.5");
  assert.equal(b.notas["HISTORIA"].informe1, "");
  assert.equal(b.inasistencias, "4");
  assert.equal(b.pendientes.length, 4);
  assert.equal(b.pendientes[0].materia, "FISICA");
  assert.equal(promedioGeneral(b.notas, ["MATEMÁTICA"]), "8.5");
});

test("sin registro (alumno sin notas) el boletin queda en blanco", () => {
  const b = armarBoletinOficial(alumno, 2);
  assert.ok(Object.values(b.notas).every((n) => !n.informe1 && !n.definitiva));
});

test("lo que se guarda lleva solo las notas editables, sin promedios calculados", () => {
  const b = armarBoletinOficial(alumno, 2, { registro: { notas: {} } });
  b.notas.HISTORIA = recalcularNota({ ...b.notas.HISTORIA, informe1: "6", informe2: "6" });
  b.inasistencias = "4";
  const cuerpo = cuerpoParaGuardar(b);
  assert.deepEqual(cuerpo.notas.HISTORIA, { informe1: "6", informe2: "6", diciembre: "", febrero: "" });
  assert.equal(cuerpo.inasistencias, "4");
  assert.deepEqual(cuerpo.libroFolio, { libro: "2026", folio: "07" });
  assert.equal(cuerpo.pendientes.length, 4);
});

test("el ciclo lectivo se deduce del año de estudio del alumno", () => {
  const tercero = { curso: "3°" };
  assert.equal(cicloDeAnio(3, tercero, 2026), 2026);
  assert.equal(cicloDeAnio(1, tercero, 2026), 2024);
});
