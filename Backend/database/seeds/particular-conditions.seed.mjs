import particularConditionsRepository from "../../modules/particular-conditions/particular-conditions.repository.mjs";
import { seedStudents } from "./students.seed.mjs";

/* Seed de condiciones particulares sobre alumnos que ya existen en
   students.seed.mjs. Los responsables son los usuarios del seed de auth, asi que
   el seed corre despues de seedAuthData() (ver database/seeds/index.mjs).

   alu-1 tiene una condicion activa y una finalizada (con historial); alu-3 tiene
   una activa; alu-2 no tiene ninguna, que es el caso "todavia no se le registro
   nada". */

const CONDICIONES = [
  {
    id: "cond-1",
    alumnoId: "alu-1",
    fechaInicio: "2026-03-02",
    descripcion: "Presenta dificultades visuales; requiere ubicacion en las primeras filas del aula.",
    estado: "activa",
    responsableId: "usr_4",
    responsable: "Preceptor 1° A",
    creadoPor: "usr_4",
    creadoEn: "2026-03-02T12:10:00.000Z"
  },
  {
    id: "cond-2",
    alumnoId: "alu-1",
    fechaInicio: "2026-03-10",
    descripcion: "Uso de muleta por esguince de tobillo.",
    estado: "finalizada",
    responsableId: "usr_4",
    responsable: "Preceptor 1° A",
    fechaFinalizacion: "2026-04-05",
    finalizadoPor: "usr_9",
    creadoPor: "usr_4",
    creadoEn: "2026-03-10T09:40:00.000Z",
    historial: [
      {
        descripcion: "Uso de muleta por esguince de tobillo.",
        fechaInicio: "2026-03-10",
        estado: "activa",
        fechaFinalizacion: null,
        finalizadoPor: null,
        registradoPor: "usr_4",
        registradoEn: "2026-03-10T09:40:00.000Z"
      }
    ]
  },
  {
    id: "cond-3",
    alumnoId: "alu-3",
    fechaInicio: "2026-03-16",
    descripcion: "Diagnostico de TDAH con indicacion de adaptaciones de tiempo en las evaluaciones.",
    estado: "activa",
    responsableId: "usr_4",
    responsable: "Preceptor 1° A",
    creadoPor: "usr_4",
    creadoEn: "2026-03-16T15:20:00.000Z"
  }
];

export function seedParticularConditions() {
  seedStudents();
  particularConditionsRepository.resetData();

  for (const condicion of CONDICIONES) {
    const alumno = particularConditionsRepository.findStudentRefById(condicion.alumnoId);

    if (!alumno) {
      continue;
    }

    particularConditionsRepository.createCondition({
      ...condicion,
      escuelaId: alumno.escuelaId,
      alumno: `${alumno.apellido}, ${alumno.nombre}`,
      dni: alumno.dni
    });
  }
}
