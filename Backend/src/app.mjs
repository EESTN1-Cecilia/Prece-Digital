import { createServer } from "node:http";
import { applyCors } from "../middlewares/cors.middleware.mjs";
import { notFound } from "../middlewares/not-found.middleware.mjs";
import { apiRoutes } from "../routes/index.mjs";
import { sendJson } from "../utils/http-response.mjs";

export function createApp() {
  return createServer((request, response) => {
    applyCors(response);

    const url = new URL(request.url ?? "/", `http://${request.headers.host}`);
    const routeKey = `${request.method} ${url.pathname}`;
    const handler = apiRoutes[routeKey];

    if (!handler) {
      notFound(response);
      return;
    }

    sendJson(response, 200, handler({ request, url }));
  });
}
