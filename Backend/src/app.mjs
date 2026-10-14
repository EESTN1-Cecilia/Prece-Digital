import { createServer } from "node:http";
import { applyCors, isPreflight, METHODS_WITH_BODY } from "../middlewares/cors.middleware.mjs";
import { handleError } from "../middlewares/error.middleware.mjs";
import { notFound } from "../middlewares/not-found.middleware.mjs";
import { matchRoute } from "../routes/index.mjs";
import { sendJson } from "../utils/http-response.mjs";
import { readJsonBody } from "../utils/read-body.mjs";
import auditService from "../modules/audit/audit.service.mjs";

/* Servidor HTTP de la API.

   `rutas` es siempre una lista con la forma de routes/index.mjs:
     { method, path, middlewares?, handler }

   Por cada peticion: CORS -> resolver ruta -> leer cuerpo -> middlewares -> handler
   -> auditoria -> respuesta. Cualquier error termina en el middleware centralizado. */
export function createApp(rutas) {
  if (!Array.isArray(rutas)) {
    throw new TypeError("createApp espera la lista de rutas (ver routes/index.mjs).");
  }

  return createServer(async (request, response) => {
    applyCors(request, response);

    if (isPreflight(request)) {
      response.writeHead(204);
      response.end();
      return;
    }

    const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);
    const ctx = { request, response, url, params: {}, user: null, body: {} };

    try {
      const route = matchRoute(rutas, request.method, url.pathname);

      if (!route) {
        notFound();
      }

      ctx.params = route.params;

      if (METHODS_WITH_BODY.has(request.method)) {
        ctx.body = await readJsonBody(request);
      }

      for (const middleware of route.middlewares) {
        await middleware(ctx);

        if (response.writableEnded) {
          return;
        }
      }

      const payload = await route.handler(ctx);

      if (response.writableEnded) {
        return;
      }

      auditService.registrarRequest(ctx, payload);

      if (payload && Object.hasOwn(payload, "statusCode") && Object.hasOwn(payload, "body")) {
        sendJson(response, payload.statusCode, payload.body);
        return;
      }

      sendJson(response, 200, payload);
    } catch (error) {
      handleError(error, { request, response, url, user: ctx.user });
    }
  });
}
