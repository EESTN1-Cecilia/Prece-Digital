import gradesRepository from "../../modules/grades/grades.repository.mjs";
import studentRepository from "../../modules/students/students.repository.mjs";

/* Seed del modulo de calificaciones.

   Referencia alumnos (alu-*), materias (mat/lng/his/prog), cursos (cur-*) y
   divisiones (div-*) del seed academico, y docentes/asignaciones del seed de
   gestion de docentes (tch-1..tch-4 y tcm-*). Correr despues de seedAcademic()
   y seedTeachers() (ver database/seeds/index.mjs). La asignacion tcm-1
   (tch-1 -> mat/cur-1/2026) y el usuario usr_3 ("docente@prece.local") quedan
   ligados para probar la autorizacion por asignaciones. */

const CALIFICACIONES = [
  {
    id: "cal-1",
    alumnoId: "alu-1",
    materiaId: "mat",
    cursoId: "cur-1",
    divisionId: "div-1",
    docenteId: "tch-1",
    asignacionMateriaId: "tcm-1",
    anio: 2026,
    cuatrimestre: 1,
    tipoEvaluacion: "escrito",
    valor: "8",
    fecha: "2026-04-15",
    observaciones: "Primer parcial",
    creadoPor: "usr_3",
    historial: [
      {
        valor: "7",
        tipoEvaluacion: "escrito",
        anio: 2026,
        cuatrimestre: 1,
        etiqueta: "1er cuatrimestre 2026",
        observaciones: null,
        actualizadoPor: "usr_3",
        momento: "2026-04-16T10:00:00.000Z"
      }
    ]
  },
  {
    id: "cal-2",
    alumnoId: "alu-1",
    materiaId: "mat",
    cursoId: "cur-1",
    divisionId: "div-1",
    docenteId: "tch-1",
    asignacionMateriaId: "tcm-1",
    anio: 2026,
    cuatrimestre: 1,
    tipoEvaluacion: "oral",
    valor: "7",
    fecha: "2026-04-22",
    observaciones: null,
    creadoPor: "usr_3"
  },
  {
    id: "cal-3",
    alumnoId: "alu-1",
    materiaId: "lng",
    cursoId: "cur-1",
    divisionId: "div-1",
    docenteId: "tch-4",
    asignacionMateriaId: "tcm-4",
    anio: 2026,
    cuatrimestre: 1,
    tipoEvaluacion: "trabajo_practico",
    valor: "TEP",
    fecha: "2026-04-10",
    observaciones: "Trabajo practico en proceso",
    creadoPor: "usr_8"
  },
  {
    id: "cal-4",
    alumnoId: "alu-1",
    materiaId: "mat",
    cursoId: "cur-1",
    divisionId: "div-1",
    docenteId: "tch-1",
    asignacionMateriaId: "tcm-1",
    anio: 2026,
    cuatrimestre: 2,
    tipoEvaluacion: "escrito",
    valor: "9",
    fecha: "2026-08-20",
    observaciones: null,
    creadoPor: "usr_3"
  },
  {
    id: "cal-5",
    alumnoId: "alu-5",
    materiaId: "mat",
    cursoId: "cur-1",
    divisionId: "div-1",
    docenteId: "tch-1",
    asignacionMateriaId: "tcm-1",
    anio: 2026,
    cuatrimestre: 1,
    tipoEvaluacion: "escrito",
    valor: "4",
    fecha: "2026-04-15",
    observaciones: "Debe recuperar",
    creadoPor: "usr_3"
  },
  {
    id: "cal-6",
    alumnoId: "alu-5",
    materiaId: "lng",
    cursoId: "cur-1",
    divisionId: "div-1",
    docenteId: "tch-4",
    asignacionMateriaId: "tcm-4",
    anio: 2026,
    cuatrimestre: 1,
    tipoEvaluacion: "oral",
    valor: "6",
    fecha: "2026-04-25",
    observaciones: null,
    creadoPor: "usr_8"
  },
  {
    id: "cal-7",
    alumnoId: "alu-2",
    materiaId: "his",
    cursoId: "cur-5",
    divisionId: "div-8",
    docenteId: "tch-2",
    asignacionMateriaId: "tcm-2",
    anio: 2026,
    cuatrimestre: 1,
    tipoEvaluacion: "escrito",
    valor: "7",
    fecha: "2026-04-18",
    observaciones: null,
    creadoPor: "usr_8"
  },
  {
    id: "cal-8",
    alumnoId: "alu-3",
    materiaId: "his",
    cursoId: "cur-5",
    divisionId: "div-8",
    docenteId: "tch-2",
    asignacionMateriaId: "tcm-2",
    anio: 2026,
    cuatrimestre: 1,
    tipoEvaluacion: "oral",
    valor: "TED",
    fecha: "2026-04-18",
    observaciones: "Debe recuperar el oral",
    creadoPor: "usr_8"
  },
  {
    id: "cal-9",
    alumnoId: "alu-6",
    materiaId: "prog",
    cursoId: "cur-6",
    divisionId: "div-10",
    docenteId: "tch-3",
    asignacionMateriaId: "tcm-3",
    anio: 2026,
    cuatrimestre: 1,
    tipoEvaluacion: "proyecto",
    valor: "10",
    fecha: "2026-05-02",
    observaciones: null,
    creadoPor: "usr_8"
  },
  {
    id: "cal-10",
    alumnoId: "alu-1",
    materiaId: "mat",
    cursoId: "cur-1",
    divisionId: "div-1",
    docenteId: "tch-1",
    asignacionMateriaId: "tcm-1",
    anio: 2025,
    cuatrimestre: null,
    tipoEvaluacion: "escrito",
    valor: "5",
    fecha: "2025-11-10",
    observaciones: "Ciclo lectivo anterior",
    creadoPor: "usr_3"
  },
  {
    id: "cal-11",
    alumnoId: "alu-3",
    materiaId: "his",
    cursoId: "cur-5",
    divisionId: "div-8",
    docenteId: "tch-2",
    asignacionMateriaId: "tcm-2",
    anio: 2026,
    cuatrimestre: 2,
    tipoEvaluacion: "recuperatorio",
    valor: "3",
    fecha: "2026-09-01",
    observaciones: "Dada de baja tras correccion",
    creadoPor: "usr_8",
    isActive: false,
    fechaBaja: "2026-09-02T10:00:00.000Z"
  }
];

export function seedGrades() {
  gradesRepository.resetData();

  for (const calificacion of CALIFICACIONES) {
    const alumno = studentRepository.findById(calificacion.alumnoId);

    gradesRepository.createCalificacion({
      ...calificacion,
      escuelaId: alumno?.escuelaId ?? "esc-1",
      cuatrimestre: calificacion.cuatrimestre ?? null,
      observaciones: calificacion.observaciones ?? null,
      creadoEn: calificacion.creadoEn ?? `${calificacion.fecha}T00:00:00.000Z`
    });
  }
}
