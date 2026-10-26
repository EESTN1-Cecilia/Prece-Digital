/* Tablero de preceptoria: alumnos por curso, asistencia diaria y estado de aulas. */

import assert from "node:assert/strict";
import test, { after, before, beforeEach } from "node:test";
import { createApp } from "../src/app.mjs";
import { apiRoutes } from "../routes/index.mjs";
import { resetStore } from "../database/memory-store.mjs";
import { seedDesarrollo } from "../database/seeds/index.mjs";

const PUERTO = 4022;
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
  tokens.preceptor = await login("preceptor@prece.local", "Preceptor123!");
  tokens.director = await login("director@prece.local", "Director123!");
  tokens.server = await login("server@prece.local", "Server123!");
  tokens.docente = await login("docente@prece.local", "Docente123!");
  tokens.secretario = await login("secretario@prece.local", "Secretaria123!");
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

const HOY = new Date().toLocaleDateString("sv-SE");

test("las rutas de preceptoria exigen token y permisos", async () => {
  const sinToken = await pedir("GET", "/api/v1/preceptor/curso/1-1/alumnos");
  assert.equal(sinToken.status, 401);

  const sinPermiso = await pedir("GET", "/api/v1/preceptor/curso/1-1/alumnos", "server");
  assert.equal(sinPermiso.status, 403);
});

test("lista los alumnos activos del curso con su asistencia del dia", async () => {
  const { status, cuerpo } = await pedir("GET", `/api/v1/preceptor/curso/1-1/alumnos?fecha=${HOY}`, "preceptor");

  assert.equal(status, 200);
  assert.ok(cuerpo.data.length >= 2);
  assert.ok(cuerpo.data.every((alumno) => alumno.curso === 1 && alumno.division === "1"));
  assert.equal(cuerpo.contexto.cursoId, "1-1");
  assert.equal(cuerpo.resumen.total, cuerpo.data.length);
  assert.equal(cuerpo.resumen.sinRegistrar, cuerpo.data.length);
  assert.deepEqual(Object.keys(cuerpo.data[0]).includes("asistencia"), true);
});

test("registra y actualiza la asistencia diaria sin duplicar", async () => {
  const alta = await pedir("POST", "/api/v1/preceptor/asistencia", "preceptor", {
    cursoId: "1-1",
    fecha: HOY,
    alumnoId: "alu-1",
    estado: "P",
    observaciones: "Llego con la autorizacion"
  });

  assert.equal(alta.status, 200);
  assert.equal(alta.cuerpo.data[0].estado, "presente");
  assert.equal(alta.cuerpo.resumen.presente, 1);

  const actualizacion = await pedir("POST", "/api/v1/preceptor/asistencia", "preceptor", {
    cursoId: "1-1",
    fecha: HOY,
    alumnoId: "alu-1",
    estado: "tarde"
  });

  assert.equal(actualizacion.status, 200);
  assert.equal(actualizacion.cuerpo.data[0].id, alta.cuerpo.data[0].id);

  const listado = await pedir("GET", `/api/v1/preceptor/curso/1-1/alumnos?fecha=${HOY}`, "preceptor");
  const alumno = listado.cuerpo.data.find((item) => item.id === "alu-1");

  assert.equal(alumno.asistencia.estado, "tarde");
  assert.equal(listado.cuerpo.resumen.tarde, 1);
});

test("permite registrar varios alumnos en una sola solicitud", async () => {
  const respuesta = await pedir("POST", "/api/v1/preceptor/asistencia", "preceptor", {
    cursoId: "1-1",
    fecha: HOY,
    registros: [
      { alumnoId: "alu-1", estado: "presente" },
      { alumnoId: "alu-5", estado: "ausente" }
    ]
  });

  assert.equal(respuesta.status, 200);
  assert.equal(respuesta.cuerpo.resumen.total, 2);
  assert.equal(respuesta.cuerpo.resumen.presente, 1);
  assert.equal(respuesta.cuerpo.resumen.ausente, 1);
});

test("valida estado, fecha futura y pertenencia al curso", async () => {
  const estadoInvalido = await pedir("POST", "/api/v1/preceptor/asistencia", "preceptor", {
    alumnoId: "alu-1",
    estado: "x"
  });
  assert.equal(estadoInvalido.status, 422);

  const fechaFutura = await pedir("POST", "/api/v1/preceptor/asistencia", "preceptor", {
    alumnoId: "alu-1",
    estado: "presente",
    fecha: "2999-01-01"
  });
  assert.equal(fechaFutura.status, 422);

  const cursoAjeno = await pedir("POST", "/api/v1/preceptor/asistencia", "preceptor", {
    alumnoId: "alu-1",
    estado: "presente",
    cursoId: "4-1"
  });
  assert.equal(cursoAjeno.status, 422);
  assert.ok(cursoAjeno.cuerpo.error.details.some((detalle) => detalle.field.includes("cursoId")));
});

