import inasistenciasRepository from "../../modules/inasistencias/inasistencias.repository.mjs";
import { seedStudents } from "./students.seed.mjs";

/* Seed canonico de inasistencias de alumnos. Usa los alumnos de students.seed
   (alu-1 a alu-6 tienen trayectoria cargada) y registra inasistencias en el
   periodo lectivo 2026 con los tres estados de justificacion. Los ids son
   deterministicos para que tests y datos de desarrollo apunten al mismo
   registro. */

const INASISTENCIAS = [
  { id: "ina-1", alumnoId: "alu-1", fecha: "2026-03-02", cuatrimestre: 1, motivo: "salud", estadoJustificacion: "justificada", justificacion: { motivoJustificacion: "Certificado medico", descripcion: "Tos y fiebre.", documento: "cert-2026-001", justificadaPor: "u-preceptor", fechaJustificacion: "2026-03-04T12:00:00.000Z" }, observaciones: null },
  { id: "ina-2", alumnoId: "alu-1", fecha: "2026-03-09", cuatrimestre: 1, motivo: "personal", estadoJustificacion: "no_justificada", justificacion: null, observaciones: "Primera notificacion enviada" },
  { id: "ina-3", alumnoId: "alu-1", fecha: "2026-04-13", cuatrimestre: 1, motivo: "institucional", estadoJustificacion: "justificada", justificacion: { motivoJustificacion: "Viaje de estudios", descripcion: "Actividad institucional.", documento: null, justificadaPor: "u-preceptor", fechaJustificacion: "2026-04-10T10:00:00.000Z" }, observaciones: null },
  { id: "ina-4", alumnoId: "alu-2", fecha: "2026-03-12", cuatrimestre: 1, motivo: "salud", estadoJustificacion: "pendiente", justificacion: null, observaciones: "A la espera del certificado" },
  { id: "ina-5", alumnoId: "alu-2", fecha: "2026-05-25", cuatrimestre: 1, motivo: "personal", estadoJustificacion: "no_justificada", justificacion: null, observaciones: null },
  { id: "ina-6", alumnoId: "alu-3", fecha: "2026-08-10", cuatrimestre: 2, motivo: "otra", estadoJustificacion: "justificada", justificacion: { motivoJustificacion: "Mudanza", descripcion: "Cambio de domicilio.", documento: null, justificadaPor: "u-preceptor", fechaJustificacion: "2026-08-12T09:00:00.000Z" }, observaciones: null },
  { id: "ina-7", alumnoId: "alu-4", fecha: "2026-09-02", cuatrimestre: 2, motivo: "salud", estadoJustificacion: "pendiente", justificacion: null, observaciones: null }
];

export function seedInasistencias() {
  seedStudents();

  for (const inasistencia of INASISTENCIAS) {
    const alumno = inasistenciasRepository.findStudentRefById(inasistencia.alumnoId);

    inasistenciasRepository.create({
      id: inasistencia.id,
      escuelaId: alumno?.escuelaId ?? "esc-1",
      alumnoId: inasistencia.alumnoId,
      alumno: alumno ? { id: alumno.id, apellido: alumno.apellido, nombre: alumno.nombre, dni: alumno.dni } : null,
      curso: alumno?.curso ?? 1,
      division: alumno?.division ?? "1",
      turno: alumno?.turno ?? null,
      orientacion: alumno?.orientacion ?? null,
      fecha: inasistencia.fecha,
      anio: Number(inasistencia.fecha.slice(0, 4)),
      cuatrimestre: inasistencia.cuatrimestre ?? null,
      motivo: inasistencia.motivo,
      estadoJustificacion: inasistencia.estadoJustificacion,
      justificacion: inasistencia.justificacion,
      observaciones: inasistencia.observaciones,
      createdBy: inasistencia.justificacion?.justificadaPor ?? "seed",
      createdAt: inasistencia.fecha + "T12:00:00.000Z"
    });
  }
}