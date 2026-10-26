import assert from "node:assert/strict";
import test from "node:test";
import {
  areaDeBoletinMm,
  claveOrientacion,
  contarFaltantes,
  escalaParaBoletin,
  filasDelBoletin,
  mismaMateria,
  notasDeMateria,
  paginarDeADos,
  promedioGeneral,
  reglaPaginaBoletines,
  seccionesDelPlan
} from "./boletines-logica.js";

const PLANES = {
  1: { formacionGeneral: ["MATEMATICAS", "INGLES"], tcoEspecifica: ["PROCEDIMIENTOS TECNICOS"] },
  4: {
    formacionGeneral: ["LITERATURA"],
    orientaciones: { programacion: ["LABORATORIO DE PROGRAMACIÓN"], informatica: ["LABORATORIO DE HARDWARE"] }
  }
};

test("mismaMateria tolera acentos, mayusculas y la forma corta", () => {
  assert.equal(mismaMateria("Matemática", "MATEMATICAS"), true);
  assert.equal(mismaMateria("Inglés", "INGLES"), true);
  assert.equal(mismaMateria("Lengua", "PRACTICAS DEL LENGUAJE"), false);
  assert.equal(mismaMateria("Arte", "ARTES VISUALES"), false);
});

test("el plan usa los titulos y la orientacion del Boletin Digital", () => {
  assert.equal(claveOrientacion("Técnico en Informática"), "informatica");
  assert.equal(claveOrientacion(null), "programacion");
  assert.deepEqual(seccionesDelPlan(PLANES, 1, null).map((seccion) => seccion.titulo), ["FORMACIÓN GENERAL", "TCO. ESPECÍFICA / TALLER"]);
  assert.deepEqual(seccionesDelPlan(PLANES, 4, "Técnico en Informática")[1], { titulo: "FORMACIÓN TÉCNICA ESPECÍFICA", materias: ["LABORATORIO DE HARDWARE"] });
  assert.deepEqual(seccionesDelPlan(PLANES, 9, null), []);
});

test("las notas salen del boletin compartido y lo que falta queda vacio", () => {
  const calificaciones = {
    MATEMATICAS: { informe1: "8", informe2: "7,5", promedioAnual: "7.8", definitiva: "7.8" },
    "Inglés I": { informe1: "TEP" }
  };

  assert.equal(notasDeMateria(calificaciones, "MATEMATICAS").informe1, "8");
  assert.equal(notasDeMateria(calificaciones, "PROCEDIMIENTOS TECNICOS"), null);

  const secciones = filasDelBoletin({ planes: PLANES, anio: 1, calificaciones });
  const [general, tecnica] = secciones;
  assert.deepEqual(general.filas[0], {
    materia: "MATEMATICAS",
    notas: { informe1: "8", informe2: "7,5", promedioAnual: "7.8", diciembre: "", febrero: "", definitiva: "7.8" },
    sinDatos: false
  });
  /* "Inglés I" (nombre del docente) equivale a INGLES del plan. */
  assert.equal(general.filas[1].notas.informe1, "TEP");
  assert.deepEqual(tecnica.filas[0].notas, { informe1: "", informe2: "", promedioAnual: "", diciembre: "", febrero: "", definitiva: "" });
  assert.equal(contarFaltantes(secciones), 1);
  assert.equal(promedioGeneral(secciones), "7.80");
  assert.equal(promedioGeneral(filasDelBoletin({ planes: PLANES, anio: 1 })), "");
});

test("paginarDeADos respeta el orden y deja solo al ultimo si la cantidad es impar", () => {
  assert.deepEqual(paginarDeADos(["a", "b", "c", "d"]), [["a", "b"], ["c", "d"]]);
  assert.deepEqual(paginarDeADos(["a", "b", "c"]), [["a", "b"], ["c"]]);
  assert.deepEqual(paginarDeADos([]), []);
});

test("la hoja es Oficio horizontal con margenes de 1 cm y dos boletines de media hoja util", () => {
  const regla = reglaPaginaBoletines();
  assert.match(regla, /size: 340mm 216mm/);
  const margen = Number(/margin: (\d+)mm/.exec(regla)[1]);
  assert.equal(margen, 10);
  assert.deepEqual(areaDeBoletinMm(), { ancho: 160, alto: 196 });
});

test("escalaParaBoletin achica para entrar en la media hoja util y nunca agranda", () => {
  const pxPorMm = 96 / 25.4;
  assert.equal(escalaParaBoletin(160 * pxPorMm, 100), 1);
  assert.equal(escalaParaBoletin(160 * pxPorMm * 2, 100), 0.5);
  assert.ok(escalaParaBoletin(500, 196 * pxPorMm * 1.25) <= 0.8);
  assert.equal(escalaParaBoletin(0, 0), 1);
});
