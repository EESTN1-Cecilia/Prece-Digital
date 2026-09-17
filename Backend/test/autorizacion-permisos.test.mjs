/* Autorización por roles y permisos.

   Verifica los criterios de aceptación sobre el flujo en memoria (verifyToken +
   authorize): 401 sin autenticación, 403 sin permiso, 200 con permiso, imposibilidad
   de que el frontend otorgue permisos, catálogo central y extensibilidad.

   Corre sin base de datos: los repositorios de auth usan el store en memoria. */

import assert from "node:assert/strict";
import test, { after, before, beforeEach } from "node:test";
import jwt from "jsonwebtoken";
import { createApp } from "../src/app.mjs";
import { apiRoutes } from "../routes/index.mjs";
import {
  ACCIONES,
  MODULOS,
  ROLES,
  ROLE_PERMISSIONS,
  ROL_CATALOGO,
  accionesCanonicas,
  catalogoRoles,
  permiso,
  permisoValido,
  permissionsForRole
} from "../config/permissions.config.mjs";
import { appConfig } from "../config/app.config.mjs";
import { resetStore } from "../database/memory-store.mjs";
import { userRepository } from "../database/repositories/user.repository.mjs";
import { seedAuthData } from "../database/seeds/auth.seed.mjs";
import { dividirPermiso, resumenPermisos } from "../modules/auth/permission.service.mjs";

const PUERTO = 4001;
const base = `http://127.0.0.1:${PUERTO}`;

let servidor;

before(async () => {
  await seedAuthData();
  servidor = createApp(apiRoutes);
  await new Promise((listo) => servidor.listen(PUERTO, listo));
});

after(async () => {
  await new Promise((listo) => servidor.close(listo));
});

beforeEach(async () => {
  resetStore();
  await seedAuthData();
});

async function pedir(ruta, opciones) {
  const respuesta = await fetch(`${base}${ruta}`, opciones);
  const texto = await respuesta.text();
  return { status: respuesta.status, cuerpo: texto ? JSON.parse(texto) : null };
}

