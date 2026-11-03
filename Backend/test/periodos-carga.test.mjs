/* Periodos de carga de notas: la Direccion bloquea y habilita cada periodo
   (1° y 2° cuatrimestre, diciembre, febrero) por ciclo lectivo. Con un periodo
   bloqueado docentes, preceptores y secretaria no cargan, modifican ni anulan
   notas de ese periodo, ni por la API de calificaciones ni por la planilla /
   boletin oficial. Admin y director no se restringen. */

import assert from "node:assert/strict";
import test, { after, before, beforeEach } from "node:test";
import { createApp } from "../src/app.mjs";
import { apiRoutes } from "../routes/index.mjs";
import { resetStore } from "../database/memory-store.mjs";
import { seedDesarrollo } from "../database/seeds/index.mjs";

const PUERTO = 4076;
const base = `http://127.0.0.1:${PUERTO}`;
const CICLO = 2026;
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
  tokens.admin = await login("admin@prece.local", "Admin123!");
  tokens.director = await login("director@prece.local", "Director123!");
  tokens.docente = await login("docente@prece.local", "Docente123!");
  tokens.secretario = await login("secretario@prece.local", "Secretaria123!");
});

async function pedir(method, ruta, quien, body) {
  const respuesta = await fetch(`${base}${ruta}`, {
    method,
    headers: {
      ...(quien ? { Authorization: `Bearer ${tokens[quien]}` } : {}),
      ...(body ? { "Content-Type": "application/json" } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  return { status: respuesta.status, cuerpo: await respuesta.json() };
}

const bloquear = (periodos, quien = "director") => pedir("PUT", `/api/v1/calificaciones/periodos/${CICLO}`, quien, { periodos });
const estado = (cuerpo, id) => cuerpo.data.periodos.find((periodo) => periodo.id === id);

/* ---------------- Consulta y cambio de estado ----------------------------- */

test("por defecto los cuatro periodos estan habilitados", async () => {
  const { status, cuerpo } = await pedir("GET", `/api/v1/calificaciones/periodos?anio=${CICLO}`, "docente");

  assert.equal(status, 200);
  assert.equal(cuerpo.data.anio, CICLO);
  assert.deepEqual(cuerpo.data.periodos.map((periodo) => periodo.id), ["cuatrimestre1", "cuatrimestre2", "diciembre", "febrero"]);
  assert.ok(cuerpo.data.periodos.every((periodo) => periodo.habilitado === true));
});

test("sin token no se consulta ni se cambia el estado (401)", async () => {
  assert.equal((await pedir("GET", "/api/v1/calificaciones/periodos")).status, 401);
  assert.equal((await pedir("PUT", `/api/v1/calificaciones/periodos/${CICLO}`, null, { periodos: { cuatrimestre1: false } })).status, 401);
});

test("solo la Direccion bloquea periodos: docente y secretaria reciben 403", async () => {
  assert.equal((await bloquear({ cuatrimestre1: false }, "docente")).status, 403);
  assert.equal((await bloquear({ cuatrimestre1: false }, "secretario")).status, 403);
  assert.equal((await bloquear({ cuatrimestre1: false }, "admin")).status, 200);
});

test("el director bloquea el 1° cuatrimestre y queda registrado quien lo hizo", async () => {
  const { status, cuerpo } = await bloquear({ cuatrimestre1: false });

  assert.equal(status, 200);
  assert.equal(estado(cuerpo, "cuatrimestre1").habilitado, false);
  assert.equal(estado(cuerpo, "cuatrimestre1").actualizadoPor.nombre, "Director Escuela 1");
  assert.ok(estado(cuerpo, "cuatrimestre1").actualizadoEn);
  assert.equal(estado(cuerpo, "cuatrimestre2").habilitado, true);

  const lectura = await pedir("GET", `/api/v1/calificaciones/periodos?anio=${CICLO}`, "docente");
  assert.equal(estado(lectura.cuerpo, "cuatrimestre1").habilitado, false);

  // Otro ciclo lectivo no se ve afectado
  const otro = await pedir("GET", "/api/v1/calificaciones/periodos?anio=2025", "docente");
  assert.equal(estado(otro.cuerpo, "cuatrimestre1").habilitado, true);
});

test("desbloquear vuelve a habilitar la carga", async () => {
  await bloquear({ cuatrimestre1: false });
  const { cuerpo } = await bloquear({ cuatrimestre1: true });
  assert.equal(estado(cuerpo, "cuatrimestre1").habilitado, true);

  const alta = await pedir("POST", "/api/v1/calificaciones", "docente", {
    alumnoId: "alu-1", materiaId: "mat", anio: CICLO, cuatrimestre: 1, tipoEvaluacion: "trabajo_practico", valor: "9", fecha: "2026-05-10"
  });
  assert.equal(alta.status, 201);
});

test("rechaza periodos inexistentes, estados no booleanos y ciclos invalidos (422)", async () => {
  assert.equal((await bloquear({ tercero: false })).status, 422);
  assert.equal((await bloquear({ cuatrimestre1: "no" })).status, 422);
  assert.equal((await bloquear({})).status, 422);
  assert.equal((await pedir("PUT", "/api/v1/calificaciones/periodos/abc", "director", { periodos: { cuatrimestre1: false } })).status, 422);
  assert.equal((await pedir("GET", "/api/v1/calificaciones/periodos?anio=1800", "docente")).status, 422);
});

/* ---------------- Efecto sobre la API de calificaciones ------------------- */

test("con el 1° cuatrimestre bloqueado el docente no carga, modifica ni anula notas de ese periodo (409)", async () => {
  await bloquear({ cuatrimestre1: false });

  const alta = await pedir("POST", "/api/v1/calificaciones", "docente", {
    alumnoId: "alu-1", materiaId: "mat", anio: CICLO, cuatrimestre: 1, tipoEvaluacion: "oral", valor: "9", fecha: "2026-05-10"
  });
  assert.equal(alta.status, 409);
  assert.equal(alta.cuerpo.error.code, "PERIODO_BLOQUEADO");
  assert.match(alta.cuerpo.error.message, /1° cuatrimestre/);

  // cal-1 es del 1° cuatrimestre y pertenece a la asignacion del docente
  assert.equal((await pedir("PATCH", "/api/v1/calificaciones/cal-1", "docente", { valor: "10" })).status, 409);
  assert.equal((await pedir("DELETE", "/api/v1/calificaciones/cal-1", "docente")).status, 409);

  // Tampoco puede moverla a un periodo habilitado
  const mover = await pedir("PATCH", "/api/v1/calificaciones/cal-1", "docente", { cuatrimestre: 2, tipoEvaluacion: "proyecto" });
  assert.equal(mover.status, 409);
  assert.equal(mover.cuerpo.error.code, "PERIODO_BLOQUEADO");
});

test("con el 1° cuatrimestre bloqueado el docente sigue cargando el 2°", async () => {
  await bloquear({ cuatrimestre1: false });

  const alta = await pedir("POST", "/api/v1/calificaciones", "docente", {
    alumnoId: "alu-1", materiaId: "mat", anio: CICLO, cuatrimestre: 2, tipoEvaluacion: "oral", valor: "9", fecha: "2026-08-30"
  });
  assert.equal(alta.status, 201);
});

test("no se puede pasar una nota de un periodo habilitado a uno bloqueado (409)", async () => {
  await bloquear({ cuatrimestre2: false });
  const patch = await pedir("PATCH", "/api/v1/calificaciones/cal-1", "docente", { cuatrimestre: 2, tipoEvaluacion: "proyecto" });
  assert.equal(patch.status, 409);
  assert.equal(patch.cuerpo.error.code, "PERIODO_BLOQUEADO");
});

test("admin y director cargan aunque el periodo este bloqueado", async () => {
  await bloquear({ cuatrimestre1: false });

  assert.equal((await pedir("PATCH", "/api/v1/calificaciones/cal-1", "director", { valor: "7" })).status, 200);
  assert.equal((await pedir("PATCH", "/api/v1/calificaciones/cal-1", "admin", { valor: "6" })).status, 200);
});

/* ---------------- Efecto sobre la planilla / boletin oficial -------------- */

const guardarBoletin = (quien, notas, detalle) =>
  pedir("PUT", "/api/v1/boletin-oficial/alumnos/alu-1", quien, { anio: CICLO, notas, ...(detalle ? { detalle } : {}) });

test("la planilla no guarda nada si alguna nota cae en un periodo bloqueado", async () => {
  await bloquear({ cuatrimestre2: false });

  const intento = await guardarBoletin("secretario", { Historia: { informe1: "8", informe2: "7" } });
  assert.equal(intento.status, 409);
  assert.equal(intento.cuerpo.error.code, "PERIODO_BLOQUEADO");

  // Ni siquiera el 1° cuatrimestre, que estaba habilitado: el guardado es todo o nada
  const lectura = await pedir("GET", `/api/v1/boletin-oficial/alumnos/alu-1?anio=${CICLO}`, "secretario");
  assert.equal(lectura.cuerpo.data.notas.Historia, undefined);
});

test("la planilla guarda los periodos habilitados si los bloqueados llegan sin cambios", async () => {
  await guardarBoletin("secretario", { Historia: { informe1: "8" } });
  await bloquear({ cuatrimestre1: false });

  // La planilla reenvia el 1° cuatrimestre igual que estaba y carga el 2°
  const guardado = await guardarBoletin("secretario", { Historia: { informe1: "8", informe2: "7", diciembre: "", febrero: "" } });
  assert.equal(guardado.status, 200, JSON.stringify(guardado.cuerpo));
  assert.equal(guardado.cuerpo.data.notas.Historia.informe1, "8");
  assert.equal(guardado.cuerpo.data.notas.Historia.informe2, "7");

  // Borrar la nota del periodo bloqueado tambien esta prohibido
  const borrar = await guardarBoletin("secretario", { Historia: { informe1: "" } });
  assert.equal(borrar.status, 409);
});

test("el detalle de un cuatrimestre bloqueado (parciales, faltas) conserva lo guardado", async () => {
  await guardarBoletin("secretario", { Historia: { informe1: "8" } }, { Historia: { p1: "7", f1: "2" } });
  await bloquear({ cuatrimestre1: false });

  const guardado = await guardarBoletin("secretario", { Historia: { informe2: "9" } }, { Historia: { p1: "1", f1: "9", p3: "6" } });
  assert.equal(guardado.status, 200, JSON.stringify(guardado.cuerpo));
  assert.deepEqual(guardado.cuerpo.data.detalle.Historia, { p1: "7", f1: "2", p3: "6" });
});

test("el director corrige el boletin aunque el periodo este bloqueado", async () => {
  await bloquear({ cuatrimestre1: false, diciembre: false, febrero: false });
  const guardado = await guardarBoletin("director", { Historia: { informe1: "9", diciembre: "7", febrero: "8" } });
  assert.equal(guardado.status, 200, JSON.stringify(guardado.cuerpo));
});

test("bloquear diciembre y febrero frena las instancias de intensificacion", async () => {
  await bloquear({ diciembre: false });
  assert.equal((await guardarBoletin("secretario", { Historia: { diciembre: "7" } })).status, 409);
  assert.equal((await guardarBoletin("secretario", { Historia: { febrero: "7" } })).status, 200);

  await bloquear({ febrero: false });
  assert.equal((await guardarBoletin("secretario", { Historia: { febrero: "9" } })).status, 409);
});
