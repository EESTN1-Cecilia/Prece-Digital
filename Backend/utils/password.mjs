/* Hash seguro de contrasenas con scrypt (node:crypto).
   Formato almacenado: scrypt:costo:salt_base64:hash_base64 */

import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);
const COSTO = 16384;

export async function hashContrasena(contrasena) {
  const salt = randomBytes(16);
  const derivada = await scryptAsync(contrasena, salt, 64, { N: COSTO });

  return `scrypt:${COSTO}:${salt.toString("base64url")}:${derivada.toString("base64url")}`;
}

export async function verificarContrasena(contrasena, almacenada) {
  const [algoritmo, costo, saltB64, hashB64] = String(almacenada ?? "").split(":");

  if (algoritmo !== "scrypt" || !saltB64 || !hashB64) {
    return false;
  }

  const salt = Buffer.from(saltB64, "base64url");
  const esperado = Buffer.from(hashB64, "base64url");

  let derivada;
  try {
    derivada = await scryptAsync(contrasena, salt, esperado.length, { N: Number(costo) });
  } catch {
    return false;
  }

  return timingSafeEqual(derivada, esperado);
}