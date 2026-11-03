import assert from "node:assert/strict";
import test from "node:test";
import {
  alternarGrupo,
  asignarRango,
  construirAsignacion,
  cortePorMitad,
  dividirEquilibrado,
  dividirPorCorte,
  generoDe,
  ordenarAlumnos,
  resumirGrupos
} from "./talleres-division.js";

function curso(mujeres, varones, sinDato = 0) {
  const alumnos = [];
  let n = 0;
  const agregar = (cantidad, genero) => {
    for (let i = 0; i < cantidad; i += 1) {
      n += 1;
      alumnos.push({ id: `a${n}`, apellido: `Apellido${String(n).padStart(2, "0")}`, nombre: "Nombre", genero });
    }
  };
  agregar(mujeres, "Femenino");
  agregar(varones, "Masculino");
  agregar(sinDato, null);
  return alumnos;
}

test("reconoce el genero escrito de distintas formas", () => {
  assert.equal(generoDe("Femenino"), "F");
  assert.equal(generoDe("F"), "F");
  assert.equal(generoDe("mujer"), "F");
  assert.equal(generoDe("Masculino"), "M");
  assert.equal(generoDe("varón"), "M");
  assert.equal(generoDe(null), "X");
  assert.equal(generoDe("No especificado"), "X");
});

test("ordena por apellido y nombre ignorando tildes y mayusculas", () => {
  const lista = [
    { id: "1", apellido: "Zárate", nombre: "Ana" },
    { id: "2", apellido: "alvarez", nombre: "Luis" },
    { id: "3", apellido: "Álvarez", nombre: "Abel" }
  ];
  assert.deepEqual(ordenarAlumnos(lista).map((a) => a.id), ["3", "2", "1"]);
});

test("el reparto equilibrado deja grupos parejos en total y por genero", () => {
  for (const [mujeres, varones, sin] of [[10, 22, 0], [15, 17, 1], [7, 9, 0], [1, 0, 0], [0, 0, 0], [13, 12, 3]]) {
    const alumnos = curso(mujeres, varones, sin);
    const resumen = resumirGrupos(alumnos, dividirEquilibrado(alumnos));

    assert.equal(resumen.A.total + resumen.B.total, alumnos.length);
    assert.ok(Math.abs(resumen.A.total - resumen.B.total) <= 1, `total ${mujeres}/${varones}/${sin}`);
    assert.ok(Math.abs(resumen.A.F - resumen.B.F) <= 1, `mujeres ${mujeres}/${varones}/${sin}`);
    assert.ok(Math.abs(resumen.A.M - resumen.B.M) <= 1, `varones ${mujeres}/${varones}/${sin}`);
  }
});

test("el corte manda los primeros al grupo A y el resto al B", () => {
  const alumnos = curso(4, 4);
  const asignacion = dividirPorCorte(alumnos, 3);
  const ordenados = ordenarAlumnos(alumnos);

  assert.deepEqual(ordenados.map((a) => asignacion[a.id]), ["A", "A", "A", "B", "B", "B", "B", "B"]);
  assert.equal(cortePorMitad(33), 17);
  assert.equal(cortePorMitad(32), 16);
});

test("el corte se acota a la cantidad de alumnos", () => {
  const alumnos = curso(2, 2);
  assert.ok(Object.values(dividirPorCorte(alumnos, 99)).every((grupo) => grupo === "A"));
  assert.ok(Object.values(dividirPorCorte(alumnos, -5)).every((grupo) => grupo === "B"));
});

test("asigna un rango entre dos puntos, sin importar el orden", () => {
  const alumnos = curso(3, 3);
  const base = dividirPorCorte(alumnos, 6);
  const ordenados = ordenarAlumnos(alumnos);

  const directo = asignarRango(base, alumnos, 1, 3, "B");
  const invertido = asignarRango(base, alumnos, 3, 1, "B");

  assert.deepEqual(directo, invertido);
  assert.deepEqual(ordenados.map((a) => directo[a.id]), ["A", "B", "B", "B", "A", "A"]);
  assert.equal(base[ordenados[1].id], "A", "no modifica la asignacion original");
});

test("alterna el grupo de un alumno", () => {
  const asignacion = alternarGrupo({ a1: "A" }, "a1");
  assert.equal(asignacion.a1, "B");
  assert.equal(alternarGrupo(asignacion, "a1").a1, "A");
});

test("los cambios manuales pisan la base y los alumnos que ya no estan se descartan", () => {
  const alumnos = curso(2, 2);
  const asignacion = construirAsignacion({
    alumnos,
    modo: "corte",
    corte: 2,
    manual: { a1: "B", fantasma: "A", a2: "Z" }
  });

  assert.equal(asignacion.a1, "B");
  assert.equal(asignacion.a2, "A");
  assert.equal("fantasma" in asignacion, false);
  assert.equal(Object.keys(asignacion).length, 4);
});
