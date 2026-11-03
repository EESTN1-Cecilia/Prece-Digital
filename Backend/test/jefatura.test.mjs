/* Perfil Jefatura de Area (jefe_area): autenticacion, endpoints propios de la
   grilla de jefatura y autorizacion del resto del sistema.

   Verifica con el flujo real (login, JWT, verifyToken + authorize) que:
   - la cuenta del seed entra con exactamente los permisos del catalogo;
   - los endpoints /api/v1/jefatura responden para jefe_area;
   - puede consultar alumnos, registrar observaciones y leer planificaciones;
   - no accede a usuarios, identidad, inventario, calificaciones ni auditoria. */

import assert from "node:assert/strict";
import test, { after, before, beforeEach } from "node:test";
import { createApp } from "../src/app.mjs";
import { apiRoutes } from "../routes/index.mjs";
import { resetStore } from "../database/memory-store.mjs";
import { seedDesarrollo } from "../database/seeds/index.mjs";
import { permissionsForRole } from "../config/permissions.config.mjs";

const PUERTO = 4019;
const base = `http://127.0.0.1:${PUERTO}`;
let servidor;
const tokens = {};

before(async () => {
  servidor = createApp(apiRoutes);
  await new Promise((listo) => servidor.listen(PUERTO, listo));
});

after(async () => {
  await new Promise((listo) => servidor.close(listo));
});

async function login(email, password) {
  const respuesta = await fetch(`${base}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  return (await respuesta.json()).accessToken;
}

beforeEach(async () => {
  resetStore();
  await seedDesarrollo();
  tokens.jefe_area = await login("jefearea@prece.local", "JefeArea123!");
  tokens.director = await login("director@prece.local", "Director123!");
});

async function pedir(ruta, { quien, method = "GET", body } = {}) {
  const respuesta = await fetch(`${base}${ruta}`, {
    method,
    headers: {
      ...(quien ? { Authorization: `Bearer ${tokens[quien]}` } : {}),
      ...(body ? { "Content-Type": "application/json" } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });

  return { status: respuesta.status, cuerpo: await respuesta.json().catch(() => null) };
}

test("la cuenta de jefatura entra y recibe los permisos del catalogo", async () => {
  const { status, cuerpo } = await pedir("/api/v1/auth/me", { quien: "jefe_area" });

  assert.equal(status, 200);
  assert.deepEqual(cuerpo.data.roles, ["jefe_area"]);
  assert.deepEqual([...cuerpo.data.permisos].sort(), [...permissionsForRole("jefe_area")].sort());
  assert.ok(cuerpo.data.permisos.includes("planning.review"));
  assert.ok(cuerpo.data.permisos.includes("academics.read"));
  assert.ok(cuerpo.data.permisos.includes("observations.write"));
  /* identity.update alcanza para el propio perfil; la administracion de
     identidad (identity.manage) sigue reservada a direccion. */
  assert.ok(cuerpo.data.permisos.includes("identity.update"));
  assert.ok(!cuerpo.data.permisos.includes("identity.manage"));
  assert.ok(!cuerpo.data.permisos.includes("users.read"));
  assert.ok(!cuerpo.data.permisos.includes("inventory.read"));
  assert.ok(!cuerpo.data.permisos.includes("grades.read"));
  assert.ok(!cuerpo.data.permisos.includes("audit.read"));
  assert.ok(!cuerpo.data.permisos.includes("students.write"));
});

test("sin token los endpoints de jefatura responden 401", async () => {
  assert.equal((await pedir("/api/v1/jefatura/cursos-grupos")).status, 401);
  assert.equal((await pedir("/api/v1/jefatura/grilla")).status, 401);
});

test("con token de jefatura responden la grilla y los cursos/grupos", async () => {
  const cursos = await pedir("/api/v1/jefatura/cursos-grupos", { quien: "jefe_area" });

  assert.equal(cursos.status, 200);
  assert.ok(Array.isArray(cursos.cuerpo.data));
  assert.ok(cursos.cuerpo.data.length > 0);
  assert.ok(cursos.cuerpo.data.every((grupo) => typeof grupo.curso === "string"));

  const grilla = await pedir("/api/v1/jefatura/grilla", { quien: "jefe_area" });

  assert.equal(grilla.status, 200);
  assert.ok(Array.isArray(grilla.cuerpo.data));
  assert.ok(grilla.cuerpo.paginacion);
  assert.ok(grilla.cuerpo.resumen);
  assert.ok(Array.isArray(grilla.cuerpo.disponibilidad));
  assert.ok(Array.isArray(grilla.cuerpo.ausencias));
});

test("puede consultar alumnos pero no crearlos", async () => {
  const listado = await pedir("/api/v1/students?porPagina=5", { quien: "jefe_area" });

  assert.equal(listado.status, 200);
  assert.ok(Array.isArray(listado.cuerpo.data));

  const alta = await pedir("/api/v1/students", {
    quien: "jefe_area",
    method: "POST",
    body: { nombre: "Prueba", apellido: "Jefatura", dni: "30000001" }
  });

  assert.equal(alta.status, 403);
  assert.equal(alta.cuerpo.error.code, "FORBIDDEN");
});

test("puede registrar observaciones (el backend fija el responsable)", async () => {
  const listado = await pedir("/api/v1/observations", { quien: "jefe_area" });

  assert.equal(listado.status, 200);
  assert.ok(Array.isArray(listado.cuerpo.data));

  const alta = await pedir("/api/v1/students/alu-2/observations", {
    quien: "jefe_area",
    method: "POST",
    body: { tipo: "Convivencia", descripcion: "Registro de jefatura.", responsable: "Inventado" }
  });

  assert.equal(alta.status, 201);
  assert.equal(alta.cuerpo.data.descripcion, "Registro de jefatura.");
  assert.notEqual(alta.cuerpo.data.responsable, "Inventado");
});

test("puede consultar planificaciones y controles de planificacion", async () => {
  const planes = await pedir("/api/v1/teacher-plans", { quien: "jefe_area" });
  const controles = await pedir("/api/v1/planning-controls", { quien: "jefe_area" });

  assert.equal(planes.status, 200);
  assert.equal(controles.status, 200);
});

test("no puede gestionar usuarios ni identidad (solo direccion y secretaria)", async () => {
  const listado = await pedir("/api/v1/users", { quien: "jefe_area" });
  const alta = await pedir("/api/v1/users", { quien: "jefe_area", method: "POST", body: {} });
  const bajar = await pedir("/api/v1/users/usr_2/deactivate", { quien: "jefe_area", method: "PATCH" });
  const permisos = await pedir("/api/v1/authorization/roles/preceptor/permissions", {
    quien: "jefe_area",
    method: "PUT",
    body: { permisos: ["students.read"] }
  });

  assert.equal(listado.status, 403);
  assert.equal(alta.status, 403);
  assert.equal(bajar.status, 403);
  assert.equal(permisos.status, 403);
});

test("no accede a inventario, calificaciones ni auditoria", async () => {
  assert.equal((await pedir("/api/v1/inventory", { quien: "jefe_area" })).status, 403);
  assert.equal((await pedir("/api/v1/calificaciones", { quien: "jefe_area" })).status, 403);
  assert.equal((await pedir("/api/v1/audit/logs", { quien: "jefe_area" })).status, 403);
});

test("direccion conserva el acceso total: ningun permiso de jefatura lo afecta", async () => {
  const usuarios = await pedir("/api/v1/users", { quien: "director" });
  const grilla = await pedir("/api/v1/jefatura/grilla", { quien: "director" });

  assert.equal(usuarios.status, 200);
  assert.equal(grilla.status, 200);
});
