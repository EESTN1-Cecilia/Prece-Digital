import courseChangesRepository from "../../modules/course-changes/course-changes.repository.mjs";
import { buscarDivision } from "../../modules/students/catalogo.mjs";
import { seedStudents } from "./students.seed.mjs";

/* Seed de promocion y cambio de curso sobre alumnos que ya existen en
   students.seed.mjs. Se eligen alumnos sin datos cruzados en los tests del
   modulo (alu-14, alu-17, alu-20) para que los casos de promocion/cambio/carga
   masiva usen alumnos sin historial previo.

   Cada movimiento actualiza la ubicacion actual del alumno en el modulo students
   y guarda el registro inmutable con el responsable del seed de auth (usr_8,
   "Secretaría"). Correr despues de seedAuthData() (ver database/seeds/index.mjs). */

const MOVIMIENTOS = [
  {
    id: "mcv-1",
    alumnoId: "alu-14",
    tipo: "cambio_division",
    anio: 2025,
    cuatrimestre: null,
    fecha: "2025-12-15",
    motivo: "Reubicacion por conformacion de curso"
  },
  {
    id: "mcv-2",
    alumnoId: "alu-17",
    tipo: "promocion",
    anio: 2025,
    cuatrimestre: null,
    fecha: "2025-12-19",
    motivo: null
  },
  {
    id: "mcv-3",
    alumnoId: "alu-20",
    tipo: "cambio_curso",
    anio: 2026,
    cuatrimestre: 1,
    fecha: "2026-03-05",
    motivo: "Cambio solicitado por la institucion"
  }
];

const RESPONSABLE = { id: "usr_8", nombre: "Secretaría" };

export function seedCourseChanges() {
  seedStudents();

  if (courseChangesRepository.listMovimientos().length > 0) {
    return;
  }

  for (const item of MOVIMIENTOS) {
    const alumno = courseChangesRepository.findStudentRefById(item.alumnoId);
    const destino = definirDestinoDel(item, alumno);

    if (!destino) {
      continue;
    }

    courseChangesRepository.actualizarUbicacionDelAlumno(alumno.id, destino);

    courseChangesRepository.crearMovimiento({
      id: item.id,
      escuelaId: alumno.escuelaId,
      alumnoId: alumno.id,
      alumno: `${alumno.apellido}, ${alumno.nombre}`,
      dni: alumno.dni,
      cursoAnterior: alumno.curso,
      divisionAnterior: String(alumno.division),
      turnoAnterior: alumno.turno ?? null,
      orientacionAnterior: alumno.orientacion ?? null,
      cursoNuevo: destino.curso,
      divisionNueva: destino.division,
      turnoNuevo: destino.turno,
      orientacionNueva: destino.orientacion,
      tipo: item.tipo,
      anio: item.anio,
      cuatrimestre: item.cuatrimestre ?? null,
      fecha: item.fecha,
      motivo: item.motivo,
      responsableId: RESPONSABLE.id,
      responsable: RESPONSABLE.nombre,
      creadoEn: `${item.fecha}T18:00:00.000Z`
    });
  }
}

function definirDestinoDel(item, alumno) {
  const derivado = {
    cambio_division: { curso: alumno.curso, division: "1" },
    promocion: { curso: alumno.curso + 1, division: alumno.division },
    cambio_curso: { curso: alumno.curso + 1, division: alumno.division }
  }[item.tipo];

  const ubicacion = buscarDivision(derivado.curso, derivado.division);

  if (!ubicacion) {
    return null;
  }

  return { curso: derivado.curso, division: derivado.division, ...ubicacion };
}