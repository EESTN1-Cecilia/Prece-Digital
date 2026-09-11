/* Autenticacion: login, logout, refresh, JWT, hash de contrasenas, proteccion
   contra fuerza bruta y criterios de aceptacion del modulo auth.

   Corre sin base de datos: los repositorios de auth usan el store en memoria. */

import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test, { after, before, beforeEach } from "node:test";
import bcrypt from "bcryptjs";
import { createApp } from "../src/app.mjs";
import { apiRoutes } from "../routes/index.mjs";
import { appConfig, assertValidSecrets } from "../config/app.config.mjs";
import { resetStore } from "../database/memory-store.mjs";
import { userRepository } from "../database/repositories/user.repository.mjs";
import { seedAuthData } from "../database/seeds/auth.seed.mjs";

const PUERTO = 3999;
const base = `http://127.0.0.1:${PUERTO}`;

let servidor;

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
});

async function pedir(ruta, opciones) {
  const respuesta = await fetch(`${base}${ruta}`, opciones);
  const texto = await respuesta.text();
  return { status: respuesta.status, cuerpo: texto ? JSON.parse(texto) : null };
}

function login(cuerpo) {
  return pedir("/api/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cuerpo)
  });
}

function me(token) {
  return pedir("/api/v1/auth/me", { headers: { Authorization: `Bearer ${token}` } });
}

function decodeAccessToken(token) {
  const [cabecera, cuerpo] = token.split(".");
  assert.ok(cabecera && cuerpo, "el token debe tener tres partes");
  return JSON.parse(Buffer.from(cuerpo, "base64url").toString("utf8"));
}

/* Arma un token HS256 con un payload arbitrario (para simular tokens firmados o
   vencidos sin pasar por el servicio). */
function rawToken(payload, secret) {
  const cabecera = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const cuerpo = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const firma = createHmac("sha256", secret).update(`${cabecera}.${cuerpo}`).digest("base64url");
  return `${cabecera}.${cuerpo}.${firma}`;
}

test("un usuario con credenciales válidas inicia sesión y recibe tokens", async () => {
  const { status, cuerpo } = await login({ email: "director@prece.local", password: "Director123!" });

  assert.equal(status, 200);
  assert.ok(typeof cuerpo.accessToken === "string");
  assert.ok(typeof cuerpo.refreshToken === "string");
  assert.equal(cuerpo.tokenType, "Bearer");
  assert.equal(cuerpo.user.email, "director@prece.local");
  assert.ok(Array.isArray(cuerpo.roles) && cuerpo.roles.includes("director"));
  assert.ok(!JSON.stringify(cuerpo).includes("password"));
  assert.ok(!JSON.stringify(cuerpo).includes("hash"));
});

test("credenciales inválidas se rechazan sin revelar si el usuario existe", async () => {
  const inexistente = await login({ email: "nadie@prece.local", password: "LoQueSea123!" });
  const contrasenaErronea = await login({ email: "director@prece.local", password: "NoEsLaClave123!" });

  assert.equal(inexistente.status, 401);
  assert.equal(contrasenaErronea.status, 401);
  assert.equal(inexistente.cuerpo.error.code, "invalid_credentials");
  assert.equal(contrasenaErronea.cuerpo.error.code, "invalid_credentials");
  assert.equal(inexistente.cuerpo.error.message, contrasenaErronea.cuerpo.error.message);
  assert.ok(!JSON.stringify(inexistente.cuerpo).includes("token"));
});

test("los tokens tienen una expiración definida según la configuración", async () => {
  const { cuerpo } = await login({ email: "director@prece.local", password: "Director123!" });
  const payload = decodeAccessToken(cuerpo.accessToken);

  assert.ok(typeof payload.iat === "number");
  assert.ok(typeof payload.exp === "number");
  assert.ok(payload.exp > payload.iat);

  const match = /^(\d+)([smhd])$/.exec(appConfig.jwtAccessExpiresIn);
  assert.ok(match, "JWT_ACCESS_EXPIRES_IN debe tener formato como 15m");
  const multiplicador = { s: 1, m: 60, h: 3600, d: 86400 }[match[2]];
  const esperado = Number.parseInt(match[1], 10) * multiplicador;
  assert.ok(Math.abs(payload.exp - payload.iat - esperado) <= 1);
});

