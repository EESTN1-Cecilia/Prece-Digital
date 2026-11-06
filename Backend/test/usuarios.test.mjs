/* Gestion de usuarios (modulo Identidad): alta, consulta, edicion, estado y roles. */

import assert from "node:assert/strict";
import test, { after, before, beforeEach } from "node:test";
import { createApp } from "../src/app.mjs";
import { apiRoutes } from "../routes/index.mjs";
import { resetStore } from "../database/memory-store.mjs";
import { seedAuthData } from "../database/seeds/auth.seed.mjs";
import { userRepository } from "../database/repositories/user.repository.mjs";

const PUERTO = 4011;
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
  tokens.secretario = (await login("secretario@prece.local", "Secretaria123!")).accessToken;
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
  return { status: respuesta.status, cuerpo: await respuesta.json() };
}

const NUEVO = { nombre: "Lucia", apellido: "Gimenez", email: "lgimenez@prece.local", dni: "30111222", roles: ["preceptor"] };

test("el alta crea la cuenta con contrasena temporal y sin exponer el hash", async () => {
  const { status, cuerpo } = await pedir("POST", "/api/v1/users", "director", NUEVO);

  assert.equal(status, 201);
  assert.deepEqual(cuerpo.data.roles, ["preceptor"]);
  assert.equal(cuerpo.data.estado, "activo");
  assert.ok(cuerpo.data.passwordTemporal);
  assert.ok(!JSON.stringify(cuerpo).includes("passwordHash"));

  const sesion = await login(NUEVO.email, cuerpo.data.passwordTemporal);
  assert.ok(sesion.accessToken, "la contrasena temporal permite iniciar sesion");
});

test("el alta valida campos, roles y correo duplicado", async () => {
  const invalido = await pedir("POST", "/api/v1/users", "director", { email: "x", roles: ["inventado"] });
  assert.equal(invalido.status, 422);
  assert.ok(invalido.cuerpo.error.details.some((detalle) => detalle.field === "roles"));

  const duplicado = await pedir("POST", "/api/v1/users", "director", { ...NUEVO, email: "director@prece.local" });
  assert.equal(duplicado.status, 409);
});

test("el backend rechaza DNI con letras tanto al crear como al editar usuarios", async () => {
  const altaInvalida = await pedir("POST", "/api/v1/users", "director", {
    ...NUEVO,
    email: "dni-invalido@prece.local",
    dni: "3011122A"
  });
  assert.equal(altaInvalida.status, 422);
  assert.ok(altaInvalida.cuerpo.error.details.some((detalle) => detalle.field === "dni"));

  const creado = await pedir("POST", "/api/v1/users", "director", NUEVO);
  const edicionInvalida = await pedir("PATCH", `/api/v1/users/${creado.cuerpo.data.id}`, "director", { dni: "3011122A" });
  assert.equal(edicionInvalida.status, 422);
  assert.ok(edicionInvalida.cuerpo.error.details.some((detalle) => detalle.field === "dni"));

  const actual = await pedir("GET", `/api/v1/users/${creado.cuerpo.data.id}`, "director");
  assert.equal(actual.cuerpo.data.dni, NUEVO.dni);
});

const DOCENTE = {
  nombre: "Carlos",
  apellido: "Fernandez",
  email: "cfernandez@prece.local",
  dni: "32456789",
  roles: ["docente"],
  cargoDocente: {
    materia: "Matematica",
    situacionRevista: "suplente",
    docenteSuplido: "Rios, Lucia",
    modulos: 4,
    horaDesde: "07:30",
    horaHasta: "10:10"
  }
};

test("el alta de un docente guarda los datos del cargo", async () => {
  const { status, cuerpo } = await pedir("POST", "/api/v1/users", "director", DOCENTE);

  assert.equal(status, 201);
  assert.deepEqual(cuerpo.data.cargoDocente, DOCENTE.cargoDocente);

  const detalle = await pedir("GET", `/api/v1/users/${cuerpo.data.id}`, "director");
  assert.equal(detalle.cuerpo.data.cargoDocente.materia, "Matematica");
});

test("el alta valida el cargo docente", async () => {
  const sinSuplido = await pedir("POST", "/api/v1/users", "director", {
    ...DOCENTE,
    cargoDocente: { ...DOCENTE.cargoDocente, docenteSuplido: "", modulos: 5, horaHasta: "07:00" }
  });
  const campos = sinSuplido.cuerpo.error.details.map((detalle) => detalle.field);

  assert.equal(sinSuplido.status, 422);
  assert.ok(campos.includes("cargoDocente.docenteSuplido"));
  assert.ok(campos.includes("cargoDocente.modulos"));
  assert.ok(campos.includes("cargoDocente.horario"));

  const titular = await pedir("POST", "/api/v1/users", "director", {
    ...DOCENTE,
    cargoDocente: { ...DOCENTE.cargoDocente, situacionRevista: "titular" }
  });
  assert.equal(titular.status, 201);
  assert.equal(titular.cuerpo.data.cargoDocente.docenteSuplido, null);
});

