import { appConfig } from "../config/app.config.mjs";

/* X-Forwarded-For lo puede escribir cualquier cliente: solo se usa con TRUST_PROXY
   activo, cuando un proxy propio lo reescribe. Si no, cualquier limite por IP se
   evadiria cambiando el header. */
export function obtenerIpCliente(request, trustProxy = appConfig.trustProxy) {
  const forwarded = request?.headers?.["x-forwarded-for"];

  if (trustProxy && typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0].trim().slice(0, 64);
  }

  return request?.socket?.remoteAddress?.slice(0, 64) ?? "desconocida";
}
