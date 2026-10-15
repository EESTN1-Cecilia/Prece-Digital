import assert from "node:assert/strict";
import test, { after, before } from "node:test";
import { createApp } from "../src/app.mjs";
import { apiRoutes } from "../routes/index.mjs";
import { userRepository } from "../database/repositories/user.repository.mjs";
import { signAccessToken } from "../modules/auth/token.service.mjs";
import teachersRepository from "../modules/teachers/teachers.repository.mjs";

const PUERTO = 4002;
const base = `http://127.0.0.1:${PUERTO}`;
let servidor;

const SERVER_USER = userRepository.create({
  id: "usr_cp_server",
  email: "server@control.test",
  passwordHash: "hash",
  displayName: "Server Control",
  assignments: [{ role: "server", schoolId: "esc-cp-1" }]
});

const JEFE = userRepository.create({
  id: "usr_cp_jefe",
  email: "jefe@control.test",
  passwordHash: "hash",
  displayName: "Jefe Control",
  assignments: [{ role: "jefe_area", schoolId: "esc-cp-1" }]
});

const SECRETARIO = userRepository.create({
  id: "usr_cp_secretario",
  email: "secretario@control.test",
  passwordHash: "hash",
  displayName: "Secretario Control",
  assignments: [{ role: "secretario", schoolId: "esc-cp-1" }]
});

const DOCENTE = userRepository.create({
  id: "usr_cp_docente",
  email: "docente@control.test",
  passwordHash: "hash",
  displayName: "Docente Control",
  assignments: [{ role: "docente", schoolId: "esc-cp-1" }]
});

const PROFESOR_A = teachersRepository.create({
  id: "tch_cp_ana",
  userId: DOCENTE.id,
  firstName: "Ana",
  lastName: "Diaz",
  documentNumber: "50111000",
  documentType: "dni",
  email: "ana.diaz@control.test",
  schoolId: "esc-cp-1"
});

