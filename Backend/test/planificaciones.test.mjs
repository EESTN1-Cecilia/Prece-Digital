import assert from "node:assert/strict";
import test, { after, before } from "node:test";
import { createApp } from "../src/app.mjs";
import { apiRoutes } from "../routes/index.mjs";
import { userRepository } from "../database/repositories/user.repository.mjs";
import { signAccessToken } from "../modules/auth/token.service.mjs";
import teachersRepository from "../modules/teachers/teachers.repository.mjs";

const PUERTO = 4001;
const base = `http://127.0.0.1:${PUERTO}`;
let servidor;

const SERVER_USER = userRepository.create({
  id: "usr_pl_server",
  email: "server@planificaciones.test",
  passwordHash: "hash",
  displayName: "Server Planificaciones",
  assignments: [{ role: "server", schoolId: "esc-pl-1" }]
});

const JEFE = userRepository.create({
  id: "usr_pl_jefe",
  email: "jefe@planificaciones.test",
  passwordHash: "hash",
  displayName: "Jefe Planificaciones",
  assignments: [{ role: "jefe_area", schoolId: "esc-pl-1" }]
});

const SECRETARIO = userRepository.create({
  id: "usr_pl_secretario",
  email: "secretario@planificaciones.test",
  passwordHash: "hash",
  displayName: "Secretario Planificaciones",
  assignments: [{ role: "secretario", schoolId: "esc-pl-1" }]
});

const DOCENTE_A = userRepository.create({
  id: "usr_pl_docente_a",
  email: "docente-a@planificaciones.test",
  passwordHash: "hash",
  displayName: "Docente Ana",
  assignments: [{ role: "docente", schoolId: "esc-pl-1" }]
});

const DOCENTE_B = userRepository.create({
  id: "usr_pl_docente_b",
  email: "docente-b@planificaciones.test",
  passwordHash: "hash",
  displayName: "Docente Bruno",
  assignments: [{ role: "docente", schoolId: "esc-pl-1" }]
});

const DOCENTE_SIN_VINCULO = userRepository.create({
  id: "usr_pl_docente_suelto",
  email: "docente-suelto@planificaciones.test",
  passwordHash: "hash",
  displayName: "Docente Sin Vinculo",
  assignments: [{ role: "docente", schoolId: "esc-pl-1" }]
});

const PROFESOR_A = teachersRepository.create({
  id: "tch_pl_ana",
  userId: DOCENTE_A.id,
  firstName: "Ana",
  lastName: "Diaz",
  documentNumber: "40111000",
  documentType: "dni",
  email: "ana.diaz@planificaciones.test",
  schoolId: "esc-pl-1"
});

const PROFESOR_B = teachersRepository.create({
  id: "tch_pl_bruno",
  userId: DOCENTE_B.id,
  firstName: "Bruno",
  lastName: "Lopez",
  documentNumber: "40111001",
  documentType: "dni",
  email: "bruno.lopez@planificaciones.test",
  schoolId: "esc-pl-1"
});

const PROFESOR_INACTIVO = teachersRepository.create({
  id: "tch_pl_inactivo",
  userId: null,
  firstName: "Carla",
  lastName: "Ruiz",
  documentNumber: "40111002",
  documentType: "dni",
  email: "carla.ruiz@planificaciones.test",
  schoolId: "esc-pl-1",
  isActive: false
});

before(async () => {
  servidor = createApp(apiRoutes);
  await new Promise((listo) => servidor.listen(PUERTO, listo));
});

after(async () => {
  await new Promise((listo) => servidor.close(listo));
});

async function pedir(ruta, token, opciones) {
  const cabeceras = { ...opciones?.headers, ...(token ? { authorization: `Bearer ${token}` } : {}) };
  const respuesta = await fetch(`${base}${ruta}`, { ...opciones, headers: cabeceras });
  let cuerpo = null;
  try {
    cuerpo = await respuesta.json();
  } catch (_error) {
    cuerpo = null;
  }
  return { status: respuesta.status, cuerpo };
}

function pedirJson(ruta, token, body, method = "POST") {
  return pedir(ruta, token, {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body ?? {})
  });
}

function tokenDe(user) {
  return signAccessToken(user);
}

let materiaId;
let disenoId;
let contenidoEnDesarrolloId;
let contenidoFraccionesId;
let planId;
let planDeBrunoId;
let planDeSueltoId;

