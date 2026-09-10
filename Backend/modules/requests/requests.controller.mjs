import requestsService from "./requests.service.mjs";

export function createRequest({ body, user }) {
  return requestsService.create(body, user);
}

export function getRequest({ params }) {
  return requestsService.getById(params.requestId);
}

export function listRequests({ url, user }) {
  const query = Object.fromEntries(url.searchParams.entries());
  return requestsService.list(query, user);
}

export function updateRequest({ params, body, user }) {
  return requestsService.update(params.requestId, body, user);
}

export function addComment({ params, body, user }) {
  return requestsService.addComment(params.requestId, body, user);
}

export function listComments({ params }) {
  return requestsService.listComments(params.requestId);
}