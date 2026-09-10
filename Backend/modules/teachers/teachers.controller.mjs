import teachersService from "./teachers.service.mjs";

export function createTeacher({ body, user }) {
  return teachersService.create(body, user);
}

export function getTeacher({ params }) {
  return teachersService.getById(params.teacherId);
}

export function listTeachers({ url, user }) {
  const query = Object.fromEntries(url.searchParams.entries());
  return teachersService.list(query, user);
}

export function updateTeacher({ params, body }) {
  return teachersService.update(params.teacherId, body);
}

export function deactivateTeacher({ params }) {
  return teachersService.deactivate(params.teacherId);
}

export function addSubjectToTeacher({ params, body, user }) {
  return teachersService.addSubject(params.teacherId, body, user);
}

export function removeSubjectFromTeacher({ params }) {
  return teachersService.removeSubject(params.assignmentId);
}

export function listTeacherSubjects({ url, user }) {
  const query = Object.fromEntries(url.searchParams.entries());
  return teachersService.listSubjects(query, user);
}