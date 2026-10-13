/* Calificaciones: carga, consulta, listado, modificacion con historial, baja
   logica, boletin/resumen por alumno y listado por docente, con la autorizacion
   docente acotada a sus asignaciones (modulo docentes). Datos del seed de
   desarrollo. */

import assert from "node:assert/strict";
import test, { after, before, beforeEach } from "node:test";
import { createApp } from "../src/app.mjs";
import { apiRoutes } from "../routes/index.mjs";
import { resetStore } from "../database/memory-store.mjs";
import { seedDesarrollo } from "../database/seeds/index.mjs";

const PUERTO = 4018;
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
  tokens.admin = await login("admin@prece.local", "Admin123!");
  tokens.docente = await login("docente@prece.local", "Docente123!");
  tokens.preceptor = await login("preceptor@prece.local", "Preceptor123!");
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

/* ---------------- Autenticacion y permisos -------------------------------- */

test("las rutas de calificaciones exigen token (401)", async () => {
  const listar = await pedir("GET", "/api/v1/calificaciones");
  assert.equal(listar.status, 401);
  assert.equal(listar.cuerpo.error.code, "MISSING_TOKEN");

  const crear = await pedir("POST", "/api/v1/calificaciones", null, { alumnoId: "alu-1", materiaId: "mat", anio: 2027, valor: "8" });
  assert.equal(crear.status, 401);
});

test("un usuario sin permiso de calificaciones no puede leer ni escribir (403)", async () => {
  const listar = await pedir("GET", "/api/v1/calificaciones", "preceptor");
  assert.equal(listar.status, 403);
  assert.equal(listar.cuerpo.error.code, "FORBIDDEN");

  const crear = await pedir("POST", "/api/v1/calificaciones", "preceptor", { alumnoId: "alu-1", materiaId: "mat", anio: 2027, valor: "8" });
  assert.equal(crear.status, 403);
});

test("el docente puede leer el catalogo y listar (200)", async () => {
  assert.equal((await pedir("GET", "/api/v1/calificaciones/catalogos", "docente")).status, 200);
  assert.equal((await pedir("GET", "/api/v1/calificaciones", "docente")).status, 200);
});

/* ---------------- Catalogos ----------------------------------------------- */

test("el catalogo expone tipos, conceptos, condiciones y escala", async () => {
  const { status, cuerpo } = await pedir("GET", "/api/v1/calificaciones/catalogos", "admin");
  assert.equal(status, 200);
  assert.equal(cuerpo.data.tiposEvaluacion.length, 5);
  assert.equal(cuerpo.data.conceptos.length, 3);
  assert.equal(cuerpo.data.condiciones.length, 2);
  assert.equal(cuerpo.data.escala.aprobacion, 6);
  assert.equal(cuerpo.data.escala.maximo, 10);
});

/* ---------------- Alta ---------------------------------------------------- */

