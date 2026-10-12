/* Promocion y cambio de curso: movimientos individuales y masivos que cambian la
   ubicacion del alumno, historial inmutable por alumno, operaciones con
   trazabilidad, y respuestas 401/403/404/409/422. */

import assert from "node:assert/strict";
import test, { after, before } from "node:test";
import { createApp } from "../src/app.mjs";
import { apiRoutes } from "../routes/index.mjs";
import { seedAuthData } from "../database/seeds/auth.seed.mjs";
import { seedCourseChanges } from "../database/seeds/course-changes.seed.mjs";

const PUERTO = 4016;
const base = `http://127.0.0.1:${PUERTO}`;

let servidor;
let director;
let secretaria;
let preceptor;
let docente;

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
  seedCourseChanges();
  servidor = createApp(apiRoutes);
  await new Promise((listo) => servidor.listen(PUERTO, listo));
  director = await login("director@prece.local", "Director123!");
  secretaria = await login("secretaria@prece.local", "Secretaria123!");
  preceptor = await login("preceptor@prece.local", "Preceptor123!");
  docente = await login("docente@prece.local", "Docente123!");
});

after(async () => {
  await new Promise((listo) => servidor.close(listo));
});

/* ---------------- Autenticacion y permisos -------------------------------- */

test("las rutas del modulo exigen token (401)", async () => {
  const listar = await pedir("GET", "/api/v1/movimientos-cursos");
  assert.equal(listar.status, 401);
  assert.equal(listar.cuerpo.error.code, "MISSING_TOKEN");

  const masivos = await pedir("POST", "/api/v1/movimientos-cursos/masivos", null, {
    tipo: "promocion",
    anio: 2026,
    movimientos: [{ alumnoId: "alu-1", divisionNueva: "1" }]
  });
  assert.equal(masivos.status, 401);
});

test("un docente no registra movimientos individuales ni masivos (403)", async () => {
  const promover = await pedir("POST", "/api/v1/students/alu-11/promover", docente, {
    anio: 2026,
    divisionNueva: "1"
  });
  assert.equal(promover.status, 403);
  assert.equal(promover.cuerpo.error.code, "FORBIDDEN");

  const masivos = await pedir("POST", "/api/v1/movimientos-cursos/masivos", docente, {
    tipo: "promocion",
    anio: 2026,
    movimientos: [{ alumnoId: "alu-1", divisionNueva: "1" }]
  });
  assert.equal(masivos.status, 403);
});

test("preceptor y docente pueden consultar el modulo (200)", async () => {
  const catalogo = await pedir("GET", "/api/v1/movimientos-cursos/catalogos", preceptor);
  assert.equal(catalogo.status, 200);

  const listar = await pedir("GET", "/api/v1/movimientos-cursos", docente);
  assert.equal(listar.status, 200);
});

/* ---------------- Catalogo ------------------------------------------------ */

test("el catalogo expone tipos, cursos, ordenes y limites", async () => {
  const { status, cuerpo } = await pedir("GET", "/api/v1/movimientos-cursos/catalogos", director);

  assert.equal(status, 200);
  assert.deepEqual(
    cuerpo.data.tiposMovimiento.map((tipo) => tipo.valor),
    ["promocion", "cambio_curso", "cambio_division", "otro"]
  );
  assert.ok(cuerpo.data.tiposMovimiento.every((tipo) => tipo.descripcion));
  assert.deepEqual(cuerpo.data.cursosValidos, [1, 2, 3, 4, 5, 6, 7]);
  assert.ok(cuerpo.data.ordenes.includes("fecha_desc"));
  assert.equal(cuerpo.data.limites.motivoMaximo, 500);
  assert.equal(cuerpo.data.limites.movimientosMasivosMaximos, 500);
});

/* ---------------- Movimiento individual ----------------------------------- */