test("el seed crea materias y contenidos curriculares de apoyo", async () => {
  const server = tokenDe(SERVER_USER);

  const materia = await pedirJson("/api/v1/curriculum/materias", server, {
    name: "Matematica",
    code: "MAT-PL"
  });
  assert.equal(materia.status, 201);
  materiaId = materia.cuerpo.data.id;

  const diseno = await pedirJson("/api/v1/curriculum/disenos", server, {
    subjectId: materiaId,
    year: 2026,
    courseId: "1A",
    name: "Diseno Matematica 1A"
  });
  assert.equal(diseno.status, 201);
  disenoId = diseno.cuerpo.data.id;

  teachersRepository.addSubject(PROFESOR_A.id, {
    subjectId: materiaId,
    courseId: "1A",
    divisionId: "DIV-A",
    schoolId: "esc-pl-1"
  });
  teachersRepository.addSubject(PROFESOR_B.id, {
    subjectId: materiaId,
    courseId: "2A",
    divisionId: "DIV-B",
    schoolId: "esc-pl-1"
  });
  teachersRepository.addSubject(PROFESOR_INACTIVO.id, {
    subjectId: materiaId,
    courseId: "3A",
    divisionId: "DIV-C",
    schoolId: "esc-pl-1"
  });

  const contenidoUno = await pedirJson("/api/v1/curriculum/contenidos", server, {
    designId: disenoId,
    name: "Números naturales",
    teacherId: PROFESOR_A.id,
    status: "en_desarrollo"
  });
  assert.equal(contenidoUno.status, 201);
  contenidoEnDesarrolloId = contenidoUno.cuerpo.data.id;

  const contenidoDos = await pedirJson("/api/v1/curriculum/contenidos", server, {
    designId: disenoId,
    name: "Fracciones",
    teacherId: PROFESOR_A.id
  });
  assert.equal(contenidoDos.status, 201);
  contenidoFraccionesId = contenidoDos.cuerpo.data.id;

  assert.equal(teachersRepository.listSubjects({ teacherId: PROFESOR_A.id }).length, 1);
});

test("un POST a /teacher-plans sin token devuelve 401", async () => {
  const { status } = await pedirJson("/api/v1/teacher-plans", null, {});
  assert.equal(status, 401);
});

test("un secretario sin planning.write no puede crear planificaciones", async () => {
  const { status } = await pedirJson("/api/v1/teacher-plans", tokenDe(SECRETARIO), {
    title: "Planificacion sin permiso",
    teacherId: PROFESOR_A.id,
    subjectId: materiaId,
    courseId: "1A",
    year: 2026
  });
  assert.equal(status, 403);
});

test("un secretario sí puede listar planificaciones", async () => {
  const { status, cuerpo } = await pedir("/api/v1/teacher-plans", tokenDe(SECRETARIO));
  assert.equal(status, 200);
  assert.ok(Array.isArray(cuerpo.data));
});

test("crear una planificación exige los campos requeridos", async () => {
  const { status, cuerpo } = await pedirJson("/api/v1/teacher-plans", tokenDe(DOCENTE_A), {
    teacherId: PROFESOR_A.id,
    subjectId: materiaId,
    courseId: "1A",
    year: 2026
  });
  assert.equal(status, 400);
  assert.equal(cuerpo.error.code, "validation_error");
  assert.match(cuerpo.error.message, /title/);
});

test("una materia inexistente devuelve 404", async () => {
  const { status, cuerpo } = await pedirJson("/api/v1/teacher-plans", tokenDe(DOCENTE_A), {
    title: "Planificacion sin materia",
    teacherId: PROFESOR_A.id,
    subjectId: "mat_inexistente",
    courseId: "1A",
    year: 2026
  });
  assert.equal(status, 404);
  assert.equal(cuerpo.error.code, "not_found");
});

test("un docente no puede crear planificaciones a nombre de otro", async () => {
  const { status, cuerpo } = await pedirJson("/api/v1/teacher-plans", tokenDe(DOCENTE_A), {
    title: "Planificacion ajena",
    teacherId: PROFESOR_B.id,
    subjectId: materiaId,
    courseId: "2A",
    divisionId: "DIV-B",
    year: 2026
  });
  assert.equal(status, 403);
  assert.equal(cuerpo.error.code, "forbidden");
});

test("un docente no puede planificar una materia o curso sin asociación", async () => {
  const cursoInvalido = await pedirJson("/api/v1/teacher-plans", tokenDe(DOCENTE_A), {
    title: "Planificacion curso ajeno",
    teacherId: PROFESOR_A.id,
    subjectId: materiaId,
    courseId: "2A",
    divisionId: "DIV-B",
    year: 2026
  });
  assert.equal(cursoInvalido.status, 422);
  assert.match(cursoInvalido.cuerpo.error.message, /asociado/);

  const divisionInvalida = await pedirJson("/api/v1/teacher-plans", tokenDe(DOCENTE_A), {
    title: "Planificacion division ajena",
    teacherId: PROFESOR_A.id,
    subjectId: materiaId,
    courseId: "1A",
    divisionId: "DIV-B",
    year: 2026
  });
  assert.equal(divisionInvalida.status, 422);
});

