import studentRepository from "../../modules/students/students.repository.mjs";
import { getStore } from "../memory-store.mjs";

import { buscarDivision } from "../../modules/students/catalogo.mjs";

/* Seed canonico de alumnos: es la UNICA lista de alumnos del backend. La usan el
   CRUD de alumnos y, por referencia de id, los seeds de academic,
   academic-records y tutors (alu-1 a alu-6 tienen matricula, situacion academica
   y tutores cargados). Los ids son deterministicos para que los tests y los
   datos de desarrollo apunten siempre al mismo alumno.

   Curso/division siempre en el catalogo (EEST N1: basico 1-3, informatica y
   programacion de 4 a 7). Un alumno queda inactivo a proposito para probar los
   filtros por estado. */

/* Alumnos con datos cruzados en otros modulos (matricula, situacion academica, tutores). */
const ALUMNOS_CON_TRAYECTORIA = [
  ["Pérez López", "Ana", "40123456", 1, "1", "regular", "2013-05-12"],
  ["Gómez Ruiz", "Carla", "42345678", 4, "1", "regular", "2010-02-03"],
  ["Fernández Díaz", "Diego", "43456789", 4, "1", "irregular", "2010-08-21"],
  ["Álvarez Castro", "Elena", "44567890", 4, "2", "regular", "2010-11-30"],
  ["Soria Ríos", "Florencia", "45678901", 1, "1", "regular", "2013-01-09"],
  ["Medina Torres", "Juan", "46789012", 4, "3", "regular", "2010-04-17"]
];

/* [apellido, nombre, dni, curso, division, condicion, fechaNacimiento] */
const ALUMNOS = [
  ["Lopez", "Juan", "40123123", 1, "1", "regular", "2013-03-15"],
  ["Lopez", "Maria", "40123124", 4, "1", "regular", "2010-06-01"],
  ["Garcia", "Sofia", "42234567", 4, "1", "irregular", "2011-11-20"],
  ["Martinez", "Tomas", "39876543", 2, "3", "regular", "2012-09-10"],
  ["Fernandez", "Camila", "41112233", 6, "1", "regular", "2008-02-25"],
  ["Rossi", "Dante", "40001111", 7, "2", "irregular", "2007-12-05"],
  ["Gomez", "Abigail", "39990000", 2, "2", "regular", "2013-01-30"],
  ["Rojas", "Benicio", "38887777", 5, "4", "regular", "2009-07-14"],
  ["Paredes", "Luz", "37776666", 3, "6", "regular", null],
  ["Campos", "Iara", "40987765", 1, "1", "regular", "2013-08-18"],
  ["Sosa", "Lautaro", "35554444", 3, "1", "regular", "2011-04-22"],
  ["Molina", "Julieta", "34443333", 5, "3", "regular", "2009-11-09"],
  ["Diaz", "Mateo", "33332222", 2, "4", "irregular", "2012-06-27"],
  ["Torres", "Alma", "32221111", 4, "3", "regular", "2010-10-03"],
  ["Villalba", "Franco", "31119999", 6, "1", "regular", null],
  ["Nunez", "Mora", "30008888", 7, "1", "regular", null],
  ["Herrera", "Ciro", "29997777", 1, "6", "regular", null],
  ["Ojeda", "Renata", "28886666", 5, "1", "irregular", null],
  ["Cabrera", "Bruno", "27775555", 2, "1", "regular", null],
  ["Sanchez", "Micaela", "26664444", 3, "4", "regular", null],
  ["Aguero", "Leo", "25553333", 4, "2", "regular", null],
  ["Vega", "Valen", "24442222", 6, "3", "regular", null],
  ["Silva", "Thiago", "23331111", 7, "2", "regular", null],
  ["Pereyra", "Zoe", "22220000", 5, "4", "regular", null],
  ["Acosta", "Simon", "21110000", 1, "2", "regular", null],
  ["Luna", "Brisa", "20009999", 3, "1", "regular", null]
];

export function seedStudents() {
  if (getStore().students.size > 0) {
    return;
  }

  const todos = [...ALUMNOS_CON_TRAYECTORIA, ...ALUMNOS];

  todos.forEach(([apellido, nombre, dni, curso, division, condicion, fechaNacimiento], indice) => {
    const { turno, orientacion } = buscarDivision(curso, division) ?? {};
    const registro = studentRepository.create({
      id: `alu-${indice + 1}`,
      escuelaId: "esc-1",
      turno,
      orientacion,
      apellido,
      nombre,
      dni,
      curso,
      division,
      condicion,
      fechaNacimiento,
      email: dni.charAt(0) === "4" ? `${nombre.toLowerCase()}.${apellido.toLowerCase()}@alumno.prece.to` : null
    });

    if (dni === "37776666") {
      studentRepository.deactivate(registro.id, "2025-12-20");
    }
  });
}