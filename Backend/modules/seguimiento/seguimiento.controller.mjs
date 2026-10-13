import seguimientoService from "./seguimiento.service.mjs";

export function createSubject({ body, user }) {
  return seguimientoService.createSubject(body, user);
}

export function getSubject({ params }) {
  return seguimientoService.getSubject(params.subjectId);
}

export function listSubjects({ url, user }) {
  const query = Object.fromEntries(url.searchParams.entries());
  return seguimientoService.listSubjects(query, user);
}

export function updateSubject({ params, body }) {
  return seguimientoService.updateSubject(params.subjectId, body);
}

export function createDesign({ body, user }) {
  return seguimientoService.createDesign(body, user);
}

export function getDesign({ params }) {
  return seguimientoService.getDesign(params.designId);
}

export function listDesigns({ url, user }) {
  const query = Object.fromEntries(url.searchParams.entries());
  return seguimientoService.listDesigns(query, user);
}

export function updateDesign({ params, body }) {
  return seguimientoService.updateDesign(params.designId, body);
}

export function createContent({ body, user }) {
  return seguimientoService.createContent(body, user);
}

export function getContent({ params }) {
  return seguimientoService.getContent(params.contentId);
}

export function listContents({ url, user }) {
  const query = Object.fromEntries(url.searchParams.entries());
  return seguimientoService.listContents(query, user);
}

export function listPendingContents({ url, user }) {
  const query = Object.fromEntries(url.searchParams.entries());
  return seguimientoService.listPendingContents(query, user);
}

export function updateContent({ params, body, user }) {
  return seguimientoService.updateContent(params.contentId, body, user);
}

export function createTracking({ body, user }) {
  return seguimientoService.createTracking(body, user);
}

export function getTracking({ params }) {
  return seguimientoService.getTracking(params.trackingId);
}

export function listTrackings({ url, user }) {
  const query = Object.fromEntries(url.searchParams.entries());
  return seguimientoService.listTrackings(query, user);
}

export function updateTracking({ params, body, user }) {
  return seguimientoService.updateTracking(params.trackingId, body, user);
}

export function getContentHistory({ params }) {
  return seguimientoService.getContentHistory(params.contentId);
}

export function listContentTrackings({ params, user }) {
  return seguimientoService.listContentTrackings(params.contentId, user);
}

export function avanceMateria({ url, user }) {
  const query = Object.fromEntries(url.searchParams.entries());
  return seguimientoService.avanceMateria(query, user);
}

export function avanceCurso({ url, user }) {
  const query = Object.fromEntries(url.searchParams.entries());
  return seguimientoService.avanceCurso(query, user);
}

export function avanceDocente({ url, user }) {
  const query = Object.fromEntries(url.searchParams.entries());
  return seguimientoService.avanceDocente(query, user);
}

export function avancePeriodo({ url, user }) {
  const query = Object.fromEntries(url.searchParams.entries());
  return seguimientoService.avancePeriodo(query, user);
}

export function avancePendientes({ url, user }) {
  const query = Object.fromEntries(url.searchParams.entries());
  return seguimientoService.avancePendientes(query, user);
}