test("un docente inactivo no puede tener planificaciones", async () => {
  const { status } = await pedirJson("/api/v1/teacher-plans", tokenDe(SERVER_USER), {
    title: "Planificacion docente inactivo",
    teacherId: PROFESOR_INACTIVO.id,
    subjectId: materiaId,
    courseId: "3A",
    divisionId: "DIV-C",
    year: 2026
  });
  assert.equal(status, 422);
});

test("un docente sin vínculo docente no ve planificaciones ajenas", async () => {
  const { status, cuerpo } = await pedir("/api/v1/teacher-plans", tokenDe(DOCENTE_SIN_VINCULO));
  assert.equal(status, 200);
  assert.equal(cuerpo.paginacion.total, 0);
});

test("el año debe ser un entero entre 2000 y 2100", async () => {
  const { status, cuerpo } = await pedirJson("/api/v1/teacher-plans", tokenDe(DOCENTE_A), {
    title: "Planificacion anio invalido",
    teacherId: PROFESOR_A.id,
    subjectId: materiaId,
    courseId: "1A",
    year: 1999
  });
  assert.equal(status, 422);
  assert.match(cuerpo.error.message, /2000 y 2100/);
});

test("el período debe pertenecer al catálogo", async () => {
  const { status, cuerpo } = await pedirJson("/api/v1/teacher-plans", tokenDe(DOCENTE_A), {
    title: "Planificacion periodo invalido",
    teacherId: PROFESOR_A.id,
    subjectId: materiaId,
    courseId: "1A",
    year: 2026,
    period: "tercer_bimestre"
  });
  assert.equal(status, 422);
  assert.match(cuerpo.error.message, /Período inválido/);
});

test("los contenidos y actividades se validan", async () => {
  const server = tokenDe(SERVER_USER);

  const contenidosInvalidos = await pedirJson("/api/v1/teacher-plans", server, {
    title: "Planificacion contenidos",
    teacherId: PROFESOR_A.id,
    subjectId: materiaId,
    courseId: "1A",
    year: 2025,
    contents: "no-es-lista"
  });
  assert.equal(contenidosInvalidos.status, 422);

  const contenidoSinNombre = await pedirJson("/api/v1/teacher-plans", server, {
    title: "Planificacion contenido sin nombre",
    teacherId: PROFESOR_A.id,
    subjectId: materiaId,
    courseId: "1A",
    year: 2025,
    contents: [{ description: "sin nombre" }]
  });
  assert.equal(contenidoSinNombre.status, 422);
  assert.match(contenidoSinNombre.cuerpo.error.message, /contenido 1: name/);

  const actividadInvalida = await pedirJson("/api/v1/teacher-plans", server, {
    title: "Planificacion actividad invalida",
    teacherId: PROFESOR_A.id,
    subjectId: materiaId,
    courseId: "1A",
    year: 2025,
    activities: [{ name: "Clase", type: "examen" }]
  });
  assert.equal(actividadInvalida.status, 422);
  assert.match(actividadInvalida.cuerpo.error.message, /actividad 1: tipo inválido/);

  const fechaInvalida = await pedirJson("/api/v1/teacher-plans", server, {
    title: "Planificacion actividad fecha",
    teacherId: PROFESOR_A.id,
    subjectId: materiaId,
    courseId: "1A",
    year: 2025,
    activities: [{ name: "Clase", date: "02-03-2026" }]
  });
  assert.equal(fechaInvalida.status, 422);

  const horasInvalidas = await pedirJson("/api/v1/teacher-plans", server, {
    title: "Planificacion horas",
    teacherId: PROFESOR_A.id,
    subjectId: materiaId,
    courseId: "1A",
    year: 2025,
    contents: [{ name: "Numeros", estimatedHours: 2500 }]
  });
  assert.equal(horasInvalidas.status, 422);
  assert.match(horasInvalidas.cuerpo.error.message, /estimatedHours/);
});

test("una planificación se crea siempre en estado borrador", async () => {
  const { status, cuerpo } = await pedirJson("/api/v1/teacher-plans", tokenDe(DOCENTE_A), {
    title: "Planificacion A",
    teacherId: PROFESOR_A.id,
    subjectId: materiaId,
    courseId: "1A",
    divisionId: "DIV-A",
    year: 2026,
    period: "primer_trimestre",
    status: "aprobada"
  });
  assert.equal(status, 422);
  assert.match(cuerpo.error.message, /borrador/);
});

