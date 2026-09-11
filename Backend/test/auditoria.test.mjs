/* Auditoría transversal y logs de errores: npm test

   Cubre el registro automático de acciones sensibles, la sanitización de datos
   (sin contraseñas ni tokens), la consulta de reportes y el registro de fallos. */

import assert from "node:assert/strict";
import test, { after, before, beforeEach } from "node:test";
import { createApp } from "../src/app.mjs";
import { resetStore, getStore } from "../database/memory-store.mjs";
import auditService from "../modules/audit/audit.service.mjs";
import { exportCsv as exportAuditCsv, listLogs } from "../modules/audit/audit.controller.mjs";
import { noEncontrado } from "../utils/api-error.mjs";

const PUERTO = 3997;
const base = `http://127.0.0.1:${PUERTO}`;
let servidor;

const rutasDePrueba = {
  "POST /api/v1/students": () => ({ data: { id: "stu_1" } }),
  "PATCH /api/v1/students": () => ({ data: { id: "stu_1" } }),
  "DELETE /api/v1/students/:id": () => ({ data: { ok: true } }),
  "POST /api/v1/falla": () => {
    throw noEncontrado("El curso");
  },
  "GET /api/v1/audit/logs": ({ url }) => listLogs({ url }),
  "GET /api/v1/audit/export": ({ url, response }) => exportAuditCsv({ url, response })
};

before(async () => {
  servidor = createApp(rutasDePrueba);
  await new Promise((listo) => servidor.listen(PUERTO, listo));
});

after(async () => {
  await new Promise((listo) => servidor.close(listo));
});

beforeEach(() => {
  resetStore();
});

async function pedir(ruta, opciones) {
  const respuesta = await fetch(`${base}${ruta}`, opciones);
  return { status: respuesta.status, respuesta };
}

test("registrar una accion guarda usuario, fecha, accion, valores e IP", () => {
  const registro = auditService.registrar({
    usuarioId: "usr_1",
    accion: "update",
    tabla: "students",
    registroId: "stu_9",
    valorAnterior: { nombre: "Damian" },
    valorNuevo: { nombre: "Daniel" },
    motivo: "Cambio de nombre",
    metodo: "PATCH",
    ruta: "/api/v1/students",
    ip: "192.168.1.10"
  });

  assert.ok(registro.id);
  assert.equal(registro.usuarioId, "usr_1");
  assert.equal(registro.accion, "update");
  assert.equal(registro.tabla, "students");
  assert.equal(registro.registroId, "stu_9");
  assert.deepEqual(registro.valorAnterior, { nombre: "Damian" });
  assert.deepEqual(registro.valorNuevo, { nombre: "Daniel" });
  assert.equal(registro.ip, "192.168.1.10");
  assert.ok(registro.fechaHora);
});

test("la sanitización oculta contraseñas y tokens en ambas versiones del valor", () => {
  auditService.registrar({
    usuarioId: "usr_1",
    accion: "create",
    tabla: "auth",
    valorAnterior: { password: "anterior-secreta" },
    valorNuevo: {
      email: "user@prece.local",
      password: "ClaveSuperSecreta123",
      refreshToken: "tk-abc"
    }
  });

  const [registro] = auditService.list();

  assert.equal(registro.valorNuevo.email, "user@prece.local");
  assert.equal(registro.valorNuevo.password, "[oculto]");
  assert.equal(registro.valorNuevo.refreshToken, "[oculto]");
  assert.equal(registro.valorAnterior.password, "[oculto]");
  assert.ok(!JSON.stringify(registro).includes("ClaveSuperSecreta123"));
  assert.ok(!JSON.stringify(registro).includes("tk-abc"));
});

test("las consultas filtran por usuario, accion y tabla", () => {
  auditService.registrar({ usuarioId: "usr_1", accion: "create", tabla: "students" });
  auditService.registrar({ usuarioId: "usr_2", accion: "create", tabla: "students" });
  auditService.registrar({ usuarioId: "usr_1", accion: "delete", tabla: "courses" });

  const porUsuario = auditService.list({ usuarioId: "usr_1" });
  const porAccion = auditService.list({ accion: "create" });
  const porTabla = auditService.list({ tabla: "courses" });

  assert.equal(porUsuario.length, 2);
  assert.equal(porAccion.length, 2);
  assert.equal(porTabla.length, 1);
  assert.equal(porTabla[0].accion, "delete");
});

test("una accion invalida es rechazada", () => {
  assert.throws(
    () => auditService.registrar({ accion: "hacer-algo-raro" }),
    /no es valida/
  );
});

test("un registro inexistente devuelve 404 al consultar por id", () => {
  assert.throws(() => auditService.getById("aud_no_existe"), /no existe/);
});

test("el CSV de exportación incluye la cabecera y las filas registradas", () => {
  auditService.registrar({
    usuarioId: "usr_1",
    accion: "create",
    tabla: "students",
    valorNuevo: { nombre: "Ana" },
    ip: "10.0.0.1"
  });

  const csv = auditService.aCsv(auditService.list());

  assert.match(csv, /^id;fecha_hora;usuario_id/);
  assert.match(csv, /students/);
  assert.ok(csv.split("\r\n").length >= 2);
});

test("las mutaciones se registran solas al pasar por la app (POST, PATCH y DELETE)", async () => {
  await pedir("/api/v1/students", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nombre: "Ana", password: "Secreto123", schoolId: "esc-1" })
  });

  await pedir("/api/v1/students", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nombre: "Ana Maria" })
  });

  await pedir("/api/v1/students/123", { method: "DELETE" });

  const registros = auditService.list();

  assert.equal(registros.length, 3);

  const [creacion] = auditService.list({ accion: "create" });
  assert.equal(creacion.tabla, "students");
  assert.equal(creacion.valorNuevo.nombre, "Ana");
  assert.equal(creacion.valorNuevo.password, "[oculto]");
  assert.equal(creacion.escuelaId, "esc-1");

  const [borrado] = auditService.list({ accion: "delete" });
  assert.equal(borrado.registroId, "123");
});

test("las lecturas normales (GET) no llenan el log de auditoría automáticamente", async () => {
  await pedir("/api/v1/audit/logs");

  assert.equal(auditService.list().length, 0);
});

test("los fallos se registran en el log de errores sin el cuerpo de la petición", async () => {
  await pedir("/api/v1/falla", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: "ClaveSecreta", motivo: "roto" })
  });

  const errores = auditService.listErrors();

  assert.equal(errores.length, 1);
  assert.equal(errores[0].tipo, "esperado");
  assert.equal(errores[0].code, "NOT_FOUND");
  assert.match(errores[0].message, /curso/);
  assert.ok(!JSON.stringify(errores).includes("ClaveSecreta"));
});

test("el endpoint de descarga entrega un CSV como adjunto", async () => {
  auditService.registrar({ usuarioId: "usr_1", accion: "create", tabla: "students" });

  const { status, respuesta } = await pedir("/api/v1/audit/export");
  const texto = await respuesta.text();

  assert.equal(status, 200);
  assert.match(respuesta.headers.get("content-type") ?? "", /text\/csv/);
  assert.match(respuesta.headers.get("content-disposition") ?? "", /attachment; filename="auditoria-/);
  assert.match(texto, /students/);
});

test("el almacenamiento en memoria arranca vacío y se resetea", () => {
  assert.equal(getStore().auditLogs.size, 0);
  assert.equal(getStore().errorLogs.size, 0);

  auditService.registrar({ accion: "create", tabla: "students" });

  assert.equal(getStore().auditLogs.size, 1);

  resetStore();

  assert.equal(getStore().auditLogs.size, 0);
});