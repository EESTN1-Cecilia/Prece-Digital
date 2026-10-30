/* Observaciones de alumnos: catalogos, alta validada, listados con filtros y
   paginacion, modificacion con historial, seguimientos e historial/resumen del
   alumno. Datos del seed de desarrollo. */

import assert from "node:assert/strict";
import test, { after, before, beforeEach } from "node:test";
import { createApp } from "../src/app.mjs";
import { apiRoutes } from "../routes/index.mjs";
import { resetStore } from "../database/memory-store.mjs";
import { seedDesarrollo } from "../database/seeds/index.mjs";
import { asignarCursosAlPreceptorGeneral } from "./helpers.mjs";

const PUERTO = 4013;
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
  await asignarCursosAlPreceptorGeneral();
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

test("catalogos de observaciones", async () => {
  const { status, cuerpo } = await pedir("GET", "/api/v1/observations/catalogos", "preceptor");

  assert.equal(status, 200);
  assert.ok(cuerpo.data.tiposObservacion.some((tipo) => tipo.valor === "Convivencia"));
  assert.ok(cuerpo.data.estadosObservacion.some((estado) => estado.valor === "Activa"));
  assert.ok(cuerpo.data.sectoresSugeridos.length > 0);
  assert.ok(cuerpo.data.estadosSeguimiento.some((estado) => estado.valor === "pendiente"));
});

test("alta valida: responsable del token y estado por defecto", async () => {
  const alta = await pedir("POST", "/api/v1/students/alu-2/observations", "preceptor", {
    tipo: "Convivencia",
    descripcion: "Interrumpio la clase en dos oportunidades.",
    responsable: "Alguien inventado"
  });

  assert.equal(alta.status, 201);
  assert.equal(alta.cuerpo.data.alumno, "Gómez Ruiz, Carla");
  assert.notEqual(alta.cuerpo.data.responsable, "Alguien inventado");
  assert.equal(alta.cuerpo.data.estado, "Activa");
  assert.deepEqual(alta.cuerpo.data.historial, []);
  assert.equal(alta.cuerpo.data.tipoDescripcion.length > 0, true);
});

test("validaciones del alta (422) y alumno inexistente (404)", async () => {
  const tipo = await pedir("POST", "/api/v1/students/alu-2/observations", "preceptor", { tipo: "Otra", descripcion: "x" });
  assert.equal(tipo.status, 422);
  assert.equal(tipo.cuerpo.error.details[0].field, "tipo");

  const descripcion = await pedir("POST", "/api/v1/students/alu-2/observations", "preceptor", { tipo: "Académica" });
  assert.equal(descripcion.status, 422);
  assert.equal(descripcion.cuerpo.error.details[0].field, "descripcion");

  const futura = await pedir("POST", "/api/v1/students/alu-2/observations", "preceptor", {
    tipo: "Académica",
    descripcion: "Fecha futura.",
    fecha: "2999-01-01"
  });
  assert.equal(futura.status, 422);
  assert.equal(futura.cuerpo.error.details[0].field, "fecha");

  const inexistente = await pedir("POST", "/api/v1/students/alu-999/observations", "preceptor", {
    tipo: "Académica",
    descripcion: "Alumno inexistente."
  });
  assert.equal(inexistente.status, 404);
});

test("listado con filtros, orden y paginacion", async () => {
  const { status, cuerpo } = await pedir("GET", "/api/v1/observations?tipo=Convivencia", "secretario");

  assert.equal(status, 200);
  assert.ok(Array.isArray(cuerpo.data));
  assert.ok(cuerpo.data.every((observacion) => observacion.tipo === "Convivencia"));
  assert.equal(cuerpo.filtros.tipo, "Convivencia");
  assert.equal(typeof cuerpo.paginacion.total, "number");
  assert.equal(cuerpo.paginacion.pagina, 1);

  const invalido = await pedir("GET", "/api/v1/observations?orden=inventado", "secretario");
  assert.equal(invalido.status, 422);
});