test("crea una planificación válida para el docente a cargo", async () => {
  const { status, cuerpo } = await pedirJson("/api/v1/teacher-plans", tokenDe(DOCENTE_A), {
    title: "Planificacion A",
    teacherId: PROFESOR_A.id,
    subjectId: materiaId,
    courseId: "1A",
    divisionId: "DIV-A",
    year: 2026,
    period: "primer_trimestre",
    contents: [
      { name: "Numeros naturales", description: "Unidades y dezenas", estimatedHours: 8 },
      { name: "Geometria", description: "Figuras planas" }
    ],
    activities: [{ name: "Clase inaugural", type: "clase", date: "2026-03-02" }],
    observations: "Sin observaciones"
  });
  assert.equal(status, 201);
  planId = cuerpo.data.id;
  assert.match(planId, /^tpl_/);
  assert.equal(cuerpo.data.status, "borrador");
  assert.equal(cuerpo.data.teacherId, PROFESOR_A.id);
  assert.equal(cuerpo.data.subjectId, materiaId);
  assert.equal(cuerpo.data.courseId, "1A");
  assert.equal(cuerpo.data.divisionId, "DIV-A");
  assert.equal(cuerpo.data.year, 2026);
  assert.equal(cuerpo.data.period, "primer_trimestre");
  assert.equal(cuerpo.data.contents.length, 2);
  assert.equal(cuerpo.data.activities.length, 1);
  assert.equal(cuerpo.data.activities[0].type, "clase");
  assert.equal(cuerpo.data.createdBy, DOCENTE_A.id);
  assert.equal(cuerpo.data.subjectName, "Matematica");
  assert.equal(cuerpo.data.teacher.id, PROFESOR_A.id);
  assert.equal(cuerpo.data.historyCount, 1);
  assert.deepEqual(cuerpo.data.allowedTransitions, ["en_revision", "archivada"]);
  assert.equal(cuerpo.data.isEditable, true);
});

test("la combinación docente, materia, curso, división y año es única", async () => {
  const { status, cuerpo } = await pedirJson("/api/v1/teacher-plans", tokenDe(DOCENTE_A), {
    title: "Planificacion A duplicada",
    teacherId: PROFESOR_A.id,
    subjectId: materiaId,
    courseId: "1A",
    divisionId: "DIV-A",
    year: 2026
  });
  assert.equal(status, 409);
  assert.equal(cuerpo.error.code, "conflict");
});

test("un server crea planificaciones de otros docentes", async () => {
  const server = tokenDe(SERVER_USER);

  const bruno = await pedirJson("/api/v1/teacher-plans", server, {
    title: "Planificacion B",
    teacherId: PROFESOR_B.id,
    subjectId: materiaId,
    courseId: "2A",
    divisionId: "DIV-B",
    year: 2026
  });
  assert.equal(bruno.status, 201);
  planDeBrunoId = bruno.cuerpo.data.id;

  const sinVinculo = await pedirJson("/api/v1/teacher-plans", server, {
    title: "Planificacion 2025",
    teacherId: PROFESOR_A.id,
    subjectId: materiaId,
    courseId: "1A",
    divisionId: "DIV-A",
    year: 2025
  });
  assert.equal(sinVinculo.status, 201);
  planDeSueltoId = sinVinculo.cuerpo.data.id;
});

test("un docente solo lista sus propias planificaciones", async () => {
  const { status, cuerpo } = await pedir("/api/v1/teacher-plans", tokenDe(DOCENTE_A));
  assert.equal(status, 200);
  assert.equal(cuerpo.paginacion.total, 2);
  assert.deepEqual(
    cuerpo.data.map((plan) => plan.id).sort(),
    [planId, planDeSueltoId].sort()
  );
  assert.equal(cuerpo.filtros.teacherId, PROFESOR_A.id);
});

test("el server lista todas las planificaciones con filtros y paginación", async () => {
  const { status, cuerpo } = await pedir(
    `/api/v1/teacher-plans?year=2026&porPagina=2&pagina=1&orden=year&direccion=asc`,
    tokenDe(SERVER_USER)
  );
  assert.equal(status, 200);
  assert.equal(cuerpo.paginacion.total, 2);
  assert.equal(cuerpo.paginacion.pagina, 1);
  assert.equal(cuerpo.paginacion.porPagina, 2);
  assert.equal(cuerpo.paginacion.totalPaginas, 1);
  assert.equal(cuerpo.data.length, 2);
  assert.equal(cuerpo.filtros.year, 2026);
  assert.equal(cuerpo.filtros.orden, "year");
  assert.equal(cuerpo.filtros.direccion, "asc");

  const segunda = await pedir("/api/v1/teacher-plans?porPagina=2&pagina=2", tokenDe(SERVER_USER));
  assert.equal(segunda.cuerpo.data.length, 1);
  assert.equal(segunda.cuerpo.paginacion.total, 3);
  assert.equal(segunda.cuerpo.paginacion.totalPaginas, 2);
});

