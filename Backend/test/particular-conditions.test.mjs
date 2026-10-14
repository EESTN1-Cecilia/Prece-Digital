/* Condiciones particulares de alumnos: catalogos, alta validada, duplicados de
   activas, listados con filtros y paginacion, modificacion y finalizacion con
   historial, e historial/resumen del alumno. Datos del seed de desarrollo. */

import assert from "node:assert/strict";
import test, { after, before, beforeEach } from "node:test";
import { createApp } from "../src/app.mjs";
import { apiRoutes } from "../routes/index.mjs";
import { resetStore } from "../database/memory-store.mjs";
import { seedDesarrollo } from "../database/seeds/index.mjs";

const PUERTO = 4014;
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

test("catalogos de condiciones particulares", async () => {
  const { status, cuerpo } = await pedir("GET", "/api/v1/particular-conditions/catalogos", "preceptor");

  assert.equal(status, 200);
  assert.ok(cuerpo.data.estadosCondicion.some((estado) => estado.valor === "activa"));
  assert.ok(cuerpo.data.estadosCondicion.some((estado) => estado.valor === "finalizada"));
  assert.ok(cuerpo.data.ordenesCondiciones.length > 0);
});

test("alta valida: responsable del token y estado por defecto", async () => {
  const alta = await pedir("POST", "/api/v1/students/alu-2/particular-conditions", "preceptor", {
    descripcion: "Usa anteojos recetados.",
    responsable: "Alguien inventado"
  });

  assert.equal(alta.status, 201);
  assert.equal(alta.cuerpo.data.alumno, "Gómez Ruiz, Carla");
  assert.notEqual(alta.cuerpo.data.responsable, "Alguien inventado");
  assert.equal(alta.cuerpo.data.estado, "activa");
  assert.equal(alta.cuerpo.data.activa, true);
  assert.equal(alta.cuerpo.data.fechaFinalizacion, null);
  assert.deepEqual(alta.cuerpo.data.historial, []);
});

test("validaciones del alta (422) y alumno inexistente (404)", async () => {
  const corta = await pedir("POST", "/api/v1/students/alu-2/particular-conditions", "preceptor", { descripcion: "abc" });
  assert.equal(corta.status, 422);
  assert.equal(corta.cuerpo.error.details[0].field, "descripcion");

  const futura = await pedir("POST", "/api/v1/students/alu-2/particular-conditions", "preceptor", {
    descripcion: "Condicion con fecha futura.",
    fechaInicio: "2999-01-01"
  });
  assert.equal(futura.status, 422);
  assert.equal(futura.cuerpo.error.details[0].field, "fechaInicio");

  const estadoInvalido = await pedir("POST", "/api/v1/students/alu-2/particular-conditions", "preceptor", {
    descripcion: "Estado invalido.",
    estado: "inventado"
  });
  assert.equal(estadoInvalido.status, 422);
  assert.equal(estadoInvalido.cuerpo.error.details[0].field, "estado");

  const inexistente = await pedir("POST", "/api/v1/students/alu-999/particular-conditions", "preceptor", {
    descripcion: "Alumno inexistente."
  });
  assert.equal(inexistente.status, 404);
});

test("no se permiten dos condiciones activas con la misma descripcion", async () => {
  const primera = await pedir("POST", "/api/v1/students/alu-2/particular-conditions", "preceptor", {
    descripcion: "Requiere dieta especial."
  });
  assert.equal(primera.status, 201);

  const duplicada = await pedir("POST", "/api/v1/students/alu-2/particular-conditions", "preceptor", {
    descripcion: "  requiere   dieta especial.  "
  });
  assert.equal(duplicada.status, 409);
});

test("listado con filtros, periodo y paginacion", async () => {
  const activas = await pedir("GET", "/api/v1/particular-conditions?estado=activa", "secretario");
  assert.equal(activas.status, 200);
  assert.ok(Array.isArray(activas.cuerpo.data));
  assert.ok(activas.cuerpo.data.every((condicion) => condicion.estado === "activa"));
  assert.equal(activas.cuerpo.filtros.estado, "activa");
  assert.equal(typeof activas.cuerpo.paginacion.total, "number");

  const finalizadas = await pedir("GET", "/api/v1/particular-conditions?estado=finalizada", "secretario");
  assert.ok(finalizadas.cuerpo.data.every((condicion) => condicion.estado === "finalizada"));

  const delAlumno = await pedir("GET", "/api/v1/particular-conditions?alumnoId=alu-1", "secretario");
  assert.equal(delAlumno.cuerpo.data.length, 2);

  const periodo = await pedir("GET", "/api/v1/particular-conditions?desde=2026-03-01&hasta=2026-03-31", "secretario");
  assert.ok(periodo.cuerpo.data.every((condicion) => condicion.fechaInicio >= "2026-03-01" && condicion.fechaInicio <= "2026-03-31"));

  const invalido = await pedir("GET", "/api/v1/particular-conditions?orden=inventado", "secretario");
  assert.equal(invalido.status, 422);
});