test("obtener una observacion y 404 si no existe", async () => {
  const encontrada = await pedir("GET", "/api/v1/observations/obs-1", "docente");
  assert.equal(encontrada.status, 200);
  assert.equal(encontrada.cuerpo.data.id, "obs-1");
  assert.equal(encontrada.cuerpo.data.seguimiento.total, 1);

  const ausente = await pedir("GET", "/api/v1/observations/obs-999", "docente");
  assert.equal(ausente.status, 404);
});

test("modificar una observacion conserva el historial y la marca como modificada", async () => {
  const antes = await pedir("GET", "/api/v1/observations/obs-2", "preceptor");
  assert.equal(antes.cuerpo.data.estado, "Activa");

  const modificada = await pedir("PATCH", "/api/v1/observations/obs-2", "preceptor", {
    descripcion: "No presento los trabajos practicos del primer y segundo bimestre."
  });

  assert.equal(modificada.status, 200);
  assert.equal(modificada.cuerpo.data.estado, "Modificada");
  assert.equal(modificada.cuerpo.data.historial.length, 1);
  assert.equal(modificada.cuerpo.data.historial[0].estado, "Activa");
  assert.notEqual(modificada.cuerpo.data.actualizadoEn, null);
});

test("seguimiento: alta, listado y cambio de estado completa fechaCierre", async () => {
  const alta = await pedir("POST", "/api/v1/observations/obs-2/seguimientos", "preceptor", {
    accion: "Llamar a la familia",
    observaciones: "Se acordó una entrevista para la próxima semana."
  });

  assert.equal(alta.status, 201);
  assert.equal(alta.cuerpo.data.estado, "pendiente");
  assert.equal(alta.cuerpo.data.fechaCierre, null);

  const lista = await pedir("GET", `/api/v1/observations/obs-2/seguimientos`, "docente");
  assert.ok(lista.cuerpo.data.some((seguimiento) => seguimiento.id === alta.cuerpo.data.id));

  const cerrado = await pedir("PATCH", `/api/v1/seguimientos-observacion/${alta.cuerpo.data.id}`, "preceptor", {
    estado: "realizada"
  });
  assert.equal(cerrado.status, 200);
  assert.equal(cerrado.cuerpo.data.estado, "realizada");
  assert.notEqual(cerrado.cuerpo.data.fechaCierre, null);

  const inexistente = await pedir("POST", "/api/v1/observations/obs-999/seguimientos", "preceptor", {
    accion: "Accion sin observacion"
  });
  assert.equal(inexistente.status, 404);
});

test("historial y resumen del alumno", async () => {
  const historial = await pedir("GET", "/api/v1/alumnos/alu-1/observaciones", "preceptor");
  assert.equal(historial.status, 200);
  assert.equal(historial.cuerpo.data.observaciones.length, 2);
  assert.ok(historial.cuerpo.data.observaciones.every((observacion) => Array.isArray(observacion.seguimientos)));
  assert.equal(historial.cuerpo.data.seguimiento.total, 2);

  const resumen = await pedir("GET", "/api/v1/alumnos/alu-1/observaciones/resumen", "docente");
  assert.equal(resumen.status, 200);
  assert.equal(resumen.cuerpo.data.total, 2);
  assert.equal(resumen.cuerpo.data.tieneObservaciones, true);
  assert.equal(resumen.cuerpo.data.porTipo.Convivencia, 1);
  assert.equal(resumen.cuerpo.data.seguimiento.pendientes, 1);
});

test("alumno sin observaciones responde vacio", async () => {
  const listado = await pedir("GET", "/api/v1/students/alu-2/observations", "docente");
  assert.equal(listado.status, 200);
  assert.deepEqual(listado.cuerpo.data, []);

  const resumen = await pedir("GET", "/api/v1/alumnos/alu-2/observaciones/resumen", "docente");
  assert.equal(resumen.cuerpo.data.tieneObservaciones, false);
  assert.equal(resumen.cuerpo.data.total, 0);
});

test("permisos: 401 sin token y 403 para el rol de solo lectura", async () => {
  const sinToken = await pedir("GET", "/api/v1/observations", null);
  assert.equal(sinToken.status, 401);

  const docenteEscribe = await pedir("POST", "/api/v1/students/alu-2/observations", "docente", {
    tipo: "Académica",
    descripcion: "Sin permiso de escritura."
  });
  assert.equal(docenteEscribe.status, 403);
});
