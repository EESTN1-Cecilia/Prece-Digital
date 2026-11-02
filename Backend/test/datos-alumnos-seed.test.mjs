/* Seed de datos de alumnos (solo desarrollo): todos los alumnos activos quedan
   con notas del plan de su año, inasistencias, legajo completo y tutor, y el
   resultado es el mismo en cada arranque. */

import assert from "node:assert/strict";
import test, { beforeEach } from "node:test";
import { resetStore } from "../database/memory-store.mjs";
import { seedDesarrollo } from "../database/seeds/index.mjs";
import { seedDatosAlumnos } from "../database/seeds/alumnos-datos.seed.mjs";
import studentRepository from "../modules/students/students.repository.mjs";
import tutorsRepository from "../modules/tutors/tutors.repository.mjs";
import boletinOficialService from "../modules/boletin-oficial/boletin-oficial.service.mjs";
import { PLANES_BOLETIN } from "../../Shared/src/planes-boletin.mjs";

const CICLO = 2026;
const HOY = "2026-11-02";

beforeEach(async () => {
  resetStore();
  await seedDesarrollo();
});

test("cada alumno activo tiene 1° y 2° informe en todas las materias del plan de su año", () => {
  seedDatosAlumnos({ ciclo: CICLO, hoy: HOY });

  // Acosta, Simon: 1° 2°, antes sin ninguna nota
  const { notas } = boletinOficialService.obtener("alu-31", { anio: CICLO });
  const plan = [...PLANES_BOLETIN[1].formacionGeneral, ...PLANES_BOLETIN[1].tcoEspecifica];
  assert.equal(Object.keys(notas).length, plan.length);
  for (const fila of Object.values(notas)) {
    assert.ok(fila.informe1 && fila.informe2, JSON.stringify(fila));
  }

  for (const alumno of studentRepository.all().filter((item) => item.isActive)) {
    const registro = boletinOficialService.obtener(alumno.id, { anio: CICLO });
    assert.ok(Object.keys(registro.notas).length > 0, `${alumno.id} sin notas`);
  }
});

test("los alumnos de 2° en adelante tienen notas de los ciclos anteriores", () => {
  seedDatosAlumnos({ ciclo: CICLO, hoy: HOY });

  // Rossi, Dante: 7° año -> ciclos 2020 a 2026
  for (let ciclo = 2020; ciclo <= CICLO; ciclo += 1) {
    assert.ok(Object.keys(boletinOficialService.obtener("alu-12", { anio: ciclo }).notas).length > 0, `ciclo ${ciclo}`);
  }
  assert.equal(Object.keys(boletinOficialService.obtener("alu-12", { anio: 2019 }).notas).length, 0);
});

test("completa legajo y tutor, carga faltas hasta hoy y no toca a los inactivos", () => {
  const totales = seedDatosAlumnos({ ciclo: CICLO, hoy: HOY });
  assert.ok(totales.inasistencias > 0);
  assert.ok(totales.previas > 0);

  for (const alumno of studentRepository.all()) {
    assert.ok(alumno.fechaNacimiento && alumno.direccion, `${alumno.id} con legajo incompleto`);
    assert.ok(tutorsRepository.listRelations({ studentId: alumno.id }).length > 0, `${alumno.id} sin tutor`);
  }

  // Paredes, Luz (inactiva): legajo completo pero sin notas
  assert.deepEqual(boletinOficialService.obtener("alu-15", { anio: CICLO }).notas, {});

  // No pisa datos existentes
  assert.equal(studentRepository.findById("alu-1").fechaNacimiento, "2013-05-12");
});

test("genera los mismos datos en cada arranque", async () => {
  const primero = seedDatosAlumnos({ ciclo: CICLO, hoy: HOY });
  const notasPrimero = boletinOficialService.obtener("alu-20", { anio: CICLO }).notas;

  resetStore();
  await seedDesarrollo();
  assert.deepEqual(seedDatosAlumnos({ ciclo: CICLO, hoy: HOY }), primero);
  assert.deepEqual(boletinOficialService.obtener("alu-20", { anio: CICLO }).notas, notasPrimero);
});