test("obtener una condicion y 404 si no existe", async () => {
  const encontrada = await pedir("GET", "/api/v1/particular-conditions/cond-1", "docente");
  assert.equal(encontrada.status, 200);
  assert.equal(encontrada.cuerpo.data.id, "cond-1");
  assert.equal(encontrada.cuerpo.data.activa, true);

  const ausente = await pedir("GET", "/api/v1/particular-conditions/cond-999", "docente");
  assert.equal(ausente.status, 404);
});

test("modificar solo una condicion activa, conservando el historial", async () => {
  const antes = await pedir("GET", "/api/v1/particular-conditions/cond-1", "preceptor");
  assert.equal(antes.cuerpo.data.historial.length, 0);

  const modificada = await pedir("PATCH", "/api/v1/particular-conditions/cond-1", "preceptor", {
    descripcion: "Requiere ubicacion en las primeras filas y textos con mayor tamano."
  });
  assert.equal(modificada.status, 200);
  assert.equal(modificada.cuerpo.data.historial.length, 1);
  assert.equal(modificada.cuerpo.data.historial[0].descripcion.includes("primeras filas"), true);

  const finalizada = await pedir("PATCH", "/api/v1/particular-conditions/cond-2", "preceptor", {
    descripcion: "Intento de modificar una finalizada."
  });
  assert.equal(finalizada.status, 409);
});

test("finalizar registra fecha y responsable y no borra el registro", async () => {
  const finalizada = await pedir("POST", "/api/v1/particular-conditions/cond-1/finalizar", "preceptor", {});

  assert.equal(finalizada.status, 200);
  assert.equal(finalizada.cuerpo.data.estado, "finalizada");
  assert.equal(finalizada.cuerpo.data.activa, false);
  assert.notEqual(finalizada.cuerpo.data.fechaFinalizacion, null);
  assert.equal(finalizada.cuerpo.data.finalizadoPorId !== null, true);
  assert.equal(finalizada.cuerpo.data.finalizadoPor, "Preceptor 1° A");

  const sigueExistiendo = await pedir("GET", "/api/v1/particular-conditions/cond-1", "preceptor");
  assert.equal(sigueExistiendo.status, 200);
  assert.equal(sigueExistiendo.cuerpo.data.estado, "finalizada");

  const repetida = await pedir("POST", "/api/v1/particular-conditions/cond-1/finalizar", "preceptor", {});
  assert.equal(repetida.status, 409);
});

test("historial y resumen del alumno", async () => {
  const historial = await pedir("GET", "/api/v1/alumnos/alu-1/condiciones", "preceptor");
  assert.equal(historial.status, 200);
  assert.equal(historial.cuerpo.data.total, 2);
  assert.equal(historial.cuerpo.data.activas, 1);
  assert.equal(historial.cuerpo.data.finalizadas, 1);
  assert.equal(historial.cuerpo.data.condiciones.length, 2);

  const resumen = await pedir("GET", "/api/v1/alumnos/alu-1/condiciones/resumen", "docente");
  assert.equal(resumen.status, 200);
  assert.equal(resumen.cuerpo.data.tieneCondiciones, true);
  assert.equal(resumen.cuerpo.data.total, 2);
  assert.equal(resumen.cuerpo.data.activas, 1);
  assert.equal(resumen.cuerpo.data.finalizadas, 1);
  assert.equal(resumen.cuerpo.data.ultimaFinalizacion, "2026-04-05");
});

test("listar las condiciones de un alumno por su id y alumno sin condiciones", async () => {
  const delAlumno = await pedir("GET", "/api/v1/students/alu-3/particular-conditions", "docente");
  assert.equal(delAlumno.status, 200);
  assert.equal(delAlumno.cuerpo.data.length, 1);

  const sinCondiciones = await pedir("GET", "/api/v1/students/alu-2/particular-conditions", "docente");
  assert.deepEqual(sinCondiciones.cuerpo.data, []);

  const resumen = await pedir("GET", "/api/v1/alumnos/alu-2/condiciones/resumen", "docente");
  assert.equal(resumen.cuerpo.data.tieneCondiciones, false);
  assert.equal(resumen.cuerpo.data.total, 0);
});

test("permisos: 401 sin token y 403 para el rol de solo lectura al escribir", async () => {
  const sinToken = await pedir("GET", "/api/v1/particular-conditions", null);
  assert.equal(sinToken.status, 401);

  const docenteLee = await pedir("GET", "/api/v1/particular-conditions", "docente");
  assert.equal(docenteLee.status, 200);

  const docenteEscribe = await pedir("POST", "/api/v1/students/alu-2/particular-conditions", "docente", {
    descripcion: "Sin permiso de escritura."
  });
  assert.equal(docenteEscribe.status, 403);
});
