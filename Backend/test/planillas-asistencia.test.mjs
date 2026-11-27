import assert from "node:assert/strict";
import test, { after, before, beforeEach } from "node:test";
import { createApp } from "../src/app.mjs";
import { apiRoutes } from "../routes/index.mjs";
import { seedAuthData } from "../database/seeds/auth.seed.mjs";
import studentRepository from "../modules/students/students.repository.mjs";
import planillasRepository from "../modules/attendance/planillas.repository.mjs";
import { getStore } from "../database/memory-store.mjs";

const PUERTO = 4031;
const base = `http://127.0.0.1:${PUERTO}`;
const RUTA = "/api/v1/asistencias/planillas";
let servidor;
let director;
let preceptor;
let docente;

async function login(email, password) {
  const respuesta = await fetch(`${base}/api/v1/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  assert.equal(respuesta.status, 200, `login ${email}`);
  return (await respuesta.json()).accessToken;
}

async function pedir(metodo, ruta, token, cuerpo) {
  const cabeceras = { authorization: `Bearer ${token}` };
  if (cuerpo !== undefined) cabeceras["content-type"] = "application/json";
  const respuesta = await fetch(`${base}${ruta}`, { method: metodo, headers: cabeceras, body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo) });
  return { status: respuesta.status, cuerpo: await respuesta.json() };
}

const consulta = (extra = "") => `${RUTA}?curso=1-1&anio=2026&mes=4${extra}`;

before(async () => {
  await seedAuthData();
  for (const [id, curso, division] of [["alu-pl-1", 1, "1"], ["alu-pl-2", 1, "1"], ["alu-pl-otro", 4, "4"]]) {
    if (!studentRepository.findById(id)) {
      studentRepository.create({ id, escuelaId: "esc-1", apellido: "Prueba", nombre: id, dni: `3000000${id.length}${curso}`, dniProvisorio: false, curso, division, condicion: "regular", fechaAlta: "2026-03-01" });
    }
  }
  servidor = createApp(apiRoutes);
  await new Promise((listo) => servidor.listen(PUERTO, listo));
  director = await login("director@prece.local", "Director123!");
  preceptor = await login("preceptor@prece.local", "Preceptor123!");
  docente = await login("docente@prece.local", "Docente123!");
});

after(async () => {
  await new Promise((listo) => servidor.close(listo));
});

beforeEach(() => planillasRepository.vaciar());

test("una planilla nueva no existe y se guarda en el servidor con version 1", async () => {
  const vacia = await pedir("GET", consulta(), preceptor);
  assert.equal(vacia.status, 200);
  assert.equal(vacia.cuerpo.data, null);

  const guardada = await pedir("PUT", consulta(), preceptor, {
    version: 0,
    registros: { "alu-pl-1": { 1: "P", 2: "A", 3: "J" }, "alu-pl-2": { 1: "T" } },
    observacionesPorAlumno: { "alu-pl-1": "Llegó con certificado" }
  });
  assert.equal(guardada.status, 200, JSON.stringify(guardada.cuerpo));
  assert.equal(guardada.cuerpo.data.version, 1);
  assert.equal(guardada.cuerpo.data.registros["alu-pl-1"]["2"], "A");
  assert.ok(guardada.cuerpo.data.actualizadoPor);

  /* Queda en la coleccion que la persistencia guarda en SQL Server. */
  assert.ok(getStore().planillasAsistencia instanceof Map);
  assert.equal(getStore().planillasAsistencia.size, 1);

  /* Otro perfil (el director) ve exactamente lo mismo. */
  const leida = await pedir("GET", consulta(), director);
  assert.equal(leida.cuerpo.data.registros["alu-pl-2"]["1"], "T");
  assert.equal(leida.cuerpo.data.observacionesPorAlumno["alu-pl-1"], "Llegó con certificado");
});

test("si otra persona guardo antes, responde 409 y no pisa los datos", async () => {
  await pedir("PUT", consulta(), preceptor, { version: 0, registros: { "alu-pl-1": { 1: "A" } } });
  const segunda = await pedir("PUT", consulta(), director, { version: 0, registros: { "alu-pl-1": { 1: "P" } } });
  assert.equal(segunda.status, 409);
  const leida = await pedir("GET", consulta(), preceptor);
  assert.equal(leida.cuerpo.data.registros["alu-pl-1"]["1"], "A");

  const conVersion = await pedir("PUT", consulta(), director, { version: 1, registros: { "alu-pl-1": { 1: "P" } } });
  assert.equal(conVersion.status, 200);
  assert.equal(conVersion.cuerpo.data.version, 2);
});

test("rechaza alumnos de otro curso, dias fuera del mes y codigos invalidos", async () => {
  const otroCurso = await pedir("PUT", consulta(), preceptor, { version: 0, registros: { "alu-pl-otro": { 1: "A" } } });
  assert.equal(otroCurso.status, 422);
  const inexistente = await pedir("PUT", consulta(), preceptor, { version: 0, registros: { "no-existe": { 1: "A" } } });
  assert.equal(inexistente.status, 422);
  const diaMalo = await pedir("PUT", consulta(), preceptor, { version: 0, registros: { "alu-pl-1": { 31: "A" } } });
  assert.equal(diaMalo.status, 422, "abril tiene 30 dias");
  const codigoMalo = await pedir("PUT", consulta(), preceptor, { version: 0, registros: { "alu-pl-1": { 1: "X" } } });
  assert.equal(codigoMalo.status, 422);
  const sinRegistros = await pedir("PUT", consulta(), preceptor, { version: 0 });
  assert.equal(sinRegistros.status, 422);
  const parametros = await pedir("GET", `${RUTA}?curso=9-1&anio=2026&mes=13`, preceptor);
  assert.equal(parametros.status, 422);
  assert.equal(planillasRepository.listar().length, 0, "nada invalido llega a guardarse");
});

test("un preceptor no ve ni edita cursos que no tiene asignados", async () => {
  const ruta = `${RUTA}?curso=4-4&anio=2026&mes=4`;
  assert.equal((await pedir("GET", ruta, preceptor)).status, 403);
  assert.equal((await pedir("PUT", ruta, preceptor, { version: 0, registros: {} })).status, 403);
  assert.equal((await pedir("GET", ruta, director)).status, 200, "el director ve toda la escuela");
});

test("la planilla oficial es de preceptoria y la de materia es del docente", async () => {
  const oficialDocente = await pedir("PUT", consulta(), docente, { version: 0, registros: { "alu-pl-1": { 1: "A" } } });
  assert.equal(oficialDocente.status, 403);

  const materiaPreceptor = await pedir("PUT", consulta("&materia=Matem%C3%A1tica"), preceptor, { version: 0, registros: {} });
  assert.equal(materiaPreceptor.status, 403);

  const materiaDocente = await pedir("PUT", consulta("&materia=Matem%C3%A1tica"), docente, { version: 0, registros: { "alu-pl-1": { 2: "A" } } });
  assert.equal(materiaDocente.status, 200, JSON.stringify(materiaDocente.cuerpo));

  /* Con o sin tilde es la misma materia, y no se mezcla con la planilla oficial. */
  const sinTilde = await pedir("GET", consulta("&materia=matematica"), docente);
  assert.equal(sinTilde.cuerpo.data.registros["alu-pl-1"]["2"], "A");
  assert.equal((await pedir("GET", consulta(), docente)).cuerpo.data, null);
});
