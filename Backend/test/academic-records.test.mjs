/* Situacion academica: registros de alumno + materia + periodo, tipos y
   estados centralizados, transiciones validas e historial completo. */

import assert from "node:assert/strict";
import test, { after, before } from "node:test";
import { createApp } from "../src/app.mjs";
import { apiRoutes } from "../routes/index.mjs";
import { seedAuthData } from "../database/seeds/auth.seed.mjs";
import { seedAcademic } from "../database/seeds/academic.seed.mjs";
import { seedAcademicRecords } from "../database/seeds/academic-records.seed.mjs";

const PUERTO = 4005;
const base = `http://127.0.0.1:${PUERTO}`;

let servidor;
let director;
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
  seedAcademic();
  seedAcademicRecords();
  servidor = createApp(apiRoutes);
  await new Promise((listo) => servidor.listen(PUERTO, listo));
  director = await login("director@prece.local", "Director123!");
  docente = await login("docente@prece.local", "Docente123!");
});

after(async () => {
  await new Promise((listo) => servidor.close(listo));
});

/* ---------------- Autenticacion y permisos -------------------------------- */

test("las rutas de situacion academica exigen token (401)", async () => {
  const { status, cuerpo } = await pedir("GET", "/api/v1/situaciones-academicas");
  assert.equal(status, 401);
  assert.equal(cuerpo.error.code, "missing_token");

  const escritura = await pedir("POST", "/api/v1/situaciones-academicas", null, { alumnoId: "alu-1" });
  assert.equal(escritura.status, 401);
});

test("un docente con solo lectura no puede escribir ni modificar (403)", async () => {
  const crear = await pedir("POST", "/api/v1/situaciones-academicas", docente, { alumnoId: "alu-1", materiaId: "mat", anio: 2026 });
  assert.equal(crear.status, 403);
  assert.equal(crear.cuerpo.error.code, "forbidden");

  const modificar = await pedir("PATCH", "/api/v1/situaciones-academicas/rs-1", docente, { estado: "aprobada" });
  assert.equal(modificar.status, 403);
});

test("un docente puede leer la situacion academica (200)", async () => {
  const { status } = await pedir("GET", "/api/v1/situaciones-academicas", docente);
  assert.equal(status, 200);
});

/* ---------------- Catalogos ----------------------------------------------- */

test("el catalogo expone tipos, estados y transiciones", async () => {
  const { status, cuerpo } = await pedir("GET", "/api/v1/situaciones-academicas/catalogos", director);

  assert.equal(status, 200);
  assert.deepEqual(cuerpo.data.tipos.map((tipo) => tipo.valor), ["cursada", "pendiente", "recursada", "intensificada", "equivalencia"]);
  assert.ok(cuerpo.data.estados.some((estado) => estado.valor === "aprobada"));
  assert.deepEqual(cuerpo.data.transiciones.aprobada, []);
  assert.ok(cuerpo.data.transiciones.en_curso.includes("libre"));
});

/* ---------------- Registro de situaciones --------------------------------- */

test("crear una situacion valida devuelve 201 con el periodo y las referencias", async () => {
  const { status, cuerpo } = await pedir("POST", "/api/v1/situaciones-academicas", director, {
    alumnoId: "alu-5",
    materiaId: "prog",
    anio: 2026,
    cuatrimestre: 2,
    observaciones: "Cursa en el segundo cuatrimestre"
  });

  assert.equal(status, 201);
  assert.equal(cuerpo.data.alumnoId, "alu-5");
  assert.equal(cuerpo.data.alumno.nombre, "Florencia");
  assert.equal(cuerpo.data.materia, "Programación");
  assert.equal(cuerpo.data.tipo, "cursada");
  assert.equal(cuerpo.data.estado, "en_curso");
  assert.deepEqual(cuerpo.data.periodo, { anio: 2026, cuatrimestre: 2, etiqueta: "2026 - C2" });
});

