/* Transiciones del estado global: node --test src */

import assert from "node:assert/strict";
import test from "node:test";
import { ESTADO_INICIAL, FASE, SESION, reducir } from "./proveedor.js";

const SESION_API = {
  usuario: { id: 3, nombre: "Ana", apellido: "Perez", roles: [{ id: "area-lead", nombre: "Jefatura" }] },
  permisos: ["identity:read", "identity:update"],
  alcances: ["school", "area"]
};

test("la aplicacion arranca inicializando y con la sesion en carga", () => {
  assert.equal(ESTADO_INICIAL.fase, FASE.inicializando);
  assert.equal(ESTADO_INICIAL.sesion.estado, SESION.cargando);
  assert.deepEqual(ESTADO_INICIAL.sesion.permisos, []);
});

test("resolver la sesion deja la aplicacion lista y autenticada", () => {
  const estado = reducir(ESTADO_INICIAL, { tipo: "sesion/lista", datos: SESION_API, origen: "api" });

  assert.equal(estado.fase, FASE.lista);
  assert.equal(estado.sesion.estado, SESION.autenticada);
  assert.equal(estado.sesion.usuario.nombre, "Ana");
  assert.deepEqual(estado.sesion.permisos, ["identity:read", "identity:update"]);
  assert.deepEqual(
    estado.sesion.roles.map((rol) => rol.id),
    ["area-lead"]
  );
  assert.equal(estado.sesion.origen, "api");
});

test("sin sesion la aplicacion queda lista pero anonima", () => {
  const estado = reducir(ESTADO_INICIAL, { tipo: "sesion/anonima" });

  assert.equal(estado.fase, FASE.lista);
  assert.equal(estado.sesion.estado, SESION.anonima);
  assert.equal(estado.sesion.usuario, null);
  assert.deepEqual(estado.sesion.permisos, [], "sin sesion no quedan permisos");
});

test("la sesion expirada limpia usuario, permisos y notificaciones", () => {
  const autenticada = reducir(ESTADO_INICIAL, {
    tipo: "sesion/lista",
    datos: SESION_API,
    origen: "api"
  });
  const conNotificaciones = reducir(autenticada, {
    tipo: "notificaciones/listas",
    items: [{ id: 1, leida: false }],
    origen: "api"
  });

  const estado = reducir(conNotificaciones, { tipo: "sesion/expirada" });

  assert.equal(estado.sesion.estado, SESION.expirada);
  assert.equal(estado.sesion.usuario, null);
  assert.deepEqual(estado.sesion.permisos, []);
  assert.deepEqual(estado.notificaciones.items, [], "no quedan datos de la sesion anterior");
  assert.equal(estado.errorGlobal.esSesionExpirada, true);
});

test("la carga inicial de sesion bloquea, pero conserva lo ya conocido", () => {
  const autenticada = reducir(ESTADO_INICIAL, {
    tipo: "sesion/lista",
    datos: SESION_API,
    origen: "api"
  });
  const estado = reducir(autenticada, { tipo: "sesion/cargando" });

  assert.equal(estado.fase, FASE.inicializando);
  assert.equal(estado.sesion.estado, SESION.cargando);
  assert.equal(estado.sesion.usuario.nombre, "Ana", "el usuario sigue mientras se revalida");
});

test("el refresco silencioso no vuelve a la pantalla de arranque", () => {
  const autenticada = reducir(ESTADO_INICIAL, {
    tipo: "sesion/lista",
    datos: SESION_API,
    origen: "api"
  });

  const estado = reducir(autenticada, { tipo: "sesion/cargando", silencioso: true });

  assert.equal(estado.fase, FASE.lista, "la aplicacion sigue usable");
  assert.equal(estado.sesion.estado, SESION.autenticada);
  assert.equal(estado.revalidando, true);

  const resuelta = reducir(estado, { tipo: "sesion/lista", datos: SESION_API, origen: "api" });
  assert.equal(resuelta.revalidando, false);
});

test("un refresco con permisos nuevos reemplaza a los viejos", () => {
  const antes = reducir(ESTADO_INICIAL, { tipo: "sesion/lista", datos: SESION_API, origen: "api" });
  const despues = reducir(antes, {
    tipo: "sesion/lista",
    datos: { ...SESION_API, permisos: ["identity:read"] },
    origen: "api"
  });

  assert.deepEqual(despues.sesion.permisos, ["identity:read"]);
});

test("las notificaciones pasan por carga, listado y error", () => {
  const cargando = reducir(ESTADO_INICIAL, { tipo: "notificaciones/cargando" });
  assert.equal(cargando.notificaciones.cargando, true);

  const listas = reducir(cargando, {
    tipo: "notificaciones/listas",
    items: [
      { id: 1, leida: false },
      { id: 2, leida: true }
    ],
    origen: "demo"
  });

  assert.equal(listas.notificaciones.cargando, false);
  assert.equal(listas.notificaciones.items.length, 2);
  assert.equal(listas.notificaciones.origen, "demo");

  const fallo = reducir(listas, { tipo: "notificaciones/error", error: { mensaje: "sin conexion" } });
  assert.equal(fallo.notificaciones.cargando, false);
  assert.equal(fallo.notificaciones.error.mensaje, "sin conexion");
});

test("marcar una notificacion no toca a las demas", () => {
  const listas = reducir(ESTADO_INICIAL, {
    tipo: "notificaciones/listas",
    items: [
      { id: 1, leida: false },
      { id: 2, leida: false }
    ],
    origen: "api"
  });

  const estado = reducir(listas, { tipo: "notificaciones/leida", id: 1 });

  assert.equal(estado.notificaciones.items[0].leida, true);
  assert.equal(estado.notificaciones.items[1].leida, false);

  const todas = reducir(estado, { tipo: "notificaciones/todas-leidas" });
  assert.ok(todas.notificaciones.items.every((item) => item.leida));
});

test("el error global se muestra y se limpia", () => {
  const conError = reducir(ESTADO_INICIAL, {
    tipo: "error-global/mostrar",
    error: { mensaje: "El servidor no responde." }
  });

  assert.equal(conError.errorGlobal.mensaje, "El servidor no responde.");
  assert.equal(reducir(conError, { tipo: "error-global/limpiar" }).errorGlobal, null);
});

test("las cargas globales no se duplican y se destapan por clave", () => {
  const una = reducir(ESTADO_INICIAL, { tipo: "carga/iniciar", clave: "sesion" });
  const repetida = reducir(una, { tipo: "carga/iniciar", clave: "sesion" });

  assert.deepEqual(repetida.cargas, ["sesion"], "la misma clave no se apila dos veces");
  assert.equal(repetida, una, "sin cambios no se crea un estado nuevo");

  const dos = reducir(una, { tipo: "carga/iniciar", clave: "catalogos" });
  assert.deepEqual(dos.cargas, ["sesion", "catalogos"]);

  const queda = reducir(dos, { tipo: "carga/terminar", clave: "sesion" });
  assert.deepEqual(queda.cargas, ["catalogos"], "termina solo la carga indicada");
});

test("una accion desconocida devuelve el mismo estado", () => {
  assert.equal(reducir(ESTADO_INICIAL, { tipo: "no-existe" }), ESTADO_INICIAL);
});
