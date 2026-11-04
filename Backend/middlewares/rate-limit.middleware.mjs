import { appConfig } from "../config/app.config.mjs";
import { errorHttp } from "../utils/api-error.mjs";
import { obtenerIpCliente } from "../utils/client-ip.mjs";

/* Limite de solicitudes por IP con ventana fija, aplicado antes de leer el cuerpo.
   Complementa al bloqueo por intentos fallidos de login-throttle.service.mjs.

   shortcut: el conteo vive en la memoria de cada proceso; con varias instancias
   hay que moverlo a un almacen compartido. */
function grupoDe(metodo, ruta, limites) {
  if (ruta.startsWith("/api/v1/auth/")) return ["auth", limites.auth];
  if (metodo === "GET") return ["lectura", limites.lectura];
  return ["escritura", limites.escritura];
}

export function crearLimitador(limites = appConfig.rateLimit) {
  const contadores = new Map();
  let proximaLimpieza = 0;

  return function limitar(request, response, ruta) {
    const ahora = Date.now();

    if (ahora >= proximaLimpieza) {
      for (const [clave, entrada] of contadores) {
        if (entrada.venceEn <= ahora) contadores.delete(clave);
      }
      proximaLimpieza = ahora + limites.ventanaMs;
    }

    const [grupo, maximo] = grupoDe(request.method, ruta, limites);
    const clave = `${grupo}:${obtenerIpCliente(request)}`;
    let entrada = contadores.get(clave);

    if (!entrada || entrada.venceEn <= ahora) {
      entrada = { cantidad: 0, venceEn: ahora + limites.ventanaMs };
      contadores.set(clave, entrada);
    }

    entrada.cantidad += 1;

    if (entrada.cantidad > maximo) {
      response.setHeader("Retry-After", String(Math.ceil((entrada.venceEn - ahora) / 1000)));
      throw errorHttp(429, "RATE_LIMITED", "Demasiadas solicitudes. Intentalo nuevamente mas tarde.");
    }
  };
}
