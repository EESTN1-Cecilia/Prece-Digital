import { createServer } from "node:http";
import { applyCors, isPreflight, METHODS_WITH_BODY } from "../middlewares/cors.middleware.mjs";
import { crearLimitador } from "../middlewares/rate-limit.middleware.mjs";
import { applySecurityHeaders } from "../middlewares/security-headers.middleware.mjs";
import { handleError } from "../middlewares/error.middleware.mjs";
import { notFound } from "../middlewares/not-found.middleware.mjs";
import { matchRoute } from "../routes/index.mjs";
import { errorHttp, solicitudInvalida } from "../utils/api-error.mjs";
import { sendJson } from "../utils/http-response.mjs";
import { readJsonBody } from "../utils/read-body.mjs";
import { recortarRespuesta } from "../modules/preceptor-assignments/alcance.mjs";
import auditService from "../modules/audit/audit.service.mjs";

const METODOS_PERMITIDOS = new Set(["GET", "POST", "PUT", "PATCH", "DELETE"]);

/* Servidor HTTP de la API.

   `rutas` es siempre una lista con la forma de routes/index.mjs:
     { method, path, middlewares?, handler }

   Por cada peticion: headers de seguridad y CORS -> metodo y limite -> resolver ruta -> leer cuerpo -> middlewares -> handler
   -> auditoria -> respuesta. Cualquier error termina en el middleware centralizado. */
export function createApp(rutas) {
  if (!Array.isArray(rutas)) {
    throw new TypeError("createApp espera la lista de rutas (ver routes/index.mjs).");
  }

  const limitar = crearLimitador();

  return createServer(async (request, response) => {
    applySecurityHeaders(response);
    applyCors(request, response);

    if (isPreflight(request)) {
      response.writeHead(204);
      response.end();
      return;
    }

    const ctx = { request, response, url: null, params: {}, user: null, body: {} };

    try {
      if (!METODOS_PERMITIDOS.has(request.method)) {
        response.setHeader("Allow", [...METODOS_PERMITIDOS].join(", "));
        throw errorHttp(405, "METHOD_NOT_ALLOWED", "Metodo HTTP no permitido.");
      }

      /* Base fija: el header Host lo controla el cliente. */
      if (!URL.canParse(request.url ?? "/", "http://localhost")) {
        throw solicitudInvalida("La URL de la solicitud no es valida.");
      }

      const url = new URL(request.url ?? "/", "http://localhost");
      ctx.url = url;

      limitar(request, response, url.pathname);

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

      const payload = recortarRespuesta(ctx.user, await route.handler(ctx));

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
      handleError(error, { request, response, url: ctx.url, user: ctx.user });
    }
  });
}
