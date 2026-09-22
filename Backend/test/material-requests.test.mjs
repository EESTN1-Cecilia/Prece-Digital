import assert from "node:assert/strict";
import test, { after, before, beforeEach } from "node:test";
import { createApp } from "../src/app.mjs";
import { apiRoutes } from "../routes/index.mjs";
import { userRepository } from "../database/repositories/user.repository.mjs";
import { signAccessToken } from "../modules/auth/token.service.mjs";
import { setTestPool } from "../database/client.mjs";

const PUERTO = 3995;
const base = `http://127.0.0.1:${PUERTO}`;
let servidor;

const SERVER_USER = userRepository.create({
  id: "mreq_server",
  email: "server@mreq.test",
  passwordHash: "hash",
  displayName: "Server Test",
  assignments: [{ role: "server", schoolId: "esc-1" }]
});

const SOLICITANTE = userRepository.create({
  id: "mreq_solicitante",
  email: "secretario@mreq.test",
  passwordHash: "hash",
  displayName: "Secretario Test",
  assignments: [{ role: "secretario", schoolId: "esc-1" }]
});

const SIN_PERMISO = userRepository.create({
  id: "mreq_sin_permiso",
  email: "invitado@mreq.test",
  passwordHash: "hash",
  displayName: "Invitado Test",
  assignments: [{ role: "invitado", schoolId: "esc-1" }]
});

function tokenDe(user) {
  return signAccessToken(user);
}

before(async () => {
  servidor = createApp(apiRoutes);
  await new Promise((listo) => servidor.listen(PUERTO, listo));
});

after(async () => {
  await new Promise((listo) => servidor.close(listo));
});

beforeEach(() => {
  setTestPool(null);
});

async function pedir(ruta, token, opciones) {
  const cabeceras = { ...opciones?.headers, ...(token ? { authorization: `Bearer ${token}` } : {}) };
  const respuesta = await fetch(`${base}${ruta}`, { ...opciones, headers: cabeceras });
  let cuerpo = null;
  try {
    cuerpo = await respuesta.json();
  } catch (_error) {
    cuerpo = null;
  }
  return { status: respuesta.status, cuerpo };
}