test("promover avanza al curso inmediato siguiente (201)", async () => {
  const { status, cuerpo } = await pedir("POST", "/api/v1/students/alu-32/promover", secretaria, {
    anio: 2026,
    cuatrimestre: 2,
    divisionNueva: "1"
  });

  assert.equal(status, 201);
  assert.equal(cuerpo.data.tipo, "promocion");
  assert.equal(cuerpo.data.cursoAnterior, 3);
  assert.equal(cuerpo.data.divisionAnterior, "1");
  assert.equal(cuerpo.data.cursoNuevo, 4);
  assert.equal(cuerpo.data.divisionNueva, "1");
  assert.equal(cuerpo.data.turnoNuevo, "mañana");
  assert.equal(cuerpo.data.orientacionNueva, "Técnico en Informática");
  assert.equal(cuerpo.data.anio, 2026);
  assert.equal(cuerpo.data.cuatrimestre, 2);
  assert.equal(cuerpo.data.periodo, "2026 - C2");
  assert.equal(cuerpo.data.usuarioResponsable, "Secretaría");
  assert.equal(cuerpo.data.operacionId, null);
});

test("la situacion de curso refleja la promocion", async () => {
  const { status, cuerpo } = await pedir("GET", "/api/v1/alumnos/alu-32/situacion-curso", secretaria);

  assert.equal(status, 200);
  assert.equal(cuerpo.data.curso, 4);
  assert.equal(cuerpo.data.division, "1");
  assert.equal(cuerpo.data.turno, "mañana");
  assert.equal(cuerpo.data.orientacion, "Técnico en Informática");
  assert.ok(cuerpo.data.totalMovimientos >= 1);
});

test("promover a un curso que no existe responde 422", async () => {
  const { status, cuerpo } = await pedir("POST", "/api/v1/students/alu-22/promover", secretaria, {
    anio: 2026
  });

  assert.equal(status, 422);
  assert.equal(cuerpo.error.code, "VALIDATION_ERROR");
  assert.equal(cuerpo.error.details[0].field, "cursoNuevo");
});

test("promover con anio lectivo invalido responde 422", async () => {
  const { status, cuerpo } = await pedir("POST", "/api/v1/students/alu-2/promover", secretaria, {
    anio: 1800,
    divisionNueva: "1"
  });

  assert.equal(status, 422);
  assert.equal(cuerpo.error.code, "VALIDATION_ERROR");
  assert.equal(cuerpo.error.details[0].field, "anio");
});

test("promover a un alumno inexistente responde 404", async () => {
  const { status, cuerpo } = await pedir("POST", "/api/v1/students/alu-999/promover", secretaria, {
    anio: 2026,
    divisionNueva: "1"
  });

  assert.equal(status, 404);
  assert.equal(cuerpo.error.code, "NOT_FOUND");
});

test("cambio de curso mueve al alumno y deriva turno y orientacion (201)", async () => {
  const { status, cuerpo } = await pedir("POST", "/api/v1/students/alu-28/cambio-curso", secretaria, {
    anio: 2026,
    cursoNuevo: 7,
    divisionNueva: "2"
  });

  assert.equal(status, 201);
  assert.equal(cuerpo.data.tipo, "cambio_curso");
  assert.equal(cuerpo.data.cursoAnterior, 6);
  assert.equal(cuerpo.data.cursoNuevo, 7);
  assert.equal(cuerpo.data.divisionNueva, "2");
  assert.equal(cuerpo.data.turnoNuevo, "tarde");
  assert.equal(cuerpo.data.orientacionNueva, "Técnico en Programación");
});

test("cambio de curso al mismo curso responde 422", async () => {
  const { status, cuerpo } = await pedir("POST", "/api/v1/students/alu-31/cambio-curso", secretaria, {
    anio: 2026,
    cursoNuevo: 1,
    divisionNueva: "2"
  });

  assert.equal(status, 422);
  assert.equal(cuerpo.error.code, "VALIDATION_ERROR");
  assert.equal(cuerpo.error.details[0].field, "cursoNuevo");
});

