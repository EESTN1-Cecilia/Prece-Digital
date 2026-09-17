import academicRepository from "../../modules/academic/academic.repository.mjs";

const CICLOS = [
  { id: "cic-1", nombre: "Primer Ciclo", descripcion: "1ro a 3ro, sin orientacion", tipo: "primer", anioDesde: 1, anioHasta: 3 },
  { id: "cic-2", nombre: "Segundo Ciclo", descripcion: "4to a 7mo, con orientacion", tipo: "segundo", anioDesde: 4, anioHasta: 7 }
];

const ORIENTACIONES = [
  { id: "ori-1", nombre: "Informática", descripcion: "Técnico en Informática" },
  { id: "ori-2", nombre: "Programación", descripcion: "Técnico en Programación" },
  { id: "ori-3", nombre: "Electrónica", descripcion: "Técnico en Electrónica", estado: "inactivo", fechaBaja: "2025-12-01T00:00:00.000Z" }
];

const CURSOS = [
  { id: "cur-1", escuelaId: "esc-1", anio: 1, turno: "MANANA", cicloId: "cic-1" },
  { id: "cur-2", escuelaId: "esc-1", anio: 1, turno: "TARDE", cicloId: "cic-1" },
  { id: "cur-3", escuelaId: "esc-1", anio: 2, turno: "MANANA", cicloId: "cic-1" },
  { id: "cur-4", escuelaId: "esc-1", anio: 3, turno: "MANANA", cicloId: "cic-1" },
  { id: "cur-5", escuelaId: "esc-1", anio: 4, turno: "MANANA", cicloId: "cic-2", orientacionId: "ori-1" },
  { id: "cur-6", escuelaId: "esc-1", anio: 4, turno: "MANANA", cicloId: "cic-2", orientacionId: "ori-2" },
  { id: "cur-7", escuelaId: "esc-1", anio: 4, turno: "TARDE", cicloId: "cic-2", orientacionId: "ori-1" },
  { id: "cur-8", escuelaId: "esc-1", anio: 5, turno: "MANANA", cicloId: "cic-2", orientacionId: "ori-1" },
  { id: "cur-9", escuelaId: "esc-1", anio: 6, turno: "MANANA", cicloId: "cic-2", orientacionId: "ori-1", estado: "inactivo", fechaBaja: "2025-12-20T00:00:00.000Z" },
  { id: "cur-10", escuelaId: "esc-1", anio: 7, turno: "MANANA", cicloId: "cic-2", orientacionId: "ori-1" }
];

const DIVISIONES = [
  { id: "div-1", escuelaId: "esc-1", cursoId: "cur-1", nombre: "1ra" },
  { id: "div-2", escuelaId: "esc-1", cursoId: "cur-1", nombre: "2da" },
  { id: "div-3", escuelaId: "esc-1", cursoId: "cur-1", nombre: "3ra" },
  { id: "div-4", escuelaId: "esc-1", cursoId: "cur-2", nombre: "4ta" },
  { id: "div-5", escuelaId: "esc-1", cursoId: "cur-2", nombre: "5ta" },
  { id: "div-6", escuelaId: "esc-1", cursoId: "cur-3", nombre: "1ra" },
  { id: "div-7", escuelaId: "esc-1", cursoId: "cur-4", nombre: "1ra" },
  { id: "div-8", escuelaId: "esc-1", cursoId: "cur-5", nombre: "1ra" },
  { id: "div-9", escuelaId: "esc-1", cursoId: "cur-5", nombre: "2da" },
  { id: "div-10", escuelaId: "esc-1", cursoId: "cur-6", nombre: "3ra" },
  { id: "div-11", escuelaId: "esc-1", cursoId: "cur-7", nombre: "4ta" },
  { id: "div-12", escuelaId: "esc-1", cursoId: "cur-8", nombre: "1ra" },
  { id: "div-13", escuelaId: "esc-1", cursoId: "cur-9", nombre: "1ra", estado: "inactivo", fechaBaja: "2025-12-20T00:00:00.000Z" },
  { id: "div-14", escuelaId: "esc-1", cursoId: "cur-10", nombre: "1ra" }
];

const ALUMNOS = [
  { id: "alu-1", escuelaId: "esc-1", apellido: "Pérez López", nombre: "Ana", dni: "40123456" },
  { id: "alu-2", escuelaId: "esc-1", apellido: "Gómez Ruiz", nombre: "Carla", dni: "42345678" },
  { id: "alu-3", escuelaId: "esc-1", apellido: "Fernández Díaz", nombre: "Diego", dni: "43456789" },
  { id: "alu-4", escuelaId: "esc-1", apellido: "Álvarez Castro", nombre: "Elena", dni: "44567890" },
  { id: "alu-5", escuelaId: "esc-1", apellido: "Soria Ríos", nombre: "Florencia", dni: "45678901" },
  { id: "alu-6", escuelaId: "esc-1", apellido: "Medina Torres", nombre: "Juan", dni: "46789012" }
];

