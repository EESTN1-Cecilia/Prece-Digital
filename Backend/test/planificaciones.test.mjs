/* Planificaciones docentes: catalogos, opciones en cascada, listado con
   busqueda/filtros/paginacion, alta validada contra las asignaciones del modulo
   docentes, modificacion, presentacion, revision de Jefatura, consultas por
   docente/materia/curso y alcance acotado del docente. Datos del seed de
   desarrollo. */

import assert from "node:assert/strict";
import test, { after, before, beforeEach } from "node:test";
import { createApp } from "../src/app.mjs";
import { apiRoutes } from "../routes/index.mjs";
import { resetStore } from "../database/memory-store.mjs";
import { seedDesarrollo } from "../database/seeds/index.mjs";

const PUERTO = 4030;
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
  tokens.jefe = await login("jefearea@prece.local", "JefeArea123!");
  tokens.preceptor = await login("preceptor@prece.local", "Preceptor123!");
  tokens.secretaria = await login("secretario@prece.local", "Secretaria123!");
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

const NUEVA = {
  docenteId: "tch-4",
  materiaId: "lng",
  cursoId: "cur-1",
  divisionId: "div-2",
  anioLectivo: 2026,
  periodo: "anual"
};

/* ---------------- Autenticacion y permisos -------------------------------- */

test("las rutas de planificaciones exigen token (401)", async () => {
  const { status, cuerpo } = await pedir("GET", "/api/v1/planificaciones");
  assert.equal(status, 401);
  assert.equal(cuerpo.error.code, "MISSING_TOKEN");
});

test("un usuario sin permiso no puede leer ni escribir (403)", async () => {
  assert.equal((await pedir("GET", "/api/v1/planificaciones", "preceptor")).status, 403);
  assert.equal((await pedir("POST", "/api/v1/planificaciones", "preceptor", NUEVA)).status, 403);
});

test("secretaria lee pero no escribe", async () => {
  assert.equal((await pedir("GET", "/api/v1/planificaciones", "secretaria")).status, 200);
  assert.equal((await pedir("POST", "/api/v1/planificaciones", "secretaria", NUEVA)).status, 403);
});

/* ---------------- Catalogos y opciones ------------------------------------ */

test("el catalogo expone estados, secciones, turnos, periodos y transiciones", async () => {
  const { status, cuerpo } = await pedir("GET", "/api/v1/planificaciones/catalogos", "docente");
  assert.equal(status, 200);
  assert.equal(cuerpo.data.estados.length, 7);
  assert.equal(cuerpo.data.secciones.length, 10);
  assert.deepEqual(cuerpo.data.turnos.map((turno) => turno.valor), ["MANANA", "TARDE"]);
  assert.deepEqual(cuerpo.data.transicionesRevision.en_revision, ["observada", "aprobada", "rechazada"]);
});

test("las opciones expanden las asignaciones sin division a cada division del curso", async () => {
  const { status, cuerpo } = await pedir("GET", "/api/v1/planificaciones/opciones", "admin");
  assert.equal(status, 200);
  assert.deepEqual(cuerpo.data.aniosLectivos, [2026]);

  const matematica = cuerpo.data.combinaciones.filter((item) => item.asignacionId === "tcm-1");
  assert.deepEqual(matematica.map((item) => item.division.id).sort(), ["div-1", "div-2", "div-3"]);
  assert.equal(matematica[0].curso.turno, "MANANA");
  assert.ok(matematica[0].curso.etiqueta.includes("1ro"));
});

test("las opciones del docente solo traen sus asignaciones", async () => {
  const { cuerpo } = await pedir("GET", "/api/v1/planificaciones/opciones", "docente");
  assert.ok(cuerpo.data.combinaciones.length > 0);
  assert.ok(cuerpo.data.combinaciones.every((item) => item.docente.id === "tch-1"));
});

test("incluirInactivas suma las asignaciones dadas de baja", async () => {
  const { cuerpo } = await pedir("GET", "/api/v1/planificaciones/opciones?incluirInactivas=true", "admin");
  assert.ok(cuerpo.data.aniosLectivos.includes(2025));
});

