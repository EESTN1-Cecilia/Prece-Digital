/* Roles que la pantalla de Direccion ofrece al crear o editar perfiles.
   node --test src */

import assert from "node:assert/strict";
import test from "node:test";
import { ROLES_DISPONIBLES } from "./director-service.js";

test("el alta ofrece Jefatura de Area con su identificador interno", () => {
  const jefe = ROLES_DISPONIBLES.find((rol) => rol.id === "jefe_area");

  assert.ok(jefe, "jefe_area debe estar entre los roles asignables");
  assert.equal(jefe.nombre, "Jefatura de Área");
  assert.ok(jefe.descripcion.length > 0);
  assert.ok(jefe.color);
});

test("los demas roles se mantienen y server sigue fuera de la gestion", () => {
  const ids = ROLES_DISPONIBLES.map((rol) => rol.id);

  for (const esperado of ["admin", "director", "secretario", "preceptor", "docente"]) {
    assert.ok(ids.includes(esperado), `falta el rol ${esperado}`);
  }

  assert.ok(!ids.includes("server"), "server no se administra desde Direccion");
});
