import assert from "node:assert/strict";
import test, { after, before } from "node:test";
import { createApp } from "../src/app.mjs";
import { apiRoutes } from "../routes/index.mjs";
import { userRepository } from "../database/repositories/user.repository.mjs";
import { signAccessToken } from "../modules/auth/token.service.mjs";
import teachersRepository from "../modules/teachers/teachers.repository.mjs";

const PUERTO = 4000;
const base = `http://127.0.0.1:${PUERTO}`;
let servidor;

const SERVER_USER = userRepository.create({
  id: "usr_seg_server",
  email: "server@seguimiento.test",
  passwordHash: "hash",
  displayName: "Server Seguimiento",
  assignments: [{ role: "server", schoolId: "esc-1" }]
});

const SECRETARIO = userRepository.create({
  id: "usr_seg_secretario",
  email: "secretario@seguimiento.test",
  passwordHash: "hash",
  displayName: "Secretario Seguimiento",
  assignments: [{ role: "secretario", schoolId: "esc-1" }]
});

const DOCENTE_A = userRepository.create({
  id: "usr_seg_docente_a",
  email: "docente-a@seguimiento.test",
  passwordHash: "hash",
  displayName: "Docente Ana",
  assignments: [{ role: "docente", schoolId: "esc-1" }]
});

const DOCENTE_B = userRepository.create({
  id: "usr_seg_docente_b",
  email: "docente-b@seguimiento.test",
  passwordHash: "hash",
  displayName: "Docente Bruno",
  assignments: [{ role: "docente", schoolId: "esc-1" }]
});

const PROFESOR_A = teachersRepository.create({
  id: "tch_seg_ana",
  userId: DOCENTE_A.id,
  firstName: "Ana",
  lastName: "Diaz",
  documentNumber: "31111000",
  documentType: "dni",
  email: "ana.diaz@seguimiento.test",
  schoolId: "esc-1"
});

teachersRepository.create({
  id: "tch_seg_bruno",
  userId: DOCENTE_B.id,
  firstName: "Bruno",
  lastName: "Lopez",
  documentNumber: "31111001",
  documentType: "dni",
  email: "bruno.lopez@seguimiento.test",
  schoolId: "esc-1"
});

teachersRepository.create({
  id: "tch_seg_suelto",
  userId: null,
  firstName: "Carlos",
  lastName: "Gomez",
  documentNumber: "31111002",
  documentType: "dni",
  email: "carlos.gomez@seguimiento.test",
  schoolId: "esc-1"
});

function tokenDe(user) {
  return signAccessToken(user);
}

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
    body: JSON.stringify(body)
  });
}

let materiaId;
let disenoId;
let diseno2Id;
let contenido1Id;
let contenido2Id;
let seguimiento1Id;
let seguimiento2Id;

test("un POST a /curriculum/materias sin token devuelve 401", async () => {
  const { status, cuerpo } = await pedirJson("/api/v1/curriculum/materias", null, { name: "Matematica", code: "MAT" });

  assert.equal(status, 401);
  assert.equal(cuerpo.error.code, "missing_token");
});

test("el secretario no puede crear materias (403)", async () => {
  const { status, cuerpo } = await pedirJson("/api/v1/curriculum/materias", tokenDe(SECRETARIO), {
    name: "Matematica",
    code: "MAT",
    schoolId: "esc-1"
  });

  assert.equal(status, 403);
  assert.equal(cuerpo.error.code, "forbidden");
});

test("el server crea una materia", async () => {
  const { status, cuerpo } = await pedirJson("/api/v1/curriculum/materias", tokenDe(SERVER_USER), {
    name: "Matemática",
    code: "MAT",
    schoolId: "esc-1"
  });

  assert.equal(status, 201);
  assert.ok(cuerpo.data.id.startsWith("mat_"));
  assert.equal(cuerpo.data.name, "Matemática");
  assert.equal(cuerpo.data.code, "MAT");
  assert.equal(cuerpo.data.designsCount, 0);
  materiaId = cuerpo.data.id;
});

