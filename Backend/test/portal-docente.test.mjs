/* Portal docente de punta a punta: alta de perfil con rol Docente desde
   Direccion (vinculo cuenta <-> registro docente), validaciones de duplicados,
   baja logica que corta el acceso, login, alcance por curso y asistencia por
   clase. Datos del seed de desarrollo. */

import assert from "node:assert/strict";
import test, { after, before, beforeEach } from "node:test";
import { createApp } from "../src/app.mjs";
import { apiRoutes } from "../routes/index.mjs";
import { resetStore } from "../database/memory-store.mjs";
import { seedDesarrollo } from "../database/seeds/index.mjs";

const PUERTO = 4041;
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
  return { status: respuesta.status, cuerpo: await respuesta.json() };
}

beforeEach(async () => {
  resetStore();
  await seedDesarrollo();
  tokens.director = (await login("director@prece.local", "Director123!")).cuerpo.accessToken;
  tokens.docente = (await login("docente@prece.local", "Docente123!")).cuerpo.accessToken;
  tokens.secretario = (await login("secretaria@prece.local", "Secretaria123!")).cuerpo.accessToken;
});

async function pedir(method, ruta, quien, body) {
  const token = tokens[quien] ?? quien;
  const respuesta = await fetch(`${base}${ruta}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { "Content-Type": "application/json" } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  return { status: respuesta.status, cuerpo: await respuesta.json() };
}

const PERFIL_DOCENTE = {
  nombre: "Paula",
  apellido: "Quiroga",
  email: "paula.quiroga@prece.local",
  dni: "31444555",
  roles: ["docente"]
};

const CLAVE_NUEVA = "ClaveNueva2026";

/* Primer ingreso con la clave provisoria (el DNI) y cambio obligatorio:
   devuelve el token de la sesion ya habilitada. */
async function ingresarYCambiarClave(email, dni) {
  const ingreso = await login(email, dni);
  const cambio = await pedir("POST", "/api/v1/auth/cambiar-clave", ingreso.cuerpo.accessToken, { actual: dni, nueva: CLAVE_NUEVA });
  assert.equal(cambio.status, 200);
  return cambio.cuerpo.accessToken;
}

function hoy() {
  const ahora = new Date();
  return new Date(ahora.getTime() - ahora.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

async function alumnos(cursoId, quien = "docente") {
  return (await pedir("GET", `/api/v1/docente/cursos/${cursoId}/alumnos`, quien)).cuerpo.data;
}

/* ---------------- Alta de perfil con rol Docente -------------------------- */

test("Direccion crea un perfil Docente y aparece en el sector Docentes con la misma cuenta", async () => {
  const alta = await pedir("POST", "/api/v1/users", "director", PERFIL_DOCENTE);
  assert.equal(alta.status, 201);
  assert.ok(alta.cuerpo.data.docenteId);
  assert.equal(alta.cuerpo.data.passwordTemporal, undefined);
  assert.equal(alta.cuerpo.data.claveProvisoria, "dni");

  const listado = await pedir("GET", "/api/v1/teachers?q=quiroga", "director");
  assert.equal(listado.cuerpo.data.length, 1);
  assert.equal(listado.cuerpo.data[0].id, alta.cuerpo.data.docenteId);
  assert.equal(listado.cuerpo.data[0].userId, alta.cuerpo.data.id);
  assert.equal(listado.cuerpo.data[0].documento, "31444555");

  const ingreso = await login(PERFIL_DOCENTE.email, PERFIL_DOCENTE.dni);
  assert.equal(ingreso.status, 200);
  assert.deepEqual(ingreso.cuerpo.roles, ["docente"]);
  assert.equal(ingreso.cuerpo.usuario.debeCambiarClave, true);
});

test("un DNI o un correo duplicados impiden crear otra cuenta (409 con el campo)", async () => {
  await pedir("POST", "/api/v1/users", "director", PERFIL_DOCENTE);

  const mismoDni = await pedir("POST", "/api/v1/users", "director", { ...PERFIL_DOCENTE, email: "otra@prece.local" });
  assert.equal(mismoDni.status, 409);
  assert.equal(mismoDni.cuerpo.error.details[0].field, "dni");

  const mismoEmail = await pedir("POST", "/api/v1/users", "director", { ...PERFIL_DOCENTE, dni: "31444556" });
  assert.equal(mismoEmail.status, 409);
  assert.equal(mismoEmail.cuerpo.error.details[0].field, "email");

  const docentes = await pedir("GET", "/api/v1/teachers?q=quiroga", "director");
  assert.equal(docentes.cuerpo.data.length, 1);
});

test("si la persona ya era docente sin cuenta, se reusa su registro en lugar de duplicarlo", async () => {
  const alta = await pedir("POST", "/api/v1/users", "director", {
    nombre: "Humberto",
    apellido: "Sosa",
    email: "humberto.sosa@prece.local",
    dni: "20000002",
    roles: ["docente"]
  });
  assert.equal(alta.status, 201);
  assert.equal(alta.cuerpo.data.docenteId, "tch-2");

  const sosas = await pedir("GET", "/api/v1/teachers?q=20000002", "director");
  assert.equal(sosas.cuerpo.data.length, 1);
  assert.equal(sosas.cuerpo.data[0].userId, alta.cuerpo.data.id);
});

test("un DNI de otro docente con otro nombre no pisa sus datos (409 con el campo)", async () => {
  const alta = await pedir("POST", "/api/v1/users", "director", { ...PERFIL_DOCENTE, dni: "20000002" });
  assert.equal(alta.status, 409);
  assert.equal(alta.cuerpo.error.details[0].field, "dni");

  const sosa = await pedir("GET", "/api/v1/teachers/tch-2", "director");
  assert.equal(sosa.cuerpo.data.apellido, "Sosa");
  assert.equal(sosa.cuerpo.data.userId, null);

  const cuentas = await pedir("GET", "/api/v1/users?q=quiroga", "director");
  assert.equal(cuentas.cuerpo.data.length, 0);
});

test("no se puede vincular una cuenta nueva a un docente que ya tiene cuenta", async () => {
  const conflicto = await pedir("POST", "/api/v1/users", "director", {
    nombre: "María",
    apellido: "Villatoro",
    email: "maria.villatoro@prece.local",
    dni: "20000001",
    roles: ["docente"]
  });
  assert.equal(conflicto.status, 409);
});

/* ---------------- Edicion y baja desde el sector Docentes ----------------- */

test("editar el docente actualiza su cuenta; la baja corta el acceso y conserva el registro", async () => {
  const alta = await pedir("POST", "/api/v1/users", "director", PERFIL_DOCENTE);
  const docenteId = alta.cuerpo.data.docenteId;
  const ingreso = await login(PERFIL_DOCENTE.email, PERFIL_DOCENTE.dni);

  const edicion = await pedir("PATCH", `/api/v1/teachers/${docenteId}`, "director", { email: "pquiroga@prece.local", telefono: "11 4444-5555" });
  assert.equal(edicion.status, 200);
  const cuenta = await pedir("GET", `/api/v1/users/${alta.cuerpo.data.id}`, "director");
  assert.equal(cuenta.cuerpo.data.email, "pquiroga@prece.local");
  assert.equal(cuenta.cuerpo.data.telefono, "11 4444-5555");

  const choque = await pedir("PATCH", `/api/v1/teachers/${docenteId}`, "director", { email: "director@prece.local" });
  assert.equal(choque.status, 409);

  const baja = await pedir("DELETE", `/api/v1/teachers/${docenteId}`, "director");
  assert.equal(baja.status, 200);
  assert.equal(baja.cuerpo.data.estado, "inactivo");

  const sesionAbierta = await pedir("GET", "/api/v1/docente/mis-cursos", ingreso.cuerpo.accessToken);
  assert.equal(sesionAbierta.status, 401);

  const reingreso = await login("pquiroga@prece.local", PERFIL_DOCENTE.dni);
  assert.equal(reingreso.status, 403);
  assert.equal(reingreso.cuerpo.error.code, "ACCOUNT_INACTIVE");

  const historico = await pedir("GET", `/api/v1/teachers/${docenteId}`, "director");
  assert.equal(historico.status, 200);
  assert.equal(historico.cuerpo.data.estado, "inactivo");
});

test("nadie puede darse de baja a si mismo como docente", async () => {
  const alta = await pedir("POST", "/api/v1/users", "director", { ...PERFIL_DOCENTE, roles: ["director", "docente"] });
  const propio = await ingresarYCambiarClave(PERFIL_DOCENTE.email, PERFIL_DOCENTE.dni);

  const baja = await pedir("DELETE", `/api/v1/teachers/${alta.cuerpo.data.docenteId}`, propio);
  assert.equal(baja.status, 403);

  const porEdicion = await pedir("PATCH", `/api/v1/teachers/${alta.cuerpo.data.docenteId}`, propio, { estado: "inactivo" });
  assert.equal(porEdicion.status, 403);
});

test("contraseña incorrecta sigue respondiendo 401 generico aunque la cuenta este inactiva", async () => {
  const respuesta = await login("inactivo@prece.local", "una-clave-cualquiera");
  assert.equal(respuesta.status, 401);
});

/* ---------------- Alcance del docente ------------------------------------- */

test("el docente solo ve sus cursos y no accede a funciones administrativas", async () => {
  const cursos = await pedir("GET", "/api/v1/docente/mis-cursos", "docente");
  assert.equal(cursos.status, 200);
  assert.deepEqual(cursos.cuerpo.data.map((curso) => curso.id), ["1-1", "2-1", "3-3"]);
  assert.ok(cursos.cuerpo.data.every((curso) => Number.isInteger(curso.cantidadAlumnos)));

  const propia = await pedir("GET", "/api/v1/docente/cursos/1-1/alumnos", "docente");
  assert.equal(propia.status, 200);
  assert.ok(propia.cuerpo.data.length > 0);
  assert.ok(propia.cuerpo.data.every((alumno) => !("telefono" in alumno) && !("direccion" in alumno)));

  const ajena = await pedir("GET", "/api/v1/docente/cursos/4-1/alumnos", "docente");
  assert.equal(ajena.status, 403);

  for (const ruta of ["/api/v1/users", "/api/v1/teachers", "/api/v1/teachers/tch-2"]) {
    assert.equal((await pedir("GET", ruta, "docente")).status, 403, ruta);
  }

  const asignar = await pedir("POST", "/api/v1/teachers/tch-1/courses", "docente", { cursoId: "cur-2", anio: 2026 });
  assert.equal(asignar.status, 403);
});

/* ---------------- Asistencia por clase ------------------------------------ */

test("el docente registra la asistencia completa de un curso propio y no puede repetirla", async () => {
  const lista = await alumnos("1-1");
  const registros = lista.map((alumno, indice) => ({ alumnoId: alumno.id, estado: indice === 0 ? "ausente" : "presente" }));

  const alta = await pedir("POST", "/api/v1/asistencia-clases", "docente", { cursoId: "1-1", materia: "Matemática I", fecha: hoy(), registros });
  assert.equal(alta.status, 201);
  assert.equal(alta.cuerpo.data.resumen.ausente, 1);
  assert.equal(alta.cuerpo.data.resumen.total, lista.length);

  const repetida = await pedir("POST", "/api/v1/asistencia-clases", "docente", { cursoId: "1-1", materia: "matematica i", fecha: hoy(), registros });
  assert.equal(repetida.status, 409);

  const historial = await pedir("GET", "/api/v1/asistencia-clases?cursoId=1-1", "docente");
  assert.equal(historial.cuerpo.data.length, 1);

  const detalle = await pedir("GET", `/api/v1/asistencia-clases/${alta.cuerpo.data.id}`, "docente");
  assert.equal(detalle.status, 200);
  assert.equal(detalle.cuerpo.data.registros.length, lista.length);
});

test("la asistencia valida curso, materia, fecha, alumnos y completitud", async () => {
  const lista = await alumnos("1-1");
  const completos = lista.map((alumno) => ({ alumnoId: alumno.id, estado: "presente" }));
  const cuerpo = { cursoId: "1-1", materia: "Matemática I", fecha: hoy(), registros: completos };

  const cursoAjeno = await pedir("POST", "/api/v1/asistencia-clases", "docente", { ...cuerpo, cursoId: "4-1" });
  assert.equal(cursoAjeno.status, 403);

  const materiaAjena = await pedir("POST", "/api/v1/asistencia-clases", "docente", { ...cuerpo, materia: "Historia" });
  assert.equal(materiaAjena.status, 403);

  const parcial = await pedir("POST", "/api/v1/asistencia-clases", "docente", { ...cuerpo, registros: completos.slice(1) });
  assert.equal(parcial.status, 422);

  const intruso = (await pedir("GET", "/api/v1/students?curso=4&division=1", "director")).cuerpo.data?.[0];
  const conIntruso = await pedir("POST", "/api/v1/asistencia-clases", "docente", {
    ...cuerpo,
    registros: [...completos, { alumnoId: intruso?.id ?? "alu-inexistente", estado: "presente" }]
  });
  assert.equal(conIntruso.status, 422);

  const estadoInvalido = await pedir("POST", "/api/v1/asistencia-clases", "docente", {
    ...cuerpo,
    registros: completos.map((item) => ({ ...item, estado: "feriado" }))
  });
  assert.equal(estadoInvalido.status, 422);

  const futura = await pedir("POST", "/api/v1/asistencia-clases", "docente", { ...cuerpo, fecha: "2999-01-01" });
  assert.equal(futura.status, 422);

  const sinToken = await pedir("POST", "/api/v1/asistencia-clases", null, cuerpo);
  assert.equal(sinToken.status, 401);
});

test("la correccion queda en el historial con usuario y fecha; otros roles sin permiso no corrigen", async () => {
  const lista = await alumnos("1-1");
  const registros = lista.map((alumno) => ({ alumnoId: alumno.id, estado: "presente" }));
  const alta = await pedir("POST", "/api/v1/asistencia-clases", "docente", { cursoId: "1-1", materia: "Matemática I", fecha: hoy(), registros });

  const corregidos = registros.map((item, indice) => (indice === 0 ? { ...item, estado: "tarde" } : item));
  const correccion = await pedir("PUT", `/api/v1/asistencia-clases/${alta.cuerpo.data.id}`, "docente", { registros: corregidos });
  assert.equal(correccion.status, 200);
  assert.equal(correccion.cuerpo.data.resumen.tarde, 1);
  assert.equal(correccion.cuerpo.data.historial.length, 1);
  assert.ok(correccion.cuerpo.data.historial[0].modificadoPor);
  assert.ok(correccion.cuerpo.data.historial[0].modificadoEn);

  const secretaria = await pedir("PUT", `/api/v1/asistencia-clases/${alta.cuerpo.data.id}`, "secretario", { registros });
  assert.equal(secretaria.status, 403);
});

/* ---------------- Planilla mensual (guardado en lote) --------------------- */

function diasAtras(cantidad) {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() - cantidad);
  return new Date(fecha.getTime() - fecha.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

test("la planilla mensual registra y corrige varios dias en un solo guardado", async () => {
  const lista = await alumnos("1-1");
  assert.ok(lista.every((alumno) => "genero" in alumno));
  const todos = (estado) => lista.map((alumno) => ({ alumnoId: alumno.id, estado }));

  const primero = await pedir("PUT", "/api/v1/asistencia-clases/planilla", "docente", {
    cursoId: "1-1",
    materia: "Matemática I",
    tomas: [{ fecha: diasAtras(1), registros: todos("presente") }, { fecha: hoy(), registros: todos("ausente") }]
  });
  assert.equal(primero.status, 200);
  assert.equal(primero.cuerpo.registradas, 2);

  const segundo = await pedir("PUT", "/api/v1/asistencia-clases/planilla", "docente", {
    cursoId: "1-1",
    materia: "Matemática I",
    tomas: [{ fecha: hoy(), registros: todos("tarde") }]
  });
  assert.equal(segundo.status, 200);
  assert.equal(segundo.cuerpo.corregidas, 1);

  const mes = await pedir("GET", `/api/v1/asistencia-clases?cursoId=1-1&materia=Matem%C3%A1tica%20I&incluirRegistros=1`, "docente");
  assert.equal(mes.cuerpo.data.length, 2);
  const deHoy = mes.cuerpo.data.find((toma) => toma.fecha === hoy());
  assert.ok(deHoy.registros.every((item) => item.estado === "tarde"));
  assert.equal(deHoy.correcciones, 1);
});

test("si un dia de la planilla es invalido no se guarda ninguno", async () => {
  const lista = await alumnos("1-1");
  const completos = lista.map((alumno) => ({ alumnoId: alumno.id, estado: "presente" }));

  const respuesta = await pedir("PUT", "/api/v1/asistencia-clases/planilla", "docente", {
    cursoId: "1-1",
    materia: "Matemática I",
    tomas: [{ fecha: diasAtras(2), registros: completos }, { fecha: diasAtras(1), registros: completos.slice(1) }]
  });
  assert.equal(respuesta.status, 422);

  const mes = await pedir("GET", "/api/v1/asistencia-clases?cursoId=1-1", "docente");
  assert.equal(mes.cuerpo.data.length, 0);

  const ajeno = await pedir("PUT", "/api/v1/asistencia-clases/planilla", "docente", {
    cursoId: "4-1",
    materia: "Matemática I",
    tomas: [{ fecha: hoy(), registros: completos }]
  });
  assert.equal(ajeno.status, 403);
});
