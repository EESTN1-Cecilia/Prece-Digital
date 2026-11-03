import test from "node:test";
import assert from "node:assert/strict";

import { anioDelAlumno, armarBoletinOficial, buscarNota, cicloDeAnio, cuerpoParaGuardar, planDelAnio, promedioGeneral, recalcularNota } from "./boletin-oficial-datos.js";
import { agruparMaterias } from "./boletin-grupos.js";

const alumno = { id: 7, apellido: "Perez", nombre: "Ana", dni: "99.000.007", curso: "2°", division: "1", turno: "Mañana", libro: "2026", folio: "07" };

test("el año sale del curso y el plan trae materias y titulo de taller", () => {
  assert.equal(anioDelAlumno(alumno), 2);
  assert.equal(anioDelAlumno({ curso: "1°1°" }), 1);
  assert.equal(planDelAnio(2).tituloTaller, "TCO. ESPECÍFICA / TALLER");
  assert.equal(planDelAnio(5, "Informática").tituloTaller, "FORMACIÓN TÉCNICA ESPECÍFICA");
  assert.notDeepEqual(planDelAnio(5, "Informática").taller, planDelAnio(5, "Programación").taller);
});

test("recalcularNota: promedio de informes y definitiva con diciembre/febrero", () => {
  assert.equal(recalcularNota({ informe1: "8", informe2: "7" }).promedioAnual, "7.5");
  assert.equal(recalcularNota({ informe1: "8", informe2: "" }).definitiva, "");
  assert.equal(recalcularNota({ informe1: "4", informe2: "5", diciembre: "6" }).definitiva, "6");
  assert.equal(recalcularNota({ informe1: "4", informe2: "5", diciembre: "6", febrero: "7" }).definitiva, "7");
});

test("el boletin se arma con las notas del backend y calcula promedio y definitiva", () => {
  const registro = {
    notas: { "MATEMATICA": { informe1: "9", informe2: "8", diciembre: "", febrero: "" }, "Otra clave": { informe1: "1" } },
    inasistencias: "4",
    pendientes: [{ materia: "FISICA", anio: "1" }],
    libroFolio: { libro: "2026", folio: "07" }
  };
  const b = armarBoletinOficial(alumno, 2, { registro, cicloLectivo: 2026 });
  assert.equal(b.notas["MATEMÁTICA"].informe1, "9"); // el nombre del backend (sin tilde) se reconoce
  assert.equal(b.notas["MATEMÁTICA"].definitiva, "8.5");
  assert.equal(b.notas["HISTORIA"].informe1, "");
  assert.equal(b.inasistencias, "4");
  assert.equal(b.pendientes.length, 4);
  assert.equal(b.pendientes[0].materia, "FISICA");
  assert.equal(promedioGeneral(b.notas, ["MATEMÁTICA"]), "8.5");
});

test("sin registro (alumno sin notas) el boletin queda en blanco", () => {
  const b = armarBoletinOficial(alumno, 2);
  assert.ok(Object.values(b.notas).every((n) => !n.informe1 && !n.definitiva));
});

test("lo que se guarda lleva solo las notas editables, sin promedios calculados", () => {
  const b = armarBoletinOficial(alumno, 2, { registro: { notas: {} } });
  b.notas.HISTORIA = recalcularNota({ ...b.notas.HISTORIA, informe1: "6", informe2: "6" });
  b.inasistencias = "4";
  const cuerpo = cuerpoParaGuardar(b);
  assert.deepEqual(cuerpo.notas.HISTORIA, { informe1: "6", informe2: "6", diciembre: "", febrero: "" });
  assert.equal(cuerpo.inasistencias, "4");
  assert.deepEqual(cuerpo.libroFolio, { libro: "2026", folio: "07" });
  assert.equal(cuerpo.pendientes.length, 4);
});

test("el ciclo lectivo se deduce del año de estudio del alumno", () => {
  const tercero = { curso: "3°" };
  assert.equal(cicloDeAnio(3, tercero, 2026), 2026);
  assert.equal(cicloDeAnio(1, tercero, 2026), 2024);
});

test("buscarNota reconoce alias entre planilla y boletin (Matematicas / Matemática / Ciclo Superior)", () => {
  const notas = {
    "Matemática": { informe1: "8", informe2: "9" },
    "Matemática III": { informe1: "7", informe2: "7" }
  };
  assert.equal(buscarNota(notas, "MATEMATICAS")?.informe1, "8");
  assert.equal(buscarNota(notas, "MATEMÁTICA")?.informe2, "9");
});

test("agruparMaterias unifica alias y calcula la calificacion final a partir de 1C y 2C", () => {
  const grupos = agruparMaterias({
    alumno: { cursoDivision: "1° 1°" },
    materias: [
      {
        materiaId: "mat",
        materia: "Matemática",
        docente: "María Villatoro",
        periodos: {
          c1: { resultado: { valor: "7", nota: 7, fecha: "2026-04-01" } },
          c2: { resultado: null },
          final: { resultado: null }
        }
      },
      {
        materiaId: "mat-matematicas",
        materia: "Matematicas",
        docente: "María Villatoro",
        periodos: {
          c1: { resultado: { valor: "9", nota: 9, fecha: "2026-06-15" } },
          c2: { resultado: { valor: "8", nota: 8, fecha: "2026-11-15" } },
          final: { resultado: null }
        }
      }
    ]
  });
  assert.equal(grupos.length, 1);
  assert.equal(grupos[0].materias.length, 1);
  assert.equal(grupos[0].materias[0].periodos.c1.resultado.valor, "9");
  assert.equal(grupos[0].materias[0].periodos.c2.resultado.valor, "8");
  assert.equal(grupos[0].materias[0].periodos.final.resultado.valor, "8.5");
});