test("no se permite duplicar el código de materia", async () => {
  const { status, cuerpo } = await pedirJson("/api/v1/curriculum/materias", tokenDe(SERVER_USER), {
    name: "Matematica II",
    code: "MAT",
    schoolId: "esc-1"
  });

  assert.equal(status, 409);
  assert.equal(cuerpo.error.code, "conflict");
});

test("el secretario puede listar materias", async () => {
  const { status, cuerpo } = await pedir("/api/v1/curriculum/materias", tokenDe(SECRETARIO));

  assert.equal(status, 200);
  assert.ok(cuerpo.data.some((subject) => subject.id === materiaId));
});

test("se asocia al docente A con la materia y el curso del diseño", async () => {
  teachersRepository.addSubject(PROFESOR_A.id, {
    subjectId: materiaId,
    courseId: "curso-1a",
    divisionId: "div-a",
    schoolId: "esc-1"
  });

  const asignaciones = teachersRepository.listSubjects({ teacherId: PROFESOR_A.id, schoolId: "esc-1" });
  assert.equal(asignaciones.length, 1);
  assert.equal(asignaciones[0].courseId, "curso-1a");
});

test("consultar una materia inexistente devuelve 404", async () => {
  const { status } = await pedir("/api/v1/curriculum/materias/mat_noexiste", tokenDe(SERVER_USER));

  assert.equal(status, 404);
});

test("el secretario no puede crear diseños (403)", async () => {
  const { status, cuerpo } = await pedirJson("/api/v1/curriculum/disenos", tokenDe(SECRETARIO), {
    subjectId: materiaId,
    year: 2026,
    courseId: "curso-1a",
    name: "Matemática 1A",
    schoolId: "esc-1"
  });

  assert.equal(status, 403);
  assert.equal(cuerpo.error.code, "forbidden");
});

test("un diseño con materia inexistente devuelve 404", async () => {
  const { status, cuerpo } = await pedirJson("/api/v1/curriculum/disenos", tokenDe(SERVER_USER), {
    subjectId: "mat_noexiste",
    year: 2026,
    courseId: "curso-1a",
    name: "Matemática 1A",
    schoolId: "esc-1"
  });

  assert.equal(status, 404);
  assert.equal(cuerpo.error.code, "not_found");
});

test("el server crea un diseño curricular vigente", async () => {
  const { status, cuerpo } = await pedirJson("/api/v1/curriculum/disenos", tokenDe(SERVER_USER), {
    subjectId: materiaId,
    year: 2026,
    courseId: "curso-1a",
    divisionId: "div-a",
    name: "Matemática 1A 2026",
    objectives: ["Numeros y operaciones", "Algebra"],
    status: "vigente",
    schoolId: "esc-1"
  });

  assert.equal(status, 201);
  assert.ok(cuerpo.data.id.startsWith("dcr_"));
  assert.equal(cuerpo.data.subjectName, "Matemática");
  assert.equal(cuerpo.data.year, 2026);
  assert.equal(cuerpo.data.status, "vigente");
  assert.equal(cuerpo.data.total, 0);
  disenoId = cuerpo.data.id;
});

test("no se permite duplicar el diseño de una materia en el mismo curso y año", async () => {
  const { status, cuerpo } = await pedirJson("/api/v1/curriculum/disenos", tokenDe(SERVER_USER), {
    subjectId: materiaId,
    year: 2026,
    courseId: "curso-1a",
    name: "Otro diseño",
    schoolId: "esc-1"
  });

  assert.equal(status, 409);
  assert.equal(cuerpo.error.code, "conflict");
});

test("un diseño con año inválido devuelve 422", async () => {
  const { status, cuerpo } = await pedirJson("/api/v1/curriculum/disenos", tokenDe(SERVER_USER), {
    subjectId: materiaId,
    year: 1999,
    courseId: "curso-2a",
    name: "Matemática 2A",
    schoolId: "esc-1"
  });

  assert.equal(status, 422);
  assert.equal(cuerpo.error.code, "validation_error");
});

