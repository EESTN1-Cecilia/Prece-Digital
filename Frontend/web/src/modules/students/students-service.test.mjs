import test from "node:test";
import assert from "node:assert/strict";

import { formatDni, formatLegajo, obtenerLibroFolioLegajo } from "./students-service.js";

test("formatDni formatea adecuadamente números de DNI de 7 y 8 dígitos", () => {
  assert.equal(formatDni("45123456"), "45.123.456");
  assert.equal(formatDni("8123456"), "8.123.456");
  assert.equal(formatDni(45123456), "45.123.456");
});

test("obtenerLibroFolioLegajo devuelve formato libro-folio-legajo", () => {
  const info = obtenerLibroFolioLegajo({
    id: "alu-12",
    libro: "2026",
    folio: "05",
    legajo: "1234"
  });

  assert.equal(info.libro, "2026");
  assert.equal(info.folio, "05");
  assert.equal(info.numLegajo, "1234");
  assert.equal(info.legajoFormateado, "(2026-05-1234)");
  assert.equal(formatLegajo({ id: "alu-12", libro: "2026", folio: "05", legajo: "1234" }), "(2026-05-1234)");
});
