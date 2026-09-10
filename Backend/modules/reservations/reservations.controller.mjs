import reservationsService from "./reservations.service.mjs";

export function createReservation({ body, user }) {
  return reservationsService.create(body, user);
}

export function getReservation({ params }) {
  return reservationsService.getById(params.reservationId);
}

export function listReservations({ url, user }) {
  const query = Object.fromEntries(url.searchParams.entries());
  return reservationsService.list(query, user);
}

export function updateReservation({ params, body, user }) {
  return reservationsService.update(params.reservationId, body, user);
}

export function approveReservation({ params }) {
  return reservationsService.approve(params.reservationId);
}

export function rejectReservation({ params }) {
  return reservationsService.reject(params.reservationId);
}

export function cancelReservation({ params }) {
  return reservationsService.cancel(params.reservationId);
}