test("el payload del access token no incluye datos sensibles ni de asignación", async () => {
  const { cuerpo } = await login({ email: "docente@prece.local", password: "Docente123!" });
  const payload = decodeAccessToken(cuerpo.accessToken);

  assert.equal(payload.typ, "access");
  assert.equal(payload.sub, userRepository.findByEmail("docente@prece.local").id);
  assert.deepEqual(payload.roles, ["docente"]);
  assert.equal(Object.hasOwn(payload, "assignments"), false);
  assert.equal(Object.hasOwn(payload, "passwordHash"), false);
  assert.equal(Object.hasOwn(payload, "email"), false);
});

test("un token inválido o modificado es rechazado", async () => {
  const { cuerpo } = await login({ email: "director@prece.local", password: "Director123!" });
  const id = userRepository.findByEmail("director@prece.local").id;

  const modificado = `${cuerpo.accessToken.slice(0, -1)}${cuerpo.accessToken.endsWith("a") ? "b" : "a"}`;
  const conOtraClave = rawToken({ sub: id, typ: "access", roles: ["DIRECTOR"] }, "clave-distinta");
  const malFormado = "solo-dos-partes";

  assert.equal((await me(modificado)).status, 401);
  assert.equal((await me(conOtraClave)).status, 401);
  assert.equal((await me(malFormado)).status, 401);
});

test("un token expirado es rechazado", async () => {
  const id = userRepository.findByEmail("director@prece.local").id;
  const ahora = Math.floor(Date.now() / 1000);
  const vencido = rawToken({ sub: id, typ: "access", iat: ahora - 1000, exp: ahora - 500 }, appConfig.jwtAccessSecret);

  const { status, cuerpo } = await me(vencido);

  assert.equal(status, 401);
  assert.equal(cuerpo.error.code, "invalid_token");
});

test("los endpoints protegidos no se ejecutan sin un token válido", async () => {
  const sinToken = await pedir("/api/v1/users");
  const tokenChatarra = await pedir("/api/v1/users", { headers: { Authorization: "Bearer chatarra" } });

  assert.equal(sinToken.status, 401);
  assert.equal(tokenChatarra.status, 401);
});

test("GET /auth/me identifica al usuario a partir del token", async () => {
  const { cuerpo } = await login({ email: "director@prece.local", password: "Director123!" });
  const payload = decodeAccessToken(cuerpo.accessToken);
  const { status, cuerpo: perfil } = await me(cuerpo.accessToken);

  assert.equal(status, 200);
  assert.equal(perfil.data.user.id, payload.sub);
  assert.equal(perfil.data.email, "director@prece.local");
  assert.ok(perfil.data.roles.includes("director"));
  assert.ok(Array.isArray(perfil.data.permisos) && perfil.data.permisos.length > 0);
});

test("GET /auth/me no expone contraseñas, hashes ni tokens", async () => {
  const { cuerpo } = await login({ email: "director@prece.local", password: "Director123!" });
  const { cuerpo: perfil } = await me(cuerpo.accessToken);
  const texto = JSON.stringify(perfil);

  assert.ok(!texto.includes("password"));
  assert.ok(!texto.includes("passwordHash"));
  assert.ok(!texto.includes("token"));
});

test("las contraseñas se guardan como hash bcrypt y nunca en texto plano", async () => {
  const director = userRepository.findByEmail("director@prece.local");

  assert.notEqual(director.passwordHash, "Director123!");
  assert.match(director.passwordHash, /^\$2/);
  assert.equal(await bcrypt.compare("Director123!", director.passwordHash), true);
});

