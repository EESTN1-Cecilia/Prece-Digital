import { sendJson } from "../utils/http-response.mjs";

export function notFound(response) {
  sendJson(response, 404, {
    error: "not_found",
    message: "Endpoint no disponible"
  });
}
