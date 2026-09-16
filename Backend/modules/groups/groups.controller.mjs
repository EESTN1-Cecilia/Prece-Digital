import groupsService from "./groups.service.mjs";

function parseQuery(url) {
  return Object.fromEntries(url.searchParams.entries());
}

export function createGroup({ body, user }) {
  return groupsService.createGroup(body, user);
}

export function getGroup({ params }) {
  return groupsService.getGroup(params.groupId);
}

export function listGroups({ url, user }) {
  return groupsService.listGroups(parseQuery(url), user);
}

export function updateGroup({ params, body, user }) {
  return groupsService.updateGroup(params.groupId, body, user);
}

export function activateGroup({ params, user }) {
  return groupsService.setStatus(params.groupId, "activo", user);
}

export function deactivateGroup({ params, user }) {
  return groupsService.setStatus(params.groupId, "inactivo", user);
}

export function finalizeGroup({ params, user }) {
  return groupsService.setStatus(params.groupId, "finalizado", user);
}

export function assignToGroup({ params, body, user }) {
  return groupsService.assign(params.groupId, body, user);
}

export function listGroupsByCourse({ params, user }) {
  return groupsService.listGroupsByCourseOrDivision({ courseId: params.courseId, user });
}

export function listGroupsByDivision({ params, user }) {
  return groupsService.listGroupsByCourseOrDivision({ divisionId: params.divisionId, user });
}

export function addMember({ params, body, user }) {
  return groupsService.addMember(params.groupId, body.studentId, user);
}

export function removeMember({ params, body, user }) {
  return groupsService.removeMember(params.groupId, body.studentId, user);
}

export function listGroupMembers({ params }) {
  return groupsService.listGroupMembers(params.groupId);
}

export function listStudentGroups({ url, params, user }) {
  return groupsService.listStudentGroups(params.studentId, parseQuery(url), user);
}

export function getGroupPlanning({ params }) {
  return groupsService.getGroupPlanning(params.groupId);
}

export function getGroupHistory({ params }) {
  return groupsService.getGroupHistory(params.groupId);
}