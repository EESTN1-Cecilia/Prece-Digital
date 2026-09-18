import { seedAuthData } from "./auth.seed.mjs";
import { seedStudents } from "./students.seed.mjs";
import { seedAcademic } from "./academic.seed.mjs";
import { seedAcademicRecords } from "./academic-records.seed.mjs";
import { seedTutores } from "./tutores.seed.mjs";

/* Carga los datos de desarrollo de todos los modulos sobre el store en memoria.
   Todos comparten los mismos alumnos (students.seed.mjs). */
export async function seedDesarrollo() {
  await seedAuthData();
  seedStudents();
  seedAcademic();
  seedAcademicRecords();
  seedTutores();
}
