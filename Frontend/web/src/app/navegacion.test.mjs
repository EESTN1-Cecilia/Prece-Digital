/* Proteccion de rutas: node --test src

   La tabla de rutas real vive en app/rutas.js e importa las vistas; aca se usa
   una tabla de prueba para chequear la logica sin arrastrar React. */

import assert from "node:assert/strict";
import test from "node:test";
import {
  ACCESO,
  coincidePatron,
  construirRuta,
  decidirAcceso,
  resolverRuta,
  rutasVisibles
} from "./navegacion.js";

const RUTAS = [
  { patron: "#/login", titulo: "Iniciar sesion", publica: true },
  { patron: "#/inicio", titulo: "Inicio", enMenu: true },
  { patron: "#/usuarios/nuevo", titulo: "Nuevo usuario", permisos: ["identity:create"] },
  { patron: "#/usuarios/:id/editar", titulo: "Editar usuario", permisos: ["identity:update"] },
  { patron: "#/usuarios/:id", titulo: "Detalle", permisos: ["identity:read"] },
  { patron: "#/usuarios", titulo: "Usuarios", permisos: ["identity:read"], enMenu: true },
  { patron: "#/direccion", titulo: "Direccion", roles: ["director"], enMenu: true }
];

const anonimo = { cargando: false, autenticado: false, permisos: [], roles: [] };
const cargando = { cargando: true, autenticado: false, permisos: [], roles: [] };
const expirada = { cargando: false, autenticado: false, expirada: true, permisos: [], roles: [] };

const lector = {
  cargando: false,
  autenticado: true,
  permisos: ["identity:read"],
  roles: [{ id: "preceptor" }]
};

const administrador = {
  cargando: false,
  autenticado: true,
  permisos: ["identity:read", "identity:create", "identity:update"],
  roles: [{ id: "system-admin" }]
};

const superadmin = {
  cargando: false,
  autenticado: true,
  permisos: ["*"],
  roles: [{ id: "super-admin" }]
};

const acceso = (hash, sesion) => decidirAcceso(resolverRuta(hash, RUTAS), sesion).tipo;

/* ---------- Resolucion ---------- */

test("coincidePatron toma los parametros y rechaza lo que no calza", () => {
  assert.deepEqual(coincidePatron("#/usuarios/:id", "#/usuarios/42"), { id: "42" });
  assert.deepEqual(coincidePatron("#/usuarios", "#/usuarios"), {});
  assert.equal(coincidePatron("#/usuarios/:id", "#/usuarios"), null);
  assert.equal(coincidePatron("#/usuarios", "#/usuarios/42"), null);
  assert.equal(coincidePatron("#/usuarios", "#/roles"), null);
});

test("los parametros llegan decodificados", () => {
  assert.deepEqual(coincidePatron("#/usuarios/:id", "#/usuarios/ana%20perez"), { id: "ana perez" });
});

test("las rutas fijas ganan sobre las que tienen parametro", () => {
  assert.equal(resolverRuta("#/usuarios/nuevo", RUTAS).ruta.titulo, "Nuevo usuario");
  assert.equal(resolverRuta("#/usuarios/12", RUTAS).ruta.titulo, "Detalle");
  assert.equal(resolverRuta("#/usuarios/12/editar", RUTAS).ruta.titulo, "Editar usuario");
});

test("una ruta inexistente no resuelve", () => {
  assert.equal(resolverRuta("#/no-existe", RUTAS), null);
  assert.equal(acceso("#/no-existe", administrador), ACCESO.noEncontrada);
});

/* ---------- Sesion ---------- */

test("la ruta publica se ve sin sesion", () => {
  assert.equal(acceso("#/login", anonimo), ACCESO.permitido);
  assert.equal(acceso("#/login", cargando), ACCESO.permitido);
});

test("mientras se carga la sesion no se decide nada", () => {
  /* Sin esto se manda al login a alguien que si tenia sesion, y se ve el
     parpadeo entre pantallas. */
  assert.equal(acceso("#/usuarios", cargando), ACCESO.esperar);
  assert.equal(acceso("#/inicio", cargando), ACCESO.esperar);
});

test("sin sesion, una ruta protegida manda al login", () => {
  assert.equal(acceso("#/inicio", anonimo), ACCESO.login);
  assert.equal(acceso("#/usuarios", anonimo), ACCESO.login);
});