/* ---------------- Listado ------------------------------------------------- */

test("lista con paginacion, filtros activos y acciones por planificacion", async () => {
  const { status, cuerpo } = await pedir("GET", "/api/v1/planificaciones?porPagina=2&pagina=1", "admin");
  assert.equal(status, 200);
  assert.equal(cuerpo.data.length, 2);
  assert.equal(cuerpo.paginacion.total, 6);
  assert.equal(cuerpo.paginacion.totalPaginas, 3);
  assert.equal(cuerpo.filtros.orden, "actualizado_desc");
  assert.ok(cuerpo.data.every((plan) => plan.acciones.includes("ver")));
  assert.equal(cuerpo.data[0].contenido, undefined);
});

test("combina filtros por estado, turno, anio de curso y ciclo lectivo", async () => {
  const { cuerpo } = await pedir("GET", "/api/v1/planificaciones?anio=1&turno=MANANA&anioLectivo=2026&estado=borrador", "admin");
  assert.deepEqual(cuerpo.data.map((plan) => plan.id), ["pla-3"]);
});

test("filtra por fechas de presentacion y revision y expone cantidad de observaciones", async () => {
  const presentadas = await pedir("GET", "/api/v1/planificaciones?fechaPresentacionDesde=2026-03-03&fechaPresentacionHasta=2026-03-05", "admin");
  assert.deepEqual(presentadas.cuerpo.data.map((plan) => plan.id).sort(), ["pla-2", "pla-4", "pla-5"]);

  const revisadas = await pedir("GET", "/api/v1/planificaciones?fechaRevisionDesde=2026-03-11&fechaRevisionHasta=2026-03-12", "admin");
  assert.deepEqual(revisadas.cuerpo.data.map((plan) => plan.id).sort(), ["pla-2", "pla-5"]);
  assert.equal(revisadas.cuerpo.data.find((plan) => plan.id === "pla-2").cantidadObservaciones, 1);
});

test("busca por docente, materia, division e ID sin importar tildes", async () => {
  assert.deepEqual((await pedir("GET", "/api/v1/planificaciones?q=rios", "admin")).cuerpo.data.map((plan) => plan.id), ["pla-5"]);
  assert.equal((await pedir("GET", "/api/v1/planificaciones?q=matematica", "admin")).cuerpo.paginacion.total, 3);
  assert.deepEqual((await pedir("GET", "/api/v1/planificaciones?q=pla-4", "admin")).cuerpo.data.map((plan) => plan.id), ["pla-4"]);
});

test("ordena por materia ascendente", async () => {
  const { cuerpo } = await pedir("GET", "/api/v1/planificaciones?orden=materia", "admin");
  assert.equal(cuerpo.data[0].materia.nombre, "Historia");
});

test("rechaza filtros invalidos (422)", async () => {
  const { status, cuerpo } = await pedir("GET", "/api/v1/planificaciones?estado=otro&turno=NOCHE&orden=x", "admin");
  assert.equal(status, 422);
  assert.deepEqual(cuerpo.error.details.map((detalle) => detalle.field).sort(), ["estado", "orden", "turno"]);
});

test("el docente solo ve sus planificaciones", async () => {
  const { cuerpo } = await pedir("GET", "/api/v1/planificaciones", "docente");
  assert.deepEqual(cuerpo.data.map((plan) => plan.id).sort(), ["pla-1", "pla-2", "pla-3"]);
  assert.equal((await pedir("GET", "/api/v1/planificaciones/pla-4", "docente")).status, 403);
});

/* ---------------- Detalle ------------------------------------------------- */

test("el detalle trae contenido, historial, revisor y acciones del usuario", async () => {
  const { status, cuerpo } = await pedir("GET", "/api/v1/planificaciones/pla-2", "docente");
  assert.equal(status, 200);
  assert.equal(cuerpo.data.estado, "observada");
  assert.equal(cuerpo.data.revisor.nombre, "Jefe de Área");
  assert.equal(cuerpo.data.historialEstados.length, 3);
  assert.deepEqual(cuerpo.data.acciones, ["ver", "editar", "presentar"]);
  assert.equal(typeof cuerpo.data.contenido.objetivos, "string");
});

