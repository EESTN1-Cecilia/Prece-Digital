import assert from "node:assert/strict";
import test from "node:test";
import { Readable } from "node:stream";
import * as service from "../modules/director/informes-direccion.service.mjs";
import { soloDireccion, soloPersonal } from "../modules/director/informes-direccion.middleware.mjs";
import { readJsonBody } from "../utils/read-body.mjs";

test("los informes iniciales de direccion incluyen comunicados para preceptores y para ambos", () => {
  const todos = service.listarInformes();
  assert.ok(todos.length >= 2, "debe haber al menos 2 informes iniciales");

  const paraPreceptores = service.listarInformes({ destinatario: "preceptores" });
  assert.ok(paraPreceptores.length >= 2, "los destinatarios preceptores y ambos deben aparecer para preceptoría");
  assert.ok(paraPreceptores.every((inf) => inf.destinatarios === "preceptores" || inf.destinatarios === "ambos"));

  const paraAlumnos = service.listarInformes({ destinatario: "alumnos" });
  assert.ok(paraAlumnos.length >= 1, "el comunicado institucional para ambos debe aparecer para alumnos");
  assert.ok(paraAlumnos.every((inf) => inf.destinatarios === "alumnos" || inf.destinatarios === "ambos"));
});

test("crear un nuevo informe lo agrega en la lista y filtra por su destinatario", () => {
  const nuevo = service.crearInforme({
    titulo: "Aviso Especial Alumnos",
    texto: "Texto para estudiantes",
    destinatarios: "alumnos"
  }, { nombre: "Director", apellido: "Test" });

  assert.ok(nuevo.id);
  assert.equal(nuevo.titulo, "Aviso Especial Alumnos");
  assert.equal(nuevo.autor, "Director Test");

  const paraAlumnos = service.listarInformes({ destinatario: "alumnos" });
  assert.ok(paraAlumnos.some((i) => i.id === nuevo.id));

  const paraPreceptores = service.listarInformes({ destinatario: "preceptores" });
  assert.ok(!paraPreceptores.some((i) => i.id === nuevo.id), "un informe exclusivo de alumnos no debe llegar a preceptoria");

  // Limpiar
  service.eliminarInforme(nuevo.id);
});

test("un informe para alumnos aparece en las novedades del alumno; uno solo para preceptores, no", () => {
  const paraAlumnos = service.crearInforme({ titulo: "Mesas de examen", texto: "Fechas de mesas", destinatarios: "alumnos" });
  const paraAmbos = service.crearInforme({ titulo: "Aviso general", texto: "Para todos", destinatarios: "ambos" });
  const soloPreceptores = service.crearInforme({ titulo: "Interno", texto: "Solo preceptoría", destinatarios: "preceptores" });

  const novedades = service.listarParaAlumnos();
  assert.ok(novedades.some((i) => i.id === paraAlumnos.id));
  assert.ok(novedades.some((i) => i.id === paraAmbos.id));
  assert.ok(!novedades.some((i) => i.id === soloPreceptores.id), "lo de preceptores no debe filtrarse al alumno");

  for (const informe of [paraAlumnos, paraAmbos, soloPreceptores]) service.eliminarInforme(informe.id);
  assert.ok(!service.listarParaAlumnos().some((i) => i.id === paraAlumnos.id), "al eliminarlo desaparece de las novedades");
});

test("las listas no exponen el contenido del adjunto y el alumno lo baja solo si le corresponde", () => {
  const dataUrl = `data:application/pdf;base64,${Buffer.from("contenido").toString("base64")}`;
  const conArchivo = service.crearInforme({
    titulo: "Con adjunto",
    texto: "Mirá el PDF",
    destinatarios: "alumnos",
    archivo: { nombre: "aviso.pdf", tipo: "application/pdf", tamano: 9, dataUrl }
  });
  const internoConArchivo = service.crearInforme({
    titulo: "Interno con adjunto",
    texto: "Solo preceptoría",
    destinatarios: "preceptores",
    archivo: { nombre: "interno.pdf", tipo: "application/pdf", tamano: 9, dataUrl }
  });

  assert.equal(conArchivo.archivo.nombre, "aviso.pdf");
  assert.equal(conArchivo.archivo.descargable, true);
  assert.ok(!("dataUrl" in conArchivo.archivo), "la lista no debe traer el contenido");
  assert.ok(!JSON.stringify(service.listarParaAlumnos()).includes("base64"));

  const bajado = service.obtenerArchivo(conArchivo.id, { destinatario: "alumnos" });
  assert.equal(bajado.nombre, "aviso.pdf");
  assert.equal(bajado.dataUrl, dataUrl);

  assert.throws(() => service.obtenerArchivo(internoConArchivo.id, { destinatario: "alumnos" }), { code: "NOT_FOUND" });
  assert.throws(() => service.obtenerArchivo("inf-1", { destinatario: "alumnos" }), { code: "NOT_FOUND" }, "los adjuntos de ejemplo no tienen contenido");

  service.eliminarInforme(conArchivo.id);
  service.eliminarInforme(internoConArchivo.id);
});

