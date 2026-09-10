/* JWT HS256 implementado con node:crypto.
   No depende de librerias externas: firma y verifica el token con HMAC-SHA256
   usando el secreto de la aplicacion (SESSION_SECRET). */

import { createHmac, timingSafeEqual } from "node:crypto";
import { appConfig } from "../config/app.config.mjs";

const SECRETO = appConfig.sessionSecret || "clave-desarrollo-no-usar-en-produccion";

function base64url(texto) {
  return Buffer.from(texto, "utf8").toString("base64url");
}

function desdeBase64url(texto) {
  return Buffer.from(texto, "base64url").toString("utf8");
}

function firmar(cabecera, cuerpo) {
  return createHmac("sha256", SECRETO).update(`${cabecera}.${cuerpo}`).digest("base64url");
}

/* Devuelve un token JWT (HS256) con el payload indicado y expiracion en segundos. */
export function firmarToken(payload, expiracionSegundos = 8 * 60 * 60) {
  const ahora = Math.floor(Date.now() / 1000);
  const cabecera = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const cuerpo = base64url(
    JSON.stringify({
      ...payload,
      iat: ahora,
      exp: ahora + expiracionSegundos
    })
  );
  const firma = firmar(cabecera, cuerpo);

  return `${cabecera}.${cuerpo}.${firma}`;
}

/* Verifica la firma y la expiracion del token. Devuelve el payload o null. */
export function verificarToken(token) {
  if (typeof token !== "string") {
    return null;
  }

  const partes = token.split(".");
  if (partes.length !== 3) {
    return null;
  }

  const [cabecera, cuerpo, firma] = partes;
  const firmaEsperada = firmar(cabecera, cuerpo);

  const esperado = Buffer.from(firmaEsperada, "base64url");
  const recibido = Buffer.from(firma, "base64url");

  if (esperado.length !== recibido.length || !timingSafeEqual(esperado, recibido)) {
    return null;
  }

  try {
    const payload = JSON.parse(desdeBase64url(cuerpo));

    if (typeof payload.exp !== "number" && typeof payload.iat !== "number") {
      return null;
    }

    if (Date.now() / 1000 > payload.exp) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}