/* Boletin oficial / planilla: una sola fuente de notas.
   Lo que se carga por la planilla o el boletin oficial (PUT /boletin-oficial)
   es lo que ve el alumno en su portal (GET /alumno/boletin) y lo que lee el
   personal (GET /boletin-oficial y GET /alumnos/:id/boletin). */

import assert from "node:assert/strict";
import test, { after, before, beforeEach } from "node:test";
import { createApp } from "../src/app.mjs";
import { apiRoutes } from "../routes/index.mjs";
import { resetStore } from "../database/memory-store.mjs";
import { seedDesarrollo } from "../database/seeds/index.mjs";
import { cargarAusenciasYPreviasDePrueba, cargarNotasDePrueba } from "../database/seeds/alumnos-locales-academia.seed.mjs";
import studentRepository from "../modules/students/students.repository.mjs";
import { cicloLectivoActual } from "../modules/student-portal/catalogo.mjs";

const PUERTO = 4031;
const base = `http://127.0.0.1:${PUERTO}`;
const CICLO = cicloLectivoActual();
let servidor;

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

async function pedir(ruta, { metodo = "GET", token, cuerpo } = {}) {
  const respuesta = await fetch(`${base}${ruta}`, {
    method: metodo,
    headers: { ...(cuerpo ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined
  });
  const texto = await respuesta.text();
  return { status: respuesta.status, cuerpo: texto ? JSON.parse(texto) : null };
}
const login = async (email, password) => (await pedir("/api/v1/auth/login", { metodo: "POST", cuerpo: { email, password } })).cuerpo.accessToken;

async function portalDe(dni) {
  const clave = "Escuela2026ok";
  const inicial = await pedir("/api/v1/auth/login", { metodo: "POST", cuerpo: { email: dni, password: dni } });
  const token = inicial.cuerpo.accessToken;
  await pedir("/api/v1/alumno/cuenta/configuracion", { metodo: "POST", token, cuerpo: { passwordActual: dni, passwordNueva: clave, confirmacion: clave } });
  return token;
}

const materia = (boletin, nombre) => boletin.materias.find((item) => item.materia.toLowerCase() === nombre.toLowerCase());

test("la nota que carga el personal en el boletin oficial aparece en el portal del alumno", async () => {
  const admin = await login("admin@prece.local", "Admin123!");
  const guardado = await pedir("/api/v1/boletin-oficial/alumnos/alu-1", {
    metodo: "PUT", token: admin,
    cuerpo: { anio: CICLO, notas: { "MATEMÁTICA": { informe1: "8", informe2: "5" }, "Lengua": { informe1: "TEA" } } }
  });
  assert.equal(guardado.status, 200, JSON.stringify(guardado.cuerpo));

  const token = await portalDe("40123456");
  const { cuerpo } = await pedir("/api/v1/alumno/boletin", { token });
  const mate = materia(cuerpo.data, "Matemática");
  assert.equal(mate.periodos.c1.resultado.valor, "8");
  assert.equal(mate.periodos.c2.resultado.valor, "5");
  assert.equal(materia(cuerpo.data, "Lengua").periodos.c1.resultado.valor, "TEA");
});

test("el personal lee de vuelta las mismas notas en formato de planilla", async () => {
  const admin = await login("admin@prece.local", "Admin123!");
  await pedir("/api/v1/boletin-oficial/alumnos/alu-1", { metodo: "PUT", token: admin, cuerpo: { anio: CICLO, notas: { "Historia": { informe1: "9", diciembre: "7", febrero: "8" } } } });
  const { cuerpo } = await pedir(`/api/v1/boletin-oficial/alumnos/alu-1?anio=${CICLO}`, { token: admin });
  assert.deepEqual(cuerpo.data.notas["Historia"], { informe1: "9", informe2: "", diciembre: "7", febrero: "8" });

  const lote = await pedir(`/api/v1/boletin-oficial/alumnos?ids=alu-1,alu-5&anio=${CICLO}`, { token: admin });
  assert.deepEqual(Object.keys(lote.cuerpo.data.alumnos).sort(), ["alu-1", "alu-5"]);

  // Febrero prevalece como calificacion final en el portal
  const token = await portalDe("40123456");
  const portal = (await pedir("/api/v1/alumno/boletin", { token })).cuerpo.data;
  assert.equal(materia(portal, "Historia").calificacionFinal.valor, "8");
});

test("corregir o borrar una nota se refleja en el portal", async () => {
  const admin = await login("admin@prece.local", "Admin123!");
  const put = (notas) => pedir("/api/v1/boletin-oficial/alumnos/alu-5", { metodo: "PUT", token: admin, cuerpo: { anio: CICLO, notas } });
  await put({ "Ciencias naturales": { informe1: "4" } });
  await put({ "Ciencias naturales": { informe1: "9" } });
  const token = await portalDe("45678901");
  let portal = (await pedir("/api/v1/alumno/boletin", { token })).cuerpo.data;
  assert.equal(materia(portal, "Ciencias naturales").periodos.c1.resultado.valor, "9");

  await put({ "Ciencias naturales": { informe1: "" } });
  portal = (await pedir("/api/v1/alumno/boletin", { token })).cuerpo.data;
  assert.equal(materia(portal, "Ciencias naturales"), undefined);
});

test("un valor invalido se rechaza completo y no guarda nada", async () => {
  const admin = await login("admin@prece.local", "Admin123!");
  const { status, cuerpo } = await pedir("/api/v1/boletin-oficial/alumnos/alu-1", { metodo: "PUT", token: admin, cuerpo: { anio: CICLO, notas: { "Historia": { informe1: "9" }, "Lengua": { informe1: "15" } } } });
  assert.equal(status, 422);
  assert.ok(cuerpo.error.details[0].field.includes("Lengua"));
  const leido = await pedir(`/api/v1/boletin-oficial/alumnos/alu-1?anio=${CICLO}`, { token: admin });
  assert.equal(leido.cuerpo.data.notas["Historia"], undefined);
});

test("permisos: sin token 401, alumno no escribe, el docente solo carga lo asignado", async () => {
  assert.equal((await pedir("/api/v1/boletin-oficial/alumnos/alu-1")).status, 401);
  const alumno = await portalDe("40123456");
  assert.equal((await pedir("/api/v1/boletin-oficial/alumnos/alu-1", { metodo: "PUT", token: alumno, cuerpo: { notas: {} } })).status, 403);
  const docente = await login("docente@prece.local", "Docente123!");
  const ajena = await pedir("/api/v1/boletin-oficial/alumnos/alu-1", { metodo: "PUT", token: docente, cuerpo: { anio: CICLO, notas: { "Biologia": { informe1: "8" } } } });
  assert.equal(ajena.status, 403);
});

test("el preceptor puede guardar notas desde el boletin oficial", async () => {
  const preceptor = await login("preceptor@prece.local", "Preceptor123!");
  const res = await pedir("/api/v1/boletin-oficial/alumnos/alu-1", { metodo: "PUT", token: preceptor, cuerpo: { anio: CICLO, notas: { "Historia": { informe1: "7" } }, inasistencias: "3", libroFolio: { libro: "2026", folio: "05" } } });
  assert.equal(res.status, 200, JSON.stringify(res.cuerpo));
  assert.equal(res.cuerpo.data.inasistencias, "3");
  assert.deepEqual(res.cuerpo.data.libroFolio, { libro: "2026", folio: "05" });
});

test("alumno de la nomina local: las notas de prueba son visibles en el portal", async () => {
  studentRepository.create({ id: "alu-local-1", escuelaId: "esc-1", apellido: "Prueba", nombre: "Lucas", dni: "10000001", dniProvisorio: false, curso: 1, division: "1", turno: "MANANA", condicion: "regular", fechaAlta: `${CICLO}-03-01` });
  assert.ok(cargarNotasDePrueba() > 15);
  assert.deepEqual(cargarAusenciasYPreviasDePrueba(), { ausencias: 4, previas: 2 });

  const token = await portalDe("10000001");
  const portal = (await pedir("/api/v1/alumno/boletin", { token })).cuerpo.data;
  assert.equal(portal.materias.length, 11);
  assert.equal(materia(portal, "Matematicas").calificacionFinal.valor, "4");
  assert.equal(materia(portal, "Educacion fisica").periodos.c1.resultado.valor, "10");
  assert.equal(portal.inasistencias.ausentes, 4);
  assert.equal(portal.inasistencias.ausentesJustificados, 1);
  assert.deepEqual(portal.materiasPendientes.map((previa) => previa.materia).sort(), ["Ingles", "Matematicas"]);
});

test("el resumen de un curso indica quien ya tiene notas y en que materias", async () => {
  const admin = await login("admin@prece.local", "Admin123!");
  await pedir("/api/v1/boletin-oficial/alumnos/alu-1", { metodo: "PUT", token: admin, cuerpo: { anio: CICLO, notas: { "Historia": { informe1: "9" } } } });
  const { status, cuerpo } = await pedir(`/api/v1/boletin-oficial/resumen?anio=${CICLO}&curso=1&division=1`, { token: admin });
  assert.equal(status, 200);
  assert.ok(cuerpo.data.conNotas.includes("alu-1"));
  assert.equal(cuerpo.data.materias["Historia"], 1);
  assert.equal((await pedir("/api/v1/boletin-oficial/resumen?curso=1", { token: admin })).status, 400);
});

test("el docente guarda desde la planilla en sus cursos asignados (1° 1° y 2° 1°) y se refleja en el boletin", async () => {
  const docente = await login("docente@prece.local", "Docente123!");
  const g1 = await pedir("/api/v1/boletin-oficial/alumnos/alu-1", {
    metodo: "PUT",
    token: docente,
    cuerpo: {
      anio: CICLO,
      notas: { MATEMATICAS: { informe1: "9", informe2: "10", diciembre: "", febrero: "" } },
      detalle: { MATEMATICAS: { p1: "9", p2: "9", v1: "TEA", f1: 1, p3: "10", p4: "10", v2: "TEA", f2: 0 } }
    }
  });
  assert.equal(g1.status, 200, JSON.stringify(g1.cuerpo));
  assert.equal(g1.cuerpo.data.notas["Matematicas"]?.informe1 ?? g1.cuerpo.data.notas["MATEMATICAS"]?.informe1, "9");

  const g2 = await pedir("/api/v1/boletin-oficial/alumnos/alu-7", {
    metodo: "PUT",
    token: docente,
    cuerpo: {
      anio: CICLO,
      notas: { "MATEMÁTICA": { informe1: "8", informe2: "9", diciembre: "", febrero: "" } },
      detalle: { "MATEMÁTICA": { p1: "8", p2: "8", v1: "TEA", f1: 0, p3: "9", p4: "9", v2: "TEA", f2: 0 } }
    }
  });
  assert.equal(g2.status, 200, JSON.stringify(g2.cuerpo));
});
