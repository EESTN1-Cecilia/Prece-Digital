/* Gestion de alumnos (CRUD): creacion, consulta, modificacion, desactivacion,
   listado y busqueda con filtros combinables, paginacion y ordenamiento.

   Corre sin base de datos: usa los repositorios en memoria, el flujo real de
   autenticacion (JWT) y el middleware authorize de rutas.

   Permisos del seed: director = ALL (students.read + students.write),
   docente = solo students.read, server = sin students.read. */

import assert from "node:assert/strict";
import test, { after, before, beforeEach } from "node:test";
import { createApp } from "../src/app.mjs";
import { apiRoutes } from "../routes/index.mjs";
import { getStore, resetStore } from "../database/memory-store.mjs";
import { seedAuthData } from "../database/seeds/auth.seed.mjs";
import { seedStudents } from "../database/seeds/students.seed.mjs";
import studentRepository from "../modules/students/student.repository.mjs";
import { buscarDivision } from "../modules/students/catalogo.mjs";

const PUERTO = 4002;
const base = `http://127.0.0.1:${PUERTO}`;

let servidor;
let director;
let docente;
let server;

function edadDe(fechaISO) {
  const nacimiento = new Date(`${fechaISO}T00:00:00`);
  const hoy = new Date();
  const utcHoy = Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const utcNac = Date.UTC(nacimiento.getFullYear(), nacimiento.getMonth(), nacimiento.getDate());
  return Math.floor((utcHoy - utcNac) / (365.25 * 24 * 60 * 60 * 1000));
}

