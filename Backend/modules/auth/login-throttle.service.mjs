/* Limite de intentos de inicio de sesion para reducir el riesgo de fuerza bruta.

   Lleva el conteo por cuenta (email) y por origen (IP). Cuando una de las dos
   llaves alcanza el maximo de intentos dentro de la ventana, se bloquea el login
   por un lapso fijo y cualquier intento posterior responde 429, sin distinguir
   datos que permitan deducir si la cuenta existe. */

import { getStore } from "../../database/memory-store.mjs";
import { appConfig } from "../../config/app.config.mjs";
import { HttpError } from "../../utils/http-error.mjs";

const WINDOW_MS = appConfig.loginWindowMs;
const LOCK_MS = appConfig.loginLockMs;

function normalizeEmail(email) {
  return String(email ?? "").trim().toLowerCase();
}

function sanitizeIp(ip) {
  return typeof ip === "string" && ip.trim() ? ip.trim().slice(0, 64) : "desconocida";
}

function keyEmails(email) {
  return `email:${normalizeEmail(email)}`;
}

function keyIp(ip) {
  return `ip:${sanitizeIp(ip)}`;
}

/* Devuelve la entrada vigente o elimina las que ya no aplican. */
function readEntry(key) {
  const entry = getStore().loginAttempts.get(key);

  if (!entry) {
    return null;
  }

  const now = Date.now();

  if (entry.lockedUntil && entry.lockedUntil <= now) {
    getStore().loginAttempts.delete(key);
    return null;
  }

  if (entry.windowStartedAt + WINDOW_MS <= now) {
    getStore().loginAttempts.delete(key);
    return null;
  }

  return entry;
}

/* Segundos de bloqueo restante de una entrada, o 0 si no hay bloqueo. */
function remainingLock(entry) {
  if (!entry) {
    return 0;
  }

  const now = Date.now();

  if (entry.lockedUntil && entry.lockedUntil > now) {
    return Math.ceil((entry.lockedUntil - now) / 1000);
  }

  return 0;
}

/* Registra un intento fallido. Al superar el limite queda bloqueada la llave. */
function markFailure(key, limit) {
  const entry = readEntry(key);
  const now = Date.now();

  if (!entry) {
    getStore().loginAttempts.set(key, { count: 1, windowStartedAt: now, lockedUntil: null });
    return;
  }

  entry.count += 1;

  if (entry.count >= limit) {
    entry.lockedUntil = now + LOCK_MS;
  }
}

export function obtenerIpCliente(request) {
  if (!request || typeof request.headers !== "object") {
    return "desconocida";
  }

  const forwarded = request.headers["x-forwarded-for"];

  if (typeof forwarded === "string" && forwarded.trim()) {
    return sanitizeIp(forwarded.split(",")[0].trim());
  }

  return sanitizeIp(request.socket?.remoteAddress);
}

/* Si la cuenta o el origen estan bloqueados, responde 429 con el mismo mensaje
   generico. Debe llamarse antes de comparar la contrasena. */
export function revisarLogin(email, ip) {
  const bloqueoEmail = remainingLock(readEntry(keyEmails(email)));
  const bloqueoIp = remainingLock(readEntry(keyIp(ip)));

  if (bloqueoEmail || bloqueoIp) {
    const retryAfter = Math.max(bloqueoEmail, bloqueoIp);

    throw new HttpError(429, "TOO_MANY_ATTEMPTS", "Demasiados intentos de inicio de sesion. Intente nuevamente mas tarde", { retryAfter });
  }
}

/* Registra un intento fallido. La llave por email solo se cuenta para cuentas
   reales, para no permitir bloquear emails inexistentes ni revelar cuales existen. */
export function registrarFalloLogin(email, ip, { trackEmail = false } = {}) {
  if (trackEmail && email) {
    markFailure(keyEmails(email), appConfig.loginMaxEmailAttempts);
  }

  markFailure(keyIp(ip), appConfig.loginMaxIpAttempts);
}

/* Un login exitoso despeja el conteo de esa cuenta. */
export function registrarLoginExitoso(email) {
  if (email) {
    getStore().loginAttempts.delete(keyEmails(email));
  }
}