test("devuelve el estado de aulas cruzando horario y docente", async () => {
  const { status, cuerpo } = await pedir(
    "GET",
    "/api/v1/preceptor/estado-aulas?dia=Lunes&hora=10:00",
    "preceptor"
  );

  assert.equal(status, 200);
  assert.ok(cuerpo.data.length > 0);

  const aula101 = cuerpo.data.find((aula) => aula.id === "spc-101");
  assert.equal(aula101.estado, "ocupada");
  assert.equal(aula101.claseActual.materia, "Lengua");
  assert.equal(aula101.claseActual.docente.nombre, "Fernández, Diego");

  const mantenimiento = cuerpo.data.find((aula) => aula.id === "spc-203");
  assert.equal(mantenimiento.estado, "mantenimiento");
  assert.ok(cuerpo.resumen.ocupadas >= 1);
});

test("valida el formato de hora y dia en estado de aulas", async () => {
  const hora = await pedir("GET", "/api/v1/preceptor/estado-aulas?hora=25:99", "preceptor");
  assert.equal(hora.status, 422);
  assert.equal(hora.cuerpo.error.details[0].field, "hora");

  const dia = await pedir("GET", "/api/v1/preceptor/estado-aulas?dia=Feriado", "preceptor");
  assert.equal(dia.status, 422);
  assert.equal(dia.cuerpo.error.details[0].field, "dia");
});

test("el alias /api/preceptor responde igual que /api/v1/preceptor", async () => {
  const respuesta = await pedir("GET", "/api/preceptor/estado-aulas?dia=Lunes&hora=10:00", "preceptor");
  assert.equal(respuesta.status, 200);
  assert.ok(respuesta.cuerpo.data.length > 0);
});

test("mis-cursos solo devuelve los cursos asignados al preceptor", async () => {
  const { status, cuerpo } = await pedir("GET", "/api/v1/preceptor/mis-cursos", "preceptor");

  assert.equal(status, 200);
  assert.ok(cuerpo.data.length >= 1);
  assert.ok(cuerpo.data.some((curso) => curso.id === "1-1"));
  assert.equal(cuerpo.data.some((curso) => curso.id === "2-1"), false);

  const sinToken = await pedir("GET", "/api/v1/preceptor/mis-cursos");
  assert.equal(sinToken.status, 401);

  const alias = await pedir("GET", "/api/preceptor/mis-cursos", "preceptor");
  assert.deepEqual(alias.cuerpo, cuerpo);
});

test("el boletin por curso lee el boletin compartido y respeta el curso asignado", async () => {
  /* El docente de 1° 1 completa su planilla de Matematica: el boletin del
     preceptor la muestra sin otra carga. */
  const planilla = await pedir("PUT", "/api/v1/boletines/curso/1-1/materia", "docente", {
    materias: ["MATEMATICAS"],
    notas: [{ alumnoId: "alu-1", informe1: "8", informe2: "7,5", promedioAnual: "7.8", definitiva: "7.8" }]
  });
  assert.equal(planilla.status, 200);

  const permitido = await pedir("GET", "/api/v1/preceptor/boletin/1-1?ciclo=2026", "preceptor");
  assert.equal(permitido.status, 200);
  assert.equal(permitido.cuerpo.contexto.cursoId, "1-1");
  assert.ok(permitido.cuerpo.data.length > 0);
  assert.ok(permitido.cuerpo.data.every((item) => item.alumno && item.calificaciones && item.inasistencias));

  /* En orden de lista y solo alumnos del curso. */
  const apellidos = permitido.cuerpo.data.map((item) => item.alumno.apellido);
  assert.deepEqual(apellidos, [...apellidos].sort((a, b) => a.localeCompare(b, "es")));
  assert.ok(permitido.cuerpo.data.every((item) => item.alumno.curso === 1 && item.alumno.division === "1"));

  const ana = permitido.cuerpo.data.find((item) => item.alumno.id === "alu-1");
  assert.deepEqual(ana.calificaciones.MATEMATICAS, { informe1: "8", informe2: "7,5", promedioAnual: "7.8", diciembre: "", febrero: "", definitiva: "7.8" });
  /* Otro alumno sin planilla cargada: sin notas, nada inventado. */
  assert.deepEqual(permitido.cuerpo.data.find((item) => item.alumno.id !== "alu-1").calificaciones, {});

  const individual = await pedir("GET", "/api/v1/preceptor/boletin/1-1?ciclo=2026&alumnoId=alu-1", "preceptor");
  assert.equal(individual.status, 200);
  assert.deepEqual(individual.cuerpo.data.map((item) => item.alumno.id), ["alu-1"]);
  /* Conserva su numero de orden en la lista del curso. */
  assert.equal(individual.cuerpo.data[0].orden, permitido.cuerpo.data.findIndex((item) => item.alumno.id === "alu-1") + 1);

  /* Un alumno de otro curso no se puede pedir por el curso propio. */
  const otroAlumno = await pedir("GET", "/api/v1/preceptor/boletin/1-1?alumnoId=alu-2", "preceptor");
  assert.equal(otroAlumno.status, 404);

  const ajeno = await pedir("GET", "/api/v1/preceptor/boletin/2-1", "preceptor");
  assert.equal(ajeno.status, 403);

  const invalido = await pedir("GET", "/api/v1/preceptor/boletin/abc", "preceptor");
  assert.equal(invalido.status, 422);
});