function pedirJson(ruta, token, body, method = "POST") {
  return pedir(ruta, token, {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
}

async function crearMaterial(nombre, { quantity = 10, category = "material" } = {}) {
  const { status, cuerpo } = await pedirJson("/api/v1/inventory", tokenDe(SERVER_USER), {
    name: nombre,
    category,
    quantity,
    minQuantity: 1,
    unit: "unidad",
    location: "Server - Deposito"
  });
  assert.equal(status, 201);
  return cuerpo.data;
}

let materialA;
let materialB;
let materialC;

test("un POST a /material-requests sin token devuelve 401", async () => {
  const { status, cuerpo } = await pedirJson("/api/v1/material-requests", null, {
    reason: "Prueba",
    items: []
  });

  assert.equal(status, 401);
  assert.equal(cuerpo.error.code, "missing_token");
});

test("un rol sin permisos no puede crear solicitudes (403)", async () => {
  const { status, cuerpo } = await pedirJson("/api/v1/material-requests", tokenDe(SIN_PERMISO), {
    reason: "Prueba",
    items: [{ itemId: "inv_x", quantity: 1 }]
  });

  assert.equal(status, 403);
  assert.equal(cuerpo.error.code, "forbidden");
});

test("crear solicitud sin materiales devuelve 422", async () => {
  const { status, cuerpo } = await pedirJson("/api/v1/material-requests", tokenDe(SOLICITANTE), {
    reason: "Falta items"
  });

  assert.equal(status, 422);
  assert.equal(cuerpo.error.details[0].field, "items");
});

test("crear solicitud sin motivo devuelve 422", async () => {
  const { status, cuerpo } = await pedirJson("/api/v1/material-requests", tokenDe(SOLICITANTE), {
    items: [{ itemId: "inv_x", quantity: 1 }]
  });

  assert.equal(status, 422);
  assert.equal(cuerpo.error.details[0].field, "reason");
});

test("crear solicitud con material inexistente devuelve 422", async () => {
  const { status, cuerpo } = await pedirJson("/api/v1/material-requests", tokenDe(SOLICITANTE), {
    reason: "Material inexistente",
    items: [{ itemId: "inv_no_existe", quantity: 1 }]
  });

  assert.equal(status, 422);
  assert.equal(cuerpo.error.details[0].field, "items");
});

test("crear solicitud valida cantidades y rechaza duplicados (422)", async () => {
  materialA = await crearMaterial("Papel Bond");

  const conCero = await pedirJson("/api/v1/material-requests", tokenDe(SOLICITANTE), {
    reason: "Cantidad invalida",
    items: [{ itemId: materialA.id, quantity: 0 }]
  });
  assert.equal(conCero.status, 422);

  const duplicado = await pedirJson("/api/v1/material-requests", tokenDe(SOLICITANTE), {
    reason: "Duplicado",
    items: [
      { itemId: materialA.id, quantity: 1 },
      { itemId: materialA.id, quantity: 2 }
    ]
  });
  assert.equal(duplicado.status, 422);
  assert.equal(duplicado.cuerpo.error.details[0].field, "items");
});

test("crear solicitud correcta devuelve 201, asocia al solicitante de la sesion y registra historial", async () => {
  const creada = await pedirJson("/api/v1/material-requests", tokenDe(SOLICITANTE), {
    reason: "Resmas para secretaria",
    observations: "Entrega mensual",
    items: [{ itemId: materialA.id, quantity: 3, observations: "Papel A4" }]
  });

  assert.equal(creada.status, 201);
  assert.ok(creada.cuerpo.data.id.startsWith("mreq_"));
  assert.equal(creada.cuerpo.data.requesterId, "mreq_solicitante");
  assert.equal(creada.cuerpo.data.schoolId, "esc-1");
  assert.equal(creada.cuerpo.data.status, "pendiente");
  assert.equal(creada.cuerpo.data.reason, "Resmas para secretaria");
  assert.equal(creada.cuerpo.data.items[0].itemId, materialA.id);
  assert.equal(creada.cuerpo.data.items[0].quantity, 3);
  assert.equal(creada.cuerpo.data.items[0].approvedQuantity, null);
  assert.equal(creada.cuerpo.data.history.length, 1);
  assert.equal(creada.cuerpo.data.history[0].toStatus, "pendiente");
  assert.equal(creada.cuerpo.data.history[0].changedBy, "mreq_solicitante");

  globalThis.__mreqA = creada.cuerpo.data.id;
});

test("un rol sin REQUESTS_MANAGE no puede aprobar (403)", async () => {
  const { status, cuerpo } = await pedirJson(
    `/api/v1/material-requests/${globalThis.__mreqA}/approve`,
    tokenDe(SOLICITANTE),
    {}
  );

  assert.equal(status, 403);
  assert.equal(cuerpo.error.code, "forbidden");
});

test("el solicitante puede cancelar una solicitud pendiente y el historial se conserva", async () => {
  const creada = await pedirJson("/api/v1/material-requests", tokenDe(SOLICITANTE), {
    reason: "Solicitud a cancelar",
    items: [{ itemId: materialA.id, quantity: 1 }]
  });
  const id = creada.cuerpo.data.id;

  const cancelada = await pedirJson(`/api/v1/material-requests/${id}/cancel`, tokenDe(SOLICITANTE), {
    reason: "Ya no la necesitamos"
  });
  assert.equal(cancelada.status, 200);
  assert.equal(cancelada.cuerpo.data.status, "cancelada");
  assert.equal(cancelada.cuerpo.data.cancelledBy, "mreq_solicitante");
  assert.equal(cancelada.cuerpo.data.cancelReason, "Ya no la necesitamos");

  const modificada = await pedirJson(
    `/api/v1/material-requests/${id}`,
    tokenDe(SOLICITANTE),
    { reason: "Intento posterior" },
    "PATCH"
  );
  assert.equal(modificada.status, 409);

  const historial = await pedir(`/api/v1/material-requests/${id}/history`, tokenDe(SOLICITANTE));
  assert.equal(historial.status, 200);
  const estados = historial.cuerpo.data.history.map((h) => h.toStatus);
  assert.ok(estados.includes("pendiente"));
  assert.ok(estados.includes("cancelada"));
});

test("el solicitante puede modificar una solicitud pendiente (items y motivo)", async () => {
  const creada = await pedirJson("/api/v1/material-requests", tokenDe(SOLICITANTE), {
    reason: "Version inicial",
    items: [{ itemId: materialA.id, quantity: 2 }]
  });
  const id = creada.cuerpo.data.id;

  const modificada = await pedirJson(
    `/api/v1/material-requests/${id}`,
    tokenDe(SOLICITANTE),
    { reason: "Version corregida", items: [{ itemId: materialA.id, quantity: 5 }] },
    "PATCH"
  );

  assert.equal(modificada.status, 200);
  assert.equal(modificada.cuerpo.data.reason, "Version corregida");
  assert.equal(modificada.cuerpo.data.items[0].quantity, 5);
  assert.equal(modificada.cuerpo.data.status, "pendiente");
  globalThis.__mreqModificar = id;
});

test("no se puede modificar una solicitud ya procesada (409)", async () => {
  materialB = await crearMaterial("Marcadores xlapiz");

  const creada = await pedirJson("/api/v1/material-requests", tokenDe(SOLICITANTE), {
    reason: "Para no modificar",
    items: [{ itemId: materialB.id, quantity: 2 }]
  });
  const id = creada.cuerpo.data.id;

  await pedirJson(`/api/v1/material-requests/${id}/status`, tokenDe(SERVER_USER), { status: "en_revision" });
  await pedirJson(`/api/v1/material-requests/${id}/approve`, tokenDe(SERVER_USER), {});

  const { status, cuerpo } = await pedirJson(
    `/api/v1/material-requests/${id}`,
    tokenDe(SOLICITANTE),
    { reason: "Tarde" },
    "PATCH"
  );
  assert.equal(status, 409);
  assert.equal(cuerpo.error.code, "conflict");
  globalThis.__mreqAprobada = id;
});

test("cambio de estado rechaza transiciones invalidas (409) y estados desconocidos (422)", async () => {
  const invalida = await pedirJson(
    `/api/v1/material-requests/${globalThis.__mreqModificar}/status`,
    tokenDe(SERVER_USER),
    { status: "entregada" }
  );
  assert.equal(invalida.status, 409);

  const desconocido = await pedirJson(
    `/api/v1/material-requests/${globalThis.__mreqModificar}/status`,
    tokenDe(SERVER_USER),
    { status: "explotada" }
  );
  assert.equal(desconocido.status, 422);
});

test("un rol sin REQUESTS_MANAGE no puede pasar a en_revision (403)", async () => {
  const { status } = await pedirJson(
    `/api/v1/material-requests/${globalThis.__mreqModificar}/status`,
    tokenDe(SOLICITANTE),
    { status: "en_revision" }
  );
  assert.equal(status, 403);
});

test("revisar y aprobar verifica disponibilidad de stock (422) y no descuenta stock", async () => {
  const material = await crearMaterial("Hoja Canson", { quantity: 6 });
  const creada = await pedirJson("/api/v1/material-requests", tokenDe(SOLICITANTE), {
    reason: "Taller de arte",
    items: [{ itemId: material.id, quantity: 8 }]
  });
  const id = creada.cuerpo.data.id;

  const revisada = await pedirJson(`/api/v1/material-requests/${id}/status`, tokenDe(SERVER_USER), { status: "en_revision" });
  assert.equal(revisada.status, 200);
  assert.equal(revisada.cuerpo.data.status, "en_revision");

  const stockAntes = await pedir(`/api/v1/inventory/${material.id}/stock`, tokenDe(SERVER_USER));
  assert.equal(stockAntes.cuerpo.data.quantity, 6);

  const aprobada = await pedirJson(`/api/v1/material-requests/${id}/approve`, tokenDe(SERVER_USER), {});
  assert.equal(aprobada.status, 422);
  assert.equal(aprobada.cuerpo.error.details[0].field, "items");

  const stockDespues = await pedir(`/api/v1/inventory/${material.id}/stock`, tokenDe(SERVER_USER));
  assert.equal(stockDespues.cuerpo.data.quantity, 6);
});

test("aprobar parcialmente (menos de lo solicitado) sin descuenta stock", async () => {
  materialC = await crearMaterial("Guantes de laboratorio", { quantity: 10 });
  const creada = await pedirJson("/api/v1/material-requests", tokenDe(SOLICITANTE), {
    reason: "Laboratorio",
    items: [{ itemId: materialC.id, quantity: 8 }]
  });
  const id = creada.cuerpo.data.id;

  await pedirJson(`/api/v1/material-requests/${id}/status`, tokenDe(SERVER_USER), { status: "en_revision" });

  const aprobada = await pedirJson(`/api/v1/material-requests/${id}/approve`, tokenDe(SERVER_USER), {
    items: [{ itemId: materialC.id, approvedQuantity: 3 }]
  });
  assert.equal(aprobada.status, 200);
  assert.equal(aprobada.cuerpo.data.status, "aprobada");
  assert.equal(aprobada.cuerpo.data.approvedBy, "mreq_server");
  assert.equal(aprobada.cuerpo.data.items[0].approvedQuantity, 3);

  const stock = await pedir(`/api/v1/inventory/${materialC.id}/stock`, tokenDe(SERVER_USER));
  assert.equal(stock.cuerpo.data.quantity, 10);
  globalThis.__mreqParcial = id;
});

test("una aprobacion no puede superar la cantidad solicitada (422)", async () => {
  const material = await crearMaterial("Fibron fibron", { quantity: 10 });
  const creada = await pedirJson("/api/v1/material-requests", tokenDe(SOLICITANTE), {
    reason: "Aprobacion excesiva",
    items: [{ itemId: material.id, quantity: 4 }]
  });
  const id = creada.cuerpo.data.id;

  await pedirJson(`/api/v1/material-requests/${id}/status`, tokenDe(SERVER_USER), { status: "en_revision" });

  const { status, cuerpo } = await pedirJson(`/api/v1/material-requests/${id}/approve`, tokenDe(SERVER_USER), {
    items: [{ itemId: material.id, approvedQuantity: 9 }]
  });
  assert.equal(status, 422);
  assert.equal(cuerpo.error.details[0].field, "items");
});

test("rechazo exige motivo (422) y el rechazo queda registrado", async () => {
  materialB = await crearMaterial("Tiza tiza");
  const creada = await pedirJson("/api/v1/material-requests", tokenDe(SOLICITANTE), {
    reason: "A rechazar",
    items: [{ itemId: materialB.id, quantity: 2 }]
  });
  const id = creada.cuerpo.data.id;

  await pedirJson(`/api/v1/material-requests/${id}/status`, tokenDe(SERVER_USER), { status: "en_revision" });

  const sinMotivo = await pedirJson(`/api/v1/material-requests/${id}/reject`, tokenDe(SERVER_USER), {});
  assert.equal(sinMotivo.status, 422);
  assert.equal(sinMotivo.cuerpo.error.details[0].field, "reason");

  const rechazada = await pedirJson(`/api/v1/material-requests/${id}/reject`, tokenDe(SERVER_USER), {
    reason: "Stock agotado con los proveedores"
  });
  assert.equal(rechazada.status, 200);
  assert.equal(rechazada.cuerpo.data.status, "rechazada");
  assert.equal(rechazada.cuerpo.data.rejectedBy, "mreq_server");
  assert.equal(rechazada.cuerpo.data.rejectionReason, "Stock agotado con los proveedores");
});

test("flujo completo: entregar descuenta stock y genera un movimiento de inventario unico", async () => {
  const material = await crearMaterial("Cartucho de tinta", { quantity: 10 });
  const creada = await pedirJson("/api/v1/material-requests", tokenDe(SOLICITANTE), {
    reason: "Impresion de informes",
    items: [{ itemId: material.id, quantity: 5 }]
  });
  const id = creada.cuerpo.data.id;

  await pedirJson(`/api/v1/material-requests/${id}/status`, tokenDe(SERVER_USER), { status: "en_revision" });
  const aprobada = await pedirJson(`/api/v1/material-requests/${id}/approve`, tokenDe(SERVER_USER), {});
  assert.equal(aprobada.status, 200);

  const entregada = await pedirJson(`/api/v1/material-requests/${id}/deliver`, tokenDe(SERVER_USER), {});
  assert.equal(entregada.status, 200);
  assert.equal(entregada.cuerpo.data.status, "entregada");
  assert.equal(entregada.cuerpo.data.deliveredBy, "mreq_server");
  assert.equal(entregada.cuerpo.movements.length, 1);

  const stock = await pedir(`/api/v1/inventory/${material.id}/stock`, tokenDe(SERVER_USER));
  assert.equal(stock.cuerpo.data.quantity, 5);

  const movimientos = await pedir(`/api/v1/inventory/${material.id}/movements`, tokenDe(SERVER_USER));
  const bajas = movimientos.cuerpo.data.movements.filter((m) => m.type === "baja");
  assert.equal(bajas.length, 1);
  assert.equal(bajas[0].quantity, 5);
  assert.equal(bajas[0].previousStock, 10);
  assert.equal(bajas[0].resultingStock, 5);
  assert.ok(bajas[0].reason.includes("Entrega por solicitud"));
  assert.equal(bajas[0].userId, "mreq_server");

  const duplicada = await pedirJson(`/api/v1/material-requests/${id}/deliver`, tokenDe(SERVER_USER), {});
  assert.equal(duplicada.status, 409);
  globalThis.__mreqEntregada = id;
});

test("entregar una solicitud con una aprobacion parcial descuenta solo lo aprobado", async () => {
  const material = await crearMaterial("Atomizador sanitas", { quantity: 10 });
  const creada = await pedirJson("/api/v1/material-requests", tokenDe(SOLICITANTE), {
    reason: "Laboratorio de quimica",
    items: [{ itemId: material.id, quantity: 6 }]
  });
  const id = creada.cuerpo.data.id;

  await pedirJson(`/api/v1/material-requests/${id}/status`, tokenDe(SERVER_USER), { status: "en_revision" });
  await pedirJson(`/api/v1/material-requests/${id}/approve`, tokenDe(SERVER_USER), {
    items: [{ itemId: material.id, approvedQuantity: 2 }]
  });

  const entregada = await pedirJson(`/api/v1/material-requests/${id}/deliver`, tokenDe(SERVER_USER), {});
  assert.equal(entregada.status, 200);
  assert.equal(entregada.cuerpo.movements.length, 1);

  const stock = await pedir(`/api/v1/inventory/${material.id}/stock`, tokenDe(SERVER_USER));
  assert.equal(stock.cuerpo.data.quantity, 8);
});

test("entregar sin stock suficiente no deja movimientos parciales ni cambia el estado", async () => {
  const material = await crearMaterial("Reglas plasticas", { quantity: 4 });
  const creada = await pedirJson("/api/v1/material-requests", tokenDe(SOLICITANTE), {
    reason: "Taller de diseno",
    items: [{ itemId: material.id, quantity: 4 }]
  });
  const id = creada.cuerpo.data.id;

  await pedirJson(`/api/v1/material-requests/${id}/status`, tokenDe(SERVER_USER), { status: "en_revision" });
  const aprobada = await pedirJson(`/api/v1/material-requests/${id}/approve`, tokenDe(SERVER_USER), {});
  assert.equal(aprobada.status, 200);

  await pedirJson(`/api/v1/inventory/${material.id}/movements`, tokenDe(SERVER_USER), {
    type: "baja",
    quantity: 4,
    reason: "Consumo anterior"
  });

  const movsAntes = await pedir(`/api/v1/inventory/${material.id}/movements`, tokenDe(SERVER_USER));
  const bajasAntes = movsAntes.cuerpo.data.movements.filter((m) => m.type === "baja").length;

  const entregada = await pedirJson(`/api/v1/material-requests/${id}/deliver`, tokenDe(SERVER_USER), {});
  assert.equal(entregada.status, 422);
  assert.equal(entregada.cuerpo.error.details[0].field, "items");

  const detalle = await pedir(`/api/v1/material-requests/${id}`, tokenDe(SERVER_USER));
  assert.equal(detalle.cuerpo.data.status, "aprobada");

  const movsDespues = await pedir(`/api/v1/inventory/${material.id}/movements`, tokenDe(SERVER_USER));
  const bajasDespues = movsDespues.cuerpo.data.movements.filter((m) => m.type === "baja").length;
  assert.equal(bajasDespues, bajasAntes);
});

test("cerrar una solicitud entregada (200) y luego reabrir es invalido", async () => {
  const cerrada = await pedirJson(
    `/api/v1/material-requests/${globalThis.__mreqEntregada}/close`,
    tokenDe(SERVER_USER),
    {}
  );
  assert.equal(cerrada.status, 200);
  assert.equal(cerrada.cuerpo.data.status, "cerrada");
  assert.equal(cerrada.cuerpo.data.closedBy, "mreq_server");

  const reabrir = await pedirJson(
    `/api/v1/material-requests/${globalThis.__mreqEntregada}/status`,
    tokenDe(SERVER_USER),
    { status: "en_revision" }
  );
  assert.equal(reabrir.status, 409);
});

test("listado filtra por estado, solicitante, material y fecha", async () => {
  const porEstado = await pedir("/api/v1/material-requests?status=cancelada", tokenDe(SOLICITANTE));
  assert.equal(porEstado.status, 200);
  assert.ok(porEstado.cuerpo.data.requests.length >= 1);
  assert.ok(porEstado.cuerpo.data.requests.every((r) => r.status === "cancelada"));

  const porSolicitante = await pedir("/api/v1/material-requests?requesterId=mreq_solicitante", tokenDe(SOLICITANTE));
  assert.ok(porSolicitante.cuerpo.data.requests.every((r) => r.requesterId === "mreq_solicitante"));

  const porMaterial = await pedir(`/api/v1/material-requests?itemId=${materialA.id}`, tokenDe(SOLICITANTE));
  assert.ok(porMaterial.cuerpo.data.requests.length >= 1);
  assert.ok(porMaterial.cuerpo.data.requests.every((r) => r.items.some((i) => i.itemId === materialA.id)));

  const porFecha = await pedir("/api/v1/material-requests?fromDate=2020-01-01&toDate=2030-01-01", tokenDe(SOLICITANTE));
  assert.ok(porFecha.cuerpo.data.requests.every((r) => r.createdAt >= "2020-01-01" && r.createdAt <= "2030-01-01"));

  const asc = await pedir("/api/v1/material-requests?sort=asc", tokenDe(SOLICITANTE));
  const fechasAsc = asc.cuerpo.data.requests.map((r) => r.createdAt);
  assert.ok(fechasAsc.every((f, i) => i === 0 || f >= fechasAsc[i - 1]));
});

test("el historial de una solicitud registra cada cambio con su responsable", async () => {
  const historial = await pedir(`/api/v1/material-requests/${globalThis.__mreqParcial}/history`, tokenDe(SOLICITANTE));

  assert.equal(historial.status, 200);
  const estados = historial.cuerpo.data.history.map((h) => h.toStatus);
  assert.deepEqual(estados, ["pendiente", "en_revision", "aprobada"]);
  assert.ok(historial.cuerpo.data.history.every((h) => h.changedBy === "mreq_server" || h.changedBy === "mreq_solicitante"));
});

test("una solicitud de otra escuela no es visible (404)", async () => {
  const creada = await pedirJson("/api/v1/material-requests", tokenDe(SOLICITANTE), {
    reason: "Solicitud local",
    items: [{ itemId: materialA.id, quantity: 1 }]
  });
  const id = creada.cuerpo.data.id;

  const otroServidor = userRepository.create({
    id: "mreq_otra_escuela",
    email: "server@otra.mreq.test",
    passwordHash: "hash",
    displayName: "Server otra escuela",
    assignments: [{ role: "server", schoolId: "esc-9" }]
  });

  const { status } = await pedir(`/api/v1/material-requests/${id}`, tokenDe(otroServidor));
  assert.equal(status, 404);
});