test("cambio de division conserva el curso (201)", async () => {
  const { status, cuerpo } = await pedir("POST", "/api/v1/students/alu-29/cambio-division", secretaria, {
    anio: 2026,
    divisionNueva: "1"
  });

  assert.equal(status, 201);
  assert.equal(cuerpo.data.tipo, "cambio_division");
  assert.equal(cuerpo.data.cursoAnterior, 7);
  assert.equal(cuerpo.data.cursoNuevo, 7);
  assert.equal(cuerpo.data.divisionAnterior, "2");
  assert.equal(cuerpo.data.divisionNueva, "1");
});

test("cambio de division a la misma ubicacion responde 422", async () => {
  const { status, cuerpo } = await pedir("POST", "/api/v1/students/alu-31/cambio-division", secretaria, {
    anio: 2026,
    divisionNueva: "2"
  });

  assert.equal(status, 422);
  assert.equal(cuerpo.error.code, "VALIDATION_ERROR");
  assert.equal(cuerpo.error.details[0].field, "divisionNueva");
});

test("cambio de division a una division inexistente responde 422", async () => {
  const { status, cuerpo } = await pedir("POST", "/api/v1/students/alu-4/cambio-division", secretaria, {
    anio: 2026,
    divisionNueva: "9"
  });

  assert.equal(status, 422);
  assert.equal(cuerpo.error.code, "VALIDATION_ERROR");
  assert.equal(cuerpo.error.details[0].field, "divisionNueva");
});

test("el alumno no puede elegir al responsable (422)", async () => {
  const { status, cuerpo } = await pedir("POST", "/api/v1/students/alu-2/promover", secretaria, {
    anio: 2026,
    divisionNueva: "1",
    usuarioResponsableId: "usr_3"
  });

  assert.equal(status, 422);
  assert.equal(cuerpo.error.code, "VALIDATION_ERROR");
});

/* ---------------- Historial y consultas ----------------------------------- */

test("el historial del alumno lista del mas reciente al mas antiguo", async () => {
  const { status, cuerpo } = await pedir("GET", "/api/v1/alumnos/alu-32/movimientos-cursos", secretaria);

  assert.equal(status, 200);
  assert.equal(cuerpo.data.alumno.id, "alu-32");
  assert.ok(cuerpo.data.total >= 1);
  assert.equal(cuerpo.data.movimientos[0].tipo, "promocion");
  assert.ok(cuerpo.data.movimientos[0].usuarioResponsable);
});

test("el ultimo movimiento del alumno con historial es el promocion", async () => {
  const { status, cuerpo } = await pedir("GET", "/api/v1/alumnos/alu-32/movimientos-cursos/ultimo", secretaria);

  assert.equal(status, 200);
  assert.equal(cuerpo.data.tieneMovimientos, true);
  assert.equal(cuerpo.data.ultimoMovimiento.tipo, "promocion");
});

test("un alumno sin movimientos devuelve ultimo null y situacion sin historial", async () => {
  const ultimo = await pedir("GET", "/api/v1/alumnos/alu-5/movimientos-cursos/ultimo", secretaria);
  assert.equal(ultimo.status, 200);
  assert.equal(ultimo.cuerpo.data.tieneMovimientos, false);
  assert.equal(ultimo.cuerpo.data.ultimoMovimiento, null);

  const situacion = await pedir("GET", "/api/v1/alumnos/alu-5/situacion-curso", secretaria);
  assert.equal(situacion.status, 200);
  assert.equal(situacion.cuerpo.data.curso, 1);
  assert.equal(situacion.cuerpo.data.totalMovimientos, 0);
  assert.equal(situacion.cuerpo.data.ultimoMovimientoId, null);
});

test("se puede ver un movimiento por id (inmutable)", async () => {
  const { status, cuerpo } = await pedir("GET", "/api/v1/movimientos-cursos/mcv-1", secretaria);

  assert.equal(status, 200);
  assert.equal(cuerpo.data.tipo, "cambio_division");
  assert.equal(cuerpo.data.cursoAnterior, 5);
  assert.equal(cuerpo.data.divisionAnterior, "4");
  assert.equal(cuerpo.data.cursoNuevo, 5);
  assert.equal(cuerpo.data.divisionNueva, "1");
  assert.equal(cuerpo.data.usuarioResponsable, "Secretaría");
});