test("el preceptor solo accede a los alumnos de sus divisiones", async () => {
  /* alu-1 cursa 1° 1 (asignada); alu-2 cursa 4° 1 (no asignada). */
  assert.equal((await pedir("GET", "/api/v1/preceptor/curso/4-1/alumnos", "preceptor")).status, 403);
  assert.equal((await pedir("GET", "/api/v1/students/alu-2/summary", "preceptor")).status, 403);
  assert.equal((await pedir("GET", "/api/v1/students/alu-2/observations", "preceptor")).status, 403);
  assert.equal((await pedir("GET", "/api/v1/students/alu-1/summary", "preceptor")).status, 200);

  const registro = await pedir("POST", "/api/v1/preceptor/asistencia", "preceptor", { alumnoId: "alu-2", estado: "presente", fecha: HOY });
  assert.equal(registro.status, 403);

  const listado = await pedir("GET", "/api/v1/students?porPagina=100", "preceptor");
  assert.equal(listado.status, 200);
  assert.ok(listado.cuerpo.data.length > 0);
  assert.ok(listado.cuerpo.data.every((alumno) => String(alumno.curso).startsWith("1") && String(alumno.division) === "1"));

  const divisiones = await pedir("GET", "/api/v1/students/divisions", "preceptor");
  assert.deepEqual(divisiones.cuerpo.data.map((division) => division.id), ["1-1"]);

  /* El director no tiene restriccion. */
  assert.equal((await pedir("GET", "/api/v1/preceptor/curso/4-1/alumnos", "director")).status, 200);
});

test("Direccion asigna y quita divisiones y el alcance cambia en la peticion siguiente", async () => {
  const listado = await pedir("GET", "/api/v1/preceptor/asignaciones", "director");
  assert.equal(listado.status, 200);
  const preceptor = listado.cuerpo.preceptores.find((item) => item.email === "preceptor@prece.local");
  assert.deepEqual(preceptor.cursos, ["1-1"]);
  assert.equal(listado.cuerpo.data.find((division) => division.id === "1-1").preceptor.id, preceptor.id);

  /* El preceptor no puede asignarse cursos. */
  assert.equal((await pedir("PUT", "/api/v1/preceptor/asignaciones/4-1", "preceptor", { preceptorId: preceptor.id })).status, 403);

  const alta = await pedir("PUT", "/api/v1/preceptor/asignaciones/4-1", "director", { preceptorId: preceptor.id });
  assert.equal(alta.status, 200);
  assert.equal(alta.cuerpo.data.preceptor.id, preceptor.id);
  assert.equal((await pedir("GET", "/api/v1/preceptor/curso/4-1/alumnos", "preceptor")).status, 200);

  const misCursos = await pedir("GET", "/api/v1/preceptor/mis-cursos", "preceptor");
  assert.deepEqual(misCursos.cuerpo.data.map((curso) => curso.id), ["1-1", "4-1"]);
  assert.equal(misCursos.cuerpo.restringido, true);
  assert.ok(misCursos.cuerpo.data.every((curso) => typeof curso.cantidadAlumnos === "number"));

  const baja = await pedir("DELETE", "/api/v1/preceptor/asignaciones/1-1", "director");
  assert.equal(baja.status, 200);
  assert.equal(baja.cuerpo.data.preceptor, null);
  assert.equal((await pedir("GET", "/api/v1/preceptor/curso/1-1/alumnos", "preceptor")).status, 403);

  /* Sin divisiones conserva el rol, pero no ve alumnos. */
  await pedir("DELETE", "/api/v1/preceptor/asignaciones/4-1", "director");
  const sinCursos = await pedir("GET", "/api/v1/preceptor/mis-cursos", "preceptor");
  assert.equal(sinCursos.status, 200);
  assert.deepEqual(sinCursos.cuerpo.data, []);
  assert.equal((await pedir("GET", "/api/v1/students?porPagina=100", "preceptor")).cuerpo.data.length, 0);

  assert.equal((await pedir("PUT", "/api/v1/preceptor/asignaciones/9-9", "director", { preceptorId: preceptor.id })).status, 422);
  assert.equal((await pedir("PUT", "/api/v1/preceptor/asignaciones/1-1", "director", { preceptorId: "usr-inexistente" })).status, 404);
});

