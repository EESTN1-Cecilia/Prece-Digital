/* Calendario oficial: carga, importacion, duplicados, avisos, fechas y caida de la fuente.
   La red se simula con un fetch falso: NO se prueba contra el sitio real de abc.gob.ar. */

import assert from "node:assert/strict";
import test, { after, before, beforeEach } from "node:test";
import { createApp } from "../src/app.mjs";
import { apiRoutes } from "../routes/index.mjs";
import { resetStore } from "../database/memory-store.mjs";
import { seedDesarrollo } from "../database/seeds/index.mjs";
import service from "../modules/calendario/calendario.service.mjs";
import repo from "../modules/calendario/calendario.repository.mjs";
import { extraerEventos, extraerFechas } from "../modules/calendario/calendario.importador.mjs";
import { diasEntre, hoyEnBuenosAires, estadoTemporal } from "../modules/calendario/calendario.fechas.mjs";

const PUERTO = 4032;
const base = `http://127.0.0.1:${PUERTO}`;
let servidor;
before(async () => { servidor = createApp(apiRoutes); await new Promise((ok) => servidor.listen(PUERTO, ok)); });
after(async () => { await new Promise((ok) => servidor.close(ok)); });
beforeEach(async () => { resetStore(); await seedDesarrollo(); service.cargarIniciales(); });

