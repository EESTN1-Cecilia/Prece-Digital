import assert from "node:assert/strict";
import test, { after, before, beforeEach } from "node:test";
import { createApp } from "../src/app.mjs";
import { apiRoutes } from "../routes/index.mjs";
import { userRepository } from "../database/repositories/user.repository.mjs";
import { signAccessToken } from "../modules/auth/token.service.mjs";
import { setTestPool } from "../database/client.mjs";

const PUERTO = 3997;
const base = `http://127.0.0.1:${PUERTO}`;
let servidor;

const SERVER_USER = userRepository.create({
  id: "usr_server",
  email: "server@inventario.test",
  passwordHash: "hash",
  displayName: "Server Test",
  assignments: [{ role: "server", schoolId: "esc-1" }]
});

const SECRETARIO_READ = userRepository.create({
  id: "usr_secretario",
  email: "secretario@inventario.test",
  passwordHash: "hash",
  displayName: "Secretario Test",
  assignments: [{ role: "secretario", schoolId: "esc-1" }]
});

const SIN_PERMISO_USER = userRepository.create({
  id: "usr_operador",
  email: "operador@inventario.test",
  passwordHash: "hash",
  displayName: "Operador Test",
  assignments: [{ role: "docente", schoolId: "esc-1" }]
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

test("un POST a /inventory sin token devuelve 401", async () => {
  const { status, cuerpo } = await pedirJson("/api/v1/inventory", null, { name: "X", category: "material" });

  assert.equal(status, 401);
  assert.equal(cuerpo.error.code, "missing_token");
});

test("un rol sin INVENTORY_READ no puede listar materiales (403)", async () => {
  const { status, cuerpo } = await pedir("/api/v1/inventory", tokenDe(SIN_PERMISO_USER));

  assert.equal(status, 403);
  assert.equal(cuerpo.error.code, "forbidden");
});

test("un rol sin INVENTORY_WRITE no puede crear materiales (403)", async () => {
  const { status } = await pedirJson("/api/v1/inventory", tokenDe(SIN_PERMISO_USER), {
    name: "Tiza",
    category: "material"
  });

  assert.equal(status, 403);
});

test("un rol solo-lectura (secretario) no puede escribir material (403)", async () => {
  const { status } = await pedirJson("/api/v1/inventory", tokenDe(SECRETARIO_READ), {
    name: "Libro",
    category: "material"
  });

  assert.equal(status, 403);
});

test("un rol solo-lectura (secretario) puede listar materiales (200)", async () => {
  const { status } = await pedir("/api/v1/inventory", tokenDe(SECRETARIO_READ));

  assert.equal(status, 200);
});

let materialAId;

test("crear material con stock inicial devuelve 201 y registra un alta", async () => {
  const { status, cuerpo } = await pedirJson("/api/v1/inventory", tokenDe(SERVER_USER), {
    name: "Proyector Epson",
    description: "Equipamiento audiovisual",
    category: "equipamiento",
    quantity: 10,
    minQuantity: 3,
    unit: "unidad",
    location: "Server - Estante B"
  });

  assert.equal(status, 201);
  assert.equal(cuerpo.data.name, "Proyector Epson");
  assert.equal(cuerpo.data.quantity, 10);
  assert.equal(cuerpo.data.status, "disponible");
  assert.equal(cuerpo.data.createdBy, "usr_server");
  assert.equal(cuerpo.data.schoolId, "esc-1");
  assert.ok(cuerpo.data.id.startsWith("inv_"));
  materialAId = cuerpo.data.id;

  const movimientos = await pedir(`/api/v1/inventory/${materialAId}/movements`, tokenDe(SERVER_USER));
  assert.equal(movimientos.status, 200);
  assert.equal(movimientos.cuerpo.data.movements.length, 1);
  const alta = movimientos.cuerpo.data.movements[0];
  assert.equal(alta.type, "alta");
  assert.equal(alta.previousStock, 0);
  assert.equal(alta.resultingStock, 10);
  assert.equal(alta.userId, "usr_server");
  assert.equal(alta.referenceMovementId, null);
});

test("material duplicado (mismo nombre y categoria) devuelve 409", async () => {
  await pedirJson("/api/v1/inventory", tokenDe(SERVER_USER), { name: "Resma A4", category: "material" });

  const { status, cuerpo } = await pedirJson("/api/v1/inventory", tokenDe(SERVER_USER), {
    name: "Resma A4",
    category: "material"
  });

  assert.equal(status, 409);
  assert.equal(cuerpo.error.code, "conflict");
});

test("categoria invalida devuelve 422", async () => {
  const { status, cuerpo } = await pedirJson("/api/v1/inventory", tokenDe(SERVER_USER), {
    name: "Algo",
    category: "inexistente"
  });

  assert.equal(status, 422);
  assert.equal(cuerpo.error.code, "validation_error");
  assert.equal(cuerpo.error.details[0].field, "category");
});

test("material inexistente devuelve 404", async () => {
  const { status } = await pedir("/api/v1/inventory/inv_inexistente", tokenDe(SERVER_USER));

  assert.equal(status, 404);
});

test("un baja normal decrementa el stock y audita stock anterior/resultante", async () => {
  const baja = await pedirJson(`/api/v1/inventory/${materialAId}/movements`, tokenDe(SERVER_USER), {
    type: "baja",
    quantity: 4,
    reason: "Entrega a taller"
  });

  assert.equal(baja.status, 201);
  assert.equal(baja.cuerpo.data.type, "baja");
  assert.equal(baja.cuerpo.data.previousStock, 10);
  assert.equal(baja.cuerpo.data.resultingStock, 6);
});

test("un prestamo decrementa el stock", async () => {
  const prestamo = await pedirJson(`/api/v1/inventory/${materialAId}/movements`, tokenDe(SERVER_USER), {
    type: "prestamo",
    quantity: 2,
    reason: "Prestamo a aula 4"
  });

  assert.equal(prestamo.status, 201);
  assert.equal(prestamo.cuerpo.data.previousStock, 6);
  assert.equal(prestamo.cuerpo.data.resultingStock, 4);
});

test("una donacion incrementa el stock", async () => {
  const donacion = await pedirJson(`/api/v1/inventory/${materialAId}/movements`, tokenDe(SERVER_USER), {
    type: "donacion",
    quantity: 1,
    reason: "Donacion de cooperadora"
  });

  assert.equal(donacion.status, 201);
  assert.equal(donacion.cuerpo.data.resultingStock, 5);
});

test("una devolucion sin referencia incrementa el stock", async () => {
  const devolucion = await pedirJson(`/api/v1/inventory/${materialAId}/movements`, tokenDe(SERVER_USER), {
    type: "devolucion",
    quantity: 2,
    reason: "Devolucion del aula 4"
  });

  assert.equal(devolucion.status, 201);
  assert.equal(devolucion.cuerpo.data.resultingStock, 7);
});

test("un alta posterior vuelve a subir el stock", async () => {
  const alta = await pedirJson(`/api/v1/inventory/${materialAId}/movements`, tokenDe(SERVER_USER), {
    type: "alta",
    quantity: 3,
    reason: "Reabastecimiento"
  });

  assert.equal(alta.status, 201);
  assert.equal(alta.cuerpo.data.resultingStock, 10);
});

test("una baja mayor al stock disponible devuelve 422", async () => {
  const { status, cuerpo } = await pedirJson(`/api/v1/inventory/${materialAId}/movements`, tokenDe(SERVER_USER), {
    type: "baja",
    quantity: 999,
    reason: "Prueba"
  });

  assert.equal(status, 422);
  assert.equal(cuerpo.error.details[0].field, "quantity");
});

test("un prestamo mayor al stock disponible devuelve 422", async () => {
  const { status, cuerpo } = await pedirJson(`/api/v1/inventory/${materialAId}/movements`, tokenDe(SERVER_USER), {
    type: "prestamo",
    quantity: 999,
    reason: "Prueba"
  });

  assert.equal(status, 422);
  assert.equal(cuerpo.error.details[0].field, "quantity");
});

test("cantidad no positiva devuelve 422", async () => {
  const conCero = await pedirJson(`/api/v1/inventory/${materialAId}/movements`, tokenDe(SERVER_USER), {
    type: "alta",
    quantity: 0,
    reason: "Prueba"
  });

  assert.equal(conCero.status, 422);
  assert.equal(conCero.cuerpo.error.details[0].field, "quantity");

  const conNegativa = await pedirJson(`/api/v1/inventory/${materialAId}/movements`, tokenDe(SERVER_USER), {
    type: "alta",
    quantity: -5,
    reason: "Prueba"
  });

  assert.equal(conNegativa.status, 422);
  assert.equal(conNegativa.cuerpo.error.details[0].field, "quantity");
});

test("tipo de movimiento invalido devuelve 422", async () => {
  const { status, cuerpo } = await pedirJson(`/api/v1/inventory/${materialAId}/movements`, tokenDe(SERVER_USER), {
    type: "transferencia",
    quantity: 1,
    reason: "Prueba"
  });

  assert.equal(status, 422);
  assert.equal(cuerpo.error.details[0].field, "type");
});

test("un ajuste no se admite por el endpoint de movimientos regulares", async () => {
  const { status } = await pedirJson(`/api/v1/inventory/${materialAId}/movements`, tokenDe(SERVER_USER), {
    type: "ajuste",
    quantity: 1,
    reason: "Conteo fisico"
  });

  assert.equal(status, 422);
});

test("motivo obligatorio en todo movimiento devuelve 422", async () => {
  const { status, cuerpo } = await pedirJson(`/api/v1/inventory/${materialAId}/movements`, tokenDe(SERVER_USER), {
    type: "alta",
    quantity: 1
  });

  assert.equal(status, 422);
  assert.equal(cuerpo.error.details[0].field, "reason");
});

test("una referencia solo aplica a devoluciones y devuelve 422 en otros tipos", async () => {
  const { status, cuerpo } = await pedirJson(`/api/v1/inventory/${materialAId}/movements`, tokenDe(SERVER_USER), {
    type: "alta",
    quantity: 1,
    reason: "Prueba",
    referenceMovementId: "inm_cualquiera"
  });

  assert.equal(status, 422);
  assert.equal(cuerpo.error.details[0].field, "referenceMovementId");
});

let materialBId;
let prestamoBId;

test("devolucion puede vincularse a un prestamo previo del mismo material", async () => {
  const creado = await pedirJson("/api/v1/inventory", tokenDe(SERVER_USER), {
    name: "Guantes Latex",
    category: "material",
    quantity: 10,
    unit: "par"
  });

  materialBId = creado.cuerpo.data.id;
  assert.equal(creado.cuerpo.data.quantity, 10);

  const prestamo = await pedirJson(`/api/v1/inventory/${materialBId}/movements`, tokenDe(SERVER_USER), {
    type: "prestamo",
    quantity: 5,
    reason: "Prestamo a laboratorio"
  });

  assert.equal(prestamo.status, 201);
  assert.equal(prestamo.cuerpo.data.previousStock, 10);
  assert.equal(prestamo.cuerpo.data.resultingStock, 5);
  prestamoBId = prestamo.cuerpo.data.id;
  assert.ok(prestamoBId.startsWith("inm_"));

  const porId = await pedir(`/api/v1/inventory-movements/${prestamoBId}`, tokenDe(SERVER_USER));
  assert.equal(porId.status, 200);
  assert.equal(porId.cuerpo.data.type, "prestamo");
  assert.equal(porId.cuerpo.data.resultingStock, 5);
});

test("consulta de movimiento inexistente devuelve 404", async () => {
  const { status } = await pedir("/api/v1/inventory-movements/inm_inexistente", tokenDe(SERVER_USER));

  assert.equal(status, 404);
});

test("devolucion parcial con referencia descuenta el saldo pendiente", async () => {
  const devolucion = await pedirJson(`/api/v1/inventory/${materialBId}/movements`, tokenDe(SERVER_USER), {
    type: "devolucion",
    quantity: 2,
    reason: "Devolucion parcial",
    referenceMovementId: prestamoBId
  });

  assert.equal(devolucion.status, 201);
  assert.equal(devolucion.cuerpo.data.referenceMovementId, prestamoBId);
  assert.equal(devolucion.cuerpo.data.resultingStock, 7);
});

test("devolucion que supera el saldo pendiente devuelve 422", async () => {
  const { status, cuerpo } = await pedirJson(`/api/v1/inventory/${materialBId}/movements`, tokenDe(SERVER_USER), {
    type: "devolucion",
    quantity: 4,
    reason: "Devolucion excesiva",
    referenceMovementId: prestamoBId
  });

  assert.equal(status, 422);
  assert.equal(cuerpo.error.details[0].field, "quantity");
});

test("devolucion que completa el prestamo y luego otra devuelve 422", async () => {
  const completa = await pedirJson(`/api/v1/inventory/${materialBId}/movements`, tokenDe(SERVER_USER), {
    type: "devolucion",
    quantity: 3,
    reason: "Devolucion final",
    referenceMovementId: prestamoBId
  });

  assert.equal(completa.status, 201);

  const extra = await pedirJson(`/api/v1/inventory/${materialBId}/movements`, tokenDe(SERVER_USER), {
    type: "devolucion",
    quantity: 1,
    reason: "Devolucion extra",
    referenceMovementId: prestamoBId
  });

  assert.equal(extra.status, 422);
  assert.equal(extra.cuerpo.error.details[0].field, "referenceMovementId");
});

test("una devolucion no puede referenciar un prestamo de otro material", async () => {
  const otroMaterial = await pedirJson("/api/v1/inventory", tokenDe(SERVER_USER), {
    name: "Atomizador",
    category: "material",
    quantity: 10
  });

  const otroPrestamo = await pedirJson(`/api/v1/inventory/${otroMaterial.cuerpo.data.id}/movements`, tokenDe(SERVER_USER), {
    type: "prestamo",
    quantity: 1,
    reason: "Prestamo temporal"
  });

  const { status, cuerpo } = await pedirJson(`/api/v1/inventory/${materialBId}/movements`, tokenDe(SERVER_USER), {
    type: "devolucion",
    quantity: 1,
    reason: "Devolucion cruzada",
    referenceMovementId: otroPrestamo.cuerpo.data.id
  });

  assert.equal(status, 422);
  assert.equal(cuerpo.error.details[0].field, "referenceMovementId");
});

test("una devolucion no puede referenciar un movimiento que no es prestamo", async () => {
  const alta = await pedirJson(`/api/v1/inventory/${materialBId}/movements`, tokenDe(SERVER_USER), {
    type: "alta",
    quantity: 10,
    reason: "Reabastecimiento de guantes"
  });

  const { status, cuerpo } = await pedirJson(`/api/v1/inventory/${materialBId}/movements`, tokenDe(SERVER_USER), {
    type: "devolucion",
    quantity: 1,
    reason: "Devolucion invalida",
    referenceMovementId: alta.cuerpo.data.id
  });

  assert.equal(status, 422);
  assert.equal(cuerpo.error.details[0].field, "referenceMovementId");
});

let materialDId;

test("un ajuste autorizado fija el stock a un valor objetivo", async () => {
  const creado = await pedirJson("/api/v1/inventory", tokenDe(SERVER_USER), {
    name: "Monitor Dell 24",
    category: "tecnologia",
    quantity: 0,
    minQuantity: 25
  });

  materialDId = creado.cuerpo.data.id;

  const ajuste = await pedirJson(`/api/v1/inventory/${materialDId}/movements/adjust`, tokenDe(SERVER_USER), {
    nuevoStock: 30,
    reason: "Conteo fisico de cierre"
  });

  assert.equal(ajuste.status, 201);
  assert.equal(ajuste.cuerpo.data.type, "ajuste");
  assert.equal(ajuste.cuerpo.data.quantity, 30);
  assert.equal(ajuste.cuerpo.data.previousStock, 0);
  assert.equal(ajuste.cuerpo.data.resultingStock, 30);

  const stock = await pedir(`/api/v1/inventory/${materialDId}/stock`, tokenDe(SERVER_USER));
  assert.equal(stock.cuerpo.data.quantity, 30);
});

test("un ajuste sin diferencia de stock devuelve 422", async () => {
  const { status, cuerpo } = await pedirJson(`/api/v1/inventory/${materialDId}/movements/adjust`, tokenDe(SERVER_USER), {
    nuevoStock: 30,
    reason: "Otro conteo"
  });

  assert.equal(status, 422);
  assert.equal(cuerpo.error.details[0].field, "nuevoStock");
});

test("nuevoStock negativo o no entero devuelve 422", async () => {
  const negativo = await pedirJson(`/api/v1/inventory/${materialDId}/movements/adjust`, tokenDe(SERVER_USER), {
    nuevoStock: -1,
    reason: "Invalido"
  });

  assert.equal(negativo.status, 422);
  assert.equal(negativo.cuerpo.error.details[0].field, "nuevoStock");

  const decimal = await pedirJson(`/api/v1/inventory/${materialDId}/movements/adjust`, tokenDe(SERVER_USER), {
    nuevoStock: 10.5,
    reason: "Invalido"
  });

  assert.equal(decimal.status, 422);
  assert.equal(decimal.cuerpo.error.details[0].field, "nuevoStock");
});

test("un rol sin INVENTORY_MANAGE no puede ajustar stock (403)", async () => {
  const { status, cuerpo } = await pedirJson(`/api/v1/inventory/${materialDId}/movements/adjust`, tokenDe(SECRETARIO_READ), {
    nuevoStock: 1,
    reason: "Intento no autorizado"
  });

  assert.equal(status, 403);
  assert.equal(cuerpo.error.code, "forbidden");
});

test("la verificacion de stock reconstruye el historial y es consistente", async () => {
  const ajuste = await pedirJson(`/api/v1/inventory/${materialDId}/movements/adjust`, tokenDe(SERVER_USER), {
    nuevoStock: 20,
    reason: "Segundo conteo fisico"
  });

  assert.equal(ajuste.status, 201);
  assert.equal(ajuste.cuerpo.data.quantity, 10);

  const verificado = await pedir(`/api/v1/inventory/${materialDId}/stock/verify`, tokenDe(SERVER_USER));
  assert.equal(verificado.status, 200);
  assert.equal(verificado.cuerpo.data.stockActual, 20);
  assert.equal(verificado.cuerpo.data.stockCalculado, 20);
  assert.equal(verificado.cuerpo.data.consistente, true);
  assert.equal(verificado.cuerpo.data.movimientos, 2);
});

test("listado de movimientos filtra por tipo y por motivo", async () => {
  const porTipo = await pedir(`/api/v1/inventory/${materialDId}/movements?type=ajuste`, tokenDe(SERVER_USER));
  assert.equal(porTipo.status, 200);
  assert.ok(porTipo.cuerpo.data.movements.length >= 1);
  assert.ok(porTipo.cuerpo.data.movements.every((m) => m.type === "ajuste"));

  const porMotivo = await pedir(`/api/v1/inventory-movements?motivo=${encodeURIComponent("conteo")}`, tokenDe(SERVER_USER));
  assert.ok(porMotivo.cuerpo.data.movements.length >= 1);
  assert.ok(porMotivo.cuerpo.data.movements.every((m) => String(m.reason).toLowerCase().includes("conteo")));
});

test("listado global de movimientos filtra por itemId y por usuario", async () => {
  const porItem = await pedir(`/api/v1/inventory-movements?itemId=${materialDId}`, tokenDe(SERVER_USER));
  assert.equal(porItem.status, 200);
  assert.ok(porItem.cuerpo.data.movements.length >= 1);
  assert.ok(porItem.cuerpo.data.movements.every((m) => m.itemId === materialDId));

  const porUsuario = await pedir("/api/v1/inventory-movements?userId=usr_server", tokenDe(SERVER_USER));
  assert.ok(porUsuario.cuerpo.data.movements.length >= 1);
  assert.ok(porUsuario.cuerpo.data.movements.every((m) => m.userId === "usr_server"));
});

test("el estado del material se sincroniza a agotado cuando llega a cero", async () => {
  const pendiente = await pedir(`/api/v1/inventory/${materialBId}/stock`, tokenDe(SERVER_USER));
  const stockB = pendiente.cuerpo.data.quantity;

  await pedirJson(`/api/v1/inventory/${materialBId}/movements`, tokenDe(SERVER_USER), {
    type: "baja",
    quantity: stockB,
    reason: "Consumo total"
  });

  const stock = await pedir(`/api/v1/inventory/${materialBId}/stock`, tokenDe(SERVER_USER));
  assert.equal(stock.cuerpo.data.quantity, 0);
  assert.equal(stock.cuerpo.data.status, "agotado");
  assert.equal(stock.cuerpo.data.nivel, "agotado");

  const movimientos = await pedir(`/api/v1/inventory/${materialBId}/movements`, tokenDe(SERVER_USER));
  const ultimo = movimientos.cuerpo.data.movements.at(-1);
  assert.equal(ultimo.type, "baja");
  assert.equal(ultimo.resultingStock, 0);
});

test("no se permite modificar el stock via PATCH (solo movimientos)", async () => {
  const { status, cuerpo } = await pedirJson(`/api/v1/inventory/${materialAId}`, tokenDe(SERVER_USER), {
    quantity: 99
  }, "PATCH");

  assert.equal(status, 422);
  assert.equal(cuerpo.error.details[0].field, "quantity");
});

test("modificar datos del material queda auditado en el historial", async () => {
  const { status } = await pedirJson(`/api/v1/inventory/${materialAId}`, tokenDe(SERVER_USER), {
    location: "Server - Estante C",
    status: "en_reparacion"
  }, "PATCH");

  assert.equal(status, 200);

  const history = await pedir(`/api/v1/inventory/${materialAId}/history`, tokenDe(SERVER_USER));
  assert.equal(history.status, 200);
  const campos = history.cuerpo.data.history.map((h) => h.field);
  assert.ok(campos.includes("location"));
  assert.ok(campos.includes("status"));
});

test("lista de materiales filtra por categoria y ubicacion", async () => {
  const porCategoria = await pedir("/api/v1/inventory?category=equipamiento", tokenDe(SERVER_USER));
  assert.equal(porCategoria.status, 200);
  assert.ok(porCategoria.cuerpo.data.every((i) => i.category === "equipamiento"));

  const porUbicacion = await pedir(`/api/v1/inventory?location=${encodeURIComponent("Server - Estante C")}`, tokenDe(SERVER_USER));
  assert.ok(porUbicacion.cuerpo.data.every((i) => i.location === "Server - Estante C"));
});

test("material con stock bajo aparece en /stock-low", async () => {
  const { status, cuerpo } = await pedir("/api/v1/inventory/stock-low", tokenDe(SERVER_USER));
  assert.equal(status, 200);
  assert.ok(cuerpo.data.some((i) => i.itemId === materialDId && i.nivel === "bajo"));
});

test("material desactivado no admite nuevos movimientos (409)", async () => {
  const { status } = await pedir(`/api/v1/inventory/${materialDId}`, tokenDe(SERVER_USER), { method: "DELETE" });
  assert.equal(status, 200);

  const nuevo = await pedirJson(`/api/v1/inventory/${materialDId}/movements`, tokenDe(SERVER_USER), {
    type: "alta",
    quantity: 1,
    reason: "Intento sobre material dado de baja"
  });

  assert.equal(nuevo.status, 409);
});

test("no aparece por defecto en listados tras la baja", async () => {
  const { status, cuerpo } = await pedir("/api/v1/inventory", tokenDe(SERVER_USER));

  assert.equal(status, 200);
  assert.ok(!cuerpo.data.some((i) => i.id === materialDId && i.isActive));
});