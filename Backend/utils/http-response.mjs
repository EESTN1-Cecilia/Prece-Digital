export function sendJson(response, statusCode, payload) {
  const body = JSON.stringify(payload, null, 2);

  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  response.end(body);
}

/* Los controladores devuelven el cuerpo y la API responde 200. Cuando hace falta
   otro codigo (por ejemplo 201 al crear), devuelven conEstado(201, cuerpo). */
export class RespuestaHttp {
  constructor(status, body) {
    this.status = status;
    this.body = body;
  }
}

export function conEstado(status, body) {
  return new RespuestaHttp(status, body);
}
