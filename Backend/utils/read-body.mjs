import { errorDeValidacion, errorHttp, solicitudInvalida } from "./api-error.mjs";

/* Unico lector del cuerpo JSON de la API. Lo usa src/app.mjs para todas las rutas
   con cuerpo (POST, PUT, PATCH, DELETE) y deja el resultado en `ctx.body`: los
   controladores nunca leen el request directamente.

   Devuelve {} si no hay cuerpo. Limita el tamanio para evitar abuso de memoria. */
const MAX_BODY_BYTES = 1024 * 1024;

/* Claves que cambiarian el prototipo de un objeto al copiarlas con Object.assign. */
const CLAVES_PELIGROSAS = new Set(["__proto__", "constructor", "prototype"]);

/* Los define siempre el backend a partir de la sesion: el cliente no puede enviarlos. */
const CAMPOS_DEL_SERVIDOR = [
  "passwordHash", "password_hash",
  "createdBy", "updatedBy", "creadoPor", "actualizadoPor",
  "createdAt", "updatedAt", "creadoEn", "actualizadoEn", "deletedAt",
  "approvedBy", "rejectedBy", "decidedBy", "ownerId", "requesterId"
];

/* `maxBytes` permite que una ruta puntual (por ejemplo, la que recibe adjuntos en
   base64) declare un limite mayor en routes/index.mjs sin subir el de toda la API. */
export async function readJsonBody(request, { maxBytes = MAX_BODY_BYTES } = {}) {
  const trozos = [];
  let total = 0;

  try {
    for await (const trozo of request) {
      total += trozo.length;

      if (total > maxBytes) {
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

  if (!/^application\/json\b/i.test(request.headers["content-type"] ?? "")) {
    throw errorHttp(415, "UNSUPPORTED_MEDIA_TYPE", "El cuerpo de la solicitud debe enviarse como application/json.");
  }

  let cuerpo;
  let clavePeligrosa = false;

  try {
    cuerpo = JSON.parse(Buffer.concat(trozos).toString("utf8"), (clave, valor) => {
      clavePeligrosa ||= CLAVES_PELIGROSAS.has(clave);
      return valor;
    });
  } catch {
    throw solicitudInvalida("El cuerpo de la solicitud debe ser JSON valido.");
  }

  if (cuerpo === null || typeof cuerpo !== "object" || Array.isArray(cuerpo)) {
    throw solicitudInvalida("El cuerpo de la solicitud debe ser un objeto JSON.");
  }

  if (clavePeligrosa) {
    throw solicitudInvalida("El cuerpo de la solicitud contiene claves no permitidas.");
  }

  const reservados = CAMPOS_DEL_SERVIDOR.filter((campo) => Object.hasOwn(cuerpo, campo));

  if (reservados.length > 0) {
    throw errorDeValidacion(reservados.map((field) => ({ field, message: "Este campo no se puede enviar." })));
  }

  return cuerpo;
}
