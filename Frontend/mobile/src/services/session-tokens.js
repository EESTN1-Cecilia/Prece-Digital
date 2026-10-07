/* Tokens de sesion de la API comun.
   Solo se guardan el access token y el refresh token que devuelve el Backend.
   Nunca se guarda la contrasena ni datos sensibles del legajo. */

import { borrarSeguro, escribirSeguro, leerSeguro } from "./secure-store.js";

/* Mismas claves semanticas que usa el Front Web, pero sobre el almacen seguro
   del dispositivo en lugar de localStorage. */
const CLAVE_ACCESS_TOKEN = "prece.token";
const CLAVE_REFRESH_TOKEN = "prece.refreshToken";

let accessToken = null;
let refreshToken = null;
let cargaIniciada = false;
let cargaEnCurso = null;

export async function cargarTokensGuardados() {
  if (cargaIniciada) {
    return;
  }

  if (!cargaEnCurso) {
    cargaEnCurso = (async () => {
      const [access, refresh] = await Promise.all([
        leerSeguro(CLAVE_ACCESS_TOKEN),
        leerSeguro(CLAVE_REFRESH_TOKEN)
      ]);

      accessToken = typeof access === "string" && access ? access : null;
      refreshToken = typeof refresh === "string" && refresh ? refresh : null;
      cargaIniciada = true;
    })().finally(() => {
      cargaEnCurso = null;
    });
  }

  return cargaEnCurso;
}

export function leerAccessToken() {
  return accessToken;
}

export function leerRefreshToken() {
  return refreshToken;
}

export function haySesionGuardada() {
  return Boolean(accessToken);
}

export function hayRefreshToken() {
  return Boolean(refreshToken);
}

export async function guardarTokens(tokens) {
  const access = typeof tokens?.accessToken === "string" ? tokens.accessToken : "";
  const refresh = typeof tokens?.refreshToken === "string" ? tokens.refreshToken : "";

  /* Si la API no devuelve ambos tokens la sesion no es valida. */
  if (!access || !refresh) {
    throw new Error("La API no devolvio una sesion valida (accessToken y refreshToken).");
  }

  accessToken = access;
  refreshToken = refresh;
  cargaIniciada = true;

  await Promise.all([
    escribirSeguro(CLAVE_ACCESS_TOKEN, access),
    escribirSeguro(CLAVE_REFRESH_TOKEN, refresh)
  ]);
}

export async function limpiarTokens() {
  accessToken = null;
  refreshToken = null;
  cargaIniciada = true;

  await Promise.all([
    borrarSeguro(CLAVE_ACCESS_TOKEN),
    borrarSeguro(CLAVE_REFRESH_TOKEN)
  ]);
}

/* Solo para pruebas: reinicia el estado en memoria sin tocar el almacen. */
export function reiniciarCacheDeTokens() {
  accessToken = null;
  refreshToken = null;
  cargaIniciada = false;
}