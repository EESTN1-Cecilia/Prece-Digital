/* Cliente HTTP de Mobile contra la API comun.
   Reutiliza el mismo mecanismo que el Front Web: header Authorization Bearer,
   timeout de 15 s y errores { error: { code, message, details } }.
   No se registran tokens, cabeceras de autenticacion ni cuerpos. */

import { endpoint } from "../config/env.js";
import {
  hayRefreshToken,
  leerAccessToken,
  limpiarTokens
} from "./session-tokens.js";

const TIEMPO_LIMITE_MS = 15000;

export const CODIGOS = {
  SIN_AUTENTICAR: "UNAUTHENTICATED",
  SIN_PERMISOS: "FORBIDDEN",
  VALIDACION: "VALIDATION_ERROR",
  DEMASIADOS_INTENTOS: "TOO_MANY_ATTEMPTS",
  ERROR_INTERNO: "INTERNAL_ERROR",
  CREDENCIALES_INVALIDAS: "INVALID_CREDENTIALS",
  CREDENCIALES_INCOMPLETAS: "INVALID_CREDENTIALS_PAYLOAD",
  ERROR_DE_CONEXION: "NETWORK_ERROR",
  TIEMPO_AGOTADO: "TIMEOUT"
};

const MENSAJES = {
  [CODIGOS.SIN_AUTENTICAR]: "Tu sesión venció o el token no es válido. Volvé a iniciar sesión.",
  [CODIGOS.SIN_PERMISOS]: "No tenés permisos para realizar esta acción.",
  [CODIGOS.VALIDACION]: "Revisá los datos ingresados e intentá nuevamente.",
  [CODIGOS.DEMASIADOS_INTENTOS]: "Demasiados intentos. Esperá unos minutos e intentá nuevamente.",
  [CODIGOS.ERROR_INTERNO]: "Ocurrió un error en el servidor. Intentá nuevamente más tarde.",
  [CODIGOS.CREDENCIALES_INVALIDAS]: "Credenciales incorrectas. Revisá tu correo y contraseña.",
  [CODIGOS.CREDENCIALES_INCOMPLETAS]: "Ingresá tu correo institucional y tu contraseña.",
  [CODIGOS.ERROR_DE_CONEXION]: "No pudimos conectarnos con el servidor. Revisá tu conexión.",
  [CODIGOS.TIEMPO_AGOTADO]: "La solicitud tardó demasiado. Intentá nuevamente."
};

export class ErrorDeApi extends Error {
  constructor({ codigo, mensaje, estado, detalles }) {
    super(mensaje || MENSAJES[codigo] || "Ocurrió un error inesperado.");

    this.name = "ErrorDeApi";
    this.codigo = codigo || CODIGOS.ERROR_INTERNO;
    this.estado = estado || 0;
    this.detalles = detalles || null;
    this.mensaje = this.message;
  }
}

let peticionGlobal = null;
let renovador = null;
let renovacionEnCurso = null;
let registro = null;
const suscriptores = new Set();

/* Solo para pruebas: permite inyectar un fetch controlado. */
export function configurarPeticion(fn) {
  peticionGlobal = fn;
}

/* Solo para pruebas: recibe un unico dato seguro por peticion. */
export function configurarRegistro(fn) {
  registro = fn;
}

export function registrar(metodo, ruta, estado, codigo) {
  if (typeof registro === "function") {
    registro({ metodo, ruta, estado, codigo });
  }
}

export function configurarRenovador(fn) {
  renovador = fn;
}

export function suscribirAEstadoDeSesion(fn) {
  suscriptores.add(fn);

  return function desuscribir() {
    suscriptores.delete(fn);
  };
}

function avisarSesionInvalida() {
  for (const fn of Array.from(suscriptores)) {
    fn();
  }
}

async function invalidarSesion() {
  await limpiarTokens();
  avisarSesionInvalida();
}

function renovarSesionEnCurso() {
  if (renovacionEnCurso) {
    return renovacionEnCurso;
  }

  renovacionEnCurso = Promise.resolve()
    .then(() => renovador())
    .finally(() => {
      renovacionEnCurso = null;
    });

  return renovacionEnCurso;
}

async function ejecutar(url, opciones, metodo) {
  const implementar = peticionGlobal || (typeof fetch === "function" ? fetch : null);

  if (!implementar) {
    throw new ErrorDeApi({
      codigo: CODIGOS.ERROR_DE_CONEXION,
      mensaje: "Este entorno no puede ejecutar solicitudes HTTP."
    });
  }

  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), opciones.tiempoLimiteMs);

  try {
    return await implementar(url, { ...opciones, signal: controlador.signal });
  } catch (fallo) {
    if (fallo && fallo.name === "AbortError") {
      throw new ErrorDeApi({
        codigo: CODIGOS.TIEMPO_AGOTADO,
        estado: 0
      });
    }

    throw new ErrorDeApi({
      codigo: CODIGOS.ERROR_DE_CONEXION,
      estado: 0
    });
  } finally {
    clearTimeout(temporizador);
  }
}

async function leerRespuesta(respuesta, metodo, ruta) {
  const texto = await respuesta.text();

  if (!texto) {
    return null;
  }

  try {
    return JSON.parse(texto);
  } catch {
    return null;
  }
}

/* El Backend responde { data } en recursos y la sesion sin envolver. */
function desenvolver(body) {
  if (body && typeof body === "object" && "data" in body) {
    return body.data;
  }

  return body;
}

export async function pedir(ruta, opciones = {}) {
  const {
    metodo = "GET",
    cuerpo,
    autenticado = true,
    permitirRenovacion = true,
    tiempoLimiteMs = TIEMPO_LIMITE_MS
  } = opciones;

  const cabeceras = { Accept: "application/json" };

  if (cuerpo !== undefined) {
    cabeceras["Content-Type"] = "application/json";
  }

  if (autenticado) {
    const token = leerAccessToken();

    if (!token) {
      throw new ErrorDeApi({ codigo: CODIGOS.SIN_AUTENTICAR, estado: 401 });
    }

    cabeceras.Authorization = `Bearer ${token}`;
  }

  const url = endpoint(ruta);
  const respuesta = await ejecutar(
    url,
    {
      method: metodo,
      headers: cabeceras,
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo)
    },
    metodo
  );

  const body = await leerRespuesta(respuesta, metodo, ruta);
  registrar(metodo, ruta, respuesta.status, body?.error?.code);

  if (respuesta.ok) {
    return desenvolver(body);
  }

  const fallo = new ErrorDeApi({
    codigo: body?.error?.code,
    estado: respuesta.status,
    mensaje: body?.error?.message || MENSAJES[body?.error?.code],
    detalles: body?.error?.details
  });

  /* Token invalido, vencido o revocado: se intenta renovar una sola vez con el
     refresh token. Si tampoco alcanza, se limpia la sesion local. */
  if (fallo.estado === 401 && autenticado && permitirRenovacion && renovador && hayRefreshToken()) {
    let renovado = false;

    try {
      await renovarSesionEnCurso();
      renovado = true;
    } catch {
      renovado = false;
    }

    if (renovado) {
      return pedir(ruta, { ...opciones, permitirRenovacion: false });
    }

    await invalidarSesion();
  }

  throw fallo;
}