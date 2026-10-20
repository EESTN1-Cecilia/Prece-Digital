/* Gestion de dispositivos para preparacion de notificaciones push.
   Modules/devices contra las rutas reales de la API comun:
   registro idempotente por instalacion, propiedad fijada por el token y
   desasociacion solo del device propio. */

import assert from "node:assert/strict";
import test, { after, before, beforeEach } from "node:test";
import { createApp } from "../src/app.mjs";
import { apiRoutes } from "../routes/index.mjs";
import { resetStore, getStore } from "../database/memory-store.mjs";
import { seedAuthData } from "../database/seeds/auth.seed.mjs";
import auditService from "../modules/audit/audit.service.mjs";

const PUERTO = 4075;
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
  tokens.secretario = (await login("secretaria@prece.local", "Secretaria123!")).accessToken;
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

const REGISTRO = {
  installationId: "expo-install-abc123",
  platform: "android",
  pushToken: "ExponentPushToken[abcDEF123]"
};

test("registra una instalacion nueva para el usuario del token", async () => {
  const { status, cuerpo } = await pedir("POST", "/api/v1/devices", "secretario", REGISTRO);

  assert.equal(status, 201);
  assert.equal(cuerpo.data.installationId, REGISTRO.installationId);
  assert.equal(cuerpo.data.platform, "android");
  assert.equal(cuerpo.data.isActive, true);
  assert.equal(cuerpo.data.hasPushToken, true);

  /* El token nunca sale en la respuesta. */
  const volcado = JSON.stringify(cuerpo);
  assert.equal(volcado.includes(REGISTRO.pushToken), false);

  /* La propiedad la fija el Backend: director del login, no del cuerpo. */
  const quien = await pedir("GET", "/api/v1/auth/me", "secretario");
  assert.equal(cuerpo.data.userId, quien.cuerpo.data.user.id);
});

test("rechaza el registro sin autenticacion", async () => {
  const respuesta = await fetch(`${base}/api/v1/devices`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(REGISTRO)
  });

  assert.equal(respuesta.status, 401);
  const cuerpo = await respuesta.json();
  assert.equal(cuerpo.error.code, "MISSING_TOKEN");
});

test("valida campos obligatorios y valores permitidos", async () => {
  const casoss = [
    { installationId: "", platform: "android" },
    { installationId: REGISTRO.installationId },
    { installationId: "inst con espacio", platform: "android" },
    { installationId: REGISTRO.installationId, platform: "windows" },
    { installationId: REGISTRO.installationId, platform: "ios", pushToken: "token con espacios" },
    { installationId: REGISTRO.installationId, platform: "ios", pushToken: "" }
  ];

  for (const caso of casoss) {
    const { status, cuerpo } = await pedir("POST", "/api/v1/devices", "secretario", caso);
    assert.equal(status, 422, JSON.stringify(caso));
    assert.equal(cuerpo.error.code, "VALIDATION_ERROR");
    assert.ok(Array.isArray(cuerpo.error.details));
    assert.ok(cuerpo.error.details.some((detalle) => typeof detalle.field === "string"));
  }
});

test("ignora userId que envie el cliente para fijar la propiedad", async () => {
  const { status, cuerpo } = await pedir("POST", "/api/v1/devices", "secretario", {
    ...REGISTRO,
    userId: "usr_1",
    recipientId: "usr_1"
  });

  assert.equal(status, 201);
  const quien = await pedir("GET", "/api/v1/auth/me", "secretario");
  assert.equal(cuerpo.data.userId, quien.cuerpo.data.user.id);
  assert.notEqual(cuerpo.data.userId, "usr_1");
});

test("el registro repetido de la misma cuenta es idempotente", async () => {
  const primera = await pedir("POST", "/api/v1/devices", "secretario", REGISTRO);
  assert.equal(primera.status, 201);

  const repetido = await pedir("POST", "/api/v1/devices", "secretario", {
    ...REGISTRO,
    platform: "ios",
    pushToken: "ExponentPushToken[nuevoToken456]"
  });
  assert.equal(repetido.status, 200);
  assert.equal(repetido.cuerpo.data.id, primera.cuerpo.data.id);
  assert.equal(repetido.cuerpo.data.platform, "ios");
  assert.equal(repetido.cuerpo.data.hasPushToken, true);
  assert.equal(repetido.cuerpo.data.isActive, true);
  assert.notEqual(repetido.cuerpo.data.updatedAt, primera.cuerpo.data.updatedAt);

  const listado = await pedir("GET", "/api/v1/devices", "secretario");
  assert.equal(listado.cuerpo.data.length, 1);
});

test("re-registrar sin token conserva el token ya guardado", async () => {
  await pedir("POST", "/api/v1/devices", "secretario", REGISTRO);

  const reenvio = await pedir("POST", "/api/v1/devices", "secretario", {
    installationId: REGISTRO.installationId,
    platform: "android"
  });

  assert.equal(reenvio.status, 200);
  assert.equal(reenvio.cuerpo.data.hasPushToken, true);
});

test("una instalacion registrada por otra cuenta se reasigna", async () => {
  const deSecretaria = await pedir("POST", "/api/v1/devices", "secretario", REGISTRO);
  assert.equal(deSecretaria.status, 201);

  const deDirector = await pedir("POST", "/api/v1/devices", "director", {
    ...REGISTRO,
    pushToken: "ExponentPushToken[otraCuenta789]"
  });
  assert.equal(deDirector.status, 200);

  const quien = await pedir("GET", "/api/v1/auth/me", "director");
  assert.equal(deDirector.cuerpo.data.userId, quien.cuerpo.data.user.id);

  /* La cuenta anterior ya no ve la instalacion. */
  const listadoSecretaria = await pedir("GET", "/api/v1/devices", "secretario");
  assert.deepEqual(listadoSecretaria.cuerpo.data, []);
});

