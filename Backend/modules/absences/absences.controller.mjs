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

export function updateAbsence({ params, body, user }) {
  return absencesService.updateAbsence(params.absenceId, body, user);
}

export function annulAbsence({ params, user }) {
  return absencesService.annulAbsence(params.absenceId, user);
}

export function reactivateAbsence({ params, user }) {
  return absencesService.reactivateAbsence(params.absenceId, user);
}

export function getAbsenceHistory({ params }) {
  return absencesService.getAbsenceHistory(params.absenceId);
}

export function getAbsenceAvailability({ params }) {
  return absencesService.getAbsenceAvailability(params.absenceId);
}

export function listAvailableSpaces({ url, user }) {
  const query = Object.fromEntries(url.searchParams.entries());
  return absencesService.listAvailableSpaces(query, user);
}

export function updateAvailabilityStatus({ params, body, user }) {
  return absencesService.updateAbsenceAvailabilityStatus(params.availabilityId, body, user);
}

export function listAffectedActivities({ url, user }) {
  const query = Object.fromEntries(url.searchParams.entries());
  return absencesService.listAffectedActivities(query, user);
}

export function getGrid({ url, user }) {
  const query = Object.fromEntries(url.searchParams.entries());
  return absencesService.getGrid(query, user);
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