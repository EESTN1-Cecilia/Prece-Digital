import academicRecordsRepository from "../../modules/academic-records/academic-records.repository.mjs";
import { MATERIAS } from "./academic.seed.mjs";
import { seedStudents } from "./students.seed.mjs";

const SITUACIONES = [
  {
    id: "rs-1",
    alumnoId: "alu-1",
    materiaId: "mat",
    anio: 2025,
    cuatrimestre: null,
    tipo: "cursada",
    estado: "en_curso",
    observaciones: "Cursada anual"
  },
  {
    id: "rs-2",
    alumnoId: "alu-1",
    materiaId: "lng",
    anio: 2025,
    cuatrimestre: null,
    tipo: "cursada",
    estado: "en_curso",
    observaciones: null
  },
  {
    id: "rs-3",
    alumnoId: "alu-1",
    materiaId: "his",
    anio: 2025,
    cuatrimestre: null,
    tipo: "pendiente",
    estado: "regular",
    observaciones: "Quedo pendiente y adeuda en mesa de examen"
  },
  {
    id: "rs-4",
    alumnoId: "alu-1",
    materiaId: "mat",
    anio: 2024,
    cuatrimestre: null,
    tipo: "cursada",
    estado: "desaprobada",
    observaciones: null
  },
  {
    id: "rs-5",
    alumnoId: "alu-1",
    materiaId: "mat",
    anio: 2026,
    cuatrimestre: 1,
    tipo: "recursada",
    estado: "en_curso",
    antecedenteId: "rs-4",
    historial: [
      {
        estado: "desaprobada",
        tipo: "cursada",
        anio: 2024,
        cuatrimestre: null,
        etiqueta: "2024",
        observaciones: null,
        actualizadoPor: null,
        fecha: "2025-03-01T00:00:00.000Z"
      }
    ],
    observaciones: "Recursa la materia desaprobada en 2024"
  },
  {
    id: "rs-6",
    alumnoId: "alu-2",
    materiaId: "prog",
    anio: 2026,
    cuatrimestre: 2,
    tipo: "intensificada",
    estado: "en_curso",
    observaciones: "Intensificacion en segundo cuatrimestre"
  },
  {
    id: "rs-7",
    alumnoId: "alu-2",
    materiaId: "mat",
    anio: 2026,
    cuatrimestre: null,
    tipo: "cursada",
    estado: "en_curso",
    observaciones: null
  },
  {
    id: "rs-8",
    alumnoId: "alu-3",
    materiaId: "his",
    anio: 2025,
    cuatrimestre: null,
    tipo: "cursada",
    estado: "aprobada",
    observaciones: null
  },
  {
    id: "rs-9",
    alumnoId: "alu-4",
    materiaId: "prog",
    anio: 2024,
    cuatrimestre: null,
    tipo: "cursada",
    estado: "desaprobada",
    observaciones: null
  }
];

export function seedAcademicRecords() {
  seedStudents();
  academicRecordsRepository.resetData();
  academicRecordsRepository.setSubjectsRef(MATERIAS);

  for (const situacion of SITUACIONES) {
    const alumno = academicRecordsRepository.findStudentRefById(situacion.alumnoId);

    academicRecordsRepository.createSituacion({
      ...situacion,
      escuelaId: alumno?.escuelaId ?? "esc-1",
      cuatrimestre: situacion.cuatrimestre ?? null
    });
  }
}