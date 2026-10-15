import absenceEventsService from "./absence-events.service.mjs";

export function createAbsenceEvent({ body, user }) {
  return absenceEventsService.createAbsenceEvent(body, user);
}

export function getAbsenceEvent({ params }) {
  return absenceEventsService.getEvent(params.eventId);
}

export function getEventByAbsence({ params }) {
  return absenceEventsService.getEventByAbsence(params.absenceId);
}

export function listAbsenceEvents({ url, user }) {
  const query = Object.fromEntries(url.searchParams.entries());
  return absenceEventsService.listEvents(query, user);
}

export function getAffectedClasses({ params }) {
  return absenceEventsService.getAffectedClasses(params.eventId);
}

export function getEventNotifications({ params }) {
  return absenceEventsService.getEventNotifications(params.eventId);
}

export function getClassState({ params }) {
  return absenceEventsService.getClassState(params.eventId);
}

export function getSpaceAvailability({ params }) {
  return absenceEventsService.getSpaceAvailability(params.eventId);
}