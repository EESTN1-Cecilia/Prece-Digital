/* Cursos y divisiones: estructura academica (ciclos, orientaciones, cursos,
   divisiones) y consultas de alumnos, materias, docentes y horarios. */

import assert from "node:assert/strict";
import test, { after, before } from "node:test";
import { createApp } from "../src/app.mjs";
import { apiRoutes } from "../routes/index.mjs";
import { seedAuthData } from "../database/seeds/auth.seed.mjs";
import { seedAcademic } from "../database/seeds/academic.seed.mjs";

const PUERTO = 4004;
const base = `http://127.0.0.1:${PUERTO}`;

let servidor;
let director;
let docente;
let cicloSuperiorId;

async function login(email, password) {
  const respuesta = await fetch(`${base}/api/v1/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password })
  });

  if (respuesta.status !== 200) {
    throw new Error(`No se pudo autenticar ${email}: ${respuesta.status}`);
  }

  return (await respuesta.json()).accessToken;
}

async function pedir(metodo, ruta, token, cuerpo) {
  const cabeceras = token ? { authorization: `Bearer ${token}` } : {};

  if (cuerpo !== undefined) {
    cabeceras["content-type"] = "application/json";
  }

  const respuesta = await fetch(`${base}${ruta}`, {
    method: metodo,
    headers: cabeceras,
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo)
  });

  return { status: respuesta.status, cuerpo: await respuesta.json() };
}

before(async () => {
  await seedAuthData();
  seedAcademic();
  servidor = createApp(apiRoutes);
  await new Promise((listo) => servidor.listen(PUERTO, listo));
  director = await login("director@prece.local", "Director123!");
  docente = await login("docente@prece.local", "Docente123!");
});

after(async () => {
  await new Promise((listo) => servidor.close(listo));
});

/* ---------------- Autenticacion y permisos -------------------------------- */

test("las rutas academicas exigen token (401)", async () => {
  const { status, cuerpo } = await pedir("GET", "/api/v1/ciclos");

  assert.equal(status, 401);
  assert.equal(cuerpo.error.code, "missing_token");

  const escritura = await pedir("POST", "/api/v1/cursos", null, { anio: 1 });
  assert.equal(escritura.status, 401);
});

test("un docente con solo lectura no puede escribir (403)", async () => {
  const crearCiclo = await pedir("POST", "/api/v1/ciclos", docente, { nombre: "X", tipo: "primer" });
  assert.equal(crearCiclo.status, 403);
  assert.equal(crearCiclo.cuerpo.error.code, "forbidden");

  const actualizarCurso = await pedir("PATCH", "/api/v1/cursos/cur-1", docente, { estado: "inactivo" });
  assert.equal(actualizarCurso.status, 403);

  const eliminarDivision = await pedir("DELETE", "/api/v1/divisiones/div-1", docente);
  assert.equal(eliminarDivision.status, 403);
});

test("un docente puede leer la estructura academica (200)", async () => {
  const { status } = await pedir("GET", "/api/v1/cursos", docente);

  assert.equal(status, 200);
});

/* ---------------- Ciclos -------------------------------------------------- */

test("listar ciclos devuelve ambos y ordenados por nombre", async () => {
  const { status, cuerpo } = await pedir("GET", "/api/v1/ciclos", director);

  assert.equal(status, 200);
  assert.equal(cuerpo.paginacion.total, 2);
  assert.equal(cuerpo.data[0].nombre, "Primer Ciclo");
  assert.equal(cuerpo.data[0].tipo, "primer");
  assert.deepEqual([cuerpo.data[0].anioDesde, cuerpo.data[0].anioHasta], [1, 3]);
  assert.equal(cuerpo.data[1].tipo, "segundo");
  assert.deepEqual([cuerpo.data[1].anioDesde, cuerpo.data[1].anioHasta], [4, 7]);
});

test("un ciclo inexistente devuelve 404", async () => {
  const { status, cuerpo } = await pedir("GET", "/api/v1/ciclos/cic-999", director);

  assert.equal(status, 404);
  assert.equal(cuerpo.error.code, "NOT_FOUND");
});

test("crear un ciclo valido devuelve 201 con los anios del tipo", async () => {
  const { status, cuerpo } = await pedir("POST", "/api/v1/ciclos", director, {
    nombre: "Ciclo Superior",
    descripcion: "Nuevo ciclo",
    tipo: "segundo"
  });

  assert.equal(status, 201);
  assert.equal(cuerpo.data.nombre, "Ciclo Superior");
  assert.equal(cuerpo.data.estado, "activo");
  assert.deepEqual([cuerpo.data.anioDesde, cuerpo.data.anioHasta], [4, 7]);
  cicloSuperiorId = cuerpo.data.id;
});

test("crear un ciclo duplicado devuelve 409 aunque cambien mayusculas", async () => {
  const { status, cuerpo } = await pedir("POST", "/api/v1/ciclos", director, {
    nombre: "CICLO SUPERIOR",
    tipo: "primer"
  });

  assert.equal(status, 409);
  assert.equal(cuerpo.error.code, "CONFLICT");
});

test("crear un ciclo sin tipo devuelve 422", async () => {
  const { status, cuerpo } = await pedir("POST", "/api/v1/ciclos", director, {
    nombre: "Otro Ciclo"
  });

  assert.equal(status, 422);
  assert.equal(cuerpo.error.code, "VALIDATION_ERROR");
  assert.equal(cuerpo.error.details[0].field, "tipo");
});

test("no se puede cambiar el tipo de un ciclo con cursos (409)", async () => {
  const { status, cuerpo } = await pedir("PATCH", "/api/v1/ciclos/cic-1", director, {
    tipo: "segundo"
  });

  assert.equal(status, 409);
  assert.equal(cuerpo.error.code, "CONFLICT");
});

test("un ciclo se puede desactivar por PATCH y por DELETE", async () => {
  const { status: patch, cuerpo } = await pedir("PATCH", `/api/v1/ciclos/${cicloSuperiorId}`, director, {
    estado: "inactivo"
  });

  assert.equal(patch, 200);
  assert.equal(cuerpo.data.estado, "inactivo");

  const { status: borrado } = await pedir("DELETE", `/api/v1/ciclos/${cicloSuperiorId}`, director);
  assert.equal(borrado, 200);
});

/* ---------------- Orientaciones ------------------------------------------- */

test("listar orientaciones incluye todas por defecto y filtra activo", async () => {
  const todas = await pedir("GET", "/api/v1/orientaciones", director);
  assert.equal(todas.status, 200);
  assert.equal(todas.cuerpo.paginacion.total, 3);

  const activas = await pedir("GET", "/api/v1/orientaciones?estado=activo", director);
  assert.equal(activas.cuerpo.paginacion.total, 2);
});

test("una orientacion inexistente devuelve 404", async () => {
  const { status } = await pedir("GET", "/api/v1/orientaciones/ori-999", director);

  assert.equal(status, 404);
});

test("crear una orientacion duplicada da 409 sin importar tildes", async () => {
  const { status, cuerpo } = await pedir("POST", "/api/v1/orientaciones", director, {
    nombre: "INFORMATICA"
  });

  assert.equal(status, 409);
  assert.equal(cuerpo.error.code, "CONFLICT");
});

test("una orientacion se puede renombrar", async () => {
  const { status, cuerpo } = await pedir("PATCH", "/api/v1/orientaciones/ori-2", director, {
    nombre: "Datos",
    descripcion: "Tecnicatura en Datos"
  });

  assert.equal(status, 200);
  assert.equal(cuerpo.data.nombre, "Datos");
});

test("una orientacion en uso se puede desactivar", async () => {
  const { status, cuerpo } = await pedir("DELETE", "/api/v1/orientaciones/ori-2", director);

  assert.equal(status, 200);
  assert.equal(cuerpo.data.estado, "inactivo");
});

/* ---------------- Cursos -------------------------------------------------- */

test("listar cursos activos por defecto y con todos los filtros", async () => {
  const activos = await pedir("GET", "/api/v1/cursos", director);
  assert.equal(activos.cuerpo.paginacion.total, 9);
  assert.equal(activos.cuerpo.data[0].nombre, "1ro MANANA");

  const todos = await pedir("GET", "/api/v1/cursos?estado=todos", director);
  assert.equal(todos.cuerpo.paginacion.total, 10);

  const anio = await pedir("GET", "/api/v1/cursos?anio=4", director);
  assert.equal(anio.cuerpo.paginacion.total, 3);

  const tarde = await pedir("GET", "/api/v1/cursos?turno=TARDE", director);
  assert.equal(tarde.cuerpo.paginacion.total, 2);

  const programacion = await pedir("GET", "/api/v1/cursos?orientacionId=ori-2", director);
  assert.equal(programacion.cuerpo.paginacion.total, 1);

  const primerCiclo = await pedir("GET", "/api/v1/cursos?cicloId=cic-1", director);
  assert.equal(primerCiclo.cuerpo.paginacion.total, 4);
});

test("la paginacion expone la meta completa y valida parametros", async () => {
  const pagina = await pedir("GET", "/api/v1/cursos?pagina=2&porPagina=2", director);
  assert.equal(pagina.status, 200);
  assert.equal(pagina.cuerpo.paginacion.total, 9);
  assert.equal(pagina.cuerpo.paginacion.pagina, 2);
  assert.equal(pagina.cuerpo.paginacion.porPagina, 2);
  assert.equal(pagina.cuerpo.data.length, 2);
  assert.equal(pagina.cuerpo.paginacion.tieneAnterior, true);
  assert.equal(pagina.cuerpo.paginacion.tieneSiguiente, true);

  const invalida = await pedir("GET", "/api/v1/cursos?pagina=0", director);
  assert.equal(invalida.status, 422);
  assert.equal(invalida.cuerpo.error.details[0].field, "pagina");
});

test("filtros y ordenamientos invalidos devuelven 422", async () => {
  const turno = await pedir("GET", "/api/v1/cursos?turno=NOCHE", director);
  assert.equal(turno.status, 422);
  assert.equal(turno.cuerpo.error.details[0].field, "turno");

  const estado = await pedir("GET", "/api/v1/cursos?estado=raro", director);
  assert.equal(estado.status, 422);
  assert.equal(estado.cuerpo.error.details[0].field, "estado");

  const orden = await pedir("GET", "/api/v1/divisiones?orden=random", director);
  assert.equal(orden.status, 422);
  assert.equal(orden.cuerpo.error.details[0].field, "orden");
});

test("un curso expone su nombre, ciclo y orientacion", async () => {
  const { status, cuerpo } = await pedir("GET", "/api/v1/cursos/cur-5", director);

  assert.equal(status, 200);
  assert.equal(cuerpo.data.nombre, "4to MANANA");
  assert.equal(cuerpo.data.turno, "MANANA");
  assert.equal(cuerpo.data.cicloId, "cic-2");
  assert.equal(cuerpo.data.orientacionId, "ori-1");
  assert.equal(cuerpo.data.orientacion, "Informática");
});

test("un curso inexistente devuelve 404", async () => {
  const { status } = await pedir("GET", "/api/v1/cursos/cur-999", director);

  assert.equal(status, 404);
});

test("crear un curso normaliza el turno y corrige el ciclo", async () => {
  const { status, cuerpo } = await pedir("POST", "/api/v1/cursos", director, {
    escuelaId: "esc-1",
    anio: 2,
    turno: "tarde",
    cicloId: "cic-1"
  });

  assert.equal(status, 201);
  assert.equal(cuerpo.data.turno, "TARDE");
  assert.equal(cuerpo.data.nombre, "2do TARDE");
  assert.equal(cuerpo.data.anio, 2);
  assert.equal(cuerpo.data.estado, "activo");
});

test("crear un curso de segundo ciclo exige orientacion activa", async () => {
  const sinOrientacion = await pedir("POST", "/api/v1/cursos", director, {
    escuelaId: "esc-1",
    anio: 4,
    turno: "MANANA",
    cicloId: "cic-2"
  });
  assert.equal(sinOrientacion.status, 422);
  assert.equal(sinOrientacion.cuerpo.error.details[0].field, "orientacionId");

  const orientacionInactiva = await pedir("POST", "/api/v1/cursos", director, {
    escuelaId: "esc-1",
    anio: 4,
    turno: "TARDE",
    cicloId: "cic-2",
    orientacionId: "ori-3"
  });
  assert.equal(orientacionInactiva.status, 422);
  assert.equal(orientacionInactiva.cuerpo.error.details[0].field, "orientacionId");
});

test("un curso del primer ciclo rechaza orientacion (422)", async () => {
  const { status, cuerpo } = await pedir("POST", "/api/v1/cursos", director, {
    escuelaId: "esc-1",
    anio: 3,
    turno: "MANANA",
    cicloId: "cic-1",
    orientacionId: "ori-1"
  });

  assert.equal(status, 422);
  assert.equal(cuerpo.error.details[0].field, "orientacionId");
});

test("un curso con anio fuera de rango devuelve 422", async () => {
  const { status, cuerpo } = await pedir("POST", "/api/v1/cursos", director, {
    escuelaId: "esc-1",
    anio: 8,
    turno: "MANANA",
    cicloId: "cic-2",
    orientacionId: "ori-1"
  });

  assert.equal(status, 422);
  assert.equal(cuerpo.error.details[0].field, "anio");
});

test("un curso con ciclo inexistente o que no corresponde devuelve 422", async () => {
  const inexistente = await pedir("POST", "/api/v1/cursos", director, {
    escuelaId: "esc-1",
    anio: 2,
    turno: "MANANA",
    cicloId: "cic-999"
  });
  assert.equal(inexistente.status, 422);
  assert.equal(inexistente.cuerpo.error.details[0].field, "cicloId");

  const cicloNoCorrespondiente = await pedir("POST", "/api/v1/cursos", director, {
    escuelaId: "esc-1",
    anio: 2,
    turno: "MANANA",
    cicloId: "cic-2",
    orientacionId: "ori-1"
  });
  assert.equal(cicloNoCorrespondiente.status, 422);
  assert.equal(cicloNoCorrespondiente.cuerpo.error.details[0].field, "anio");
});

test("un curso duplicado devuelve 409", async () => {
  const { status, cuerpo } = await pedir("POST", "/api/v1/cursos", director, {
    escuelaId: "esc-1",
    anio: 1,
    turno: "MANANA",
    cicloId: "cic-1"
  });

  assert.equal(status, 409);
  assert.equal(cuerpo.error.code, "CONFLICT");
});

test("un curso se puede pasar a otro turno", async () => {
  const { status, cuerpo } = await pedir("PATCH", "/api/v1/cursos/cur-4", director, {
    turno: "TARDE"
  });

  assert.equal(status, 200);
  assert.equal(cuerpo.data.turno, "TARDE");
});

test("mover un curso a una combinacion existente devuelve 422", async () => {
  const { status, cuerpo } = await pedir("PATCH", "/api/v1/cursos/cur-4", director, {
    anio: 4,
    turno: "MANANA",
    cicloId: "cic-2",
    orientacionId: "ori-1"
  });

  assert.equal(status, 422);
  assert.equal(cuerpo.error.details[0].field, "curso");
});

test("quitar la orientacion a un curso de segundo ciclo devuelve 422", async () => {
  const { status, cuerpo } = await pedir("PATCH", "/api/v1/cursos/cur-5", director, {
    orientacionId: null
  });

  assert.equal(status, 422);
  assert.equal(cuerpo.error.details[0].field, "orientacionId");
});

test("un curso se puede desactivar por DELETE", async () => {
  const creado = await pedir("POST", "/api/v1/cursos", director, {
    escuelaId: "esc-1",
    anio: 7,
    turno: "TARDE",
    cicloId: "cic-2",
    orientacionId: "ori-1"
  });
  assert.equal(creado.status, 201);

  const { status, cuerpo } = await pedir("DELETE", `/api/v1/cursos/${creado.cuerpo.data.id}`, director);
  assert.equal(status, 200);
  assert.equal(cuerpo.data.estado, "inactivo");
});

/* ---------------- Divisiones ---------------------------------------------- */

test("listar divisiones activas por defecto", async () => {
  const { status, cuerpo } = await pedir("GET", "/api/v1/divisiones", director);

  assert.equal(status, 200);
  assert.equal(cuerpo.paginacion.total, 13);
});

test("listar divisiones de un curso", async () => {
  const { status, cuerpo } = await pedir("GET", "/api/v1/cursos/cur-1/divisiones", director);

  assert.equal(status, 200);
  assert.deepEqual(cuerpo.data.map((division) => division.nombre), ["1ra", "2da", "3ra"]);
});

test("una division hereda el turno y los datos del curso", async () => {
  const { status, cuerpo } = await pedir("GET", "/api/v1/divisiones/div-8", director);

  assert.equal(status, 200);
  assert.equal(cuerpo.data.nombre, "1ra");
  assert.equal(cuerpo.data.turno, "MANANA");
  assert.equal(cuerpo.data.cursoId, "cur-5");
  assert.equal(cuerpo.data.curso.anio, 4);
  assert.equal(cuerpo.data.curso.anioNombre, "4to");
  assert.equal(cuerpo.data.curso.orientacionId, "ori-1");
});

test("una division inexistente devuelve 404", async () => {
  const { status } = await pedir("GET", "/api/v1/divisiones/div-999", director);

  assert.equal(status, 404);
});

test("crear una division valida hereda el turno del curso (no se recibe)", async () => {
  const { status, cuerpo } = await pedir("POST", "/api/v1/divisiones", director, {
    cursoId: "cur-2",
    nombre: "6ta",
    turno: "IGNORADO"
  });

  assert.equal(status, 201);
  assert.equal(cuerpo.data.nombre, "6ta");
  assert.equal(cuerpo.data.turno, "TARDE");
  assert.equal(cuerpo.data.escuelaId, "esc-1");
});

test("crear una division sin curso devuelve 422", async () => {
  const { status, cuerpo } = await pedir("POST", "/api/v1/divisiones", director, {
    nombre: "1ra"
  });

  assert.equal(status, 422);
  assert.equal(cuerpo.error.details[0].field, "cursoId");
});

test("crear una division en un curso inactivo devuelve 422", async () => {
  const { status, cuerpo } = await pedir("POST", "/api/v1/divisiones", director, {
    cursoId: "cur-9",
    nombre: "1ra"
  });

  assert.equal(status, 422);
  assert.equal(cuerpo.error.details[0].field, "cursoId");
});

test("el nombre de la division no puede superar los 5 caracteres (422)", async () => {
  const { status, cuerpo } = await pedir("POST", "/api/v1/divisiones", director, {
    cursoId: "cur-1",
    nombre: "Primera"
  });

  assert.equal(status, 422);
  assert.equal(cuerpo.error.details[0].field, "nombre");
});

test("crear una division duplicada en el mismo curso devuelve 409", async () => {
  const { status, cuerpo } = await pedir("POST", "/api/v1/divisiones", director, {
    cursoId: "cur-1",
    nombre: "1ra"
  });

  assert.equal(status, 409);
  assert.equal(cuerpo.error.code, "CONFLICT");
});

test("una division se puede renombrar, mover de curso y desactivar", async () => {
  const renombrada = await pedir("PATCH", "/api/v1/divisiones/div-6", director, {
    nombre: "2da"
  });
  assert.equal(renombrada.status, 200);
  assert.equal(renombrada.cuerpo.data.nombre, "2da");

  const movimiento = await pedir("PATCH", "/api/v1/divisiones/div-6", director, {
    cursoId: "cur-2"
  });
  assert.equal(movimiento.status, 200);
  assert.equal(movimiento.cuerpo.data.cursoId, "cur-2");
  assert.equal(movimiento.cuerpo.data.turno, "TARDE");
  assert.equal(movimiento.cuerpo.data.escuelaId, "esc-1");

  const desactivada = await pedir("DELETE", "/api/v1/divisiones/div-6", director);
  assert.equal(desactivada.status, 200);
  assert.equal(desactivada.cuerpo.data.estado, "inactivo");
});

/* ---------------- Alumnos, materias, docentes y horarios ------------------ */

test("consultar alumnos de un curso", async () => {
  const { status, cuerpo } = await pedir("GET", "/api/v1/cursos/cur-5/alumnos", director);

  assert.equal(status, 200);
  assert.equal(cuerpo.paginacion.total, 3);
  assert.deepEqual(cuerpo.data.map((alumno) => alumno.estudiante), ["alu-2", "alu-3", "alu-4"]);
});

test("consultar alumnos de una division", async () => {
  const { status, cuerpo } = await pedir("GET", "/api/v1/divisiones/div-8/alumnos", director);

  assert.equal(status, 200);
  assert.equal(cuerpo.paginacion.total, 2);
  assert.deepEqual(cuerpo.data.map((alumno) => alumno.estudiante), ["alu-2", "alu-3"]);
});

test("consultar materias, docentes y horarios de un curso", async () => {
  const materias = await pedir("GET", "/api/v1/cursos/cur-5/materias", director);
  assert.equal(materias.cuerpo.paginacion.total, 3);
  assert.deepEqual(materias.cuerpo.data.map((materia) => materia.nombre), ["Matemática", "Lengua", "Historia"]);

  const docentes = await pedir("GET", "/api/v1/cursos/cur-1/docentes", director);
  assert.equal(docentes.cuerpo.paginacion.total, 1);
  assert.equal(docentes.cuerpo.data[0].id, "tch-1");

  const horarios = await pedir("GET", "/api/v1/cursos/cur-1/horarios", director);
  assert.equal(horarios.cuerpo.paginacion.total, 1);
  assert.equal(horarios.cuerpo.data[0].id, "sch-1");
});

test("consultar materias, docentes y horarios de una division", async () => {
  const materias = await pedir("GET", "/api/v1/divisiones/div-8/materias", director);
  assert.deepEqual(materias.cuerpo.data.map((materia) => materia.nombre), ["Matemática", "Lengua"]);

  const docentes = await pedir("GET", "/api/v1/divisiones/div-8/docentes", director);
  assert.equal(docentes.cuerpo.data[0].id, "tch-2");

  const horarios = await pedir("GET", "/api/v1/divisiones/div-8/horarios", director);
  assert.equal(horarios.cuerpo.data[0].id, "sch-3");
});

test("las consultas de relaciones validan que el curso o division exista (404)", async () => {
  const curso = await pedir("GET", "/api/v1/cursos/cur-999/alumnos", director);
  assert.equal(curso.status, 404);

  const division = await pedir("GET", "/api/v1/divisiones/div-999/materias", director);
  assert.equal(division.status, 404);
});