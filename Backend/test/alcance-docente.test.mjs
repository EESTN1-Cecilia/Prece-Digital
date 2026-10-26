/* Alcance por curso del docente: solo ve alumnos, perfiles y boletines de los
   cursos que tiene asignados (seed: docente@prece.local -> 1°1, 2°1 y 3°3). */

import assert from "node:assert/strict";
import test, { after, before, beforeEach } from "node:test";
import { createApp } from "../src/app.mjs";
import { apiRoutes } from "../routes/index.mjs";
import { resetStore } from "../database/memory-store.mjs";
import { seedDesarrollo } from "../database/seeds/index.mjs";

const PUERTO = 4031;
const base = `http://127.0.0.1:${PUERTO}`;
const CURSOS_DOCENTE = ["1-1", "2-1", "3-3"];
let servidor;
const tokens = {};

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
  await seedDesarrollo();
  tokens.docente = await login("docente@prece.local", "Docente123!");
  tokens.secretario = await login("secretario@prece.local", "Secretaria123!");
});

async function pedir(ruta, quien) {
  const respuesta = await fetch(`${base}${ruta}`, { headers: { Authorization: `Bearer ${tokens[quien]}` } });
  return { status: respuesta.status, cuerpo: await respuesta.json() };
}

function claveAlumno(alumno) {
  return `${String(alumno.curso).replace(/\D/g, "")}-${alumno.division}`;
}

test("mis-cursos devuelve solo los cursos asignados al docente", async () => {
  const { status, cuerpo } = await pedir("/api/v1/docente/mis-cursos", "docente");

  assert.equal(status, 200);
  assert.equal(cuerpo.restringido, true);
  assert.deepEqual(cuerpo.data.map((curso) => curso.id), CURSOS_DOCENTE);
  assert.equal(cuerpo.data[0].materia, "Matemática I");
});

test("el listado de alumnos del docente solo trae sus cursos", async () => {
  const docente = await pedir("/api/v1/students?limit=100&estado=todos", "docente");
  const secretario = await pedir("/api/v1/students?limit=100&estado=todos", "secretario");

  assert.equal(docente.status, 200);
  assert.ok(docente.cuerpo.data.length > 0);
  assert.ok(docente.cuerpo.data.every((alumno) => CURSOS_DOCENTE.includes(claveAlumno(alumno))));
  assert.ok(secretario.cuerpo.data.length > docente.cuerpo.data.length, "el secretario ve toda la escuela");

  const filtroAjeno = await pedir("/api/v1/students?curso=4&division=1", "docente");
  assert.equal(filtroAjeno.status, 200);
  assert.deepEqual(filtroAjeno.cuerpo.data, []);
});

test("el catalogo de divisiones del docente solo trae sus cursos", async () => {
  const { status, cuerpo } = await pedir("/api/v1/students/divisions", "docente");

  assert.equal(status, 200);
  assert.deepEqual(cuerpo.data.map((division) => division.id).sort(), CURSOS_DOCENTE);
});

test("perfil y resumen: permitido en su curso, 403 fuera de el", async () => {
  /* alu-1 cursa 1°1 (asignado); alu-2 cursa 4°1 (no asignado). */
  assert.equal((await pedir("/api/v1/students/alu-1/profile", "docente")).status, 200);
  assert.equal((await pedir("/api/v1/students/alu-1/summary", "docente")).status, 200);
  assert.equal((await pedir("/api/v1/students/alu-2/profile", "docente")).status, 403);
  assert.equal((await pedir("/api/v1/students/alu-2/summary", "docente")).status, 403);
  assert.equal((await pedir("/api/v1/students/alu-2", "docente")).status, 403);
  assert.equal((await pedir("/api/v1/students/alu-2/profile", "secretario")).status, 200);
});

test("boletin y calificaciones: solo de sus cursos", async () => {
  assert.equal((await pedir("/api/v1/alumnos/alu-1/calificaciones/resumen", "docente")).status, 200);
  assert.equal((await pedir("/api/v1/alumnos/alu-2/calificaciones/resumen", "docente")).status, 403);
  assert.equal((await pedir("/api/v1/alumnos/alu-2/inasistencias", "docente")).status, 403);

  const propio = await pedir("/api/v1/preceptor/boletin/1-1", "docente");
  assert.equal(propio.status, 200);
  assert.ok(Array.isArray(propio.cuerpo.data));

  const ajeno = await pedir("/api/v1/preceptor/boletin/4-1", "docente");
  assert.notEqual(ajeno.status, 200);
});
