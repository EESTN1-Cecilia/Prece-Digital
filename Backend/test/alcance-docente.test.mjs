/* Alcance del docente: solo los alumnos de sus cursos. npm test */

import assert from "node:assert/strict";
import test, { after, before } from "node:test";
import { seedDesarrollo } from "../database/seeds/index.mjs";
import { resetStore } from "../database/memory-store.mjs";
import { userRepository } from "../database/repositories/user.repository.mjs";
import { signAccessToken } from "../modules/auth/token.service.mjs";
import { alcanceDe, claveCurso } from "../modules/preceptor-assignments/alcance.mjs";
import studentRepository from "../modules/students/students.repository.mjs";
import { apiRoutes } from "../routes/index.mjs";
import { createApp } from "../src/app.mjs";

const PUERTO = 3997;
let servidor;
let docente;
let propio;
let ajeno;

const pedir = (ruta) => fetch(`http://127.0.0.1:${PUERTO}${ruta}`, { headers: { Authorization: `Bearer ${signAccessToken(docente)}` } });

before(async () => {
  resetStore();
  await seedDesarrollo();
  docente = userRepository.findByEmail("docente@prece.local");
  const alcance = alcanceDe(docente);
  const alumnos = studentRepository.all();
  propio = alumnos.find((a) => alcance.has(claveCurso(a.curso, a.division)));
  ajeno = alumnos.find((a) => !alcance.has(claveCurso(a.curso, a.division)));
  servidor = createApp(apiRoutes);
  await new Promise((listo) => servidor.listen(PUERTO, listo));
});

after(async () => {
  await new Promise((listo) => servidor.close(listo));
  resetStore();
});

test("el docente ve a sus alumnos y no a los de otros cursos", async () => {
  assert.equal((await pedir(`/api/v1/students/${propio.id}`)).status, 200);

  for (const ruta of [`/api/v1/students/${ajeno.id}`, `/api/v1/students/${ajeno.id}/tutors`, `/api/v1/alumnos/${ajeno.id}/condiciones`]) {
    assert.equal((await pedir(ruta)).status, 403, ruta);
  }
});

test("el anio lectivo de una respuesta no se confunde con el curso", async () => {
  const propios = await pedir(`/api/v1/boletin-oficial/resumen?anio=2026&curso=${propio.curso}&division=${propio.division}`);
  assert.equal(propios.status, 200);

  const ajenos = await pedir(`/api/v1/boletin-oficial/resumen?anio=2026&curso=${ajeno.curso}&division=${ajeno.division}`);
  assert.equal(ajenos.status, 403);
});

test("un listado no incluye alumnos ajenos", async () => {
  const texto = await (await pedir("/api/v1/students?limit=1000")).text();
  assert.ok(!texto.includes(`"id": "${ajeno.id}"`));
});

test("un docente sin cursos no ve a nadie y otro rol institucional no se acota", () => {
  assert.equal(alcanceDe({ id: "x", assignments: [{ role: "docente" }] }).size, 0);
  assert.equal(alcanceDe({ id: "x", assignments: [{ role: "docente" }, { role: "director" }] }), null);
});
