/* Inasistencias de alumnos: registro, consulta, correccion, justificacion,
   totales y estadisticas. Todo calculo sale de los registros almacenados y el
   historial conserva los estados anteriores.

   Permisos del seed: director = ALL, preceptor = attendance.read + attendance.write,
   secretario = sin attendance (403 al leer y escribir). */

import assert from "node:assert/strict";
import test, { after, before, beforeEach } from "node:test";
import jwt from "jsonwebtoken";
import { createApp } from "../src/app.mjs";
import { apiRoutes } from "../routes/index.mjs";
import { resetStore } from "../database/memory-store.mjs";
import { seedAuthData } from "../database/seeds/auth.seed.mjs";
import { seedStudents } from "../database/seeds/students.seed.mjs";
import { seedInasistencias } from "../database/seeds/inasistencias.seed.mjs";
import inasistenciasRepository from "../modules/inasistencias/inasistencias.repository.mjs";

const PUERTO = 4010;
const base = `http://127.0.0.1:${PUERTO}`;

let servidor;
let preceptor;
let secretario;

async function login(email, password) {
  const respuesta = await fetch(`${base}/api/v1/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password })
  });

  if (respuesta.status !== 200) {
    throw new Error(`No se pudo autenticar ${email}: ${respuesta.status}`);
  }

  return (await respuesta.json()).accessToken;
}

/* Id del usuario dentro del token JWT (lo que el backend guarda en createdBy). */
function idDe(token) {
  return jwt.decode(token).sub;
}

async function pedir(metodo, ruta, token, cuerpo) {
  const cabeceras = token ? { authorization: `Bearer ${token}` } : {};

  if (cuerpo !== undefined) {
    cabeceras["content-type"] = "application/json";
  }

  const respuesta = await fetch(`${base}${ruta}`, {
    method: metodo,
    headers: cabeceras,
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo)
  });

  return { status: respuesta.status, cuerpo: await respuesta.json() };
}

before(async () => {
  await seedAuthData();
  servidor = createApp(apiRoutes);
  await new Promise((listo) => servidor.listen(PUERTO, listo));
});

after(async () => {
  await new Promise((listo) => servidor.close(listo));
});

beforeEach(async () => {
  resetStore();
  await seedAuthData();
  await seedStudents();
  inasistenciasRepository.resetData();
  seedInasistencias();
  preceptor = await login("preceptor@prece.local", "Preceptor123!");
  secretario = await login("secretario@prece.local", "Secretaria123!");
});

/* ---------------- Autenticacion y permisos -------------------------------- */

test("las rutas de inasistencias exigen token (401)", async () => {
  const listado = await pedir("GET", "/api/v1/inasistencias");
  assert.equal(listado.status, 401);
  assert.equal(listado.cuerpo.error.code, "MISSING_TOKEN");

  const registro = await pedir("POST", "/api/v1/inasistencias", null, { alumnoId: "alu-1", fecha: "2026-05-10", motivo: "salud" });
  assert.equal(registro.status, 401);
});

test("un secretario sin permisos de asistencia no puede leer ni escribir (403)", async () => {
  const leer = await pedir("GET", "/api/v1/inasistencias", secretario);
  assert.equal(leer.status, 403);
  assert.equal(leer.cuerpo.error.code, "FORBIDDEN");

  const escribir = await pedir("POST", "/api/v1/inasistencias", secretario, { alumnoId: "alu-1", fecha: "2026-05-10", motivo: "salud" });
  assert.equal(escribir.status, 403);
});

test("un preceptor puede leer el listado (200)", async () => {
  const { status, cuerpo } = await pedir("GET", "/api/v1/inasistencias", preceptor);
  assert.equal(status, 200);
  assert.equal(cuerpo.data.length, 7);
});

/* ---------------- Catalogo ------------------------------------------------ */

test("el catalogo expone motivos, estados y cuatrimestres", async () => {
  const { status, cuerpo } = await pedir("GET", "/api/v1/inasistencias/motivos", preceptor);

  assert.equal(status, 200);
  assert.deepEqual(
    cuerpo.data.motivos.map((motivo) => motivo.codigo),
    ["personal", "salud", "institucional", "otra"]
  );
  assert.deepEqual(cuerpo.data.estados, ["no_justificada", "pendiente", "justificada"]);
});

/* ---------------- Registro ------------------------------------------------ */

test("registra una inasistencia y sus totales derivan del registro", async () => {
  const { status, cuerpo } = await pedir(
    "POST",
    "/api/v1/inasistencias",
    preceptor,
    { alumnoId: "alu-1", fecha: "2026-05-10", motivo: "salud", observaciones: "Falto a clase" }
  );

  assert.equal(status, 201);
  assert.equal(cuerpo.data.alumnoId, "alu-1");
  assert.equal(cuerpo.data.curso, 1);
  assert.equal(cuerpo.data.division, "1");
  assert.equal(cuerpo.data.fecha, "2026-05-10");
  assert.equal(cuerpo.data.periodo.anio, 2026);
  assert.equal(cuerpo.data.motivo, "salud");
  assert.equal(cuerpo.data.estadoJustificacion, "no_justificada");
  assert.equal(cuerpo.data.createdBy, idDe(preceptor));
  assert.ok(cuerpo.data.id.startsWith("ina_"));
});

test("al crear justificada se guardan los datos de justificacion con el usuario logueado", async () => {
  const { status, cuerpo } = await pedir(
    "POST",
    "/api/v1/inasistencias",
    preceptor,
    {
      alumnoId: "alu-1",
      fecha: "2026-05-12",
      motivo: "salud",
      estadoJustificacion: "justificada",
      justificacion: { motivoJustificacion: "Certificado medico", documento: "parte-bnc-01" }
    }
  );

  assert.equal(status, 201);
  assert.equal(cuerpo.data.estadoJustificacion, "justificada");
  assert.equal(cuerpo.data.justificacion.justificadaPor, idDe(preceptor));
  assert.equal(cuerpo.data.justificacion.motivoJustificacion, "Certificado medico");
});

test("no registra el mismo alumno dos veces en la misma fecha (409)", async () => {
  const primero = await pedir("POST", "/api/v1/inasistencias", preceptor, { alumnoId: "alu-1", fecha: "2026-05-20", motivo: "salud" });
  assert.equal(primero.status, 201);

  const duplicado = await pedir("POST", "/api/v1/inasistencias", preceptor, { alumnoId: "alu-1", fecha: "2026-05-20", motivo: "otra" });
  assert.equal(duplicado.status, 409);
  assert.equal(duplicado.cuerpo.error.code, "CONFLICT");
});

/* ---------------- Validaciones -------------------------------------------- */

test("rechaza una inasistencia con datos invalidos (422)", async () => {
  const casos = [
    { status: 422, cuerpo: { fecha: "2026-05-10", motivo: "salud" }, campo: "alumnoId" },
    { status: 422, cuerpo: { alumnoId: "alu-no-existe", fecha: "2026-05-10", motivo: "salud" }, campo: "alumnoId" },
    { status: 422, cuerpo: { alumnoId: "alu-1", fecha: "2026-02-30", motivo: "salud" }, campo: "fecha" },
    { status: 422, cuerpo: { alumnoId: "alu-1", fecha: "10-05-2026", motivo: "salud" }, campo: "fecha" },
    { status: 422, cuerpo: { alumnoId: "alu-1", fecha: "2026-05-10", motivo: "no-valido" }, campo: "motivo" },
    { status: 422, cuerpo: { alumnoId: "alu-1", fecha: "2026-05-10", motivo: "salud", estadoJustificacion: "no-existe" }, campo: "estadoJustificacion" },
    { status: 422, cuerpo: { alumnoId: "alu-1", fecha: "2026-05-10", motivo: "salud", estadoJustificacion: "justificada" }, campo: "justificacion" },
    { status: 422, cuerpo: { alumnoId: "alu-1", fecha: "2026-05-10", motivo: "salud", anio: 2025 }, campo: "anio" },
    { status: 422, cuerpo: { alumnoId: "alu-1", fecha: "2026-05-10", motivo: "salud", curso: 4 }, campo: "curso" },
    { status: 422, cuerpo: { alumnoId: "alu-1", fecha: "2026-05-10", motivo: "salud", division: "3" }, campo: "division" }
  ];

  for (const caso of casos) {
    const { status, cuerpo } = await pedir("POST", "/api/v1/inasistencias", preceptor, caso.cuerpo);
    assert.equal(status, caso.status, `se esperaba ${caso.status} para el campo ${caso.campo}`);
    assert.equal(cuerpo.error.code, "VALIDATION_ERROR", `campo ${caso.campo}`);
    assert.ok(
      cuerpo.error.details.some((detalle) => detalle.field === caso.campo),
      `el detalle deberia mencionar el campo ${caso.campo}`
    );
  }
});

/* ---------------- Consulta y listado ------------------------------------- */

test("obtiene una inasistencia por id y 404 cuando no existe", async () => {
  const { status, cuerpo } = await pedir("GET", "/api/v1/inasistencias/ina-1", preceptor);
  assert.equal(status, 200);
  assert.equal(cuerpo.data.id, "ina-1");
  assert.equal(cuerpo.data.estadoJustificacion, "justificada");

  const inexistente = await pedir("GET", "/api/v1/inasistencias/ina-no-existe", preceptor);
  assert.equal(inexistente.status, 404);
});

test("lista con filtros combinables y paginacion", async () => {
  const { status, cuerpo } = await pedir("GET", "/api/v1/inasistencias?alumnoId=alu-1&anio=2026", preceptor);
  assert.equal(status, 200);
  assert.equal(cuerpo.data.length, 3);
  assert.equal(cuerpo.paginacion.total, 3);
  assert.equal(cuerpo.paginacion.pagina, 1);
  assert.equal(cuerpo.filtros.alumnoId, "alu-1");

  const porEstado = await pedir("GET", "/api/v1/inasistencias?estado=justificada", preceptor);
  assert.equal(porEstado.status, 200);
  assert.ok(porEstado.cuerpo.data.every((registro) => registro.estadoJustificacion === "justificada"));

  const porFecha = await pedir("GET", "/api/v1/inasistencias?fecha=2026-03-02", preceptor);
  assert.equal(porFecha.status, 200);
  assert.equal(porFecha.cuerpo.data.length, 1);
  assert.equal(porFecha.cuerpo.data[0].id, "ina-1");

  const porRango = await pedir("GET", "/api/v1/inasistencias?desde=2026-08-01&hasta=2026-12-31", preceptor);
  assert.equal(porRango.status, 200);
  assert.equal(porRango.cuerpo.data.length, 2);
});

test("filtros invalidos devuelven 422", async () => {
  const casos = [
    "/api/v1/inasistencias?curso=9",
    "/api/v1/inasistencias?anio=2036",
    "/api/v1/inasistencias?estado=invalido",
    "/api/v1/inasistencias?desde=2026-12-01&hasta=2026-01-01",
    "/api/v1/inasistencias?porPagina=500",
    "/api/v1/inasistencias?orden=reverso"
  ];

  for (const ruta of casos) {
    const { status } = await pedir("GET", ruta, preceptor);
    assert.equal(status, 422, ruta);
  }
});

/* ---------------- Justificacion y correccion ------------------------------ */

test("justifica una inasistencia y registra el historial y la auditoria", async () => {
  const antes = await pedir("GET", "/api/v1/inasistencias/ina-2", preceptor);
  assert.equal(antes.cuerpo.data.estadoJustificacion, "no_justificada");

  const { status, cuerpo } = await pedir(
    "POST",
    "/api/v1/inasistencias/ina-2/justify",
    preceptor,
    { motivoJustificacion: "Justificado por presentacion de nota", documento: "nota-2026-004" }
  );

  assert.equal(status, 200);
  assert.equal(cuerpo.data.estadoJustificacion, "justificada");
  assert.equal(cuerpo.data.justificacion.justificadaPor, idDe(preceptor));
  assert.equal(cuerpo.data.justificacion.documento, "nota-2026-004");
  assert.equal(cuerpo.data.historial.length, 1);
  assert.equal(cuerpo.data.historial[0].estadoJustificacion, "no_justificada");

  const historial = await pedir("GET", "/api/v1/inasistencias/ina-2/historial", preceptor);
  assert.equal(historial.status, 200);
  assert.equal(historial.cuerpo.data.historial.length, 1);
});

test("justificar sin datos de justificacion devuelve 422", async () => {
  const { status, cuerpo } = await pedir("POST", "/api/v1/inasistencias/ina-2/justify", preceptor, {});
  assert.equal(status, 422);
  assert.equal(cuerpo.error.details[0].field, "justificacion");
});

test("corrige una inasistencia sin perder el estado anterior", async () => {
  const { status, cuerpo } = await pedir(
    "PATCH",
    "/api/v1/inasistencias/ina-1",
    preceptor,
    { motivo: "personal", observaciones: "Corregido por error de carga" }
  );

  assert.equal(status, 200);
  assert.equal(cuerpo.data.motivo, "personal");
  assert.equal(cuerpo.data.updatedBy, idDe(preceptor));
  assert.equal(cuerpo.data.historial.length, 1);
  assert.equal(cuerpo.data.historial[0].motivo, "salud");
});

test("corregir a justificada exige los datos de justificacion", async () => {
  const { status } = await pedir(
    "PATCH",
    "/api/v1/inasistencias/ina-2",
    preceptor,
    { estadoJustificacion: "justificada" }
  );
  assert.equal(status, 422);
});

test("corregir a una fecha ya registrada para el mismo alumno choca con la unicidad", async () => {
  const { status } = await pedir(
    "PATCH",
    "/api/v1/inasistencias/ina-2",
    preceptor,
    { fecha: "2026-03-02" }
  );
  assert.equal(status, 409);
});

test("no permite borrar: los registros solo se corrigen o justifican", async () => {
  const { status } = await pedir("DELETE", "/api/v1/inasistencias/ina-1", preceptor);
  assert.equal(status, 404);
  const sigueExistiendo = await pedir("GET", "/api/v1/inasistencias/ina-1", preceptor);
  assert.equal(sigueExistiendo.status, 200);
});

/* ---------------- Totales y estadisticas ---------------------------------- */

test("los totales de un alumno se calculan desde los registros", async () => {
  const { status, cuerpo } = await pedir("GET", "/api/v1/inasistencias/alumno/alu-1/totales", preceptor);

  assert.equal(status, 200);
  assert.equal(cuerpo.data.alumno.id, "alu-1");
  assert.equal(cuerpo.data.totales.total, 3);
  assert.equal(cuerpo.data.totales.justificadas, 2);
  assert.equal(cuerpo.data.totales.noJustificadas, 1);
  assert.equal(cuerpo.data.totales.pendientes, 0);
  assert.equal(cuerpo.data.totales.porMotivo.salud, 1);
  assert.deepEqual(cuerpo.data.reglas.topeParcialNoJustificadas, { aplica: false, superado: false, limite: null, actual: 3 });
});

test("los totales de un alumno inexistente devuelven 404", async () => {
  const { status } = await pedir("GET", "/api/v1/inasistencias/alumno/alu-no-existe/totales", preceptor);
  assert.equal(status, 404);
});

test("las estadisticas consolidan totales, por division y por cuatrimestre", async () => {
  const { status, cuerpo } = await pedir("GET", "/api/v1/inasistencias/estadisticas?anio=2026", preceptor);

  assert.equal(status, 200);
  assert.equal(cuerpo.data.totales.total, 7);
  assert.equal(cuerpo.data.totales.justificadas, 3);
  assert.equal(cuerpo.data.totales.noJustificadas, 2);
  assert.equal(cuerpo.data.totales.pendientes, 2);
  assert.ok(cuerpo.data.porDivision.some((division) => division.curso === 1 && division.total === 3));
  assert.ok(cuerpo.data.porCuatrimestre.some((periodo) => periodo.cuatrimestre === 2 && periodo.total === 2));
});