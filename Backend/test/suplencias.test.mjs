/* Suplencias de preceptores: dan acceso solo mientras estan vigentes. npm test */

import assert from "node:assert/strict";
import test, { after, before, beforeEach } from "node:test";
import { getStore, resetStore } from "../database/memory-store.mjs";
import { seedDesarrollo } from "../database/seeds/index.mjs";
import { userRepository } from "../database/repositories/user.repository.mjs";
import { ROLES } from "../config/permissions.config.mjs";
import { hoyEnBuenosAires } from "../modules/calendario/calendario.fechas.mjs";
import { signAccessToken } from "../modules/auth/token.service.mjs";
import { alcanceDe, claveCurso } from "../modules/preceptor-assignments/alcance.mjs";
import studentRepository from "../modules/students/students.repository.mjs";
import { apiRoutes } from "../routes/index.mjs";
import { createApp } from "../src/app.mjs";

const PUERTO = 3995;
const RUTA = "/api/v1/preceptores/suplencias";
const hoy = hoyEnBuenosAires();
let servidor;
let director;
let titular;
let suplente;

function pedir(usuario, metodo, ruta, cuerpo) {
  return fetch(`http://127.0.0.1:${PUERTO}${ruta}`, {
    method: metodo,
    headers: { Authorization: `Bearer ${signAccessToken(usuario)}`, "Content-Type": "application/json" },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined
  });
}

const alta = (extra = {}) => ({ titularId: titular.id, suplenteId: suplente.id, desde: hoy, hasta: "2099-12-31", ...extra });
const actual = () => userRepository.findById(suplente.id);

before(async () => {
  resetStore();
  await seedDesarrollo();
  director = userRepository.findByEmail("director@prece.local");
  titular = userRepository.findByEmail("preceptor@prece.local");
  suplente = userRepository.create({
    email: "suplente@prece.local",
    passwordHash: "x",
    displayName: "Suplente",
    assignments: [{ role: ROLES.PRECEPTOR, schoolId: "esc-1" }]
  });
  servidor = createApp(apiRoutes);
  await new Promise((listo) => servidor.listen(PUERTO, listo));
});

beforeEach(() => {
  getStore().suplencias.length = 0;
});

after(async () => {
  await new Promise((listo) => servidor.close(listo));
  resetStore();
});

test("el suplente accede a los cursos del titular y deja de acceder al finalizar", async () => {
  const curso = titular.assignments.find((a) => a.cursos?.length).cursos[0];
  const clave = claveCurso(curso.curso, curso.division);
  const alumno = studentRepository.all().find((a) => claveCurso(a.curso, a.division) === clave);

  assert.equal((await pedir(suplente, "GET", `/api/v1/students/${alumno.id}`)).status, 403);

  const creada = await pedir(director, "POST", RUTA, alta());
  assert.equal(creada.status, 201);
  const { data } = await creada.json();
  assert.equal(data.estado, "vigente");
  assert.equal(data.creadoPor, director.id);

  assert.equal((await pedir(suplente, "GET", `/api/v1/students/${alumno.id}`)).status, 200);
  assert.ok(alcanceDe(titular).has(clave), "el titular conserva su acceso");

  const misCursos = await (await pedir(suplente, "GET", "/api/v1/preceptores/mis-cursos")).json();
  assert.ok(misCursos.data.some((item) => item.id === clave));

  assert.equal((await pedir(director, "POST", `${RUTA}/${data.id}/finalizar`)).status, 200);
  assert.equal((await pedir(suplente, "GET", `/api/v1/students/${alumno.id}`)).status, 403);
  assert.equal((await pedir(director, "POST", `${RUTA}/${data.id}/finalizar`)).status, 409);
});

test("una suplencia programada o vencida no da acceso", () => {
  const base = { titularId: titular.id, suplenteId: suplente.id, divisiones: ["1-1"], finalizadaEn: null };

  getStore().suplencias.push({ ...base, id: "a", desde: "2099-01-01", hasta: "2099-01-02" });
  assert.equal(alcanceDe(actual()).size, 0);

  getStore().suplencias.push({ ...base, id: "b", desde: "2000-01-01", hasta: "2000-01-02" });
  assert.equal(alcanceDe(actual()).size, 0);
});

test("si el titular pierde el curso, el suplente tambien", () => {
  getStore().suplencias.push({ id: "c", titularId: titular.id, suplenteId: suplente.id, divisiones: ["7-9"], desde: hoy, hasta: "2099-01-01", finalizadaEn: null });
  assert.equal(alcanceDe(actual()).size, 0);
});

test("valida datos y rechaza solapamientos", async () => {
  const fallo = async (extra, field) => {
    const respuesta = await pedir(director, "POST", RUTA, alta(extra));
    assert.equal(respuesta.status, 422);
    assert.ok((await respuesta.json()).error.details.some((d) => d.field === field), field);
  };

  await fallo({ suplenteId: titular.id }, "suplenteId");
  await fallo({ suplenteId: director.id }, "suplenteId");
  await fallo({ desde: "2099-02-02", hasta: "2099-02-01" }, "hasta");
  await fallo({ desde: "2000-01-01", hasta: "2000-01-02" }, "hasta");
  await fallo({ desde: "ayer" }, "desde");
  await fallo({ divisiones: ["7-9"] }, "divisiones");

  assert.equal((await pedir(director, "POST", RUTA, alta())).status, 201);
  assert.equal((await pedir(director, "POST", RUTA, alta())).status, 409);
});

test("solo quien gestiona identidad puede crear y el listado filtra por estado", async () => {
  assert.equal((await pedir(titular, "POST", RUTA, alta())).status, 403);

  await pedir(director, "POST", RUTA, alta());
  const vigentes = await (await pedir(director, "GET", `${RUTA}?estado=vigente`)).json();
  assert.equal(vigentes.data.length, 1);
  assert.equal(vigentes.data[0].suplente.id, suplente.id);

  const vencidas = await (await pedir(director, "GET", `${RUTA}?estado=vencida`)).json();
  assert.equal(vencidas.data.length, 0);
  assert.equal((await pedir(director, "GET", `${RUTA}?estado=otro`)).status, 422);
});
