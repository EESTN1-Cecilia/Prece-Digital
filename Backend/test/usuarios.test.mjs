/* Gestion de usuarios (modulo Identidad): alta, consulta, edicion, estado y roles. */

import assert from "node:assert/strict";
import test, { after, before, beforeEach } from "node:test";
import { createApp } from "../src/app.mjs";
import { apiRoutes } from "../routes/index.mjs";
import { getStore, resetStore } from "../database/memory-store.mjs";
import { seedAuthData } from "../database/seeds/auth.seed.mjs";

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
      Authorization: `Bearer ${tokens[quien] ?? quien}`,
      ...(body ? { "Content-Type": "application/json" } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  return { status: respuesta.status, cuerpo: await respuesta.json() };
}

const NUEVO = { nombre: "Lucia", apellido: "Gimenez", email: "lgimenez@prece.local", dni: "30111222", roles: ["preceptor"] };

test("el alta usa el DNI normalizado como clave provisoria, guardada solo como hash", async () => {
  const { status, cuerpo } = await pedir("POST", "/api/v1/users", "director", { ...NUEVO, dni: "30.111.222" });

  assert.equal(status, 201);
  assert.deepEqual(cuerpo.data.roles, ["preceptor"]);
  assert.equal(cuerpo.data.estado, "activo");
  assert.equal(cuerpo.data.dni, "30111222");
  assert.equal(cuerpo.data.debeCambiarClave, true);
  assert.equal(cuerpo.data.claveProvisoria, "dni");
  assert.equal(cuerpo.data.passwordTemporal, undefined);
  assert.ok(!JSON.stringify(cuerpo).includes("passwordHash"));

  const guardado = getStore().users.get(cuerpo.data.id);
  assert.notEqual(guardado.passwordHash, "30111222");
  assert.match(guardado.passwordHash, /^\$2[aby]\$/);

  const sesion = await login(NUEVO.email, "30111222");
  assert.ok(sesion.accessToken, "el DNI permite el primer ingreso");
  assert.deepEqual(sesion.roles, ["preceptor"], "la clave provisoria no suma permisos");
});

test("con la clave provisoria solo se puede consultar la sesion y cambiar la clave", async () => {
  const alta = await pedir("POST", "/api/v1/users", "director", NUEVO);
  const sesion = await login(NUEVO.email, NUEVO.dni);
  const token = sesion.accessToken;

  const bloqueada = await pedir("GET", "/api/v1/users", token);
  assert.equal(bloqueada.status, 403);
  assert.equal(bloqueada.cuerpo.error.code, "PASSWORD_CHANGE_REQUIRED");

  const yo = await pedir("GET", "/api/v1/auth/me", token);
  assert.equal(yo.status, 200);
  assert.equal(yo.cuerpo.data.debeCambiarClave, true);

  const malaActual = await pedir("POST", "/api/v1/auth/cambiar-clave", token, { actual: "otra", nueva: "ClaveNueva2026" });
  assert.equal(malaActual.status, 422);

  const conDni = await pedir("POST", "/api/v1/auth/cambiar-clave", token, { actual: NUEVO.dni, nueva: `x${NUEVO.dni}` });
  assert.equal(conDni.status, 422);

  const corta = await pedir("POST", "/api/v1/auth/cambiar-clave", token, { actual: NUEVO.dni, nueva: "abc1" });
  assert.equal(corta.status, 422);

  const cambio = await pedir("POST", "/api/v1/auth/cambiar-clave", token, { actual: NUEVO.dni, nueva: "ClaveNueva2026" });
  assert.equal(cambio.status, 200);
  assert.equal(cambio.cuerpo.usuario.debeCambiarClave, false);
  assert.ok(cambio.cuerpo.accessToken);

  /* Las sesiones anteriores se cierran. */
  const vieja = await pedir("POST", "/api/v1/auth/refresh", token, { refreshToken: sesion.refreshToken });
  assert.equal(vieja.status, 401);

  assert.equal((await login(NUEVO.email, NUEVO.dni)).accessToken, undefined, "el DNI deja de servir como clave");
  const nueva = await login(NUEVO.email, "ClaveNueva2026");
  assert.ok(nueva.accessToken);
  assert.equal(nueva.usuario.debeCambiarClave, false);
  assert.equal((await pedir("GET", "/api/v1/auth/permissions", nueva.accessToken)).status, 200);

  /* Editar el perfil no toca la clave ni vuelve a exigir el cambio. */
  const edicion = await pedir("PATCH", `/api/v1/users/${alta.cuerpo.data.id}`, "director", { telefono: "11 5555-6666", dni: "30111223" });
  assert.equal(edicion.status, 200);
  assert.equal(edicion.cuerpo.data.debeCambiarClave, false);
  assert.ok((await login(NUEVO.email, "ClaveNueva2026")).accessToken);
  assert.equal((await login(NUEVO.email, "30111223")).accessToken, undefined);
});

