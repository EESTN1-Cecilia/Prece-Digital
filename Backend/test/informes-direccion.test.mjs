import assert from "node:assert/strict";
import test from "node:test";
import * as service from "../modules/director/informes-direccion.service.mjs";

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

