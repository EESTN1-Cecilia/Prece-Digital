/* Errores esperados de la API.
   Los servicios y controladores lanzan estos errores y el middleware centralizado
   (middlewares/error.middleware.mjs) los traduce a la respuesta uniforme. */

export const CODIGOS = {
  VALIDATION_ERROR: 422,
  INVALID_REQUEST: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_ERROR: 500
};

export class ApiError extends Error {
  constructor(code, message, { status, details } = {}) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status ?? CODIGOS[code] ?? 500;
    this.details = details ?? null;
    /* Marca los errores previstos: el middleware no los trata como fallos internos. */
    this.esperado = true;
  }
}

/* Datos invalidos con detalle por campo: [{ field, message }]. */
export function errorDeValidacion(details, message = "Los datos enviados no son validos.") {
  return new ApiError("VALIDATION_ERROR", message, { details });
}

export function solicitudInvalida(message = "La solicitud no es valida.") {
  return new ApiError("INVALID_REQUEST", message);
}

/* Mensaje deliberadamente generico: no debe permitir deducir si el usuario existe. */
export function noAutenticado(message = "Credenciales invalidas o sesion expirada.") {
  return new ApiError("UNAUTHENTICATED", message);
}

export function sinPermisos(message = "No tenes permisos para realizar esta accion.") {
  return new ApiError("FORBIDDEN", message);
}

export function noEncontrado(recurso = "El recurso solicitado") {
  return new ApiError("NOT_FOUND", `${recurso} no existe.`);
}

export function conflicto(message = "La operacion entra en conflicto con datos existentes.") {
  return new ApiError("CONFLICT", message);
}
