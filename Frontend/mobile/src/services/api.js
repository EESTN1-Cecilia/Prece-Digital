/* Cliente HTTP de Mobile contra la API comun.
   Reutiliza el mismo mecanismo que el Front Web: header Authorization Bearer,
   timeout de 15 s y errores { error: { code, message, details } }.
   No se registran tokens, cabeceras de autenticacion ni cuerpos. */

import { endpoint } from "../config/env.js";
import {
  hayRefreshToken,
  haySesionGuardada,
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

/* Mensajes curados para 401: el Backend usa el mismo estado HTTP para casos
   distintos y cada uno merece su propia instruccion. INVALID_CREDENTIALS no
   entra aca: el mensaje del Backend ya explica el caso y no debe traducirse
   al perder el matiz de que no se revela si el email existe. */
const MENSAJES_401 = {
  MISSING_TOKEN: "Necesitás iniciar sesión para realizar esta acción.",
  INVALID_TOKEN: MENSAJES[CODIGOS.SIN_AUTENTICAR],
  ACCOUNT_INACTIVE: "Tu cuenta está desactivada. Contactá a la administración."
};

/* Mensaje para errores HTTP sin codigo conocido del Backend: se indica el estado
   real sin inventar categorias nuevas. */
function mensajePorEstado(estado) {
  if (estado && estado >= 500) {
    return MENSAJES[CODIGOS.ERROR_INTERNO];
  }

  if (estado) {
    return `No se pudo completar la operación (${estado}).`;
  }

  return "Ocurrió un error inesperado.";
}

/* Un mensaje del backend solo se muestra tal cual si esta escrito para una
   persona: se descartan stack traces, SQL, rutas internas y excepciones. */
export function esMensajeApto(texto) {
  if (typeof texto !== "string") {
    return false;
  }

  const limpio = texto.trim();

  if (limpio.length === 0 || limpio.length > 200 || limpio.includes("\n")) {
    return false;
  }

  return !/(sql|sqlite|constraint|exception|traceback|stack|errno|\bat\s+\w+\s*\(|node_modules|[a-z]:\\|\/(usr|var|home|src)\/|select\s+.+\s+from\s)/i.test(
    limpio
  );
}

/* Errores por campo para formularios, desde el formato real del Backend
   { error: { details: [{ field, message }] } }. Se aceptan ademas las formas
   sueltas ({ errores: { campo: mensaje } }) por si algun endpoint no migro. */
const CLAVES_DE_CONTROL = new Set(["permission", "permiso", "roles", "context", "alcance"]);

export function camposDeError(cuerpo) {
  const crudo = Array.isArray(cuerpo)
    ? cuerpo
    : (cuerpo?.error?.details ?? cuerpo?.campos ?? cuerpo?.errores ?? cuerpo?.errors ?? cuerpo?.fields);

  if (!crudo) {
    return null;
  }

  const entradas = Array.isArray(crudo)
    ? crudo.map((item) => [item?.campo ?? item?.field, item?.mensaje ?? item?.message])
    : Object.entries(crudo).map(([campo, valor]) => [
      campo,
      typeof valor === "string" ? valor : (valor?.mensaje ?? valor?.message)
    ]);

  const campos = Object.fromEntries(
    entradas.filter(([campo, mensaje]) => campo && esMensajeApto(mensaje) && !CLAVES_DE_CONTROL.has(campo))
  );

  return Object.keys(campos).length ? campos : null;
}

export class ErrorDeApi extends Error {
  constructor({ codigo, mensaje, estado, detalles }) {
    super(mensaje || MENSAJES[codigo] || mensajePorEstado(estado));

    this.name = "ErrorDeApi";
    this.mensaje = this.message;
    /* Codigo estable del Backend (VALIDATION_ERROR, FORBIDDEN, INVALID_TOKEN, ...).
       Los errores de transporte sin respuesta HTTP usan NETWORK_ERROR o TIMEOUT.
       Un error HTTP sin codigo conocido queda en null: el estado viaja aparte y
       no se fuerza a ERROR_INTERNO a errores de otro tipo. */
    this.codigo = codigo || null;
    this.estado = estado || 0;
    /* `detalles` conserva el valor crudo de error.details. `campos` es la version
       lista para formularios ({ campo: mensaje }); `permiso` se completa solo si
       el Backend reporto el nombre del permiso rechazado en details.permission. */
    this.detalles = detalles || null;
    this.campos = camposDeError(detalles);
    this.permiso = typeof detalles?.permission === "string" ? detalles.permission : null;
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

/* Invalida la sesion una sola vez por vencimiento: si los tokens ya estan
   limpios (otro pedido concurrente ya hizo la limpieza) no se vuelve a avisar,
   ni siquiera si la limpieza anterior sigue en curso (se comparte la promesa). */
let invalidacionEnCurso = null;

async function invalidarSesion() {
  if (!haySesionGuardada() && !invalidacionEnCurso) {
    return;
  }

  if (!invalidacionEnCurso) {
    invalidacionEnCurso = limpiarTokens()
      .then(avisarSesionInvalida)
      .finally(() => {
        invalidacionEnCurso = null;
      });
  }

  return invalidacionEnCurso;
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
    if (fallo && (fallo.name === "AbortError" || fallo.name === "TimeoutError")) {
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

  /* Solo se usa el mensaje del backend si esta escrito para una persona: el
     usuario nunca ve stack traces, SQL ni excepciones internas. En los 401
     gana el mensaje curado del codigo de autenticacion. */
  const delBackend = body?.error?.message;

  const fallo = new ErrorDeApi({
    codigo: body?.error?.code,
    estado: respuesta.status,
    mensaje:
      (respuesta.status === 401 && MENSAJES_401[body?.error?.code]) ||
      (esMensajeApto(delBackend) ? delBackend : undefined),
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
  } else if (fallo.estado === 401 && autenticado && haySesionGuardada()) {
    /* 401 de sesion sin refresh disponible (sin refresh token o antes de
       configurar el renovador): el token dejo de servir, se limpia la sesion
       local para volver al login. En requests sin autenticacion (login, logout)
       nunca se llega aca: no hay sesion que invalidar. */
    await invalidarSesion();
  }

  throw fallo;
}