test("los filtros de listado validan orden, tamaño y referencias", async () => {
  const server = tokenDe(SERVER_USER);

  const ordenInvalido = await pedir("/api/v1/teacher-plans?orden=telepatia", server);
  assert.equal(ordenInvalido.status, 422);

  const direccionInvalida = await pedir("/api/v1/teacher-plans?direccion=lateral", server);
  assert.equal(direccionInvalida.status, 422);

  const paginaInvalida = await pedir("/api/v1/teacher-plans?porPagina=500", server);
  assert.equal(paginaInvalida.status, 422);

  const estadoInvalido = await pedir("/api/v1/teacher-plans?status=inventado", server);
  assert.equal(estadoInvalido.status, 422);

  const anioInvalido = await pedir("/api/v1/teacher-plans?year=2026.5", server);
  assert.equal(anioInvalido.status, 422);

  const docenteInexistente = await pedir("/api/v1/teacher-plans?teacherId=tch_nope", server);
  assert.equal(docenteInexistente.status, 404);

  const materiaInexistente = await pedir("/api/v1/teacher-plans?subjectId=mat_nope", server);
  assert.equal(materiaInexistente.status, 404);
});

test("los listados por docente, materia, curso y período validan y filtran", async () => {
  const server = tokenDe(SERVER_USER);

  const porDocente = await pedir(`/api/v1/teacher-plans/by-teacher/${PROFESOR_A.id}`, server);
  assert.equal(porDocente.status, 200);
  assert.equal(porDocente.cuerpo.paginacion.total, 2);
  assert.equal(porDocente.cuerpo.filtros.teacherId, PROFESOR_A.id);

  const porDocenteInexistente = await pedir("/api/v1/teacher-plans/by-teacher/tch_nope", server);
  assert.equal(porDocenteInexistente.status, 404);

  const porMateria = await pedir(`/api/v1/teacher-plans/by-subject/${materiaId}`, server);
  assert.equal(porMateria.status, 200);
  assert.equal(porMateria.cuerpo.paginacion.total, 3);

  const porMateriaInexistente = await pedir("/api/v1/teacher-plans/by-subject/mat_nope", server);
  assert.equal(porMateriaInexistente.status, 404);

  const porCurso = await pedir("/api/v1/teacher-plans/by-course/2A", server);
  assert.equal(porCurso.status, 200);
  assert.equal(porCurso.cuerpo.paginacion.total, 1);

  const porPeriodo = await pedir("/api/v1/teacher-plans/by-period/2026?status=borrador", server);
  assert.equal(porPeriodo.status, 200);
  assert.equal(porPeriodo.cuerpo.paginacion.total, 2);

  const porPeriodo2025 = await pedir("/api/v1/teacher-plans/by-period/2025", server);
  assert.equal(porPeriodo2025.status, 200);
  assert.equal(porPeriodo2025.cuerpo.paginacion.total, 1);

  const porPeriodoInvalido = await pedir("/api/v1/teacher-plans/by-period/1999", server);
  assert.equal(porPeriodoInvalido.status, 422);
});

test("obtiene una planificación con sus relaciones y devuelve 404 si no existe", async () => {
  const server = tokenDe(SERVER_USER);

  const { status, cuerpo } = await pedir(`/api/v1/teacher-plans/${planId}`, server);
  assert.equal(status, 200);
  assert.equal(cuerpo.data.id, planId);
  assert.equal(cuerpo.data.subjectName, "Matematica");
  assert.equal(cuerpo.data.teacher.firstName, "Ana");

  const inexistente = await pedir("/api/v1/teacher-plans/tpl_nope", server);
  assert.equal(inexistente.status, 404);
});

test("expone el estado actual y las transiciones habilitadas", async () => {
  const server = tokenDe(SERVER_USER);
  const { status, cuerpo } = await pedir(`/api/v1/teacher-plans/${planId}/status`, server);
  assert.equal(status, 200);
  assert.equal(cuerpo.data.status, "borrador");
  assert.equal(cuerpo.data.isEditable, true);
  assert.equal(cuerpo.data.canEditContent, true);
  assert.deepEqual(cuerpo.data.allowedTransitions, [
    { status: "en_revision", permission: "planning.write" },
    { status: "archivada", permission: "planning.manage" }
  ]);
});

test("un docente no puede editar la planificación de otro", async () => {
  const { status, cuerpo } = await pedirJson(
    `/api/v1/teacher-plans/${planDeBrunoId}`,
    tokenDe(DOCENTE_A),
    { title: "Secuestro" },
    "PATCH"
  );
  assert.equal(status, 403);
  assert.equal(cuerpo.error.code, "forbidden");
});

