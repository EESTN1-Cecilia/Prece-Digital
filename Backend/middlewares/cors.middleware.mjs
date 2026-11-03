import { appConfig } from "../config/app.config.mjs";

const METHODS_WITH_BODY = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/* Sin CORS_ORIGINS se permite cualquier origen: solo puede pasar fuera de
   produccion, porque config/app.config.mjs no arranca en produccion sin la lista.
   La API autentica por header Authorization, asi que no habilita credenciales. */
export function applyCors(request, response, origins = appConfig.corsOrigins) {
  if (origins.length === 0) {
    response.setHeader("Access-Control-Allow-Origin", "*");
  } else {
    response.setHeader("Vary", "Origin");

    if (!origins.includes(request.headers.origin)) {
      return;
    }

    response.setHeader("Access-Control-Allow-Origin", request.headers.origin);
  }

  response.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
  response.setHeader("Access-Control-Expose-Headers", "Retry-After");
  response.setHeader("Access-Control-Max-Age", "86400");
}

export function isPreflight(request) {
  return request.method === "OPTIONS";
}

export { METHODS_WITH_BODY };
