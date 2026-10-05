import attendanceAlertsRepository from "../../modules/attendance-alerts/attendance-alerts.repository.mjs";
import { seedStudents } from "./students.seed.mjs";

/* Datos de desarrollo para el modulo de alertas por inasistencia consecutiva.

   El escenario interesting es el de los alumnos que llegan a generar alerta, para
   poder ver el flujo completo sin esperar a que la institucion cargue datos. Las
   fechas del ciclo actual son de marzo para que el conjunto sea coherente con el
   resto de los seeds. */

const INASISTENCIAS = [
  /* alu-1 llega al umbral: tres dias lectivos seguidos (lunes, martes, miercoles).
     Esta debe generar una alerta. */
  { id: "ina-1", alumnoId: "alu-1", fecha: "2026-03-02", tipo: "ausente", justificada: false },
  { id: "ina-2", alumnoId: "alu-1", fecha: "2026-03-03", tipo: "ausente", justificada: false },
  { id: "ina-3", alumnoId: "alu-1", fecha: "2026-03-04", tipo: "ausente", justificada: false },

  /* alu-1 sigue ausente y completa un segundo periodo mas adelante. */
  { id: "ina-4", alumnoId: "alu-1", fecha: "2026-03-09", tipo: "ausente", justificada: false },
  { id: "ina-5", alumnoId: "alu-1", fecha: "2026-03-10", tipo: "ausente", justificada: false },
  { id: "ina-6", alumnoId: "alu-1", fecha: "2026-03-11", tipo: "ausente", justificada: false },

  /* alu-2 tiene dos inasistencias: no alcanza el umbral de 3. */
  { id: "ina-7", alumnoId: "alu-2", fecha: "2026-03-02", tipo: "ausente", justificada: false },
  { id: "ina-8", alumnoId: "alu-2", fecha: "2026-03-03", tipo: "ausente", justificada: false },

  /* alu-3 llega a tres, pero la del martes esta justificada: la racha se corta y
     no debe generar alerta. */
  { id: "ina-9", alumnoId: "alu-3", fecha: "2026-03-02", tipo: "ausente", justificada: false },
  {
    id: "ina-10",
    alumnoId: "alu-3",
    fecha: "2026-03-03",
    tipo: "ausente",
    justificada: true,
    motivo: "Turno medico con-presentacion previa."
  },
  { id: "ina-11", alumnoId: "alu-3", fecha: "2026-03-04", tipo: "ausente", justificada: false },

  /* alu-4 falta el jueves y el viernes: el fin de semana no rompe la racha, asi que
     cuenta como periodo de dias lectivos. */
  { id: "ina-12", alumnoId: "alu-4", fecha: "2026-03-05", tipo: "ausente", justificada: false },
  { id: "ina-13", alumnoId: "alu-4", fecha: "2026-03-06", tipo: "ausente", justificada: false },
  { id: "ina-14", alumnoId: "alu-4", fecha: "2026-03-09", tipo: "ausente", justificada: false },

  /* inasistencias de tipo `tarde`, que no cuentan con la configuracion por
     defecto porque solo contabiliza `ausente`. */
  { id: "ina-15", alumnoId: "alu-5", fecha: "2026-03-02", tipo: "tarde", justificada: false },
  { id: "ina-16", alumnoId: "alu-5", fecha: "2026-03-03", tipo: "tarde", justificada: false },
  { id: "ina-17", alumnoId: "alu-5", fecha: "2026-03-04", tipo: "tarde", justificada: false },

  /* una baja logica: no debe contabilizar. */
  { id: "ina-18", alumnoId: "alu-6", fecha: "2026-03-02", tipo: "ausente", justificada: false },
  { id: "ina-19", alumnoId: "alu-6", fecha: "2026-03-03", tipo: "ausente", justificada: false }
];

export function seedAttendanceAlerts() {
  seedStudents();
  attendanceAlertsRepository.resetData();

  const escuela = attendanceAlertsRepository.findStudentRefById("alu-1")?.escuelaId ?? "esc-1";
  const existentes = new Set(
    attendanceAlertsRepository.listInasistencias({ incluirBajas: true }).map((registro) => registro.id)
  );

  for (const inasistencia of INASISTENCIAS) {
    if (existentes.has(inasistencia.id)) {
      continue;
    }

    const alumno = attendanceAlertsRepository.findStudentRefById(inasistencia.alumnoId);

    if (!alumno) {
      continue;
    }

    attendanceAlertsRepository.createInasistencia({
      ...inasistencia,
      escuelaId: alumno.escuelaId ?? escuela,
      motivo: inasistencia.motivo ?? null,
      observaciones: null,
      registradoPor: "usr_4"
    });
  }

  /* alu-6 no debe generar alerta: la segunda inasistencia quedo dada de baja. */
  const baja = attendanceAlertsRepository.findInasistenciaById("ina-19");

  if (baja && !baja.bajaEn) {
    attendanceAlertsRepository.actualizarInasistencia(
      "ina-19",
      {
        bajaEn: "2026-03-04T12:00:00.000Z",
        bajaMotivo: "Registro duplicado por error de carga.",
        bajaPor: "usr_4"
      },
      "usr_4"
    );
  }
}
