import assert from "node:assert/strict";
import test from "node:test";
import {
  desdeDocente,
  formularioSucio,
  formularioVacio,
  iniciales,
  opcionDesdeOrden,
  ordenAParametro,
  ordenDesdeOpcion,
  separarEspecialidades,
  tonoAvatar,
  validarDocente
} from "./docentes-validacion.js";

const VALIDO = {
  ...formularioVacio(),
  nombre: " Ana ",
  apellido: "Paz",
  documento: "30111222",
  email: "ana.paz@prece.local",
  especialidades: "Física, Química, Física"
};

test("un formulario completo no tiene errores y arma el cuerpo de la API", () => {
  const { errores, datos } = validarDocente(VALIDO, { areasValidas: ["docencia"] });
  assert.deepEqual(errores, {});
  assert.equal(datos.nombre, "Ana");
  assert.deepEqual(datos.especialidades, ["Física", "Química"]);
  assert.equal(datos.telefono, null);
  assert.equal(datos.area, null);
});

test("valida obligatorios y formatos de documento, email, telefono y area", () => {
  const { errores } = validarDocente(
    { ...formularioVacio(), documento: "12.345", email: "sin-arroba", telefono: "abc", area: "inventada" },
    { areasValidas: ["docencia"] }
  );
  assert.ok(errores.nombre);
  assert.ok(errores.apellido);
  assert.ok(errores.documento);
  assert.ok(errores.email);
  assert.ok(errores.telefono);
  assert.ok(errores.area);
});

test("en edicion solo envia los campos que cambiaron", () => {
  const docente = {
    nombre: "Ana", apellido: "Paz", tipoDocumento: "dni", documento: "30111222",
    email: "ana.paz@prece.local", telefono: null, area: "docencia", titulo: null,
    especialidades: ["Física"], estado: "activo"
  };
  const original = desdeDocente(docente);
  assert.equal(formularioSucio(original, original), false);

  const editado = { ...original, telefono: "11 5555-0000", especialidades: "Física, Química" };
  assert.equal(formularioSucio(editado, original), true);

  const { errores, datos } = validarDocente(editado, { original });
  assert.deepEqual(errores, {});
  assert.deepEqual(datos, { telefono: "11 5555-0000", especialidades: ["Física", "Química"] });
});

test("traduce el orden de la tabla al parametro del backend", () => {
  assert.equal(ordenAParametro(null), "apellido");
  assert.equal(ordenAParametro({ columna: "documento", direccion: "desc" }), "documento_desc");
  assert.equal(ordenAParametro({ columna: "materias", direccion: "asc" }), "apellido");
  assert.deepEqual(ordenDesdeOpcion("area:asc"), { columna: "area", direccion: "asc" });
  assert.equal(opcionDesdeOrden({ columna: "docente", direccion: "desc" }), "docente:desc");
  assert.equal(opcionDesdeOrden({ columna: null }), "");
  assert.equal(opcionDesdeOrden({ columna: "docente", direccion: "asc" }), "");
  assert.deepEqual(ordenDesdeOpcion(""), { columna: "docente", direccion: "asc" });
});

test("avatar: iniciales y tono estable", () => {
  assert.equal(iniciales({ nombre: "maría", apellido: "Villatoro" }), "MV");
  assert.equal(iniciales({}), "?");
  assert.equal(tonoAvatar("tch-1"), tonoAvatar("tch-1"));
  assert.deepEqual(separarEspecialidades(" , a ,b,"), ["a", "b"]);
});