test("el secretario puede listar diseños", async () => {
  const { status, cuerpo } = await pedir("/api/v1/curriculum/disenos", tokenDe(SECRETARIO));

  assert.equal(status, 200);
  assert.ok(cuerpo.data.some((design) => design.id === disenoId));
});

test("un contenido no acepta avance manual al crearse", async () => {
  const { status, cuerpo } = await pedirJson("/api/v1/curriculum/contenidos", tokenDe(SERVER_USER), {
    designId: disenoId,
    name: "Numeros enteros",
    progress: 50,
    schoolId: "esc-1"
  });

  assert.equal(status, 422);
  assert.equal(cuerpo.error.code, "validation_error");
});

test("un contenido con diseño inexistente devuelve 404", async () => {
  const { status, cuerpo } = await pedirJson("/api/v1/curriculum/contenidos", tokenDe(SERVER_USER), {
    designId: "dcr_noexiste",
    name: "Numeros enteros",
    schoolId: "esc-1"
  });

  assert.equal(status, 404);
  assert.equal(cuerpo.error.code, "not_found");
});

test("un contenido con docente no asociado a la materia devuelve 422", async () => {
  const { status, cuerpo } = await pedirJson("/api/v1/curriculum/contenidos", tokenDe(SERVER_USER), {
    designId: disenoId,
    name: "Numeros enteros",
    teacherId: "tch_seg_suelto",
    schoolId: "esc-1"
  });

  assert.equal(status, 422);
  assert.equal(cuerpo.error.code, "validation_error");
});

test("el server crea un contenido asignado al docente A", async () => {
  const { status, cuerpo } = await pedirJson("/api/v1/curriculum/contenidos", tokenDe(SERVER_USER), {
    designId: disenoId,
    name: "Números enteros",
    teacherId: PROFESOR_A.id,
    schoolId: "esc-1"
  });

  assert.equal(status, 201);
  assert.ok(cuerpo.data.id.startsWith("cnt_"));
  assert.equal(cuerpo.data.status, "no_iniciado");
  assert.equal(cuerpo.data.progress, 0);
  assert.equal(cuerpo.data.subjectName, "Matemática");
  assert.equal(cuerpo.data.teacher.firstName, "Ana");
  contenido1Id = cuerpo.data.id;
});

test("no se permite duplicar el nombre de un contenido en el mismo diseño", async () => {
  const { status, cuerpo } = await pedirJson("/api/v1/curriculum/contenidos", tokenDe(SERVER_USER), {
    designId: disenoId,
    name: "NÚMEROS ENTEROS",
    schoolId: "esc-1"
  });

  assert.equal(status, 409);
  assert.equal(cuerpo.error.code, "conflict");
});

test("el server crea un segundo contenido sin docente a cargo", async () => {
  const { status, cuerpo } = await pedirJson("/api/v1/curriculum/contenidos", tokenDe(SERVER_USER), {
    designId: disenoId,
    name: "Ecuaciones lineales",
    schoolId: "esc-1"
  });

  assert.equal(status, 201);
  assert.equal(cuerpo.data.status, "no_iniciado");
  assert.equal(cuerpo.data.progress, 0);
  assert.equal(cuerpo.data.teacher, null);
  contenido2Id = cuerpo.data.id;
});

test("el listado de contenidos filtra por diseño", async () => {
  const { status, cuerpo } = await pedir(
    `/api/v1/curriculum/contenidos?designId=${disenoId}`,
    tokenDe(SERVER_USER)
  );

  assert.equal(status, 200);
  assert.equal(cuerpo.data.length, 2);
});

test("el listado de contenidos pendientes incluye los contenidos sin iniciar", async () => {
  const { status, cuerpo } = await pedir("/api/v1/curriculum/contenidos/pendientes", tokenDe(SERVER_USER));

  assert.equal(status, 200);
  assert.ok(cuerpo.data.some((content) => content.id === contenido1Id));
  assert.ok(cuerpo.data.some((content) => content.id === contenido2Id));
});

