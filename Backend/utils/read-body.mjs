import { errorHttp, solicitudInvalida } from "./api-error.mjs";

/* Unico lector del cuerpo JSON de la API. Lo usa src/app.mjs para todas las rutas
   con cuerpo (POST, PUT, PATCH, DELETE) y deja el resultado en `ctx.body`: los
   controladores nunca leen el request directamente.

   Devuelve {} si no hay cuerpo. Limita el tamanio para evitar abuso de memoria. */
const MAX_BODY_BYTES = 1024 * 1024;

export async function readJsonBody(request) {
  const trozos = [];
  let total = 0;

  try {
    for await (const trozo of request) {
      total += trozo.length;

      if (total > MAX_BODY_BYTES) {
        throw errorHttp(413, "PAYLOAD_TOO_LARGE", "El cuerpo de la solicitud supera el limite permitido.");
      }

      trozos.push(trozo);
    }
  } catch (error) {
    if (error?.code === "PAYLOAD_TOO_LARGE") {
      throw error;
    }

    throw solicitudInvalida("No se pudo leer el cuerpo de la solicitud.");
  }

  if (!total) {
    return {};
  }

  try {
    return JSON.parse(Buffer.concat(trozos).toString("utf8"));
  } catch {
    throw solicitudInvalida("El cuerpo de la solicitud debe ser JSON valido.");
  }
}
