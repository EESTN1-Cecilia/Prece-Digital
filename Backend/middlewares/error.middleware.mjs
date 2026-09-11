/* Manejo centralizado de errores.

   Cualquier error que llegue hasta aca se traduce a la respuesta uniforme de la API:

     { "error": { "code": "...", "message": "...", "details": [...] } }

   Los errores previstos (ApiError) conservan su mensaje. Los inesperados se registran
   completos en el log interno y al cliente solo le llega un mensaje generico: nunca
   stack traces, SQL, rutas internas ni datos sensibles. */

import { appConfig } from "../config/app.config.mjs";
import { ApiError, conflicto } from "../utils/api-error.mjs";
import { sendJson } from "../utils/http-response.mjs";
import auditService from "../modules/audit/audit.service.mjs";

/* Errores de MySQL que corresponden a una situacion prevista del negocio. */
const ERRORES_MYSQL = {
  ER_DUP_ENTRY: () => conflicto("Ya existe un registro con esos datos."),
  ER_ROW_IS_REFERENCED_2: () =>
    conflicto("No se puede completar la operacion porque el registro esta en uso."),
  ER_NO_REFERENCED_ROW_2: () => conflicto("Alguno de los datos relacionados no existe.")
};

function comoApiError(error) {
  if (error instanceof ApiError) {
    return error;
  }

  if (Number.isInteger(error?.statusCode)) {
    return new ApiError(error.code ?? "HTTP_ERROR", error.message, {
      status: error.statusCode,
      details: error.details
    });
  }

  const traducir = ERRORES_MYSQL[error?.code];

  return traducir ? traducir() : null;
}

/* El log interno si guarda el detalle tecnico. Nunca incluye cuerpo de la peticion
   ni cabeceras, para no registrar contrasenias ni tokens. Tambien se persiste en
   el log de errores de la auditoria (sin datos sensibles). */
export function registrarError(error, { metodo, ruta, esperado, usuarioId, ip }) {
  const linea = {
    momento: new Date().toISOString(),
    metodo,
    ruta,
    tipo: esperado ? "esperado" : "inesperado",
    code: error?.code ?? null,
    message: error?.message ?? null
  };

  if (esperado) {
    console.warn("[api]", linea);
  } else {
    console.error("[api]", linea, error?.stack ?? "");
  }

  auditService.registrarError({
    usuarioId: usuarioId ?? null,
    metodo,
    ruta,
    tipo: linea.tipo,
    code: linea.code,
    message: linea.message,
    ip: ip ?? null
  });
}

export function handleError(error, { request, response, url }) {
  const metodo = request?.method;
  const ruta = url?.pathname ?? request?.url;
  const previsto = comoApiError(error);

  registrarError(error, {
    metodo,
    ruta,
    esperado: Boolean(previsto),
    usuarioId: request?.usuario?.id ?? null,
    ip: request?.socket?.remoteAddress ?? request?.connection?.remoteAddress ?? null
  });

  if (previsto) {
    sendJson(response, previsto.status, {
      error: {
        code: previsto.code,
        message: previsto.message,
        ...(previsto.details ? { details: previsto.details } : {})
      }
    });
    return;
  }

  /* Error inesperado: el cliente recibe siempre lo mismo. Fuera de produccion se
     agrega el mensaje original para poder diagnosticar durante el desarrollo. */
  sendJson(response, 500, {
    error: {
      code: "INTERNAL_ERROR",
      message: "Ocurrio un problema en el servidor. Intentalo nuevamente mas tarde.",
      ...(appConfig.env === "production" ? {} : { debug: String(error?.message ?? error) })
    }
  });
}

