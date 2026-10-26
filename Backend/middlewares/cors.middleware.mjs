const METHODS_WITH_BODY = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function applyCors(request, response) {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
  response.setHeader("Access-Control-Max-Age", "86400");
  /* Sin esto el navegador no deja leer al frontend las cabeceras de las
     respuestas que no son simples (por ejemplo el nombre del PDF exportado en
     Content-Disposition). */
  response.setHeader("Access-Control-Expose-Headers", "Content-Disposition, Content-Length, Content-Type");
}

export function isPreflight(request) {
  return request.method === "OPTIONS";
}

export { METHODS_WITH_BODY };
