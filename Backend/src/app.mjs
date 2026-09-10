import { createServer } from "node:http";
import { applyCors, isPreflight, METHODS_WITH_BODY } from "../middlewares/cors.middleware.mjs";
import { handleError } from "../middlewares/error.middleware.mjs";
import { notFound } from "../middlewares/not-found.middleware.mjs";
import { matchRoute } from "../routes/index.mjs";
import { RespuestaHttp, sendJson } from "../utils/http-response.mjs";
import { readJsonBody } from "../utils/read-body.mjs";

export function createApp(rutas = {}, { pool } = {}) {
  return createServer(async (request, response) => {
    applyCors(request, response);

    if (isPreflight(request)) {
      response.writeHead(204);
      response.end();
      return;
    }

    const url = new URL(request.url ?? "/", `http://${request.headers.host}`);

    try {
      const route = resolveRoute(rutas, request.method, url.pathname);

      if (!route) {
        notFound();
      }

      const ctx = {
        request,
        response,
        url,
        params: route.params,
        pool,
        user: null,
        body: {}
      };

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

      if (payload instanceof RespuestaHttp) {
        sendJson(response, payload.status, payload.body);
        return;
      }

      if (payload && Object.hasOwn(payload, "statusCode") && Object.hasOwn(payload, "body")) {
        sendJson(response, payload.statusCode, payload.body);
        return;
      }

      sendJson(response, 200, payload);
    } catch (error) {
      handleError(error, { request, response, url });
    }
  });
}

function resolveRoute(rutas, method, pathname) {
  if (Array.isArray(rutas)) {
    return matchRoute(method, pathname);
  }

  return resolveRouteMap(rutas, method, pathname);
}

function resolveRouteMap(rutas, method, pathname) {
  const exact = rutas[`${method} ${pathname}`];

  if (exact) {
    return {
      handler: exact,
      params: {},
      middlewares: []
    };
  }

  const pathTokens = pathname.split("/").filter(Boolean);

  for (const [key, handler] of Object.entries(rutas)) {
    const [routeMethod, pattern] = key.split(" ");

    if (routeMethod !== method || !pattern?.includes(":")) {
      continue;
    }

    const patternTokens = pattern.split("/").filter(Boolean);

    if (patternTokens.length !== pathTokens.length) {
      continue;
    }

    const params = {};
    let matches = true;

    for (let index = 0; index < patternTokens.length; index++) {
      const patternToken = patternTokens[index];
      const pathToken = pathTokens[index];

      if (patternToken.startsWith(":")) {
        params[patternToken.slice(1)] = decodeURIComponent(pathToken);
        continue;
      }

      if (patternToken !== pathToken) {
        matches = false;
        break;
      }
    }

    if (matches) {
      return {
        handler,
        params,
        middlewares: []
      };
    }
  }

  return null;
}