test("una situacion requiere alumno, materia y periodo validos (422)", async () => {
  const sinAnio = await pedir("POST", "/api/v1/situaciones-academicas", director, {
    alumnoId: "alu-5",
    materiaId: "prog"
  });
  assert.equal(sinAnio.status, 422);
  assert.equal(sinAnio.cuerpo.error.details[0].field, "anio");

  const alumnoInexistente = await pedir("POST", "/api/v1/situaciones-academicas", director, {
    alumnoId: "alu-999",
    materiaId: "prog",
    anio: 2026
  });
  assert.equal(alumnoInexistente.status, 422);
  assert.equal(alumnoInexistente.cuerpo.error.details[0].field, "alumnoId");

  const materiaInexistente = await pedir("POST", "/api/v1/situaciones-academicas", director, {
    alumnoId: "alu-5",
    materiaId: "mat-999",
    anio: 2026
  });
  assert.equal(materiaInexistente.status, 422);
  assert.equal(materiaInexistente.cuerpo.error.details[0].field, "materiaId");
});

test("tipos, estados y cuatrimestre invalidos devuelven 422", async () => {
  const tipo = await pedir("POST", "/api/v1/situaciones-academicas", director, {
    alumnoId: "alu-5",
    materiaId: "prog",
    anio: 2026,
    tipo: "fantasma"
  });
  assert.equal(tipo.status, 422);
  assert.equal(tipo.cuerpo.error.details[0].field, "tipo");

  const estado = await pedir("POST", "/api/v1/situaciones-academicas", director, {
    alumnoId: "alu-5",
    materiaId: "prog",
    anio: 2026,
    estado: "aprobadisima"
  });
  assert.equal(estado.status, 422);
  assert.equal(estado.cuerpo.error.details[0].field, "estado");

  const cuatrimestre = await pedir("POST", "/api/v1/situaciones-academicas", director, {
    alumnoId: "alu-5",
    materiaId: "prog",
    anio: 2026,
    cuatrimestre: 3
  });
  assert.equal(cuatrimestre.status, 422);
  assert.equal(cuatrimestre.cuerpo.error.details[0].field, "cuatrimestre");

  const anio = await pedir("POST", "/api/v1/situaciones-academicas", director, {
    alumnoId: "alu-5",
    materiaId: "prog",
    anio: 1800
  });
  assert.equal(anio.status, 422);
  assert.equal(anio.cuerpo.error.details[0].field, "anio");
});

test("no se generan registros duplicados para alumno, materia y periodo (409)", async () => {
  const { status, cuerpo } = await pedir("POST", "/api/v1/situaciones-academicas", director, {
    alumnoId: "alu-1",
    materiaId: "mat",
    anio: 2025
  });

  assert.equal(status, 409);
  assert.equal(cuerpo.error.code, "CONFLICT");
});

test("una recursada conserva el antecedente y el historial de la cursada anterior", async () => {
  const { status, cuerpo } = await pedir("POST", "/api/v1/situaciones-academicas", director, {
    alumnoId: "alu-4",
    materiaId: "prog",
    anio: 2026,
    tipo: "recursada"
  });

  assert.equal(status, 201);
  assert.equal(cuerpo.data.tipo, "recursada");
  assert.equal(cuerpo.data.antecedenteId, "rs-9");
  assert.equal(cuerpo.data.historial.length, 1);
  assert.equal(cuerpo.data.historial[0].estado, "desaprobada");
  assert.equal(cuerpo.data.historial[0].anio, 2024);
});

/* ---------------- Modificacion de situaciones ----------------------------- */

test("una situacion se puede modificar sin perder el historial previo", async () => {
  const antes = await pedir("GET", "/api/v1/situaciones-academicas/rs-1", director);
  assert.equal(antes.cuerpo.data.historial.length, 0);

  const { status, cuerpo } = await pedir("PATCH", "/api/v1/situaciones-academicas/rs-1", director, {
    estado: "aprobada",
    observaciones: "Aprobada en diciembre"
  });

  assert.equal(status, 200);
  assert.equal(cuerpo.data.estado, "aprobada");
  assert.equal(cuerpo.data.observaciones, "Aprobada en diciembre");
  assert.equal(cuerpo.data.historial.length, 1);
  assert.equal(cuerpo.data.historial[0].estado, "en_curso");
});

