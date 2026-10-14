/* Compatibilidad con los modulos que lanzan HttpError(status, code, message, details).
   Extiende ApiError para que el middleware central lo reconozca como error previsto
   y responda con el status y el codigo indicados. */

import { ApiError } from "./api-error.mjs";

export class HttpError extends ApiError {
  constructor(statusCode, code, message, details) {
    super(code, message, { status: statusCode, details });
    this.name = "HttpError";
    this.statusCode = statusCode;
  }
}