test("una planificacion inexistente responde 404", async () => {
  assert.equal((await pedir("GET", "/api/v1/planificaciones/no-existe", "admin")).status, 404);
});

/* ---------------- Alta ---------------------------------------------------- */

test("carga una planificacion en borrador validando la asignacion (201)", async () => {
  const { status, cuerpo } = await pedir("POST", "/api/v1/planificaciones", "admin", {
    ...NUEVA,
    contenido: { objetivos: "Leer y comprender textos." }
  });
  assert.equal(status, 201);
  assert.equal(cuerpo.data.estado, "borrador");
  assert.equal(cuerpo.data.asignacionMateriaId, "tcm-4");
  assert.equal(cuerpo.data.turno, "MANANA");
  assert.equal(cuerpo.data.periodo.valor, "anual");
  assert.equal(cuerpo.data.contenido.objetivos, "Leer y comprender textos.");
  assert.equal(cuerpo.data.historialEstados[0].estadoNuevo, "borrador");
});

test("rechaza una combinacion sin asignacion de materia (422)", async () => {
  const { status, cuerpo } = await pedir("POST", "/api/v1/planificaciones", "admin", { ...NUEVA, materiaId: "his" });
  assert.equal(status, 422);
  assert.equal(cuerpo.error.details[0].field, "materiaId");
});

test("rechaza una division que no pertenece al curso y campos faltantes (422)", async () => {
  const division = await pedir("POST", "/api/v1/planificaciones", "admin", { ...NUEVA, divisionId: "div-8" });
  assert.equal(division.status, 422);
  assert.equal(division.cuerpo.error.details[0].field, "divisionId");

  const vacia = await pedir("POST", "/api/v1/planificaciones", "admin", {});
  assert.equal(vacia.status, 422);
  assert.deepEqual(vacia.cuerpo.error.details.map((detalle) => detalle.field), ["anioLectivo"]);
});

test("no permite duplicar una planificacion vigente (409)", async () => {
  const { status } = await pedir("POST", "/api/v1/planificaciones", "admin", {
    docenteId: "tch-1",
    materiaId: "mat",
    cursoId: "cur-1",
    divisionId: "div-1",
    anioLectivo: 2026
  });
  assert.equal(status, 409);
});

test("una planificacion rechazada no impide cargar otra (201)", async () => {
  const { status } = await pedir("POST", "/api/v1/planificaciones", "admin", { ...NUEVA, divisionId: "div-1" });
  assert.equal(status, 201);
});

test("el docente carga a su nombre y no puede cargar para otro docente", async () => {
  const propia = await pedir("POST", "/api/v1/planificaciones", "docente", {
    materiaId: "mat",
    cursoId: "cur-1",
    divisionId: "div-1",
    anioLectivo: 2026,
    periodo: "1"
  });
  assert.equal(propia.status, 201);
  assert.equal(propia.cuerpo.data.docenteId, "tch-1");

  const ajena = await pedir("POST", "/api/v1/planificaciones", "docente", NUEVA);
  assert.equal(ajena.status, 403);
});

/* ---------------- Modificacion y presentacion ----------------------------- */

test("modifica secciones en borrador y bloquea la edicion fuera de los estados editables", async () => {
  const editada = await pedir("PATCH", "/api/v1/planificaciones/pla-3", "docente", { contenido: { objetivos: "Nuevo objetivo." } });
  assert.equal(editada.status, 200);
  assert.equal(editada.cuerpo.data.contenido.objetivos, "Nuevo objetivo.");
  assert.equal(editada.cuerpo.data.contenido.fundamentacion !== null, true);

  const aprobada = await pedir("PATCH", "/api/v1/planificaciones/pla-1", "admin", { contenido: { objetivos: "x" } });
  assert.equal(aprobada.status, 409);
});

test("cambiar la division revalida la combinacion", async () => {
  const { status, cuerpo } = await pedir("PATCH", "/api/v1/planificaciones/pla-3", "admin", { divisionId: "div-1" });
  assert.equal(status, 409);
  assert.match(cuerpo.error.message, /Ya existe/);
});

