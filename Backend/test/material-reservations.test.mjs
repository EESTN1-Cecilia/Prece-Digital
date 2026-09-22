import assert from "node:assert/strict";
import test, { after, before, beforeEach } from "node:test";
import { createApp } from "../src/app.mjs";
import { apiRoutes } from "../routes/index.mjs";
import { userRepository } from "../database/repositories/user.repository.mjs";
import { signAccessToken } from "../modules/auth/token.service.mjs";
import { setTestPool } from "../database/client.mjs";

const PUERTO = 3996;
const base = `http://127.0.0.1:${PUERTO}`;
let servidor;

const SERVER_USER = userRepository.create({
  id: "mres_server",
  email: "server@mres.test",
  passwordHash: "hash",
  displayName: "Server Test",
  assignments: [{ role: "server", schoolId: "esc-1" }]
});

const SECRETARIO = userRepository.create({
  id: "mres_secretario",
  email: "secretario@mres.test",
  passwordHash: "hash",
  displayName: "Secretario Test",
  assignments: [{ role: "secretario", schoolId: "esc-1" }]
});

const OTRO_SECRETARIO = userRepository.create({
  id: "mres_secretario_2",
  email: "secretario2@mres.test",
  passwordHash: "hash",
  displayName: "Secretario Dos Test",
  assignments: [{ role: "secretario", schoolId: "esc-1" }]
});

