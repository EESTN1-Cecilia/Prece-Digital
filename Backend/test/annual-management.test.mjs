import assert from "node:assert/strict";
import test, { after, before } from "node:test";
import { createApp } from "../src/app.mjs";
import { apiRoutes } from "../routes/index.mjs";
import { seedAuthData } from "../database/seeds/auth.seed.mjs";
import { seedStudents } from "../database/seeds/students.seed.mjs";
import academicRecordsRepository from "../modules/academic-records/academic-records.repository.mjs";
import courseChangesRepository from "../modules/course-changes/course-changes.repository.mjs";
import gradesRepository from "../modules/grades/grades.repository.mjs";
import inasistenciasRepository from "../modules/inasistencias/inasistencias.repository.mjs";
import studentRepository from "../modules/students/students.repository.mjs";
import { buscarDivision } from "../modules/students/catalogo.mjs";

const PUERTO = 4027;
const base = `http://127.0.0.1:${PUERTO}`;

let servidor;
let director;
let secretaria;

async function login(email, password) {
  const respuesta = await fetch(`${base}/api/v1/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  assert.equal(respuesta.status, 200);
  return (await respuesta.json()).accessToken;
}

async function pedir(metodo, ruta, token, cuerpo) {
  const headers = token ? { authorization: `Bearer ${token}` } : {};
  if (cuerpo !== undefined) headers["content-type"] = "application/json";
  const respuesta = await fetch(`${base}${ruta}`, {
    method: metodo,
    headers,
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo)
  });
  return { status: respuesta.status, cuerpo: await respuesta.json() };
}

before(async () => {
  await seedAuthData();
  seedStudents();
  academicRecordsRepository.setSubjectsRef([{ id: "mat", nombre: "Matemática" }]);
  academicRecordsRepository.createSituacion({
    id: "annual-rs-1",
    escuelaId: "esc-1",
    alumnoId: "alu-1",
    materiaId: "mat",
    anio: 2026,
    tipo: "cursada",
    estado: "aprobada"
  });
  const alumno = studentRepository.findById("alu-1");
  inasistenciasRepository.create({
    id: "annual-ina-1",
    escuelaId: "esc-1",
    alumnoId: alumno.id,
    alumno: { id: alumno.id, apellido: alumno.apellido, nombre: alumno.nombre },
    curso: alumno.curso,
    division: alumno.division,
    fecha: "2026-03-05",
    anio: 2026,
    motivo: "salud",
    estadoJustificacion: "pendiente"
  });
  gradesRepository.createCalificacion({
    id: "annual-grade-1",
    escuelaId: "esc-1",
    alumnoId: alumno.id,
    materiaId: "mat",
    anio: 2026,
    tipoEvaluacion: "escrito",
    valor: "8",
    fecha: "2026-04-15"
  });
  servidor = createApp(apiRoutes);
  await new Promise((listo) => servidor.listen(PUERTO, listo));
  director = await login("director@prece.local", "Director123!");
  secretaria = await login("secretaria@prece.local", "Secretaria123!");
});

after(async () => {
  await new Promise((listo) => servidor.close(listo));
});

test("cierre anual: exige autenticación y permiso exclusivo de Dirección", async () => {
  const anonimo = await pedir("GET", "/api/v1/annual-management/history");
  assert.equal(anonimo.status, 401);

  const secretariaSinPermiso = await pedir("GET", "/api/v1/annual-management/history", secretaria);
  assert.equal(secretariaSinPermiso.status, 403);
});

test("la vista previa identifica datos académicos ausentes y exige una decisión por alumno", async () => {
  const respuesta = await pedir("GET", "/api/v1/annual-management/preview?anioActual=2026&anioNuevo=2027", director);
  assert.equal(respuesta.status, 200);
  assert.equal(respuesta.cuerpo.data.anioNuevo, 2027);
  assert.ok(respuesta.cuerpo.data.alumnos.some((alumno) => alumno.avisos.some((aviso) => aviso.includes("Sin situación académica"))));

  const incompleto = await pedir("POST", "/api/v1/annual-management/confirm", director, {
    previewId: respuesta.cuerpo.data.previewId,
    decisiones: []
  });
  assert.equal(incompleto.status, 422);
});

test("confirma el cierre una vez, conserva los registros y habilita informes con datos reales", async () => {
  const previewRespuesta = await pedir("GET", "/api/v1/annual-management/preview?anioActual=2026&anioNuevo=2027", director);
  const preview = previewRespuesta.cuerpo.data;
  const decisiones = preview.alumnos.map((alumno) => {
    if (alumno.curso === 7) return { alumnoId: alumno.alumnoId, decision: "egresado" };
    if (alumno.alumnoId === "alu-1") return { alumnoId: alumno.alumnoId, decision: "promovido", division: "1" };
    return { alumnoId: alumno.alumnoId, decision: "permanece", division: alumno.division };
  });

  const antes = studentRepository.findById("alu-1");
  const cierre = await pedir("POST", "/api/v1/annual-management/confirm", director, {
    previewId: preview.previewId,
    decisiones
  });
  assert.equal(cierre.status, 201);
  assert.equal(cierre.cuerpo.data.resultados.promovido, 1);
  assert.ok(cierre.cuerpo.data.responsableId);
  assert.equal(cierre.cuerpo.data.responsable, "Director Escuela 1");
  assert.ok(cierre.cuerpo.data.creadoEn);
  assert.equal(studentRepository.findById("alu-1").curso, antes.curso + 1);
  assert.equal(academicRecordsRepository.listSituaciones({ alumnoId: "alu-1", anio: 2026 }).length, 1);
  assert.equal(inasistenciasRepository.list({ alumnoId: "alu-1", anio: 2026 }).length, 1);
  assert.ok(courseChangesRepository.listMovimientos({ alumnoId: "alu-1", anio: 2026 }).some((movimiento) => movimiento.tipo === "promocion"));

  const duplicado = await pedir("POST", "/api/v1/annual-management/confirm", director, {
    previewId: preview.previewId,
    decisiones
  });
  assert.equal(duplicado.status, 409);

  const informe = await pedir("GET", "/api/v1/annual-management/report?anio=2026", director);
  assert.equal(informe.status, 200);
  assert.equal(informe.cuerpo.data.matricula.disponible, true);
  assert.equal(informe.cuerpo.data.asistencia.totalInasistencias, 1);
  assert.equal(informe.cuerpo.data.academico.totalSituaciones, 1);
  assert.equal(informe.cuerpo.data.academico.totalEvaluaciones, 1);
  assert.equal(informe.cuerpo.data.resultadosCierre.promovido, 1);

  const historial = await pedir("GET", "/api/v1/annual-management/history", director);
  assert.ok(historial.cuerpo.data.some((item) => item.id === cierre.cuerpo.data.id));
});

test("rechaza la confirmación si la matrícula cambia después de la revisión", async () => {
  const respuesta = await pedir("GET", "/api/v1/annual-management/preview?anioActual=2027&anioNuevo=2028", director);
  const preview = respuesta.cuerpo.data;
  const alumno = studentRepository.findById("alu-1");
  studentRepository.update(alumno.id, { nombre: `${alumno.nombre} actualizado` });
  const decisiones = preview.alumnos.map((item) => ({
    alumnoId: item.alumnoId,
    decision: item.curso === 7 ? "egresado" : "permanece",
    division: item.division
  }));
  const resultado = await pedir("POST", "/api/v1/annual-management/confirm", director, {
    previewId: preview.previewId,
    decisiones
  });
  assert.equal(resultado.status, 409);
});

test("rechaza años no consecutivos y divisiones que no existen", async () => {
  const aniosInvalidos = await pedir("GET", "/api/v1/annual-management/preview?anioActual=2026&anioNuevo=2028", director);
  assert.equal(aniosInvalidos.status, 422);

  const respuesta = await pedir("GET", "/api/v1/annual-management/preview?anioActual=2028&anioNuevo=2029", director);
  const preview = respuesta.cuerpo.data;
  const decisiones = preview.alumnos.map((alumno) => ({
    alumnoId: alumno.alumnoId,
    decision: alumno.curso === 7 ? "egresado" : "permanece",
    division: alumno.alumnoId === "alu-1" ? "99" : alumno.division
  }));
  const destinoInvalido = await pedir("POST", "/api/v1/annual-management/confirm", director, {
    previewId: preview.previewId,
    decisiones
  });
  assert.equal(destinoInvalido.status, 422);
  assert.equal(buscarDivision(2, "99"), null);
});

test("detecta documentos duplicados y no confirma matrículas inconsistentes", async () => {
  const original = studentRepository.findById("alu-1");
  studentRepository.create({
    id: "annual-duplicate",
    escuelaId: original.escuelaId,
    nombre: "Registro duplicado",
    apellido: "Prueba",
    dni: original.dni,
    curso: original.curso,
    division: original.division,
    turno: original.turno,
    orientacion: original.orientacion
  });

  const respuesta = await pedir("GET", "/api/v1/annual-management/preview?anioActual=2030&anioNuevo=2031", director);
  const preview = respuesta.cuerpo.data;
  assert.ok(preview.alumnos.find((item) => item.alumnoId === "annual-duplicate").avisos.some((aviso) => aviso.includes("DNI duplicado")));

  const decisiones = preview.alumnos.map((alumno) => ({
    alumnoId: alumno.alumnoId,
    decision: alumno.curso === 7 ? "egresado" : "permanece",
    division: alumno.division
  }));
  const cierre = await pedir("POST", "/api/v1/annual-management/confirm", director, {
    previewId: preview.previewId,
    decisiones
  });
  assert.equal(cierre.status, 422);
  assert.equal(studentRepository.findById("annual-duplicate").isActive, true);
});