test("el detalle de un contenido expone materia y progreso", async () => {
  const { status, cuerpo } = await pedir(`/api/v1/curriculum/contenidos/${contenido1Id}`, tokenDe(SERVER_USER));

  assert.equal(status, 200);
  assert.equal(cuerpo.data.designId, disenoId);
  assert.equal(cuerpo.data.subjectName, "Matemática");
  assert.equal(cuerpo.data.courseId, "curso-1a");
  assert.equal(cuerpo.data.progress, 0);
  assert.equal(cuerpo.data.trackingCount, 0);
});

test("un PATCH sobre un contenido no acepta avance manual", async () => {
  const { status, cuerpo } = await pedirJson(
    `/api/v1/curriculum/contenidos/${contenido1Id}`,
    tokenDe(SERVER_USER),
    { progress: 60 },
    "PATCH"
  );

  assert.equal(status, 422);
  assert.equal(cuerpo.error.code, "validation_error");
});

test("un PATCH sobre un contenido tampoco acepta estado manual", async () => {
  const { status, cuerpo } = await pedirJson(
    `/api/v1/curriculum/contenidos/${contenido1Id}`,
    tokenDe(SERVER_USER),
    { status: "desarrollado" },
    "PATCH"
  );

  assert.equal(status, 422);
  assert.equal(cuerpo.error.code, "validation_error");
});

test("el docente A renombra un contenido", async () => {
  const { status, cuerpo } = await pedirJson(
    `/api/v1/curriculum/contenidos/${contenido1Id}`,
    tokenDe(SERVER_USER),
    { name: "Números enteros y operaciones" },
    "PATCH"
  );

  assert.equal(status, 200);
  assert.equal(cuerpo.data.name, "Números enteros y operaciones");
});

test("el secretario no puede registrar seguimientos (403)", async () => {
  const { status, cuerpo } = await pedirJson("/api/v1/curriculum/seguimientos", tokenDe(SECRETARIO), {
    contentId: contenido1Id,
    status: "en_desarrollo"
  });

  assert.equal(status, 403);
  assert.equal(cuerpo.error.code, "forbidden");
});

test("un docente que no está a cargo del contenido no puede seguirlo (403)", async () => {
  const { status, cuerpo } = await pedirJson("/api/v1/curriculum/seguimientos", tokenDe(DOCENTE_B), {
    contentId: contenido1Id,
    status: "en_desarrollo"
  });

  assert.equal(status, 403);
  assert.equal(cuerpo.error.code, "forbidden");
});

test("el docente a cargo registra el primer seguimiento y actualiza el avance", async () => {
  const { status, cuerpo } = await pedirJson("/api/v1/curriculum/seguimientos", tokenDe(DOCENTE_A), {
    contentId: contenido1Id,
    status: "en_desarrollo",
    note: "Se inicia la unidad",
    date: "2026-10-01"
  });

  assert.equal(status, 201);
  assert.ok(cuerpo.data.tracking.id.startsWith("seg_"));
  assert.equal(cuerpo.data.tracking.status, "en_desarrollo");
  assert.equal(cuerpo.data.tracking.progress, 30);
  assert.equal(cuerpo.data.content.status, "en_desarrollo");
  assert.equal(cuerpo.data.content.progress, 30);
  seguimiento1Id = cuerpo.data.tracking.id;
});

test("el historial del contenido guarda la primera entrada", async () => {
  const { status, cuerpo } = await pedir(`/api/v1/curriculum/contenidos/${contenido1Id}/historial`, tokenDe(SERVER_USER));

  assert.equal(status, 200);
  assert.equal(cuerpo.data.entries.length, 1);
  assert.equal(cuerpo.data.entries[0].type, "creado");
});

