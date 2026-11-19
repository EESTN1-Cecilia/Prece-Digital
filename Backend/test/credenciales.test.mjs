/* Credenciales (SuperAdmin): asignar usuarios y restablecer contraseñas. */

import assert from "node:assert/strict";
import test, { after, before, beforeEach } from "node:test";
import { createApp } from "../src/app.mjs";
import { apiRoutes } from "../routes/index.mjs";
import { resetStore } from "../database/memory-store.mjs";
import { seedAuthData, seedSuperAdmin } from "../database/seeds/auth.seed.mjs";

const PUERTO = 4027;
const base = `http://127.0.0.1:${PUERTO}`;
const CLAVE_SA = "Clave-De-Prueba-123";
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
  return { status: respuesta.status, ...(await respuesta.json()) };
}

async function pedir(method, ruta, quien, body) {
  const respuesta = await fetch(`${base}${ruta}`, {
    method,
    headers: { Authorization: `Bearer ${tokens[quien]}`, ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined
  });
  return { status: respuesta.status, cuerpo: await respuesta.json() };
}

beforeEach(async () => {
  resetStore();
  await seedAuthData();
  await seedSuperAdmin({ usuario: "SuperAdmin", password: CLAVE_SA });
  tokens.superadmin = (await login("SuperAdmin", CLAVE_SA)).accessToken;
  tokens.director = (await login("director@prece.local", "Director123!")).accessToken;
});

test("sin SUPERADMIN_PASSWORD no se crea el perfil", async () => {
  resetStore();
  assert.equal(await seedSuperAdmin({ usuario: "SuperAdmin", password: "" }), false);
});

test("el superadmin entra con su usuario y la clave configurada", async () => {
  const sesion = await login("superadmin", CLAVE_SA);
  assert.equal(sesion.status, 200);
  assert.ok(sesion.accessToken);
});

test("el director no accede a la gestion de credenciales", async () => {
  const { status } = await pedir("GET", "/api/v1/credentials?tipo=personal", "director");
  assert.equal(status, 403);
});

test("el superadmin restablece la contraseña del personal con una temporal", async () => {
  const lista = await pedir("GET", "/api/v1/credentials?tipo=personal", "superadmin");
  const docente = lista.cuerpo.data.cuentas.find((cuenta) => cuenta.usuario === "docente@prece.local");
  const { status, cuerpo } = await pedir("POST", `/api/v1/credentials/personal/${docente.id}`, "superadmin", { generar: true });

  assert.equal(status, 200);
  assert.ok(cuerpo.data.passwordTemporal);
  assert.equal((await login("docente@prece.local", "Docente123!")).status, 401);
  assert.equal((await login("docente@prece.local", cuerpo.data.passwordTemporal)).status, 200);
});

test("nadie mas puede tocar la cuenta del superadmin", async () => {
  const lista = await pedir("GET", "/api/v1/credentials?tipo=personal", "superadmin");
  const sa = lista.cuerpo.data.cuentas.find((cuenta) => cuenta.roles.includes("superadmin"));
  const { status } = await pedir("PATCH", `/api/v1/users/${sa.id}`, "director", { nombre: "X" });
  assert.equal(status, 403);
});

test("el director no puede darse el rol superadmin", async () => {
  const { status } = await pedir("POST", "/api/v1/users", "director", {
    nombre: "Ana",
    apellido: "Paz",
    email: "ana@prece.local",
    dni: "30111999",
    roles: ["superadmin"]
  });
  assert.equal(status, 422);
});
