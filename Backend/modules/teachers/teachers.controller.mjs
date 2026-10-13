import teachersService from "./teachers.service.mjs";

function query(url) {
  return Object.fromEntries(url.searchParams.entries());
}

/* ---------------- Docentes ------------------------------------------------- */

export function getCatalogos() {
  return teachersService.getCatalogos();
}

export function createTeacher({ body, user }) {
  return teachersService.createDocente(body, user);
}

export function listTeachers({ url, user }) {
  return teachersService.listDocentes(query(url), user);
}

export function getTeacher({ params }) {
  return teachersService.getDocente(params.teacherId);
}

export function updateTeacher({ params, body, user }) {
  return teachersService.updateDocente(params.teacherId, body, user);
}

export function deactivateTeacher({ params, user }) {
  return teachersService.deactivateDocente(params.teacherId, user);
}

export function listTeachersBySubject({ params, url, user }) {
  return teachersService.listDocentesPorMateria(params.subjectId, query(url), user);
}

export function listTeachersByCourse({ params, url, user }) {
  return teachersService.listDocentesPorCurso(params.cursoId, query(url), user);
}

export function listTeachersByDivision({ params, url, user }) {
  return teachersService.listDocentesPorDivision(params.divisionId, query(url), user);
}

/* ---------------- Asignaciones de materia --------------------------------- */

export function addSubjectToTeacher({ params, body, user }) {
  return teachersService.addAsignacionMateria(params.teacherId, body, user);
}

export function listTeacherSubjects({ params, url }) {
  return teachersService.listAsignacionesMateria(params.teacherId, query(url));
}

export function getTeacherSubject({ params }) {
  return teachersService.getAsignacionMateria(params.teacherId, params.assignmentId);
}

export function updateTeacherSubject({ params, body, user }) {
  return teachersService.updateAsignacionMateria(params.assignmentId, body, user);
}

export function removeSubjectFromTeacher({ params, user }) {
  return teachersService.deactivateAsignacionMateria(params.assignmentId, user);
}

/* ---------------- Asignaciones de curso/division -------------------------- */

export function addCourseToTeacher({ params, body, user }) {
  return teachersService.addAsignacionCurso(params.teacherId, body, user);
}

export function listTeacherCourses({ params, url }) {
  return teachersService.listAsignacionesCurso(params.teacherId, query(url));
}

export function getTeacherCourse({ params }) {
  return teachersService.getAsignacionCurso(params.teacherId, params.assignmentId);
}

export function updateTeacherCourse({ params, body, user }) {
  return teachersService.updateAsignacionCurso(params.assignmentId, body, user);
}

export function removeCourseFromTeacher({ params, user }) {
  return teachersService.deactivateAsignacionCurso(params.assignmentId, user);
}
