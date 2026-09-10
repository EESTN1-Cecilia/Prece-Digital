import workshopsService from "./workshops.service.mjs";

export function createWorkshop({ body, user }) {
  return workshopsService.create(body, user);
}

export function getWorkshop({ params }) {
  return workshopsService.getById(params.workshopId);
}

export function listWorkshops({ url, user }) {
  const query = Object.fromEntries(url.searchParams.entries());
  return workshopsService.list(query, user);
}

export function updateWorkshop({ params, body }) {
  return workshopsService.update(params.workshopId, body);
}

export function deactivateWorkshop({ params }) {
  return workshopsService.deactivate(params.workshopId);
}

export function createSession({ body, user }) {
  return workshopsService.createSession(body, user);
}

export function getSession({ params }) {
  return workshopsService.getSession(params.sessionId);
}

export function listSessions({ url, user }) {
  const query = Object.fromEntries(url.searchParams.entries());
  return workshopsService.listSessions(query, user);
}

export function updateSession({ params, body }) {
  return workshopsService.updateSession(params.sessionId, body);
}