async function login(email, password) {
  const { cuerpo } = await pedir("/api/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  return cuerpo;
}

function tokenDe(directo) {
  return { Authorization: `Bearer ${directo}` };
}

test("el catálogo define lectura, creación, modificación, eliminación, aprobación y carga", () => {
  const acciones = Object.values(ACCIONES);

  for (const accion of ["read", "create", "update", "delete", "approve", "upload"]) {
    assert.ok(acciones.includes(accion), `falta la accion ${accion}`);
  }
});

test("permiso() genera el código modulo.accion", () => {
  assert.equal(permiso("students", "create"), "students.create");
  assert.equal(permiso("identity", "approve"), "identity.approve");
  assert.equal(accionesCanonicas("write").join(","), "create,update,upload");
  assert.equal(accionesCanonicas("manage").join(","), "delete,approve");
  assert.equal(accionesCanonicas("read").join(","), "read");
});

test("cada rol definido tiene catálogo, nombre y permisos bien formados", () => {
  const todosLosRoles = Object.values(ROLES);
  const nameless = todosLosRoles.filter((rol) => !ROL_CATALOGO[rol]?.nombre);
  assert.deepEqual(nameless, [], "todos los roles deben estar en el catálogo");
  assert.equal(catalogoRoles().length, todosLosRoles.length);

  for (const rol of todosLosRoles) {
    assert.ok(ROLE_PERMISSIONS[rol].length > 0, `el rol ${rol} debe tener permisos`);

    for (const codigo of ROLE_PERMISSIONS[rol]) {
      assert.ok(permisoValido(codigo), `permiso mal formado en ${rol}: ${codigo}`);
      const partes = dividirPermiso(codigo);
      assert.ok(partes && MODULOS[partes.modulo], `modulo desconocido en ${rol}: ${codigo}`);
    }
  }
});

test("un usuario autenticado tiene uno o más roles y los permisos del catálogo", async () => {
  const sesion = await login("docente@prece.local", "Docente123!");
  const { status, cuerpo } = await pedir("/api/v1/auth/me", { headers: tokenDe(sesion.accessToken) });

  assert.equal(status, 200);
  assert.ok(cuerpo.data.roles.includes("docente"));
  assert.ok(cuerpo.data.permisos.includes("students.read"));
  assert.ok(!JSON.stringify(cuerpo).includes("password"));
  assert.ok(!JSON.stringify(cuerpo).includes("hash"));
});

test("sin autenticación la API responde 401", async () => {
  const sinToken = await pedir("/api/v1/users");
  const permisosSinToken = await pedir("/api/v1/auth/permissions");

  assert.equal(sinToken.status, 401);
  assert.equal(permisosSinToken.status, 401);
});

test("autenticado sin el permiso suficiente responde 403", async () => {
  const docente = await login("docente@prece.local", "Docente123!");
  const { status, cuerpo } = await pedir("/api/v1/users", { headers: tokenDe(docente.accessToken) });

  assert.equal(status, 403);
  assert.equal(cuerpo.error.code, "forbidden");
});

test("con el permiso correspondiente la operación se ejecuta", async () => {
  const director = await login("director@prece.local", "Director123!");
  const { status, cuerpo } = await pedir("/api/v1/users", { headers: tokenDe(director.accessToken) });

  assert.equal(status, 200);
  assert.ok(Array.isArray(cuerpo.data) && cuerpo.data.length > 0);
  assert.ok(cuerpo.data.some((usuario) => usuario.email === "director@prece.local"));
});

test("el frontend no puede otorgar permisos mediante cabeceras", async () => {
  const docente = await login("docente@prece.local", "Docente123!");
  const { status } = await pedir("/api/v1/users", {
    headers: {
      ...tokenDe(docente.accessToken),
      "X-Roles": "director",
      "X-Permisos": "users.read"
    }
  });

  assert.equal(status, 403);
});

test("los roles del token no definen autorización: la identidad sale del usuario verificado", async () => {
  const docente = userRepository.findByEmail("docente@prece.local");
  const tokenForjado = jwt.sign(
    { sub: docente.id, typ: "access", roles: ["director"] },
    appConfig.jwtAccessSecret,
    { expiresIn: "5m" }
  );
  const { status } = await pedir("/api/v1/users", { headers: tokenDe(tokenForjado) });

  assert.equal(status, 403);
});

test("un usuario no puede modificar su propia cuenta (auto-desactivarse)", async () => {
  const director = await login("director@prece.local", "Director123!");
  const directorId = userRepository.findByEmail("director@prece.local").id;
  const docenteId = userRepository.findByEmail("docente@prece.local").id;

  const auto = await pedir(`/api/v1/users/${directorId}/deactivate`, {
    method: "PATCH",
    headers: tokenDe(director.accessToken)
  });
  assert.equal(auto.status, 403);
  assert.equal(auto.cuerpo.error.code, "forbidden");

  const otro = await pedir(`/api/v1/users/${docenteId}/deactivate`, {
    method: "PATCH",
    headers: tokenDe(director.accessToken)
  });
  assert.equal(otro.status, 200);
  assert.equal(otro.cuerpo.data.isActive, false);
});

test("incorporar un rol nuevo no exige tocar la lógica de los módulos", () => {
  const rolFuturo = "supervisor";

  assert.deepEqual(permissionsForRole(rolFuturo), []);

  ROLE_PERMISSIONS[rolFuturo] = [permiso("students", "read"), permiso("absences", "approve")];
  const otorgados = permissionsForRole(rolFuturo);
  assert.deepEqual(otorgados, ["students.read", "absences.approve"]);
  assert.ok(otorgados.every(permisoValido));

  delete ROLE_PERMISSIONS[rolFuturo];
  assert.deepEqual(permissionsForRole(rolFuturo), []);
});

test("resumenPermisos agrupa los permisos del usuario por módulo y acción", () => {
  const docente = userRepository.findByEmail("docente@prece.local");
  const resumenDocente = resumenPermisos(docente);

  assert.equal(resumenDocente.students.read, true);
  assert.equal(resumenDocente.students.create, undefined);
  assert.equal(resumenDocente.users, undefined);

  const director = userRepository.findByEmail("director@prece.local");
  const resumenDirector = resumenPermisos(director);

  assert.equal(resumenDirector.users.read, true);
  assert.equal(resumenDirector.users.deactivate, true);
});

test("GET /auth/permissions expone roles, permisos y resumen calculados en el backend", async () => {
  const director = await login("director@prece.local", "Director123!");
  const { status, cuerpo } = await pedir("/api/v1/auth/permissions", {
    headers: tokenDe(director.accessToken)
  });

  assert.equal(status, 200);
  assert.ok(cuerpo.data.roles.includes("director"));
  assert.ok(cuerpo.data.permisos.includes("users.read"));
  assert.equal(cuerpo.data.resumen.users.read, true);
  assert.equal(cuerpo.data.resumen.students.read, true);
  assert.ok(!JSON.stringify(cuerpo).includes("password"));
  assert.ok(!JSON.stringify(cuerpo).includes("hash"));
});