test("las transiciones entre estados se validan (422)", async () => {
  const aLibre = await pedir("PATCH", "/api/v1/situaciones-academicas/rs-1", director, {
    estado: "libre"
  });
  assert.equal(aLibre.status, 422);
  assert.equal(aLibre.cuerpo.error.details[0].field, "estado");

  const aRegular = await pedir("PATCH", "/api/v1/situaciones-academicas/rs-1", director, {
    estado: "regular"
  });
  assert.equal(aRegular.status, 422);
});

test("una transicion permitida desde desaprobada habilita recursar", async () => {
  const { status, cuerpo } = await pedir("PATCH", "/api/v1/situaciones-academicas/rs-9", director, {
    estado: "en_curso"
  });

  assert.equal(status, 200);
  assert.equal(cuerpo.data.estado, "en_curso");
  assert.equal(cuerpo.data.historial.length, 1);
  assert.equal(cuerpo.data.historial[0].estado, "desaprobada");
});

test("no se puede cambiar el alumno ni la materia de un registro (422)", async () => {
  const alumno = await pedir("PATCH", "/api/v1/situaciones-academicas/rs-2", director, {
    alumnoId: "alu-2"
  });
  assert.equal(alumno.status, 422);
  assert.equal(alumno.cuerpo.error.details[0].field, "alumnoId");

  const materia = await pedir("PATCH", "/api/v1/situaciones-academicas/rs-2", director, {
    materiaId: "mat"
  });
  assert.equal(materia.status, 422);
  assert.equal(materia.cuerpo.error.details[0].field, "materiaId");
});

test("mover un registro a un periodo duplicado devuelve 409", async () => {
  const creado = await pedir("POST", "/api/v1/situaciones-academicas", director, {
    alumnoId: "alu-3",
    materiaId: "his",
    anio: 2026
  });
  assert.equal(creado.status, 201);

  const movimiento = await pedir("PATCH", "/api/v1/situaciones-academicas/rs-8", director, {
    anio: 2026
  });
  assert.equal(movimiento.status, 409);
  assert.equal(movimiento.cuerpo.error.code, "CONFLICT");
});

test("una situacion inexistente devuelve 404", async () => {
  const { status, cuerpo } = await pedir("GET", "/api/v1/situaciones-academicas/rs-999", director);

  assert.equal(status, 404);
  assert.equal(cuerpo.error.code, "NOT_FOUND");
});

/* ---------------- Consultas ----------------------------------------------- */

test("listar situaciones con filtros por estado, tipo, anio y cuatrimestre", async () => {
  const aprobada = await pedir("GET", "/api/v1/situaciones-academicas?estado=aprobada", director);
  assert.equal(aprobada.status, 200);
  assert.ok(aprobada.cuerpo.paginacion.total >= 1);
  assert.ok(aprobada.cuerpo.data.every((registro) => registro.estado === "aprobada"));

  const pendiente = await pedir("GET", "/api/v1/situaciones-academicas?tipo=pendiente", director);
  assert.equal(pendiente.cuerpo.paginacion.total, 1);
  assert.equal(pendiente.cuerpo.data[0].id, "rs-3");

  const porAnio = await pedir("GET", "/api/v1/situaciones-academicas?anio=2024", director);
  assert.ok(porAnio.cuerpo.data.every((registro) => registro.periodo.anio === 2024));

  const porCuatrimestre = await pedir("GET", "/api/v1/situaciones-academicas?cuatrimestre=2", director);
  assert.ok(porCuatrimestre.cuerpo.data.every((registro) => registro.periodo.cuatrimestre === 2));
});

test("los filtros invalidos devuelven 422", async () => {
  const estado = await pedir("GET", "/api/v1/situaciones-academicas?estado=raro", director);
  assert.equal(estado.status, 422);

  const tipo = await pedir("GET", "/api/v1/situaciones-academicas?tipo=raro", director);
  assert.equal(tipo.status, 422);

  const cuatrimestre = await pedir("GET", "/api/v1/situaciones-academicas?cuatrimestre=9", director);
  assert.equal(cuatrimestre.status, 422);

  const orden = await pedir("GET", "/api/v1/situaciones-academicas?orden=random", director);
  assert.equal(orden.status, 422);
});

