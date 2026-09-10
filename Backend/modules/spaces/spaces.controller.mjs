import spacesService from "./spaces.service.mjs";

export function createBuilding({ body, user }) {
  return spacesService.createBuilding(body, user);
}

export function getBuilding({ params }) {
  return spacesService.getBuilding(params.buildingId);
}

export function listBuildings({ url, user }) {
  const query = Object.fromEntries(url.searchParams.entries());
  return spacesService.listBuildings(query, user);
}

export function updateBuilding({ params, body }) {
  return spacesService.updateBuilding(params.buildingId, body);
}

export function createSpace({ body, user }) {
  return spacesService.createSpace(body, user);
}

export function getSpace({ params }) {
  return spacesService.getSpace(params.spaceId);
}

export function listSpaces({ url, user }) {
  const query = Object.fromEntries(url.searchParams.entries());
  return spacesService.listSpaces(query, user);
}

export function updateSpace({ params, body, user }) {
  return spacesService.updateSpace(params.spaceId, body, user);
}

export function deleteSpace({ params, user }) {
  return spacesService.deleteSpace(params.spaceId, user);
}

export function createCareer({ body, user }) {
  return spacesService.createCareer(body, user);
}

export function getCareer({ params }) {
  return spacesService.getCareer(params.careerId);
}

export function listCareers({ url, user }) {
  const query = Object.fromEntries(url.searchParams.entries());
  return spacesService.listCareers(query, user);
}

export function updateCareer({ params, body }) {
  return spacesService.updateCareer(params.careerId, body);
}