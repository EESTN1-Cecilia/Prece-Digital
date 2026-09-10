/* Autorizacion por rol y permiso: npm test

   Usa un doble de la conexion a MySQL, asi que corre sin base de datos. */

import assert from "node:assert/strict";
import test, { after, before, beforeEach } from "node:test";
import { createApp } from "../src/app.mjs";
import { apiRoutes } from "../routes/index.mjs";

const PUERTO = 3998;
const base = `http://127.0.0.1:${PUERTO}`;

/* Estado de la base simulada. */
const datos = {
  roles: [
    { id: 1, codigo: "super-admin", nombre: "Superadministrador", descripcion: null },
    { id: 2, codigo: "preceptor", nombre: "Preceptoria", descripcion: null }
  ],
  permisos: [
    { id: 10, codigo: "identity:read", modulo: "identity", accion: "read", descripcion: null },
    { id: 11, codigo: "identity:update", modulo: "identity", accion: "update", descripcion: null },
    { id: 12, codigo: "attendance:read", modulo: "attendance", accion: "read", descripcion: null }
  ],
  rolPermisos: [{ rol_id: 2, permiso_id: 12 }],
  permisosDelUsuario: []
};

const escrituras = [];

/* Doble del pool: responde segun la consulta, sin base de datos real. */
const pool = {
  async query(sql, params = []) {
    const consulta = sql.replace(/\s+/g, " ").trim();

    if (consulta.startsWith("SELECT id, codigo, nombre, descripcion FROM roles")) {
      return [datos.roles];
    }

    if (consulta.startsWith("SELECT id, codigo, modulo, accion, descripcion FROM permisos")) {
      return [datos.permisos];
    }

    if (consulta.startsWith("SELECT codigo, nombre, descripcion FROM modulos")) {
      return [[{ codigo: "identity", nombre: "Identidad y acceso", descripcion: null }]];
    }

    if (consulta.startsWith("SELECT id, codigo, nombre FROM roles WHERE codigo")) {
      return [datos.roles.filter((rol) => rol.codigo === params[0])];
    }

    if (consulta.includes("FROM rol_permisos rp")) {
      const permisos = datos.rolPermisos
        .filter((relacion) => relacion.rol_id === params[0])
        .map((relacion) => datos.permisos.find((permiso) => permiso.id === relacion.permiso_id))
        .map((permiso) => ({ codigo: permiso.codigo }));

      return [permisos];
    }

    if (consulta.startsWith("SELECT id, codigo FROM permisos WHERE codigo IN")) {
      const pedidos = params[0];
      return [datos.permisos.filter((permiso) => pedidos.includes(permiso.codigo))];
    }

    if (consulta.includes("FROM usuario_roles ur JOIN rol_permisos")) {
      return [datos.permisosDelUsuario.map((codigo) => ({ codigo }))];
    }

    if (consulta.includes("FROM usuario_roles ur JOIN roles")) {
      return [[{ codigo: "preceptor", nombre: "Preceptoria", escuela_id: 1 }]];
    }

    if (consulta.startsWith("DELETE FROM rol_permisos") || consulta.startsWith("INSERT INTO rol_permisos")) {
      escrituras.push({ consulta, params });
      return [{ affectedRows: 1 }];
    }

    throw new Error(`Consulta no prevista en el doble: ${consulta}`);
  }
};

let servidor;
let usuarioAutenticado = null;

/* Simula lo que hara el middleware de JWT: dejar el usuario verificado en el request. */
function conIdentidad(rutas) {
  const mapa = Array.isArray(rutas) ? Object.fromEntries(rutas.map((ruta) => [`${ruta.method} ${ruta.path}`, ruta.handler])) : rutas;
  return Object.fromEntries(
    Object.entries(mapa).map(([clave, handler]) => [
      clave,
      (peticion) => {
        if (usuarioAutenticado) {
          peticion.request.usuario = usuarioAutenticado;
        }

        return handler(peticion);
      }
    ])
  );
}

before(async () => {
  servidor = createApp(conIdentidad(apiRoutes), { pool });
  await new Promise((listo) => servidor.listen(PUERTO, listo));
});

after(async () => {
  await new Promise((listo) => servidor.close(listo));
});

beforeEach(() => {
  usuarioAutenticado = null;
  datos.permisosDelUsuario = [];
  datos.rolPermisos = [{ rol_id: 2, permiso_id: 12 }];
  escrituras.length = 0;
});

async function pedir(ruta, opciones) {
  const respuesta = await fetch(`${base}${ruta}`, opciones);
  return { status: respuesta.status, cuerpo: await respuesta.json() };
}