test("un nuevo seguimiento con avance explícito reemplaza el avance del contenido", async () => {
  const { status, cuerpo } = await pedirJson("/api/v1/curriculum/seguimientos", tokenDe(SERVER_USER), {
    contentId: contenido1Id,
    status: "parcialmente_desarrollado",
    progress: 80,
    date: "2026-10-05"
  });

  assert.equal(status, 201);
  assert.equal(cuerpo.data.content.progress, 80);
  assert.equal(cuerpo.data.content.status, "parcialmente_desarrollado");
  seguimiento2Id = cuerpo.data.tracking.id;
});

test("el detalle del contenido refleja el último seguimiento", async () => {
  const { status, cuerpo } = await pedir(`/api/v1/curriculum/contenidos/${contenido1Id}`, tokenDe(SERVER_USER));

  assert.equal(status, 200);
  assert.equal(cuerpo.data.progress, 80);
  assert.equal(cuerpo.data.status, "parcialmente_desarrollado");
  assert.equal(cuerpo.data.trackingCount, 2);
  assert.equal(cuerpo.data.lastTracking.id, seguimiento2Id);
});

test("el listado de seguimientos expone el historial registrado", async () => {
  const { status, cuerpo } = await pedir("/api/v1/curriculum/seguimientos", tokenDe(SERVER_USER));

  assert.equal(status, 200);
  assert.equal(cuerpo.data.length, 2);
});

test("el listado de seguimientos filtra por materia", async () => {
  const { status, cuerpo } = await pedir(
    `/api/v1/curriculum/seguimientos?subjectId=${materiaId}`,
    tokenDe(SERVER_USER)
  );

  assert.equal(status, 200);
  assert.equal(cuerpo.data.length, 2);
});

test("el listado de seguimientos valida el contenido indicado", async () => {
  const { status } = await pedir("/api/v1/curriculum/seguimientos?contentId=cnt_noexiste", tokenDe(SERVER_USER));

  assert.equal(status, 404);
});

test("el listado de contenidos valida el año", async () => {
  const { status, cuerpo } = await pedir("/api/v1/curriculum/contenidos?year=1999", tokenDe(SERVER_USER));

  assert.equal(status, 422);
  assert.equal(cuerpo.error.code, "validation_error");
});

test("el avance por materia resume totales y promedio", async () => {
  const { status, cuerpo } = await pedir("/api/v1/curriculum/avance/materia", tokenDe(SERVER_USER));

  assert.equal(status, 200);
  const materia = cuerpo.data.items.find((item) => item.subjectId === materiaId);
  assert.ok(materia);
  assert.equal(materia.total, 2);
  assert.equal(materia.pendientes, 1);
  assert.equal(materia.enProceso, 1);
  assert.equal(materia.desarrollados, 0);
  assert.equal(materia.promedio, 40);
  assert.equal(cuerpo.data.resumen.materias, 1);
});

test("el avance por curso agrupa los contenidos del curso", async () => {
  const { status, cuerpo } = await pedir("/api/v1/curriculum/avance/curso", tokenDe(SERVER_USER));

  assert.equal(status, 200);
  const curso = cuerpo.data.items.find((item) => item.courseId === "curso-1a");
  assert.ok(curso);
  assert.equal(curso.total, 2);
  assert.equal(cuerpo.data.resumen.total, 2);
});

test("el avance por docente agrupa por docente a cargo", async () => {
  const { status, cuerpo } = await pedir("/api/v1/curriculum/avance/docente", tokenDe(SERVER_USER));

  assert.equal(status, 200);
  const ana = cuerpo.data.items.find((item) => item.teacherId === PROFESOR_A.id);
  assert.ok(ana);
  assert.equal(ana.teacherName, "Ana Diaz");
  assert.equal(ana.total, 1);
  const sinDocente = cuerpo.data.items.find((item) => item.teacherId === null);
  assert.ok(sinDocente);
  assert.equal(sinDocente.total, 1);
});

