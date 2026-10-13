import bookRegistryRepository from "../../modules/book-registry/book-registry.repository.mjs";
import { seedStudents } from "./students.seed.mjs";

/* Seed del Libro Matriz digital sobre alumnos que ya existen en
   students.seed.mjs. Los responsables son los usuarios del seed de auth, asi que
   el seed corre despues de seedAuthData() (ver database/seeds/index.mjs).

   alu-1 y alu-3 tienen registro activo; alu-5 tiene uno archivado (baja logica);
   alu-2 no tiene ninguno, que es el caso "todavia no se le abrio el Libro
   Matriz". */

const REGISTROS = [
  {
    id: "lm-1",
    alumnoId: "alu-1",
    numeroLibro: "12",
    numeroFolio: "34",
    fechaRegistro: "2026-03-03",
    estado: "activo",
    datosAdicionales: { matricula: "2026-0001", plan: "Res. 1234/20", orientacion: "Informatica" },
    responsableId: "usr_8",
    responsable: "Secretaría",
    creadoPor: "usr_8",
    creadoEn: "2026-03-03T10:00:00.000Z"
  },
  {
    id: "lm-2",
    alumnoId: "alu-3",
    numeroLibro: "12",
    numeroFolio: "35",
    fechaRegistro: "2026-03-03",
    estado: "activo",
    datosAdicionales: { matricula: "2026-0003", plan: "Res. 1234/20" },
    responsableId: "usr_8",
    responsable: "Secretaría",
    creadoPor: "usr_8",
    creadoEn: "2026-03-03T10:05:00.000Z"
  },
  {
    id: "lm-3",
    alumnoId: "alu-5",
    numeroLibro: "13",
    numeroFolio: "01",
    fechaRegistro: "2025-08-11",
    estado: "archivado",
    datosAdicionales: { matricula: "2025-0110", observacion: "Registro anterior dado de baja logica." },
    responsableId: "usr_8",
    responsable: "Secretaría",
    creadoPor: "usr_8",
    creadoEn: "2025-08-11T09:30:00.000Z"
  }
];

export function seedBookRegistry() {
  seedStudents();
  bookRegistryRepository.resetData();

  for (const registro of REGISTROS) {
    const alumno = bookRegistryRepository.findStudentRefById(registro.alumnoId);

    if (!alumno) {
      continue;
    }

    bookRegistryRepository.createRegistry({
      ...registro,
      escuelaId: alumno.escuelaId,
      alumno: `${alumno.apellido}, ${alumno.nombre}`,
      dni: alumno.dni
    });
  }
}
