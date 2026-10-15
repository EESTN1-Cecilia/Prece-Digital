import reassignmentsService from "./reassignments.service.mjs";

function parseQuery(url) {
  return Object.fromEntries(url.searchParams.entries());
}

export function createReassignment({ body, user }) {
  return reassignmentsService.createReassignment(body, user);
}

export function getReassignment({ params }) {
  return reassignmentsService.getReassignment(params.reassignmentId);
}

export function listReassignments({ url, user }) {
  return reassignmentsService.listReassignments(parseQuery(url), user);
}

export function updateReassignment({ params, body, user }) {
  return reassignmentsService.updateReassignment(params.reassignmentId, body, user);
}

export function revertReassignment({ params, user }) {
  return reassignmentsService.revertReassignment(params.reassignmentId, user);
}

export function getCurrentSpace({ params, url }) {
  return reassignmentsService.getCurrentSpace(params.assignmentId, parseQuery(url));
}

export function listReassignmentsByActivity({ params, url, user }) {
  return reassignmentsService.listReassignmentsByActivity(params.assignmentId, parseQuery(url), user);
}