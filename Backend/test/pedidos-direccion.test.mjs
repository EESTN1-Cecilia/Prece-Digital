import assert from "node:assert/strict";
import test, { after, before, beforeEach } from "node:test";
import { createApp } from "../src/app.mjs";
import { apiRoutes } from "../routes/index.mjs";
import { seedAuthData } from "../database/seeds/auth.seed.mjs";
import { vaciarPedidos } from "../modules/director/pedidos-direccion.service.mjs";
import { getStore } from "../database/memory-store.mjs";

const PUERTO = 4032;
const base = `http://127.0.0.1:${PUERTO}`;
let servidor;
let director;
let preceptor;
let secretaria;

async function login(email, password) {
  const r = await fetch(`${base}/api/v1/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password }) });
  assert.equal(r.status, 200);
  return (await r.json()).accessToken;
}

async function pedir(metodo, ruta, token, cuerpo) {
  const cabeceras = { authorization: `Bearer ${token}` };
  if (cuerpo !== undefined) cabeceras["content-type"] = "application/json";
  const r = await fetch(`${base}${ruta}`, { method: metodo, headers: cabeceras, body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo) });
  return { status: r.status, cuerpo: await r.json() };
}

const nuevo = { titulo: "Justificación por licencia", detalle: "Certificado médico presentado por la familia", tipo: "justificacion_asistencia", alcance: "1° 1°" };

before(async () => {
  await seedAuthData();
  servidor = createApp(apiRoutes);
  await new Promise((listo) => servidor.listen(PUERTO, listo));
  director = await login("director@prece.local", "Director123!");
  preceptor = await login("preceptor@prece.local", "Preceptor123!");
  secretaria = await login("secretaria@prece.local", "Secretaria123!");
});

after(async () => {
  await new Promise((listo) => servidor.close(listo));
});

beforeEach(() => vaciarPedidos());

test("un sector crea un pedido y la Direccion lo ve; empieza sin datos inventados", async () => {
  assert.deepEqual((await pedir("GET", "/api/v1/pedidos-direccion", director)).cuerpo.data, []);
  const creado = await pedir("POST", "/api/v1/pedidos-direccion", preceptor, nuevo);
  assert.equal(creado.status, 201, JSON.stringify(creado.cuerpo));
  assert.equal(creado.cuerpo.data.sector, "Preceptoría");
  assert.equal(creado.cuerpo.data.estado, "pendiente");
  assert.match(creado.cuerpo.data.codigo, /^PED-\d{4}-001$/);
  assert.equal(getStore().pedidosDireccion.size, 1, "queda en la coleccion que se guarda en SQL Server");

  const lista = await pedir("GET", "/api/v1/pedidos-direccion", director);
  assert.equal(lista.cuerpo.data.length, 1);
  /* Otro sector no ve pedidos ajenos. */
  assert.equal((await pedir("GET", "/api/v1/pedidos-direccion", secretaria)).cuerpo.data.length, 0);
});

test("solo Direccion aprueba o rechaza, el rechazo exige motivo y no se resuelve dos veces", async () => {
  const { cuerpo } = await pedir("POST", "/api/v1/pedidos-direccion", preceptor, nuevo);
  const id = cuerpo.data.id;
  assert.equal((await pedir("POST", `/api/v1/pedidos-direccion/${id}/aprobar`, preceptor)).status, 403);
  assert.equal((await pedir("POST", `/api/v1/pedidos-direccion/${id}/rechazar`, director, {})).status, 422);

  const aprobado = await pedir("POST", `/api/v1/pedidos-direccion/${id}/aprobar`, director);
  assert.equal(aprobado.status, 200);
  assert.equal(aprobado.cuerpo.data.estado, "aprobado");
  assert.ok(aprobado.cuerpo.data.resueltoEn);
  assert.ok(aprobado.cuerpo.data.resueltoPor);

  assert.equal((await pedir("POST", `/api/v1/pedidos-direccion/${id}/rechazar`, director, { motivo: "Tarde" })).status, 409);
  assert.equal((await pedir("POST", "/api/v1/pedidos-direccion/no-existe/aprobar", director)).status, 404);
});

test("valida los datos del pedido", async () => {
  assert.equal((await pedir("POST", "/api/v1/pedidos-direccion", preceptor, { titulo: "x", detalle: "y" })).status, 422);
  assert.equal((await pedir("POST", "/api/v1/pedidos-direccion", preceptor, { ...nuevo, tipo: "inventado" })).status, 422);
});
