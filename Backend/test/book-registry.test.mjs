/* Libro Matriz digital: registro y consulta por alumno, unicidad de libro y
   folio, responsable tomado de la sesion, historial de modificaciones que no se
   pierde, baja logica por estado, controles de permisos y respuestas
   401/403/404/409/422. */

import assert from "node:assert/strict";
import test, { after, before } from "node:test";
import { createApp } from "../src/app.mjs";
import { apiRoutes } from "../routes/index.mjs";
import { seedAuthData } from "../database/seeds/auth.seed.mjs";
import { seedBookRegistry } from "../database/seeds/book-registry.seed.mjs";
import bookRegistryRepository from "../modules/book-registry/book-registry.repository.mjs";
import { resetStore } from "../database/memory-store.mjs";

const PUERTO = 4015;
const base = `http://127.0.0.1:${PUERTO}`;

let servidor;
let director;
let secretaria;
let docente;
let preceptor;

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
  seedBookRegistry();
  servidor = createApp(apiRoutes);
  await new Promise((listo) => servidor.listen(PUERTO, listo));
  director = await login("director@prece.local", "Director123!");
  secretaria = await login("secretaria@prece.local", "Secretaria123!");
  docente = await login("docente@prece.local", "Docente123!");
  preceptor = await login("preceptor@prece.local", "Preceptor123!");
});

after(async () => {
  await new Promise((listo) => servidor.close(listo));
});

/* ---------------- Autenticacion y permisos -------------------------------- */

test("las rutas del Libro Matriz exigen token (401)", async () => {
  const listar = await pedir("GET", "/api/v1/book-registry");
  assert.equal(listar.status, 401);
  assert.equal(listar.cuerpo.error.code, "MISSING_TOKEN");

  const crear = await pedir("POST", "/api/v1/students/alu-2/book-registry", null, { numeroLibro: "1", numeroFolio: "1" });
  assert.equal(crear.status, 401);
});

test("un docente sin permiso de escritura no registra ni modifica (403)", async () => {
  const crear = await pedir("POST", "/api/v1/students/alu-2/book-registry", docente, {
    numeroLibro: "99",
    numeroFolio: "99"
  });
  assert.equal(crear.status, 403);
  assert.equal(crear.cuerpo.error.code, "FORBIDDEN");

  const modificar = await pedir("PATCH", "/api/v1/book-registry/lm-1", docente, { numeroLibro: "99" });
  assert.equal(modificar.status, 403);
});

test("docente y preceptor pueden consultar aunque no escriban (200)", async () => {
  const docenteConsulta = await pedir("GET", "/api/v1/book-registry/lm-1", docente);
  assert.equal(docenteConsulta.status, 200);

  const preceptorConsulta = await pedir("GET", "/api/v1/book-registry", preceptor);
  assert.equal(preceptorConsulta.status, 200);
});

/* ---------------- Catalogo ------------------------------------------------ */

test("el catalogo expone estados, ordenes y limites", async () => {
  const { status, cuerpo } = await pedir("GET", "/api/v1/book-registry/catalogos", director);

  assert.equal(status, 200);
  assert.deepEqual(
    cuerpo.data.estadosRegistro.map((estado) => estado.valor),
    ["activo", "archivado"]
  );
  assert.ok(cuerpo.data.estadosRegistro.every((estado) => estado.descripcion));
  assert.ok(cuerpo.data.ordenesRegistros.includes("fecha_registro_desc"));
  assert.equal(cuerpo.data.limites.numeroLibroMaximo, 30);
  assert.equal(cuerpo.data.limites.numeroFolioMaximo, 30);
});

/* ---------------- Registro ------------------------------------------------ */

test("registrar el Libro Matriz devuelve 201 con alumno, dni, escuela y responsable de la sesion", async () => {
  const { status, cuerpo } = await pedir("POST", "/api/v1/students/alu-2/book-registry", secretaria, {
    numeroLibro: "14",
    numeroFolio: "02",
    fechaRegistro: "2026-04-01",
    datosAdicionales: { matricula: "2026-0002", plan: "Res. 1234/20" }
  });

  assert.equal(status, 201);
  assert.equal(cuerpo.data.alumnoId, "alu-2");
  assert.equal(cuerpo.data.alumno, "Gómez Ruiz, Carla");
  assert.equal(cuerpo.data.dni, "42345678");
  assert.equal(cuerpo.data.escuelaId, "esc-1");
  assert.equal(cuerpo.data.numeroLibro, "14");
  assert.equal(cuerpo.data.numeroFolio, "02");
  assert.equal(cuerpo.data.fechaRegistro, "2026-04-01");
  assert.equal(cuerpo.data.estado, "activo");
  assert.equal(cuerpo.data.datosAdicionales.matricula, "2026-0002");
  assert.equal(cuerpo.data.usuarioResponsable, "Secretaría");
  assert.equal(cuerpo.data.creadoPor, cuerpo.data.responsableId);
  assert.equal(cuerpo.data.historial.length, 0);
});

