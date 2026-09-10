import { solicitudInvalida } from "./api-error.mjs";

/* Limite defensivo: evita que una peticion enorme consuma memoria del proceso. */
const LIMITE_BYTES = 100 * 1024;

export async function leerCuerpoJson(request) {
  const trozos = [];
  let total = 0;

  for await (const trozo of request) {
    total += trozo.length;

    if (total > LIMITE_BYTES) {
      throw solicitudInvalida("El cuerpo de la solicitud es demasiado grande.");
    }

    trozos.push(trozo);
  }

  if (!total) {
    return {};
  }

  try {
    return JSON.parse(Buffer.concat(trozos).toString("utf8"));
  } catch {
    throw solicitudInvalida("El cuerpo de la solicitud no es JSON valido.");
  }
}
