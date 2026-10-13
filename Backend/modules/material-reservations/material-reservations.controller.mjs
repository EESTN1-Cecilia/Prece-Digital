import materialReservationsService from "./material-reservations.service.mjs";

export function createReservation({ body, user }) {
  return materialReservationsService.create(body, user);
}

export function getReservation({ params, user }) {
  return materialReservationsService.getById(params.reservationId, user);
}

export function listReservations({ url, user }) {
  const query = Object.fromEntries(url.searchParams.entries());
  return materialReservationsService.list(query, user);
}

export function getAvailability({ url, user }) {
  const query = Object.fromEntries(url.searchParams.entries());
  return materialReservationsService.availability(query, user);
}

export function updateReservation({ params, body, user }) {
  return materialReservationsService.update(params.reservationId, body, user);
}

export function approveReservation({ params, body, user }) {
  return materialReservationsService.aprobar(params.reservationId, body, user);
}

export function rejectReservation({ params, body, user }) {
  return materialReservationsService.rechazar(params.reservationId, body, user);
}

export function cancelReservation({ params, body, user }) {
  return materialReservationsService.cancelar(params.reservationId, body, user);
}

export function deliverReservation({ params, user }) {
  return materialReservationsService.entregar(params.reservationId, user);
}

export function finishReservation({ params, user }) {
  return materialReservationsService.finalizar(params.reservationId, user);
}

export function getReservationHistory({ params, user }) {
  return materialReservationsService.history(params.reservationId, user);
}