async function pedir(method, ruta, { token, body, headers = {} } = {}) {
  const respuesta = await fetch(`${base}${ruta}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...headers
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const texto = await respuesta.text();
  return { status: respuesta.status, cuerpo: texto ? JSON.parse(texto) : null };
}

async function login(email, password) {
  const respuesta = await fetch(`${base}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  return (await respuesta.json());
}

function idDe(dni) {
  return studentRepository.findByDni(dni).id;
}

before(async () => {
  await seedAuthData();
  servidor = createApp(apiRoutes);
  await new Promise((listo) => servidor.listen(PUERTO, listo));
});

after(async () => {
  await new Promise((listo) => servidor.close(listo));
});

beforeEach(async () => {
  resetStore();
  await seedAuthData();
  await seedStudents();
  director = await login("director@prece.local", "Director123!");
  docente = await login("docente@prece.local", "Docente123!");
  server = await login("server@prece.local", "Server123!");
});

test("catalogo: curso con division valida tiene turno y orientacion; invalida no existe", () => {
  const informatica = buscarDivision(4, "1");
  const programacion = buscarDivision(7, "2");
  const basico = buscarDivision(1, "6");

  assert.deepEqual(informatica, { turno: "mañana", orientacion: "Técnico en Informática" });
  assert.deepEqual(programacion, { turno: "tarde", orientacion: "Técnico en Programación" });
  assert.deepEqual(basico, { turno: "mañana", orientacion: null });
  assert.equal(buscarDivision(4, "9"), null);
  assert.equal(buscarDivision(8, "1"), null);
});

test("sin autenticacion todas las operaciones devuelven 401", async () => {
  const listar = await pedir("GET", "/api/v1/students");
  const consultar = await pedir("GET", "/api/v1/students/alu-1");
  const crear = await pedir("POST", "/api/v1/students", { body: { nombre: "A" } });
  const modificar = await pedir("PATCH", "/api/v1/students/alu-1");
  const desactivar = await pedir("DELETE", "/api/v1/students/alu-1");

  for (const respuesta of [listar, consultar, crear, modificar, desactivar]) {
    assert.equal(respuesta.status, 401);
  }
});

test("autenticado sin el permiso responde 403", async () => {
  const crearDocente = await pedir("POST", "/api/v1/students", {
    token: docente.accessToken,
    body: { nombre: "Ana", apellido: "Test", dni: "45123123" }
  });
  const desactivarDocente = await pedir("DELETE", `/api/v1/students/${idDe("40123123")}`, {
    token: docente.accessToken
  });
  const listarServer = await pedir("GET", "/api/v1/students", { token: server.accessToken });

  assert.equal(crearDocente.status, 403);
  assert.equal(desactivarDocente.status, 403);
  assert.equal(crearDocente.cuerpo.error.code, "forbidden");
  assert.equal(listarServer.status, 403);
});

test("el frontend no puede otorgar permisos mediante cabeceras", async () => {
  const respuesta = await pedir("POST", "/api/v1/students", {
    token: docente.accessToken,
    headers: { "X-Roles": "director", "X-Permisos": "students.write" },
    body: { nombre: "Ana", apellido: "Test", dni: "45123123" }
  });

  assert.equal(respuesta.status, 403);
});

test("crear un alumno devuelve 201 con datos derivados del catalogo", async () => {
  const { status, cuerpo } = await pedir("POST", "/api/v1/students", {
    token: director.accessToken,
    body: {
      nombre: "Ana",
      apellido: "Test",
      dni: "45123123",
      fechaNacimiento: "2010-01-01",
      curso: 4,
      division: "1",
      condicion: "regular",
      email: "ana.test@alumno.to",
      telefono: "111 555-1212",
      contacto: { nombre: "Pedro", apellido: "Test", parentesco: "padre", email: "p.test@to.to" }
    }
  });

  assert.equal(status, 201);
  assert.ok(cuerpo.data.id);
  assert.equal(cuerpo.data.estado, "activo");
  assert.equal(cuerpo.data.nombreCompleto, "Test, Ana");
  assert.equal(cuerpo.data.turno, "mañana");
  assert.equal(cuerpo.data.orientacion, "Técnico en Informática");
  assert.equal(cuerpo.data.edad, edadDe("2010-01-01"));
  assert.equal(cuerpo.data.condicion, "regular");
  assert.equal(cuerpo.data.contacto.parentesco, "padre");
  assert.ok(cuerpo.data.fechaAlta);
  assert.equal(cuerpo.data.fechaBaja, null);
});

test("crear sin los campos obligatorios devuelve 422 con detalle por campo", async () => {
  const { status, cuerpo } = await pedir("POST", "/api/v1/students", {
    token: director.accessToken,
    body: {}
  });

  assert.equal(status, 422);
  assert.equal(cuerpo.error.code, "VALIDATION_ERROR");
  const campos = cuerpo.error.details.map((d) => d.field).sort();
  assert.deepEqual(campos, ["apellido", "dni", "nombre"]);
});

test("crear con DNI invalido devuelve 422", async () => {
  const { status, cuerpo } = await pedir("POST", "/api/v1/students", {
    token: director.accessToken,
    body: { nombre: "Ana", apellido: "Test", dni: "123" }
  });

  assert.equal(status, 422);
  assert.equal(cuerpo.error.details[0].field, "dni");
});

test("no se puede registrar dos alumnos con el mismo DNI", async () => {
  const { status, cuerpo } = await pedir("POST", "/api/v1/students", {
    token: director.accessToken,
    body: { nombre: "Juan", apellido: "Lopez", dni: "40123123" }
  });

  assert.equal(status, 409);
  assert.equal(cuerpo.error.code, "CONFLICT");
});

test("crear con formato invalido (email, condicion, fecha) devuelve 422", async () => {
  const cuerpoBase = { nombre: "Ana", apellido: "Test", dni: "45123123" };
  const email = await pedir("POST", "/api/v1/students", {
    token: director.accessToken,
    body: { ...cuerpoBase, email: "no-es-un-email" }
  });
  const condicion = await pedir("POST", "/api/v1/students", {
    token: director.accessToken,
    body: { ...cuerpoBase, condicion: "promocionado" }
  });
  const fecha = await pedir("POST", "/api/v1/students", {
    token: director.accessToken,
    body: { ...cuerpoBase, fechaNacimiento: "2030-01-01" }
  });

  assert.equal(email.status, 422);
  assert.equal(condicion.status, 422);
  assert.equal(fecha.status, 422);
  assert.deepEqual([email.cuerpo.error.details[0].field, condicion.cuerpo.error.details[0].field, fecha.cuerpo.error.details[0].field], [
    "email",
    "condicion",
    "fechaNacimiento"
  ]);
});

test("crear con curso y division inexistentes (o incompletos) devuelve 422", async () => {
  const inexistente = await pedir("POST", "/api/v1/students", {
    token: director.accessToken,
    body: { nombre: "Ana", apellido: "Test", dni: "45123123", curso: 4, division: "9" }
  });
  const incompleto = await pedir("POST", "/api/v1/students", {
    token: director.accessToken,
    body: { nombre: "Ana", apellido: "Test", dni: "45123123", curso: 4 }
  });

  assert.equal(inexistente.status, 422);
  assert.equal(inexistente.cuerpo.error.details[0].field, "division");
  assert.equal(incompleto.status, 422);
});

test("consultar un alumno por su identificador", async () => {
  const { status, cuerpo } = await pedir("GET", `/api/v1/students/${idDe("40123123")}`, {
    token: director.accessToken
  });

  assert.equal(status, 200);
  assert.equal(cuerpo.data.dni, "40123123");
  assert.equal(cuerpo.data.nombre, "Juan");

  const inexistente = await pedir("GET", "/api/v1/students/alu_no_existe", { token: director.accessToken });
  assert.equal(inexistente.status, 404);
  assert.equal(inexistente.cuerpo.error.code, "NOT_FOUND");
});

test("listar: paginacion con meta completa (default activos)", async () => {
  const { status, cuerpo } = await pedir("GET", "/api/v1/students", { token: director.accessToken });

  assert.equal(status, 200);
  assert.equal(cuerpo.data.length, 20);
  assert.deepEqual(cuerpo.paginacion, {
    total: 25,
    pagina: 1,
    porPagina: 20,
    totalPaginas: 2,
    tieneAnterior: false,
    tieneSiguiente: true
  });
});

test("listar: segunda pagina con pagina anterior", async () => {
  const { status, cuerpo } = await pedir("GET", "/api/v1/students?pagina=2&porPagina=20", {
    token: director.accessToken
  });

  assert.equal(status, 200);
  assert.equal(cuerpo.data.length, 5);
  assert.equal(cuerpo.paginacion.total, 25);
  assert.equal(cuerpo.paginacion.tieneAnterior, true);
  assert.equal(cuerpo.paginacion.tieneSiguiente, false);
});

test("filtro por estado: activo, inactivo y todos", async () => {
  const activos = await pedir("GET", "/api/v1/students?estado=activo", { token: director.accessToken });
  const inactivos = await pedir("GET", "/api/v1/students?estado=inactivo", { token: director.accessToken });
  const todos = await pedir("GET", "/api/v1/students?estado=todos", { token: director.accessToken });

  assert.equal(activos.cuerpo.paginacion.total, 25);
  assert.equal(inactivos.cuerpo.paginacion.total, 1);
  assert.equal(inactivos.cuerpo.data[0].dni, "37776666");
  assert.equal(todos.cuerpo.paginacion.total, 26);
});

test("busqueda parcial por apellido y nombre (case-insensitive) y DNI exacto", async () => {
  const porApellido = await pedir("GET", "/api/v1/students?apellido=lop", { token: director.accessToken });
  assert.equal(porApellido.cuerpo.paginacion.total, 2);

  const apellidoYNombre = await pedir("GET", "/api/v1/students?apellido=lo&nombre=ma", { token: director.accessToken });
  assert.equal(apellidoYNombre.cuerpo.paginacion.total, 1);
  assert.equal(apellidoYNombre.cuerpo.data[0].dni, "40123124");

  const porDni = await pedir("GET", "/api/v1/students?dni=40123124", { token: director.accessToken });
  assert.equal(porDni.cuerpo.paginacion.total, 1);
  assert.equal(porDni.cuerpo.data[0].apellido, "Lopez");
});

test("filtros combinados: curso + division + condicion", async () => {
  const { status, cuerpo } = await pedir("GET", "/api/v1/students?curso=4&division=1&condicion=regular", {
    token: director.accessToken
  });

  assert.equal(status, 200);
  assert.equal(cuerpo.paginacion.total, 1);
  assert.equal(cuerpo.data[0].dni, "40123124");
  assert.deepEqual(cuerpo.filtros.curso, 4);
  assert.equal(cuerpo.filtros.division, "1");
  assert.equal(cuerpo.filtros.condicion, "regular");
});

test("filtros combinados: apellido + estado", async () => {
  const conTodos = await pedir("GET", "/api/v1/students?apellido=par&estado=todos", { token: director.accessToken });
  const sinInactivos = await pedir("GET", "/api/v1/students?apellido=par&estado=activo", { token: director.accessToken });

  assert.equal(conTodos.cuerpo.paginacion.total, 1);
  assert.equal(conTodos.cuerpo.data[0].dni, "37776666");
  assert.equal(sinInactivos.cuerpo.paginacion.total, 0);
});

test("ordenamiento por dni ascendente y descendente", async () => {
  const ascendente = await pedir("GET", "/api/v1/students?orden=dni&porPagina=1", { token: director.accessToken });
  const descendente = await pedir("GET", "/api/v1/students?orden=dni_desc&porPagina=1", { token: director.accessToken });

  assert.equal(ascendente.cuerpo.data[0].dni, "20009999");
  assert.equal(descendente.cuerpo.data[0].dni, "42234567");
});

test("parametros invalidos de listado devuelven 422", async () => {
  const porPagina = await pedir("GET", "/api/v1/students?porPagina=500", { token: director.accessToken });
  const orden = await pedir("GET", "/api/v1/students?orden=apellido;DROP", { token: director.accessToken });
  const pagina = await pedir("GET", "/api/v1/students?pagina=abc", { token: director.accessToken });

  assert.equal(porPagina.status, 422);
  assert.equal(orden.status, 422);
  assert.equal(pagina.status, 422);
});

test("modificar un alumno: cambios, conflictos y campos no permitidos ignorados", async () => {
  const creado = await pedir("POST", "/api/v1/students", {
    token: director.accessToken,
    body: { nombre: "Ana", apellido: "Test", dni: "45123123", curso: 4, division: "1" }
  });
  const id = creado.cuerpo.data.id;

  const { status, cuerpo } = await pedir("PATCH", `/api/v1/students/${id}`, {
    token: director.accessToken,
    body: {
      nombre: "Ana Maria",
      dni: "45123124",
      isActive: false,
      password: "hack"
    }
  });

  assert.equal(status, 200);
  assert.equal(cuerpo.data.nombre, "Ana Maria");
  assert.equal(cuerpo.data.dni, "45123124");
  assert.equal(cuerpo.data.estado, "activo");
  assert.equal(cuerpo.data.fechaNacimiento, null);
  assert.equal(cuerpo.data.password, undefined);

  const duplicado = await pedir("PATCH", `/api/v1/students/${id}`, {
    token: director.accessToken,
    body: { dni: "40123123" }
  });
  assert.equal(duplicado.status, 409);

  const emailInvalido = await pedir("PATCH", `/api/v1/students/${id}`, {
    token: director.accessToken,
    body: { email: "mal" }
  });
  assert.equal(emailInvalido.status, 422);

  const cursoInvalido = await pedir("PATCH", `/api/v1/students/${id}`, {
    token: director.accessToken,
    body: { curso: 7, division: "9" }
  });
  assert.equal(cursoInvalido.status, 422);
});

test("desactivar un alumno es baja logica: conserva el registro y el historial", async () => {
  const creado = await pedir("POST", "/api/v1/students", {
    token: director.accessToken,
    body: { nombre: "Ana", apellido: "Test", dni: "45123123" }
  });
  const id = creado.cuerpo.data.id;
  assert.equal(studentRepository.listarTraza(id)[0].accion, "create");

  const { status, cuerpo } = await pedir("DELETE", `/api/v1/students/${id}`, { token: director.accessToken });

  assert.equal(status, 200);
  assert.equal(cuerpo.data.estado, "inactivo");
  assert.ok(cuerpo.data.fechaBaja);
  assert.equal(studentRepository.listarTraza(id)[1].accion, "deactivate");

  const sigueExistiendo = await pedir("GET", `/api/v1/students/${id}`, { token: director.accessToken });
  assert.equal(sigueExistiendo.status, 200);
  assert.equal(sigueExistiendo.cuerpo.data.estado, "inactivo");

  const inactivos = await pedir("GET", "/api/v1/students?estado=inactivo&dni=45123123", { token: director.accessToken });
  assert.equal(inactivos.cuerpo.paginacion.total, 1);
});

test("busqueda por edad calculada desde la fecha de nacimiento", async () => {
  const edadIara = edadDe("2013-08-18");
  const { status, cuerpo } = await pedir("GET", `/api/v1/students?edad=${edadIara}&dni=40987765`, {
    token: director.accessToken
  });

  assert.equal(status, 200);
  assert.equal(cuerpo.paginacion.total, 1);
  assert.equal(cuerpo.data[0].nombre, "Iara");
  assert.equal(getStore().students.get(idDe("40987765")).edad, undefined);
});