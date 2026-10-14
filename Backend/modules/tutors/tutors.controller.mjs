import tutorsService from "./tutors.service.mjs";

export function createTutor({ body, user }) {
  return tutorsService.create(body, user);
}

export function getTutor({ params }) {
  return tutorsService.getById(params.tutorId);
}

export function listTutors({ url, user }) {
  const query = Object.fromEntries(url.searchParams.entries());
  return tutorsService.list(query, user);
}

export function updateTutor({ params, body, user }) {
  return tutorsService.update(params.tutorId, body, user);
}

export function deactivateTutor({ params, user }) {
  return tutorsService.deactivate(params.tutorId, user);
}

export function associateTutor({ params, body, user }) {
  return tutorsService.associate(params.studentId, body, user);
}

export function listStudentTutors({ params, url }) {
  const query = Object.fromEntries(url.searchParams.entries());
  return tutorsService.listStudentTutors(params.studentId, query);
}

export function listTutorStudents({ params, url }) {
  const query = Object.fromEntries(url.searchParams.entries());
  return tutorsService.listTutorStudents(params.tutorId, query);
}

export function updateRelation({ params, body, user }) {
  return tutorsService.updateRelation(params.relationId, body, user);
}

export function unlinkRelation({ params, user }) {
  return tutorsService.unlink(params.relationId, user);
}