test("el docente edita su planificación y queda registrado en el historial", async () => {
  const { status, cuerpo } = await pedirJson(
    `/api/v1/teacher-plans/${planId}`,
    tokenDe(DOCENTE_A),
    {
      title: "Planificacion A revisada",
      contents: [
        { name: "Numeros naturales", description: "Unidades y decenas", estimatedHours: 10 },
        { name: "Geometria", description: "Figuras planas" },
        { name: "Probabilidad", description: "Sucesos" }
      ],
      observations: "Se agrego probabilidad"
    },
    "PATCH"
  );
  assert.equal(status, 200);
  assert.equal(cuerpo.data.title, "Planificacion A revisada");
  assert.equal(cuerpo.data.contents.length, 3);
  assert.equal(cuerpo.data.updatedBy, DOCENTE_A.id);
  assert.equal(cuerpo.data.historyCount, 2);

  const historial = await pedir(`/api/v1/teacher-plans/${planId}/history`, tokenDe(DOCENTE_A));
  assert.equal(historial.status, 200);
  assert.equal(historial.cuerpo.data.total, 2);
  assert.equal(historial.cuerpo.data.entries[0].type, "modificacion");
  const campos = historial.cuerpo.data.entries[0].changes.map((change) => change.field).sort();
  assert.deepEqual(campos, ["contents", "observations", "title"]);
  assert.equal(historial.cuerpo.data.entries[1].type, "creacion");
  assert.equal(historial.cuerpo.data.entries[1].performedBy, DOCENTE_A.id);
});

test("un PATCH sin cambios no genera historial y bloquea estado y asociación", async () => {
  const server = tokenDe(SERVER_USER);

  const sinCambios = await pedirJson(`/api/v1/teacher-plans/${planId}`, server, {}, "PATCH");
  assert.equal(sinCambios.status, 200);
  assert.equal(sinCambios.cuerpo.data.historyCount, 2);

  const conEstado = await pedirJson(
    `/api/v1/teacher-plans/${planId}`,
    server,
    { status: "en_revision" },
    "PATCH"
  );
  assert.equal(conEstado.status, 422);
  assert.match(conEstado.cuerpo.error.message, /\/status/);

  const conAsociacion = await pedirJson(
    `/api/v1/teacher-plans/${planId}`,
    server,
    { teacherId: PROFESOR_B.id },
    "PATCH"
  );
  assert.equal(conAsociacion.status, 422);
  assert.match(conAsociacion.cuerpo.error.message, /asociación/);

  const conMateria = await pedirJson(
    `/api/v1/teacher-plans/${planId}`,
    server,
    { subjectId: "mat_otro" },
    "PATCH"
  );
  assert.equal(conMateria.status, 422);
});

test("valida el estado destino y la transición en PATCH /status", async () => {
  const server = tokenDe(SERVER_USER);

  const invalido = await pedirJson(`/api/v1/teacher-plans/${planId}/status`, server, { status: "volado" }, "PATCH");
  assert.equal(invalido.status, 422);

  const requerido = await pedirJson(`/api/v1/teacher-plans/${planId}/status`, server, {}, "PATCH");
  assert.equal(requerido.status, 400);

  const saltoInvalido = await pedirJson(
    `/api/v1/teacher-plans/${planId}/status`,
    server,
    { status: "aprobada" },
    "PATCH"
  );
  assert.equal(saltoInvalido.status, 422);
  assert.match(saltoInvalido.cuerpo.error.message, /Transición no permitida/);

  const mismoEstado = await pedirJson(
    `/api/v1/teacher-plans/${planId}/status`,
    server,
    { status: "borrador" },
    "PATCH"
  );
  assert.equal(mismoEstado.status, 409);
});

test("un docente sin planning.review no puede aprobar", async () => {
  const server = tokenDe(SERVER_USER);
  await pedirJson(`/api/v1/teacher-plans/${planId}/status`, tokenDe(DOCENTE_A), { status: "en_revision" }, "PATCH");

  const { status, cuerpo } = await pedirJson(
    `/api/v1/teacher-plans/${planId}/status`,
    tokenDe(DOCENTE_A),
    { status: "aprobada" },
    "PATCH"
  );
  assert.equal(status, 403);
  assert.match(cuerpo.error.message, /planning.review/);
});

