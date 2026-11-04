/* Catedras del panel de Direccion: dan alcance al docente. npm test */

import assert from "node:assert/strict";
import test, { after, before } from "node:test";
import { seedDesarrollo } from "../database/seeds/index.mjs";
import { resetStore } from "../database/memory-store.mjs";
import { userRepository } from "../database/repositories/user.repository.mjs";
import { signAccessToken } from "../modules/auth/token.service.mjs";
import { alcanceDe } from "../modules/preceptor-assignments/alcance.mjs";
import { apiRoutes } from "../routes/index.mjs";
import { createApp } from "../src/app.mjs";

const PUERTO = 3996;
let servidor;
let director;
let docente;

const pedir = (usuario, metodo, cuerpo) => fetch(`http://127.0.0.1:${PUERTO}/api/v1/docentes/catedras`, {
  method: metodo,
  headers: { Authorization: `Bearer ${signAccessToken(usuario)}`, "Content-Type": "application/json" },
  body: cuerpo ? JSON.stringify(cuerpo) : undefined
});

const catedra = (profesorId) => ({ id: "cat-x", anio: 5, numDivision: "3", materia: "Redes", profesor: profesorId ? { id: profesorId, nombre: "X" } : null });

before(async () => {
  resetStore();
  await seedDesarrollo();
  director = userRepository.findByEmail("director@prece.local");
  docente = userRepository.findByEmail("docente@prece.local");
  servidor = createApp(apiRoutes);
  await new Promise((listo) => servidor.listen(PUERTO, listo));
});

after(async () => {
  await new Promise((listo) => servidor.close(listo));
  resetStore();
});

test("asignar y quitar una catedra cambia el alcance y conserva lo demas", async () => {
  const previas = docente.assignments.length;
  assert.ok(!alcanceDe(docente).has("5-3"));

  assert.equal((await pedir(director, "PUT", { catedras: [catedra(docente.id)] })).status, 200);
  assert.ok(alcanceDe(userRepository.findById(docente.id)).has("5-3"));

  assert.equal((await (await pedir(director, "GET")).json()).data[0].materia, "Redes");

  assert.equal((await pedir(director, "PUT", { catedras: [catedra(null)] })).status, 200);
  const despues = userRepository.findById(docente.id);
  assert.ok(!alcanceDe(despues).has("5-3"));
  assert.equal(despues.assignments.length, previas);
});

test("un docente no puede cambiar la grilla y un dato invalido se rechaza", async () => {
  assert.equal((await pedir(docente, "PUT", { catedras: [catedra(docente.id)] })).status, 403);
  assert.equal((await pedir(director, "PUT", { catedras: [{ id: "a", anio: 99, numDivision: "1" }] })).status, 422);
});

test("una catedra no le da alcance a quien no es docente", async () => {
  const preceptor = userRepository.findByEmail("preceptor@prece.local");
  const previas = preceptor.assignments.length;
  await pedir(director, "PUT", { catedras: [catedra(preceptor.id)] });
  assert.equal(userRepository.findById(preceptor.id).assignments.length, previas);
});
