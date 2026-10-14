import attendanceFollowupsRepository from "../../modules/attendance-followups/attendance-followups.repository.mjs";
import { seedStudents } from "./students.seed.mjs";

/* Seed de seguimiento de inasistencias sobre alumnos que ya existen en
   students.seed.mjs. Los responsables son los usuarios del seed de auth, asi que
   el seed corre despues de seedAuthData() (ver database/seeds/index.mjs).

   alu-1 tiene varias intervenciones y una de ellas ya modificada, para que el
   historial muestre el camino completo; alu-2 y alu-3 tienen una cada uno; alu-4
   no tiene ninguna, que es el caso "aun no se lo intervenjo". */

const SEGUIMIENTOS = [
  {
    id: "seg-1",
    alumnoId: "alu-1",
    fecha: "2026-03-02",
    tipo: "llamado_familia",
    responsableId: "usr_4",
    observaciones: "Se llamo a la madre por dos inasistencias consecutivas. Prometio regularizar la asistencia.",
    creadoEn: "2026-03-02T14:30:00.000Z"
  },
  {
    id: "seg-2",
    alumnoId: "alu-1",
    fecha: "2026-03-09",
    tipo: "notificacion",
    responsableId: "usr_4",
    observaciones: "Se notifico por escrito el estado de asistencia del primer bimestre.",
    creadoEn: "2026-03-09T10:05:00.000Z"
  },
  {
    id: "seg-3",
    alumnoId: "alu-1",
    fecha: "2026-03-16",
    tipo: "entrevista",
    responsableId: "usr_4",
    observaciones: "Entrevista con el tutor para acordar un plan de seguimiento.",
    creadoEn: "2026-03-16T16:45:00.000Z",
    historial: [
      {
        fechaAccion: "2026-03-16",
        tipo: "comunicacion_cuaderno",
        tipoDescripcion: "Comunicacion registrada mediante el cuaderno del alumno",
        observaciones: "Se aviso por cuaderno que sin regularizar la asistencia no podria rendir la mesa de examen.",
        registradoPor: "usr_4",
        registradoEn: "2026-03-16T16:40:00.000Z"
      }
    ]
  },
  {
    id: "seg-4",
    alumnoId: "alu-2",
    fecha: "2026-03-04",
    tipo: "comunicacion_familia",
    responsableId: "usr_4",
    observaciones: "El padre se acerro a pretextoria y quedo en justificar las ausencias.",
    creadoEn: "2026-03-04T11:20:00.000Z"
  },
  {
    id: "seg-5",
    alumnoId: "alu-3",
    fecha: "2026-03-11",
    tipo: "otra_medida",
    responsableId: "usr_4",
    observaciones: "Se ofrecio apoyo tutorial para revertir la inasistencia.",
    creadoEn: "2026-03-11T09:15:00.000Z"
  },
  {
    id: "seg-6",
    alumnoId: "alu-5",
    fecha: "2026-02-27",
    tipo: "llamado_familia",
    responsableId: "usr_4",
    observaciones: "Llamado de cortesia para confirmar que la inasistencia fue por enfermedad.",
    creadoEn: "2026-02-27T15:00:00.000Z"
  }
];

export function seedAttendanceFollowups() {
  seedStudents();
  attendanceFollowupsRepository.resetData();

  for (const seguimiento of SEGUIMIENTOS) {
    const alumno = attendanceFollowupsRepository.findStudentRefById(seguimiento.alumnoId);

    if (!alumno) {
      continue;
    }

    attendanceFollowupsRepository.createSeguimiento({
      ...seguimiento,
      escuelaId: alumno.escuelaId,
      creadoPor: seguimiento.responsableId,
      actualizadoPor: seguimiento.responsableId
    });
  }
}
