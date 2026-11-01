import test from "node:test";
import assert from "node:assert/strict";

import { calcularMetricas, estadoCuatrimestre } from "./planilla-estructura.js";

test("aprobacion por cuatrimestre: TEA o 7 o mas aprueba; el resto desaprueba", () => {
  assert.equal(estadoCuatrimestre("TEA", ""), "aprobado");
  assert.equal(estadoCuatrimestre("", "7"), "aprobado");
  assert.equal(estadoCuatrimestre("", "10"), "aprobado");
  assert.equal(estadoCuatrimestre("", "6,99"), "desaprobado");
  assert.equal(estadoCuatrimestre("TEP", ""), "desaprobado");
  assert.equal(estadoCuatrimestre("TED", ""), "desaprobado");
  assert.equal(estadoCuatrimestre("TEP", "4"), "desaprobado");
  assert.equal(estadoCuatrimestre("TEA", "5"), "aprobado");
  assert.equal(estadoCuatrimestre("", ""), "sin_calificar");
});

test("metricas separadas por cuatrimestre", () => {
  const m = calcularMetricas([
    { v1: "TEA", c1: "8", v2: "TEP", c2: "5" },
    { v1: "TEP", c1: "4", v2: "", c2: "7" },
    { v1: "", c1: "", v2: "", c2: "" }
  ]);
  assert.equal(m.total, 3);
  assert.deepEqual([m.c1.aprobados, m.c1.desaprobados, m.c1.sinCalificar, m.c1.promedio], [1, 1, 1, "6"]);
  assert.deepEqual([m.c2.aprobados, m.c2.desaprobados, m.c2.sinCalificar, m.c2.promedio], [1, 1, 1, "6"]);
});
