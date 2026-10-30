/* Acceso a datos del portal del alumno (implementacion en memoria).

   El portal NO tiene tablas propias: lee de los repositorios que ya son la
   fuente oficial de cada dato, siempre de solo lectura.

     alumno y legajo ............ students (unica fuente de alumnos)
     curso, division, materias .. academic (estructura y matricula)
     docentes y asignaciones .... teachers
     calificaciones ............. grades
     inasistencias (jornada) .... inasistencias (con justificacion)
     tardes y retiros ........... attendance-alerts (registro con tipo)
     situacion y previas ........ academic-records
     curso de origen ............ course-changes (historial de movimientos)
     grupo de taller ............ workshops

   CONTRATO (lo cumple tambien student-portal.repository.sqlserver.mjs):
   - Metodos de DATOS: los servicios siempre los llaman con `await`, asi una
     implementacion contra SQL Server puede devolver promesas. Aca devuelven el
     valor directo (await sobre un valor no cambia nada).
   - Metodos de CATALOGO (materia, docente, curso, division): sincronicos. Son
     tablas chicas; la implementacion SQL las mantiene en cache (preparar()).

   Ver database/sqlserver/README.md para conectar SQL Server. */

import studentRepository from "../students/students.repository.mjs";
import academicRepository from "../academic/academic.repository.mjs";
import teachersRepository from "../teachers/teachers.repository.mjs";
import gradesRepository from "../grades/grades.repository.mjs";
import inasistenciasRepository from "../inasistencias/inasistencias.repository.mjs";
import attendanceAlertsRepository from "../attendance-alerts/attendance-alerts.repository.mjs";
import academicRecordsRepository from "../academic-records/academic-records.repository.mjs";
import courseChangesRepository from "../course-changes/course-changes.repository.mjs";
import workshopsRepository from "../workshops/workshops.repository.mjs";

export function agruparPor(lista, clave) {
  const mapa = new Map();

  for (const item of lista) {
    const valor = item[clave];
    if (!mapa.has(valor)) mapa.set(valor, []);
    mapa.get(valor).push(item);
  }

  return mapa;
}

const studentPortalRepository = {
  motor: "memoria",

  /* La version en memoria no necesita preparar nada. */
  async preparar() {},

  /* ---------------- Catalogos (sincronicos) ------------------------------ */

  materia(id) {
    return academicRepository.findSubjectRefById(id) ?? academicRecordsRepository.findSubjectRefById(id) ?? null;
  },

  docente(id) {
    return id ? teachersRepository.findDocenteById(id) : null;
  },

  curso(id) {
    return id ? academicRepository.findCursoById(id) : null;
  },

  division(id) {
    return id ? academicRepository.findDivisionById(id) : null;
  },

  /* ---------------- Alumno ---------------------------------------------- */

  alumno(id) {
    return studentRepository.findById(id);
  },

  alumnoPorDni(dni) {
    return studentRepository.findByDni(dni);
  },

  contarAlumnosConDni(dni) {
    return studentRepository.all().filter((alumno) => alumno.dni === dni).length;
  },

  /* Todos los alumnos (activos e inactivos), sin paginar: la verificacion
     integral necesita el padron completo. */
  todosLosAlumnos() {
    return studentRepository.all();
  },

  /* ---------------- Estructura academica --------------------------------- */

  matriculas() {
    return academicRepository.listMatricula();
  },

  matriculasDe(alumnoId) {
    return academicRepository.listMatricula().filter((matricula) => matricula.estudianteId === alumnoId);
  },

  /* Materias por alcance de la estructura curricular: Map "division:<id>" o
     "curso:<id>" -> [materiaId]. Se lee una sola vez para todo el padron. */
  relacionesMateria() {
    const mapa = new Map();

    for (const relacion of academicRepository.listSubjectRelations()) {
      const clave = `${relacion.tipo}:${relacion.scopeId}`;
      if (!mapa.has(clave)) mapa.set(clave, []);
      mapa.get(clave).push(relacion.subjectId);
    }

    return mapa;
  },

  /* Asignaciones docentes de la division y de su curso (todos los ciclos). */
  asignacionesDeDivision({ cursoId, divisionId }) {
    const porDivision = divisionId ? teachersRepository.listAsignacionesMateria({ divisionId, estado: "activo" }) : [];
    const porCurso = cursoId ? teachersRepository.listAsignacionesMateria({ cursoId, estado: "activo" }) : [];
    const vistas = new Set();
    return [...porDivision, ...porCurso].filter((asignacion) => !vistas.has(asignacion.id) && vistas.add(asignacion.id));
  },

  taller(id) {
    return id ? workshopsRepository.findById(id) : null;
  },

  /* ---------------- Calificaciones --------------------------------------- */

  calificacionesDe(alumnoId) {
    return gradesRepository.listCalificaciones({ alumnoId, estado: "activo" });
  },

  calificacionesPorAlumno() {
    return agruparPor(gradesRepository.listCalificaciones({ estado: "activo" }), "alumnoId");
  },

  /* ---------------- Asistencia ------------------------------------------- */

  inasistenciasDe(alumnoId) {
    return inasistenciasRepository.list({ alumnoId });
  },

  inasistenciasPorAlumno() {
    return agruparPor(inasistenciasRepository.list({}), "alumnoId");
  },

  registrosAsistenciaDe(alumnoId) {
    return attendanceAlertsRepository.listInasistencias({ alumnoId });
  },

  registrosAsistenciaPorAlumno() {
    return agruparPor(attendanceAlertsRepository.listInasistencias({}), "alumnoId");
  },

  /* ---------------- Situacion academica ---------------------------------- */

  situacionesDe(alumnoId) {
    return academicRecordsRepository.listSituaciones({ alumnoId });
  },

  situacionesPorAlumno() {
    return agruparPor(academicRecordsRepository.listSituaciones({}), "alumnoId");
  },

  /* ---------------- Historial de cursos ---------------------------------- */

  movimientosDe(alumnoId) {
    return courseChangesRepository.listMovimientos({ alumnoId });
  }
};

export default studentPortalRepository;
