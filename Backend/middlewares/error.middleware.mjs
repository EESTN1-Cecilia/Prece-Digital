/* Manejo centralizado de errores.

   Cualquier error que llegue hasta aca se traduce a la respuesta uniforme de la API:

     { "error": { "code": "...", "message": "...", "details": [...] } }

   Los errores previstos (ApiError, la unica clase de error de la API) conservan su mensaje. Los inesperados se registran
   completos en el log interno y al cliente solo le llega un mensaje generico: nunca
   stack traces, SQL, rutas internas ni datos sensibles. */

import { appConfig } from "../config/app.config.mjs";
import { ApiError } from "../utils/api-error.mjs";
import { sendJson } from "../utils/http-response.mjs";
import auditService from "../modules/audit/audit.service.mjs";

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

export function handleError(error, { request, response, url, user }) {
  const metodo = request?.method;
  const ruta = url?.pathname ?? request?.url;
  const previsto = error instanceof ApiError ? error : null;

  registrarError(error, {
    metodo,
    ruta,
    esperado: Boolean(previsto),
    usuarioId: user?.id ?? null,
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

