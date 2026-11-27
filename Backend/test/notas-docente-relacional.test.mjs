/* Docente del personal relacional: no tiene legajo en el modulo teachers; sus catedras
   llegan como asignaciones { role: "docente", anio, division, materia }. Tiene que poder
   cargar notas de SU materia en SUS cursos, y esas notas tienen que verse en el boletin. */
import assert from "node:assert/strict";
import test, { after, before } from "node:test";
import bcrypt from "bcryptjs";
import { createApp } from "../src/app.mjs";
import { apiRoutes } from "../routes/index.mjs";
import { seedAuthData } from "../database/seeds/auth.seed.mjs";
import { userRepository } from "../database/repositories/user.repository.mjs";
import studentRepository from "../modules/students/students.repository.mjs";

const PUERTO = 4035;
const base = `http://127.0.0.1:${PUERTO}`;
const CICLO = new Date().getFullYear();
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
  for (const [id, curso, division, dni] of [["alu-nd-propio", 1, "1", "32000001"], ["alu-nd-ajeno", 4, "4", "32000002"]]) {
    if (!studentRepository.findById(id)) {
      studentRepository.create({ id, escuelaId: "esc-1", apellido: "Notas", nombre: id, dni, dniProvisorio: false, curso, division, condicion: "regular", fechaAlta: `${CICLO}-03-01` });
    }
  }
  if (!userRepository.findByEmail("docente.relacional@prece.local")) {
    userRepository.create({
      email: "docente.relacional@prece.local",
      passwordHash: await bcrypt.hash("Relacional123!", 10),
      displayName: "Docente Relacional",
      assignments: [{ role: "docente" }, { role: "docente", catedraId: "cat-x", anio: 1, curso: "1°", division: "1", materia: "MATEMATICAS" }]
    });
  }
  servidor = createApp(apiRoutes);
  await new Promise((listo) => servidor.listen(PUERTO, listo));
  const r = await fetch(`${base}/api/v1/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: "docente.relacional@prece.local", password: "Relacional123!" }) });
  token = (await r.json()).accessToken;
  assert.ok(token);
});

after(async () => {
  await new Promise((listo) => servidor.close(listo));
});

test("carga la nota de su materia en su curso y queda en el boletin", async () => {
  const guardado = await pedir("PUT", "/api/v1/boletin-oficial/alumnos/alu-nd-propio", { anio: CICLO, notas: { MATEMATICAS: { informe1: "8" } } });
  assert.equal(guardado.status, 200, JSON.stringify(guardado.cuerpo));
  const boletin = await pedir("GET", `/api/v1/boletin-oficial/alumnos/alu-nd-propio?anio=${CICLO}`);
  assert.equal(boletin.status, 200);
  const notas = boletin.cuerpo.data?.notas ?? boletin.cuerpo.notas;
  const mat = Object.entries(notas ?? {}).find(([materia]) => materia.toUpperCase().startsWith("MATEMATIC"))?.[1];
  assert.equal(String(mat?.informe1), "8", JSON.stringify(notas));
});

test("no carga notas de otra materia ni de un alumno de otro curso", async () => {
  const otraMateria = await pedir("PUT", "/api/v1/boletin-oficial/alumnos/alu-nd-propio", { anio: CICLO, notas: { INGLES: { informe1: "7" } } });
  assert.equal(otraMateria.status, 403, JSON.stringify(otraMateria.cuerpo));
  const otroCurso = await pedir("PUT", "/api/v1/boletin-oficial/alumnos/alu-nd-ajeno", { anio: CICLO, notas: { MATEMATICAS: { informe1: "7" } } });
  assert.equal(otroCurso.status, 403, JSON.stringify(otroCurso.cuerpo));
});
