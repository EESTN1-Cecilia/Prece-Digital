/* Seguridad HTTP, CORS, limites y configuracion de produccion: npm test */

import assert from "node:assert/strict";
import { request as httpRequest } from "node:http";
import test, { after, before } from "node:test";
import { assertProductionConfig } from "../config/app.config.mjs";
import { seedProductionAdmin } from "../database/seeds/auth.seed.mjs";
import { resetStore } from "../database/memory-store.mjs";
import { userRepository } from "../database/repositories/user.repository.mjs";
import { applyCors } from "../middlewares/cors.middleware.mjs";
import { crearLimitador } from "../middlewares/rate-limit.middleware.mjs";
import { applySecurityHeaders } from "../middlewares/security-headers.middleware.mjs";
import { createApp } from "../src/app.mjs";
import { obtenerIpCliente } from "../utils/client-ip.mjs";
import { rutas } from "./helpers.mjs";

const PUERTO = 3998;
const base = `http://127.0.0.1:${PUERTO}`;
let servidor;

function respuestaFalsa() {
  const headers = {};
  return { headers, setHeader: (nombre, valor) => { headers[nombre] = valor; } };
}

function pedidoCrudo(opciones) {
  return new Promise((listo, fallo) => {
    const pedido = httpRequest({ port: PUERTO, path: "/ok", ...opciones }, (r) => { r.resume(); listo(r.statusCode); });
    pedido.on("error", fallo);
    pedido.end();
  });
}

before(async () => {
  servidor = createApp(rutas({ "POST /eco": ({ body }) => body, "GET /ok": () => ({ ok: true }) }));
  await new Promise((listo) => servidor.listen(PUERTO, listo));
});

after(() => new Promise((listo) => servidor.close(listo)));

test("toda respuesta lleva los headers de seguridad", async () => {
  const respuesta = await fetch(`${base}/ok`);
  assert.equal(respuesta.headers.get("x-content-type-options"), "nosniff");
  assert.equal(respuesta.headers.get("cache-control"), "no-store");
  assert.equal(respuesta.headers.get("strict-transport-security"), null);
});

test("HSTS solo se envia en produccion", () => {
  const respuesta = respuestaFalsa();
  applySecurityHeaders(respuesta, "production");
  assert.ok(respuesta.headers["Strict-Transport-Security"]);
});

test("un metodo no permitido responde 405", async () => {
  assert.equal(await pedidoCrudo({ method: "TRACE" }), 405);
});

test("rechaza cuerpo sin JSON y cuerpo que no es objeto", async () => {
  const texto = await fetch(`${base}/eco`, { method: "POST", headers: { "Content-Type": "text/plain" }, body: "{}" });
  assert.equal(texto.status, 415);

  const lista = await fetch(`${base}/eco`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "[1]" });
  assert.equal(lista.status, 400);
});

test("rechaza campos que define el servidor y claves de prototipo", async () => {
  const enviar = (cuerpo) => fetch(`${base}/eco`, { method: "POST", headers: { "Content-Type": "application/json" }, body: cuerpo });

  const reservado = await enviar('{"nombre":"Ana","createdBy":"otro"}');
  assert.equal(reservado.status, 422);
  assert.equal((await reservado.json()).error.details[0].field, "createdBy");

  assert.equal((await enviar('{"a":{"__proto__":{"admin":true}}}')).status, 400);
  assert.equal((await enviar('{"nombre":"Ana"}')).status, 200);
});

test("un Host invalido no tira el servidor", async () => {
  assert.ok((await pedidoCrudo({ headers: { Host: "a b" } })) < 500);
  assert.equal((await fetch(`${base}/ok`)).status, 200);
});

test("CORS solo autoriza los origenes de la lista", () => {
  const permitido = respuestaFalsa();
  applyCors({ headers: { origin: "https://app.escuela.edu" } }, permitido, ["https://app.escuela.edu"]);
  assert.equal(permitido.headers["Access-Control-Allow-Origin"], "https://app.escuela.edu");

  const ajeno = respuestaFalsa();
  applyCors({ headers: { origin: "https://malo.example" } }, ajeno, ["https://app.escuela.edu"]);
  assert.equal(ajeno.headers["Access-Control-Allow-Origin"], undefined);
  assert.equal(ajeno.headers.Vary, "Origin");
});

test("el limite responde 429 con Retry-After y no se evade con X-Forwarded-For", () => {
  const limitar = crearLimitador({ ventanaMs: 60000, auth: 2, lectura: 100, escritura: 100 });
  const pedido = (ip) => ({ method: "POST", headers: { "x-forwarded-for": ip }, socket: { remoteAddress: "10.0.0.1" } });
  const respuesta = respuestaFalsa();

  limitar(pedido("1.1.1.1"), respuesta, "/api/v1/auth/login");
  limitar(pedido("2.2.2.2"), respuesta, "/api/v1/auth/login");
  assert.throws(() => limitar(pedido("3.3.3.3"), respuesta, "/api/v1/auth/login"), { code: "RATE_LIMITED" });
  assert.ok(Number(respuesta.headers["Retry-After"]) > 0);
});

test("X-Forwarded-For solo se usa con TRUST_PROXY", () => {
  const pedido = { headers: { "x-forwarded-for": "1.1.1.1, 2.2.2.2" }, socket: { remoteAddress: "10.0.0.1" } };
  assert.equal(obtenerIpCliente(pedido, false), "10.0.0.1");
  assert.equal(obtenerIpCliente(pedido, true), "1.1.1.1");
});

test("produccion no arranca con CORS abierto ni base sin credenciales", () => {
  assert.throws(() => assertProductionConfig({ env: "production", corsOrigins: [] }));
  assert.throws(() => assertProductionConfig({ env: "production", corsOrigins: ["*"] }));
  assert.throws(() => assertProductionConfig({ env: "production", corsOrigins: ["https://a.edu"], database: { DB_CLIENT: "sqlserver" } }));
  assert.doesNotThrow(() => assertProductionConfig({ env: "production", corsOrigins: ["https://a.edu"], database: {} }));
});

test("produccion solo crea el administrador inicial y exige contrasenia", async () => {
  resetStore();
  await assert.rejects(seedProductionAdmin({ email: "a@b.c", password: "corta" }));
  await seedProductionAdmin({ email: "admin@escuela.edu", password: "una-clave-larga-1" });
  const usuarios = userRepository.list({ includeInactive: true });
  assert.deepEqual(usuarios.map((u) => u.email), ["admin@escuela.edu"]);
  resetStore();
});
