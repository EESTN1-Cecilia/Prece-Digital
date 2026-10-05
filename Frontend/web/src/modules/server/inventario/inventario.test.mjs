import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import { InventarioService } from "./inventario-service.js";
import { PERMISOS, puede } from "../../../utils/permisos.js";

const fetchOriginal = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = fetchOriginal;
});

test("InventarioService: getMateriales arma query params y llama a /api/v1/inventory", async () => {
  let llamadaRuta = "";
  globalThis.fetch = async (url) => {
    llamadaRuta = String(url);
    return {
      ok: true,
      status: 200,
      json: async () => ({ data: [{ id: "inv-1", name: "Proyector" }] })
    };
  };

  const res = await InventarioService.getMateriales({ category: "tecnologia", status: "disponible" });
  assert.equal(res.length, 1);
  assert.equal(res[0].name, "Proyector");
  assert.match(llamadaRuta, /\/api\/v1\/inventory\?category=tecnologia&status=disponible/);
});

test("InventarioService: getMaterial consulta por id", async () => {
  let llamadaRuta = "";
  globalThis.fetch = async (url) => {
    llamadaRuta = String(url);
    return {
      ok: true,
      status: 200,
      json: async () => ({ data: { id: "inv-001", name: "Proyector Láser" } })
    };
  };

  const res = await InventarioService.getMaterial("inv-001");
  assert.equal(res.id, "inv-001");
  assert.match(llamadaRuta, /\/api\/v1\/inventory\/inv-001/);
});

test("InventarioService: createMaterial envía POST con payload JSON", async () => {
  let metodo = "";
  let bodyEnviado = null;
  globalThis.fetch = async (url, opts) => {
    metodo = opts?.method;
    bodyEnviado = JSON.parse(opts?.body || "{}");
    return {
      ok: true,
      status: 201,
      json: async () => ({ data: { id: "inv-99", ...bodyEnviado } })
    };
  };

  const nuevo = { name: "Tester Red", code: "TEST-01", category: "herramienta", schoolId: "esc-1" };
  const res = await InventarioService.createMaterial(nuevo);
  assert.equal(metodo, "POST");
  assert.equal(res.name, "Tester Red");
  assert.equal(res.code, "TEST-01");
});

test("InventarioService: updateMaterial envía PATCH con cambios", async () => {
  let metodo = "";
  let llamadaRuta = "";
  globalThis.fetch = async (url, opts) => {
    llamadaRuta = String(url);
    metodo = opts?.method;
    return {
      ok: true,
      status: 200,
      json: async () => ({ data: { id: "inv-001", location: "Depósito B" } })
    };
  };

  const res = await InventarioService.updateMaterial("inv-001", { location: "Depósito B" });
  assert.equal(metodo, "PATCH");
  assert.match(llamadaRuta, /\/api\/v1\/inventory\/inv-001/);
  assert.equal(res.location, "Depósito B");
});

test("InventarioService: deleteMaterial ejecuta DELETE sobre el endpoint de item", async () => {
  let metodo = "";
  let llamadaRuta = "";
  globalThis.fetch = async (url, opts) => {
    llamadaRuta = String(url);
    metodo = opts?.method;
    return {
      ok: true,
      status: 200,
      json: async () => ({ data: { id: "inv-001", isActive: false } })
    };
  };

  const res = await InventarioService.deleteMaterial("inv-001");
  assert.equal(metodo, "DELETE");
  assert.match(llamadaRuta, /\/api\/v1\/inventory\/inv-001/);
  assert.equal(res.isActive, false);
});

test("InventarioService: getMovimientos consulta movimientos asociados a un material", async () => {
  let llamadaRuta = "";
  globalThis.fetch = async (url) => {
    llamadaRuta = String(url);
    return {
      ok: true,
      status: 200,
      json: async () => ({ data: [{ id: "mov-1", type: "ingreso", quantity: 5 }] })
    };
  };

  const res = await InventarioService.getMovimientos({ itemId: "inv-001" });
  assert.equal(res.length, 1);
  assert.equal(res[0].type, "ingreso");
  assert.match(llamadaRuta, /\/api\/v1\/inventory-movements\?itemId=inv-001/);
});

test("Permisos de Inventario: control de acceso para lectura, creación y gestión", () => {
  const sesionLectura = { permisos: [PERMISOS.inventoryLeer] };
  const sesionAdmin = { permisos: [PERMISOS.inventoryLeer, PERMISOS.inventoryCrear, PERMISOS.inventoryEditar, PERMISOS.inventoryGestionar] };
  const sesionSinAcceso = { permisos: [] };

  assert.equal(puede(sesionLectura, PERMISOS.inventoryLeer), true);
  assert.equal(puede(sesionLectura, PERMISOS.inventoryCrear), false);
  assert.equal(puede(sesionLectura, PERMISOS.inventoryGestionar), false);

  assert.equal(puede(sesionAdmin, PERMISOS.inventoryLeer), true);
  assert.equal(puede(sesionAdmin, PERMISOS.inventoryCrear), true);
  assert.equal(puede(sesionAdmin, PERMISOS.inventoryEditar), true);
  assert.equal(puede(sesionAdmin, PERMISOS.inventoryGestionar), true);

  assert.equal(puede(sesionSinAcceso, PERMISOS.inventoryLeer), false);
});
