/* Nombres legibles de los roles en Mobile.
   El catalogo es el compartido (Shared/src/domain.mjs): Mobile no inventa
   etiquetas propias. */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { nombreDeRol, nombresDeRol } from "../src/utils/roles.js";

describe("roles del catalogo compartido", () => {
  it("muestra el nombre visible de Jefatura de Area", () => {
    assert.equal(nombreDeRol("jefe_area"), "Jefatura de Área");
  });

  it("traduce los roles del personal", () => {
    assert.equal(nombreDeRol("admin"), "Administrador");
    assert.equal(nombreDeRol("director"), "Direccion");
    assert.equal(nombreDeRol("preceptor"), "Preceptoria");
    assert.equal(nombreDeRol("docente"), "Docente");
    assert.equal(nombreDeRol("server"), "Responsable de Server");
  });

  it("un codigo fuera del catalogo se muestra tal cual", () => {
    assert.equal(nombreDeRol("supervisor"), "supervisor");
    assert.equal(nombreDeRol(""), "");
  });

  it("acepta objetos normalizados y listas", () => {
    assert.deepEqual(nombresDeRol(["jefe_area", "docente"]), ["Jefatura de Área", "Docente"]);
    assert.deepEqual(nombresDeRol([{ id: "admin" }]), ["Administrador"]);
    assert.deepEqual(nombresDeRol([]), []);
  });
});