function autenticar(permisos) {
  usuarioAutenticado = { id: 7 };
  datos.permisosDelUsuario = permisos;
}

test("sin autenticacion la API responde 401", async () => {
  const { status, cuerpo } = await pedir("/api/v1/authorization/roles");

  assert.equal(status, 401);
  assert.equal(cuerpo.error.code, "UNAUTHENTICATED");
});

test("autenticado pero sin el permiso necesario responde 403", async () => {
  autenticar(["attendance:read"]);
  const { status, cuerpo } = await pedir("/api/v1/authorization/roles");

  assert.equal(status, 403);
  assert.equal(cuerpo.error.code, "FORBIDDEN");
});

test("con el permiso correspondiente devuelve el catalogo de roles", async () => {
  autenticar(["identity:read"]);
  const { status, cuerpo } = await pedir("/api/v1/authorization/roles");

  assert.equal(status, 200);
  assert.deepEqual(
    cuerpo.data.map((rol) => rol.id),
    ["super-admin", "preceptor"]
  );
});

test("la ruta con parametro resuelve el codigo del rol", async () => {
  autenticar(["identity:read"]);
  const { status, cuerpo } = await pedir("/api/v1/authorization/roles/preceptor/permissions");

  assert.equal(status, 200);
  assert.equal(cuerpo.data.rol, "preceptor");
  assert.deepEqual(cuerpo.data.permisos, ["attendance:read"]);
});

test("un rol inexistente devuelve 404", async () => {
  autenticar(["identity:read"]);
  const { status, cuerpo } = await pedir("/api/v1/authorization/roles/no-existe/permissions");

  assert.equal(status, 404);
  assert.equal(cuerpo.error.code, "NOT_FOUND");
});

test("guardar permisos exige identity:update, no alcanza con identity:read", async () => {
  autenticar(["identity:read"]);
  const { status } = await pedir("/api/v1/authorization/roles/preceptor/permissions", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ permisos: ["identity:read"] })
  });

  assert.equal(status, 403);
  assert.equal(escrituras.length, 0, "no debe escribir nada si no autoriza");
});

test("con identity:update se reemplazan los permisos del rol", async () => {
  autenticar(["identity:read", "identity:update"]);
  const { status, cuerpo } = await pedir("/api/v1/authorization/roles/preceptor/permissions", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ permisos: ["identity:read", "attendance:read"] })
  });

  assert.equal(status, 200);
  assert.deepEqual(cuerpo.data.permisos, ["attendance:read", "identity:read"]);
  assert.ok(escrituras.some((escritura) => escritura.consulta.startsWith("DELETE")));
  assert.ok(escrituras.some((escritura) => escritura.consulta.startsWith("INSERT")));
});

test("no se puede asignar un permiso que no existe en el catalogo", async () => {
  autenticar(["identity:read", "identity:update"]);
  const { status, cuerpo } = await pedir("/api/v1/authorization/roles/preceptor/permissions", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ permisos: ["identity:read", "inventado:todo"] })
  });

  assert.equal(status, 422);
  assert.equal(cuerpo.error.code, "VALIDATION_ERROR");
  assert.match(cuerpo.error.details[0].message, /inventado:todo/);
  assert.equal(escrituras.length, 0);
});

test("/me devuelve roles y permisos del usuario, sin datos sensibles", async () => {
  autenticar(["identity:read"]);
  const { status, cuerpo } = await pedir("/api/v1/authorization/me");
  const texto = JSON.stringify(cuerpo);

  assert.equal(status, 200);
  assert.deepEqual(cuerpo.data.permisos, ["identity:read"]);
  assert.equal(cuerpo.data.roles[0].codigo, "preceptor");
  assert.ok(!texto.includes("password"));
  assert.ok(!texto.includes("hash"));
  assert.ok(!texto.includes("token"));
});

test("los permisos se leen de la base, no de lo que envie el cliente", async () => {
  autenticar([]);
  const { status } = await pedir("/api/v1/authorization/roles", {
    headers: { "X-Permisos": "identity:read", Authorization: "Bearer inventado" }
  });

  assert.equal(status, 403);
});

test("el catalogo de permisos se expone con modulo y accion", async () => {
  autenticar(["identity:read"]);
  const { status, cuerpo } = await pedir("/api/v1/authorization/permissions");

  assert.equal(status, 200);
  assert.deepEqual(cuerpo.data[0], {
    id: "identity:read",
    modulo: "identity",
    accion: "read",
    descripcion: null
  });
});