const INVITADO = userRepository.create({
  id: "mres_invitado",
  email: "invitado@mres.test",
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

async function crearMaterial(nombre, { quantity = 10, allowReservation = true } = {}) {
  const { status, cuerpo } = await pedirJson("/api/v1/inventory", tokenDe(SERVER_USER), {
    name: nombre,
    category: "material",
    quantity,
    minQuantity: 1,
    unit: "unidad",
    location: "Server - Deposito",
    allowReservation
  });
  assert.equal(status, 201);
  return cuerpo.data;
}

function disponibilidadDe(materialId, periodo) {
  return pedir(
    `/api/v1/material-reservations/availability?itemId=${materialId}` +
      `&startDate=${periodo.startDate}&endDate=${periodo.endDate}` +
      `&startTime=${periodo.startTime}&endTime=${periodo.endTime}`,
    tokenDe(SERVER_USER)
  );
}

const PERIODO = { startDate: "2026-09-28", endDate: "2026-09-28", startTime: "14:00", endTime: "16:00" };
const PERIODO_TARDE = { startDate: "2026-09-28", endDate: "2026-09-28", startTime: "18:00", endTime: "20:00" };

let materialA;
let materialB;
let materialC;
let resA;
let resC;
let resD;
let resI;
let resJ;
let resK;

test("un POST a /material-reservations sin token devuelve 401", async () => {
  const { status, cuerpo } = await pedirJson("/api/v1/material-reservations", null, {
    reason: "Prueba",
    items: [],
    ...PERIODO
  });

  assert.equal(status, 401);
  assert.equal(cuerpo.error.code, "missing_token");
});

test("un rol sin permisos no puede crear reservas (403)", async () => {
  const { status, cuerpo } = await pedirJson("/api/v1/material-reservations", tokenDe(INVITADO), {
    reason: "Prueba",
    items: [{ itemId: "inv_x", quantity: 1 }],
    ...PERIODO
  });

  assert.equal(status, 403);
  assert.equal(cuerpo.error.code, "forbidden");
});

test("crear reserva sin materiales devuelve 422", async () => {
  const { status, cuerpo } = await pedirJson("/api/v1/material-reservations", tokenDe(SECRETARIO), {
    reason: "Falta items",
    ...PERIODO
  });

  assert.equal(status, 422);
  assert.equal(cuerpo.error.details[0].field, "items");
});

test("crear reserva sin motivo devuelve 422", async () => {
  const { status, cuerpo } = await pedirJson("/api/v1/material-reservations", tokenDe(SECRETARIO), {
    items: [{ itemId: "inv_x", quantity: 1 }],
    ...PERIODO
  });

  assert.equal(status, 422);
  assert.equal(cuerpo.error.details[0].field, "reason");
});

test("crear reserva con material inexistente devuelve 422", async () => {
  const { status, cuerpo } = await pedirJson("/api/v1/material-reservations", tokenDe(SECRETARIO), {
    reason: "Material inexistente",
    items: [{ itemId: "inv_no_existe", quantity: 1 }],
    ...PERIODO
  });

  assert.equal(status, 422);
  assert.equal(cuerpo.error.details[0].field, "items");
});

test("crear reserva con cantidad cero devuelve 422", async () => {
  materialA = await crearMaterial("Mesas", { quantity: 10 });

  const { status, cuerpo } = await pedirJson("/api/v1/material-reservations", tokenDe(SECRETARIO), {
    reason: "Cantidad cero",
    items: [{ itemId: materialA.id, quantity: 0 }],
    ...PERIODO
  });

  assert.equal(status, 422);
  assert.equal(cuerpo.error.details[0].field, "items");
});

test("crear reserva con el mismo material repetido devuelve 422", async () => {
  const { status, cuerpo } = await pedirJson("/api/v1/material-reservations", tokenDe(SECRETARIO), {
    reason: "Duplicado",
    items: [
      { itemId: materialA.id, quantity: 1 },
      { itemId: materialA.id, quantity: 2 }
    ],
    ...PERIODO
  });

  assert.equal(status, 422);
  assert.equal(cuerpo.error.details[0].field, "items");
});

test("crear reserva de un material no habilitado para reservas devuelve 409", async () => {
  materialB = await crearMaterial("Imprenta", { quantity: 5, allowReservation: false });

  const { status, cuerpo } = await pedirJson("/api/v1/material-reservations", tokenDe(SECRETARIO), {
    reason: "No habilitado",
    items: [{ itemId: materialB.id, quantity: 1 }],
    ...PERIODO
  });

  assert.equal(status, 409);
  assert.equal(cuerpo.error.code, "conflict");
});

test("crear reserva con periodo invertido devuelve 422", async () => {
  const { status, cuerpo } = await pedirJson("/api/v1/material-reservations", tokenDe(SECRETARIO), {
    reason: "Periodo invertido",
    items: [{ itemId: materialA.id, quantity: 1 }],
    startDate: "2026-09-28",
    endDate: "2026-09-28",
    startTime: "16:00",
    endTime: "14:00"
  });

  assert.equal(status, 422);
  assert.equal(cuerpo.error.details[0].field, "endTime");
});

test("crear reserva con fecha invalida devuelve 422", async () => {
  const { status, cuerpo } = await pedirJson("/api/v1/material-reservations", tokenDe(SECRETARIO), {
    reason: "Fecha invalida",
    items: [{ itemId: materialA.id, quantity: 1 }],
    startDate: "28/09/2026",
    endDate: "28/09/2026",
    startTime: "14:00",
    endTime: "16:00"
  });

  assert.equal(status, 422);
  assert.equal(cuerpo.error.details[0].field, "startDate");
});

test("crear reserva con hora invalida devuelve 422", async () => {
  const { status, cuerpo } = await pedirJson("/api/v1/material-reservations", tokenDe(SECRETARIO), {
    reason: "Hora invalida",
    items: [{ itemId: materialA.id, quantity: 1 }],
    startDate: "2026-09-28",
    endDate: "2026-09-28",
    startTime: "25:00",
    endTime: "16:00"
  });

  assert.equal(status, 422);
  assert.equal(cuerpo.error.details[0].field, "startTime");
});

test("se puede crear una reserva pendiente asociada al usuario de la sesion", async () => {
  materialC = await crearMaterial("Proyectores", { quantity: 4 });

  const { status, cuerpo } = await pedirJson("/api/v1/material-reservations", tokenDe(SECRETARIO), {
    reason: "Experiencia de laboratorio",
    observations: "Preparar antes de las 14 hs",
    items: [{ itemId: materialA.id, quantity: 4 }],
    ...PERIODO
  });

  assert.equal(status, 201);
  assert.equal(cuerpo.data.status, "pendiente");
  assert.equal(cuerpo.data.ownerId, SECRETARIO.id);
  assert.equal(cuerpo.data.items[0].itemId, materialA.id);
  assert.equal(cuerpo.data.items[0].quantity, 4);
  assert.equal(cuerpo.data.reason, "Experiencia de laboratorio");
  assert.equal(cuerpo.data.history.length, 1);
  resA = cuerpo.data;
});

test("la disponibilidad considera las reservas pendientes (bloqueo temporal)", async () => {
  const { status, cuerpo } = await disponibilidadDe(materialA.id, PERIODO);

  assert.equal(status, 200);
  assert.equal(cuerpo.data.stock, 10);
  assert.equal(cuerpo.data.reserved, 4);
  assert.equal(cuerpo.data.available, 6);
});

test("la disponibilidad sin reservas devuelve el stock completo", async () => {
  const { status, cuerpo } = await disponibilidadDe(materialC.id, PERIODO);

  assert.equal(status, 200);
  assert.equal(cuerpo.data.stock, 4);
  assert.equal(cuerpo.data.reserved, 0);
  assert.equal(cuerpo.data.available, 4);
});

test("no se puede reservar mas que la disponibilidad considerando reservas superpuestas", async () => {
  const { status, cuerpo } = await pedirJson("/api/v1/material-reservations", tokenDe(SECRETARIO), {
    reason: "Excede la disponibilidad",
    items: [{ itemId: materialA.id, quantity: 7 }],
    ...PERIODO
  });

  assert.equal(status, 422);
  assert.equal(cuerpo.error.details[0].field, "items");
});

test("un periodo no superpuesto no interfiere con la disponibilidad", async () => {
  const { status, cuerpo } = await pedirJson("/api/v1/material-reservations", tokenDe(SECRETARIO), {
    reason: "Reserva de tarde sin superposicion",
    items: [{ itemId: materialC.id, quantity: 4 }],
    ...PERIODO_TARDE
  });

  assert.equal(status, 201);
  resC = cuerpo.data;
});

test("aprobar exige permisos de gestion (403 para secretario)", async () => {
  const { status, cuerpo } = await pedirJson(
    `/api/v1/material-reservations/${resA.id}/approve`,
    tokenDe(SECRETARIO),
    {}
  );

  assert.equal(status, 403);
  assert.equal(cuerpo.error.code, "forbidden");
});

test("aprobar una reserva pendiente no descuenta el stock fisico", async () => {
  const { status, cuerpo } = await pedirJson(
    `/api/v1/material-reservations/${resA.id}/approve`,
    tokenDe(SERVER_USER),
    {}
  );

  assert.equal(status, 200);
  assert.equal(cuerpo.data.status, "aprobada");
  assert.equal(cuerpo.data.approvedBy, SERVER_USER.id);
  assert.equal(cuerpo.data.history.length, 2);

  const { cuerpo: material } = await pedir(`/api/v1/inventory/${materialA.id}`, tokenDe(SERVER_USER));
  assert.equal(material.data.quantity, 10);
});

test("las reservas aprobadas siguen bloqueando la disponibilidad", async () => {
  const { status, cuerpo } = await disponibilidadDe(materialA.id, PERIODO);

  assert.equal(status, 200);
  assert.equal(cuerpo.data.reserved, 4);
  assert.equal(cuerpo.data.available, 6);
});

test("rechazar sin motivo devuelve 422", async () => {
  const { status, cuerpo } = await pedirJson(
    `/api/v1/material-reservations/${resC.id}/reject`,
    tokenDe(SERVER_USER),
    {}
  );

  assert.equal(status, 422);
  assert.equal(cuerpo.error.details[0].field, "reason");
});

test("rechazar exige permisos de gestion (403 para secretario)", async () => {
  const { status, cuerpo } = await pedirJson(
    `/api/v1/material-reservations/${resC.id}/reject`,
    tokenDe(SECRETARIO),
    { reason: "No autorizado" }
  );

  assert.equal(status, 403);
  assert.equal(cuerpo.error.code, "forbidden");
});

test("rechazar una reserva la deja registrada sin afectar disponibilidad", async () => {
  const { status, cuerpo } = await pedirJson(
    `/api/v1/material-reservations/${resC.id}/reject`,
    tokenDe(SERVER_USER),
    { reason: "Falta stock disponible" }
  );

  assert.equal(status, 200);
  assert.equal(cuerpo.data.status, "rechazada");
  assert.equal(cuerpo.data.rejectionReason, "Falta stock disponible");
  assert.equal(cuerpo.data.history.length, 2);

  const { cuerpo: disp } = await disponibilidadDe(materialC.id, PERIODO);
  assert.equal(disp.data.available, 4);
});

test("modifica una reserva pendiente excluyendo su propia cantidad", async () => {
  const { status, cuerpo } = await pedirJson("/api/v1/material-reservations", tokenDe(SECRETARIO), {
    reason: "Reserva a ampliar",
    items: [{ itemId: materialA.id, quantity: 2 }],
    ...PERIODO
  });

  assert.equal(status, 201);
  resD = cuerpo.data;

  const { status: status2, cuerpo: cuerpo2 } = await pedirJson(
    `/api/v1/material-reservations/${resD.id}`,
    tokenDe(SECRETARIO),
    { items: [{ itemId: materialA.id, quantity: 6 }] },
    "PATCH"
  );

  assert.equal(status2, 200);
  assert.equal(cuerpo2.data.items[0].quantity, 6);
});

test("modificar por encima de la disponibilidad (sin la propia reserva) devuelve 422", async () => {
  const { status, cuerpo } = await pedirJson(
    `/api/v1/material-reservations/${resD.id}`,
    tokenDe(SECRETARIO),
    { items: [{ itemId: materialA.id, quantity: 7 }] },
    "PATCH"
  );

  assert.equal(status, 422);
  assert.equal(cuerpo.error.details[0].field, "items");
});

test("modificar una reserva de otro usuario devuelve 403", async () => {
  const { status, cuerpo } = await pedirJson(
    `/api/v1/material-reservations/${resD.id}`,
    tokenDe(OTRO_SECRETARIO),
    { reason: "Intento ajeno" },
    "PATCH"
  );

  assert.equal(status, 403);
  assert.equal(cuerpo.error.code, "forbidden");
});

test("modificar una reserva aprobada requiere gestion (403 para secretario)", async () => {
  const { status, cuerpo } = await pedirJson(
    `/api/v1/material-reservations/${resA.id}`,
    tokenDe(SECRETARIO),
    { reason: "Intento ajeno" },
    "PATCH"
  );

  assert.equal(status, 403);
  assert.equal(cuerpo.error.code, "forbidden");
});

test("entregar exige permisos de gestion e inventario (403 para secretario)", async () => {
  const { status, cuerpo } = await pedirJson(
    `/api/v1/material-reservations/${resA.id}/deliver`,
    tokenDe(SECRETARIO)
  );

  assert.equal(status, 403);
  assert.equal(cuerpo.error.code, "forbidden");
});

test("entregar una reserva aprobada genera el movimiento de inventario y cambia el stock", async () => {
  const { status, cuerpo } = await pedirJson(
    `/api/v1/material-reservations/${resA.id}/deliver`,
    tokenDe(SERVER_USER)
  );

  assert.equal(status, 200);
  assert.equal(cuerpo.data.status, "activa");
  assert.equal(cuerpo.data.activatedBy, SERVER_USER.id);
  assert.equal(cuerpo.data.deliveryMovementIds.length, 1);
  assert.equal(cuerpo.movements.length, 1);

  const movementId = cuerpo.data.deliveryMovementIds[0];
  const { cuerpo: movement } = await pedir(`/api/v1/inventory-movements/${movementId}`, tokenDe(SERVER_USER));
  assert.equal(movement.data.type, "baja");
  assert.equal(movement.data.quantity, 4);
  assert.equal(movement.data.previousStock, 10);
  assert.equal(movement.data.resultingStock, 6);
  assert.equal(movement.data.itemId, materialA.id);
  assert.match(movement.data.reason, new RegExp(`reserva ${resA.id}`));

  const { cuerpo: material } = await pedir(`/api/v1/inventory/${materialA.id}`, tokenDe(SERVER_USER));
  assert.equal(material.data.quantity, 6);
});

test("entregar dos veces no genera movimientos duplicados (409)", async () => {
  const { status, cuerpo } = await pedirJson(
    `/api/v1/material-reservations/${resA.id}/deliver`,
    tokenDe(SERVER_USER)
  );

  assert.equal(status, 409);
  assert.equal(cuerpo.error.code, "conflict");
});

test("la aprobacion vuelve a validar disponibilidad y rechaza stock insuficiente", async () => {
  const { status, cuerpo } = await pedirJson(
    `/api/v1/material-reservations/${resD.id}/approve`,
    tokenDe(SERVER_USER),
    {}
  );

  assert.equal(status, 422);
  assert.equal(cuerpo.error.details[0].field, "items");
});

test("cancelar una reserva pendiente por el dueno libera la disponibilidad", async () => {
  const { status } = await pedirJson(
    `/api/v1/material-reservations/${resD.id}/cancel`,
    tokenDe(SECRETARIO),
    { reason: "Ya no se necesita" }
  );

  assert.equal(status, 200);
});

test("entregar una reserva pendiente devuelve 409 (transicion invalida)", async () => {
  const { status, cuerpo } = await pedirJson("/api/v1/material-reservations", tokenDe(SECRETARIO), {
    reason: "Reserva para entregar directo",
    items: [{ itemId: materialA.id, quantity: 1 }],
    ...PERIODO_TARDE
  });

  assert.equal(status, 201);
  resJ = cuerpo.data;

  const { status: status2, cuerpo: cuerpo2 } = await pedirJson(
    `/api/v1/material-reservations/${resJ.id}/deliver`,
    tokenDe(SERVER_USER)
  );

  assert.equal(status2, 409);
  assert.equal(cuerpo2.error.code, "conflict");
});

test("cancelar una reserva activa devuelve 409 (solo puede finalizarse)", async () => {
  const { status, cuerpo } = await pedirJson(
    `/api/v1/material-reservations/${resA.id}/cancel`,
    tokenDe(SERVER_USER),
    { reason: "Intento" }
  );

  assert.equal(status, 409);
  assert.equal(cuerpo.error.code, "conflict");
});

test("cancelar una reserva aprobada por terceros devuelve 403", async () => {
  const { status, cuerpo } = await pedirJson("/api/v1/material-reservations", tokenDe(SECRETARIO), {
    reason: "Reserva a cancelar por server",
    items: [{ itemId: materialA.id, quantity: 1 }],
    ...PERIODO
  });

  assert.equal(status, 201);
  resI = cuerpo.data;

  const approve = await pedirJson(`/api/v1/material-reservations/${resI.id}/approve`, tokenDe(SERVER_USER), {});
  assert.equal(approve.status, 200);

  const cancel = await pedirJson(`/api/v1/material-reservations/${resI.id}/cancel`, tokenDe(SECRETARIO), {
    reason: "Intento"
  });
  assert.equal(cancel.status, 403);
  assert.equal(cancel.cuerpo.error.code, "forbidden");
});

test("el Server puede cancelar una reserva aprobada", async () => {
  const { status, cuerpo } = await pedirJson(
    `/api/v1/material-reservations/${resI.id}/cancel`,
    tokenDe(SERVER_USER),
    { reason: "Se cancela la reserva aprobada" }
  );

  assert.equal(status, 200);
  assert.equal(cuerpo.data.status, "cancelada");
  assert.equal(cuerpo.data.cancelledBy, SERVER_USER.id);
  assert.equal(cuerpo.data.history.length, 3);
});

test("finalizar una reserva activa la registra y libera el bloqueo", async () => {
  const { status, cuerpo } = await pedirJson(
    `/api/v1/material-reservations/${resA.id}/finish`,
    tokenDe(SERVER_USER)
  );

  assert.equal(status, 200);
  assert.equal(cuerpo.data.status, "finalizada");
  assert.equal(cuerpo.data.finishedBy, SERVER_USER.id);
  assert.equal(cuerpo.data.history.length, 4);

  const { cuerpo: disp } = await disponibilidadDe(materialA.id, PERIODO);
  assert.equal(disp.data.stock, 6);
  assert.equal(disp.data.reserved, 0);
  assert.equal(disp.data.available, 6);
});

test("ciclo completo pendiente > aprobada > activa > finalizada", async () => {
  const approve = await pedirJson(`/api/v1/material-reservations/${resJ.id}/approve`, tokenDe(SERVER_USER), {});
  assert.equal(approve.status, 200);
  assert.equal(approve.cuerpo.data.status, "aprobada");

  const deliver = await pedirJson(`/api/v1/material-reservations/${resJ.id}/deliver`, tokenDe(SERVER_USER));
  assert.equal(deliver.status, 200);
  assert.equal(deliver.cuerpo.data.status, "activa");

  const finish = await pedirJson(`/api/v1/material-reservations/${resJ.id}/finish`, tokenDe(SERVER_USER));
  assert.equal(finish.status, 200);
  assert.equal(finish.cuerpo.data.status, "finalizada");
  assert.equal(finish.cuerpo.data.history.length, 4);
});

test("las reservas pendientes superpuestas no pueden exceder la disponibilidad", async () => {
  const { status, cuerpo } = await pedirJson("/api/v1/material-reservations", tokenDe(SECRETARIO), {
    reason: "Ocupa lo disponible",
    items: [{ itemId: materialA.id, quantity: 5 }],
    ...PERIODO
  });

  assert.equal(status, 201);
  resK = cuerpo.data;

  const { status: status2, cuerpo: cuerpo2 } = await pedirJson("/api/v1/material-reservations", tokenDe(SECRETARIO), {
    reason: "Supera la disponibilidad",
    items: [{ itemId: materialA.id, quantity: 1 }],
    ...PERIODO
  });

  assert.equal(status2, 422);
  assert.equal(cuerpo2.error.details[0].field, "items");
});

test("listar reservas por estado, material, usuario y rango de fechas", async () => {
  const porEstado = await pedir("/api/v1/material-reservations?status=finalizada", tokenDe(SERVER_USER));
  assert.equal(porEstado.status, 200);
  assert.ok(porEstado.cuerpo.data.reservations.some((r) => r.id === resJ.id));

  const porMaterial = await pedir(`/api/v1/material-reservations?itemId=${materialA.id}`, tokenDe(SERVER_USER));
  assert.equal(porMaterial.status, 200);
  assert.ok(porMaterial.cuerpo.data.reservations.some((r) => r.id === resA.id));
  assert.ok(porMaterial.cuerpo.data.reservations.some((r) => r.id === resD.id));

  const porUsuario = await pedir(`/api/v1/material-reservations?ownerId=${SECRETARIO.id}`, tokenDe(SERVER_USER));
  assert.equal(porUsuario.status, 200);
  assert.ok(porUsuario.cuerpo.data.reservations.every((r) => r.ownerId === SECRETARIO.id));

  const porRango = await pedir("/api/v1/material-reservations?fromDate=2026-09-28&toDate=2026-09-28", tokenDe(SERVER_USER));
  assert.equal(porRango.status, 200);
  assert.ok(porRango.cuerpo.data.reservations.some((r) => r.id === resA.id));
});

test("consultar disponibilidad de un material inexistente devuelve 404", async () => {
  const { status, cuerpo } = await disponibilidadDe("inv_no_existe", PERIODO);

  assert.equal(status, 404);
  assert.equal(cuerpo.error.code, "not_found");
});

test("consultar el historial de una reserva conserva todas sus transiciones", async () => {
  const { status, cuerpo } = await pedir(
    `/api/v1/material-reservations/${resJ.id}/history`,
    tokenDe(SERVER_USER)
  );

  assert.equal(status, 200);
  const acciones = cuerpo.data.history.map((h) => h.action);
  assert.deepEqual(acciones, ["creacion", "aprobacion", "entrega", "finalizacion"]);
});

test("las reservas canceladas y rechazadas no se eliminan fisicamente", async () => {
  const { cuerpo: canceladas } = await pedir("/api/v1/material-reservations?status=cancelada", tokenDe(SERVER_USER));
  assert.ok(canceladas.data.reservations.some((r) => r.id === resI.id));
  assert.ok(canceladas.data.reservations.some((r) => r.id === resD.id));

  const { cuerpo: rechazadas } = await pedir("/api/v1/material-reservations?status=rechazada", tokenDe(SERVER_USER));
  assert.ok(rechazadas.data.reservations.some((r) => r.id === resC.id));
});