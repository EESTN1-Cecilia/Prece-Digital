import studentRepository from "../../modules/students/students.repository.mjs";
import academicRepository from "../../modules/academic/academic.repository.mjs";
import inasistenciasRepository from "../../modules/inasistencias/inasistencias.repository.mjs";
import academicRecordsRepository from "../../modules/academic-records/academic-records.repository.mjs";
import boletinOficialService from "../../modules/boletin-oficial/boletin-oficial.service.mjs";

/* Notas de prueba para el alumno de ejemplo de la nomina local (Aglioni). Se
   cargan por el MISMO servicio que usan la planilla y el boletin oficial, asi
   se ven iguales en la planilla, en el boletin del personal y en el portal del
   alumno. Solo corre al iniciar el servidor en desarrollo (no en los tests).

   No se matricula a la nomina local en la estructura academica a proposito: la
   estructura de desarrollo tiene materias de ejemplo por division que se
   mezclarian con las del plan de estudios en el boletin. */

/* Notas de 1° (plan de Formacion General + Taller). TEA o 7 o mas = aprobado;
   el resto, desaprobado. Se evita el 6 a proposito: es el unico valor donde la
   regla del backend (aprobacion desde 6) y la de la escuela (desde 7) difieren. */
const NOTAS_DE_PRUEBA = {
  "CIENCIAS NATURALES": { informe1: "8", informe2: "9" },
  "CIENCIAS SOCIALES": { informe1: "7", informe2: "7" },
  "EDUCACION ARTISTICA": { informe1: "TEA", informe2: "TEA" },
  "EDUCACION FISICA": { informe1: "10", informe2: "9" },
  INGLES: { informe1: "4", informe2: "5" },
  MATEMATICAS: { informe1: "3", informe2: "5", diciembre: "4" },
  "PRACTICAS DEL LENGUAJE": { informe1: "7", informe2: "8" },
  "CONSTRUCCION CUIDADANA": { informe1: "TEA", informe2: "8" },
  "PROCEDIMIENTOS TECNICOS": { informe1: "9", informe2: "8" },
  "LENGUAJE TECNOLOGICOS": { informe1: "TEP", informe2: "5" },
  "SISTEMAS TECNOLOGICOS": { informe1: "7", informe2: "TEA" }
};

export function cargarNotasDePrueba({ alumnoId = "alu-local-1", anio = new Date().getFullYear() } = {}) {
  const alumno = studentRepository.findById(alumnoId);
  if (!alumno) return 0;

  const administrador = { id: "seed-notas-prueba", assignments: [{ role: "admin" }] };
  const { cambios } = boletinOficialService.guardar(alumno.id, { anio, notas: NOTAS_DE_PRUEBA }, administrador);
  return cambios.length;
}

/* Ausencias (justificada, injustificada y pendiente) y dos materias previas de
   ciclos anteriores, para ver como quedan esos bloques en el boletin. */
export function cargarAusenciasYPreviasDePrueba({ alumnoId = "alu-local-1", anio = new Date().getFullYear() } = {}) {
  const alumno = studentRepository.findById(alumnoId);
  if (!alumno) return { ausencias: 0, previas: 0 };

  const ausencias = [
    { id: `${alumnoId}-ina-1`, fecha: `${anio}-04-08`, cuatrimestre: 1, motivo: "salud", estadoJustificacion: "justificada", justificacion: { motivoJustificacion: "Certificado medico", descripcion: "Control medico.", documento: null, justificadaPor: "seed", fechaJustificacion: `${anio}-04-09T12:00:00.000Z` } },
    { id: `${alumnoId}-ina-2`, fecha: `${anio}-05-20`, cuatrimestre: 1, motivo: "personal", estadoJustificacion: "no_justificada", justificacion: null },
    { id: `${alumnoId}-ina-3`, fecha: `${anio}-09-14`, cuatrimestre: 2, motivo: "personal", estadoJustificacion: "no_justificada", justificacion: null },
    { id: `${alumnoId}-ina-4`, fecha: `${anio}-10-06`, cuatrimestre: 2, motivo: "salud", estadoJustificacion: "pendiente", justificacion: null }
  ];
  for (const item of ausencias) {
    inasistenciasRepository.create({
      ...item,
      escuelaId: alumno.escuelaId ?? "esc-1",
      alumnoId,
      alumno: { id: alumno.id, apellido: alumno.apellido, nombre: alumno.nombre, dni: alumno.dni },
      curso: alumno.curso,
      division: alumno.division,
      turno: alumno.turno ?? null,
      orientacion: alumno.orientacion ?? null,
      anio,
      observaciones: null,
      createdBy: "seed",
      createdAt: `${item.fecha}T12:00:00.000Z`
    });
  }

  const previas = [
    { id: `${alumnoId}-prev-1`, materia: "Matemáticas", anio: anio - 1, estado: "regular", observaciones: "Adeuda: rinde en mesa de examen" },
    { id: `${alumnoId}-prev-2`, materia: "Inglés", anio: anio - 1, estado: "desaprobada", observaciones: null }
  ];
  for (const previa of previas) {
    academicRecordsRepository.createSituacion({
      id: previa.id,
      escuelaId: alumno.escuelaId ?? "esc-1",
      alumnoId,
      materiaId: academicRepository.ensureSubjectRef(previa.materia).id,
      anio: previa.anio,
      cuatrimestre: null,
      tipo: "pendiente",
      estado: previa.estado,
      observaciones: previa.observaciones
    });
  }

  return { ausencias: ausencias.length, previas: previas.length };
}

export function seedAcademiaLocal() {
  return { notas: cargarNotasDePrueba(), ...cargarAusenciasYPreviasDePrueba() };
}