test("observar exige comentario y queda auditado", async () => {
  const jefe = tokenDe(JEFE);

  const sinComentario = await pedirJson(
    `/api/v1/teacher-plans/${planId}/status`,
    jefe,
    { status: "observada" },
    "PATCH"
  );
  assert.equal(sinComentario.status, 422);
  assert.match(sinComentario.cuerpo.error.message, /observación/);

  const { status, cuerpo } = await pedirJson(
    `/api/v1/teacher-plans/${planId}/status`,
    jefe,
    { status: "observada", comment: "Ajustar la carga horaria de probabilidad" },
    "PATCH"
  );
  assert.equal(status, 200);
  assert.equal(cuerpo.data.status, "observada");
  assert.equal(cuerpo.data.reviewedBy, JEFE.id);
  assert.ok(cuerpo.data.reviewedAt);
  assert.equal(cuerpo.data.isEditable, true);
});

test("el docente corrige una planificación observada y la reenvía", async () => {
  const docente = tokenDe(DOCENTE_A);

  const correccion = await pedirJson(
    `/api/v1/teacher-plans/${planId}`,
    docente,
    { observations: "Carga horaria ajustada" },
    "PATCH"
  );
  assert.equal(correccion.status, 200);

  const reenvio = await pedirJson(
    `/api/v1/teacher-plans/${planId}/status`,
    docente,
    { status: "en_revision" },
    "PATCH"
  );
  assert.equal(reenvio.status, 200);
  assert.equal(reenvio.cuerpo.data.status, "en_revision");
});

test("aprobada exige planning.manage para editar el contenido", async () => {
  const jefe = tokenDe(JEFE);
  const docente = tokenDe(DOCENTE_A);

  const aprobacion = await pedirJson(
    `/api/v1/teacher-plans/${planId}/status`,
    jefe,
    { status: "aprobada", comment: "Carga horaria conforme" },
    "PATCH"
  );
  assert.equal(aprobacion.status, 200);
  assert.equal(aprobacion.cuerpo.data.status, "aprobada");
  assert.equal(aprobacion.cuerpo.data.isEditable, false);

  const intentoDocente = await pedirJson(
    `/api/v1/teacher-plans/${planId}`,
    docente,
    { observations: "cambio indebido" },
    "PATCH"
  );
  assert.equal(intentoDocente.status, 403);
  assert.match(intentoDocente.cuerpo.error.message, /planning.manage/);

  const correccionJefe = await pedirJson(
    `/api/v1/teacher-plans/${planId}`,
    jefe,
    { observations: "Ajuste autorizado por jefatura" },
    "PATCH"
  );
  assert.equal(correccionJefe.status, 200);

  const estado = await pedir(`/api/v1/teacher-plans/${planId}/status`, docente);
  assert.equal(estado.cuerpo.data.canEditContent, false);
  assert.equal(estado.cuerpo.data.requiresManageToEdit, true);
});

test("finaliza y archiva, dejando la planificación inmutable", async () => {
  const jefe = tokenDe(JEFE);
  const server = tokenDe(SERVER_USER);

  const finalizada = await pedirJson(
    `/api/v1/teacher-plans/${planId}/status`,
    jefe,
    { status: "finalizada" },
    "PATCH"
  );
  assert.equal(finalizada.status, 200);
  assert.equal(finalizada.cuerpo.data.status, "finalizada");

  const archivada = await pedirJson(
    `/api/v1/teacher-plans/${planId}/status`,
    server,
    { status: "archivada", comment: "Cierre del ciclo 2026" },
    "PATCH"
  );
  assert.equal(archivada.status, 200);
  assert.equal(archivada.cuerpo.data.status, "archivada");
  assert.ok(archivada.cuerpo.data.archivedAt);
  assert.deepEqual(archivada.cuerpo.data.allowedTransitions, []);
});

test("un DELETE archiva y no borra el historial", async () => {
  const server = tokenDe(SERVER_USER);

  const porDocente = await pedir(`/api/v1/teacher-plans/${planDeBrunoId}`, tokenDe(DOCENTE_B), {
    method: "DELETE"
  });
  assert.equal(porDocente.status, 403);

  const archivada = await pedir(`/api/v1/teacher-plans/${planDeBrunoId}`, server, {
    method: "DELETE",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ comment: "Archivado por direccion general" })
  });
  assert.equal(archivada.status, 200);
  assert.equal(archivada.cuerpo.data.status, "archivada");

  const historial = await pedir(`/api/v1/teacher-plans/${planDeBrunoId}/history`, server);
  assert.equal(historial.cuerpo.data.total, 2);
  assert.equal(historial.cuerpo.data.entries[0].comment, "Archivado por direccion general");
});