const PROFESOR_B = teachersRepository.create({
  id: "tch_cp_bruno",
  userId: null,
  firstName: "Bruno",
  lastName: "Lopez",
  documentNumber: "50111001",
  documentType: "dni",
  email: "bruno.lopez@control.test",
  schoolId: "esc-cp-1"
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
let contenidoNumerosId;
let contenidoGeometriaId;
let contenidoProbabilidadId;
let contenidoFraccionesId;
let contenidoHistoriaId;
let planId;
let planSinDisenoId;
let planBrunoId;
let controlId;
let segundoControlId;
let controlBrunoId;

function contenidosTotales() {
  return [
    { name: "Numeros naturales", plannedContentName: "Numeros naturales", curriculumContentId: contenidoNumerosId, evaluated: true },
    { name: "Geometria", plannedContentName: "Geometria", curriculumContentId: contenidoGeometriaId, evaluated: true },
    { name: "Probabilidad", plannedContentName: "Probabilidad", curriculumContentId: contenidoProbabilidadId, evaluated: true }
  ];
}

test("el seed arma el contexto curricular y las planificaciones", async () => {
  const server = tokenDe(SERVER_USER);

  const materia = await pedirJson("/api/v1/curriculum/materias", server, {
    name: "Matematica",
    code: "MAT-CP"
  });
  assert.equal(materia.status, 201);
  materiaId = materia.cuerpo.data.id;

  const diseno = await pedirJson("/api/v1/curriculum/disenos", server, {
    subjectId: materiaId,
    year: 2026,
    courseId: "1A",
    name: "Diseno 1A"
  });
  assert.equal(diseno.status, 201);
  const diseno1A = diseno.cuerpo.data.id;

  const diseno2B = (
    await pedirJson("/api/v1/curriculum/disenos", server, {
      subjectId: materiaId,
      year: 2026,
      courseId: "2B",
      name: "Diseno 2B"
    })
  ).cuerpo.data.id;

  const crearContenido = async (designId, name) => {
    const respuesta = await pedirJson("/api/v1/curriculum/contenidos", server, { designId, name });
    assert.equal(respuesta.status, 201);
    return respuesta.cuerpo.data.id;
  };

  contenidoNumerosId = await crearContenido(diseno1A, "Números naturales");
  contenidoGeometriaId = await crearContenido(diseno1A, "Geometría");
  contenidoProbabilidadId = await crearContenido(diseno1A, "Probabilidad");
  contenidoFraccionesId = await crearContenido(diseno1A, "Fracciones");
  contenidoHistoriaId = await crearContenido(diseno2B, "Historia Antigua");

  teachersRepository.addSubject(PROFESOR_A.id, {
    subjectId: materiaId,
    courseId: "1A",
    divisionId: "DIV-A",
    schoolId: "esc-cp-1"
  });
  teachersRepository.addSubject(PROFESOR_B.id, {
    subjectId: materiaId,
    courseId: "2B",
    divisionId: "DIV-B",
    schoolId: "esc-cp-1"
  });

  const planA = await pedirJson("/api/v1/teacher-plans", server, {
    title: "Planificacion 1A",
    teacherId: PROFESOR_A.id,
    subjectId: materiaId,
    courseId: "1A",
    divisionId: "DIV-A",
    year: 2026,
    period: "primer_trimestre",
    contents: [
      { name: "Numeros naturales", estimatedHours: 8 },
      { name: "Geometria", estimatedHours: 6 },
      { name: "Probabilidad", estimatedHours: 4 }
    ]
  });
  assert.equal(planA.status, 201);
  planId = planA.cuerpo.data.id;

  const plan2027 = await pedirJson("/api/v1/teacher-plans", server, {
    title: "Planificacion 1A 2027",
    teacherId: PROFESOR_A.id,
    subjectId: materiaId,
    courseId: "1A",
    divisionId: "DIV-A",
    year: 2027,
    contents: [{ name: "Numeros naturales" }]
  });
  assert.equal(plan2027.status, 201);
  planSinDisenoId = plan2027.cuerpo.data.id;

  const planBruno = await pedirJson("/api/v1/teacher-plans", server, {
    title: "Planificacion 2B",
    teacherId: PROFESOR_B.id,
    subjectId: materiaId,
    courseId: "2B",
    divisionId: "DIV-B",
    year: 2026,
    contents: [{ name: "Historia Antigua" }]
  });
  assert.equal(planBruno.status, 201);
  planBrunoId = planBruno.cuerpo.data.id;
});

test("las operaciones sin autenticación devuelven 401", async () => {
  const crear = await pedirJson("/api/v1/planning-controls", null, { planningId: planId, contents: [] });
  assert.equal(crear.status, 401);

  const listar = await pedir("/api/v1/planning-controls", null);
  assert.equal(listar.status, 401);

  const detalle = await pedir(`/api/v1/planning-controls/${planId}`, null);
  assert.equal(detalle.status, 401);
});

test("solo usuarios con planning.review registran y modifican controles", async () => {
  const secretario = await pedirJson("/api/v1/planning-controls", tokenDe(SECRETARIO), {
    planningId: planId,
    contents: [{ name: "Numeros naturales" }]
  });
  assert.equal(secretario.status, 403);

  const docente = await pedirJson("/api/v1/planning-controls", tokenDe(DOCENTE), {
    planningId: planId,
    contents: [{ name: "Numeros naturales" }]
  });
  assert.equal(docente.status, 403);

  const patchDocente = await pedirJson("/api/v1/planning-controls/ctl_nope", tokenDe(DOCENTE), {}, "PATCH");
  assert.equal(patchDocente.status, 403);
});

test("un secretario puede consultar controles", async () => {
  const { status, cuerpo } = await pedir("/api/v1/planning-controls", tokenDe(SECRETARIO));
  assert.equal(status, 200);
  assert.deepEqual(cuerpo.data, []);
  assert.equal(cuerpo.paginacion.total, 0);
});

test("no se puede revisar una planificación inexistente", async () => {
  const { status, cuerpo } = await pedirJson("/api/v1/planning-controls", tokenDe(JEFE), {
    planningId: "tpl_inexistente",
    contents: [{ name: "Numeros naturales" }]
  });
  assert.equal(status, 404);
  assert.equal(cuerpo.error.code, "not_found");
});

test("exige los campos obligatorios", async () => {
  const jefe = tokenDe(JEFE);

  const sinPlanificacion = await pedirJson("/api/v1/planning-controls", jefe, {
    contents: [{ name: "Numeros naturales" }]
  });
  assert.equal(sinPlanificacion.status, 400);
  assert.match(sinPlanificacion.cuerpo.error.message, /planningId/);

  const sinContenidos = await pedirJson("/api/v1/planning-controls", jefe, { planningId: planId });
  assert.equal(sinContenidos.status, 400);
  assert.match(sinContenidos.cuerpo.error.message, /contents/);
});

test("valida la forma de los contenidos revisados", async () => {
  const jefe = tokenDe(JEFE);

  const vacios = await pedirJson("/api/v1/planning-controls", jefe, { planningId: planId, contents: [] });
  assert.equal(vacios.status, 422);
  assert.match(vacios.cuerpo.error.message, /lista no vacía/);

  const noLista = await pedirJson("/api/v1/planning-controls", jefe, {
    planningId: planId,
    contents: "todos"
  });
  assert.equal(noLista.status, 422);

  const sinNombre = await pedirJson("/api/v1/planning-controls", jefe, {
    planningId: planId,
    contents: [{ description: "sin nombre" }]
  });
  assert.equal(sinNombre.status, 422);
  assert.match(sinNombre.cuerpo.error.message, /contenido 1: name/);
});

test("valida estado de creación, correspondencia y fecha", async () => {
  const jefe = tokenDe(JEFE);

  const estadoInvalido = await pedirJson("/api/v1/planning-controls", jefe, {
    planningId: planId,
    contents: [{ name: "Numeros naturales" }],
    status: "aprobada"
  });
  assert.equal(estadoInvalido.status, 422);
  assert.match(estadoInvalido.cuerpo.error.message, /pendiente o en_revision/);

  const correspondenciaInvalida = await pedirJson("/api/v1/planning-controls", jefe, {
    planningId: planId,
    contents: [{ name: "Numeros naturales" }],
    curriculumMatch: "casi"
  });
  assert.equal(correspondenciaInvalida.status, 422);
  assert.match(correspondenciaInvalida.cuerpo.error.message, /Correspondencia inválida/);

  const fechaInvalida = await pedirJson("/api/v1/planning-controls", jefe, {
    planningId: planId,
    contents: [{ name: "Numeros naturales" }],
    reviewDate: "10-04-2026"
  });
  assert.equal(fechaInvalida.status, 422);
  assert.match(fechaInvalida.cuerpo.error.message, /YYYY-MM-DD/);

  const fechaFutura = await pedirJson("/api/v1/planning-controls", jefe, {
    planningId: planId,
    contents: [{ name: "Numeros naturales" }],
    reviewDate: "2999-01-01"
  });
  assert.equal(fechaFutura.status, 422);
  assert.match(fechaFutura.cuerpo.error.message, /futura/);
});

test("exige un diseño curricular vigente para el contexto de la planificación", async () => {
  const { status, cuerpo } = await pedirJson("/api/v1/planning-controls", tokenDe(JEFE), {
    planningId: planSinDisenoId,
    contents: [{ name: "Numeros naturales" }]
  });
  assert.equal(status, 422);
  assert.match(cuerpo.error.message, /diseño curricular vigente/);
});

test("los contenidos revisados deben asociarse a la planificación y a su diseño", async () => {
  const jefe = tokenDe(JEFE);

  const planificadoDesconocido = await pedirJson("/api/v1/planning-controls", jefe, {
    planningId: planId,
    contents: [{ name: "Numeros naturales", plannedContentName: "Ajedrez" }]
  });
  assert.equal(planificadoDesconocido.status, 422);
  assert.match(planificadoDesconocido.cuerpo.error.message, /no corresponde a un contenido de la planificación/);

  const curricularAjeno = await pedirJson("/api/v1/planning-controls", jefe, {
    planningId: planId,
    contents: [{ name: "Historia Antigua", curriculumContentId: contenidoHistoriaId }]
  });
  assert.equal(curricularAjeno.status, 422);
  assert.match(curricularAjeno.cuerpo.error.message, /no pertenece al diseño curricular vigente/);

  const nombreDistinto = await pedirJson("/api/v1/planning-controls", jefe, {
    planningId: planId,
    contents: [{ name: "Numeros naturales", curriculumContentId: contenidoFraccionesId }]
  });
  assert.equal(nombreDistinto.status, 422);
  assert.match(nombreDistinto.cuerpo.error.message, /no corresponde al nombre revisado/);
});

test("las reglas de correspondencia exigen evaluación y observaciones", async () => {
  const jefe = tokenDe(JEFE);

  const totalSinVinculos = await pedirJson("/api/v1/planning-controls", jefe, {
    planningId: planId,
    contents: contenidosTotales().map((item) => ({ ...item, curriculumContentId: undefined })),
    curriculumMatch: "total"
  });
  assert.equal(totalSinVinculos.status, 422);
  assert.match(totalSinVinculos.cuerpo.error.message, /coincidencia total/);

  const parcialSinObservaciones = await pedirJson("/api/v1/planning-controls", jefe, {
    planningId: planId,
    contents: [{ name: "Numeros naturales", plannedContentName: "Numeros naturales", curriculumContentId: contenidoNumerosId, evaluated: true }],
    curriculumMatch: "parcial"
  });
  assert.equal(parcialSinObservaciones.status, 422);
  assert.match(parcialSinObservaciones.cuerpo.error.message, /observaciones/);

  const sinCoincidenciaSinObservaciones = await pedirJson("/api/v1/planning-controls", jefe, {
    planningId: planId,
    contents: [{ name: "Numeros naturales", evaluated: false }],
    curriculumMatch: "no_coincide"
  });
  assert.equal(sinCoincidenciaSinObservaciones.status, 422);

  const parcialSinEvaluados = await pedirJson("/api/v1/planning-controls", jefe, {
    planningId: planId,
    contents: [{ name: "Numeros naturales", plannedContentName: "Numeros naturales" }],
    curriculumMatch: "parcial",
    observations: "Revisar"
  });
  assert.equal(parcialSinEvaluados.status, 422);
  assert.match(parcialSinEvaluados.cuerpo.error.message, /al menos un contenido evaluado/);
});

test("registra un control de revisión válido", async () => {
  const { status, cuerpo } = await pedirJson("/api/v1/planning-controls", tokenDe(JEFE), {
    planningId: planId,
    contents: [
      {
        name: "Numeros naturales",
        description: "Unidades y decenas",
        plannedContentName: "Numeros naturales",
        curriculumContentId: contenidoNumerosId,
        evaluated: true
      },
      { name: "Geometria", plannedContentName: "Geometria", evaluated: false }
    ],
    curriculumMatch: "parcial",
    observations: "Revisar la carga horaria de probabilidad",
    status: "en_revision",
    reviewDate: "2026-04-10",
    reviewedBy: "usr_cp_docente",
    teacherId: "otro_docente"
  });
  assert.equal(status, 201);
  controlId = cuerpo.data.id;
  assert.match(controlId, /^ctl_/);
  assert.equal(cuerpo.data.planningId, planId);
  assert.equal(cuerpo.data.teacherId, PROFESOR_A.id);
  assert.equal(cuerpo.data.subjectId, materiaId);
  assert.equal(cuerpo.data.courseId, "1A");
  assert.equal(cuerpo.data.divisionId, "DIV-A");
  assert.equal(cuerpo.data.year, 2026);
  assert.equal(cuerpo.data.period, "primer_trimestre");
  assert.equal(cuerpo.data.curriculumMatch, "parcial");
  assert.equal(cuerpo.data.status, "en_revision");
  assert.equal(cuerpo.data.reviewDate, "2026-04-10");
  assert.equal(cuerpo.data.reviewedBy, JEFE.id);
  assert.equal(cuerpo.data.createdBy, JEFE.id);
  assert.equal(cuerpo.data.contents.length, 2);
  assert.equal(cuerpo.data.contents[0].evaluated, true);
  assert.equal(cuerpo.data.contents[1].evaluated, false);
  assert.equal(cuerpo.data.designIds.length, 1);
  assert.equal(cuerpo.data.historyCount, 1);
  assert.equal(cuerpo.data.planningTitle, "Planificacion 1A");
  assert.equal(cuerpo.data.planningStatus, "borrador");
  assert.equal(cuerpo.data.teacher.firstName, "Ana");
  assert.equal(cuerpo.data.subjectName, "Matematica");
  assert.deepEqual(cuerpo.data.allowedTransitions, [
    "aprobada",
    "aprobada_con_observaciones",
    "requiere_correccion"
  ]);
  assert.equal(cuerpo.data.isEditable, true);
});

test("no permite dos controles abiertos sobre la misma planificación", async () => {
  const { status, cuerpo } = await pedirJson("/api/v1/planning-controls", tokenDe(JEFE), {
    planningId: planId,
    contents: [{ name: "Numeros naturales" }]
  });
  assert.equal(status, 409);
  assert.match(cuerpo.error.message, /en curso/);
});

test("consulta un control por id, por planificación y su historial", async () => {
  const jefe = tokenDe(JEFE);

  const porId = await pedir(`/api/v1/planning-controls/${controlId}`, jefe);
  assert.equal(porId.status, 200);
  assert.equal(porId.cuerpo.data.id, controlId);
  assert.equal(porId.cuerpo.data.subjectCode, "MAT-CP");

  const inexistente = await pedir("/api/v1/planning-controls/ctl_nope", jefe);
  assert.equal(inexistente.status, 404);

  const porPlanificacion = await pedir(`/api/v1/planning-controls/planning/${planId}`, jefe);
  assert.equal(porPlanificacion.status, 200);
  assert.equal(porPlanificacion.cuerpo.data.id, controlId);

  const planSinControles = await pedir(`/api/v1/planning-controls/planning/${planBrunoId}`, jefe);
  assert.equal(planSinControles.status, 404);
  assert.match(planSinControles.cuerpo.error.message, /no tiene controles/);

  const planInexistente = await pedir("/api/v1/planning-controls/planning/tpl_nope", jefe);
  assert.equal(planInexistente.status, 404);

  const historial = await pedir(`/api/v1/planning-controls/planning/${planId}/history`, jefe);
  assert.equal(historial.status, 200);
  assert.equal(historial.cuerpo.data.planningId, planId);
  assert.equal(historial.cuerpo.data.total, 1);
  assert.equal(historial.cuerpo.data.entries[0].id, controlId);
  assert.equal(historial.cuerpo.data.planningStatus, "borrador");
});

test("actualiza la información del control y lo audita", async () => {
  const jefe = tokenDe(JEFE);

  const sinCambios = await pedirJson(`/api/v1/planning-controls/${controlId}`, jefe, {}, "PATCH");
  assert.equal(sinCambios.status, 200);
  assert.equal(sinCambios.cuerpo.data.historyCount, 1);

  const actualizado = await pedirJson(
    `/api/v1/planning-controls/${controlId}`,
    jefe,
    {
      contents: [
        {
          name: "Numeros naturales",
          plannedContentName: "Numeros naturales",
          curriculumContentId: contenidoNumerosId,
          evaluated: true
        },
        { name: "Geometria", plannedContentName: "Geometria", curriculumContentId: contenidoGeometriaId, evaluated: true },
        { name: "Probabilidad", plannedContentName: "Probabilidad", evaluated: false }
      ],
      observations: "Se ajusto la evaluacion de probabilidad"
    },
    "PATCH"
  );
  assert.equal(actualizado.status, 200);
  assert.equal(actualizado.cuerpo.data.contents.length, 3);
  assert.equal(actualizado.cuerpo.data.contents[1].curriculumContentId, contenidoGeometriaId);
  assert.equal(actualizado.cuerpo.data.updatedBy, JEFE.id);
  assert.equal(actualizado.cuerpo.data.historyCount, 2);

  const auditoria = await pedir(`/api/v1/planning-controls/${controlId}/history`, jefe);
  assert.equal(auditoria.status, 200);
  assert.equal(auditoria.cuerpo.data.total, 2);
  assert.equal(auditoria.cuerpo.data.entries[0].type, "actualizacion");
  const campos = auditoria.cuerpo.data.entries[0].changes.map((change) => change.field).sort();
  assert.deepEqual(campos, ["contents", "observations"]);
  assert.equal(auditoria.cuerpo.data.entries[0].performedBy, JEFE.id);
  assert.equal(auditoria.cuerpo.data.entries[1].type, "creacion");
});

test("el PATCH de control no cambia estado ni reasigna la planificación", async () => {
  const jefe = tokenDe(JEFE);

  const conEstado = await pedirJson(
    `/api/v1/planning-controls/${controlId}`,
    jefe,
    { status: "aprobada" },
    "PATCH"
  );
  assert.equal(conEstado.status, 422);
  assert.match(conEstado.cuerpo.error.message, /\/status/);

  const reasignado = await pedirJson(
    `/api/v1/planning-controls/${controlId}`,
    jefe,
    { planningId: planBrunoId },
    "PATCH"
  );
  assert.equal(reasignado.status, 422);

  const contenidoInvalido = await pedirJson(
    `/api/v1/planning-controls/${controlId}`,
    jefe,
    { contents: [{ name: "Numeros naturales", plannedContentName: "Ajedrez" }] },
    "PATCH"
  );
  assert.equal(contenidoInvalido.status, 422);

  const fechaFutura = await pedirJson(
    `/api/v1/planning-controls/${controlId}`,
    jefe,
    { reviewDate: "2999-01-01" },
    "PATCH"
  );
  assert.equal(fechaFutura.status, 422);
});

test("valida estado destino y transición en PATCH /status", async () => {
  const jefe = tokenDe(JEFE);

  const estadoInvalido = await pedirJson(
    `/api/v1/planning-controls/${controlId}/status`,
    jefe,
    { status: "inventado" },
    "PATCH"
  );
  assert.equal(estadoInvalido.status, 422);

  const requerido = await pedirJson(`/api/v1/planning-controls/${controlId}/status`, jefe, {}, "PATCH");
  assert.equal(requerido.status, 400);

  const mismoEstado = await pedirJson(
    `/api/v1/planning-controls/${controlId}/status`,
    jefe,
    { status: "en_revision" },
    "PATCH"
  );
  assert.equal(mismoEstado.status, 409);

  const transicionInvalida = await pedirJson(
    `/api/v1/planning-controls/${controlId}/status`,
    jefe,
    { status: "finalizada" },
    "PATCH"
  );
  assert.equal(transicionInvalida.status, 422);
  assert.match(transicionInvalida.cuerpo.error.message, /Transición no permitida/);
});

test("requiere correccion exige observaciones y deja rastro", async () => {
  const jefe = tokenDe(JEFE);

  const sinCorrespondencia = await pedirJson(
    `/api/v1/planning-controls/${controlId}`,
    jefe,
    { curriculumMatch: "no_evaluado", observations: null },
    "PATCH"
  );
  assert.equal(sinCorrespondencia.status, 200);
  assert.equal(sinCorrespondencia.cuerpo.data.observations, null);
  assert.equal(sinCorrespondencia.cuerpo.data.historyCount, 3);

  const sinObservaciones = await pedirJson(
    `/api/v1/planning-controls/${controlId}/status`,
    jefe,
    { status: "requiere_correccion" },
    "PATCH"
  );
  assert.equal(sinObservaciones.status, 422);
  assert.match(sinObservaciones.cuerpo.error.message, /observaciones/);

  const conObservaciones = await pedirJson(
    `/api/v1/planning-controls/${controlId}/status`,
    jefe,
    {
      status: "requiere_correccion",
      observations: "Ajustar la carga horaria de probabilidad a 6 horas",
      comment: "Devuelto al docente"
    },
    "PATCH"
  );
  assert.equal(conObservaciones.status, 200);
  assert.equal(conObservaciones.cuerpo.data.status, "requiere_correccion");
  assert.equal(conObservaciones.cuerpo.data.reviewedBy, JEFE.id);
  assert.match(conObservaciones.cuerpo.data.observations, /6 horas/);
  assert.equal(conObservaciones.cuerpo.data.reviewDate, "2026-04-10");

  const auditoria = await pedir(`/api/v1/planning-controls/${controlId}/history`, jefe);
  const entrada = auditoria.cuerpo.data.entries[0];
  assert.equal(entrada.type, "cambio_estado");
  assert.equal(entrada.fromStatus, "en_revision");
  assert.equal(entrada.toStatus, "requiere_correccion");
  assert.equal(entrada.comment, "Devuelto al docente");
  assert.equal(entrada.changes[0].field, "observations");
});

test("recorre el ciclo completo de estados hasta finalizada", async () => {
  const jefe = tokenDe(JEFE);

  const aRevision = await pedirJson(
    `/api/v1/planning-controls/${controlId}/status`,
    jefe,
    { status: "en_revision" },
    "PATCH"
  );
  assert.equal(aRevision.status, 200);

  const aprobadaConObservaciones = await pedirJson(
    `/api/v1/planning-controls/${controlId}/status`,
    jefe,
    { status: "aprobada_con_observaciones" },
    "PATCH"
  );
  assert.equal(aprobadaConObservaciones.status, 200);

  const finalizada = await pedirJson(
    `/api/v1/planning-controls/${controlId}/status`,
    jefe,
    { status: "finalizada", comment: "Control cerrado" },
    "PATCH"
  );
  assert.equal(finalizada.status, 200);
  assert.equal(finalizada.cuerpo.data.status, "finalizada");
  assert.deepEqual(finalizada.cuerpo.data.allowedTransitions, []);
  assert.equal(finalizada.cuerpo.data.isEditable, false);

  const trasFinalizar = await pedirJson(
    `/api/v1/planning-controls/${controlId}/status`,
    jefe,
    { status: "en_revision" },
    "PATCH"
  );
  assert.equal(trasFinalizar.status, 422);

  const edicionTrasFinalizar = await pedirJson(
    `/api/v1/planning-controls/${controlId}`,
    jefe,
    { observations: "no editable" },
    "PATCH"
  );
  assert.equal(edicionTrasFinalizar.status, 409);
});

test("el estado del control no altera el estado de la planificación", async () => {
  const server = tokenDe(SERVER_USER);
  const { status, cuerpo } = await pedir(`/api/v1/teacher-plans/${planId}`, server);
  assert.equal(status, 200);
  assert.equal(cuerpo.data.status, "borrador");
});

test("el historial de la planificación conserva todas las revisiones", async () => {
  const jefe = tokenDe(JEFE);

  const auditoria = await pedir(`/api/v1/planning-controls/${controlId}/history`, jefe);
  assert.equal(auditoria.cuerpo.data.total, 7);
  const tipos = auditoria.cuerpo.data.entries.map((entry) => entry.type);
  assert.equal(tipos[0], "cambio_estado");
  assert.equal(tipos[tipos.length - 1], "creacion");
  assert.equal(tipos.filter((tipo) => tipo === "cambio_estado").length, 4);
  assert.equal(tipos.filter((tipo) => tipo === "actualizacion").length, 2);

  const auditoriaInexistente = await pedir("/api/v1/planning-controls/ctl_nope/history", jefe);
  assert.equal(auditoriaInexistente.status, 404);
});

test("una planificación puede recibir más de una revisión", async () => {
  const { status, cuerpo } = await pedirJson("/api/v1/planning-controls", tokenDe(JEFE), {
    planningId: planId,
    contents: [{ name: "Numeros naturales", plannedContentName: "Numeros naturales", evaluated: false }],
    curriculumMatch: "no_evaluado"
  });
  assert.equal(status, 201);
  segundoControlId = cuerpo.data.id;
  assert.equal(cuerpo.data.status, "pendiente");

  const historial = await pedir(`/api/v1/planning-controls/planning/${planId}/history`, tokenDe(JEFE));
  assert.equal(historial.cuerpo.data.total, 2);
  assert.equal(historial.cuerpo.data.entries[0].id, segundoControlId);

  const controlActual = await pedir(`/api/v1/planning-controls/planning/${planId}`, tokenDe(JEFE));
  assert.equal(controlActual.cuerpo.data.id, segundoControlId);
});

test("registra la coincidencia total cuando todo contenido está vinculado", async () => {
  const { status, cuerpo } = await pedirJson("/api/v1/planning-controls", tokenDe(SERVER_USER), {
    planningId: planBrunoId,
    contents: [{ name: "Historia Antigua", curriculumContentId: contenidoHistoriaId, evaluated: true }],
    curriculumMatch: "total"
  });
  assert.equal(status, 201);
  controlBrunoId = cuerpo.data.id;
  assert.equal(cuerpo.data.curriculumMatch, "total");
  assert.equal(cuerpo.data.reviewedBy, SERVER_USER.id);
  assert.equal(cuerpo.data.teacherId, PROFESOR_B.id);
  assert.equal(cuerpo.data.courseId, "2B");
});

test("filtra por docente, materia, curso, período, estado y pendientes", async () => {
  const jefe = tokenDe(JEFE);

  const porDocente = await pedir(`/api/v1/planning-controls/by-teacher/${PROFESOR_A.id}`, jefe);
  assert.equal(porDocente.status, 200);
  assert.equal(porDocente.cuerpo.paginacion.total, 2);

  const docenteInexistente = await pedir("/api/v1/planning-controls/by-teacher/tch_nope", jefe);
  assert.equal(docenteInexistente.status, 404);

  const porMateria = await pedir(`/api/v1/planning-controls/by-subject/${materiaId}`, jefe);
  assert.equal(porMateria.status, 200);
  assert.equal(porMateria.cuerpo.paginacion.total, 3);

  const materiaInexistente = await pedir("/api/v1/planning-controls/by-subject/mat_nope", jefe);
  assert.equal(materiaInexistente.status, 404);

  const porCurso = await pedir("/api/v1/planning-controls/by-course/2B", jefe);
  assert.equal(porCurso.status, 200);
  assert.equal(porCurso.cuerpo.data[0].id, controlBrunoId);

  const porPeriodo = await pedir("/api/v1/planning-controls/by-period/2026?period=primer_trimestre", jefe);
  assert.equal(porPeriodo.status, 200);
  assert.equal(porPeriodo.cuerpo.paginacion.total, 2);

  const periodoInvalido = await pedir("/api/v1/planning-controls/by-period/1999", jefe);
  assert.equal(periodoInvalido.status, 422);

  const porEstado = await pedir("/api/v1/planning-controls/by-status/finalizada", jefe);
  assert.equal(porEstado.status, 200);
  assert.equal(porEstado.cuerpo.paginacion.total, 1);
  assert.equal(porEstado.cuerpo.data[0].id, controlId);

  const estadoInvalido = await pedir("/api/v1/planning-controls/by-status/volado", jefe);
  assert.equal(estadoInvalido.status, 422);

  const pendientes = await pedir("/api/v1/planning-controls/pending", jefe);
  assert.equal(pendientes.status, 200);
  assert.equal(pendientes.cuerpo.paginacion.total, 2);
  assert.deepEqual(
    pendientes.cuerpo.data.map((control) => control.status).sort(),
    ["pendiente", "pendiente"]
  );
  assert.equal(pendientes.cuerpo.filtros.pendiente, true);
});

test("combina filtros y pagina resultados", async () => {
  const jefe = tokenDe(JEFE);

  const combinado = await pedir(
    `/api/v1/planning-controls?teacherId=${PROFESOR_A.id}&status=finalizada&curriculumMatch=no_evaluado`,
    jefe
  );
  assert.equal(combinado.status, 200);
  assert.equal(combinado.cuerpo.paginacion.total, 1);
  assert.equal(combinado.cuerpo.data[0].id, controlId);
  assert.equal(combinado.cuerpo.filtros.curriculumMatch, "no_evaluado");

  const porDivision = await pedir("/api/v1/planning-controls?divisionId=DIV-B", jefe);
  assert.equal(porDivision.cuerpo.paginacion.total, 1);

  const paginado = await pedir("/api/v1/planning-controls?porPagina=1&pagina=2&orden=year&direccion=asc", jefe);
  assert.equal(paginado.status, 200);
  assert.equal(paginado.cuerpo.paginacion.total, 3);
  assert.equal(paginado.cuerpo.paginacion.totalPaginas, 3);
  assert.equal(paginado.cuerpo.data.length, 1);
  assert.equal(paginado.cuerpo.filtros.orden, "year");
});

test("los filtros inválidos se rechazan", async () => {
  const jefe = tokenDe(JEFE);

  const planificacionInexistente = await pedir("/api/v1/planning-controls?planningId=tpl_nope", jefe);
  assert.equal(planificacionInexistente.status, 404);

  const estadoInvalido = await pedir("/api/v1/planning-controls?status=volado", jefe);
  assert.equal(estadoInvalido.status, 422);

  const correspondenciaInvalida = await pedir("/api/v1/planning-controls?curriculumMatch=casi", jefe);
  assert.equal(correspondenciaInvalida.status, 422);

  const anioInvalido = await pedir("/api/v1/planning-controls?year=1990", jefe);
  assert.equal(anioInvalido.status, 422);

  const periodoInvalido = await pedir("/api/v1/planning-controls?period=tercer_bimestre", jefe);
  assert.equal(periodoInvalido.status, 422);

  const ordenInvalido = await pedir("/api/v1/planning-controls?orden=astrologia", jefe);
  assert.equal(ordenInvalido.status, 422);

  const direccionInvalida = await pedir("/api/v1/planning-controls?direccion=oblicua", jefe);
  assert.equal(direccionInvalida.status, 422);

  const paginaInvalida = await pedir("/api/v1/planning-controls?porPagina=1000", jefe);
  assert.equal(paginaInvalida.status, 422);
});

test("otra escuela no accede a la revisión ni a su historial", async () => {
  const outsider = userRepository.create({
    id: "usr_cp_otro",
    email: "otro@control.test",
    passwordHash: "hash",
    displayName: "Jefe Otra Escuela",
    assignments: [{ role: "jefe_area", schoolId: "esc-cp-2" }]
  });
  const token = tokenDe(outsider);

  const detalle = await pedir(`/api/v1/planning-controls/${controlId}`, token);
  assert.equal(detalle.status, 403);
  assert.equal(detalle.cuerpo.error.code, "forbidden");

  const auditoria = await pedir(`/api/v1/planning-controls/${controlId}/history`, token);
  assert.equal(auditoria.status, 403);

  const historial = await pedir(`/api/v1/planning-controls/planning/${planId}/history`, token);
  assert.equal(historial.status, 403);

  const creacion = await pedirJson("/api/v1/planning-controls", token, {
    planningId: planId,
    contents: [{ name: "Numeros naturales" }]
  });
  assert.equal(creacion.status, 403);

  const edicion = await pedirJson(`/api/v1/planning-controls/${controlId}`, token, {}, "PATCH");
  assert.equal(edicion.status, 403);

  const lista = await pedir("/api/v1/planning-controls", token);
  assert.equal(lista.status, 200);
  assert.equal(lista.cuerpo.paginacion.total, 0);
});

test("no se revisa una planificación cuyo docente dejó de estar activo", async () => {
  teachersRepository.update(PROFESOR_A.id, { isActive: false });

  const inactivo = await pedirJson("/api/v1/planning-controls", tokenDe(JEFE), {
    planningId: planId,
    contents: [{ name: "Numeros naturales" }]
  });
  assert.equal(inactivo.status, 422);
  assert.match(inactivo.cuerpo.error.message, /no está activo/);

  teachersRepository.update(PROFESOR_A.id, { isActive: true });
});
