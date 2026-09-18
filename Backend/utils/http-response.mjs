/* Forma de respuesta de los controladores.

   - Devolver `{ data }` (o cualquier objeto) responde 200.
   - Para otro codigo, devolver `{ statusCode, body }`, por ejemplo
     `{ statusCode: 201, body: { data: registro } }`.

   src/app.mjs es el unico lugar que escribe la respuesta HTTP. */

export function sendJson(response, statusCode, payload) {
  const body = JSON.stringify(payload, null, 2);

  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  response.end(body);
}