test("el responsable sale del usuario de la sesion y no del cuerpo", async () => {
  const { status, cuerpo } = await pedir("POST", "/api/v1/students/alu-4/book-registry", secretaria, {
    numeroLibro: "14",
    numeroFolio: "03",
    responsableId: "usr_1",
    usuarioResponsableId: "usr_1"
  });

  assert.equal(status, 201);
  assert.equal(cuerpo.data.usuarioResponsable, "Secretaría");
  assert.notEqual(cuerpo.data.responsableId, "usr_1");
});

test("un alumno no puede tener dos Libros Matriz (409)", async () => {
  const { status, cuerpo } = await pedir("POST", "/api/v1/students/alu-2/book-registry", secretaria, {
    numeroLibro: "20",
    numeroFolio: "20"
  });

  assert.equal(status, 409);
  assert.equal(cuerpo.error.code, "CONFLICT");
});

test("no se puede repetir un numero de libro y folio ya registrado (409)", async () => {
  const { status, cuerpo } = await pedir("POST", "/api/v1/students/alu-6/book-registry", secretaria, {
    numeroLibro: "12",
    numeroFolio: "34"
  });

  assert.equal(status, 409);
  assert.equal(cuerpo.error.code, "CONFLICT");
});

test("se validan numero de libro, folio, fecha, estado y datos adicionales (422)", async () => {
  const sinLibro = await pedir("POST", "/api/v1/students/alu-6/book-registry", secretaria, {
    numeroFolio: "01"
  });
  assert.equal(sinLibro.status, 422);
  assert.equal(sinLibro.cuerpo.error.details[0].field, "numeroLibro");

  const libroInvalido = await pedir("POST", "/api/v1/students/alu-6/book-registry", secretaria, {
    numeroLibro: "@@@",
    numeroFolio: "01"
  });
  assert.equal(libroInvalido.status, 422);
  assert.equal(libroInvalido.cuerpo.error.details[0].field, "numeroLibro");

  const fechaInexistente = await pedir("POST", "/api/v1/students/alu-6/book-registry", secretaria, {
    numeroLibro: "16",
    numeroFolio: "01",
    fechaRegistro: "2026-02-30"
  });
  assert.equal(fechaInexistente.status, 422);
  assert.equal(fechaInexistente.cuerpo.error.details[0].field, "fechaRegistro");

  const fechaFutura = await pedir("POST", "/api/v1/students/alu-6/book-registry", secretaria, {
    numeroLibro: "16",
    numeroFolio: "01",
    fechaRegistro: "2099-01-01"
  });
  assert.equal(fechaFutura.status, 422);
  assert.equal(fechaFutura.cuerpo.error.details[0].field, "fechaRegistro");

  const estadoInvalido = await pedir("POST", "/api/v1/students/alu-6/book-registry", secretaria, {
    numeroLibro: "16",
    numeroFolio: "01",
    estado: "vigente"
  });
  assert.equal(estadoInvalido.status, 422);
  assert.equal(estadoInvalido.cuerpo.error.details[0].field, "estado");

  const datosInvalidos = await pedir("POST", "/api/v1/students/alu-6/book-registry", secretaria, {
    numeroLibro: "16",
    numeroFolio: "01",
    datosAdicionales: "no-es-objeto"
  });
  assert.equal(datosInvalidos.status, 422);
  assert.equal(datosInvalidos.cuerpo.error.details[0].field, "datosAdicionales");
});

test("registrar sobre un alumno inexistente devuelve 404", async () => {
  const { status, cuerpo } = await pedir("POST", "/api/v1/students/alu-999/book-registry", secretaria, {
    numeroLibro: "1",
    numeroFolio: "1"
  });

  assert.equal(status, 404);
  assert.equal(cuerpo.error.code, "NOT_FOUND");
});

test("un registro valido se crea y queda consultable por alumno", async () => {
  const creado = await pedir("POST", "/api/v1/students/alu-6/book-registry", secretaria, {
    numeroLibro: "16",
    numeroFolio: "01",
    fechaRegistro: "2026-04-02",
    datosAdicionales: { matricula: "2026-0006" }
  });
  assert.equal(creado.status, 201);

  const consultado = await pedir("GET", "/api/v1/alumnos/alu-6/libro-matriz", director);
  assert.equal(consultado.status, 200);
  assert.equal(consultado.cuerpo.data.numeroLibro, "16");
  assert.equal(consultado.cuerpo.data.alumno, "Medina Torres, Juan");
});

