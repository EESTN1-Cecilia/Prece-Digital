/* Gestion de docentes: registro, consulta, listado, modificacion, baja logica y
   asociaciones con materias y cursos/divisiones (con historial por periodo),
   mas las consultas inversas. Datos del seed de desarrollo. */

import assert from "node:assert/strict";
import test, { after, before, beforeEach } from "node:test";
import { createApp } from "../src/app.mjs";
import { apiRoutes } from "../routes/index.mjs";
import { resetStore } from "../database/memory-store.mjs";
import { seedDesarrollo } from "../database/seeds/index.mjs";

const PUERTO = 4017;
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
  tokens.director = await login("director@prece.local", "Director123!");
  tokens.jefeArea = await login("jefearea@prece.local", "JefeArea123!");
  tokens.secretario = await login("secretaria@prece.local", "Secretaria123!");
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

/* ---------------- Autenticacion y permisos -------------------------------- */

test("las rutas de docentes exigen token (401)", async () => {
  const catalogo = await pedir("GET", "/api/v1/teachers/catalogos");
  assert.equal(catalogo.status, 401);
  assert.equal(catalogo.cuerpo.error.code, "MISSING_TOKEN");

  const crear = await pedir("POST", "/api/v1/teachers", null, { apellido: "Uno", nombre: "Dos", documento: "30000001", email: "uno@prece.local" });
  assert.equal(crear.status, 401);
});

test("un docente sin permiso de docentes no puede leer ni escribir (403)", async () => {
  const listar = await pedir("GET", "/api/v1/teachers", "docente");
  assert.equal(listar.status, 403);
  assert.equal(listar.cuerpo.error.code, "FORBIDDEN");

  const crear = await pedir("POST", "/api/v1/teachers", "docente", { apellido: "Uno", nombre: "Dos", documento: "30000001", email: "uno@prece.local" });
  assert.equal(crear.status, 403);
});

test("secretaria puede leer pero no crear (403)", async () => {
  const listar = await pedir("GET", "/api/v1/teachers?estado=todos", "secretario");
  assert.equal(listar.status, 200);

  const crear = await pedir("POST", "/api/v1/teachers", "secretario", { apellido: "Uno", nombre: "Dos", documento: "30000001", email: "uno@prece.local" });
  assert.equal(crear.status, 403);
});

/* ---------------- Catalogos ----------------------------------------------- */

test("el catalogo expone estados, tipos de documento y roles", async () => {
  const { status, cuerpo } = await pedir("GET", "/api/v1/teachers/catalogos", "director");

  assert.equal(status, 200);
  assert.deepEqual(cuerpo.data.estados.map((estado) => estado.valor), ["activo", "inactivo"]);
  assert.ok(cuerpo.data.tiposDocumento.some((tipo) => tipo.valor === "dni"));
  assert.deepEqual(cuerpo.data.rolesAsignacion.map((rol) => rol.valor), ["titular", "suplente", "ayudante"]);
});

/* ---------------- Listado y detalle --------------------------------------- */

test("el listado devuelve docentes paginados con filtros y orden", async () => {
  const { status, cuerpo } = await pedir("GET", "/api/v1/teachers?estado=todos&orden=apellido", "director");

  assert.equal(status, 200);
  assert.equal(cuerpo.paginacion.total, 5);
  assert.equal(cuerpo.data[0].apellido, "Fernández");
  assert.ok(cuerpo.data.every((docente) => typeof docente.nombreCompleto === "string"));
});

test("el filtro por estado y la busqueda acotan el listado", async () => {
  const inactivos = await pedir("GET", "/api/v1/teachers?estado=inactivo", "director");
  assert.equal(inactivos.cuerpo.paginacion.total, 1);
  assert.equal(inactivos.cuerpo.data[0].id, "tch-5");

  const busqueda = await pedir("GET", "/api/v1/teachers?estado=todos&q=villatoro", "director");
  assert.equal(busqueda.cuerpo.paginacion.total, 1);
  assert.equal(busqueda.cuerpo.data[0].id, "tch-1");
});

test("el detalle de un docente incluye referencias y periodo; inexistente 404", async () => {
  const { status, cuerpo } = await pedir("GET", "/api/v1/teachers/tch-1", "director");
  assert.equal(status, 200);
  assert.equal(cuerpo.data.apellido, "Villatoro");
  assert.equal(cuerpo.data.nombre, "María");
  assert.equal(cuerpo.data.estado, "activo");

  const inexistente = await pedir("GET", "/api/v1/teachers/tch-999", "director");
  assert.equal(inexistente.status, 404);
});

/* ---------------- Alta, modificacion y baja ------------------------------- */