test("crea una calificacion numerica y deriva el alcance del alumno (201)", async () => {
  const { status, cuerpo } = await pedir("POST", "/api/v1/calificaciones", "admin", {
    alumnoId: "alu-1",
    materiaId: "mat",
    anio: 2027,
    valor: "8"
  });

  assert.equal(status, 201);
  assert.equal(cuerpo.data.alumnoId, "alu-1");
  assert.equal(cuerpo.data.materiaId, "mat");
  assert.equal(cuerpo.data.cursoId, "cur-1");
  assert.equal(cuerpo.data.divisionId, "div-1");
  assert.equal(cuerpo.data.tipoEvaluacion, "escrito");
  assert.equal(cuerpo.data.tipoValor, "numerico");
  assert.equal(cuerpo.data.nota, 8);
  assert.equal(cuerpo.data.concepto, null);
  assert.equal(cuerpo.data.condicion, "aprobado");
  assert.equal(cuerpo.data.periodo.etiqueta, "2027");
  assert.match(cuerpo.data.fecha, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(cuerpo.data.estado, "activo");
  assert.equal(cuerpo.data.docenteId, null);
});

test("acepta un valor conceptual (TEP) sin nota ni condicion", async () => {
  const { status, cuerpo } = await pedir("POST", "/api/v1/calificaciones", "admin", {
    alumnoId: "alu-1",
    materiaId: "mat",
    anio: 2027,
    tipoEvaluacion: "trabajo_practico",
    valor: "TEP"
  });

  assert.equal(status, 201);
  assert.equal(cuerpo.data.tipoValor, "conceptual");
  assert.equal(cuerpo.data.nota, null);
  assert.equal(cuerpo.data.concepto, "TEP");
  assert.equal(cuerpo.data.condicion, null);
});

test("normaliza una nota con coma decimal", async () => {
  const { status, cuerpo } = await pedir("POST", "/api/v1/calificaciones", "admin", {
    alumnoId: "alu-1",
    materiaId: "mat",
    anio: 2027,
    valor: "7,5"
  });

  assert.equal(status, 201);
  assert.equal(cuerpo.data.nota, 7.5);
});

test("rechaza datos incompletos o invalidos (422)", async () => {
  const casos = [
    [{ materiaId: "mat", anio: 2027, valor: "8" }, "alumnoId"],
    [{ alumnoId: "alu-999", materiaId: "mat", anio: 2027, valor: "8" }, "alumnoId"],
    [{ alumnoId: "alu-15", materiaId: "mat", anio: 2027, valor: "8" }, "alumnoId"],
    [{ alumnoId: "alu-1", materiaId: "nope", anio: 2027, valor: "8" }, "materiaId"],
    [{ alumnoId: "alu-1", materiaId: "mat", valor: "8" }, "anio"],
    [{ alumnoId: "alu-1", materiaId: "mat", anio: 1800, valor: "8" }, "anio"],
    [{ alumnoId: "alu-1", materiaId: "mat", anio: 2027, tipoEvaluacion: "nope", valor: "8" }, "tipoEvaluacion"],
    [{ alumnoId: "alu-1", materiaId: "mat", anio: 2027, valor: "11" }, "valor"],
    [{ alumnoId: "alu-1", materiaId: "mat", anio: 2027, valor: "8", fecha: "2027/01/01" }, "fecha"],
    [{ alumnoId: "alu-1", materiaId: "mat", anio: 2027, valor: "8", cuatrimestre: 3 }, "cuatrimestre"],
    [{ alumnoId: "alu-1", materiaId: "mat", anio: 2027, valor: "8", cursoId: "cur-1", divisionId: "div-8" }, "divisionId"]
  ];

  for (const [body, campo] of casos) {
    const { status, cuerpo } = await pedir("POST", "/api/v1/calificaciones", "admin", body);
    assert.equal(status, 422, `esperaba 422 para ${campo}`);
    assert.equal(cuerpo.error.code, "VALIDATION_ERROR");
    assert.ok(cuerpo.error.details.some((detalle) => detalle.field === campo), `faltaba ${campo}`);
  }
});

test("rechaza una calificacion duplicada del mismo tipo y periodo (409)", async () => {
  const { status, cuerpo } = await pedir("POST", "/api/v1/calificaciones", "admin", {
    alumnoId: "alu-1",
    materiaId: "mat",
    anio: 2026,
    cuatrimestre: 1,
    tipoEvaluacion: "escrito",
    valor: "5"
  });

  assert.equal(status, 409);
  assert.equal(cuerpo.error.code, "CONFLICT");
});

/* ---------------- Autorizacion docente ------------------------------------ */

test("el docente carga dentro de su asignacion y queda como responsable (201)", async () => {
  const { status, cuerpo } = await pedir("POST", "/api/v1/calificaciones", "docente", {
    alumnoId: "alu-1",
    materiaId: "mat",
    anio: 2026,
    cuatrimestre: 2,
    tipoEvaluacion: "oral",
    valor: "9",
    fecha: "2026-08-30"
  });

  assert.equal(status, 201);
  assert.equal(cuerpo.data.docenteId, "tch-1");
  assert.equal(cuerpo.data.asignacionMateriaId, "tcm-1");
});

test("el docente no puede cargar fuera de sus asignaciones (403)", async () => {
  const { status, cuerpo } = await pedir("POST", "/api/v1/calificaciones", "docente", {
    alumnoId: "alu-2",
    materiaId: "his",
    anio: 2026,
    cuatrimestre: 1,
    tipoEvaluacion: "oral",
    valor: "8"
  });

  assert.equal(status, 403);
  assert.equal(cuerpo.error.code, "FORBIDDEN");
});

test("el docente no puede modificar ni anular calificaciones de otra materia (403)", async () => {
  const patch = await pedir("PATCH", "/api/v1/calificaciones/cal-7", "docente", { valor: "1" });
  assert.equal(patch.status, 403);

  const borrar = await pedir("DELETE", "/api/v1/calificaciones/cal-7", "docente");
  assert.equal(borrar.status, 403);
});

test("el docente modifica y anula sus propias calificaciones (200)", async () => {
  const patch = await pedir("PATCH", "/api/v1/calificaciones/cal-1", "docente", { valor: "10" });
  assert.equal(patch.status, 200);
  assert.equal(patch.cuerpo.data.valor, "10");

  const borrar = await pedir("DELETE", "/api/v1/calificaciones/cal-1", "docente");
  assert.equal(borrar.status, 200);
  assert.equal(borrar.cuerpo.data.estado, "inactivo");
});

/* ---------------- Listado ------------------------------------------------- */

test("lista solo las calificaciones activas por defecto", async () => {
  const { status, cuerpo } = await pedir("GET", "/api/v1/calificaciones?porPagina=50", "admin");
  assert.equal(status, 200);
  assert.equal(cuerpo.paginacion.total, 10);
  assert.ok(cuerpo.data.every((calificacion) => calificacion.estado === "activo"));
});

test("filtra por estado inactivo y por todos", async () => {
  const inactivo = await pedir("GET", "/api/v1/calificaciones?estado=inactivo", "admin");
  assert.equal(inactivo.cuerpo.paginacion.total, 1);
  assert.equal(inactivo.cuerpo.data[0].id, "cal-11");

  const todos = await pedir("GET", "/api/v1/calificaciones?estado=todos&porPagina=50", "admin");
  assert.equal(todos.cuerpo.paginacion.total, 11);
});

test("filtra por alumno, materia, anio, tipo y condicion", async () => {
  const alumno = await pedir("GET", "/api/v1/calificaciones?alumnoId=alu-1&porPagina=50", "admin");
  assert.equal(alumno.cuerpo.paginacion.total, 5);

  const materia = await pedir("GET", "/api/v1/calificaciones?materiaId=mat&porPagina=50", "admin");
  assert.equal(materia.cuerpo.paginacion.total, 5);

  const anio = await pedir("GET", "/api/v1/calificaciones?anio=2026&porPagina=50", "admin");
  assert.equal(anio.cuerpo.paginacion.total, 9);

  const tipo = await pedir("GET", "/api/v1/calificaciones?tipoEvaluacion=escrito&porPagina=50", "admin");
  assert.equal(tipo.cuerpo.paginacion.total, 5);

  const condicion = await pedir("GET", "/api/v1/calificaciones?condicion=desaprobado&porPagina=50", "admin");
  assert.equal(condicion.cuerpo.paginacion.total, 2);
  assert.ok(condicion.cuerpo.data.every((calificacion) => calificacion.condicion === "desaprobado"));
});

test("ordena por nota y pagina los resultados", async () => {
  const ascendente = await pedir("GET", "/api/v1/calificaciones?orden=nota&porPagina=50", "admin");
  const notas = ascendente.cuerpo.data.map((calificacion) => calificacion.nota).filter((nota) => nota !== null);
  assert.deepEqual(notas, [...notas].sort((a, b) => a - b));

  const paginado = await pedir("GET", "/api/v1/calificaciones?porPagina=3", "admin");
  assert.equal(paginado.cuerpo.paginacion.total, 10);
  assert.equal(paginado.cuerpo.paginacion.totalPaginas, 4);
  assert.equal(paginado.cuerpo.data.length, 3);
});

test("rechaza filtros y paginacion invalidos (422)", async () => {
  for (const [query, campo] of [
    ["estado=nope", "estado"],
    ["tipoEvaluacion=nope", "tipoEvaluacion"],
    ["condicion=nope", "condicion"],
    ["anio=1800", "anio"],
    ["cuatrimestre=9", "cuatrimestre"],
    ["orden=nope", "orden"],
    ["porPagina=0", "porPagina"],
    ["pagina=0", "pagina"]
  ]) {
    const { status, cuerpo } = await pedir("GET", `/api/v1/calificaciones?${query}`, "admin");
    assert.equal(status, 422, `esperaba 422 para ${query}`);
    assert.ok(cuerpo.error.details.some((detalle) => detalle.field === campo), `faltaba ${campo}`);
  }
});

/* ---------------- Consulta individual ------------------------------------- */

test("obtiene una calificacion por id (200) y responde 404 si no existe", async () => {
  const { status, cuerpo } = await pedir("GET", "/api/v1/calificaciones/cal-1", "admin");
  assert.equal(status, 200);
  assert.equal(cuerpo.data.id, "cal-1");
  assert.equal(cuerpo.data.alumno.apellido, "Pérez López");
  assert.equal(cuerpo.data.materia.nombre, "Matemática");
  assert.equal(cuerpo.data.docente.id, "tch-1");

  const ausente = await pedir("GET", "/api/v1/calificaciones/cal-nope", "admin");
  assert.equal(ausente.status, 404);
  assert.equal(ausente.cuerpo.error.code, "NOT_FOUND");
});

/* ---------------- Modificacion -------------------------------------------- */

test("modifica el valor y guarda el estado anterior en el historial", async () => {
  const { status, cuerpo } = await pedir("PATCH", "/api/v1/calificaciones/cal-2", "admin", { valor: "9", observaciones: "Revisada" });

  assert.equal(status, 200);
  assert.equal(cuerpo.data.valor, "9");
  assert.equal(cuerpo.data.observaciones, "Revisada");
  assert.equal(cuerpo.data.historial.length, 1);
  assert.equal(cuerpo.data.historial[0].valor, "7");
});

test("no permite cambiar el alumno ni la materia (422)", async () => {
  const alumno = await pedir("PATCH", "/api/v1/calificaciones/cal-2", "admin", { alumnoId: "alu-2" });
  assert.equal(alumno.status, 422);
  assert.ok(alumno.cuerpo.error.details.some((detalle) => detalle.field === "alumnoId"));

  const materia = await pedir("PATCH", "/api/v1/calificaciones/cal-2", "admin", { materiaId: "lng" });
  assert.equal(materia.status, 422);
  assert.ok(materia.cuerpo.error.details.some((detalle) => detalle.field === "materiaId"));
});

test("rechaza modificar una calificacion que generaria un duplicado (409)", async () => {
  const { status, cuerpo } = await pedir("PATCH", "/api/v1/calificaciones/cal-2", "admin", { tipoEvaluacion: "escrito" });
  assert.equal(status, 409);
  assert.equal(cuerpo.error.code, "CONFLICT");
});

test("responde 404 al modificar una calificacion inexistente", async () => {
  const { status } = await pedir("PATCH", "/api/v1/calificaciones/cal-nope", "admin", { valor: "7" });
  assert.equal(status, 404);
});

test("no permite modificar una calificacion dada de baja (409)", async () => {
  const { status, cuerpo } = await pedir("PATCH", "/api/v1/calificaciones/cal-11", "admin", { valor: "7" });
  assert.equal(status, 409);
  assert.equal(cuerpo.error.code, "CONFLICT");
});

/* ---------------- Baja logica --------------------------------------------- */

test("da de baja una calificacion y bloquea repetir la baja (200/409)", async () => {
  const baja = await pedir("DELETE", "/api/v1/calificaciones/cal-2", "admin");
  assert.equal(baja.status, 200);
  assert.equal(baja.cuerpo.data.estado, "inactivo");
  assert.ok(baja.cuerpo.data.fechaBaja);

  const repetida = await pedir("DELETE", "/api/v1/calificaciones/cal-2", "admin");
  assert.equal(repetida.status, 409);

  const listado = await pedir("GET", "/api/v1/calificaciones?porPagina=50", "admin");
  assert.equal(listado.cuerpo.paginacion.total, 9);
});

test("responde 404 al dar de baja una calificacion inexistente", async () => {
  const { status } = await pedir("DELETE", "/api/v1/calificaciones/cal-nope", "admin");
  assert.equal(status, 404);
});

/* ---------------- Boletin y resumen por alumno ---------------------------- */

test("arma el boletin de un alumno agrupado por materia", async () => {
  const { status, cuerpo } = await pedir("GET", "/api/v1/alumnos/alu-1/calificaciones", "admin");
  assert.equal(status, 200);
  assert.equal(cuerpo.data.alumno.id, "alu-1");
  assert.equal(cuerpo.data.resumen.total, 5);
  assert.equal(cuerpo.data.resumen.promedioGeneral, 7.25);
  assert.equal(cuerpo.data.materias.length, 2);

  const matematicas = cuerpo.data.materias.find((materia) => materia.materiaId === "mat");
  assert.equal(matematicas.calificaciones.length, 4);
  assert.equal(matematicas.promedio, 7.25);
});

test("devuelve el resumen por materia de un alumno", async () => {
  const { status, cuerpo } = await pedir("GET", "/api/v1/alumnos/alu-1/calificaciones/resumen", "admin");
  assert.equal(status, 200);
  assert.equal(cuerpo.data.alumno.id, "alu-1");
  assert.equal(cuerpo.data.materias.length, 2);
  assert.ok(cuerpo.data.materias.every((materia) => typeof materia.total === "number"));
});

test("responde 404 si el alumno no existe", async () => {
  assert.equal((await pedir("GET", "/api/v1/alumnos/alu-999/calificaciones", "admin")).status, 404);
  assert.equal((await pedir("GET", "/api/v1/alumnos/alu-999/calificaciones/resumen", "admin")).status, 404);
});

/* ---------------- Listado por docente ------------------------------------- */

test("lista las calificaciones de un docente con su paginacion", async () => {
  const { status, cuerpo } = await pedir("GET", "/api/v1/docentes/tch-1/calificaciones?porPagina=50", "admin");
  assert.equal(status, 200);
  assert.equal(cuerpo.paginacion.total, 5);
  assert.ok(cuerpo.data.every((calificacion) => calificacion.docenteId === "tch-1"));
});

test("responde 404 si el docente no existe", async () => {
  assert.equal((await pedir("GET", "/api/v1/docentes/tch-99/calificaciones", "admin")).status, 404);
});