/* ---------------- Consultas ----------------------------------------------- */

test("consultar el Libro Matriz del alumno y por alias de alumno devuelven lo mismo", async () => {
  const porAlumno = await pedir("GET", "/api/v1/students/alu-1/book-registry", secretaria);
  assert.equal(porAlumno.status, 200);
  assert.equal(porAlumno.cuerpo.data.id, "lm-1");
  assert.equal(porAlumno.cuerpo.data.numeroLibro, "12");
  assert.equal(porAlumno.cuerpo.data.numeroFolio, "34");
  assert.equal(porAlumno.cuerpo.data.alumno, "Pérez López, Ana");

  const porAlias = await pedir("GET", "/api/v1/alumnos/alu-1/libro-matriz", secretaria);
  assert.equal(porAlias.status, 200);
  assert.equal(porAlias.cuerpo.data.id, porAlumno.cuerpo.data.id);
});

test("verificar existencia distingue alumnos con y sin Libro Matriz", async () => {
  const conRegistro = await pedir("GET", "/api/v1/students/alu-1/book-registry/exists", secretaria);
  assert.equal(conRegistro.status, 200);
  assert.equal(conRegistro.cuerpo.data.tieneLibroMatriz, true);
  assert.equal(conRegistro.cuerpo.data.registroId, "lm-1");

  const sinRegistro = await pedir("GET", "/api/v1/students/alu-7/book-registry/exists", secretaria);
  assert.equal(sinRegistro.status, 200);
  assert.equal(sinRegistro.cuerpo.data.tieneLibroMatriz, false);
  assert.equal(sinRegistro.cuerpo.data.registroId, null);
});

test("un alumno sin Libro Matriz devuelve 404 al consultarlo", async () => {
  const { status, cuerpo } = await pedir("GET", "/api/v1/students/alu-7/book-registry", secretaria);
  assert.equal(status, 404);
  assert.equal(cuerpo.error.code, "NOT_FOUND");

  const alias = await pedir("GET", "/api/v1/alumnos/alu-7/libro-matriz", secretaria);
  assert.equal(alias.status, 404);
});

test("un registro inexistente devuelve 404", async () => {
  const { status, cuerpo } = await pedir("GET", "/api/v1/book-registry/lm-999", director);
  assert.equal(status, 404);
  assert.equal(cuerpo.error.code, "NOT_FOUND");
});

test("buscar registros por libro, folio, estado y alumno", async () => {
  const porLibro = await pedir("GET", "/api/v1/book-registry?numeroLibro=12", director);
  assert.equal(porLibro.status, 200);
  assert.equal(porLibro.cuerpo.paginacion.total, 2);
  assert.ok(porLibro.cuerpo.data.every((item) => item.numeroLibro === "12"));

  const porFolio = await pedir("GET", "/api/v1/book-registry?numeroLibro=12&numeroFolio=35", director);
  assert.equal(porFolio.cuerpo.paginacion.total, 1);
  assert.equal(porFolio.cuerpo.data[0].id, "lm-2");

  const archivados = await pedir("GET", "/api/v1/book-registry?estado=archivado", director);
  assert.ok(archivados.cuerpo.paginacion.total >= 1);
  assert.ok(archivados.cuerpo.data.every((item) => item.estado === "archivado"));

  const porAlumno = await pedir("GET", "/api/v1/book-registry?alumnoId=alu-1", director);
  assert.equal(porAlumno.cuerpo.paginacion.total, 1);
  assert.equal(porAlumno.cuerpo.data[0].alumno, "Pérez López, Ana");

  const busqueda = await pedir("GET", "/api/v1/book-registry?q=medina", director);
  assert.ok(busqueda.cuerpo.data.some((item) => item.alumnoId === "alu-6"));
});

test("los filtros, el orden y la paginacion invalidos devuelven 422", async () => {
  const estado = await pedir("GET", "/api/v1/book-registry?estado=inventado", director);
  assert.equal(estado.status, 422);

  const rango = await pedir("GET", "/api/v1/book-registry?desde=2026-05-31&hasta=2026-05-01", director);
  assert.equal(rango.status, 422);
  assert.equal(rango.cuerpo.error.details[0].field, "desde");

  const fecha = await pedir("GET", "/api/v1/book-registry?desde=ayer", director);
  assert.equal(fecha.status, 422);

  const orden = await pedir("GET", "/api/v1/book-registry?orden=azar", director);
  assert.equal(orden.status, 422);

  const pagina = await pedir("GET", "/api/v1/book-registry?pagina=0", director);
  assert.equal(pagina.status, 422);

  const porPagina = await pedir("GET", "/api/v1/book-registry?porPagina=500", director);
  assert.equal(porPagina.status, 422);
});