test("el historial de asistencia diaria agrupa por curso y fecha dentro del alcance", async () => {
  const lista = await pedir("GET", "/api/v1/preceptor/curso/1-1/alumnos", "preceptor");
  const registros = lista.cuerpo.data.map((alumno, indice) => ({ alumnoId: alumno.id, estado: indice === 0 ? "ausente" : "presente" }));
  const guardado = await pedir("POST", "/api/v1/preceptor/asistencia", "preceptor", { cursoId: "1-1", fecha: HOY, registros });
  assert.equal(guardado.status, 200);

  const historial = await pedir("GET", `/api/v1/preceptor/asistencias?desde=${HOY}&hasta=${HOY}`, "preceptor");
  assert.equal(historial.status, 200);
  assert.equal(historial.cuerpo.data.length, 1);
  assert.equal(historial.cuerpo.data[0].id, `1-1|${HOY}`);
  assert.equal(historial.cuerpo.data[0].resumen.ausente, 1);

  const detalle = await pedir("GET", `/api/v1/preceptor/asistencias/1-1/${HOY}`, "preceptor");
  assert.equal(detalle.status, 200);
  assert.equal(detalle.cuerpo.data.registros.length, registros.length);

  assert.equal((await pedir("GET", "/api/v1/preceptor/asistencias?cursoId=4-1", "preceptor")).status, 403);
  assert.equal((await pedir("GET", `/api/v1/preceptor/asistencias/4-1/${HOY}`, "preceptor")).status, 403);
});

test("boletin compartido: Secretaria edita, el docente carga su materia y el preceptor solo lee", async () => {
  /* Secretaria guarda desde el Boletin Digital. */
  const secretaria = await pedir("PUT", "/api/v1/boletines/alumno/alu-1", "secretario", {
    anio: 1,
    calificaciones: { INGLES: { informe1: "9", informe2: "", promedioAnual: "9", definitiva: "9" } },
    materiasPendientes: [{ materia: "", anio: "" }]
  });
  assert.equal(secretaria.status, 200);

  /* El docente carga Matematica para el curso: no pisa Ingles. */
  const docente = await pedir("PUT", "/api/v1/boletines/curso/1-1/materia", "docente", {
    materias: ["MATEMATICAS"],
    notas: [{ alumnoId: "alu-1", informe1: "6", detalle: { p1: "6", p2: "6", v1: "TEP" } }]
  });
  assert.equal(docente.status, 200);

  const boletin = await pedir("GET", "/api/v1/boletines/alumno/alu-1?anio=1", "secretario");
  assert.equal(boletin.cuerpo.data.calificaciones.INGLES.informe1, "9");
  assert.equal(boletin.cuerpo.data.calificaciones.MATEMATICAS.informe1, "6");
  assert.equal(boletin.cuerpo.data.calificaciones.MATEMATICAS.detalle.v1, "TEP");

  /* El preceptor de 1° 1 lo lee, pero no lo edita. */
  assert.equal((await pedir("GET", "/api/v1/boletines/alumno/alu-1?anio=1", "preceptor")).status, 200);
  assert.equal((await pedir("GET", "/api/v1/boletines/curso/1-1", "preceptor")).status, 200);
  assert.equal((await pedir("PUT", "/api/v1/boletines/alumno/alu-1", "preceptor", { anio: 1, calificaciones: {} })).status, 403);
  assert.equal((await pedir("PUT", "/api/v1/boletines/curso/1-1/materia", "preceptor", { materias: ["INGLES"], notas: [{ alumnoId: "alu-1", informe1: "1" }] })).status, 403);

  /* Alcance: el preceptor no ve otro curso; el docente no carga en un curso ajeno ni a alumnos de otro curso. */
  assert.equal((await pedir("GET", "/api/v1/boletines/curso/4-1", "preceptor")).status, 403);
  assert.equal((await pedir("GET", "/api/v1/boletines/alumno/alu-2?anio=4", "preceptor")).status, 403);
  assert.equal((await pedir("PUT", "/api/v1/boletines/curso/4-1/materia", "docente", { materias: ["X"], notas: [{ alumnoId: "alu-2", informe1: "7" }] })).status, 403);
  const ajeno = await pedir("PUT", "/api/v1/boletines/curso/1-1/materia", "docente", { materias: ["MATEMATICAS"], notas: [{ alumnoId: "alu-2", informe1: "7" }] });
  assert.equal(ajeno.status, 422);

  /* Notas invalidas: todo o nada. */
  const invalida = await pedir("PUT", "/api/v1/boletines/curso/1-1/materia", "docente", { materias: ["MATEMATICAS"], notas: [{ alumnoId: "alu-1", informe1: "11" }] });
  assert.equal(invalida.status, 422);
  assert.equal((await pedir("GET", "/api/v1/boletines/alumno/alu-1?anio=1", "secretario")).cuerpo.data.calificaciones.MATEMATICAS.informe1, "6");
});

