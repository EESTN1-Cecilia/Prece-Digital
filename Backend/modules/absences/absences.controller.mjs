import absencesService from "./absences.service.mjs";

export function createAbsence({ body, user }) {
  return absencesService.createAbsence(body, user);
}

export function getAbsence({ params }) {
  return absencesService.getAbsence(params.absenceId);
}

export function listAbsences({ url, user }) {
  const query = Object.fromEntries(url.searchParams.entries());
  return absencesService.listAbsences(query, user);
}

export function updateAbsence({ params, body }) {
  return absencesService.updateAbsence(params.absenceId, body);
}

export function deleteAbsence({ params }) {
  return absencesService.deleteAbsence(params.absenceId);
}

export function createIncident({ body, user }) {
  return absencesService.createIncident(body, user);
}

export function getIncident({ params }) {
  return absencesService.getIncident(params.incidentId);
}

export function listIncidents({ url, user }) {
  const query = Object.fromEntries(url.searchParams.entries());
  return absencesService.listIncidents(query, user);
}

export function updateIncident({ params, body }) {
  return absencesService.updateIncident(params.incidentId, body);
}