test("consultar materias pendientes, recursadas e intensificadas", async () => {
  const pendientes = await pedir("GET", "/api/v1/situaciones-academicas/pendientes", director);
  assert.equal(pendientes.cuerpo.paginacion.total, 1);
  assert.equal(pendientes.cuerpo.data[0].tipo, "pendiente");

  const recursadas = await pedir("GET", "/api/v1/situaciones-academicas/recursadas", director);
  assert.equal(recursadas.cuerpo.paginacion.total, 2);
  assert.ok(recursadas.cuerpo.data.some((registro) => registro.id === "rs-5" && registro.antecedenteId === "rs-4"));

  const intensificadas = await pedir("GET", "/api/v1/situaciones-academicas/intensificadas", director);
  assert.equal(intensificadas.cuerpo.paginacion.total, 1);
  assert.equal(intensificadas.cuerpo.data[0].id, "rs-6");
});

test("la situacion academica de un alumno se agrupa por materia y resume por tipo y estado", async () => {
  const { status, cuerpo } = await pedir("GET", "/api/v1/alumnos/alu-1/situacion-academica", director);

  assert.equal(status, 200);
  assert.equal(cuerpo.data.alumno.id, "alu-1");
  assert.equal(cuerpo.data.alumno.apellido, "Pérez López");
  assert.equal(cuerpo.data.resumen.total, 5);
  assert.equal(cuerpo.data.resumen.porTipo.recursada, 1);
  assert.equal(cuerpo.data.resumen.porTipo.cursada, 3);
  assert.equal(cuerpo.data.resumen.porTipo.pendiente, 1);
  assert.equal(cuerpo.data.resumen.porEstado.en_curso, 2);
  assert.equal(cuerpo.data.resumen.porEstado.aprobada, 1);
  assert.equal(cuerpo.data.resumen.porEstado.regular, 1);

  const matematica = cuerpo.data.materias.find((materia) => materia.materia === "Matemática");
  assert.equal(matematica.registros.length, 3);
  assert.equal(matematica.registros[0].periodo.anio, 2026);
  assert.equal(matematica.registros[0].tipo, "recursada");
});

test("la situacion de un alumno para una materia específica", async () => {
  const { status, cuerpo } = await pedir("GET", "/api/v1/alumnos/alu-1/situacion-academica/mat", director);

  assert.equal(status, 200);
  assert.equal(cuerpo.data.materia.nombre, "Matemática");
  assert.equal(cuerpo.data.registros.length, 3);
  assert.deepEqual(cuerpo.data.registros.map((registro) => registro.periodo.anio), [2026, 2025, 2024]);
});

test("el historial academico conserva todos los periodos", async () => {
  const { status, cuerpo } = await pedir("GET", "/api/v1/alumnos/alu-1/historial-academico", director);

  assert.equal(status, 200);
  assert.equal(cuerpo.data.alumno.id, "alu-1");
  assert.equal(cuerpo.data.registros.length, 5);

  const anios = cuerpo.data.registros.map((registro) => registro.periodo.anio);
  assert.deepEqual(anios, [2026, 2025, 2025, 2025, 2024]);

  const recursada = cuerpo.data.registros[0];
  assert.equal(recursada.tipo, "recursada");
  assert.equal(recursada.antecedenteId, "rs-4");
  assert.equal(recursada.historial[0].anio, 2024);
});

test("consultar un alumno o materia inexistente devuelve 404", async () => {
  const alumno = await pedir("GET", "/api/v1/alumnos/alu-999/situacion-academica", director);
  assert.equal(alumno.status, 404);

  const materia = await pedir("GET", "/api/v1/alumnos/alu-1/situacion-academica/mat-999", director);
  assert.equal(materia.status, 404);

  const historial = await pedir("GET", "/api/v1/alumnos/alu-999/historial-academico", director);
  assert.equal(historial.status, 404);
});