test("las cuentas existentes no quedan obligadas a cambiar la clave", async () => {
  const sesion = await login("director@prece.local", "Director123!");
  assert.equal(sesion.usuario.debeCambiarClave, false);
  const lista = await pedir("GET", "/api/v1/users", sesion.accessToken);
  assert.equal(lista.status, 200);
});

test("el alta valida campos, roles y correo duplicado", async () => {
  const invalido = await pedir("POST", "/api/v1/users", "director", { email: "x", roles: ["inventado"] });
  assert.equal(invalido.status, 422);
  assert.ok(invalido.cuerpo.error.details.some((detalle) => detalle.field === "roles"));

  const duplicado = await pedir("POST", "/api/v1/users", "director", { ...NUEVO, email: "director@prece.local" });
  assert.equal(duplicado.status, 409);
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

test("el area institucional se valida contra el catalogo y se puede filtrar", async () => {
  const alta = await pedir("POST", "/api/v1/users", "director", { ...NUEVO, area: "informatica" });
  assert.equal(alta.status, 201);
  assert.equal(alta.cuerpo.data.area, "informatica");
  assert.equal(alta.cuerpo.data.areaNombre, "Informática");

  const invalida = await pedir("POST", "/api/v1/users", "director", { ...NUEVO, email: "otro@prece.local", area: "recepcion" });
  assert.equal(invalida.status, 422);
  assert.ok(invalida.cuerpo.error.details.some((detalle) => detalle.field === "area"));

  const filtrado = await pedir("GET", "/api/v1/users?area=informatica", "director");
  assert.equal(filtrado.status, 200);
  assert.ok(filtrado.cuerpo.data.length >= 1);
  assert.ok(filtrado.cuerpo.data.every((usuario) => usuario.area === "informatica"));

  const busqueda = await pedir("GET", "/api/v1/users?q=inform%C3%A1tica", "director");
  assert.ok(busqueda.cuerpo.data.length >= 1);
});

test("el listado de usuarios trae la paginacion como dato hermano", async () => {
  const { status, cuerpo } = await pedir("GET", "/api/v1/users?porPagina=2", "director");

  assert.equal(status, 200);
  assert.ok(Array.isArray(cuerpo.data));
  assert.equal(cuerpo.paginacion.porPagina, 2);
  assert.ok(cuerpo.paginacion.total >= 2);
  assert.equal(cuerpo.data.length, Math.min(2, cuerpo.paginacion.total));
  assert.equal(cuerpo.paginacion.totalPaginas, Math.ceil(cuerpo.paginacion.total / 2));
});

test("el alta de docencia guarda los datos academicos y la carga horaria", async () => {
  const docente = {
    ...NUEVO,
    email: "nuevo.docente@prece.local",
    area: "docencia",
    roles: ["docente"],
    materia: "Matemática",
    situacion_revista: "Titular",
    modulos: 4,
    dia: "Lunes",
    hora_desde: "08:00",
    hora_hasta: "12:00"
  };

  const alta = await pedir("POST", "/api/v1/users", "director", docente);

  assert.equal(alta.status, 201);
  assert.equal(alta.cuerpo.data.area, "docencia");
  assert.equal(alta.cuerpo.data.materia, "Matemática");
  assert.equal(alta.cuerpo.data.situacion_revista, "Titular");
  assert.equal(alta.cuerpo.data.suplente_de, null);
  assert.equal(alta.cuerpo.data.modulos, 4);
  assert.equal(alta.cuerpo.data.hora_desde, "08:00");
  assert.equal(alta.cuerpo.data.hora_hasta, "12:00");
  assert.equal(alta.cuerpo.data.dia, "Lunes");

  const suplente = await pedir("POST", "/api/v1/users", "director", {
    ...docente,
    email: "docente.suplente@prece.local",
    dni: "30111999",
    situacion_revista: "Suplente",
    suplente_de: "Ana Pérez"
  });
  assert.equal(suplente.status, 201);
  assert.equal(suplente.cuerpo.data.suplente_de, "Ana Pérez");
});

test("el dia de cursada se guarda, se consulta y se edita sin pisar el de otros docentes", async () => {
  const docencia = { ...NUEVO, area: "docencia", roles: ["docente"], materia: "Lengua", situacion_revista: "Titular", modulos: 2, hora_desde: "07:30", hora_hasta: "09:30" };
  const academicos = { area: "docencia", materia: "Lengua", situacion_revista: "Titular", modulos: 2, hora_desde: "07:30", hora_hasta: "09:30" };

  const miercoles = await pedir("POST", "/api/v1/users", "director", { ...docencia, email: "d1@prece.local", dni: "30200001", dia: "Miércoles" });
  const viernes = await pedir("POST", "/api/v1/users", "director", { ...docencia, email: "d2@prece.local", dni: "30200002", dia: "viernes" });
  assert.equal(miercoles.status, 201);
  assert.equal(miercoles.cuerpo.data.dia, "Miercoles");
  assert.equal(viernes.cuerpo.data.dia, "Viernes");

  const id = miercoles.cuerpo.data.id;

  for (const dia of ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes"]) {
    const cambio = await pedir("PATCH", `/api/v1/users/${id}`, "director", { ...academicos, dia });
    assert.equal(cambio.status, 200, dia);
    assert.equal(cambio.cuerpo.data.dia, dia);
  }

  await pedir("PATCH", `/api/v1/users/${id}`, "director", { ...academicos, dia: "Jueves" });
  const consulta = await pedir("GET", `/api/v1/users/${id}`, "director");
  assert.equal(consulta.cuerpo.data.dia, "Jueves");
  assert.equal(consulta.cuerpo.data.materia, "Lengua");
  assert.equal((await pedir("GET", `/api/v1/users/${viernes.cuerpo.data.id}`, "director")).cuerpo.data.dia, "Viernes");

  const sabado = await pedir("PATCH", `/api/v1/users/${id}`, "director", { ...academicos, dia: "Sabado" });
  assert.equal(sabado.status, 422);
  assert.ok(sabado.cuerpo.error.details.some((detalle) => detalle.field === "dia"));
  assert.equal((await pedir("GET", `/api/v1/users/${id}`, "director")).cuerpo.data.dia, "Jueves");

  /* Editar solo datos personales no exige el dia (perfiles cargados antes). */
  const personal = await pedir("PATCH", `/api/v1/users/${id}`, "director", { telefono: "11 4000-0000" });
  assert.equal(personal.status, 200);
  assert.equal(personal.cuerpo.data.dia, "Jueves");
});

test("el alta de docencia rechaza datos academicos incompletos o invalidos", async () => {
  const base = {
    ...NUEVO,
    email: "docente.invalido@prece.local",
    area: "docencia",
    roles: ["docente"]
  };

  const incompleto = await pedir("POST", "/api/v1/users", "director", base);
  assert.equal(incompleto.status, 422);

  const campos = incompleto.cuerpo.error.details.map((detalle) => detalle.field);
  assert.ok(campos.includes("materia"));
  assert.ok(campos.includes("situacion_revista"));
  assert.ok(campos.includes("modulos"));
  assert.ok(campos.includes("dia"));
  assert.ok(campos.includes("hora_desde"));
  assert.ok(campos.includes("hora_hasta"));

  const horarioInvalido = await pedir("POST", "/api/v1/users", "director", {
    ...base,
    materia: "Lengua",
    situacion_revista: "Suplente",
    modulos: 5,
    hora_desde: "12:00",
    hora_hasta: "08:00"
  });

  assert.equal(horarioInvalido.status, 422);
  const invalidos = horarioInvalido.cuerpo.error.details.map((detalle) => detalle.field);
  assert.ok(invalidos.includes("suplente_de"));
  assert.ok(invalidos.includes("modulos"));
  assert.ok(invalidos.includes("hora_hasta"));
});

test("los catalogos de la institucion son de lectura y estan completos", async () => {
  const areas = await pedir("GET", "/api/v1/catalogos/areas", "director");
  assert.equal(areas.status, 200);
  assert.ok(areas.cuerpo.data.length >= 5);
  assert.ok(areas.cuerpo.data.every((area) => area.id && area.nombre));

  const institucion = await pedir("GET", "/api/v1/institucion", "secretario");
  assert.equal(institucion.status, 200);
  assert.ok(institucion.cuerpo.data.nombre);
  assert.equal(typeof institucion.cuerpo.data.cicloLectivo, "number");
});
