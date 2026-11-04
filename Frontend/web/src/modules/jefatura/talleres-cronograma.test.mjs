import assert from "node:assert/strict";
import test from "node:test";
import { CRONOGRAMA, cicloDeAnio, divisionesVisibles, gruposDeAnio, gruposDeDivision } from "./talleres-cronograma.js";
import { ANIOS, resumenAlumnosPorAnio, resumenTalleresPorAnio, talleresPorTipo, totalesPorCiclo } from "./jefatura-resumen-datos.js";

const DIVISIONES_BASICO = ["1", "2", "3", "4", "6"];
const DIVISIONES_SUPERIOR = ["1", "2", "3", "4"];
const DIVISIONES_7 = ["1", "2", "3"];
const divisionesDe = (anio) => (anio <= 3 ? DIVISIONES_BASICO : anio === 7 ? DIVISIONES_7 : DIVISIONES_SUPERIOR);

test("el cronograma trae todas las filas de la planilla, bien formadas", () => {
  assert.equal(CRONOGRAMA.length, 272);
  for (const fila of CRONOGRAMA) {
    assert.match(fila.grupo, /^[1-7]\.\d{1,2}$/);
    assert.ok(["mañana", "tarde"].includes(fila.turno));
    assert.ok([1, 2].includes(fila.franja));
    assert.ok(["lunes", "martes", "miercoles", "jueves", "viernes"].includes(fila.dia));
    assert.ok(fila.taller.length > 0);
    assert.equal(fila.grupo, `${fila.anio}.${fila.numero}`);
  }
});

test("de 1° a 6° los grupos impares dan taller a la mañana y los pares a la tarde (7° mezcla turnos por los proyectos)", () => {
  for (const fila of CRONOGRAMA.filter((item) => item.anio <= 6)) {
    assert.equal(fila.turno, fila.numero % 2 === 1 ? "mañana" : "tarde", fila.grupo);
  }
});

test("1°1 tiene los grupos 1.1 y 1.3, y el 1°2 los 1.2 y 1.4", () => {
  assert.deepEqual(gruposDeDivision(1, "1", DIVISIONES_BASICO), ["1.1", "1.3"]);
  assert.deepEqual(gruposDeDivision(1, "2", DIVISIONES_BASICO), ["1.2", "1.4"]);
  assert.deepEqual(gruposDeDivision(1, "3", DIVISIONES_BASICO), ["1.5", "1.7"]);
  assert.deepEqual(gruposDeDivision(1, "4", DIVISIONES_BASICO), ["1.6", "1.8"]);
  assert.deepEqual(gruposDeDivision(1, "6", DIVISIONES_BASICO), ["1.9", "1.11"]);
  assert.deepEqual(gruposDeDivision(4, "4", DIVISIONES_SUPERIOR), ["4.6", "4.8"]);
  assert.deepEqual(gruposDeDivision(1, "9", DIVISIONES_BASICO), []);
});

test("7°3 tiene los grupos 7.6 y 7.8 y el 7°4 no se muestra", () => {
  assert.deepEqual(gruposDeDivision(7, "1", DIVISIONES_7), ["7.1", "7.3"]);
  assert.deepEqual(gruposDeDivision(7, "2", DIVISIONES_7), ["7.2", "7.4"]);
  assert.deepEqual(gruposDeDivision(7, "3", DIVISIONES_7), ["7.6", "7.8"]);

  const catalogo = [{ anio: 7, division: "3" }, { anio: 7, division: "4" }, { anio: 6, division: "4" }];
  assert.deepEqual(divisionesVisibles(catalogo), [{ anio: 7, division: "3" }, { anio: 6, division: "4" }]);
});

test("toda division se reparte los grupos sin repetirlos y no sobra ningun grupo de la planilla", () => {
  for (const anio of ANIOS) {
    const reclamados = divisionesDe(anio).flatMap((division) => gruposDeDivision(anio, division, divisionesDe(anio)));
    assert.equal(new Set(reclamados).size, reclamados.length, `grupos repetidos en ${anio}°`);
    for (const numero of gruposDeAnio(anio)) {
      assert.ok(reclamados.includes(`${anio}.${numero}`), `${anio}.${numero} no pertenece a ninguna division`);
    }
  }
});

test("separa ciclo basico (1° a 3°) y superior (4° a 7°)", () => {
  assert.equal(cicloDeAnio(3), "basico");
  assert.equal(cicloDeAnio(4), "superior");
});

test("el resumen de talleres cuenta todas las sesiones y se parte en dos ciclos", () => {
  const porAnio = resumenTalleresPorAnio();
  const sesiones = totalesPorCiclo(porAnio, "sesiones");

  assert.equal(sesiones.basico + sesiones.superior, CRONOGRAMA.length);
  assert.equal(totalesPorCiclo(porAnio, "grupos").basico, 30);
  assert.equal(talleresPorTipo().reduce((suma, tipo) => suma + tipo.total, 0), CRONOGRAMA.length);
});

test("el resumen de alumnos suma la matricula por anio y ciclo", () => {
  const filas = resumenAlumnosPorAnio([
    { anio: 1, cantidad: 30, activos: 28 },
    { anio: 1, cantidad: 32, activos: 32 },
    { anio: 5, cantidad: 25, activos: 24 }
  ]);

  assert.equal(filas[0].alumnos, 62);
  assert.equal(filas[0].cursos, 2);
  assert.deepEqual(totalesPorCiclo(filas, "alumnos"), { basico: 62, superior: 25 });
});