test("crear un informe valida texto, destinatarios, fecha y adjunto", () => {
  assert.throws(() => service.crearInforme({ texto: "   " }), { code: "VALIDATION_ERROR" });
  assert.throws(() => service.crearInforme({ texto: "hola", destinatarios: "todos" }), { code: "VALIDATION_ERROR" });
  assert.throws(() => service.crearInforme({ texto: "hola", fecha: "ayer" }), { code: "VALIDATION_ERROR" });
  assert.throws(() => service.crearInforme({ texto: "x".repeat(service.MAX_TEXTO + 1) }), { code: "VALIDATION_ERROR" });
  assert.throws(
    () => service.crearInforme({ texto: "hola", archivo: { nombre: "virus.exe", tipo: "application/x-msdownload", dataUrl: "data:application/x-msdownload;base64,AAAA" } }),
    { code: "VALIDATION_ERROR" }
  );
  const grande = `data:application/pdf;base64,${"A".repeat(Math.ceil((service.MAX_ARCHIVO_BYTES * 4) / 3) + 8)}`;
  assert.throws(() => service.crearInforme({ texto: "hola", archivo: { nombre: "grande.pdf", tipo: "application/pdf", dataUrl: grande } }), { code: "VALIDATION_ERROR" });
});

test("un adjunto de exactamente 5 MB se acepta (el relleno del base64 no cuenta como tamaño)", () => {
  const dataUrl = `data:application/pdf;base64,${Buffer.alloc(service.MAX_ARCHIVO_BYTES, 65).toString("base64")}`;
  const informe = service.crearInforme({ texto: "justo", archivo: { nombre: "justo.pdf", tipo: "application/pdf", dataUrl } });
  assert.equal(informe.archivo.tamano, service.MAX_ARCHIVO_BYTES);
  service.eliminarInforme(informe.id);
});

test("el autor del informe sale de la sesion, no del cuerpo", () => {
  const informe = service.crearInforme({ texto: "hola", autor: "Otra Persona" }, { nombre: "Ana", apellido: "Directora" });
  assert.equal(informe.autor, "Ana Directora");
  service.eliminarInforme(informe.id);
});

test("solo el director emite informes y un alumno no ve el listado del personal", async () => {
  const como = (...roles) => ({ user: { assignments: roles.map((role) => ({ role })) } });

  await assert.doesNotReject(() => soloDireccion(como("director")));
  await assert.doesNotReject(() => soloDireccion(como("admin")));
  await assert.rejects(() => soloDireccion(como("alumno")), { code: "FORBIDDEN" });
  await assert.rejects(() => soloDireccion(como("preceptor")), { code: "FORBIDDEN" });

  await assert.doesNotReject(() => soloPersonal(como("preceptor")));
  await assert.doesNotReject(() => soloPersonal(como("director")));
  await assert.rejects(() => soloPersonal(como("alumno")), { code: "FORBIDDEN" });
});

test("readJsonBody respeta un limite propio por ruta y mantiene el general de 1 MB", async () => {
  const pedido = (texto) => Object.assign(Readable.from([Buffer.from(texto)]), { headers: { "content-type": "application/json" } });
  const cuerpo = JSON.stringify({ relleno: "a".repeat(1.5 * 1024 * 1024) });

  await assert.rejects(() => readJsonBody(pedido(cuerpo)), { code: "PAYLOAD_TOO_LARGE" });
  const leido = await readJsonBody(pedido(cuerpo), { maxBytes: service.MAX_BODY_INFORME_BYTES });
  assert.equal(leido.relleno.length, 1.5 * 1024 * 1024);
});