test("el avance por periodo agrupa por año lectivo", async () => {
  const { status, cuerpo } = await pedir("/api/v1/curriculum/avance/periodo", tokenDe(SERVER_USER));

  assert.equal(status, 200);
  const periodo = cuerpo.data.items.find((item) => item.year === 2026);
  assert.ok(periodo);
  assert.equal(periodo.total, 2);
});

test("el avance de pendientes agrupa los contenidos sin desarrollar", async () => {
  const { status, cuerpo } = await pedir("/api/v1/curriculum/avance/pendientes", tokenDe(SERVER_USER));

  assert.equal(status, 200);
  assert.equal(cuerpo.data.total, 1);
  assert.equal(cuerpo.data.items.length, 1);
  assert.equal(cuerpo.data.items[0].subjectName, "Matemática");
  assert.equal(cuerpo.data.items[0].courseId, "curso-1a");
  assert.equal(cuerpo.data.items[0].teacherId, null);
  assert.equal(cuerpo.data.items[0].count, 1);
});

test("un contenido sin seguimientos mantiene su estado inicial", async () => {
  const { status, cuerpo } = await pedir(`/api/v1/curriculum/contenidos/${contenido2Id}`, tokenDe(SERVER_USER));

  assert.equal(status, 200);
  assert.equal(cuerpo.data.status, "no_iniciado");
  assert.equal(cuerpo.data.progress, 0);
});

test("modificar un seguimiento deriva un nuevo estado en el contenido", async () => {
  const { status, cuerpo } = await pedirJson(
    `/api/v1/curriculum/seguimientos/${seguimiento2Id}`,
    tokenDe(SERVER_USER),
    { status: "desarrollado" },
    "PATCH"
  );

  assert.equal(status, 200);
  assert.equal(cuerpo.data.tracking.status, "desarrollado");
  assert.equal(cuerpo.data.tracking.progress, 100);
  assert.equal(cuerpo.data.content.status, "desarrollado");
  assert.equal(cuerpo.data.content.progress, 100);
});

test("el historial registra la modificación del seguimiento", async () => {
  const { status, cuerpo } = await pedir(`/api/v1/curriculum/contenidos/${contenido1Id}/historial`, tokenDe(SERVER_USER));

  assert.equal(status, 200);
  assert.equal(cuerpo.data.entries.length, 3);
  assert.ok(cuerpo.data.entries.some((entry) => entry.type === "actualizado"));
  assert.ok(cuerpo.data.entries.every((entry) => entry.contentId === contenido1Id));
});

test("no se crean contenidos sobre diseños archivados", async () => {
  const creado = await pedirJson("/api/v1/curriculum/disenos", tokenDe(SERVER_USER), {
    subjectId: materiaId,
    year: 2026,
    courseId: "curso-2a",
    name: "Matemática 2A 2026",
    schoolId: "esc-1"
  });
  assert.equal(creado.status, 201);
  diseno2Id = creado.cuerpo.data.id;

  const archivado = await pedirJson(
    `/api/v1/curriculum/disenos/${diseno2Id}`,
    tokenDe(SERVER_USER),
    { status: "archivado" },
    "PATCH"
  );
  assert.equal(archivado.status, 200);
  assert.equal(archivado.cuerpo.data.status, "archivado");

  const { status, cuerpo } = await pedirJson("/api/v1/curriculum/contenidos", tokenDe(SERVER_USER), {
    designId: diseno2Id,
    name: "Contenido de diseño archivado",
    schoolId: "esc-1"
  });

  assert.equal(status, 409);
  assert.equal(cuerpo.error.code, "conflict");
});

test("un seguimiento inexistente devuelve 404", async () => {
  const { status } = await pedir("/api/v1/curriculum/seguimientos/seg_noexiste", tokenDe(SERVER_USER));

  assert.equal(status, 404);
});

test("las rutas de contenidos resuelven pendientes antes que un id", async () => {
  const { status, cuerpo } = await pedir("/api/v1/curriculum/contenidos/pendientes", tokenDe(SERVER_USER));

  assert.equal(status, 200);
  assert.ok(Array.isArray(cuerpo.data));
});