test("tutores: el preceptor ve solo los vinculados a alumnos de sus divisiones", async () => {
  /* Seed: tut-1 es tutor de alu-1 (1° 1) y de alu-2 (4° 1); tut-3 solo de alu-3 (4° 1);
     tut-5 y tut-6, de alu-5 (1° 1); tut-7 tuvo un vinculo con alu-1 que ya esta inactivo. */
  const listado = await pedir("GET", "/api/v1/tutors?porPagina=100", "preceptor");
  assert.equal(listado.status, 200);
  const ids = listado.cuerpo.data.map((tutor) => tutor.id).sort();
  assert.deepEqual(ids, ["tut-1", "tut-2", "tut-5", "tut-6"]);
  assert.equal(listado.cuerpo.paginacion.total, 4);

  /* Tutor con hijos en varias divisiones: se ve si al menos uno es de las suyas,
     pero solo aparecen los alumnos de sus divisiones. */
  assert.equal((await pedir("GET", "/api/v1/tutors/tut-1", "preceptor")).status, 200);
  const hijos = await pedir("GET", "/api/v1/tutors/tut-1/students", "preceptor");
  assert.equal(hijos.status, 200);
  assert.deepEqual(hijos.cuerpo.data.map((relacion) => relacion.alumno.id), ["alu-1"]);

  /* Tutor ajeno por id: 403. */
  assert.equal((await pedir("GET", "/api/v1/tutors/tut-3", "preceptor")).status, 403);
  assert.equal((await pedir("GET", "/api/v1/tutors/tut-3/students", "preceptor")).status, 403);
  assert.equal((await pedir("GET", "/api/v1/tutors/tut-7", "preceptor")).status, 403);
  assert.equal((await pedir("GET", "/api/v1/students/alu-3/tutors", "preceptor")).status, 403);

  /* Direccion y Secretaria siguen viendo todos. */
  for (const quien of ["director", "secretario"]) {
    const todos = await pedir("GET", "/api/v1/tutors?porPagina=100", quien);
    assert.ok(["tut-1", "tut-3", "tut-5"].every((id) => todos.cuerpo.data.some((tutor) => tutor.id === id)), quien);
    assert.equal((await pedir("GET", "/api/v1/tutors/tut-3", quien)).status, 200);
    const todosLosHijos = await pedir("GET", "/api/v1/tutors/tut-1/students", quien);
    assert.deepEqual(todosLosHijos.cuerpo.data.map((relacion) => relacion.alumno.id).sort(), ["alu-1", "alu-2"]);
  }

  /* Si Direccion le suma 4° 1, el preceptor pasa a ver a tut-3. */
  const asignaciones = await pedir("GET", "/api/v1/preceptor/asignaciones", "director");
  const preceptorId = asignaciones.cuerpo.preceptores.find((item) => item.email === "preceptor@prece.local").id;
  await pedir("PUT", "/api/v1/preceptor/asignaciones/4-1", "director", { preceptorId });
  assert.equal((await pedir("GET", "/api/v1/tutors/tut-3", "preceptor")).status, 200);
});
