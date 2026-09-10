/* Listados de alumnos: autenticacion, permisos y validacion de parametros.
   Estos tests no requieren base de datos: cubren la proteccion de los endpoints
   y la validacion de entrada que corta antes de tocar la DB. */

import assert from "node:assert/strict";
import test, { after, before } from "node:test";
import { createApp } from "../src/app.mjs";
import { firmarToken } from "../utils/jwt.mjs";
import { listarCurso, listarDivision, listarGrupo, listarTaller } from "../modules/students/students.controller.mjs";

const PUERTO = 3998;
const base = `http://127.0.0.1:${PUERTO}`;
let servidor;

const rutasDePrueba = {
  "GET /listas/curso": listarCurso,
  "GET /listas/division": listarDivision,
  "GET /listas/grupo": listarGrupo,
  "GET /listas/taller": listarTaller
};

const ESCOLAR = {
  sub: "1",
  email: "director@prece.escuela.edu.ar",
  escuelaId: 1,
  roles: ["director"]
};

const OPERADOR = {
  sub: "2",
  email: "docente@prece.escuela.edu.ar",
  escuelaId: 1,
  roles: ["teacher"]
};

function tokenDe(payload) {
  return firmarToken(payload);
}

before(async () => {
  servidor = createApp(rutasDePrueba);
  await new Promise((listo) => servidor.listen(PUERTO, listo));
});

after(async () => {
  await new Promise((listo) => servidor.close(listo));
});

async function pedir(ruta, token) {
  const cabeceras = token ? { authorization: `Bearer ${token}` } : {};
  const respuesta = await fetch(`${base}${ruta}`, { headers: cabeceras });
  return { status: respuesta.status, cuerpo: await respuesta.json() };
}

test("un listado sin token devuelve 401", async () => {
  const { status, cuerpo } = await pedir("/listas/curso?anioCurso=1");

  assert.equal(status, 401);
  assert.equal(cuerpo.error.code, "UNAUTHENTICATED");
});

test("un token invalido devuelve 401", async () => {
  const { status } = await pedir("/listas/curso", "token-roto");

  assert.equal(status, 401);
});

test("un rol sin permiso devuelve 403", async () => {
  const { status, cuerpo } = await pedir("/listas/curso?anioCurso=1", tokenDe(OPERADOR));

  assert.equal(status, 403);
  assert.equal(cuerpo.error.code, "FORBIDDEN");
});

test("un curso fuera de rango devuelve 422", async () => {
  const { status, cuerpo } = await pedir("/listas/curso?anioCurso=9", tokenDe(ESCOLAR));

  assert.equal(status, 422);
  assert.equal(cuerpo.error.code, "VALIDATION_ERROR");
  assert.equal(cuerpo.error.details[0].field, "anioCurso");
});

test("un orden no permitido devuelve 422", async () => {
  const { status, cuerpo } = await pedir("/listas/curso?anioCurso=1&orden=random", tokenDe(ESCOLAR));

  assert.equal(status, 422);
  assert.equal(cuerpo.error.details[0].field, "orden");
});

test("una pagina invalida devuelve 422", async () => {
  const { status, cuerpo } = await pedir("/listas/division?anioDivisionId=1&pagina=0", tokenDe(ESCOLAR));

  assert.equal(status, 422);
  assert.equal(cuerpo.error.details[0].field, "pagina");
});

test("grupo sin identificador devuelve 422", async () => {
  const { status, cuerpo } = await pedir("/listas/grupo", tokenDe(ESCOLAR));

  assert.equal(status, 422);
  assert.equal(cuerpo.error.details[0].field, "grupoTallerId");
});

test("taller sin identificador devuelve 422", async () => {
  const { status, cuerpo } = await pedir("/listas/taller", tokenDe(ESCOLAR));

  assert.equal(status, 422);
  assert.equal(cuerpo.error.details[0].field, "materiaId");
});

test("la respuesta de autenticacion es uniforme con el resto de la API", async () => {
  const { status, cuerpo } = await pedir("/listas/curso?anioCurso=1");

  assert.equal(status, 401);
  assert.deepEqual(
    Object.keys(cuerpo),
    ["error"]
  );
  assert.equal(typeof cuerpo.error.message, "string");
});