test("un usuario puede tener varios dispositivos", async () => {
  await pedir("POST", "/api/v1/devices", "secretario", {
    installationId: "instalacion-uno",
    platform: "android",
    pushToken: "ExponentPushToken[uno]"
  });
  await pedir("POST", "/api/v1/devices", "secretario", {
    installationId: "instalacion-dos",
    platform: "ios",
    pushToken: "ExponentPushToken[dos]"
  });

  const listado = await pedir("GET", "/api/v1/devices", "secretario");

  assert.equal(listado.status, 200);
  assert.equal(listado.cuerpo.data.length, 2);
  assert.ok(listado.cuerpo.data.every((dispositivo) => dispositivo.hasPushToken === true));
});

test("el listado solo muestra los dispositivos del usuario autenticado", async () => {
  await pedir("POST", "/api/v1/devices", "secretario", { ...REGISTRO, installationId: "inst-secretaria" });
  await pedir("POST", "/api/v1/devices", "director", { ...REGISTRO, installationId: "inst-director" });

  const listado = await pedir("GET", "/api/v1/devices", "secretario");

  assert.equal(listado.cuerpo.data.length, 1);
  assert.equal(listado.cuerpo.data[0].installationId, "inst-secretaria");
  const volcado = JSON.stringify(listado.cuerpo.data);
  assert.equal(volcado.includes("inst-director"), false);
  assert.equal(volcado.includes("pushToken"), false);
});

test("desasocia el dispositivo propio con baja logica", async () => {
  const registro = await pedir("POST", "/api/v1/devices", "secretario", REGISTRO);
  const creados = getStore().devices;

  const { status, cuerpo } = await pedir("DELETE", `/api/v1/devices/${registro.cuerpo.data.id}`, "secretario");

  assert.equal(status, 200);
  assert.equal(cuerpo.data.isActive, false);

  /* Baja logica: el registro sigue en el store de auditoria/y traza. */
  assert.equal([...creados.values()].some((dispositivo) => dispositivo.isActive === false), true);

  /* El listado sigue conociendo el device. */
  const listado = await pedir("GET", "/api/v1/devices", "secretario");
  assert.equal(listado.cuerpo.data.length, 1);
  assert.equal(listado.cuerpo.data[0].isActive, false);
});

test("repetir una desasociacion es no-op e idempotente", async () => {
  const registro = await pedir("POST", "/api/v1/devices", "secretario", REGISTRO);
  await pedir("DELETE", `/api/v1/devices/${registro.cuerpo.data.id}`, "secretario");

  const otraVez = await pedir("DELETE", `/api/v1/devices/${registro.cuerpo.data.id}`, "secretario");

  assert.equal(otraVez.status, 200);
  assert.equal(otraVez.cuerpo.data.isActive, false);
});

test("no puede desasociar el device de otro usuario ni revelar su existencia", async () => {
  const deSecretaria = await pedir("POST", "/api/v1/devices", "secretario", REGISTRO);

  const { status, cuerpo } = await pedir("DELETE", `/api/v1/devices/${deSecretaria.cuerpo.data.id}`, "director");

  assert.equal(status, 404);
  assert.equal(cuerpo.error.code, "NOT_FOUND");
  assert.equal(cuerpo.error.message.includes("Dispositivo no encontrado"), true);
  assert.equal(JSON.stringify(cuerpo).includes(deSecretaria.cuerpo.data.id), false);

  /* El device de la secretaria sigue activo e intacto. */
  const listadoSecretaria = await pedir("GET", "/api/v1/devices", "secretario");
  assert.equal(listadoSecretaria.cuerpo.data[0].isActive, true);
});

test("un device inexistente responde 404", async () => {
  const { status } = await pedir("DELETE", "/api/v1/devices/dev_xxx_nada", "secretario");
  assert.equal(status, 404);
});

test("una instalacion desasociada vuelve a quedar activa al re-registrarse", async () => {
  const registro = await pedir("POST", "/api/v1/devices", "secretario", REGISTRO);
  await pedir("DELETE", `/api/v1/devices/${registro.cuerpo.data.id}`, "secretario");

  const reactivado = await pedir("POST", "/api/v1/devices", "secretario", REGISTRO);

  assert.equal(reactivado.status, 200);
  assert.equal(reactivado.cuerpo.data.id, registro.cuerpo.data.id);
  assert.equal(reactivado.cuerpo.data.isActive, true);
});

test("el re-registro reasignado tambien reactiva instalaciones desasociadas", async () => {
  await pedir("POST", "/api/v1/devices", "secretario", REGISTRO);
  const registro = await pedir("POST", "/api/v1/devices", "secretario", REGISTRO);
  await pedir("DELETE", `/api/v1/devices/${registro.cuerpo.data.id}`, "secretario");

  const reactivado = await pedir("POST", "/api/v1/devices", "director", REGISTRO);

  assert.equal(reactivado.status, 200);
  assert.equal(reactivado.cuerpo.data.userId !== registro.cuerpo.data.userId, true);
  assert.equal(reactivado.cuerpo.data.isActive, true);
});

test("la auditoria no guarda el token push del registro", async () => {
  await pedir("POST", "/api/v1/devices", "secretario", REGISTRO);

  const logs = [...getStore().auditLogs.values()];
  const volcado = JSON.stringify(logs);

  assert.ok(logs.length > 0);
  assert.equal(volcado.includes(REGISTRO.pushToken), false);
  assert.equal(volcado.includes("ExponentPushToken"), false);
});
