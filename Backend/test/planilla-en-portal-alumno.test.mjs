/* Las faltas que el preceptor marca en la planilla oficial del curso le llegan al
   alumno (Mis Asistencias y la tarjeta de inicio, en la web y en la APK). Las
   planillas por materia del docente no cuentan como inasistencias de la escuela. */

import assert from "node:assert/strict";
import test, { after, before, beforeEach } from "node:test";
import { createApp } from "../src/app.mjs";
import { apiRoutes } from "../routes/index.mjs";
import { resetStore } from "../database/memory-store.mjs";
import { seedDesarrollo } from "../database/seeds/index.mjs";
import studentRepository from "../modules/students/students.repository.mjs";
import inasistenciasRepository from "../modules/inasistencias/inasistencias.repository.mjs";
import attendanceAlertsRepository from "../modules/attendance-alerts/attendance-alerts.repository.mjs";
import { cicloLectivoActual } from "../modules/student-portal/catalogo.mjs";

const PUERTO = 4036;
const base = `http://127.0.0.1:${PUERTO}`;
const CICLO = cicloLectivoActual();
let servidor;

async function pedir(ruta, { metodo = "GET", token, cuerpo } = {}) {
  const respuesta = await fetch(`${base}${ruta}`, {
    method: metodo,
    headers: {
      ...(cuerpo ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined
  });
  const texto = await respuesta.text();
  return { status: respuesta.status, cuerpo: texto ? JSON.parse(texto) : null };
}

async function login(usuario, password) {
  const { status, cuerpo } = await pedir("/api/v1/auth/login", { metodo: "POST", cuerpo: { email: usuario, password } });
  assert.equal(status, 200, `login ${usuario}`);
  return cuerpo.accessToken;
}

/* Un alumno activo sin ningun registro de asistencia cargado, para contar solo la planilla. */
function alumnoSinRegistros() {
  const alumno = studentRepository
    .all()
    .find(
      (item) =>
        item.isActive &&
        /^\d{7,8}$/.test(String(item.dni)) &&
        !inasistenciasRepository.list({ alumnoId: item.id }).length &&
        !attendanceAlertsRepository.listInasistencias({ alumnoId: item.id }).length
    );
  assert.ok(alumno, "hace falta un alumno sin registros en los seeds");
  return alumno;
}

before(async () => {
  servidor = createApp(apiRoutes);
  await new Promise((listo) => servidor.listen(PUERTO, listo));
});

after(async () => {
  await new Promise((listo) => servidor.close(listo));
});

beforeEach(async () => {
  resetStore();
  await seedDesarrollo();
});

test("las faltas de la planilla oficial aparecen en Mis Asistencias del alumno", async () => {
  const alumno = alumnoSinRegistros();
  const director = await login("director@prece.local", "Director123!");
  const curso = `${alumno.curso}-${alumno.division}`;

  const oficial = await pedir(`/api/v1/asistencias/planillas?curso=${curso}&anio=${CICLO}&mes=4`, {
    metodo: "PUT",
    token: director,
    cuerpo: { version: 0, registros: { [alumno.id]: { 1: "P", 2: "A", 3: "J", 6: "A", 7: "T", 8: "—" } } }
  });
  assert.equal(oficial.status, 200, JSON.stringify(oficial.cuerpo));

  /* Una planilla de materia con otra falta: no se suma. */
  const materia = await pedir(`/api/v1/asistencias/planillas?curso=${curso}&anio=${CICLO}&mes=5&materia=MATEMATICA`, {
    metodo: "PUT",
    token: director,
    cuerpo: { version: 0, registros: { [alumno.id]: { 4: "A" } } }
  });
  assert.equal(materia.status, 200, JSON.stringify(materia.cuerpo));

  const token = await login(String(alumno.dni), String(alumno.dni));
  const { status, cuerpo } = await pedir("/api/v1/alumno/asistencias", { token });
  assert.equal(status, 200, JSON.stringify(cuerpo));

  assert.equal(cuerpo.data.totales.ausentes, 3);
  assert.equal(cuerpo.data.totales.ausentesJustificados, 1);
  assert.equal(cuerpo.data.totales.ausentesInjustificados, 2);
  assert.equal(cuerpo.data.totales.llegadasTarde, 1);
  const fechas = cuerpo.data.detalle.map((item) => item.fecha);
  assert.ok(fechas.includes(`${CICLO}-04-02`));
  assert.ok(!fechas.some((fecha) => fecha.startsWith(`${CICLO}-05`)), "la planilla de materia no cuenta");

  /* La tarjeta de inicio muestra el mismo total. */
  const perfil = await pedir("/api/v1/alumno/perfil", { token });
  assert.equal(perfil.cuerpo.data.resumen.ausentes, 3);
});

test("si el dia ya tiene un registro cargado a mano, la planilla no lo duplica", async () => {
  const alumno = alumnoSinRegistros();
  const director = await login("director@prece.local", "Director123!");
  const curso = `${alumno.curso}-${alumno.division}`;

  await pedir(`/api/v1/asistencias/planillas?curso=${curso}&anio=${CICLO}&mes=4`, {
    metodo: "PUT",
    token: director,
    cuerpo: { version: 0, registros: { [alumno.id]: { 2: "A", 3: "A" } } }
  });
  attendanceAlertsRepository.createInasistencia({
    escuelaId: alumno.escuelaId,
    alumnoId: alumno.id,
    fecha: `${CICLO}-04-02`,
    tipo: "ausente",
    justificada: true,
    registradoPor: "test"
  });

  const token = await login(String(alumno.dni), String(alumno.dni));
  const { cuerpo } = await pedir("/api/v1/alumno/asistencias", { token });
  assert.equal(cuerpo.data.totales.ausentes, 2);
});
