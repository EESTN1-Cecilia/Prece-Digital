import observationsRepository from "../../modules/observations/observations.repository.mjs";
import { seedStudents } from "./students.seed.mjs";

/* Seed de observaciones de alumnos sobre alumnos que ya existen en
   students.seed.mjs. Los responsables son los usuarios del seed de auth, asi que
   el seed corre despues de seedAuthData() (ver database/seeds/index.mjs).

   alu-1 tiene varias observaciones (una de ellas con seguimiento y otra ya
   modificada); alu-3 y alu-5 tienen una cada uno; alu-2 no tiene ninguna, que es
   el caso "todavia no se le registro nada". */

const OBSERVACIONES = [
  {
    id: "obs-1",
    alumnoId: "alu-1",
    fecha: "2026-03-05",
    tipo: "Convivencia",
    descripcion: "Interrupciones reiteradas durante la clase de Matemática.",
    sector: "Preceptoría",
    estado: "Modificada",
    responsable: "Preceptor 1° A",
    creadoPor: "usr_4",
    creadoEn: "2026-03-05T13:20:00.000Z",
    historial: [
      {
        fecha: "2026-03-05",
        tipo: "Convivencia",
        descripcion: "Interrupciones durante la clase de Matemática.",
        sector: "Preceptoría",
        estado: "Activa",
        registradoPor: "usr_4",
        registradoEn: "2026-03-05T15:40:00.000Z"
      }
    ]
  },
  {
    id: "obs-2",
    alumnoId: "alu-1",
    fecha: "2026-03-19",
    tipo: "Académica",
    descripcion: "No presentó los trabajos prácticos del primer bimestre.",
    sector: "Coordinación",
    estado: "Activa",
    responsable: "Preceptor 1° A",
    creadoPor: "usr_4",
    creadoEn: "2026-03-19T11:10:00.000Z"
  },
  {
    id: "obs-3",
    alumnoId: "alu-3",
    fecha: "2026-03-12",
    tipo: "Asistencia",
    descripcion: "Llegó tarde en tres oportunidades durante la semana.",
    sector: "Preceptoría",
    estado: "Activa",
    responsable: "Preceptor 1° A",
    creadoPor: "usr_4",
    creadoEn: "2026-03-12T08:05:00.000Z"
  },
  {
    id: "obs-4",
    alumnoId: "alu-5",
    fecha: "2026-03-24",
    tipo: "Pedagógica",
    descripcion: "Se acordó acompañamiento y adaptación de consignas en el aula.",
    sector: "Equipo de Orientación (EOE)",
    estado: "Activa",
    responsable: "Preceptor 1° A",
    creadoPor: "usr_4",
    creadoEn: "2026-03-24T17:30:00.000Z"
  }
];

const SEGUIMIENTOS = [
  {
    id: "oseg-1",
    observacionId: "obs-1",
    fecha: "2026-03-06",
    accion: "Entrevista con la familia",
    observaciones: "Se acordó con el tutor revisar la conducta en clase y avisar ante cualquier novedad.",
    estado: "realizada",
    responsableId: "usr_4",
    creadoEn: "2026-03-06T14:00:00.000Z"
  },
  {
    id: "oseg-2",
    observacionId: "obs-2",
    fecha: "2026-03-20",
    accion: "Contactar a la familia",
    observaciones: "Pendiente de respuesta sobre la entrega de los trabajos.",
    estado: "pendiente",
    responsableId: "usr_4",
    creadoEn: "2026-03-20T09:45:00.000Z"
  }
];

export function seedObservations() {
  seedStudents();
  observationsRepository.resetData();

  for (const observacion of OBSERVACIONES) {
    const alumno = observationsRepository.findStudentRefById(observacion.alumnoId);

    if (!alumno) {
      continue;
    }

    observationsRepository.createObservation({
      ...observacion,
      escuelaId: alumno.escuelaId,
      alumno: `${alumno.apellido}, ${alumno.nombre}`,
      dni: alumno.dni
    });
  }

  for (const seguimiento of SEGUIMIENTOS) {
    const observacion = observationsRepository.findObservationById(seguimiento.observacionId);

    if (!observacion) {
      continue;
    }

    observationsRepository.createSeguimiento({
      ...seguimiento,
      escuelaId: observacion.escuelaId,
      fechaCierre: seguimiento.estado === "realizada" ? seguimiento.fecha : null,
      creadoPor: seguimiento.responsableId
    });
  }
}