const MATRICULA = [
  { id: "mat-1", estudianteId: "alu-1", divisionId: "div-1" },
  { id: "mat-2", estudianteId: "alu-5", divisionId: "div-1" },
  { id: "mat-3", estudianteId: "alu-2", divisionId: "div-8" },
  { id: "mat-4", estudianteId: "alu-3", divisionId: "div-8" },
  { id: "mat-5", estudianteId: "alu-4", divisionId: "div-9" },
  { id: "mat-6", estudianteId: "alu-6", divisionId: "div-10" }
];

const MATERIAS = [
  { id: "mat", nombre: "Matemática" },
  { id: "lng", nombre: "Lengua" },
  { id: "his", nombre: "Historia" },
  { id: "prog", nombre: "Programación" },
  { id: "edfisica", nombre: "Ed. Física" }
];

const MATERIAS_RELACIONES = [
  { tipo: "curso", scopeId: "cur-5", subjectId: "mat" },
  { tipo: "curso", scopeId: "cur-5", subjectId: "lng" },
  { tipo: "curso", scopeId: "cur-5", subjectId: "his" },
  { tipo: "curso", scopeId: "cur-6", subjectId: "prog" },
  { tipo: "curso", scopeId: "cur-6", subjectId: "mat" },
  { tipo: "division", scopeId: "div-8", subjectId: "mat" },
  { tipo: "division", scopeId: "div-8", subjectId: "lng" },
  { tipo: "division", scopeId: "div-1", subjectId: "lng" },
  { tipo: "division", scopeId: "div-1", subjectId: "his" }
];

const DOCENTES = [
  { id: "tch-1", apellido: "Villatoro", nombre: "María" },
  { id: "tch-2", apellido: "Sosa", nombre: "Humberto" },
  { id: "tch-3", apellido: "Ríos", nombre: "Lucía" }
];

const DOCENTES_RELACIONES = [
  { tipo: "curso", scopeId: "cur-1", teacherId: "tch-1" },
  { tipo: "curso", scopeId: "cur-5", teacherId: "tch-3" },
  { tipo: "division", scopeId: "div-8", teacherId: "tch-2" },
  { tipo: "division", scopeId: "div-1", teacherId: "tch-1" }
];

const HORARIOS = [
  { id: "sch-1", dia: "Lunes", desde: "08:00", hasta: "09:35", tipo: "aula" },
  { id: "sch-2", dia: "Martes", desde: "08:00", hasta: "09:35", tipo: "aula" },
  { id: "sch-3", dia: "Miércoles", desde: "08:00", hasta: "09:35", tipo: "aula" },
  { id: "sch-4", dia: "Lunes", desde: "14:00", hasta: "15:35", tipo: "aula" }
];

const HORARIOS_RELACIONES = [
  { tipo: "curso", scopeId: "cur-1", scheduleId: "sch-1" },
  { tipo: "curso", scopeId: "cur-5", scheduleId: "sch-2" },
  { tipo: "curso", scopeId: "cur-2", scheduleId: "sch-4" },
  { tipo: "division", scopeId: "div-8", scheduleId: "sch-3" }
];

export function seedAcademic() {
  academicRepository.resetData();

  for (const ciclo of CICLOS) {
    academicRepository.createCiclo(ciclo);
  }

  for (const orientacion of ORIENTACIONES) {
    academicRepository.createOrientacion(orientacion);
  }

  for (const curso of CURSOS) {
    academicRepository.createCurso(curso);
  }

  for (const division of DIVISIONES) {
    academicRepository.createDivision(division);
  }

  academicRepository.setStudentsRef(ALUMNOS);
  academicRepository.setTeachersRef(DOCENTES);
  academicRepository.setSubjectsRef(MATERIAS);
  academicRepository.setSchedulesRef(HORARIOS);

  for (const matricula of MATRICULA) {
    academicRepository.crearMatricula(matricula);
  }

  for (const relacion of MATERIAS_RELACIONES) {
    academicRepository.crearSubjectRelation(relacion);
  }

  for (const relacion of DOCENTES_RELACIONES) {
    academicRepository.crearTeacherRelation(relacion);
  }

  for (const relacion of HORARIOS_RELACIONES) {
    academicRepository.crearScheduleRelation(relacion);
  }
}