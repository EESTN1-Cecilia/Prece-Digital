/* Configuracion de la API comun.
   Mobile usa EXACTAMENTE la misma base que el Front Web: no hay URLs hardcodeadas
   por version ni endpoints propios para Mobile. */

const BASE_POR_DEFECTO = "http://localhost:3000";

export function esUrlSegura(url) {
  return /^https:\/\//i.test(String(url ?? ""));
}

function leerEntorno() {
  const valor =
    typeof process !== "undefined" && process.env
      ? process.env.EXPO_PUBLIC_APP_ENV
      : undefined;

  return typeof valor === "string" ? valor.trim().toLowerCase() : "development";
}

function leerBaseUrl() {
  const valor =
    typeof process !== "undefined" && process.env
      ? process.env.EXPO_PUBLIC_API_BASE_URL
      : undefined;

  const base = ((typeof valor === "string" ? valor.trim() : "") || BASE_POR_DEFECTO).replace(/\/+$/, "");

  /* Seguridad: en produccion los tokens y las notas nunca viajan en claro. */
  if (leerEntorno() === "production" && !esUrlSegura(base)) {
    throw new Error("En produccion EXPO_PUBLIC_API_BASE_URL debe usar https://.");
  }

  return base;
}

export const BASE_URL = leerBaseUrl();

/* La base puede ajustarse al arrancar en desarrollo (ver api-host.js) para que
   el celular, el emulador y el navegador lleguen al mismo Backend de la PC. */
let baseActual = BASE_URL;

export function baseUrlActual() {
  return baseActual;
}

export function configurarBaseUrl(url) {
  const limpia = String(url ?? "").trim().replace(/\/+$/, "");

  if (!/^https?:\/\//i.test(limpia)) {
    throw new Error("La URL de la API debe empezar con http:// o https://.");
  }

  if (leerEntorno() === "production" && !esUrlSegura(limpia)) {
    throw new Error("En produccion la API debe usar https://.");
  }

  baseActual = limpia;
}

/* True si el entorno fijo la URL a mano (EXPO_PUBLIC_API_BASE_URL). */
export function baseUrlFijadaPorEntorno() {
  const valor =
    typeof process !== "undefined" && process.env
      ? process.env.EXPO_PUBLIC_API_BASE_URL
      : undefined;

  return typeof valor === "string" && valor.trim() !== "";
}

export function esDesarrollo() {
  return leerEntorno() !== "production";
}

export function endpoint(ruta) {
  return `${baseActual}${ruta}`;
}