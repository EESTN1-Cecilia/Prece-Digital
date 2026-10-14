/* Listados de alumnos por curso, division, taller y grupo: autenticacion,
   permisos, validacion de parametros y resultados sobre el store en memoria. */

import assert from "node:assert/strict";
import test, { after, before, beforeEach } from "node:test";
import { createApp } from "../src/app.mjs";
import { apiRoutes } from "../routes/index.mjs";
import { resetStore } from "../database/memory-store.mjs";
import { seedAuthData } from "../database/seeds/auth.seed.mjs";
import { seedStudents } from "../database/seeds/students.seed.mjs";
import workshopsRepository from "../modules/workshops/workshops.repository.mjs";
import studentRepository from "../modules/students/students.repository.mjs";

const PUERTO = 4010;
const base = `http://127.0.0.1:${PUERTO}`;
let servidor;
let director;
let server;
let taller;

before(async () => {
  servidor = createApp(apiRoutes);
  await new Promise((listo) => servidor.listen(PUERTO, listo));
});

after(async () => {
  await new Promise((listo) => servidor.close(listo));
});

async function login(email, password) {
  const respuesta = await fetch(`${base}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  return (await respuesta.json()).accessToken;
}

beforeEach(async () => {
  resetStore();
  await seedAuthData();
  seedStudents();
  taller = workshopsRepository.create({ name: "Taller de Robotica", code: "ROB", schoolId: "esc-1" });
  studentRepository.update("alu-2", { tallerId: taller.id, grupoTaller: "A" });
  studentRepository.update("alu-3", { tallerId: taller.id, grupoTaller: "B" });
  director = await login("director@prece.local", "Director123!");
  server = await login("server@prece.local", "Server123!");
});

async function pedir(ruta, token) {
  const cabeceras = token ? { authorization: `Bearer ${token}` } : {};
  const respuesta = await fetch(`${base}/api/v1/students/listas${ruta}`, { headers: cabeceras });
  return { status: respuesta.status, cuerpo: await respuesta.json() };
}

test("un listado sin token devuelve 401 con el formato uniforme", async () => {
  const { status, cuerpo } = await pedir("/curso?anioCurso=1");

  assert.equal(status, 401);
  assert.deepEqual(Object.keys(cuerpo), ["error"]);
  assert.equal(cuerpo.error.code, "MISSING_TOKEN");
});

test("un token invalido devuelve 401", async () => {
  const { status } = await pedir("/curso?anioCurso=1", "token-roto");
  assert.equal(status, 401);
});

test("un rol sin students.read devuelve 403", async () => {
  const { status, cuerpo } = await pedir("/curso?anioCurso=1", server);

  assert.equal(status, 403);
  assert.equal(cuerpo.error.code, "FORBIDDEN");
});

test("listado por curso devuelve solo alumnos de ese anio", async () => {
  const { status, cuerpo } = await pedir("/curso?anioCurso=4", director);

  assert.equal(status, 200);
  assert.ok(cuerpo.data.length > 0);
  assert.ok(cuerpo.data.every((alumno) => alumno.curso === 4));
  assert.equal(cuerpo.contexto.tipo, "curso");
});

test("un curso fuera de rango devuelve 422", async () => {
  const { status, cuerpo } = await pedir("/curso?anioCurso=9", director);

  assert.equal(status, 422);
  assert.equal(cuerpo.error.code, "VALIDATION_ERROR");
  assert.equal(cuerpo.error.details[0].field, "anioCurso");
});

test("un orden no permitido devuelve 422", async () => {
  const { status, cuerpo } = await pedir("/curso?anioCurso=1&orden=random", director);

  assert.equal(status, 422);
  assert.equal(cuerpo.error.details[0].field, "orden");
});

test("una pagina invalida devuelve 422", async () => {
  const { status, cuerpo } = await pedir("/division?anioCurso=4&division=1&pagina=0", director);

  assert.equal(status, 422);
  assert.equal(cuerpo.error.details[0].field, "pagina");
});

test("listado por division trae turno y orientacion del catalogo", async () => {
  const { status, cuerpo } = await pedir("/division?anioCurso=4&division=1", director);

  assert.equal(status, 200);
  assert.equal(cuerpo.contexto.division.orientacion, "Técnico en Informática");
  assert.ok(cuerpo.data.every((alumno) => alumno.curso === 4 && alumno.division === "1"));
});

test("una division inexistente devuelve 404", async () => {
  const { status } = await pedir("/division?anioCurso=4&division=9", director);
  assert.equal(status, 404);
});

test("taller sin identificador devuelve 422", async () => {
  const { status, cuerpo } = await pedir("/taller", director);

  assert.equal(status, 422);
  assert.equal(cuerpo.error.details[0].field, "tallerId");
});

test("listado por taller y por grupo", async () => {
  const porTaller = await pedir(`/taller?tallerId=${taller.id}`, director);
  const porGrupo = await pedir(`/grupo?tallerId=${taller.id}&grupo=A`, director);
  const sinGrupo = await pedir(`/grupo?tallerId=${taller.id}`, director);

  assert.equal(porTaller.status, 200);
  assert.deepEqual(porTaller.cuerpo.data.map((alumno) => alumno.id).sort(), ["alu-2", "alu-3"]);
  assert.deepEqual(porGrupo.cuerpo.data.map((alumno) => alumno.id), ["alu-2"]);
  assert.equal(sinGrupo.status, 422);
  assert.equal(sinGrupo.cuerpo.error.details[0].field, "grupo");
});
