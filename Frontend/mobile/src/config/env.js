/* Configuracion de la API comun.
   Mobile usa EXACTAMENTE la misma base que el Front Web: no hay URLs hardcodeadas
   por version ni endpoints propios para Mobile. */

const BASE_POR_DEFECTO = "http://localhost:3000";

function leerBaseUrl() {
  const valor =
    typeof process !== "undefined" && process.env
      ? process.env.EXPO_PUBLIC_API_BASE_URL
      : undefined;

  const base = typeof valor === "string" ? valor.trim() : "";

  return (base || BASE_POR_DEFECTO).replace(/\/+$/, "");
}

export const BASE_URL = leerBaseUrl();

export function endpoint(ruta) {
  return `${BASE_URL}${ruta}`;
}