async function pedir(ruta, { metodo = "GET", token, cuerpo } = {}) {
  const r = await fetch(`${base}${ruta}`, { method: metodo, headers: { ...(cuerpo ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: cuerpo ? JSON.stringify(cuerpo) : undefined });
  const t = await r.text();
  return { status: r.status, cuerpo: t ? JSON.parse(t) : null };
}
const login = async (email, password) => (await pedir("/api/v1/auth/login", { metodo: "POST", cuerpo: { email, password } })).cuerpo.accessToken;

const HTML = `<html><body><script>alert(1)</script><h1>Calendario escolar 2026</h1>
<p>Inicio de clases: 2 de marzo de 2026</p><p>Receso invernal: del 20 al 31 de julio</p><p>Finalización de clases: 22/12/2026</p>
<a href="/docs/res.pdf">Resolución</a><a href="https://malicioso.example/x.pdf">x</a></body></html>`;
const respuesta = (cuerpo, tipo = "text/html") => ({ ok: true, status: 200, url: "https://abc.gob.ar/calendario_escolar", headers: new Map([["content-type", tipo]]), arrayBuffer: async () => Buffer.from(cuerpo) });
const fetchCon = (cuerpo) => async (url) => (url.endsWith(".pdf") ? { ...respuesta("no pdf"), ok: false, status: 404 } : respuesta(cuerpo));
const opciones = (f) => ({ ejecutarFetch: f });

test("fechas: hoy en Buenos Aires no se corre por UTC y los dias restantes son exactos", () => {
  // 01:30 UTC del 3/3 son las 22:30 del 2/3 en Argentina.
  assert.equal(hoyEnBuenosAires(new Date("2026-03-03T01:30:00Z")), "2026-03-02");
  assert.equal(diasEntre("2026-03-02", "2026-03-02"), 0);
  assert.equal(diasEntre("2026-02-27", "2026-03-02"), 3);
  assert.equal(estadoTemporal({ fechaInicio: "2026-03-02" }, "2026-03-02"), "hoy");
  assert.equal(estadoTemporal({ fechaInicio: "2026-07-20", fechaFin: "2026-07-31" }, "2026-07-25"), "en_curso");
  assert.equal(estadoTemporal({ fechaInicio: "2026-03-02" }, "2026-03-03"), "finalizado");
});

test("el parser reconoce fechas y descarta otro anio o fechas imposibles", () => {
  assert.deepEqual(extraerFechas("del 20 al 31 de julio", 2026), ["2026-07-20", "2026-07-31"]);
  assert.deepEqual(extraerFechas("22/12/2026", 2026), ["2026-12-22", null]);
  assert.equal(extraerFechas("2 de marzo de 2025", 2026), null);
  assert.equal(extraerFechas("31 de febrero de 2026", 2026), null);
  const evs = extraerEventos("Inicio de clases: 2 de marzo. Receso invernal: del 20 al 31 de julio. Fin de clases 22/12/2026", 2026);
  assert.deepEqual(evs.map((e) => e.clave).sort(), ["fin-clases", "inicio-clases", "receso-invernal"]);
});

test("la carga inicial es idempotente y queda pendiente de verificacion", () => {
  const n = repo.todos().length;
  assert.ok(n > 10);
  assert.equal(service.cargarIniciales(), 0);
  assert.equal(repo.todos().length, n);
  assert.ok(repo.todos().every((e) => e.estadoVerificacion === "pendiente"));
});

test("importar guarda y verifica, y repetir no duplica", async () => {
  const antes = repo.todos().length;
  const r1 = await service.actualizarDesdeFuentes({ anio: 2026, opciones: opciones(fetchCon(HTML)) });
  assert.equal(r1.ok, true, JSON.stringify(r1));
  assert.equal(r1.confirmados, 3);
  const inicio = repo.buscar("pba-2026-inicio-clases");
  assert.equal(inicio.estadoVerificacion, "verificado");
  assert.equal(inicio.fechaInicio, "2026-03-02");
  const r2 = await service.actualizarDesdeFuentes({ anio: 2026, opciones: opciones(fetchCon(HTML)) });
  assert.equal(r2.sinCambios, 3);
  assert.equal(repo.todos().length, antes);
  assert.equal(repo.ultimaConsulta().ok, true);
});

test("un cambio de fecha actualiza el mismo evento y queda en el historial", async () => {
  await service.actualizarDesdeFuentes({ anio: 2026, opciones: opciones(fetchCon(HTML)) });
  const nuevo = HTML.replace("2 de marzo de 2026", "9 de marzo de 2026");
  const r = await service.actualizarDesdeFuentes({ anio: 2026, opciones: opciones(fetchCon(nuevo)) });
  assert.equal(r.actualizados, 1);
  assert.equal(repo.buscar("pba-2026-inicio-clases").fechaInicio, "2026-03-09");
  const h = repo.historial("pba-2026-inicio-clases");
  assert.equal(h.length, 1);
  assert.equal(h[0].antes.fechaInicio, "2026-03-02");
  assert.equal(repo.todos().filter((e) => e.clave === "inicio-clases").length, 1);
});

test("con la fuente caida o con otra estructura se conservan los datos y se registra el error", async () => {
  await service.actualizarDesdeFuentes({ anio: 2026, opciones: opciones(fetchCon(HTML)) });
  const antes = JSON.stringify(repo.todos());
  const caida = await service.actualizarDesdeFuentes({ anio: 2026, opciones: opciones(async () => { throw new Error("ECONNREFUSED"); }) });
  assert.equal(caida.ok, false);
  assert.match(caida.motivo, /no esta disponible/);
  const otra = await service.actualizarDesdeFuentes({ anio: 2026, opciones: opciones(fetchCon("<html><body>Sitio renovado sin fechas</body></html>")) });
  assert.equal(otra.ok, false);
  assert.match(otra.motivo, /estructura/);
  assert.equal(JSON.stringify(repo.todos()), antes);
  assert.equal(service.estado().alerta, true);
  assert.equal(service.estado().ultimaExitosa.ok, true);
});

test("no se descargan hosts que no son oficiales", async () => {
  const pedidos = [];
  const f = async (url) => { pedidos.push(url); return respuesta(HTML); };
  await service.actualizarDesdeFuentes({ anio: 2026, opciones: { ejecutarFetch: f } });
  assert.ok(!pedidos.some((u) => u.includes("malicioso.example")));
  const r = await service.actualizarDesdeFuentes({ anio: 2026, opciones: { ejecutarFetch: f, fuentes: [{ url: "https://otro.example/c" }] } });
  assert.equal(r.ok, false);
  assert.match(r.fuentes[0].error, /Host no permitido/);
});

test("los avisos salen solo de eventos verificados, priorizados, sin pasados", () => {
  assert.equal(service.avisos({ hoy: "2026-02-25" }).total, 0, "pendientes no avisan");
  service.verificar("pba-2026-inicio-clases");
  service.verificar("pba-2026-receso-invernal");
  service.verificar("pba-2026-fin-clases");
  service.verificar("pba-2026-feriado-trabajo");
  const a = service.avisos({ hoy: "2026-02-25" });
  assert.deepEqual(a.eventos.map((e) => e.clave), ["inicio-clases"]);
  assert.equal(a.eventos[0].diasParaInicio, 5);
  assert.equal(service.avisos({ hoy: "2026-03-02" }).eventos[0].estadoTemporal, "hoy");
  assert.equal(service.avisos({ hoy: "2026-03-03" }).total, 0, "el pasado no es proximo");
  const julio = service.avisos({ hoy: "2026-07-25" });
  assert.equal(julio.eventos[0].clave, "receso-invernal");
  assert.equal(julio.eventos[0].estadoTemporal, "en_curso");
  assert.equal(julio.eventos[0].diasParaFin, 6);
});

test("API: lectura para cualquier sesion, escritura solo con permiso, institucionales intactos", async () => {
  const admin = await login("admin@prece.local", "Admin123!");
  const docente = await login("docente@prece.local", "Docente123!");
  assert.equal((await pedir("/api/v1/calendario/eventos?anio=2026")).status, 401);
  const lista = await pedir("/api/v1/calendario/eventos?anio=2026", { token: docente });
  assert.equal(lista.status, 200);
  assert.ok(lista.cuerpo.data.length > 10);
  assert.equal((await pedir("/api/v1/calendario/actualizar", { metodo: "POST", token: docente, cuerpo: {} })).status, 403);

  const creado = await pedir("/api/v1/calendario/eventos", { metodo: "POST", token: admin, cuerpo: { titulo: "Acto del 25 de Mayo", fechaInicio: "2026-05-22", categoria: "jornada" } });
  assert.equal(creado.status, 201, JSON.stringify(creado.cuerpo));
  const id = creado.cuerpo.data.id;
  const invalido = await pedir("/api/v1/calendario/eventos", { metodo: "POST", token: admin, cuerpo: { titulo: "", fechaInicio: "2026-13-40" } });
  assert.equal(invalido.status, 422);

  // La actualizacion automatica no toca ni borra lo institucional.
  await service.actualizarDesdeFuentes({ anio: 2026, opciones: opciones(fetchCon(HTML)) });
  assert.ok(repo.buscar(id));
  // Lo oficial no se edita ni se borra a mano.
  assert.equal((await pedir("/api/v1/calendario/eventos/pba-2026-inicio-clases", { metodo: "DELETE", token: admin })).status, 403);
  assert.equal((await pedir(`/api/v1/calendario/eventos/${id}`, { metodo: "DELETE", token: admin })).status, 200);
  const manual = await pedir("/api/v1/calendario/actualizar", { metodo: "POST", token: admin, cuerpo: { anio: 2026 } });
  assert.equal(manual.status, 200);
});
