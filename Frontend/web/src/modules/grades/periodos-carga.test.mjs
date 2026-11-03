import assert from "node:assert/strict";
import test from "node:test";
import { bloqueosDe, enumerar, ignoraBloqueo, periodosBloqueados } from "./periodos-carga.js";

const estado = {
  anio: 2026,
  periodos: [
    { id: "cuatrimestre1", nombre: "1° cuatrimestre", habilitado: false },
    { id: "cuatrimestre2", nombre: "2° cuatrimestre", habilitado: true },
    { id: "diciembre", nombre: "Intensificación de diciembre", habilitado: true },
    { id: "febrero", nombre: "Intensificación de febrero", habilitado: false }
  ]
};

test("el docente ve bloqueados los periodos que la Direccion cerro", () => {
  assert.deepEqual(bloqueosDe(estado, [{ role: "docente" }]), {
    cuatrimestre1: true,
    cuatrimestre2: false,
    diciembre: false,
    febrero: true
  });
});

test("admin y director no tienen periodos bloqueados", () => {
  assert.equal(ignoraBloqueo([{ role: "director" }]), true);
  assert.equal(ignoraBloqueo(["admin"]), true);
  assert.equal(ignoraBloqueo([{ id: "preceptor" }]), false);
  assert.ok(Object.values(bloqueosDe(estado, [{ role: "director" }])).every((bloqueado) => bloqueado === false));
});

test("sin estado cargado no se bloquea nada (el backend decide)", () => {
  assert.ok(Object.values(bloqueosDe(null, [{ role: "docente" }])).every((bloqueado) => bloqueado === false));
});

test("arma el aviso con los nombres de los periodos bloqueados", () => {
  assert.equal(enumerar(periodosBloqueados(estado)), "1° cuatrimestre y Intensificación de febrero");
  assert.equal(enumerar(["a", "b", "c"]), "a, b y c");
  assert.equal(enumerar([]), "");
});
