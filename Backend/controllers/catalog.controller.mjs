import { getModules, getRoles } from "../services/catalog.service.mjs";

export function listModules() {
  return {
    data: getModules()
  };
}

export function listRoles() {
  return {
    data: getRoles()
  };
}