test("secretaria puede consultar pero no crear usuarios", async () => {
  const lista = await pedir("GET", "/api/v1/users?rol=docente", "secretario");
  const alta = await pedir("POST", "/api/v1/users", "secretario", NUEVO);

  assert.equal(lista.status, 200);
  assert.ok(lista.cuerpo.data.every((usuario) => usuario.roles.includes("docente")));
  assert.equal(alta.status, 403);
});

test("consultar, editar, cambiar roles y desactivar", async () => {
  const { cuerpo } = await pedir("POST", "/api/v1/users", "director", NUEVO);
  const id = cuerpo.data.id;

  const detalle = await pedir("GET", `/api/v1/users/${id}`, "director");
  assert.equal(detalle.cuerpo.data.email, NUEVO.email);

  const editado = await pedir("PATCH", `/api/v1/users/${id}`, "director", { telefono: "11 5555-0000", apellido: "Gimenez Paz" });
  assert.equal(editado.status, 200);
  assert.equal(editado.cuerpo.data.displayName, "Lucia Gimenez Paz");

  const roles = await pedir("PUT", `/api/v1/users/${id}/roles`, "director", { roles: ["docente", "preceptor"] });
  assert.deepEqual(roles.cuerpo.data.roles, ["docente", "preceptor"]);

  const baja = await pedir("PATCH", `/api/v1/users/${id}`, "director", { estado: "inactivo" });
  assert.equal(baja.cuerpo.data.estado, "inactivo");

  const inexistente = await pedir("GET", "/api/v1/users/usr_999", "director");
  assert.equal(inexistente.status, 404);
});

/* ---------- Perfil propio y administracion de identidad ---------- */

test("jefatura de area edita su propio perfil pero no los datos de terceros", async () => {
  const jefe = userRepository.findByEmail("jefearea@prece.local");
  const director = userRepository.findByEmail("director@prece.local");
  tokens.jefe_area = (await login("jefearea@prece.local", "JefeArea123!")).accessToken;

  const propio = await pedir("PATCH", `/api/v1/users/${jefe.id}`, "jefe_area", {
    nombre: "Alejandro",
    apellido: "Fernández",
    telefono: "11 5555-1111"
  });

  assert.equal(propio.status, 200);
  assert.equal(propio.cuerpo.data.nombre, "Alejandro");
  assert.equal(propio.cuerpo.data.apellido, "Fernández");
  assert.equal(propio.cuerpo.data.telefono, "11 5555-1111");
  assert.equal(propio.cuerpo.data.displayName, "Alejandro Fernández");

  const deTercero = await pedir("PATCH", `/api/v1/users/${director.id}`, "jefe_area", {
    telefono: "11 5555-9999"
  });

  assert.equal(deTercero.status, 403);
  assert.equal(deTercero.cuerpo.error.code, "FORBIDDEN");

  const sinCambios = await pedir("GET", `/api/v1/users/${director.id}`, "director");
  assert.notEqual(sinCambios.cuerpo.data.telefono, "11 5555-9999");
});

test("jefatura de area no puede cambiar su rol, sus asignaciones ni su estado", async () => {
  const jefe = userRepository.findByEmail("jefearea@prece.local");
  tokens.jefe_area = (await login("jefearea@prece.local", "JefeArea123!")).accessToken;

  const roles = await pedir("PUT", `/api/v1/users/${jefe.id}/roles`, "jefe_area", { roles: ["admin"] });
  const estado = await pedir("PATCH", `/api/v1/users/${jefe.id}`, "jefe_area", { estado: "inactivo" });
  const rolEnDatos = await pedir("PATCH", `/api/v1/users/${jefe.id}`, "jefe_area", { roles: ["admin"] });
  const asignaciones = await pedir("PATCH", `/api/v1/users/${jefe.id}`, "jefe_area", {
    assignments: [{ role: "admin", schoolId: "esc-1" }]
  });

  assert.equal(roles.status, 403);
  assert.equal(estado.status, 403);
  assert.equal(rolEnDatos.status, 403);
  assert.equal(asignaciones.status, 403);

  const inalterado = await pedir("GET", `/api/v1/users/${jefe.id}`, "director");
  assert.deepEqual(inalterado.cuerpo.data.roles, ["jefe_area"]);
  assert.equal(inalterado.cuerpo.data.estado, "activo");
});