test("un movimiento inexistente responde 404", async () => {
  const { status, cuerpo } = await pedir("GET", "/api/v1/movimientos-cursos/mcv-999", secretaria);

  assert.equal(status, 404);
  assert.equal(cuerpo.error.code, "NOT_FOUND");
});

test("listar movimientos con filtros y paginacion", async () => {
  const { status, cuerpo } = await pedir("GET", "/api/v1/movimientos-cursos?tipo=promocion&orden=fecha_desc&porPagina=5", secretaria);

  assert.equal(status, 200);
  assert.equal(cuerpo.filtros.tipo, "promocion");
  assert.ok(cuerpo.paginacion.total >= 2);
  assert.ok(cuerpo.data.every((movimiento) => movimiento.tipo === "promocion"));
});

test("filtros invalidos de listado responden 422", async () => {
  const curso = await pedir("GET", "/api/v1/movimientos-cursos?curso=8", secretaria);
  assert.equal(curso.status, 422);
  assert.equal(curso.cuerpo.error.details[0].field, "curso");

  const desde = await pedir("GET", "/api/v1/movimientos-cursos?desde=31-12-2026", secretaria);
  assert.equal(desde.status, 422);
  assert.equal(desde.cuerpo.error.details[0].field, "desde");
});

test("alumnos asignados a un curso requieren curso valido", async () => {
  const sinCurso = await pedir("GET", "/api/v1/movimientos-cursos/asignados", secretaria);
  assert.equal(sinCurso.status, 422);
  assert.equal(sinCurso.cuerpo.error.details[0].field, "curso");

  const cursoInvalido = await pedir("GET", "/api/v1/movimientos-cursos/asignados?curso=8", secretaria);
  assert.equal(cursoInvalido.status, 422);

  const divisionInvalida = await pedir("GET", "/api/v1/movimientos-cursos/asignados?curso=1&division=9", secretaria);
  assert.equal(divisionInvalida.status, 422);
  assert.equal(divisionInvalida.cuerpo.error.details[0].field, "division");
});

test("alumnos asignados a un curso listan activos con su ubicacion", async () => {
  const { status, cuerpo } = await pedir("GET", "/api/v1/movimientos-cursos/asignados?curso=1", secretaria);

  assert.equal(status, 200);
  assert.ok(cuerpo.paginacion.total >= 1);
  assert.ok(cuerpo.data.every((alumno) => alumno.curso === 1 && alumno.apellido && alumno.dni));
});

/* ---------------- Operacion masiva ---------------------------------------- */

test("la carga masiva aplica exitosos y reporta fallidos (201)", async () => {
  const { status, cuerpo } = await pedir("POST", "/api/v1/movimientos-cursos/masivos", secretaria, {
    tipo: "promocion",
    anio: 2026,
    cuatrimestre: 1,
    movimientos: [
      { alumnoId: "alu-1", divisionNueva: "1" },
      { alumnoId: "alu-7", divisionNueva: "1" },
      { alumnoId: "alu-999", divisionNueva: "1" },
      { alumnoId: "alu-1", divisionNueva: "1" }
    ]
  });

  assert.equal(status, 201);
  assert.equal(cuerpo.data.total, 4);
  assert.equal(cuerpo.data.exitosos, 2);
  assert.equal(cuerpo.data.fallidos, 2);
  assert.equal(cuerpo.data.tipo, "promocion");
  assert.ok(cuerpo.data.operacionId);

  const exitoso = cuerpo.data.movimientos.find((movimiento) => movimiento.alumnoId === "alu-1" && movimiento.exito);
  assert.ok(exitoso);
  assert.ok(exitoso.movimientoId);

  const inexistente = cuerpo.data.movimientos.find((movimiento) => movimiento.alumnoId === "alu-999");
  assert.equal(inexistente.exito, false);
  assert.equal(inexistente.error.code, "NOT_FOUND");

  const duplicado = cuerpo.data.movimientos.filter((movimiento) => movimiento.alumnoId === "alu-1" && !movimiento.exito);
  assert.equal(duplicado.length, 1);
  assert.equal(duplicado[0].error.code, "CONFLICT");

  return cuerpo.data.operacionId;
});

