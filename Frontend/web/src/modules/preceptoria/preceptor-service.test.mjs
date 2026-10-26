import assert from "node:assert/strict";
import test from "node:test";
import {
  agruparAulasPorPlanta,
  calcularResumen,
  calcularResumenAulas,
  claseDeAula,
  estadoDesdeTecla,
  etiquetaEstado,
  formatearFechaCorta,
  formatearFechaLarga,
  textoAula
} from "./preceptor-service.js";

test("traduce las teclas P, A y T al estado de asistencia", () => {
  assert.equal(estadoDesdeTecla("P"), "presente");
  assert.equal(estadoDesdeTecla("a"), "ausente");
  assert.equal(estadoDesdeTecla(" T "), "tarde");
  assert.equal(estadoDesdeTecla("x"), null);
  assert.equal(etiquetaEstado("tarde"), "Tarde");
  assert.equal(etiquetaEstado(null), "Sin registrar");
});

test("calcula el resumen de asistencia del curso", () => {
  const resumen = calcularResumen([
    { asistencia: { estado: "presente" } },
    { asistencia: { estado: "presente" } },
    { asistencia: { estado: "ausente" } },
    { asistencia: { estado: "tarde" } },
    { asistencia: null }
  ]);

  assert.deepEqual(resumen, {
    total: 5,
    presentes: 2,
    ausentes: 1,
    tarde: 1,
    sinRegistrar: 1
  });
});

test("calcula y agrupa el estado de las aulas por planta", () => {
  const aulas = [
    { id: "1", planta: "Planta baja", estado: "ocupada" },
    { id: "2", planta: "Planta baja", estado: "libre" },
    { id: "3", planta: "Planta alta", estado: "mantenimiento" }
  ];

  assert.deepEqual(calcularResumenAulas(aulas), {
    total: 3,
    ocupadas: 1,
    libres: 1,
    mantenimiento: 1
  });

  const grupos = agruparAulasPorPlanta(aulas);
  assert.equal(grupos.length, 2);
  assert.deepEqual(grupos[0], { planta: "Planta baja", aulas: [aulas[0], aulas[1]] });
});

test("describe el aula segun su estado y proxima clase", () => {
  assert.equal(textoAula({ estado: "mantenimiento" }), "Fuera de servicio");
  assert.equal(
    textoAula({ estado: "ocupada", claseActual: { materia: "Matematica", curso: "1\u00b0 1" } }),
    "Matematica - 1\u00b0 1"
  );
  assert.equal(
    textoAula({ estado: "libre", proximaClase: { desde: "14:00", materia: "Lengua" } }),
    "Proxima: 14:00 - Lengua"
  );
  assert.equal(textoAula({ estado: "libre" }), "Disponible");
  assert.equal(
    claseDeAula({ proximaClase: { id: "x" }, claseActual: null }).id,
    "x"
  );
});

test("formatea fechas para la cabecera y la tabla", () => {
  assert.equal(formatearFechaCorta("2026-10-22"), "22/10/2026");
  assert.equal(formatearFechaCorta(""), "-");
  assert.match(formatearFechaLarga("2026-10-22"), /Jueves/);
});