test("la paginacion divide el resultado y respeta el orden", async () => {
  const { status, cuerpo } = await pedir("GET", "/api/v1/book-registry?pagina=1&porPagina=2&orden=libro", director);

  assert.equal(status, 200);
  assert.equal(cuerpo.data.length, 2);
  assert.equal(cuerpo.paginacion.pagina, 1);
  assert.equal(cuerpo.paginacion.porPagina, 2);
  assert.ok(cuerpo.paginacion.total > 2);
  assert.equal(cuerpo.paginacion.tieneSiguiente, true);
});

/* ---------------- Modificacion -------------------------------------------- */

test("modificar un registro conserva el estado anterior en el historial", async () => {
  const antes = await pedir("GET", "/api/v1/book-registry/lm-1", director);
  assert.equal(antes.cuerpo.data.historial.length, 0);

  const { status, cuerpo } = await pedir("PATCH", "/api/v1/book-registry/lm-1", secretaria, {
    numeroFolio: "36",
    fechaRegistro: "2026-03-10",
    estado: "archivado",
    datosAdicionales: { matricula: "2026-0001", observacion: "Folio corregido." }
  });

  assert.equal(status, 200);
  assert.equal(cuerpo.data.numeroFolio, "36");
  assert.equal(cuerpo.data.fechaRegistro, "2026-03-10");
  assert.equal(cuerpo.data.estado, "archivado");
  assert.equal(cuerpo.data.historial.length, 1);
  assert.equal(cuerpo.data.historial[0].numeroFolio, "34");
  assert.equal(cuerpo.data.historial[0].estado, "activo");
  assert.equal(cuerpo.data.historial[0].registradoPor, "usr_8");
  assert.ok(cuerpo.data.actualizadoPor);
});

test("no se puede reasignar un registro a otro alumno (422)", async () => {
  const { status, cuerpo } = await pedir("PATCH", "/api/v1/book-registry/lm-2", secretaria, {
    alumnoId: "alu-1"
  });

  assert.equal(status, 422);
  assert.equal(cuerpo.error.details[0].field, "alumnoId");
});

test("no se puede modificar a un libro y folio ya registrados (409)", async () => {
  const { status, cuerpo } = await pedir("PATCH", "/api/v1/book-registry/lm-2", secretaria, {
    numeroLibro: "16",
    numeroFolio: "01"
  });

  assert.equal(status, 409);
  assert.equal(cuerpo.error.code, "CONFLICT");
});

test("una modificacion sin cambios no altera el historial", async () => {
  const { status, cuerpo } = await pedir("PATCH", "/api/v1/book-registry/lm-2", secretaria, {
    numeroLibro: "12"
  });

  assert.equal(status, 200);
  assert.equal(cuerpo.data.historial.length, 0);
});

test("modificar un registro inexistente devuelve 404", async () => {
  const { status, cuerpo } = await pedir("PATCH", "/api/v1/book-registry/lm-999", secretaria, {
    numeroLibro: "1"
  });

  assert.equal(status, 404);
  assert.equal(cuerpo.error.code, "NOT_FOUND");
});

test("el historial de un registro conserva cada modificacion", async () => {
  await pedir("PATCH", "/api/v1/book-registry/lm-2", secretaria, { numeroFolio: "37", estado: "archivado" });

  const { status, cuerpo } = await pedir("GET", "/api/v1/book-registry/lm-2/historial", director);
  assert.equal(status, 200);
  assert.equal(cuerpo.data.id, "lm-2");
  assert.equal(cuerpo.data.total, cuerpo.data.historial.length);
  assert.ok(cuerpo.data.total >= 1);
  assert.equal(cuerpo.data.historial[0].numeroFolio, "35");
});

/* ---------------- Auditoria ----------------------------------------------- */

test("las altas y modificaciones quedan auditadas", async () => {
  const traza = bookRegistryRepository.listarAuditoria();
  const altas = traza.filter((entrada) => entrada.accion === "libro-matriz:create");
  const modificaciones = traza.filter((entrada) => entrada.accion === "libro-matriz:update");

  assert.ok(altas.length > 0);
  assert.ok(modificaciones.length > 0);
  assert.ok(altas.every((entrada) => entrada.entidad === "libro_matriz"));
  assert.ok(modificaciones.every((entrada) => entrada.actorId));
});

/* ---------------- Aislamiento de los datos de prueba ---------------------- */

test("el store del modulo se puede reiniciar sin tocar el resto", () => {
  bookRegistryRepository.resetData();
  assert.equal(bookRegistryRepository.listRegistries({}).length, 0);

  seedBookRegistry();
  assert.ok(bookRegistryRepository.listRegistries({}).length > 0);

  resetStore();
});