test("presentar pasa borrador a presentada y observada a corregida", async () => {
  const borrador = await pedir("POST", "/api/v1/planificaciones/pla-3/presentar", "docente");
  assert.equal(borrador.status, 200);
  assert.equal(borrador.cuerpo.data.estado, "presentada");
  assert.ok(borrador.cuerpo.data.fechaPresentacion);
  assert.deepEqual(borrador.cuerpo.data.acciones, ["ver"]);

  const observada = await pedir("POST", "/api/v1/planificaciones/pla-2/presentar", "docente");
  assert.equal(observada.cuerpo.data.estado, "corregida");

  const otraVez = await pedir("POST", "/api/v1/planificaciones/pla-2/presentar", "docente");
  assert.equal(otraVez.status, 409);
});

test("no se presenta una planificacion sin secciones completas (422)", async () => {
  const nueva = await pedir("POST", "/api/v1/planificaciones", "admin", NUEVA);
  const { status } = await pedir("POST", `/api/v1/planificaciones/${nueva.cuerpo.data.id}/presentar`, "admin");
  assert.equal(status, 422);
});

/* ---------------- Revision de Jefatura ------------------------------------ */

test("jefatura revisa con transiciones validas y motivo obligatorio", async () => {
  assert.equal((await pedir("POST", "/api/v1/planificaciones/pla-4/estado", "docente", { estado: "aprobada" })).status, 403);

  const sinMotivo = await pedir("POST", "/api/v1/planificaciones/pla-4/estado", "jefe", { estado: "observada" });
  assert.equal(sinMotivo.status, 422);

  const enRevision = await pedir("POST", "/api/v1/planificaciones/pla-4/estado", "jefe", { estado: "en_revision" });
  assert.equal(enRevision.status, 200);
  assert.deepEqual(enRevision.cuerpo.data.transiciones, ["observada", "aprobada", "rechazada"]);

  const aprobada = await pedir("POST", "/api/v1/planificaciones/pla-4/estado", "jefe", { estado: "aprobada" });
  assert.equal(aprobada.cuerpo.data.estado, "aprobada");
  assert.equal(aprobada.cuerpo.data.revisor.nombre, "Jefe de Área");

  const invalida = await pedir("POST", "/api/v1/planificaciones/pla-4/estado", "jefe", { estado: "borrador" });
  assert.equal(invalida.status, 409);
});

/* ---------------- Consultas ----------------------------------------------- */

test("consulta por docente con materias, cursos y resumen por estado", async () => {
  const { status, cuerpo } = await pedir("GET", "/api/v1/planificaciones/por-docente/tch-1", "docente");
  assert.equal(status, 200);
  assert.equal(cuerpo.data.docente.nombreCompleto, "Villatoro, María");
  assert.deepEqual(cuerpo.data.materias.map((materia) => materia.id), ["mat"]);
  assert.equal(cuerpo.data.resumen.total, 3);
  assert.equal(cuerpo.data.resumen.porEstado.observada, 1);
  assert.equal((await pedir("GET", "/api/v1/planificaciones/por-docente/tch-2", "docente")).status, 403);
});

test("consulta por materia y por curso respetando filtros", async () => {
  const materia = await pedir("GET", "/api/v1/planificaciones/por-materia/mat?estado=aprobada", "admin");
  assert.equal(materia.status, 200);
  assert.deepEqual(materia.cuerpo.data.planificaciones.map((plan) => plan.id), ["pla-1"]);

  const curso = await pedir("GET", "/api/v1/planificaciones/por-curso/cur-1?divisionId=div-1", "admin");
  assert.equal(curso.status, 200);
  assert.equal(curso.cuerpo.data.divisiones.length, 3);
  assert.deepEqual(curso.cuerpo.data.planificaciones.map((plan) => plan.id).sort(), ["pla-1", "pla-6"]);

  const ajena = await pedir("GET", "/api/v1/planificaciones/por-curso/cur-1?divisionId=div-8", "admin");
  assert.equal(ajena.status, 422);

  assert.equal((await pedir("GET", "/api/v1/planificaciones/por-materia/no-existe", "admin")).status, 404);
});
