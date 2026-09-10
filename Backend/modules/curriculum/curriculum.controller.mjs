import curriculumService from "./curriculum.service.mjs";

export function createArea({ body, user }) {
  return curriculumService.createArea(body, user);
}

export function getArea({ params }) {
  return curriculumService.getArea(params.areaId);
}

export function listAreas({ url, user }) {
  const query = Object.fromEntries(url.searchParams.entries());
  return curriculumService.listAreas(query, user);
}

export function updateArea({ params, body }) {
  return curriculumService.updateArea(params.areaId, body);
}

export function createPlan({ body, user }) {
  return curriculumService.createPlan(body, user);
}

export function getPlan({ params }) {
  return curriculumService.getPlan(params.planId);
}

export function listPlans({ url, user }) {
  const query = Object.fromEntries(url.searchParams.entries());
  return curriculumService.listPlans(query, user);
}

export function updatePlan({ params, body }) {
  return curriculumService.updatePlan(params.planId, body);
}

export function createActivity({ body, user }) {
  return curriculumService.createActivity(body, user);
}

export function getActivity({ params }) {
  return curriculumService.getActivity(params.activityId);
}

export function listActivities({ url }) {
  const query = Object.fromEntries(url.searchParams.entries());
  return curriculumService.listActivities(query);
}

export function updateActivity({ params, body }) {
  return curriculumService.updateActivity(params.activityId, body);
}