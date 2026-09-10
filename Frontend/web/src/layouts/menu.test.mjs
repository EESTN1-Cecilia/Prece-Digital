/* Menu lateral y migas: node --test src */

import assert from "node:assert/strict";
import test from "node:test";
import { armarMenu, construirMigas, hrefActivo } from "./menu.js";

const RUTAS = [
  { patron: "#/login", titulo: "Iniciar sesion", publica: true },
  { patron: "#/inicio", titulo: "Inicio", seccion: "General", icono: "clipboard", enMenu: true },
  {
    patron: "#/usuarios",
    titulo: "Usuarios",
    seccion: "Identidad y acceso",
    icono: "people",
    padre: "#/inicio",
    permisos: ["identity:read"],
    enMenu: true
  },
  {
    patron: "#/usuarios/:id",
    titulo: "Detalle del usuario",
    padre: "#/usuarios",
    permisos: ["identity:read"]
  },
  {
    patron: "#/usuarios/:id/editar",
    titulo: "Editar usuario",
    padre: "#/usuarios/:id",
    permisos: ["identity:update"]
  },
  {
    patron: "#/roles",
    titulo: "Roles y permisos",
    seccion: "Identidad y acceso",
    padre: "#/inicio",
    permisos: ["identity:read"],
    enMenu: true
  }
];

const HREFS_MENU = ["#/inicio", "#/usuarios", "#/roles"];

const lector = { cargando: false, autenticado: true, permisos: ["identity:read"], roles: [] };
const editor = {
  cargando: false,
  autenticado: true,
  permisos: ["identity:read", "identity:update"],
  roles: []
};
const sinNada = { cargando: false, autenticado: true, permisos: [], roles: [] };
const anonimo = { cargando: false, autenticado: false, permisos: [], roles: [] };

/* ---------- Menu ---------- */

test("el menu agrupa por seccion y respeta el orden declarado", () => {
  const menu = armarMenu(RUTAS, lector);

  assert.deepEqual(
    menu.map((seccion) => seccion.nombre),
    ["General", "Identidad y acceso"]
  );
  assert.deepEqual(
    menu[1].entradas.map((entrada) => entrada.titulo),
    ["Usuarios", "Roles y permisos"]
  );
});

test("el menu solo trae lo que la sesion puede abrir", () => {
  const menu = armarMenu(RUTAS, sinNada);

  assert.deepEqual(
    menu.flatMap((seccion) => seccion.entradas.map((entrada) => entrada.titulo)),
    ["Inicio"],
    "sin permisos queda solo lo que no exige ninguno"
  );

  assert.deepEqual(armarMenu(RUTAS, anonimo), [], "sin sesion no se ofrece nada");
});

test("las pantallas que no van al menu no aparecen aunque se puedan abrir", () => {
  const titulos = armarMenu(RUTAS, editor).flatMap((seccion) =>
    seccion.entradas.map((entrada) => entrada.titulo)
  );

  assert.ok(!titulos.includes("Detalle del usuario"));
  assert.ok(!titulos.includes("Editar usuario"));
});

test("cada entrada lleva su icono cuando lo declara", () => {
  const menu = armarMenu(RUTAS, lector);

  assert.equal(menu[0].entradas[0].icono, "clipboard");
  assert.equal(menu[1].entradas[0].icono, "people");
  assert.equal(menu[1].entradas[1].icono, undefined);
});

/* ---------- Entrada activa ---------- */

test("se marca la entrada mas cercana, no todos sus ancestros", () => {
  /* "#/usuarios" cuelga de "#/inicio" para armar las migas; eso no debe dejar
     "Inicio" marcado mientras se esta en el listado. */
  assert.equal(hrefActivo("#/usuarios", RUTAS, HREFS_MENU), "#/usuarios");
  assert.equal(hrefActivo("#/inicio", RUTAS, HREFS_MENU), "#/inicio");
});

test("una pantalla interna deja marcada la seccion de la que cuelga", () => {
  assert.equal(hrefActivo("#/usuarios/12", RUTAS, HREFS_MENU), "#/usuarios");
  assert.equal(hrefActivo("#/usuarios/12/editar", RUTAS, HREFS_MENU), "#/usuarios");
});

test("una ruta fuera del menu no marca nada", () => {
  assert.equal(hrefActivo("#/login", RUTAS, HREFS_MENU), null);
  assert.equal(hrefActivo("#/no-existe", RUTAS, HREFS_MENU), null);
});

/* ---------- Migas ---------- */

test("las migas siguen la cadena de padres y terminan en la pantalla actual", () => {
  const migas = construirMigas("#/usuarios/12", RUTAS, lector);

  assert.deepEqual(
    migas.map((miga) => miga.titulo),
    ["Inicio", "Usuarios", "Detalle del usuario"]
  );
  assert.equal(migas[migas.length - 1].actual, true);
  assert.equal(migas[migas.length - 1].href, null, "la pantalla actual no enlaza a si misma");
});

test("las migas conservan los parametros de la ruta", () => {
  const migas = construirMigas("#/usuarios/12/editar", RUTAS, editor);

  assert.deepEqual(
    migas.map((miga) => miga.titulo),
    ["Inicio", "Usuarios", "Detalle del usuario", "Editar usuario"]
  );
  assert.equal(migas[2].href, "#/usuarios/12", "el ancestro con parametro se arma completo");
});

test("un ancestro que la sesion no puede abrir se muestra sin enlace", () => {
  const migas = construirMigas("#/usuarios/12", RUTAS, sinNada);
  const usuarios = migas.find((miga) => miga.titulo === "Usuarios");

  assert.equal(usuarios.href, null, "no se ofrece un camino que termina en acceso denegado");
  assert.equal(migas[0].href, "#/inicio", "el que si puede abrir conserva el enlace");
});

test("los nombres de las migas salen del titulo, nunca de la ruta tecnica", () => {
  for (const miga of construirMigas("#/usuarios/12/editar", RUTAS, editor)) {
    assert.ok(!miga.titulo.includes("#/"), `"${miga.titulo}" no debe mostrar la ruta`);
    assert.ok(!miga.titulo.includes(":"), `"${miga.titulo}" no debe mostrar el parametro`);
  }
});

test("una ruta inexistente no arma migas", () => {
  assert.deepEqual(construirMigas("#/no-existe", RUTAS, lector), []);
});

test("una pantalla de primer nivel arma una sola miga", () => {
  /* El encabezado las omite cuando hay menos de dos: repetir el titulo de la
     pantalla no aporta nada. */
  assert.equal(construirMigas("#/inicio", RUTAS, lector).length, 1);
});
