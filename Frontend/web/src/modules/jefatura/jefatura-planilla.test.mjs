import assert from "node:assert/strict";
import test from "node:test";
import { armarDatosPlanilla, nombrePlanillaGrupo } from "./jefatura-planilla.js";
import { generarPlanillaPdf } from "../documents/planilla-pdf.js";
import { sesionesDeGrupo } from "./talleres-cronograma.js";

const grupo = {
  codigo: "1.1",
  sesiones: sesionesDeGrupo("1.1"),
  alumnos: [{ apellido: "Pérez", nombre: "Ana" }, { apellido: "Gómez", nombre: "Luis" }]
};
const division = { anio: 1, division: "1" };

test("arma los datos de la planilla del grupo", () => {
  const d = armarDatosPlanilla({ division, grupo, ahora: new Date(2026, 10, 3) });
  assert.equal(d.anioLectivo, "2026");
  assert.equal(d.materia, "Taller · Grupo 1.1");
  assert.equal(d.curso, "1°");
  assert.equal(d.estudiantes.length, 2);
  assert.equal(d.estudiantes[1].num, 2);
  assert.equal(d.metricas.total, 2);
  assert.match(d.docente, /Meza/);
  assert.equal(nombrePlanillaGrupo(d), "Planilla_Calificaciones_1ro_1ra_Taller_Grupo_1_1_2026.pdf");
});

test("un grupo sin alumnos ni cronograma igual genera el PDF", async () => {
  const d = armarDatosPlanilla({ division, grupo: { codigo: "9.9", sesiones: [], alumnos: [] } });
  assert.equal(d.docente, "A designar");
  const blob = await generarPlanillaPdf(d);
  assert.ok(blob.size > 500);
});
