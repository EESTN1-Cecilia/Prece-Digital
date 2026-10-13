import assert from "node:assert/strict";
import test, { after, before } from "node:test";
import { createApp } from "../src/app.mjs";
import { apiRoutes } from "../routes/index.mjs";
import { userRepository } from "../database/repositories/user.repository.mjs";
import { signAccessToken } from "../modules/auth/token.service.mjs";
import { setTestPool } from "../database/client.mjs";
import spacesRepository from "../modules/spaces/spaces.repository.mjs";
import teachersRepository from "../modules/teachers/teachers.repository.mjs";
import schedulesRepository from "../modules/schedules/schedules.repository.mjs";
import reassignmentsRepository from "../modules/reassignments/reassignments.repository.mjs";

const PUERTO = 3998;
const base = `http://127.0.0.1:${PUERTO}`;
let servidor;

const FECHA = "2026-09-30";
const DIA = "miercoles";
const HORA_INICIO = "13:00";
const HORA_FIN = "14:00";
const CURSO = "curso-1a";
const DIVISION = "div-a";
const MATERIA = "mat-matematica";

const SERVER_USER = userRepository.create({
  id: "usr_server",
  email: "server@eventos.test",
  passwordHash: "hash",
  displayName: "Server Test",
  assignments: [{ role: "server", schoolId: "esc-1" }]
});

const PRECEPTOR = userRepository.create({
  id: "usr_preceptor",
  email: "preceptor@eventos.test",
  passwordHash: "hash",
  displayName: "Preceptor Test",
  assignments: [{ role: "preceptor", schoolId: "esc-1" }]
});

const DIRECTOR = userRepository.create({
  id: "usr_director",
  email: "director@eventos.test",
  passwordHash: "hash",
  displayName: "Director Test",
  assignments: [{ role: "director", schoolId: "esc-1" }]
});

const DIRECTOR_OTRA_ESCUELA = userRepository.create({
  id: "usr_director_otra",
  email: "director-otra@eventos.test",
  passwordHash: "hash",
  displayName: "Director Otra Escuela",
  assignments: [{ role: "director", schoolId: "esc-2" }]
});

const PRECEPTOR_OTRA_ESCUELA = userRepository.create({
  id: "usr_preceptor_otra",
  email: "preceptor-otra@eventos.test",
  passwordHash: "hash",
  displayName: "Preceptor Otra Escuela",
  assignments: [{ role: "preceptor", schoolId: "esc-2" }]
});

const DOCENTE = userRepository.create({
  id: "usr_docente",
  email: "docente@eventos.test",
  passwordHash: "hash",
  displayName: "Docente Test",
  assignments: [{ role: "docente", schoolId: "esc-1" }]
});

const AULA_12 = spacesRepository.createSpace({
  id: "spc_aula12",
  name: "Aula 12",
  code: "A12",
  type: "aula",
  capacity: 40,
  buildingId: "bld_1",
  floor: 1,
  schoolId: "esc-1"
});

const AULA_13 = spacesRepository.createSpace({
  id: "spc_aula13",
  name: "Aula 13",
  code: "A13",
  type: "aula",
  capacity: 35,
  buildingId: "bld_1",
  floor: 1,
  schoolId: "esc-1"
});

const PROFESOR = teachersRepository.create({
  id: "tch_perez",
  userId: null,
  firstName: "Juan",
  lastName: "Perez",
  documentNumber: "30111222",
  documentType: "dni",
  email: "juan.perez@eventos.test",
  schoolId: "esc-1"
});

const horario = schedulesRepository.createSchedule({
  id: "sch_2026a",
  name: "Ciclo 2026 A",
  year: 2026,
  period: "anual",
  startDate: "2026-03-01",
  endDate: "2026-12-15",
  schoolId: "esc-1",
  isActive: true
});