test("crear un docente valido aplica valores por defecto y registra responsable", async () => {
  const { status, cuerpo } = await pedir("POST", "/api/v1/teachers", "jefeArea", {
    apellido: "Pereyra",
    nombre: "Sofía",
    documento: "20000010",
    email: "sofia.pereyra@prece.local",
    especialidades: ["Física"]
  });

  assert.equal(status, 201);
  assert.equal(cuerpo.data.estado, "activo");
  assert.equal(cuerpo.data.tipoDocumento, "dni");
  assert.deepEqual(cuerpo.data.especialidades, ["Física"]);
  assert.equal(cuerpo.data.escuelaId, "esc-1");
  assert.equal(cuerpo.data.creadoPor, "usr_6");
});

test("no se admiten documento ni email duplicados (409)", async () => {
  const documento = await pedir("POST", "/api/v1/teachers", "director", {
    apellido: "Otro",
    nombre: "Igual",
    documento: "20000001",
    email: "otro.igual@prece.local"
  });
  assert.equal(documento.status, 409);

  const email = await pedir("POST", "/api/v1/teachers", "director", {
    apellido: "Otro",
    nombre: "Igual",
    documento: "20000099",
    email: "maria.villatoro@prece.local"
  });
  assert.equal(email.status, 409);
});

test("un docente sin datos obligatorios devuelve 422", async () => {
  const { status, cuerpo } = await pedir("POST", "/api/v1/teachers", "director", { apellido: "" });
  assert.equal(status, 422);
  assert.ok(cuerpo.error.details.some((detalle) => detalle.field === "documento"));
  assert.ok(cuerpo.error.details.some((detalle) => detalle.field === "email"));
});

test("modificar un docente actualiza campos y responsable", async () => {
  const { status, cuerpo } = await pedir("PATCH", "/api/v1/teachers/tch-4", "jefeArea", { telefono: "11 4444-9999" });
  assert.equal(status, 200);
  assert.equal(cuerpo.data.telefono, "11 4444-9999");
  assert.equal(cuerpo.data.actualizadoPor, "usr_6");
});

test("jefe de area puede modificar pero no dar de baja (403)", async () => {
  const baja = await pedir("DELETE", "/api/v1/teachers/tch-2", "jefeArea");
  assert.equal(baja.status, 403);
});

test("dar de baja un docente lo deja inactivo con fecha", async () => {
  const { status, cuerpo } = await pedir("DELETE", "/api/v1/teachers/tch-2", "director");
  assert.equal(status, 200);
  assert.equal(cuerpo.data.estado, "inactivo");
  assert.ok(cuerpo.data.fechaBaja);
});

/* ---------------- Asignaciones de materia --------------------------------- */

test("un docente inactivo no puede recibir asignaciones (409)", async () => {
  const { status, cuerpo } = await pedir("POST", "/api/v1/teachers/tch-5/subjects", "director", {
    materiaId: "mat",
    cursoId: "cur-1",
    anio: 2026
  });
  assert.equal(status, 409);
  assert.equal(cuerpo.error.code, "CONFLICT");
});

test("alta de asignacion de materia con periodo y referencias", async () => {
  const { status, cuerpo } = await pedir("POST", "/api/v1/teachers/tch-1/subjects", "director", {
    materiaId: "edfisica",
    cursoId: "cur-1",
    anio: 2026,
    cuatrimestre: 1,
    horasSemanales: 4
  });

  assert.equal(status, 201);
  assert.equal(cuerpo.data.materia.nombre, "Ed. Física");
  assert.equal(cuerpo.data.curso.id, "cur-1");
  assert.deepEqual(cuerpo.data.periodo, { anio: 2026, cuatrimestre: 1, etiqueta: "2026 - C1" });
  assert.equal(cuerpo.data.creadoPor, "usr_2");
});

test("no se repite una asignacion de materia identica (409) y materia inexistente 422", async () => {
  const duplicada = await pedir("POST", "/api/v1/teachers/tch-1/subjects", "director", {
    materiaId: "mat",
    cursoId: "cur-1",
    anio: 2026
  });
  assert.equal(duplicada.status, 409);

  const inexistente = await pedir("POST", "/api/v1/teachers/tch-1/subjects", "director", {
    materiaId: "mat-999",
    cursoId: "cur-1",
    anio: 2026
  });
  assert.equal(inexistente.status, 422);
});