test("en producción se exige definir los JWT por variables de entorno", () => {
  const fuertes = { jwtAccessSecret: "clave-acceso-secreta-0123", jwtRefreshSecret: "clave-refresh-secreta-0123" };

  assert.throws(() => assertValidSecrets({ env: "production", ...fuertes, jwtRefreshSecret: "corta" }), /JWT_REFRESH_SECRET/);
  assert.throws(() => assertValidSecrets({ env: "production", jwtAccessSecret: "change-me-access", jwtRefreshSecret: fuertes.jwtRefreshSecret }), /JWT_ACCESS_SECRET/);
  assert.doesNotThrow(() => assertValidSecrets({ env: "production", ...fuertes }));
  assert.doesNotThrow(() => assertValidSecrets({ env: "development", jwtAccessSecret: "change-me-access", jwtRefreshSecret: "change-me-refresh" }));
});

test("los intentos fallidos bloquean temporalmente la cuenta", async () => {
  const limite = appConfig.loginMaxEmailAttempts;

  for (let i = 0; i < limite; i++) {
    const fallido = await login({ email: "director@prece.local", password: "MalPassword123!" });
    assert.equal(fallido.status, 401);
  }

  const bloqueado = await login({ email: "director@prece.local", password: "Director123!" });

  assert.equal(bloqueado.status, 429);
  assert.equal(bloqueado.cuerpo.error.code, "TOO_MANY_ATTEMPTS");
  assert.ok(Number.isInteger(bloqueado.cuerpo.error.details?.retryAfter) && bloqueado.cuerpo.error.details.retryAfter > 0);
});

test("un login exitoso despeja el contador de intentos de la cuenta", async () => {
  const limite = appConfig.loginMaxEmailAttempts;

  for (let i = 0; i < limite - 1; i++) {
    await login({ email: "preceptor@prece.local", password: "MalPassword123!" });
  }

  assert.equal((await login({ email: "preceptor@prece.local", password: "Preceptor123!" })).status, 200);

  for (let i = 0; i < limite - 1; i++) {
    await login({ email: "preceptor@prece.local", password: "MalPassword123!" });
  }

  assert.equal((await login({ email: "preceptor@prece.local", password: "Preceptor123!" })).status, 200);
});

test("el origen IP también se bloquea tras muchos intentos con cuentas distintas", async () => {
  const limite = appConfig.loginMaxIpAttempts;

  for (let i = 0; i < limite; i++) {
    const fallido = await login({ email: `desconocido-${i}@prece.local`, password: "MalPassword123!" });
    assert.equal(fallido.status, 401);
  }

  const bloqueado = await login({ email: "director@prece.local", password: "Director123!" });

  assert.equal(bloqueado.status, 429);
  assert.equal(bloqueado.cuerpo.error.code, "TOO_MANY_ATTEMPTS");
});

test("refresh rota el token y el logout revoca la sesión", async () => {
  const { cuerpo } = await login({ email: "director@prece.local", password: "Director123!" });

  const rotado = await pedir("/api/v1/auth/refresh", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken: cuerpo.refreshToken })
  });
  assert.equal(rotado.status, 200);
  assert.ok(rotado.cuerpo.accessToken);
  assert.notEqual(rotado.cuerpo.refreshToken, cuerpo.refreshToken);

  const reuso = await pedir("/api/v1/auth/refresh", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken: cuerpo.refreshToken })
  });
  assert.equal(reuso.status, 401);

  const salida = await pedir("/api/v1/auth/logout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken: rotado.cuerpo.refreshToken })
  });
  assert.equal(salida.status, 200);
  assert.equal(salida.cuerpo.ok, true);

  const trasLogout = await pedir("/api/v1/auth/refresh", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken: rotado.cuerpo.refreshToken })
  });
  assert.equal(trasLogout.status, 401);
});