test("jefatura de area no puede reemplazar la matriz de permisos ni las asignaciones de preceptores", async () => {
  const jefe = userRepository.findByEmail("jefearea@prece.local");
  tokens.jefe_area = (await login("jefearea@prece.local", "JefeArea123!")).accessToken;

  const matriz = await pedir("PUT", "/api/v1/authorization/roles/jefe_area/permissions", "jefe_area", {
    permisos: ["students.read", "inventory.manage"]
  });
  const asignacion = await pedir("PUT", "/api/v1/preceptores/asignaciones", "jefe_area", {
    divisiones: ["1-1"],
    preceptorId: jefe.id
  });

  assert.equal(matriz.status, 403);
  assert.equal(asignacion.status, 403);

  const sinCambios = await pedir("GET", "/api/v1/authorization/roles/jefe_area/permissions", "secretario");
  assert.equal(sinCambios.status, 200);
  assert.ok(sinCambios.cuerpo.data.permisos.includes("identity.update"));
  assert.ok(!sinCambios.cuerpo.data.permisos.includes("inventory.manage"));
});

test("sin identity.update no se puede editar el propio perfil", async () => {
  const secretario = userRepository.findByEmail("secretario@prece.local");

  const intento = await pedir("PATCH", `/api/v1/users/${secretario.id}`, "secretario", {
    telefono: "11 5555-3333"
  });

  assert.equal(intento.status, 403);
  assert.equal(intento.cuerpo.error.code, "FORBIDDEN");
});

/* ---------- Alta de usuarios con rol jefe_area ---------- */

test("direccion crea un usuario con rol jefe_area y el rol queda asignado", async () => {
  const alta = await pedir("POST", "/api/v1/users", "director", {
    ...NUEVO,
    email: "jefearea2@prece.local",
    roles: ["jefe_area"]
  });

  assert.equal(alta.status, 201);
  assert.deepEqual(alta.cuerpo.data.roles, ["jefe_area"]);
  assert.equal(alta.cuerpo.data.estado, "activo");
  assert.ok(alta.cuerpo.data.passwordTemporal);
  assert.ok(!JSON.stringify(alta.cuerpo).includes("passwordHash"));

  const sesion = await login("jefearea2@prece.local", alta.cuerpo.data.passwordTemporal);
  tokens.jefe_area_nuevo = sesion.accessToken;

  const me = await pedir("GET", "/api/v1/auth/me", "jefe_area_nuevo");
  assert.equal(me.status, 200);
  assert.deepEqual(me.cuerpo.data.roles, ["jefe_area"]);
  assert.ok(me.cuerpo.data.permisos.includes("identity.update"));
  assert.ok(!me.cuerpo.data.permisos.includes("identity.manage"));

  const propio = await pedir("PATCH", `/api/v1/users/${alta.cuerpo.data.id}`, "jefe_area_nuevo", {
    telefono: "11 5555-1212"
  });
  assert.equal(propio.status, 200);
});

test("el alta con jefe_area no admite roles inventados ni permisos del cliente", async () => {
  const inventado = await pedir("POST", "/api/v1/users", "director", {
    ...NUEVO,
    email: "jefearea3@prece.local",
    roles: ["jefe_area", "inventado"]
  });
  assert.equal(inventado.status, 422);
  assert.ok(inventado.cuerpo.error.details.some((detalle) => detalle.field === "roles"));

  const conPermisos = await pedir("POST", "/api/v1/users", "director", {
    ...NUEVO,
    email: "jefearea4@prece.local",
    roles: ["jefe_area"],
    permisos: ["*"]
  });
  assert.equal(conPermisos.status, 201);
  assert.equal(conPermisos.cuerpo.data.permisos, undefined);

  const sesion = await login("jefearea4@prece.local", conPermisos.cuerpo.data.passwordTemporal);
  tokens.jefe_area_extra = sesion.accessToken;

  const permisos = await pedir("GET", "/api/v1/auth/permissions", "jefe_area_extra");
  assert.equal(permisos.status, 200);
  assert.ok(!permisos.cuerpo.data.permisos.includes("*"));
  assert.ok(permisos.cuerpo.data.permisos.includes("identity.update"));
  assert.ok(!permisos.cuerpo.data.permisos.includes("inventory.manage"));
});

test("un rol sin autorizacion no puede dar de alta un usuario jefe_area", async () => {
  tokens.preceptor = (await login("preceptor@prece.local", "Preceptor123!")).accessToken;
  tokens.jefe_area = (await login("jefearea@prece.local", "JefeArea123!")).accessToken;

  const preceptor = await pedir("POST", "/api/v1/users", "preceptor", {
    ...NUEVO,
    email: "jefearea5@prece.local",
    roles: ["jefe_area"]
  });
  const jefatura = await pedir("POST", "/api/v1/users", "jefe_area", {
    ...NUEVO,
    email: "jefearea6@prece.local",
    roles: ["jefe_area"]
  });

  assert.equal(preceptor.status, 403);
  assert.equal(jefatura.status, 403);
});