test("listar y obtener asignaciones de materia del docente", async () => {
  const lista = await pedir("GET", "/api/v1/teachers/tch-1/subjects?estado=todos", "director");
  assert.equal(lista.status, 200);
  assert.equal(lista.cuerpo.paginacion.total, 2);

  const detalle = await pedir("GET", "/api/v1/teachers/tch-1/subjects/tcm-1", "director");
  assert.equal(detalle.status, 200);
  assert.equal(detalle.cuerpo.data.materia.nombre, "Matemática");

  const ajeno = await pedir("GET", "/api/v1/teachers/tch-2/subjects/tcm-1", "director");
  assert.equal(ajeno.status, 404);
});

test("modificar una asignacion de materia guarda historial y baja logica", async () => {
  const modificada = await pedir("PATCH", "/api/v1/teacher-subjects/tcm-4", "director", { horasSemanales: 9 });
  assert.equal(modificada.status, 200);
  assert.equal(modificada.cuerpo.data.horasSemanales, 9);
  assert.equal(modificada.cuerpo.data.historial.length, 1);
  assert.equal(modificada.cuerpo.data.historial[0].horasSemanales, 5);

  const baja = await pedir("DELETE", "/api/v1/teacher-subjects/tcm-4", "director");
  assert.equal(baja.status, 200);
  assert.equal(baja.cuerpo.data.estado, "inactivo");
  assert.ok(baja.cuerpo.data.fechaBaja);
});

/* ---------------- Asignaciones de curso/division -------------------------- */

test("el alta de asignacion de curso exige curso o division (422) y valida el rol", async () => {
  const sinAlcance = await pedir("POST", "/api/v1/teachers/tch-3/courses", "director", { anio: 2026 });
  assert.equal(sinAlcance.status, 422);

  const rolInvalido = await pedir("POST", "/api/v1/teachers/tch-3/courses", "director", { cursoId: "cur-6", anio: 2026, rol: "capitan" });
  assert.equal(rolInvalido.status, 422);
});

test("alta, modificacion y baja de una asignacion de curso", async () => {
  const alta = await pedir("POST", "/api/v1/teachers/tch-3/courses", "director", {
    cursoId: "cur-6",
    anio: 2026,
    rol: "titular"
  });
  assert.equal(alta.status, 201);
  assert.equal(alta.cuerpo.data.rol, "titular");
  assert.equal(alta.cuerpo.data.curso.id, "cur-6");

  const id = alta.cuerpo.data.id;
  const duplicada = await pedir("POST", "/api/v1/teachers/tch-3/courses", "director", { cursoId: "cur-6", anio: 2026, rol: "titular" });
  assert.equal(duplicada.status, 409);

  const modificada = await pedir("PATCH", `/api/v1/teacher-courses/${id}`, "director", { rol: "ayudante" });
  assert.equal(modificada.status, 200);
  assert.equal(modificada.cuerpo.data.rol, "ayudante");
  assert.equal(modificada.cuerpo.data.historial.length, 1);

  const baja = await pedir("DELETE", `/api/v1/teacher-courses/${id}`, "director");
  assert.equal(baja.status, 200);
  assert.equal(baja.cuerpo.data.estado, "inactivo");
});

test("listar asignaciones de curso del docente", async () => {
  const lista = await pedir("GET", "/api/v1/teachers/tch-2/courses?estado=todos", "director");
  assert.equal(lista.status, 200);
  assert.equal(lista.cuerpo.paginacion.total, 1);
  assert.equal(lista.cuerpo.data[0].division.id, "div-8");
});

/* ---------------- Consultas inversas -------------------------------------- */

test("docentes por materia, curso y division", async () => {
  const porMateria = await pedir("GET", "/api/v1/teachers/by-subject/mat", "director");
  assert.equal(porMateria.status, 200);
  assert.equal(porMateria.cuerpo.paginacion.total, 1);
  assert.equal(porMateria.cuerpo.data[0].id, "tch-1");

  const porCurso = await pedir("GET", "/api/v1/teachers/by-course/cur-1", "director");
  assert.equal(porCurso.status, 200);
  assert.deepEqual(porCurso.cuerpo.data.map((docente) => docente.id).sort(), ["tch-1", "tch-4"]);

  const porDivision = await pedir("GET", "/api/v1/teachers/by-division/div-8", "director");
  assert.equal(porDivision.status, 200);
  assert.equal(porDivision.cuerpo.data[0].id, "tch-2");
  assert.equal(porDivision.cuerpo.data[0].asignaciones.length, 2);
});

test("las consultas inversas rechazan referencias inexistentes (404)", async () => {
  const materia = await pedir("GET", "/api/v1/teachers/by-subject/mat-999", "director");
  assert.equal(materia.status, 404);

  const curso = await pedir("GET", "/api/v1/teachers/by-course/cur-999", "director");
  assert.equal(curso.status, 404);

  const division = await pedir("GET", "/api/v1/teachers/by-division/div-999", "director");
  assert.equal(division.status, 404);
});
