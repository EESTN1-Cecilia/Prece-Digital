import test from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../src/app.mjs";
import { apiRoutes } from "../routes/index.mjs";
import { resetStore } from "../database/memory-store.mjs";
import { seedDesarrollo } from "../database/seeds/index.mjs";

async function loginAs(app, email, password) {
  const res = await fetch("http://127.0.0.1:0/api/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  return res.json();
}

test("Dashboard de Server - Integración con API", async (t) => {
  resetStore();
  await seedDesarrollo();

  const app = createApp(apiRoutes);
  await new Promise((resolve) => app.listen(0, "127.0.0.1", resolve));
  const { port } = app.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  t.after(() => {
    app.close();
  });

  await t.test("Inicio de sesión de usuario con rol server y consulta de dashboard", async () => {
    // Login como server@prece.local
    const loginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "server@prece.local", password: "Server123!" })
    });
    assert.equal(loginRes.status, 200);
    const loginData = await loginRes.json();
    const token = loginData.data?.accessToken || loginData.accessToken;
    assert.ok(token, "Debe retornar un token de acceso");

    // Consultar dashboard de server
    const dashRes = await fetch(`${baseUrl}/api/v1/dashboard/server`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    assert.equal(dashRes.status, 200, "Debe responder 200 OK");
    const dashData = await dashRes.json();
    const body = dashData.data || dashData;

    // Validar estructura de resumen de stock
    assert.ok(body.resumenStock, "Debe incluir resumenStock");
    assert.equal(typeof body.resumenStock.totalMateriales, "number");
    assert.ok(body.resumenStock.totalMateriales > 0, "Debe haber materiales cargados");
    assert.equal(typeof body.resumenStock.disponibles, "number");
    assert.equal(typeof body.resumenStock.stockBajo, "number");
    assert.equal(typeof body.resumenStock.sinStock, "number");
    assert.ok(Array.isArray(body.resumenStock.porCategoria), "Debe incluir desglose por categoría");

    // Validar listado de materiales
    assert.ok(Array.isArray(body.materiales), "Debe incluir materiales");
    assert.ok(body.materiales.length > 0, "Debe listar materiales");
    const primerMaterial = body.materiales[0];
    assert.ok(primerMaterial.id, "Cada material debe tener id");
    assert.ok(primerMaterial.name, "Cada material debe tener nombre");
    assert.ok(primerMaterial.code, "Cada material debe tener código");
    assert.ok(primerMaterial.stockStatus, "Debe tener estado calculado de stock");

    // Validar solicitudes pendientes
    assert.ok(Array.isArray(body.solicitudesPendientes), "Debe incluir solicitudes pendientes");
    assert.equal(typeof body.contadorPendientes, "number");

    // Validar reservas
    assert.ok(Array.isArray(body.reservas), "Debe incluir reservas");

    // Validar alertas
    assert.ok(Array.isArray(body.alertas), "Debe incluir alertas");
    assert.ok(body.alertas.length > 0, "Debe generar alertas por stock bajo o agotado");

    // Validar movimientos recientes
    assert.ok(Array.isArray(body.movimientosRecientes), "Debe incluir movimientos recientes");
    assert.ok(body.movimientosRecientes.length > 0, "Debe listar movimientos");
  });

  await t.test("Operaciones de stock y actualización de datos", async () => {
    const loginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "server@prece.local", password: "Server123!" })
    });
    const loginData = await loginRes.json();
    const token = loginData.data?.accessToken || loginData.accessToken;

    // Crear un nuevo material
    const createRes = await fetch(`${baseUrl}/api/v1/inventory`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        name: "Tester Multifunción LAN",
        code: "TST-99",
        category: "herramienta",
        quantity: 5,
        minQuantity: 2,
        schoolId: "esc-1"
      })
    });
    assert.equal(createRes.status, 201, "Debe crear el material");
    const createdItem = await createRes.json();
    const itemId = createdItem.data?.id || createdItem.id;

    // Registrar egreso
    const movRes = await fetch(`${baseUrl}/api/v1/inventory-movements`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        itemId,
        type: "egreso",
        quantity: 4,
        toSpaceId: "Taller 2",
        schoolId: "esc-1"
      })
    });
    assert.equal(movRes.status, 201, "Debe registrar el movimiento");

    // Reconsultar dashboard: ahora quantity es 1 (<= minQuantity 2), debe figurar en stockBajo
    const dashRes = await fetch(`${baseUrl}/api/v1/dashboard/server`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const dashData = await dashRes.json();
    const body = dashData.data || dashData;
    const materialModificado = body.materiales.find((m) => m.id === itemId);
    assert.ok(materialModificado, "El nuevo material debe estar en el dashboard");
    assert.equal(materialModificado.quantity, 1, "La cantidad debe actualizarse a 1");
    assert.equal(materialModificado.stockStatus, "bajo", "El estado debe ser bajo");
  });
});
