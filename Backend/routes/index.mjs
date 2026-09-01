import { listModules, listRoles } from "../controllers/catalog.controller.mjs";
import { healthCheck } from "../controllers/health.controller.mjs";

export const apiRoutes = {
  "GET /health": healthCheck,
  "GET /api/v1/modules": listModules,
  "GET /api/v1/roles": listRoles
};
