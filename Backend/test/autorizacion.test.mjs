/* Catalogo de autorizacion (/api/v1/authorization/*): roles, modulos, permisos y
   matriz rol -> permisos. Usa el flujo real: login, JWT, verifyToken + authorize.

   Permisos del seed: director = todos, secretario = identity.read (sin update),
   preceptor = sin identity. */

import assert from "node:assert/strict";
import test, { after, before, beforeEach } from "node:test";
import { createApp } from "../src/app.mjs";
import { apiRoutes } from "../routes/index.mjs";
import { resetStore } from "../database/memory-store.mjs";
import { seedAuthData } from "../database/seeds/auth.seed.mjs";
import { permissionsForRole } from "../config/permissions.config.mjs";
import { userRepository } from "../database/repositories/user.repository.mjs";
import notificationsRepository from "../modules/notifications/notifications.repository.mjs";

const PUERTO = 3998;
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
  await seedAuthData();
  tokens.director = await login("director@prece.local", "Director123!");
  tokens.secretario = await login("secretario@prece.local", "Secretaria123!");
  tokens.preceptor = await login("preceptor@prece.local", "Preceptor123!");
});

async function pedir(ruta, { quien, method = "GET", body, headers = {} } = {}) {
  const respuesta = await fetch(`${base}${ruta}`, {
    method,
    headers: {
      ...(quien ? { Authorization: `Bearer ${tokens[quien]}` } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...headers
    },
    body: body ? JSON.stringify(body) : undefined
  });
  return { status: respuesta.status, cuerpo: await respuesta.json() };
}

test("sin autenticacion la API responde 401", async () => {
  const { status, cuerpo } = await pedir("/api/v1/authorization/roles");

  assert.equal(status, 401);
  assert.equal(cuerpo.error.code, "MISSING_TOKEN");
});

test("autenticado pero sin identity.read responde 403", async () => {
  const { status, cuerpo } = await pedir("/api/v1/authorization/roles", { quien: "preceptor" });

  assert.equal(status, 403);
  assert.equal(cuerpo.error.code, "FORBIDDEN");
});

test("con identity.read devuelve el catalogo de roles de Shared/src/domain.mjs", async () => {
  const { status, cuerpo } = await pedir("/api/v1/authorization/roles", { quien: "secretario" });

  assert.equal(status, 200);
  assert.deepEqual(
    cuerpo.data.map((rol) => rol.id),
    ["admin", "director", "secretario", "preceptor", "docente", "jefe_area", "server", "alumno"]
  );
});

test("la ruta con parametro resuelve el codigo del rol", async () => {
  const { status, cuerpo } = await pedir("/api/v1/authorization/roles/preceptor/permissions", { quien: "secretario" });

  assert.equal(status, 200);
  assert.equal(cuerpo.data.rol, "preceptor");
  assert.ok(cuerpo.data.permisos.includes("students.read"));
});

test("un rol inexistente devuelve 404", async () => {
  const { status, cuerpo } = await pedir("/api/v1/authorization/roles/no-existe/permissions", { quien: "director" });

  assert.equal(status, 404);
  assert.equal(cuerpo.error.code, "NOT_FOUND");
});

test("guardar permisos exige identity.update, no alcanza con identity.read", async () => {
  const antes = permissionsForRole("preceptor");
  const { status } = await pedir("/api/v1/authorization/roles/preceptor/permissions", {
    quien: "secretario",
    method: "PUT",
    body: { permisos: ["identity.read"] }
  });

  assert.equal(status, 403);
  assert.deepEqual(permissionsForRole("preceptor"), antes, "no debe cambiar nada si no autoriza");
});

test("con identity.update se reemplazan los permisos del rol y aplican a sus usuarios", async () => {
  const { status, cuerpo } = await pedir("/api/v1/authorization/roles/preceptor/permissions", {
    quien: "director",
    method: "PUT",
    body: { permisos: ["students.read", "identity.read"] }
  });

  assert.equal(status, 200);
  assert.deepEqual(cuerpo.data.permisos, ["identity.read", "students.read"]);

  const ahora = await pedir("/api/v1/authorization/roles", { quien: "preceptor" });
  assert.equal(ahora.status, 200);
});

test("no se puede asignar un permiso que no existe en el catalogo", async () => {
  const { status, cuerpo } = await pedir("/api/v1/authorization/roles/preceptor/permissions", {
    quien: "director",
    method: "PUT",
    body: { permisos: ["identity.read", "inventado.todo"] }
  });

  assert.equal(status, 422);
  assert.equal(cuerpo.error.code, "VALIDATION_ERROR");
  assert.match(cuerpo.error.details[0].message, /inventado\.todo/);
});

test("un preceptor puede marcar sus notificaciones como leídas sin poder modificar las de otros", async () => {
  const preceptor = userRepository.findByEmail("preceptor@prece.local");
  const director = userRepository.findByEmail("director@prece.local");
  const propia = notificationsRepository.create({
    recipientId: preceptor.id,
    title: "Aviso propio",
    body: "Aviso para preceptoría",
    type: "informacion"
  });
  const ajena = notificationsRepository.create({
    recipientId: director.id,
    title: "Aviso ajeno",
    body: "Aviso para dirección",
    type: "informacion"
  });

  const marcada = await pedir(`/api/v1/notifications/${propia.id}/read`, {
    quien: "preceptor",
    method: "POST"
  });
  assert.equal(marcada.status, 200);
  assert.equal(marcada.cuerpo.data.isRead, true);

  const listaPropia = await pedir("/api/v1/notifications", { quien: "preceptor" });
  assert.equal(listaPropia.status, 200);
  assert.equal(listaPropia.cuerpo.data.notifications.find((item) => item.id === propia.id).isRead, true);

  const prohibida = await pedir(`/api/v1/notifications/${ajena.id}/read`, {
    quien: "preceptor",
    method: "POST"
  });
  assert.equal(prohibida.status, 403);
});

test("/me devuelve roles y permisos del usuario, sin datos sensibles", async () => {
  const { status, cuerpo } = await pedir("/api/v1/authorization/me", { quien: "preceptor" });
  const texto = JSON.stringify(cuerpo);

  assert.equal(status, 200);
  assert.equal(cuerpo.data.roles[0].codigo, "preceptor");
  assert.ok(cuerpo.data.permisos.includes("students.read"));
  assert.ok(!texto.includes("password"));
  assert.ok(!texto.includes("hash"));
  assert.ok(!texto.includes("token"));
});

test("los permisos no se pueden inyectar desde el cliente", async () => {
  const { status } = await pedir("/api/v1/authorization/roles", {
    quien: "preceptor",
    headers: { "X-Permisos": "identity.read" }
  });

  assert.equal(status, 403);
});

test("el catalogo de permisos se expone con modulo y accion", async () => {
  const { status, cuerpo } = await pedir("/api/v1/authorization/permissions", { quien: "director" });

  assert.equal(status, 200);
  assert.ok(cuerpo.data.every((permiso) => permiso.id === `${permiso.modulo}.${permiso.accion}`));
  assert.ok(cuerpo.data.some((permiso) => permiso.id === "academic-records.read"));
});

test("el preceptor solo ve los cursos que le asigno la Direccion", async () => {
  const divisiones = await pedir("/api/v1/students/divisions", { quien: "preceptor" });
  assert.equal(divisiones.status, 200);
  assert.deepEqual(divisiones.cuerpo.data.map((division) => division.id), ["1-1"]);

  const misCursos = await pedir("/api/v1/preceptores/mis-cursos", { quien: "preceptor" });
  assert.deepEqual(misCursos.cuerpo.data.map((curso) => curso.id), ["1-1"]);

  const alumnos = await pedir("/api/v1/students?porPagina=100", { quien: "preceptor" });
  assert.ok(alumnos.cuerpo.data.every((alumno) => alumno.curso === "1°" && String(alumno.division) === "1"));

  const ajeno = await pedir("/api/v1/students?curso=2&division=1", { quien: "preceptor" });
  assert.equal(ajeno.status, 403);
});

test("una asignación con divisiones repetidas se guarda sin duplicados y sigue al iniciar sesión de nuevo", async () => {
  const preceptor = userRepository.findByEmail("preceptor@prece.local");
  const asignacion = await pedir("/api/v1/preceptores/asignaciones", {
    quien: "director",
    method: "PUT",
    body: { divisiones: ["1-1", "1-1"], preceptorId: preceptor.id }
  });

  assert.equal(asignacion.status, 200);
  const asignacionGuardada = userRepository.findById(preceptor.id).assignments.find((item) => item.role === "preceptor");
  assert.equal(asignacionGuardada.cursos.filter((curso) => curso.curso === 1 && curso.division === "1").length, 1);

  tokens.preceptor = await login("preceptor@prece.local", "Preceptor123!");
  const misCursos = await pedir("/api/v1/preceptores/mis-cursos", { quien: "preceptor" });
  assert.deepEqual(misCursos.cuerpo.data.map((curso) => curso.id), ["1-1"]);
});

test("Preceptor no puede cargar alumnos ni aunque se le agregue students.write", async () => {
  const permisos = [...permissionsForRole("preceptor"), "students.write"];
  const actualizarPermisos = await pedir("/api/v1/authorization/roles/preceptor/permissions", {
    quien: "director",
    method: "PUT",
    body: { permisos }
  });

  assert.equal(actualizarPermisos.status, 200);
  const alta = await pedir("/api/v1/students", {
    quien: "preceptor",
    method: "POST",
    body: {}
  });

  assert.equal(alta.status, 403);
  assert.equal(alta.cuerpo.error.code, "PRECEPTOR_CANNOT_CREATE_STUDENTS");
});

test("Preceptor no puede autoasignarse cursos ni crear estructura académica", async () => {
  const permisos = [...permissionsForRole("preceptor"), "identity.manage", "academics.write"];
  const actualizarPermisos = await pedir("/api/v1/authorization/roles/preceptor/permissions", {
    quien: "director",
    method: "PUT",
    body: { permisos }
  });
  assert.equal(actualizarPermisos.status, 200);

  const preceptor = userRepository.findByEmail("preceptor@prece.local");
  const autoasignacion = await pedir("/api/v1/preceptores/asignaciones", {
    quien: "preceptor",
    method: "PUT",
    body: { divisiones: ["2-1"], preceptorId: preceptor.id }
  });
  assert.equal(autoasignacion.status, 403);
  assert.equal(autoasignacion.cuerpo.error.code, "PRECEPTOR_ASSIGNMENTS_MANAGED_BY_DIRECTOR");

  const altaDivision = await pedir("/api/v1/divisiones", {
    quien: "preceptor",
    method: "POST",
    body: { cursoId: "cur-1", nombre: "7ma" }
  });
  assert.equal(altaDivision.status, 403);
  assert.equal(altaDivision.cuerpo.error.code, "PRECEPTOR_ASSIGNMENTS_MANAGED_BY_DIRECTOR");
});
