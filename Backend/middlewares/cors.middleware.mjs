const METHODS_WITH_BODY = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function applyCors(request, response) {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
  response.setHeader("Access-Control-Max-Age", "86400");
}

export function isPreflight(request) {
  return request.method === "OPTIONS";
}

export { METHODS_WITH_BODY };
