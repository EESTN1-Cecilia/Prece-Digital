import assert from "node:assert/strict";
import test from "node:test";
import { listarNotificaciones, marcarNotificacionLeida } from "./notificaciones-api.js";

test("el estado leído persiste por usuario y no se comparte entre cuentas", async () => {
  const almacen = new Map();
  const localStorage = {
    getItem: (clave) => almacen.get(clave) ?? null,
    setItem: (clave, valor) => almacen.set(clave, valor)
  };
  globalThis.localStorage = localStorage;
  globalThis.window = { localStorage };
  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({ data: { notifications: [] } })
  });

  const director = { id: "usuario-1" };
  const otroDirector = { id: "usuario-2" };
  const primeraCarga = await listarNotificaciones({ usuario: director, roles: ["director"] });
  const notificacion = primeraCarga.data.find((item) => item.id === "notif-dir-1");

  assert.ok(notificacion);
  assert.equal(notificacion.leida, false);

  await marcarNotificacionLeida(notificacion.id, director);

  const trasRecargar = await listarNotificaciones({ usuario: director, roles: ["director"] });
  assert.equal(trasRecargar.data.find((item) => item.id === notificacion.id).leida, true);

  const cuentaSeparada = await listarNotificaciones({ usuario: otroDirector, roles: ["director"] });
  assert.equal(cuentaSeparada.data.find((item) => item.id === notificacion.id).leida, false);
});
