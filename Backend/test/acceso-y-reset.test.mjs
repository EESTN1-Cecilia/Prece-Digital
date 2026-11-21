/* Control de acceso: nadie sin credenciales validas entra a la API, y el
   reseteo de contrasenas del personal solo lo hace Direccion/Administracion. */

import assert from "node:assert/strict";
import test, { after, before, beforeEach } from "node:test";
import { createApp } from "../src/app.mjs";
import { apiRoutes } from "../routes/index.mjs";
import { resetStore } from "../database/memory-store.mjs";
import { seedAuthData } from "../database/seeds/auth.seed.mjs";
import { userRepository } from "../database/repositories/user.repository.mjs";

const PUERTO = 4031;
const base = `http://127.0.0.1:${PUERTO}`;
const RUTAS_PUBLICAS = new Set([
  "GET /health",
  "GET /api/v1/modules",
  "GET /api/v1/roles",
  "POST /api/v1/auth/login",
  "POST /api/v1/auth/refresh",
  "POST /api/v1/auth/logout"
]);
let servidor;
const sesiones = {};

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

async function pedir(method, ruta, token, body) {
  const respuesta = await fetch(`${base}${ruta}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(method !== "GET" ? { "Content-Type": "application/json" } : {})
    },
    body: method !== "GET" ? JSON.stringify(body ?? {}) : undefined
  });
  const texto = await respuesta.text();
  let cuerpo = null;
  try { cuerpo = JSON.parse(texto); } catch { cuerpo = texto; }
  return { status: respuesta.status, cuerpo };
}

beforeEach(async () => {
  resetStore();
  await seedAuthData();
  sesiones.admin = await login("admin@prece.local", "Admin123!");
  sesiones.director = await login("director@prece.local", "Director123!");
  sesiones.docente = await login("docente@prece.local", "Docente123!");
  sesiones.preceptor = await login("preceptor@prece.local", "Preceptor123!");
  sesiones.secretario = await login("secretario@prece.local", "Secretaria123!");
});

const idDe = (email) => userRepository.findByEmail(email, { includeInactive: true }).id;

test("toda ruta de la API, salvo las 6 publicas, rechaza con 401 sin token y con token falso", async () => {
  const protegidas = apiRoutes.filter((ruta) => !RUTAS_PUBLICAS.has(`${ruta.method} ${ruta.path}`));
  assert.ok(protegidas.length > 400);
  const fallas = [];

  for (const ruta of protegidas) {
    const path = ruta.path.replace(/:[A-Za-z]+/g, "x");

    for (const token of [null, "token.falso.invalido"]) {
      const { status } = await pedir(ruta.method, path, token);
      if (status !== 401) fallas.push(`${ruta.method} ${ruta.path} (${token ? "token falso" : "sin token"}) -> ${status}`);
    }
  }

  assert.deepEqual(fallas, []);
});

test("un token sin esquema Bearer o de otra firma no entra", async () => {
  const { status } = await pedir("GET", "/api/v1/users", null);
  assert.equal(status, 401);
  const r = await fetch(`${base}/api/v1/users`, { headers: { Authorization: `Basic ${sesiones.director.accessToken}` } });
  assert.equal(r.status, 401);
});

test("una cuenta desactivada no inicia sesion y su token vigente deja de servir", async () => {
  assert.equal((await login("inactivo@prece.local", "Inactivo123!")).status, 401);

  const id = idDe("docente@prece.local");
  const baja = await pedir("PATCH", `/api/v1/users/${id}/deactivate`, sesiones.director.accessToken);
  assert.equal(baja.status, 200);

  assert.equal((await pedir("GET", "/api/v1/auth/me", sesiones.docente.accessToken)).status, 401);
  const refresco = await fetch(`${base}/api/v1/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken: sesiones.docente.refreshToken })
  });
  assert.equal(refresco.status, 401);
});

test("solo Direccion y Administracion resetean contrasenas: el resto recibe 403", async () => {
  const objetivo = idDe("docente@prece.local");

  for (const quien of ["docente", "preceptor", "secretario"]) {
    const { status } = await pedir("POST", `/api/v1/users/${objetivo}/reset-password`, sesiones[quien].accessToken);
    assert.equal(status, 403, `${quien} no debe poder resetear`);
  }

  /* La clave del docente sigue funcionando: nada cambio. */
  assert.equal((await login("docente@prece.local", "Docente123!")).status, 200);
});

test("el director resetea una clave: devuelve una temporal, cierra sesiones y obliga a cambiarla", async () => {
  const objetivo = idDe("docente@prece.local");
  const { status, cuerpo } = await pedir("POST", `/api/v1/users/${objetivo}/reset-password`, sesiones.director.accessToken);

  assert.equal(status, 200);
  assert.ok(cuerpo.data.passwordTemporal.length >= 10);
  assert.equal(JSON.stringify(cuerpo).includes("passwordHash"), false);

  /* La clave vieja ya no entra; la temporal si, y queda marcada para cambio. */
  assert.equal((await login("docente@prece.local", "Docente123!")).status, 401);
  const nueva = await login("docente@prece.local", cuerpo.data.passwordTemporal);
  assert.equal(nueva.status, 200);
  assert.equal(nueva.debeCambiarPassword, true);

  /* La sesion que el docente tenia abierta quedo revocada. */
  const refresco = await fetch(`${base}/api/v1/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken: sesiones.docente.refreshToken })
  });
  assert.equal(refresco.status, 401);

  /* Al elegir su propia clave la marca se limpia. */
  const cambio = await pedir("PATCH", `/api/v1/users/${objetivo}`, nueva.accessToken, { password: "ClaveNueva2026!" });
  assert.equal(cambio.status, 200);
  assert.equal(cambio.cuerpo.data.debeCambiarPassword, false);
});

test("el reseteo tiene limites: no a uno mismo, no a administradores salvo admin, no a cuentas inactivas ni inexistentes", async () => {
  const dir = sesiones.director.accessToken;

  assert.equal((await pedir("POST", `/api/v1/users/${idDe("director@prece.local")}/reset-password`, dir)).status, 403);
  assert.equal((await pedir("POST", `/api/v1/users/${idDe("admin@prece.local")}/reset-password`, dir)).status, 403);
  assert.equal((await pedir("POST", `/api/v1/users/${idDe("inactivo@prece.local")}/reset-password`, dir)).status, 409);
  assert.equal((await pedir("POST", "/api/v1/users/usr_inexistente/reset-password", dir)).status, 404);

  const admin = await pedir("POST", `/api/v1/users/${idDe("director@prece.local")}/reset-password`, sesiones.admin.accessToken);
  assert.equal(admin.status, 200);
});
