/* Modulo Informes: plantillas, redaccion, saneado, historial, baja y exportacion. */

import assert from "node:assert/strict";
import test, { after, before, beforeEach } from "node:test";
import { createApp } from "../src/app.mjs";
import { apiRoutes } from "../routes/index.mjs";
import { resetStore } from "../database/memory-store.mjs";
import { seedAuthData } from "../database/seeds/auth.seed.mjs";

const PUERTO = 4017;
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
  tokens.docente = (await login("docente@prece.local", "Docente123!")).accessToken;
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

  const tipo = respuesta.headers.get("content-type") ?? "";
  const cuerpo = tipo.includes("application/json") ? await respuesta.json() : Buffer.from(await respuesta.arrayBuffer());
  return { status: respuesta.status, cuerpo, tipo };
}

const NUEVO_INFORME = {
  titulo: "Informe institucional del primer trimestre",
  asunto: "Presentacion institucional",
  dirigidoA: "Consejo de Direccion",
  autor: "Direccion General",
  autorCargo: "Direccion",
  plantilla: "institucional"
};

test("las plantillas exponen la estructura de trabajo de cada informe", async () => {
  const { status, cuerpo } = await pedir("GET", "/api/v1/reports/plantillas", "director");

  assert.equal(status, 200);
  assert.equal(cuerpo.data.length, 4);
  assert.ok(cuerpo.data.every((plantilla) => plantilla.secciones.length > 0));
  assert.ok(cuerpo.data.some((plantilla) => plantilla.id === "personal"));
});

test("crear un informe guarda la estructura de la plantilla y el historial vacio", async () => {
  const { status, cuerpo } = await pedir("POST", "/api/v1/reports", "director", NUEVO_INFORME);

  assert.equal(status, 201);
  assert.equal(cuerpo.data.estado, "borrador");
  assert.equal(cuerpo.data.versiones.length, 0);
  assert.match(cuerpo.data.contenido, /<h2>Presentación<\/h2>/);
});

test("el contenido se sanea: se van los scripts y los atributos peligrosos", async () => {
  const { status, cuerpo } = await pedir("POST", "/api/v1/reports", "director", {
    ...NUEVO_INFORME,
    contenido:
      "<p onclick=\"robar()\">Texto</p><script>alert('x')</script><a href=\"javascript:alert(1)\">enlace</a><strong>negrita</strong>"
  });

  assert.equal(status, 201);
  assert.ok(!cuerpo.data.contenido.includes("script"));
  assert.ok(!cuerpo.data.contenido.includes("onclick"));
  assert.ok(!cuerpo.data.contenido.includes("javascript:"));
  assert.ok(cuerpo.data.contenido.includes("<strong>negrita</strong>"));
});

test("el titulo se valida en el backend", async () => {
  const { status, cuerpo } = await pedir("POST", "/api/v1/reports", "director", { ...NUEVO_INFORME, titulo: "a" });

  assert.equal(status, 422);
  assert.ok(cuerpo.error.details.some((detalle) => detalle.field === "titulo"));
});

test("cada guardado deja una version y se puede restaurar", async () => {
  const creado = await pedir("POST", "/api/v1/reports", "director", { ...NUEVO_INFORME, contenido: "<p>Version 1</p>" });
  const id = creado.cuerpo.data.id;

  const guardado = await pedir("PATCH", `/api/v1/reports/${id}`, "director", { contenido: "<p>Version 2</p>" });
  assert.equal(guardado.status, 200);
  assert.equal(guardado.cuerpo.data.contenido, "<p>Version 2</p>");
  assert.equal(guardado.cuerpo.data.versiones.length, 1);
  assert.equal(guardado.cuerpo.data.versiones[0].contenido, "<p>Version 1</p>");

  const historial = await pedir("GET", `/api/v1/reports/${id}/versiones`, "director");
  assert.equal(historial.cuerpo.data.length, 1);

  const restaurado = await pedir("POST", `/api/v1/reports/${id}/versiones/1/restaurar`, "director");
  assert.equal(restaurado.status, 200);
  assert.equal(restaurado.cuerpo.data.contenido, "<p>Version 1</p>");
});

test("la exportacion devuelve un PDF valido", async () => {
  const creado = await pedir("POST", "/api/v1/reports", "director", { ...NUEVO_INFORME, contenido: "<h2>Sección</h2><p>Contenido</p>" });
  const id = creado.cuerpo.data.id;

  const { status, cuerpo, tipo } = await pedir("GET", `/api/v1/reports/${id}/pdf`, "director");

  assert.equal(status, 200);
  assert.match(tipo, /application\/pdf/);
  assert.ok(Buffer.isBuffer(cuerpo));
  assert.equal(cuerpo.slice(0, 5).toString("latin1"), "%PDF-");
  assert.ok(cuerpo.includes(Buffer.from("%%EOF", "latin1")));
});

test("el PDF se descarga con un nombre de archivo limpio y legible", async () => {
  const creado = await pedir("POST", "/api/v1/reports", "director", {
    ...NUEVO_INFORME,
    titulo: "Informe de presentación -primer trimestre"
  });
  const id = creado.cuerpo.data.id;

  const respuesta = await fetch(`${base}/api/v1/reports/${id}/pdf`, {
    headers: { Authorization: `Bearer ${tokens.director}` }
  });

  const disposicion = respuesta.headers.get("content-disposition");

  assert.match(disposicion, /attachment; filename="informe-de-presentacion-primer-trimestre\.pdf"/);
});

test("el navegador puede leer el nombre del archivo: la cabecera queda expuesta", async () => {
  const respuesta = await fetch(`${base}/api/v1/reports/plantillas`, {
    headers: { Origin: "http://localhost:5173" }
  });

  const expuestas = respuesta.headers.get("access-control-expose-headers") ?? "";

  assert.ok(expuestas.includes("Content-Disposition"));
});

test("un rol sin permiso de informes no puede crearlos ni listarlos", async () => {
  const listado = await pedir("GET", "/api/v1/reports", "docente");
  const alta = await pedir("POST", "/api/v1/reports", "docente", NUEVO_INFORME);

  assert.equal(listado.status, 403);
  assert.equal(alta.status, 403);
});

test("la baja es logica y el informe deja de estar disponible", async () => {
  const creado = await pedir("POST", "/api/v1/reports", "director", NUEVO_INFORME);
  const id = creado.cuerpo.data.id;

  const baja = await pedir("DELETE", `/api/v1/reports/${id}`, "director");
  assert.equal(baja.status, 200);
  assert.ok(baja.cuerpo.data.eliminadoEn);

  const consulta = await pedir("GET", `/api/v1/reports/${id}`, "director");
  assert.equal(consulta.status, 404);
});

test("los filtros de listado funcionan sobre estado y texto", async () => {
  await pedir("POST", "/api/v1/reports", "director", { ...NUEVO_INFORME, titulo: "Informe de asistencia anual" });
  await pedir("POST", "/api/v1/reports", "director", { ...NUEVO_INFORME, titulo: "Informe academico", estado: "finalizado" });

  const porEstado = await pedir("GET", "/api/v1/reports?estado=finalizado", "director");
  assert.equal(porEstado.cuerpo.data.length, 1);
  assert.equal(porEstado.cuerpo.data[0].titulo, "Informe academico");

  const porTexto = await pedir("GET", "/api/v1/reports?q=asistencia", "director");
  assert.equal(porTexto.cuerpo.data.length, 1);
  assert.equal(porTexto.cuerpo.paginacion.total, 1);
});
