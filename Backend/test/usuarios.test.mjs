/* Gestion de usuarios (modulo Identidad): alta, consulta, edicion, estado y roles. */

import assert from "node:assert/strict";
import test, { after, before, beforeEach } from "node:test";
import { createApp } from "../src/app.mjs";
import { apiRoutes } from "../routes/index.mjs";
import { resetStore } from "../database/memory-store.mjs";
import { seedAuthData } from "../database/seeds/auth.seed.mjs";

const PUERTO = 4011;
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
  return respuesta.json();
}

beforeEach(async () => {
  resetStore();
  await seedAuthData();
  tokens.director = (await login("director@prece.local", "Director123!")).accessToken;
  tokens.secretario = (await login("secretario@prece.local", "Secretaria123!")).accessToken;
});

async function pedir(method, ruta, quien, body) {
  const respuesta = await fetch(`${base}${ruta}`, {
    method,
    headers: {
      Authorization: `Bearer ${tokens[quien]}`,
      ...(body ? { "Content-Type": "application/json" } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  return { status: respuesta.status, cuerpo: await respuesta.json() };
}

const NUEVO = { nombre: "Lucia", apellido: "Gimenez", email: "lgimenez@prece.local", dni: "30111222", roles: ["preceptor"] };

test("el alta crea la cuenta con contrasena temporal y sin exponer el hash", async () => {
  const { status, cuerpo } = await pedir("POST", "/api/v1/users", "director", NUEVO);

  assert.equal(status, 201);
  assert.deepEqual(cuerpo.data.roles, ["preceptor"]);
  assert.equal(cuerpo.data.estado, "activo");
  assert.ok(cuerpo.data.passwordTemporal);
  assert.ok(!JSON.stringify(cuerpo).includes("passwordHash"));

  const sesion = await login(NUEVO.email, cuerpo.data.passwordTemporal);
  assert.ok(sesion.accessToken, "la contrasena temporal permite iniciar sesion");
});

test("el alta valida campos, roles y correo duplicado", async () => {
  const invalido = await pedir("POST", "/api/v1/users", "director", { email: "x", roles: ["inventado"] });
  assert.equal(invalido.status, 422);
  assert.ok(invalido.cuerpo.error.details.some((detalle) => detalle.field === "roles"));

  const duplicado = await pedir("POST", "/api/v1/users", "director", { ...NUEVO, email: "director@prece.local" });
  assert.equal(duplicado.status, 409);
});

test("secretaria puede consultar pero no crear usuarios", async () => {
  const lista = await pedir("GET", "/api/v1/users?rol=docente", "secretario");
  const alta = await pedir("POST", "/api/v1/users", "secretario", NUEVO);

  assert.equal(lista.status, 200);
  assert.ok(lista.cuerpo.data.every((usuario) => usuario.roles.includes("docente")));
  assert.equal(alta.status, 403);
});

test("consultar, editar, cambiar roles y desactivar", async () => {
  const { cuerpo } = await pedir("POST", "/api/v1/users", "director", NUEVO);
  const id = cuerpo.data.id;

  const detalle = await pedir("GET", `/api/v1/users/${id}`, "director");
  assert.equal(detalle.cuerpo.data.email, NUEVO.email);

  const editado = await pedir("PATCH", `/api/v1/users/${id}`, "director", { telefono: "11 5555-0000", apellido: "Gimenez Paz" });
  assert.equal(editado.status, 200);
  assert.equal(editado.cuerpo.data.displayName, "Lucia Gimenez Paz");

  const roles = await pedir("PUT", `/api/v1/users/${id}/roles`, "director", { roles: ["docente", "preceptor"] });
  assert.deepEqual(roles.cuerpo.data.roles, ["docente", "preceptor"]);

  const baja = await pedir("PATCH", `/api/v1/users/${id}`, "director", { estado: "inactivo" });
  assert.equal(baja.cuerpo.data.estado, "inactivo");

  const inexistente = await pedir("GET", "/api/v1/users/usr_999", "director");
  assert.equal(inexistente.status, 404);
});