test("la operacion masiva queda trazable por operacionId", async () => {
  const listado = await pedir("GET", "/api/v1/movimientos-cursos?tipo=promocion", secretaria);
  const alu1 = listado.cuerpo.data.find((movimiento) => movimiento.alumnoId === "alu-1" && movimiento.operacionId);
  assert.ok(alu1);

  const { status, cuerpo } = await pedir("GET", `/api/v1/movimientos-cursos/operaciones/${alu1.operacionId}`, secretaria);

  assert.equal(status, 200);
  assert.equal(cuerpo.data.operacionId, alu1.operacionId);
  assert.equal(cuerpo.data.resumen.total, 4);
  assert.equal(cuerpo.data.resumen.exitosos, 2);
  assert.equal(cuerpo.data.resumen.fallidos, 2);
  assert.ok(cuerpo.data.movimientos.every((movimiento) => !movimiento.exito || movimiento.movimientoId));
});

test("los movimientos de la masiva comparten operacionId y cambian la ubicacion", async () => {
  const listado = await pedir("GET", "/api/v1/movimientos-cursos?alumnoId=alu-1", secretaria);
  const movimientosDeAlu1 = listado.cuerpo.data;
  assert.ok(movimientosDeAlu1.some((movimiento) => movimiento.operacionId));

  const operacionId = movimientosDeAlu1.find((movimiento) => movimiento.operacionId).operacionId;
  const alu1Movimiento = movimientosDeAlu1.find((movimiento) => movimiento.operacionId === operacionId);
  assert.equal(alu1Movimiento.cursoNuevo, 2);
  assert.equal(alu1Movimiento.divisionNueva, "1");

  const alu7Movimiento = (await pedir("GET", "/api/v1/movimientos-cursos?alumnoId=alu-7", secretaria)).cuerpo.data.find(
    (movimiento) => movimiento.operacionId === operacionId
  );
  assert.equal(alu7Movimiento.cursoNuevo, 2);

  const situacionAlu1 = await pedir("GET", "/api/v1/alumnos/alu-1/situacion-curso", secretaria);
  assert.equal(situacionAlu1.cuerpo.data.curso, 2);
});

test("un alumno inexistente en masivas no tiene movimiento (404 al leer)", async () => {
  const respuesta = await pedir("GET", "/api/v1/movimientos-cursos/mcv-alu-999", secretaria);
  assert.equal(respuesta.status, 404);
});

test("la carga masiva con movimientos vacios responde 422", async () => {
  const { status, cuerpo } = await pedir("POST", "/api/v1/movimientos-cursos/masivos", secretaria, {
    tipo: "promocion",
    anio: 2026,
    movimientos: []
  });

  assert.equal(status, 422);
  assert.equal(cuerpo.error.code, "VALIDATION_ERROR");
  assert.equal(cuerpo.error.details[0].field, "movimientos");
});

test("la carga masiva con base invalida responde 422", async () => {
  const { status, cuerpo } = await pedir("POST", "/api/v1/movimientos-cursos/masivos", secretaria, {
    tipo: "promocion",
    anio: 1800,
    movimientos: [{ alumnoId: "alu-1", divisionNueva: "1" }]
  });

  assert.equal(status, 422);
  assert.equal(cuerpo.error.code, "VALIDATION_ERROR");
  assert.equal(cuerpo.error.details[0].field, "anio");
});

test("asignados reflejan la nueva ubicacion tras los movimientos", async () => {
  const { status, cuerpo } = await pedir("GET", "/api/v1/movimientos-cursos/asignados?curso=2&division=1", secretaria);

  assert.equal(status, 200);
  const ids = cuerpo.data.map((alumno) => alumno.id);
  assert.ok(ids.includes("alu-1"));
  assert.ok(ids.includes("alu-7"));
});