const ASIGNACION = schedulesRepository.createAssignment({
  id: "sca_mates_1a",
  scheduleId: horario.id,
  timeSlotId: "ts_1",
  dayOfWeek: DIA,
  startTime: HORA_INICIO,
  endTime: HORA_FIN,
  spaceId: AULA_12.id,
  subjectId: MATERIA,
  teacherId: PROFESOR.id,
  courseId: CURSO,
  divisionId: DIVISION,
  shiftId: "shf_manana",
  schoolId: "esc-1",
  isActive: true
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

let ausenciaJustificadaId;
let eventoJustificada;

test("un POST a /absence-events sin token devuelve 401", async () => {
  const { status, cuerpo } = await pedirJson("/api/v1/absence-events", null, { absenceId: "abs_x" });

  assert.equal(status, 401);
  assert.equal(cuerpo.error.code, "missing_token");
});

test("un rol con solo lectura no puede generar eventos (403)", async () => {
  const { status, cuerpo } = await pedirJson("/api/v1/absence-events", tokenDe(DOCENTE), { absenceId: "abs_x" });

  assert.equal(status, 403);
  assert.equal(cuerpo.error.code, "forbidden");
});

test("la creacion de una ausencia valida genera el evento y notifica a preceptoria", async () => {
  const { status, cuerpo } = await pedirJson("/api/v1/absences", tokenDe(SERVER_USER), {
    teacherId: PROFESOR.id,
    scheduleAssignmentId: ASIGNACION.id,
    date: FECHA,
    type: "justificada"
  });

  assert.equal(status, 201);
  assert.equal(cuerpo.event.created, true);
  assert.equal(cuerpo.event.event.status, "activo");
  assert.equal(cuerpo.event.event.classState, "sin_clase");
  assert.equal(cuerpo.event.event.spaceAvailable, true);
  assert.equal(cuerpo.event.event.absenceId, cuerpo.data.id);
  assert.equal(cuerpo.event.event.teacherId, PROFESOR.id);
  assert.equal(cuerpo.event.event.courseId, CURSO);
  assert.equal(cuerpo.event.event.divisionId, DIVISION);
  assert.equal(cuerpo.event.event.subjectId, MATERIA);
  assert.ok(cuerpo.event.event.id.startsWith("aev_"));

  ausenciaJustificadaId = cuerpo.data.id;
  eventoJustificada = cuerpo.event.event.id;

  const destinatarios = cuerpo.event.notifications.map((n) => n.recipientId);
  assert.ok(destinatarios.includes(PRECEPTOR.id));

  const preceptorNotification = cuerpo.event.notifications.find((n) => n.recipientId === PRECEPTOR.id);
  assert.equal(preceptorNotification.type, "ausencia");
  assert.equal(preceptorNotification.role, "preceptor");
  assert.equal(preceptorNotification.priority, "normal");
  assert.ok(preceptorNotification.body.includes("Juan"));
  assert.ok(preceptorNotification.body.includes("no tendrá clase"));
});

test("una ausencia justificada no notifica a direccion ni a otras escuelas", async () => {
  const { cuerpo } = await pedir("/api/v1/absence-events/by-absence/" + ausenciaJustificadaId, tokenDe(SERVER_USER));

  assert.equal(cuerpo.data.id, eventoJustificada);
  assert.equal(cuerpo.data.notificationCount, 1);

  const { cuerpo: notificaciones } = await pedir(
    `/api/v1/absence-events/${eventoJustificada}/notifications`,
    tokenDe(SERVER_USER)
  );
  const destinatarios = notificaciones.data.map((n) => n.recipientId);
  assert.ok(!destinatarios.includes(DIRECTOR.id));
  assert.ok(!destinatarios.includes(DIRECTOR_OTRA_ESCUELA.id));
  assert.ok(!destinatarios.includes(PRECEPTOR_OTRA_ESCUELA.id));
});

test("generar de nuevo el evento es idempotente y no duplica notificaciones", async () => {
  const { status, cuerpo } = await pedirJson("/api/v1/absence-events", tokenDe(SERVER_USER), {
    absenceId: ausenciaJustificadaId
  });

  assert.equal(status, 200);
  assert.equal(cuerpo.data.created, false);
  assert.equal(cuerpo.data.event.id, eventoJustificada);
  assert.equal(cuerpo.data.event.notificationCount, 1);
  assert.equal(cuerpo.data.notifications.length, 1);
});

test("la consulta de estado de clase refleja la ausencia activa", async () => {
  const { status, cuerpo } = await pedir(
    `/api/v1/absence-events/${eventoJustificada}/class-state`,
    tokenDe(PRECEPTOR)
  );

  assert.equal(status, 200);
  assert.equal(cuerpo.data.classState, "sin_clase");
  assert.equal(cuerpo.data.date, FECHA);
  assert.equal(cuerpo.data.dayOfWeek, DIA);
  assert.equal(cuerpo.data.startTime, HORA_INICIO);
  assert.equal(cuerpo.data.endTime, HORA_FIN);
  assert.equal(cuerpo.data.teacherId, PROFESOR.id);
  assert.equal(cuerpo.data.courseId, CURSO);
  assert.equal(cuerpo.data.currentSpaceId, AULA_12.id);
  assert.equal(cuerpo.data.reassigned, false);
});

test("la consulta de disponibilidad informa el espacio liberado", async () => {
  const { status, cuerpo } = await pedir(
    `/api/v1/absence-events/${eventoJustificada}/space-availability`,
    tokenDe(PRECEPTOR)
  );

  assert.equal(status, 200);
  assert.equal(cuerpo.data.spaceAvailable, true);
  assert.equal(cuerpo.data.spaceId, AULA_12.id);
  assert.equal(cuerpo.data.space.name, "Aula 12");
  assert.equal(cuerpo.data.availability[0].status, "disponible_por_ausencia");
  assert.equal(cuerpo.data.availability[0].reason, "ausencia_docente");
});

test("las clases afectadas reportan docente y espacio", async () => {
  const { status, cuerpo } = await pedir(
    `/api/v1/absence-events/${eventoJustificada}/affected-classes`,
    tokenDe(PRECEPTOR)
  );

  assert.equal(status, 200);
  assert.equal(cuerpo.data.length, 1);
  const clase = cuerpo.data[0];
  assert.equal(clase.scheduleAssignmentId, ASIGNACION.id);
  assert.equal(clase.subjectId, MATERIA);
  assert.equal(clase.classState, "sin_clase");
  assert.equal(clase.spaceName, "Aula 12");
  assert.equal(clase.spaceCode, "A12");
  assert.equal(clase.teacherName, "Juan Perez");
  assert.equal(clase.reassigned, false);
});

test("una ausencia con tipo critico notifica tambien a direccion con prioridad alta", async () => {
  const { status, cuerpo } = await pedirJson("/api/v1/absences", tokenDe(SERVER_USER), {
    teacherId: PROFESOR.id,
    scheduleAssignmentId: ASIGNACION.id,
    date: "2026-10-07",
    type: "medica",
    reason: "Licencia medica extendida"
  });

  assert.equal(status, 201);
  const event = cuerpo.event.event;
  const destinatarios = cuerpo.event.notifications.map((n) => n.recipientId);
  assert.ok(destinatarios.includes(PRECEPTOR.id));
  assert.ok(destinatarios.includes(DIRECTOR.id));

  const directorNotification = cuerpo.event.notifications.find((n) => n.recipientId === DIRECTOR.id);
  assert.equal(directorNotification.role, "director");
  assert.equal(directorNotification.priority, "alta");
  assert.ok(directorNotification.body.includes("Licencia medica"));
});

test("otra ausencia critica notifica a ambos roles pero no a otras escuelas", async () => {
  const { status, cuerpo } = await pedirJson("/api/v1/absences", tokenDe(SERVER_USER), {
    teacherId: PROFESOR.id,
    scheduleAssignmentId: ASIGNACION.id,
    date: "2026-10-14",
    type: "personal"
  });

  assert.equal(status, 201);
  const destinatarios = cuerpo.event.notifications.map((n) => n.recipientId);
  assert.ok(destinatarios.includes(PRECEPTOR.id));
  assert.ok(destinatarios.includes(DIRECTOR.id));
  assert.ok(!destinatarios.includes(DIRECTOR_OTRA_ESCUELA.id));
  assert.ok(!destinatarios.includes(PRECEPTOR_OTRA_ESCUELA.id));
});

test("una reasignacion activa se refleja en las consultas posteriores", async () => {
  reassignmentsRepository.createReassignment({
    scheduleAssignmentId: ASIGNACION.id,
    courseId: CURSO,
    divisionId: DIVISION,
    subjectId: MATERIA,
    teacherId: PROFESOR.id,
    originalSpaceId: AULA_12.id,
    newSpaceId: AULA_13.id,
    date: FECHA,
    dayOfWeek: DIA,
    startTime: HORA_INICIO,
    endTime: HORA_FIN,
    reason: "Aula 12 en mantenimiento",
    availabilityId: null,
    status: "activa",
    schoolId: "esc-1",
    createdBy: SERVER_USER.id
  });

  const { cuerpo: clases } = await pedir(
    `/api/v1/absence-events/${eventoJustificada}/affected-classes`,
    tokenDe(SERVER_USER)
  );
  const clase = clases.data[0];
  assert.equal(clase.reassigned, true);
  assert.equal(clase.currentSpaceId, AULA_13.id);
  assert.equal(clase.currentSpaceName, "Aula 13");
  assert.equal(clase.spaceId, AULA_12.id);

  const { cuerpo: estado } = await pedir(
    `/api/v1/absence-events/${eventoJustificada}/class-state`,
    tokenDe(SERVER_USER)
  );
  assert.equal(estado.data.reassigned, true);
  assert.equal(estado.data.currentSpaceId, AULA_13.id);

  const { cuerpo: disponibilidad } = await pedir(
    `/api/v1/absence-events/${eventoJustificada}/space-availability`,
    tokenDe(SERVER_USER)
  );
  assert.equal(disponibilidad.data.reassigned, true);
  assert.equal(disponibilidad.data.reassignment.currentSpaceId, AULA_13.id);
  assert.equal(disponibilidad.data.spaceAvailable, true);
});

test("anular la ausencia inactiva el evento y restaura el estado de clase", async () => {
  const anular = await pedirJson(
    `/api/v1/absences/${ausenciaJustificadaId}/annul`,
    tokenDe(SERVER_USER)
  );
  assert.equal(anular.status, 200);

  const { cuerpo: evento } = await pedir(`/api/v1/absence-events/${eventoJustificada}`, tokenDe(SERVER_USER));
  assert.equal(evento.data.status, "anulada");
  assert.equal(evento.data.classState, "con_clase");
  assert.equal(evento.data.spaceAvailable, false);

  const { cuerpo: estado } = await pedir(
    `/api/v1/absence-events/${eventoJustificada}/class-state`,
    tokenDe(SERVER_USER)
  );
  assert.equal(estado.data.classState, "con_clase");

  const { cuerpo: disponibilidad } = await pedir(
    `/api/v1/absence-events/${eventoJustificada}/space-availability`,
    tokenDe(SERVER_USER)
  );
  assert.equal(disponibilidad.data.spaceAvailable, false);
  assert.equal(disponibilidad.data.availability.length, 0);
});

test("no se generan eventos para ausencias anuladas", async () => {
  const anulada = await pedirJson("/api/v1/absences", tokenDe(SERVER_USER), {
    teacherId: PROFESOR.id,
    scheduleAssignmentId: ASIGNACION.id,
    date: "2026-10-21",
    type: "otra",
    status: "anulada"
  });

  assert.equal(anulada.status, 201);
  assert.equal(anulada.cuerpo.event, null);
});

test("reactivar la ausencia vuelve a activar el evento", async () => {
  const reactivar = await pedirJson(
    `/api/v1/absences/${ausenciaJustificadaId}/reactivate`,
    tokenDe(SERVER_USER)
  );
  assert.equal(reactivar.status, 200);

  const { cuerpo } = await pedir(`/api/v1/absence-events/${eventoJustificada}`, tokenDe(SERVER_USER));
  assert.equal(cuerpo.data.status, "activo");
  assert.equal(cuerpo.data.classState, "sin_clase");
  assert.equal(cuerpo.data.spaceAvailable, true);
});

test("modificar la ausencia no duplica notificaciones", async () => {
  const antes = await pedir(`/api/v1/absence-events/${eventoJustificada}`, tokenDe(SERVER_USER));
  assert.equal(antes.cuerpo.data.notificationCount, 1);

  await pedirJson(`/api/v1/absences/${ausenciaJustificadaId}`, tokenDe(SERVER_USER), {
    observations: "Observacion actualizada"
  }, "PATCH");

  const despues = await pedir(`/api/v1/absence-events/${eventoJustificada}`, tokenDe(SERVER_USER));
  assert.equal(despues.cuerpo.data.notificationCount, 1);
});

test("un evento inexistente devuelve 404", async () => {
  const { status } = await pedir("/api/v1/absence-events/aev_inexistente", tokenDe(SERVER_USER));

  assert.equal(status, 404);
});

test("generar un evento para una ausencia inexistente devuelve 404", async () => {
  const { status, cuerpo } = await pedirJson("/api/v1/absence-events", tokenDe(SERVER_USER), {
    absenceId: "abs_inexistente"
  });

  assert.equal(status, 404);
  assert.equal(cuerpo.error.code, "not_found");
});

test("un evento para una ausencia no activa devuelve 409", async () => {
  const anulada = await pedirJson("/api/v1/absences", tokenDe(SERVER_USER), {
    teacherId: PROFESOR.id,
    scheduleAssignmentId: ASIGNACION.id,
    date: "2026-10-28",
    type: "justificada",
    status: "anulada"
  });

  const { status, cuerpo } = await pedirJson("/api/v1/absence-events", tokenDe(SERVER_USER), {
    absenceId: anulada.cuerpo.data.id
  });

  assert.equal(status, 409);
  assert.equal(cuerpo.error.code, "conflict");
});

test("el listado de eventos filtra por curso", async () => {
  const { status, cuerpo } = await pedir(
    `/api/v1/absence-events?courseId=${CURSO}`,
    tokenDe(PRECEPTOR)
  );

  assert.equal(status, 200);
  assert.ok(cuerpo.data.length >= 1);
  assert.ok(cuerpo.data.every((e) => e.courseId === CURSO));
});

test("el listado de eventos no expone eventos de otras escuelas", async () => {
  const { cuerpo } = await pedir("/api/v1/absence-events", tokenDe(SERVER_USER));
  const ausencias = cuerpo.data.map((e) => e.absenceId);
  assert.ok(ausencias.includes(ausenciaJustificadaId));

  const { cuerpo: listaDocente } = await pedir("/api/v1/absence-events", tokenDe(DOCENTE));
  assert.ok(listaDocente.data.every((e) => e.schoolId === "esc-1"));
});