import assert from "node:assert/strict";
import test from "node:test";
import { agruparAgenda, claveDeAviso, estadoTemporal, eventosDelDia, formatoFecha, hoyEnBuenosAires, semanasDelMes, sumarMeses, textoDias, textoPeriodo } from "./calendario-datos.js";

const ev = (id, i, f = null, extra = {}) => ({ id, titulo: id, fechaInicio: i, fechaFin: f, estadoVerificacion: "verificado", ...extra });

test("hoy se calcula en Buenos Aires, sin corrimiento por UTC", () => {
  assert.equal(hoyEnBuenosAires(new Date("2026-03-03T01:30:00Z")), "2026-03-02");
  assert.equal(hoyEnBuenosAires(new Date("2026-03-02T03:00:00Z")), "2026-03-02");
});

test("la grilla de marzo 2026 arranca lunes 23/2 y tiene 6 semanas", () => {
  const s = semanasDelMes(2026, 3);
  assert.equal(s[0][0].iso, "2026-02-23");
  assert.equal(s[0][6].iso, "2026-03-01");
  assert.equal(s[1][0].iso, "2026-03-02");
  assert.equal(s.length, 6);
  assert.ok(s.every((w) => w.length === 7));
  assert.equal(s.flat().filter((c) => c.delMes).length, 31);
});

test("selector de meses: pasa de diciembre a enero y vuelve", () => {
  assert.deepEqual(sumarMeses(2026, 12, 1), { anio: 2027, mes: 1 });
  assert.deepEqual(sumarMeses(2026, 1, -1), { anio: 2025, mes: 12 });
  assert.deepEqual(sumarMeses(2026, 5, 0), { anio: 2026, mes: 5 });
});

test("contador de dias y estados", () => {
  const inicio = ev("a", "2026-03-02");
  assert.equal(textoDias(inicio, "2026-02-25"), "Faltan 5 días");
  assert.equal(textoDias(inicio, "2026-03-01"), "Es mañana");
  assert.equal(textoDias(inicio, "2026-03-02"), "Es hoy");
  assert.equal(textoDias(inicio, "2026-03-03"), "Finalizado");
  const receso = ev("r", "2026-07-20", "2026-07-31");
  assert.equal(textoDias(receso, "2026-07-25"), "En curso · termina en 6 días");
  assert.equal(textoDias(receso, "2026-07-31"), "Último día");
  assert.equal(estadoTemporal(receso, "2026-08-01"), "finalizado");
});

test("un evento pasado no figura como proximo y lo pendiente va aparte", () => {
  const lista = [ev("pasado", "2026-03-02"), ev("prox", "2026-12-22"), ev("pend", "2026-12-08", null, { estadoVerificacion: "pendiente" })];
  const g = agruparAgenda(lista, "2026-11-01");
  assert.deepEqual(g.proximos.map((e) => e.id), ["prox"]);
  assert.deepEqual(g.pendientes.map((e) => e.id), ["pend"]);
  assert.deepEqual(g.finalizados.map((e) => e.id), ["pasado"]);
});

test("dias con eventos de un solo dia y de periodo", () => {
  const lista = [ev("a", "2026-07-20", "2026-07-31"), ev("b", "2026-07-25")];
  assert.deepEqual(eventosDelDia(lista, "2026-07-25").map((e) => e.id), ["a", "b"]);
  assert.deepEqual(eventosDelDia(lista, "2026-08-01"), []);
});

test("textos de fecha en espanol", () => {
  assert.equal(formatoFecha("2026-03-02"), "lunes 2 de marzo de 2026");
  assert.equal(textoPeriodo(ev("r", "2026-07-20", "2026-07-31")), "Del 20 al 31 de julio de 2026");
  assert.equal(textoPeriodo(ev("r", "2026-06-29", "2026-07-03")), "Del 29 de junio al 3 de julio de 2026");
});

test("el aviso solo se repite al pasar a una etapa mas cercana", () => {
  const e = ev("a", "2026-03-10");
  const claves = ["2026-02-24", "2026-03-05", "2026-03-08", "2026-03-09", "2026-03-10"].map((h) => claveDeAviso(e, h));
  assert.equal(new Set(claves).size, 5);
  assert.equal(claveDeAviso(e, "2026-02-24"), claveDeAviso(e, "2026-02-27"));
});