test("la sesion expirada tambien manda al login y se distingue del anonimo", () => {
  const decision = decidirAcceso(resolverRuta("#/usuarios", RUTAS), expirada);

  assert.equal(decision.tipo, ACCESO.login);
  assert.equal(decision.motivo, "expirada");
  assert.equal(decidirAcceso(resolverRuta("#/usuarios", RUTAS), anonimo).motivo, "sin-sesion");
});

/* ---------- Permisos ---------- */

test("con el permiso se entra y sin el se deniega", () => {
  assert.equal(acceso("#/usuarios", lector), ACCESO.permitido);
  assert.equal(acceso("#/usuarios/nuevo", lector), ACCESO.denegado);
  assert.equal(acceso("#/usuarios/nuevo", administrador), ACCESO.permitido);
});

test("se puede ver una seccion sin poder editarla", () => {
  assert.equal(acceso("#/usuarios/7", lector), ACCESO.permitido);
  assert.equal(acceso("#/usuarios/7/editar", lector), ACCESO.denegado);
});

test("la denegacion informa que permiso falta", () => {
  const decision = decidirAcceso(resolverRuta("#/usuarios/nuevo", RUTAS), lector);

  assert.equal(decision.tipo, ACCESO.denegado);
  assert.equal(decision.permiso, "identity:create");
});

test("el comodin habilita todo", () => {
  assert.equal(acceso("#/usuarios/nuevo", superadmin), ACCESO.permitido);
  assert.equal(acceso("#/usuarios/7/editar", superadmin), ACCESO.permitido);
});

test("una ruta sin permisos declarados solo pide sesion", () => {
  assert.equal(acceso("#/inicio", lector), ACCESO.permitido);
});

test("con varios permisos alcanza uno, salvo que se exijan todos", () => {
  const ruta = { patron: "#/x", permisos: ["a", "b"] };
  const soloA = { cargando: false, autenticado: true, permisos: ["a"], roles: [] };

  assert.equal(decidirAcceso({ ruta }, soloA).tipo, ACCESO.permitido);
  assert.equal(
    decidirAcceso({ ruta: { ...ruta, todosLosPermisos: true } }, soloA).tipo,
    ACCESO.denegado
  );
});

/* ---------- Roles ---------- */

test("una ruta por rol solo la abre ese rol", () => {
  const director = {
    cargando: false,
    autenticado: true,
    permisos: [],
    roles: [{ id: "director" }]
  };

  assert.equal(acceso("#/direccion", director), ACCESO.permitido);
  assert.equal(acceso("#/direccion", lector), ACCESO.denegado);
});

test("el rol se acepta como codigo suelto o como objeto", () => {
  const ruta = { patron: "#/x", roles: ["director"] };
  const conObjeto = { cargando: false, autenticado: true, permisos: [], roles: [{ id: "director" }] };
  const conTexto = { cargando: false, autenticado: true, permisos: [], roles: ["director"] };

  assert.equal(decidirAcceso({ ruta }, conObjeto).tipo, ACCESO.permitido);
  assert.equal(decidirAcceso({ ruta }, conTexto).tipo, ACCESO.permitido);
});

/* ---------- Navegacion ---------- */

test("el menu muestra solo lo que la sesion puede abrir", () => {
  assert.deepEqual(
    rutasVisibles(RUTAS, lector).map((ruta) => ruta.titulo),
    ["Inicio", "Usuarios"]
  );

  assert.deepEqual(
    rutasVisibles(RUTAS, anonimo).map((ruta) => ruta.titulo),
    [],
    "sin sesion no se ofrece ninguna seccion interna"
  );

  assert.deepEqual(
    rutasVisibles(RUTAS, cargando).map((ruta) => ruta.titulo),
    [],
    "mientras carga no se adelanta ninguna opcion"
  );
});

test("ocultar del menu no cambia la proteccion de la ruta", () => {
  /* Aunque no figure en el menu, la direccion escrita a mano se evalua igual. */
  const oculta = RUTAS.find((ruta) => ruta.patron === "#/usuarios/nuevo");

  assert.ok(!oculta.enMenu);
  assert.equal(acceso("#/usuarios/nuevo", lector), ACCESO.denegado);
});

test("construirRuta arma el hash con sus parametros", () => {
  assert.equal(construirRuta("#/usuarios/:id", { id: 12 }), "#/usuarios/12");
  assert.equal(construirRuta("#/usuarios/:id/editar", { id: "a b" }), "#/usuarios/a%20b/editar");
  assert.equal(construirRuta("#/usuarios"), "#/usuarios");
});
