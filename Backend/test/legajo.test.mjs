/* Legajo del alumno: resumen, perfil, observaciones, pases, constancias, alertas
   y tablero de secretaria. Datos de todos los modulos (seed de desarrollo). */

import assert from "node:assert/strict";
import test, { after, before, beforeEach } from "node:test";
import { createApp } from "../src/app.mjs";
import { apiRoutes } from "../routes/index.mjs";
import { resetStore } from "../database/memory-store.mjs";
import { seedDesarrollo } from "../database/seeds/index.mjs";

const PUERTO = 4012;
const base = `http://127.0.0.1:${PUERTO}`;
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
  tokens.secretario = await login("secretario@prece.local", "Secretaria123!");
  tokens.preceptor = await login("preceptor@prece.local", "Preceptor123!");
  tokens.docente = await login("docente@prece.local", "Docente123!");
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

test("resumen del alumno con datos del legajo y de la situacion academica", async () => {
  const { status, cuerpo } = await pedir("GET", "/api/v1/students/alu-1/summary", "preceptor");

  assert.equal(status, 200);
  assert.equal(cuerpo.data.datosPersonales.apellido, "Pérez López");
  assert.equal(cuerpo.data.informacionEscolar.curso, "1°");
  assert.ok(cuerpo.data.estadoAcademico.materiasPendientes >= 1, "alu-1 tiene una materia pendiente en el seed");
  assert.equal(cuerpo.data.inasistencias.disponible, false);
});

test("perfil completo incluye tutores y permisos de accion segun el rol", async () => {
  const secretaria = await pedir("GET", "/api/v1/students/alu-1/profile", "secretario");
  const docente = await pedir("GET", "/api/v1/students/alu-1/profile", "docente");

  assert.equal(secretaria.status, 200);
  assert.ok(secretaria.cuerpo.data.tutores.length >= 2);
  assert.equal(secretaria.cuerpo.data.permisosAcciones.puedeModificar, true);
  assert.equal(docente.cuerpo.data.permisosAcciones.puedeModificar, false);
});

test("un alumno inexistente devuelve 404", async () => {
  const { status } = await pedir("GET", "/api/v1/students/alu-999/summary", "secretario");
  assert.equal(status, 404);
});

test("observaciones: alta validada, responsable del token y listado", async () => {
  const invalida = await pedir("POST", "/api/v1/students/alu-2/observations", "preceptor", { tipo: "Otra" });
  assert.equal(invalida.status, 422);

  const alta = await pedir("POST", "/api/v1/students/alu-2/observations", "preceptor", {
    tipo: "Convivencia",
    descripcion: "Llego tarde tres veces esta semana.",
    responsable: "Alguien inventado"
  });
  assert.equal(alta.status, 201);
  assert.equal(alta.cuerpo.data.alumno, "Gómez Ruiz, Carla");
  assert.notEqual(alta.cuerpo.data.responsable, "Alguien inventado");

  const delAlumno = await pedir("GET", "/api/v1/students/alu-2/observations", "docente");
  const todas = await pedir("GET", "/api/v1/observations", "secretario");
  assert.equal(delAlumno.cuerpo.data.length, 1);
  assert.equal(todas.cuerpo.data.length, 1);

  const docenteEscribe = await pedir("POST", "/api/v1/students/alu-2/observations", "docente", {
    tipo: "Académica",
    descripcion: "x"
  });
  assert.equal(docenteEscribe.status, 403);
});

test("pase y constancia", async () => {
  const pase = await pedir("POST", "/api/v1/students/alu-4/transfers", "secretario", { motivo: "Mudanza", colegioDestino: "EEST N2" });
  assert.equal(pase.status, 201);
  assert.equal(pase.cuerpo.data.estado, "Iniciado");

  const paseInvalido = await pedir("POST", "/api/v1/students/alu-4/transfers", "secretario", {});
  assert.equal(paseInvalido.status, 422);

  const constancia = await pedir("POST", "/api/v1/students/alu-4/certificate", "preceptor");
  assert.equal(constancia.status, 201);
  assert.match(constancia.cuerpo.data.textoOficial, /Álvarez Castro, Elena/);
});

test("tablero de secretaria con datos reales y alertas descartables", async () => {
  const { status, cuerpo } = await pedir("GET", "/api/v1/dashboard/secretaria", "secretario");

  assert.equal(status, 200);
  assert.equal(cuerpo.data.resumenAlumnos.total, 32);
  assert.equal(cuerpo.data.resumenAlumnos.inactivos, 1);
  assert.ok(cuerpo.data.alumnosPorCurso.length > 0);
  assert.ok(cuerpo.data.alertas.length > 0);

  const alerta = cuerpo.data.alertas[0];
  const descarte = await pedir("POST", `/api/v1/alerts/${alerta.id}/dismiss`, "secretario");
  assert.equal(descarte.status, 200);

  const despues = await pedir("GET", "/api/v1/dashboard/secretaria", "secretario");
  assert.ok(!despues.cuerpo.data.alertas.some((item) => item.id === alerta.id));
});

test("directorio de divisiones y busqueda libre del listado", async () => {
  const divisiones = await pedir("GET", "/api/v1/students/divisions", "preceptor");
  assert.equal(divisiones.status, 200);
  assert.equal(divisiones.cuerpo.data.length, 27);
  assert.equal(divisiones.cuerpo.data.find((division) => division.id === "4-1").activos, 4);

  const busqueda = await pedir("GET", "/api/v1/students?q=carla", "preceptor");
  assert.deepEqual(busqueda.cuerpo.data.map((alumno) => alumno.id), ["alu-2"]);

  const turno = await pedir("GET", "/api/v1/students?turno=tarde&porPagina=100", "preceptor");
  assert.ok(turno.cuerpo.data.every((alumno) => alumno.turno === "tarde"));
  assert.equal((await pedir("GET", "/api/v1/students?turno=noche", "preceptor")).status, 422);
});
