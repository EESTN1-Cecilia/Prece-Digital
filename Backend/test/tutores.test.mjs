/* Padres y tutores: CRUD de tutores y relaciones tutor/alumno.
   Corre sin base de datos: usa los stores en memoria y el seed de auth. */

import assert from "node:assert/strict";
import test, { after, before } from "node:test";
import { createApp } from "../src/app.mjs";
import { apiRoutes } from "../routes/index.mjs";
import { getStore } from "../database/memory-store.mjs";
import { seedAuthData } from "../database/seeds/auth.seed.mjs";
import { seedTutores } from "../database/seeds/tutores.seed.mjs";

const PUERTO = 4003;
const base = `http://127.0.0.1:${PUERTO}`;

let servidor;
let director;
let docente;
let server2;

async function login(email, password) {
  const respuesta = await fetch(`${base}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  assert.equal(respuesta.status, 200, `login ${email}`);
  return respuesta.json();
}

async function pedir(ruta, { token, method = "GET", cuerpo, headers: extraHeaders = {} } = {}) {
  const cabeceras = { ...extraHeaders };

  if (token) {
    cabeceras.Authorization = `Bearer ${token}`;
  }

  if (cuerpo !== undefined) {
    cabeceras["Content-Type"] = "application/json";
  }

  const respuesta = await fetch(`${base}${ruta}`, {
    method,
    headers: cabeceras,
    body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined
  });

  return { status: respuesta.status, cuerpo: await respuesta.json() };
}

before(async () => {
  await seedAuthData();
  seedTutores();

  servidor = createApp(apiRoutes);
  await new Promise((listo) => servidor.listen(PUERTO, listo));

  director = await login("director@prece.local", "Director123!");
  docente = await login("docente@prece.local", "Docente123!");
  server2 = await login("server@prece.local", "Server123!");
});

after(async () => {
  await new Promise((listo) => servidor.close(listo));
});

test("sin autenticacion todas las operaciones devuelven 401", async () => {
  const rutas = [
    ["POST", "/api/v1/tutors", {}],
    ["GET", "/api/v1/tutors"],
    ["GET", "/api/v1/tutors/tut-1"],
    ["PATCH", "/api/v1/tutors/tut-1", {}],
    ["DELETE", "/api/v1/tutors/tut-1"],
    ["GET", "/api/v1/tutors/tut-1/students"],
    ["POST", "/api/v1/students/alu-1/tutors", {}],
    ["GET", "/api/v1/students/alu-1/tutors"],
    ["PATCH", "/api/v1/student-tutors/rel-1", {}],
    ["DELETE", "/api/v1/student-tutors/rel-1"]
  ];

  for (const [metodo, ruta, cuerpo] of rutas) {
    const { status, cuerpo: c } = await pedir(ruta, { method: metodo, cuerpo });
    assert.equal(status, 401, `${metodo} ${ruta}`);
    assert.equal(c.error.code, "missing_token", `${metodo} ${ruta}`);
  }
});

test("un rol sin permiso de escritura recibe 403 aunque este autenticado", async () => {
  const { status } = await pedir("/api/v1/tutors", {
    token: docente.accessToken,
    method: "POST",
    cuerpo: { nombre: "N", apellido: "G", dni: "30111222" }
  });
  assert.equal(status, 403);

  const { status: status2 } = await pedir("/api/v1/students/alu-1/tutors", {
    token: docente.accessToken,
    method: "POST",
    cuerpo: { tutorId: "tut-3", parentesco: "madre" }
  });
  assert.equal(status2, 403);

  const { status: status3 } = await pedir("/api/v1/student-tutors/rel-2", {
    token: docente.accessToken,
    method: "PATCH",
    cuerpo: { parentesco: "padre" }
  });
  assert.equal(status3, 403);

  const { status: status4 } = await pedir("/api/v1/student-tutors/rel-2", {
    token: docente.accessToken,
    method: "DELETE"
  });
  assert.equal(status4, 403);
});

test("un rol sin permiso de lectura recibe 403 al listar", async () => {
  const { status } = await pedir("/api/v1/tutors", { token: server2.accessToken });
  assert.equal(status, 403);

  const { status: status2 } = await pedir("/api/v1/students/alu-1/tutors", { token: server2.accessToken });
  assert.equal(status2, 403);
});

test("el docente puede consultar tutores pero no alterar datos", async () => {
  const { status } = await pedir("/api/v1/tutors", { token: docente.accessToken });
  assert.equal(status, 200);

  const { status: status2 } = await pedir("/api/v1/tutors/tut-1", { token: docente.accessToken });
  assert.equal(status2, 200);
});

test("registrar un tutor valida campos obligatorios y formatos", async () => {
  const sinApellido = await pedir("/api/v1/tutors", {
    token: director.accessToken,
    method: "POST",
    cuerpo: { nombre: "X", dni: "31122334" }
  });
  assert.equal(sinApellido.status, 422);
  assert.equal(sinApellido.cuerpo.error.details[0].field, "apellido");

  const dniCorto = await pedir("/api/v1/tutors", {
    token: director.accessToken,
    method: "POST",
    cuerpo: { nombre: "X", apellido: "Y", dni: "123" }
  });
  assert.equal(dniCorto.status, 422);
  assert.equal(dniCorto.cuerpo.error.details[0].field, "dni");

  const emailInvalido = await pedir("/api/v1/tutors", {
    token: director.accessToken,
    method: "POST",
    cuerpo: { nombre: "X", apellido: "Y", dni: "31122335", email: "no-es-email" }
  });
  assert.equal(emailInvalido.status, 422);
  assert.equal(emailInvalido.cuerpo.error.details[0].field, "email");

  const telefonoInvalido = await pedir("/api/v1/tutors", {
    token: director.accessToken,
    method: "POST",
    cuerpo: { nombre: "X", apellido: "Y", dni: "31122336", telefono: "abc" }
  });
  assert.equal(telefonoInvalido.status, 422);
  assert.equal(telefonoInvalido.cuerpo.error.details[0].field, "telefono");
});

test("no se puede registrar un tutor con el DNI duplicado en la misma escuela", async () => {
  const { status, cuerpo } = await pedir("/api/v1/tutors", {
    token: director.accessToken,
    method: "POST",
    cuerpo: { nombre: "Copia", apellido: "Pérez", dni: "20111222" }
  });

  assert.equal(status, 409);
  assert.equal(cuerpo.error.code, "CONFLICT");
});

test("consultar un tutor inexistente devuelve 404", async () => {
  const { status, cuerpo } = await pedir("/api/v1/tutors/tut-999", { token: director.accessToken });
  assert.equal(status, 404);
  assert.equal(cuerpo.error.code, "NOT_FOUND");
});

test("listar tutores pagina y filtra por apellido, dni y estado", async () => {
  const primero = await pedir("/api/v1/tutors?porPagina=3&pagina=1", { token: director.accessToken });
  assert.equal(primero.status, 200);
  assert.equal(primero.cuerpo.paginacion.total, 6);
  assert.equal(primero.cuerpo.data.length, 3);
  assert.equal(primero.cuerpo.paginacion.totalPaginas, 2);
  assert.equal(primero.cuerpo.paginacion.tieneSiguiente, true);
  assert.equal(primero.cuerpo.paginacion.tieneAnterior, false);

  const segundo = await pedir("/api/v1/tutors?porPagina=3&pagina=2", { token: director.accessToken });
  assert.equal(segundo.cuerpo.data.length, 3);
  assert.equal(segundo.cuerpo.paginacion.tieneAnterior, true);
  assert.equal(segundo.cuerpo.paginacion.tieneSiguiente, false);

  const inactivos = await pedir("/api/v1/tutors?estado=inactivo", { token: director.accessToken });
  assert.equal(inactivos.cuerpo.paginacion.total, 1);
  assert.equal(inactivos.cuerpo.data[0].id, "tut-7");

  const todos = await pedir("/api/v1/tutors?estado=todos", { token: director.accessToken });
  assert.equal(todos.cuerpo.paginacion.total, 7);

  const porApellido = await pedir("/api/v1/tutors?apellido=perez", { token: director.accessToken });
  assert.equal(porApellido.cuerpo.paginacion.total, 2);

  const porDni = await pedir("/api/v1/tutors?dni=20111222", { token: director.accessToken });
  assert.equal(porDni.cuerpo.data[0].id, "tut-1");

  const invalido = await pedir("/api/v1/tutors?estado=otro", { token: director.accessToken });
  assert.equal(invalido.status, 422);

  const ordenInvalido = await pedir("/api/v1/tutors?orden=random", { token: director.accessToken });
  assert.equal(ordenInvalido.status, 422);

  const paginaInvalida = await pedir("/api/v1/tutors?pagina=0", { token: director.accessToken });
  assert.equal(paginaInvalida.status, 422);
});

test("registrar un tutor valido devuelve 201 con datos sanitizados", async () => {
  const { status, cuerpo } = await pedir("/api/v1/tutors", {
    token: director.accessToken,
    method: "POST",
    cuerpo: {
      nombre: "Carina",
      apellido: "Mansilla",
      dni: "31122334",
      email: "carina.mansilla@mail.com",
      telefono: "11-6666-0101",
      isActive: false,
      createdBy: "hacker",
      id: "tut-xx",
      password: "secreto"
    }
  });

  assert.equal(status, 201);
  assert.equal(cuerpo.data.nombre, "Carina");
  assert.equal(cuerpo.data.estado, "activo");
  assert.equal(cuerpo.data.escuelaId, "esc-1");

  const texto = JSON.stringify(cuerpo);
  assert.ok(!texto.includes("createdBy"));
  assert.ok(!texto.includes("password"));

  const consulta = await pedir(`/api/v1/tutors/${cuerpo.data.id}`, { token: director.accessToken });
  assert.equal(consulta.status, 200);
  assert.equal(consulta.cuerpo.data.dni, "31122334");
});

test("modificar un tutor permite actualizar contactos y no permite cambiar la escuela", async () => {
  const { status, cuerpo } = await pedir("/api/v1/tutors/tut-2", {
    token: director.accessToken,
    method: "PATCH",
    cuerpo: { telefono: "11-7777-0000", email: "nuevo@mail.com", escuelaId: "esc-999", isActive: true }
  });

  assert.equal(status, 200);
  assert.equal(cuerpo.data.telefono, "11-7777-0000");
  assert.equal(cuerpo.data.email, "nuevo@mail.com");
  assert.equal(cuerpo.data.escuelaId, "esc-1");

  const conflicto = await pedir("/api/v1/tutors/tut-1", {
    token: director.accessToken,
    method: "PATCH",
    cuerpo: { dni: "18111222" }
  });
  assert.equal(conflicto.status, 409);

  const inexistente = await pedir("/api/v1/tutors/tut-999", {
    token: director.accessToken,
    method: "PATCH",
    cuerpo: { nombre: "X" }
  });
  assert.equal(inexistente.status, 404);
});

test("asociar un tutor a un alumno valida existencia, parentesco y duplicados", async () => {
  const ok = await pedir("/api/v1/students/alu-2/tutors", {
    token: director.accessToken,
    method: "POST",
    cuerpo: { tutorId: "tut-4", parentesco: "abuela", responsablePrincipal: false, autorizadoRetiro: true }
  });
  assert.equal(ok.status, 201);
  assert.equal(ok.cuerpo.data.parentesco, "abuela");

  const alumnoInexistente = await pedir("/api/v1/students/alu-999/tutors", {
    token: director.accessToken,
    method: "POST",
    cuerpo: { tutorId: "tut-1", parentesco: "madre" }
  });
  assert.equal(alumnoInexistente.status, 404);

  const tutorInexistente = await pedir("/api/v1/students/alu-1/tutors", {
    token: director.accessToken,
    method: "POST",
    cuerpo: { tutorId: "tut-999", parentesco: "madre" }
  });
  assert.equal(tutorInexistente.status, 404);

  const parentescoInvalido = await pedir("/api/v1/students/alu-1/tutors", {
    token: director.accessToken,
    method: "POST",
    cuerpo: { tutorId: "tut-5", parentesco: "vecino" }
  });
  assert.equal(parentescoInvalido.status, 422);
  assert.equal(parentescoInvalido.cuerpo.error.details[0].field, "parentesco");

  const duplicado = await pedir("/api/v1/students/alu-1/tutors", {
    token: director.accessToken,
    method: "POST",
    cuerpo: { tutorId: "tut-1", parentesco: "madre" }
  });
  assert.equal(duplicado.status, 409);
});

test("un alumno puede tener multiples tutores y un tutor multiples alumnos", async () => {
  const deAlumno = await pedir("/api/v1/students/alu-1/tutors", { token: director.accessToken });
  assert.equal(deAlumno.status, 200);
  assert.equal(deAlumno.cuerpo.data.length, 2);
  assert.deepEqual(new Set(deAlumno.cuerpo.data.map((r) => r.tutorId)), new Set(["tut-1", "tut-2"]));
  assert.equal(deAlumno.cuerpo.data[0].tutor.apellido, "Pérez");

  const delTutor = await pedir("/api/v1/tutors/tut-1/students", { token: director.accessToken });
  assert.equal(delTutor.status, 200);
  assert.equal(delTutor.cuerpo.data.length, 2);
  assert.deepEqual(new Set(delTutor.cuerpo.data.map((r) => r.alumno.id)), new Set(["alu-1", "alu-2"]));
});

test("consultar los tutores de un alumno inexistente devuelve 404", async () => {
  const { status } = await pedir("/api/v1/students/alu-999/tutors", { token: director.accessToken });
  assert.equal(status, 404);

  const { status: status2 } = await pedir("/api/v1/tutors/tut-999/students", { token: director.accessToken });
  assert.equal(status2, 404);
});

test("modificar una relacion actualiza parentesco y banderas con validacion", async () => {
  const { status, cuerpo } = await pedir("/api/v1/student-tutors/rel-2", {
    token: director.accessToken,
    method: "PATCH",
    cuerpo: { parentesco: "padre", responsablePrincipal: true, autorizadoRetiro: true }
  });
  assert.equal(status, 200);
  assert.equal(cuerpo.data.parentesco, "padre");
  assert.equal(cuerpo.data.responsablePrincipal, true);
  assert.equal(cuerpo.data.autorizadoRetiro, true);

  const invalido = await pedir("/api/v1/student-tutors/rel-2", {
    token: director.accessToken,
    method: "PATCH",
    cuerpo: { parentesco: "amigo" }
  });
  assert.equal(invalido.status, 422);

  const inexistente = await pedir("/api/v1/student-tutors/rel-999", {
    token: director.accessToken,
    method: "PATCH",
    cuerpo: { parentesco: "padre" }
  });
  assert.equal(inexistente.status, 404);
});

test("desvincular un tutor deja de listarlo pero conserva la traza y no reaparece", async () => {
  const desvincular = await pedir("/api/v1/student-tutors/rel-1", {
    token: director.accessToken,
    method: "DELETE"
  });
  assert.equal(desvincular.status, 200);
  assert.equal(desvincular.cuerpo.data.estado, "inactivo");

  const activos = await pedir("/api/v1/students/alu-1/tutors", { token: director.accessToken });
  assert.equal(activos.cuerpo.data.length, 1);
  assert.equal(activos.cuerpo.data[0].tutorId, "tut-2");

  const historial = await pedir("/api/v1/students/alu-1/tutors?estado=todos", { token: director.accessToken });
  assert.ok(historial.cuerpo.data.some((r) => r.id === "rel-1" && r.estado === "inactivo"));

  const reAsociar = await pedir("/api/v1/students/alu-1/tutors", {
    token: director.accessToken,
    method: "POST",
    cuerpo: { tutorId: "tut-1", parentesco: "madre" }
  });
  assert.equal(reAsociar.status, 409);
});

test("desactivar un tutor es baja logica: conserva historial y relaciones", async () => {
  const desactivar = await pedir("/api/v1/tutors/tut-3", {
    token: director.accessToken,
    method: "DELETE"
  });
  assert.equal(desactivar.status, 200);
  assert.equal(desactivar.cuerpo.data.estado, "inactivo");
  assert.ok(desactivar.cuerpo.data.fechaBaja);

  const activos = await pedir("/api/v1/tutors", { token: director.accessToken });
  assert.equal(activos.cuerpo.paginacion.total, 6);

  const tutoresDeAlumno = await pedir("/api/v1/students/alu-3/tutors", { token: director.accessToken });
  const silvia = tutoresDeAlumno.cuerpo.data.find((r) => r.tutorId === "tut-3");
  assert.ok(silvia, "el alumno conserva a su tutora desactivada en el historial");
  assert.equal(silvia.tutor.estado, "inactivo");

  const alumnosDelTutor = await pedir("/api/v1/tutors/tut-3/students", { token: director.accessToken });
  assert.equal(alumnosDelTutor.cuerpo.data.length, 1);

  const consulta = await pedir("/api/v1/tutors/tut-3", { token: director.accessToken });
  assert.equal(consulta.cuerpo.data.estado, "inactivo");
});

test("la desactivacion de un tutor inexistente devuelve 404", async () => {
  const { status } = await pedir("/api/v1/tutors/tut-999", {
    token: director.accessToken,
    method: "DELETE"
  });
  assert.equal(status, 404);
});

test("las operaciones sensibles quedan registradas en la auditoria", async () => {
  const auditoria = getStore().tutorsAudit;
  const acciones = auditoria.map((a) => a.accion);

  assert.ok(acciones.includes("tutor:create"));
  assert.ok(acciones.includes("relacion:create"));
  assert.ok(acciones.includes("relacion:update"));
  assert.ok(acciones.includes("relacion:unlink"));
  assert.ok(acciones.includes("tutor:deactivate"));
  assert.ok(acciones.includes("tutor:update"));

  const trazaTutor = auditoria.find((a) => a.accion === "tutor:create" && a.entidadId === "tut-1");
  assert.ok(!trazaTutor, "el seed no pasa por el service, asi que no debe registrar auditoria");

  const creado = auditoria.find((a) => a.accion === "tutor:create" && a.despues?.dni === "31122334");
  assert.ok(creado, "la traza de creacion guarda el antes/despues");
  assert.ok(creado.actorId, "la creacion via API registra el actor");
  assert.equal(creado.entidad, "tutor");
});

test("las cabeceras del cliente nunca otorgan permisos", async () => {
  const { status } = await pedir("/api/v1/tutors", {
    token: server2.accessToken,
    headers: { "X-Permisos": "students.read" }
  });
  assert.equal(status, 403);
});