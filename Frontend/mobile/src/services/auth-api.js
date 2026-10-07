/* Servicios de autenticacion de Mobile.
   Usan los endpoints reales de la API comun. Mobile no valida contrasenas ni
   crea tokens: solo los recibe, los guarda y los reenvia. */

import { CODIGOS, ErrorDeApi, configurarRenovador, pedir } from "./api.js";
import {
  guardarTokens,
  leerRefreshToken,
  limpiarTokens
} from "./session-tokens.js";

const RUTA_LOGIN = "/api/v1/auth/login";
const RUTA_REFRESH = "/api/v1/auth/refresh";
const RUTA_LOGOUT = "/api/v1/auth/logout";
const RUTA_ME = "/api/v1/auth/me";

function aLista(valor) {
  return Array.isArray(valor) ? valor : [];
}

/* El Backend devuelve el mismo payload en login, refresh y /auth/me:
   usuario, roles, permisos y alcances. Se normaliza para la interfaz. */
function normalizarSesion(payload) {
  return {
    usuario: payload?.user ?? payload?.usuario ?? payload ?? null,
    roles: aLista(payload?.roles),
    permisos: aLista(payload?.permisos),
    alcances: aLista(payload?.alcances)
  };
}

export async function iniciarSesion({ email, password }) {
  const payload = await pedir(RUTA_LOGIN, {
    metodo: "POST",
    cuerpo: { email, password },
    autenticado: false,
    permitirRenovacion: false
  });

  await guardarTokens(payload);

  return normalizarSesion(payload);
}

export async function refrescarSesion() {
  const refreshToken = leerRefreshToken();

  if (!refreshToken) {
    throw new ErrorDeApi({ codigo: CODIGOS.SIN_AUTENTICAR, estado: 401 });
  }

  const payload = await pedir(RUTA_REFRESH, {
    metodo: "POST",
    cuerpo: { refreshToken },
    autenticado: false,
    permitirRenovacion: false
  });

  await guardarTokens(payload);

  return normalizarSesion(payload);
}

export async function obtenerSesion() {
  return normalizarSesion(await pedir(RUTA_ME));
}

/* Logout real: revoca el refresh token en el Backend y ademas limpia los tokens
   locales. Si la red falla, la sesion local se borra igual. */
export async function cerrarSesion() {
  const refreshToken = leerRefreshToken();

  try {
    if (refreshToken) {
      await pedir(RUTA_LOGOUT, {
        metodo: "POST",
        cuerpo: { refreshToken },
        autenticado: false,
        permitirRenovacion: false
      });
    }
  } finally {
    await limpiarTokens();
  }
}

/* El cliente HTTP usa esta funcion para renovar un access token vencido sin
   crear un segundo mecanismo de sesion. */
configurarRenovador(refrescarSesion);