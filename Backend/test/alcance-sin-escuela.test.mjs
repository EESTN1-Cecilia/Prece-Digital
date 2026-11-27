/* El personal que viene de las tablas relacionales tiene asignaciones sin schoolId
   ({ role: "preceptor", cursos: [...] }). El control de alcance tiene que aplicarse igual:
   antes se salteaba y un preceptor podia escribir sobre alumnos de cursos ajenos. */
import assert from "node:assert/strict";
import test, { after, before } from "node:test";
import bcrypt from "bcryptjs";
import { createApp } from "../src/app.mjs";
import { apiRoutes } from "../routes/index.mjs";
import { seedAuthData } from "../database/seeds/auth.seed.mjs";
import { userRepository } from "../database/repositories/user.repository.mjs";
import studentRepository from "../modules/students/students.repository.mjs";

const PUERTO = 4033;
const base = `http://127.0.0.1:${PUERTO}`;
let servidor;
let token;

async function pedir(metodo, ruta, cuerpo) {
  const cabeceras = { authorization: `Bearer ${token}` };
  if (cuerpo !== undefined) cabeceras["content-type"] = "application/json";
  const r = await fetch(`${base}${ruta}`, { method: metodo, headers: cabeceras, body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo) });
  return { status: r.status, cuerpo: await r.json().catch(() => null) };
}

before(async () => {
  await seedAuthData();
  for (const [id, curso, division] of [["alu-sx-propio", 1, "1"], ["alu-sx-ajeno", 4, "4"]]) {
    if (!studentRepository.findById(id)) {
      studentRepository.create({ id, escuelaId: "esc-1", apellido: "Alcance", nombre: id, dni: id === "alu-sx-propio" ? "31000001" : "31000002", curso, division, condicion: "regular", fechaAlta: "2026-03-01" });
    }
  }
  if (!userRepository.findByEmail("preceptor.relacional@prece.local")) {
    userRepository.create({
      email: "preceptor.relacional@prece.local",
      passwordHash: await bcrypt.hash("Relacional123!", 10),
      displayName: "Preceptor Relacional",
      /* Como lo carga personal-sqlserver.mjs: sin schoolId. */
      assignments: [{ role: "preceptor", cursos: [{ curso: 1, division: "1" }] }]
    });
  }
  servidor = createApp(apiRoutes);
  await new Promise((listo) => servidor.listen(PUERTO, listo));
  const r = await fetch(`${base}/api/v1/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: "preceptor.relacional@prece.local", password: "Relacional123!" }) });
  token = (await r.json()).accessToken;
  assert.ok(token);
});

after(async () => {
  await new Promise((listo) => servidor.close(listo));
});

test("un preceptor sin escuela en sus asignaciones no escribe sobre alumnos de otro curso", async () => {
  const ajeno = await pedir("POST", "/api/v1/alertas/inasistencias", { alumnoId: "alu-sx-ajeno", fecha: "2026-04-01", tipo: "ausente", justificada: false });
  assert.equal(ajeno.status, 403, JSON.stringify(ajeno.cuerpo));
  const lectura = await pedir("GET", "/api/v1/students/alu-sx-ajeno");
  assert.equal(lectura.status, 403, "tampoco ve el legajo de un alumno ajeno");
});

test("y si puede trabajar con los alumnos de su curso", async () => {
  const propio = await pedir("POST", "/api/v1/alertas/inasistencias", { alumnoId: "alu-sx-propio", fecha: "2026-04-01", tipo: "ausente", justificada: false });
  assert.ok([200, 201].includes(propio.status), JSON.stringify(propio.cuerpo));
});

test("ninguna ruta que nombra a un alumno ajeno llega al servicio (preceptor sin escuela)", async () => {
  const ajeno = "alu-sx-ajeno";
  const casos = [
    ["POST", "/api/v1/observations", { alumnoId: ajeno, tipo: "conducta", descripcion: "Prueba de alcance" }],
    ["POST", `/api/v1/students/${ajeno}/observations`, { tipo: "conducta", descripcion: "Prueba de alcance" }],
    ["POST", "/api/v1/condiciones-particulares", { alumnoId: ajeno, tipo: "salud", descripcion: "Prueba" }],
    ["POST", "/api/v1/seguimientos-inasistencia", { alumnoId: ajeno, accion: "llamado", detalle: "Prueba" }],
    ["POST", "/api/v1/inasistencias", { alumnoId: ajeno, fecha: "2026-04-02", motivo: "otro", estadoJustificacion: "pendiente" }],
    ["PUT", `/api/v1/boletin-oficial/alumnos/${ajeno}`, { anio: 2026, materia: "MATEMATICAS", c1: "8" }],
    ["GET", `/api/v1/alumnos/${ajeno}/inasistencias`],
    ["GET", `/api/v1/boletin-oficial/alumnos/${ajeno}?anio=2026`]
  ];
  const pasaron = [];
  for (const [metodo, ruta, cuerpo] of casos) {
    const r = await pedir(metodo, ruta, cuerpo);
    if (r.status !== 403 && r.status !== 404) pasaron.push(`${metodo} ${ruta} -> ${r.status} ${JSON.stringify(r.cuerpo).slice(0, 120)}`);
  }
  assert.deepEqual(pasaron, []);
});
