/* Seguimiento de inasistencias: registro de acciones asociadas a un alumno,
   responsable tomado de la sesion, historial que no se pierde, consultas por
   alumno, periodo y tipo, y respuestas 401/403/404/422. */

import assert from "node:assert/strict";
import test, { after, before } from "node:test";
import { createApp } from "../src/app.mjs";
import { apiRoutes } from "../routes/index.mjs";
import { seedAuthData } from "../database/seeds/auth.seed.mjs";
import { seedAttendanceFollowups } from "../database/seeds/attendance-followups.seed.mjs";
import attendanceFollowupsRepository from "../modules/attendance-followups/attendance-followups.repository.mjs";
import { resetStore } from "../database/memory-store.mjs";

const PUERTO = 4006;
const base = `http://127.0.0.1:${PUERTO}`;

let servidor;
let director;
let preceptor;
let docente;

async function login(email, password) {
  const respuesta = await fetch(`${base}/api/v1/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password })
  });

  if (respuesta.status !== 200) {
    throw new Error(`No se pudo autenticar ${email}: ${respuesta.status}`);
  }

  return (await respuesta.json()).accessToken;
}

async function pedir(metodo, ruta, token, cuerpo) {
  const cabeceras = token ? { authorization: `Bearer ${token}` } : {};

  if (cuerpo !== undefined) {
    cabeceras["content-type"] = "application/json";
  }

  const respuesta = await fetch(`${base}${ruta}`, {
    method: metodo,
    headers: cabeceras,
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo)
  });

  return { status: respuesta.status, cuerpo: await respuesta.json() };
}

before(async () => {
  await seedAuthData();
  seedAttendanceFollowups();
  servidor = createApp(apiRoutes);
  await new Promise((listo) => servidor.listen(PUERTO, listo));
  director = await login("director@prece.local", "Director123!");
  preceptor = await login("preceptor@prece.local", "Preceptor123!");
  docente = await login("docente@prece.local", "Docente123!");
});

after(async () => {
  await new Promise((listo) => servidor.close(listo));
});

/* ---------------- Autenticacion y permisos -------------------------------- */

test("las rutas de seguimiento exigen token (401)", async () => {
  const listar = await pedir("GET", "/api/v1/seguimientos-inasistencia");
  assert.equal(listar.status, 401);
  assert.equal(listar.cuerpo.error.code, "MISSING_TOKEN");

  const crear = await pedir("POST", "/api/v1/seguimientos-inasistencia", null, { alumnoId: "alu-1" });
  assert.equal(crear.status, 401);
});

test("un docente sin permiso de escritura no registra ni modifica acciones (403)", async () => {
  const crear = await pedir("POST", "/api/v1/seguimientos-inasistencia", docente, {
    alumnoId: "alu-1",
    fecha: "2026-03-20",
    tipo: "llamado_familia",
    observaciones: "Intento de registro no autorizado"
  });
  assert.equal(crear.status, 403);
  assert.equal(crear.cuerpo.error.code, "FORBIDDEN");

  const modificar = await pedir("PATCH", "/api/v1/seguimientos-inasistencia/seg-1", docente, {
    observaciones: "Intento de modificacion no autorizado"
  });
  assert.equal(modificar.status, 403);
});

test("un docente puede consultar el seguimiento (200)", async () => {
  const { status } = await pedir("GET", "/api/v1/seguimientos-inasistencia", docente);
  assert.equal(status, 200);
});

/* ---------------- Catalogo ------------------------------------------------ */

test("el catalogo expone los tipos de accion y los ordenes", async () => {
  const { status, cuerpo } = await pedir("GET", "/api/v1/seguimientos-inasistencia/catalogos", director);

  assert.equal(status, 200);
  assert.deepEqual(
    cuerpo.data.tiposAccion.map((tipo) => tipo.valor),
    ["llamado_familia", "comunicacion_familia", "notificacion", "comunicacion_cuaderno", "entrevista", "otra_medida"]
  );
  assert.ok(cuerpo.data.tiposAccion.every((tipo) => tipo.descripcion));
  assert.ok(cuerpo.data.ordenes.includes("fecha_desc"));
  assert.deepEqual(cuerpo.data.ordenesAlumnos, ["alumno", "alumno_desc", "total", "total_desc"]);
});

/* ---------------- Registro de acciones ------------------------------------ */

test("registrar una accion devuelve 201 con alumno, responsable y fecha", async () => {
  const { status, cuerpo } = await pedir("POST", "/api/v1/seguimientos-inasistencia", preceptor, {
    alumnoId: "alu-2",
    fecha: "2026-03-18",
    tipo: "entrevista",
    observaciones: "Entrevista con la madre para revisar el absences del bimestre."
  });

  assert.equal(status, 201);
  assert.equal(cuerpo.data.alumnoId, "alu-2");
  assert.equal(cuerpo.data.alumno.nombre, "Carla");
  assert.equal(cuerpo.data.fecha, "2026-03-18");
  assert.equal(cuerpo.data.tipo, "entrevista");
  assert.equal(cuerpo.data.escuelaId, "esc-1");
  assert.equal(cuerpo.data.responsable.displayName, "Preceptor 1° A");
  assert.equal(cuerpo.data.historial.length, 0);
});

test("el responsable sale del usuario autenticado y no del cuerpo (422)", async () => {
  const { status, cuerpo } = await pedir("POST", "/api/v1/seguimientos-inasistencia", preceptor, {
    alumnoId: "alu-2",
    fecha: "2026-03-19",
    tipo: "notificacion",
    observaciones: "Intento de atribuir la accion a otro usuario.",
    usuarioResponsableId: "usr_1"
  });

  assert.equal(status, 422);
  assert.equal(cuerpo.error.details[0].field, "usuarioResponsableId");
});

test("el responsable del registro es el usuario de la sesion", async () => {
  const creado = await pedir("POST", "/api/v1/seguimientos-inasistencia", director, {
    alumnoId: "alu-2",
    fecha: "2026-03-20",
    tipo: "llamado_familia",
    observaciones: "Registrado por direccion, no por preceptoria."
  });

  assert.equal(creado.status, 201);
  assert.equal(creado.cuerpo.data.responsable.displayName, "Director Escuela 1");
  assert.equal(creado.cuerpo.data.creadoPor, creado.cuerpo.data.responsableId);
});

test("un alumno inexistente o un payload incompleto devuelven 422", async () => {
  const alumnoInexistente = await pedir("POST", "/api/v1/seguimientos-inasistencia", preceptor, {
    alumnoId: "alu-999",
    fecha: "2026-03-20",
    tipo: "notificacion",
    observaciones: "Alumno que no existe en el padron."
  });
  assert.equal(alumnoInexistente.status, 422);
  assert.equal(alumnoInexistente.cuerpo.error.details[0].field, "alumnoId");

  const sinFecha = await pedir("POST", "/api/v1/seguimientos-inasistencia", preceptor, {
    alumnoId: "alu-1",
    tipo: "notificacion",
    observaciones: "Falta la fecha de la accion."
  });
  assert.equal(sinFecha.status, 422);
  assert.equal(sinFecha.cuerpo.error.details[0].field, "fecha");

  const sinTipo = await pedir("POST", "/api/v1/seguimientos-inasistencia", preceptor, {
    alumnoId: "alu-1",
    fecha: "2026-03-20",
    observaciones: "Falta el tipo de accion."
  });
  assert.equal(sinTipo.status, 422);
  assert.equal(sinTipo.cuerpo.error.details[0].field, "tipo");
});

test("se validan la fecha, el tipo y las observaciones (422)", async () => {
  const fechaInvalida = await pedir("POST", "/api/v1/seguimientos-inasistencia", preceptor, {
    alumnoId: "alu-1",
    fecha: "2026-02-30",
    tipo: "notificacion",
    observaciones: "Fecha de calendario inexistente."
  });
  assert.equal(fechaInvalida.status, 422);
  assert.equal(fechaInvalida.cuerpo.error.details[0].field, "fecha");

  const fechaFutura = await pedir("POST", "/api/v1/seguimientos-inasistencia", preceptor, {
    alumnoId: "alu-1",
    fecha: "2099-01-01",
    tipo: "notificacion",
    observaciones: "No se puede registrar una accion futura."
  });
  assert.equal(fechaFutura.status, 422);
  assert.equal(fechaFutura.cuerpo.error.details[0].field, "fecha");

  const tipoInvalido = await pedir("POST", "/api/v1/seguimientos-inasistencia", preceptor, {
    alumnoId: "alu-1",
    fecha: "2026-03-20",
    tipo: "visita_domiciliaria",
    observaciones: "Tipo fuera del catalogo central."
  });
  assert.equal(tipoInvalido.status, 422);
  assert.equal(tipoInvalido.cuerpo.error.details[0].field, "tipo");

  const sinObservaciones = await pedir("POST", "/api/v1/seguimientos-inasistencia", preceptor, {
    alumnoId: "alu-1",
    fecha: "2026-03-20",
    tipo: "notificacion"
  });
  assert.equal(sinObservaciones.status, 422);
  assert.equal(sinObservaciones.cuerpo.error.details[0].field, "observaciones");

  const observacionesCortas = await pedir("POST", "/api/v1/seguimientos-inasistencia", preceptor, {
    alumnoId: "alu-1",
    fecha: "2026-03-20",
    tipo: "notificacion",
    observaciones: "ok"
  });
  assert.equal(observacionesCortas.status, 422);
  assert.equal(observacionesCortas.cuerpo.error.details[0].field, "observaciones");

  const observacionesLargas = await pedir("POST", "/api/v1/seguimientos-inasistencia", preceptor, {
    alumnoId: "alu-1",
    fecha: "2026-03-20",
    tipo: "notificacion",
    observaciones: "a".repeat(501)
  });
  assert.equal(observacionesLargas.status, 422);
  assert.equal(observacionesLargas.cuerpo.error.details[0].field, "observaciones");
});

test("un alumno admite varias acciones sin perder el historial", async () => {
  const antes = await pedir("GET", "/api/v1/alumnos/alu-6/seguimiento-inasistencia", director);
  const totalAntes = antes.cuerpo.paginacion.total;

  const creado = await pedir("POST", "/api/v1/seguimientos-inasistencia", preceptor, {
    alumnoId: "alu-6",
    fecha: "2026-03-21",
    tipo: "otra_medida",
    observaciones: "Se solicito apoyo del equipo de orientacion."
  });
  assert.equal(creado.status, 201);

  const despues = await pedir("GET", "/api/v1/alumnos/alu-6/seguimiento-inasistencia", director);
  assert.equal(despues.cuerpo.paginacion.total, totalAntes + 1);
});

/* ---------------- Modificacion -------------------------------------------- */

test("modificar una accion conserva el estado anterior en el historial", async () => {
  const antes = await pedir("GET", "/api/v1/seguimientos-inasistencia/seg-1", director);
  assert.equal(antes.cuerpo.data.historial.length, 0);
  assert.equal(antes.cuerpo.data.tipo, "llamado_familia");

  const { status, cuerpo } = await pedir("PATCH", "/api/v1/seguimientos-inasistencia/seg-1", preceptor, {
    tipo: "entrevista",
    observaciones: "El llamado derivó en una entrevista con la madre."
  });

  assert.equal(status, 200);
  assert.equal(cuerpo.data.tipo, "entrevista");
  assert.equal(cuerpo.data.actualizadoPor, cuerpo.data.responsableId);
  assert.equal(cuerpo.data.historial.length, 1);
  assert.equal(cuerpo.data.historial[0].tipo, "llamado_familia");
  assert.equal(cuerpo.data.historial[0].fechaAccion, "2026-03-02");
  assert.equal(
    cuerpo.data.historial[0].observaciones,
    "Se llamo a la madre por dos inasistencias consecutivas. Prometio regularizar la asistencia."
  );
});

test("no se puede cambiar el alumno de una accion registrada (422)", async () => {
  const { status, cuerpo } = await pedir("PATCH", "/api/v1/seguimientos-inasistencia/seg-2", preceptor, {
    alumnoId: "alu-7"
  });

  assert.equal(status, 422);
  assert.equal(cuerpo.error.details[0].field, "alumnoId");
});

test("una modificacion sin cambios no altera el historial", async () => {
  const { status, cuerpo } = await pedir("PATCH", "/api/v1/seguimientos-inasistencia/seg-2", preceptor, {
    fecha: "2026-03-09"
  });

  assert.equal(status, 200);
  assert.equal(cuerpo.data.historial.length, 0);
});

test("un seguimiento inexistente devuelve 404", async () => {
  const { status, cuerpo } = await pedir("GET", "/api/v1/seguimientos-inasistencia/seg-999", director);

  assert.equal(status, 404);
  assert.equal(cuerpo.error.code, "NOT_FOUND");
});

/* ---------------- Consultas ----------------------------------------------- */

test("listar seguimientos con filtros por alumno, tipo y responsable", async () => {
  const porAlumno = await pedir("GET", "/api/v1/seguimientos-inasistencia?alumnoId=alu-1", director);
  assert.equal(porAlumno.status, 200);
  assert.equal(porAlumno.cuerpo.paginacion.total, 3);
  assert.ok(porAlumno.cuerpo.data.every((item) => item.alumnoId === "alu-1"));

  const porTipo = await pedir("GET", "/api/v1/seguimientos-inasistencia?tipo=entrevista", director);
  assert.ok(porTipo.cuerpo.data.every((item) => item.tipo === "entrevista"));
  assert.ok(porTipo.cuerpo.paginacion.total >= 2);

  const porResponsable = await pedir(
    "GET",
    "/api/v1/seguimientos-inasistencia?responsableId=usr_2",
    director
  );
  assert.ok(porResponsable.cuerpo.data.length > 0);
  assert.ok(porResponsable.cuerpo.data.every((item) => item.responsableId === "usr_2"));
});

test("listar seguimientos por periodo de fechas", async () => {
  const marzo = await pedir("GET", "/api/v1/seguimientos-inasistencia?desde=2026-03-01&hasta=2026-03-31", director);
  assert.ok(marzo.cuerpo.paginacion.total > 0);
  assert.ok(marzo.cuerpo.data.every((item) => item.fecha >= "2026-03-01" && item.fecha <= "2026-03-31"));

  const febrero = await pedir("GET", "/api/v1/seguimientos-inasistencia?desde=2026-02-01&hasta=2026-02-28", director);
  assert.equal(febrero.cuerpo.paginacion.total, 1);
  assert.equal(febrero.cuerpo.data[0].id, "seg-6");
});

test("los filtros, el orden y la paginacion invalidos devuelven 422", async () => {
  const tipo = await pedir("GET", "/api/v1/seguimientos-inasistencia?tipo=inventado", director);
  assert.equal(tipo.status, 422);

  const rango = await pedir("GET", "/api/v1/seguimientos-inasistencia?desde=2026-03-31&hasta=2026-03-01", director);
  assert.equal(rango.status, 422);
  assert.equal(rango.cuerpo.error.details[0].field, "desde");

  const fecha = await pedir("GET", "/api/v1/seguimientos-inasistencia?desde=ayer", director);
  assert.equal(fecha.status, 422);

  const orden = await pedir("GET", "/api/v1/seguimientos-inasistencia?orden=azar", director);
  assert.equal(orden.status, 422);

  const pagina = await pedir("GET", "/api/v1/seguimientos-inasistencia?pagina=0", director);
  assert.equal(pagina.status, 422);

  const porPagina = await pedir("GET", "/api/v1/seguimientos-inasistencia?porPagina=500", director);
  assert.equal(porPagina.status, 422);
});

test("la paginacion divide el resultado y informa el total", async () => {
  const { status, cuerpo } = await pedir(
    "GET",
    "/api/v1/seguimientos-inasistencia?pagina=1&porPagina=2&orden=fecha",
    director
  );

  assert.equal(status, 200);
  assert.equal(cuerpo.data.length, 2);
  assert.equal(cuerpo.paginacion.pagina, 1);
  assert.equal(cuerpo.paginacion.porPagina, 2);
  assert.ok(cuerpo.paginacion.total > 2);
  assert.equal(cuerpo.paginacion.tieneSiguiente, true);
});

test("el historial de un alumno trae todas sus acciones", async () => {
  const { status, cuerpo } = await pedir("GET", "/api/v1/alumnos/alu-1/seguimiento-inasistencia", director);

  assert.equal(status, 200);
  assert.equal(cuerpo.data.alumno.id, "alu-1");
  assert.equal(cuerpo.data.alumno.apellido, "Pérez López");
  assert.equal(cuerpo.data.acciones.length, cuerpo.paginacion.total);
  assert.ok(cuerpo.data.acciones.length >= 3);

  const fechas = cuerpo.data.acciones.map((item) => item.fecha);
  assert.deepEqual([...fechas].sort((a, b) => b.localeCompare(a)), fechas);
});

test("el historial de un alumno acepta filtros y paginacion", async () => {
  const porTipo = await pedir(
    "GET",
    "/api/v1/alumnos/alu-1/seguimiento-inasistencia?tipo=notificacion",
    director
  );
  assert.ok(porTipo.cuerpo.data.acciones.every((item) => item.tipo === "notificacion"));

  const paginado = await pedir(
    "GET",
    "/api/v1/alumnos/alu-1/seguimiento-inasistencia?porPagina=1&pagina=2",
    director
  );
  assert.equal(paginado.cuerpo.data.acciones.length, 1);
  assert.equal(paginado.cuerpo.paginacion.pagina, 2);
  assert.equal(paginado.cuerpo.paginacion.tieneAnterior, true);
});

test("la ultima accion del alumno es la mas reciente", async () => {
  const { status, cuerpo } = await pedir("GET", "/api/v1/alumnos/alu-1/seguimiento-inasistencia/ultima", director);

  assert.equal(status, 200);
  assert.equal(cuerpo.data.seguimiento.fecha, "2026-03-16");
  assert.equal(cuerpo.data.seguimiento.tipo, "entrevista");
});

test("el resumen indica si el alumno ya tuvo seguimiento", async () => {
  const conSeguimiento = await pedir(
    "GET",
    "/api/v1/alumnos/alu-1/seguimiento-inasistencia/resumen",
    director
  );

  assert.equal(conSeguimiento.status, 200);
  assert.equal(conSeguimiento.cuerpo.data.tieneSeguimiento, true);
  assert.ok(conSeguimiento.cuerpo.data.total >= 3);
  assert.equal(conSeguimiento.cuerpo.data.ultimaFecha, "2026-03-16");
  assert.ok(conSeguimiento.cuerpo.data.porTipo.entrevista >= 1);

  const sinSeguimiento = await pedir(
    "GET",
    "/api/v1/alumnos/alu-4/seguimiento-inasistencia/resumen",
    director
  );

  assert.equal(sinSeguimiento.status, 200);
  assert.equal(sinSeguimiento.cuerpo.data.tieneSeguimiento, false);
  assert.equal(sinSeguimiento.cuerpo.data.total, 0);
  assert.equal(sinSeguimiento.cuerpo.data.ultimaAccion, null);
});

test("un alumno sin seguimiento no tiene ultima accion (404)", async () => {
  const { status, cuerpo } = await pedir("GET", "/api/v1/alumnos/alu-4/seguimiento-inasistencia/ultima", director);

  assert.equal(status, 404);
  assert.equal(cuerpo.error.code, "NOT_FOUND");
});

test("consultar el seguimiento de un alumno inexistente devuelve 404", async () => {
  const historial = await pedir("GET", "/api/v1/alumnos/alu-999/seguimiento-inasistencia", director);
  assert.equal(historial.status, 404);

  const ultima = await pedir("GET", "/api/v1/alumnos/alu-999/seguimiento-inasistencia/ultima", director);
  assert.equal(ultima.status, 404);

  const resumen = await pedir("GET", "/api/v1/alumnos/alu-999/seguimiento-inasistencia/resumen", director);
  assert.equal(resumen.status, 404);
});

test("listar los alumnos que poseen registros de seguimiento", async () => {
  const { status, cuerpo } = await pedir("GET", "/api/v1/seguimientos-inasistencia/alumnos", director);

  assert.equal(status, 200);
  assert.ok(cuerpo.data.length > 0);
  assert.ok(cuerpo.data.every((item) => item.total >= 1));

  const deAlumno = cuerpo.data.find((item) => item.alumnoId === "alu-1");
  assert.ok(deAlumno.total >= 3);
  assert.equal(deAlumno.alumno.apellido, "Pérez López");
  assert.equal(deAlumno.ultimaFecha, "2026-03-16");

  assert.ok(!cuerpo.data.some((item) => item.alumnoId === "alu-4"));
});

test("los alumnos con seguimiento se pueden ordenar por cantidad de acciones", async () => {
  const { status, cuerpo } = await pedir(
    "GET",
    "/api/v1/seguimientos-inasistencia/alumnos?orden=total_desc",
    director
  );

  assert.equal(status, 200);
  const totales = cuerpo.data.map((item) => item.total);
  assert.deepEqual([...totales].sort((a, b) => b - a), totales);
});

test("un orden invalido en el listado de alumnos devuelve 422", async () => {
  const { status, cuerpo } = await pedir(
    "GET",
    "/api/v1/seguimientos-inasistencia/alumnos?orden=fecha_desc",
    director
  );

  assert.equal(status, 422);
  assert.equal(cuerpo.error.details[0].field, "orden");
});

test("las altas y modificaciones quedan auditadas", async () => {
  const traza = attendanceFollowupsRepository.listarAuditoria();
  const altas = traza.filter((entrada) => entrada.accion === "seguimiento:create");
  const modificaciones = traza.filter((entrada) => entrada.accion === "seguimiento:update");

  assert.ok(altas.length > 0);
  assert.ok(modificaciones.length > 0);
  assert.ok(altas.every((entrada) => entrada.entidad === "seguimiento_inasistencia"));
  assert.ok(modificaciones.every((entrada) => entrada.actorId));
});

/* ---------------- Aislamiento de los datos de prueba ---------------------- */

test("el store del modulo se puede reiniciar sin tocar el resto", () => {
  attendanceFollowupsRepository.resetData();
  assert.equal(attendanceFollowupsRepository.listSeguimientos({}).length, 0);

  seedAttendanceFollowups();
  assert.ok(attendanceFollowupsRepository.listSeguimientos({}).length > 0);

  resetStore();
});
