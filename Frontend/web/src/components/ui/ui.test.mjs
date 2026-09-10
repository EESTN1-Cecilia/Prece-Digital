/* Chequeo de la logica pura de la biblioteca compartida: node --test src */

import assert from "node:assert/strict";
import test from "node:test";
import { paginasVisibles } from "./paginacion.js";
import { ordenarFilas, siguienteOrden } from "./tabla.js";
import { fecha, fechaCorta, textoOGuion } from "../../utils/formato.js";

test("paginasVisibles muestra todas las paginas cuando entran", () => {
  assert.deepEqual(paginasVisibles(1, 5), [1, 2, 3, 4, 5]);
  assert.deepEqual(paginasVisibles(3, 1), [1]);
  assert.deepEqual(paginasVisibles(1, 0), []);
});

test("paginasVisibles corta con puntos suspensivos y conserva los extremos", () => {
  const centro = paginasVisibles(10, 20);

  assert.equal(centro[0], 1);
  assert.equal(centro[centro.length - 1], 20);
  assert.ok(centro.includes(10), "la pagina actual siempre esta");
  assert.ok(centro.includes("…"), "hay al menos un corte");
  assert.ok(centro.length <= 7, "la ventana no supera el maximo");
});

test("paginasVisibles no deja huecos falsos junto a los extremos", () => {
  /* Con la pagina 2 no corresponde cortar entre el 1 y el 2. */
  const inicio = paginasVisibles(2, 20);
  assert.deepEqual(inicio.slice(0, 3), [1, 2, 3]);

  const fin = paginasVisibles(19, 20);
  assert.deepEqual(fin.slice(-3), [18, 19, 20]);
});

const columnas = [
  { id: "nombre", titulo: "Nombre" },
  { id: "edad", titulo: "Edad" },
  { id: "rol", titulo: "Rol", valor: (fila) => fila.rol?.nombre }
];

const filas = [
  { id: 1, nombre: "Beatriz", edad: 30, rol: { nombre: "Docencia" } },
  { id: 2, nombre: "alvaro", edad: 9, rol: { nombre: "Preceptoria" } },
  { id: 3, nombre: "Carlos", edad: null, rol: { nombre: "Direccion" } }
];

test("ordenarFilas ordena texto sin distinguir mayusculas", () => {
  const orden = ordenarFilas(filas, { columna: "nombre", direccion: "asc" }, columnas);
  assert.deepEqual(
    orden.map((fila) => fila.nombre),
    ["alvaro", "Beatriz", "Carlos"]
  );
});

test("ordenarFilas compara numeros como numeros", () => {
  const orden = ordenarFilas(filas, { columna: "edad", direccion: "asc" }, columnas);
  assert.deepEqual(
    orden.map((fila) => fila.edad),
    [9, 30, null]
  );
});

test("ordenarFilas manda los vacios al final en cualquier direccion", () => {
  const descendente = ordenarFilas(filas, { columna: "edad", direccion: "desc" }, columnas);
  assert.equal(descendente[descendente.length - 1].edad, null);
});

test("ordenarFilas usa la clave declarada por la columna", () => {
  const orden = ordenarFilas(filas, { columna: "rol", direccion: "asc" }, columnas);
  assert.deepEqual(
    orden.map((fila) => fila.rol.nombre),
    ["Direccion", "Docencia", "Preceptoria"]
  );
});

test("ordenarFilas no toca el arreglo original ni ordena sin criterio", () => {
  const copia = [...filas];
  ordenarFilas(filas, { columna: "nombre", direccion: "asc" }, columnas);
  assert.deepEqual(filas, copia, "el arreglo de entrada no se modifica");
  assert.equal(ordenarFilas(filas, null, columnas), filas);
  assert.equal(ordenarFilas(filas, { columna: "inexistente" }, columnas), filas);
});

test("siguienteOrden alterna ascendente, descendente y sin orden", () => {
  const primero = siguienteOrden(null, "nombre");
  assert.deepEqual(primero, { columna: "nombre", direccion: "asc" });

  const segundo = siguienteOrden(primero, "nombre");
  assert.deepEqual(segundo, { columna: "nombre", direccion: "desc" });

  const tercero = siguienteOrden(segundo, "nombre");
  assert.deepEqual(tercero, { columna: null, direccion: null });

  /* Cambiar de columna arranca de nuevo en ascendente. */
  assert.deepEqual(siguienteOrden(segundo, "edad"), { columna: "edad", direccion: "asc" });
});

test("fecha tolera valores vacios e invalidos sin romper la vista", () => {
  assert.equal(fecha(null), "—");
  assert.equal(fecha(""), "—");
  assert.equal(fecha("no es una fecha"), "no es una fecha");
  assert.match(fecha("2026-09-02T18:05:00"), /02\/09\/2026/);
  assert.match(fechaCorta("2026-09-02T18:05:00"), /^02\/09\/2026$/);
});

test("textoOGuion completa los campos sin dato", () => {
  assert.equal(textoOGuion(null), "—");
  assert.equal(textoOGuion(""), "—");
  assert.equal(textoOGuion(0), 0);
  assert.equal(textoOGuion("Ana"), "Ana");
});
