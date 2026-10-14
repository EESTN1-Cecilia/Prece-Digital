import materialRequestsService from "./material-requests.service.mjs";

export function createRequest({ body, user }) {
  return materialRequestsService.create(body, user);
}

export function getRequest({ params, user }) {
  return materialRequestsService.getById(params.requestId, user);
}

export function listRequests({ url, user }) {
  const query = Object.fromEntries(url.searchParams.entries());
  return materialRequestsService.list(query, user);
}

export function updateRequest({ params, body, user }) {
  return materialRequestsService.update(params.requestId, body, user);
}

export function changeStatus({ params, body, user }) {
  return materialRequestsService.changeStatus(params.requestId, body, user);
}

export function approveRequest({ params, body, user }) {
  return materialRequestsService.aprobar(params.requestId, body, user);
}

export function rejectRequest({ params, body, user }) {
  return materialRequestsService.rechazar(params.requestId, body, user);
}

export function cancelRequest({ params, body, user }) {
  return materialRequestsService.cancelar(params.requestId, body, user);
}

export function deliverRequest({ params, user }) {
  return materialRequestsService.entregar(params.requestId, user);
}

export function closeRequest({ params, user }) {
  return materialRequestsService.cerrar(params.requestId, user);
}

export function getRequestHistory({ params, user }) {
  return materialRequestsService.history(params.requestId, user);
}