test("una planificación archivada no admite cambios ni transiciones", async () => {
  const server = tokenDe(SERVER_USER);

  const edicion = await pedirJson(
    `/api/v1/teacher-plans/${planId}`,
    server,
    { observations: "post-archivo" },
    "PATCH"
  );
  assert.equal(edicion.status, 409);
  assert.match(edicion.cuerpo.error.message, /archivada/);

  const transicion = await pedirJson(
    `/api/v1/teacher-plans/${planId}/status`,
    server,
    { status: "borrador" },
    "PATCH"
  );
  assert.equal(transicion.status, 422);

  const eliminacion = await pedir(`/api/v1/teacher-plans/${planId}`, server, { method: "DELETE" });
  assert.equal(eliminacion.status, 409);
});

test("el historial Documenta toda la trazabilidad de la planificación", async () => {
  const { status, cuerpo } = await pedir(`/api/v1/teacher-plans/${planId}/history`, tokenDe(SERVER_USER));
  assert.equal(status, 200);
  const tipos = cuerpo.data.entries.map((entry) => entry.type);
  assert.equal(tipos[0], "cambio_estado");
  assert.equal(tipos[tipos.length - 1], "creacion");
  assert.ok(cuerpo.data.entries.length >= 8);
  const archivo = cuerpo.data.entries.find(
    (entry) => entry.toStatus === "archivada" && entry.comment === "Cierre del ciclo 2026"
  );
  assert.ok(archivo);
  assert.equal(archivo.fromStatus, "finalizada");
  assert.equal(archivo.performedBy, SERVER_USER.id);
});

test("el historial de una planificación inexistente devuelve 404", async () => {
  const { status } = await pedir("/api/v1/teacher-plans/tpl_nope/history", tokenDe(SERVER_USER));
  assert.equal(status, 404);
});

test("compara lo planificado contra el seguimiento curricular", async () => {
  const server = tokenDe(SERVER_USER);

  const { status, cuerpo } = await pedir(
    `/api/v1/teacher-plans/${planId}/curriculum-comparison`,
    server
  );
  assert.equal(status, 200);
  assert.equal(cuerpo.data.planningId, planId);
  assert.equal(cuerpo.data.designs.length, 1);
  assert.equal(cuerpo.data.planificados.length, 3);

  const numeros = cuerpo.data.planificados.find((item) => item.name === "Numeros naturales");
  assert.ok(numeros.seguimiento);
  assert.equal(numeros.seguimiento.contentId, contenidoEnDesarrolloId);
  assert.equal(numeros.seguimiento.status, "en_desarrollo");
  assert.equal(numeros.seguimiento.progress, 30);

  const geometria = cuerpo.data.planificados.find((item) => item.name === "Geometria");
  assert.equal(geometria.seguimiento, null);

  assert.equal(cuerpo.data.sinPlanificar.length, 1);
  assert.equal(cuerpo.data.sinPlanificar[0].contentId, contenidoFraccionesId);
  assert.equal(cuerpo.data.resumen.planificados, 3);
  assert.equal(cuerpo.data.resumen.conSeguimiento, 1);
  assert.equal(cuerpo.data.resumen.sinSeguimiento, 2);
  assert.equal(cuerpo.data.resumen.contenidosCurriculum, 2);
  assert.equal(cuerpo.data.resumen.curriculumSinPlanificar, 1);
  assert.equal(cuerpo.data.resumen.promedioAvance, 15);
});

test("la comparación curricular no cruza materias, cursos ni años distintos", async () => {
  const server = tokenDe(SERVER_USER);

  const deBruno = await pedir(`/api/v1/teacher-plans/${planDeBrunoId}/curriculum-comparison`, server);
  assert.equal(deBruno.status, 200);
  assert.equal(deBruno.cuerpo.data.planificados.length, 0);
  assert.equal(deBruno.cuerpo.data.resumen.contenidosCurriculum, 0);

  const deSuelto = await pedir(`/api/v1/teacher-plans/${planDeSueltoId}/curriculum-comparison`, server);
  assert.equal(deSuelto.status, 200);
  assert.equal(deSuelto.cuerpo.data.resumen.contenidosCurriculum, 0);
  assert.equal(deSuelto.cuerpo.data.sinPlanificar.length, 0);

  const inexistente = await pedir("/api/v1/teacher-plans/tpl_nope/curriculum-comparison", server);
  assert.equal(inexistente.status, 404);
});

test("las planificaciones de otra escuela no son accesibles", async () => {
  const server = tokenDe(SERVER_USER);
  const outsider = userRepository.create({
    id: "usr_pl_otro",
    email: "otro@planificaciones.test",
    passwordHash: "hash",
    displayName: "Docente Otra Escuela",
    assignments: [{ role: "jefe_area", schoolId: "esc-pl-2" }]
  });

  const { status, cuerpo } = await pedir(
    `/api/v1/teacher-plans/${planId}/curriculum-comparison`,
    tokenDe(outsider)
  );
  assert.equal(status, 403);
  assert.equal(cuerpo.error.code, "forbidden");
});
