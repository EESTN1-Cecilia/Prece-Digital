/* Cliente HTTP y manejo centralizado de errores.

   Toda llamada a la API pasa por `pedir()`, que traduce la respuesta a un `ErrorApi`
   con un mensaje pensado para el usuario. Las pantallas no interpretan codigos HTTP
   ni textos crudos del backend: leen `error.mensaje`, `error.alcance` y `error.campos`.

   Alcance del error:
     - "global": afecta a la sesion o a toda la aplicacion (401, 500, sin conexion).
     - "local":  afecta solo a la accion en curso (400, 403, 404, 409, 429).

   Un 401 invalida la sesion y emite EVENTO_SESION_EXPIRADA una sola vez; main.js
   escucha ese evento, limpia el estado y redirige al login. */

import { env } from "../config/env.js";

export const EVENTO_SESION_EXPIRADA = "prece:sesion-expirada";

const TIEMPO_LIMITE = 15000;

const SIN_CONEXION = {
  mensaje: "No se pudo conectar con el servidor. Verifica tu conexion e intenta nuevamente.",
  alcance: "global",
  reintentable: true
};

const POR_CODIGO = {
  400: {
    mensaje: "No se pudo procesar la solicitud. Revisa los datos ingresados e intenta nuevamente.",
    alcance: "local"
  },
  401: {
    mensaje: "Tu sesion expiro. Inicia sesion nuevamente para continuar.",
    alcance: "global"
  },
  403: {
    mensaje: "No tenes permisos para realizar esta accion.",
    alcance: "local"
  },
  404: {
    mensaje: "No se encontro el recurso solicitado.",
    alcance: "local"
  },
  409: {
    mensaje: "No se pudo completar la operacion porque entra en conflicto con datos existentes.",
    alcance: "local"
  },
  422: {
    mensaje: "Los datos enviados no son validos. Revisa el formulario e intenta nuevamente.",
    alcance: "local"
  },
  429: {
    mensaje: "Hiciste demasiadas solicitudes seguidas. Espera unos segundos e intenta nuevamente.",
    alcance: "local",
    reintentable: true
  }
};

const ERROR_SERVIDOR = {
  mensaje: "Ocurrio un problema en el servidor. Intenta nuevamente mas tarde.",
  alcance: "global",
  reintentable: true
};

export class ErrorApi extends Error {
  constructor(status, mensaje, extra = {}) {
    super(mensaje);
    this.name = "ErrorApi";
    this.status = status;
    this.mensaje = mensaje;
    /* Codigo estable del backend (VALIDATION_ERROR, FORBIDDEN, ...): sirve para
       distinguir casos sin mirar el texto del mensaje. */
    this.codigo = extra.codigo ?? null;
    this.alcance = extra.alcance ?? "local";
    this.reintentable = extra.reintentable ?? false;
    this.campos = extra.campos ?? null;
    /* Solo para el registro de desarrollo: nunca se muestra al usuario. */
    this.tecnico = extra.tecnico ?? null;
  }

  get esSesionExpirada() {
    return this.status === 401;
  }

  get esSinPermiso() {
    return this.status === 403;
  }
}

/* Un mensaje del backend solo se muestra si esta escrito para una persona.
   Descarta stack traces, SQL, rutas internas y excepciones. */
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

/* Errores por campo para formularios: se aceptan las formas habituales. */
export function camposDeError(cuerpo) {
  /* Formato del backend: { error: { details: [{ field, message }] } }.
     Se aceptan tambien las formas sueltas por si algun endpoint todavia no migro. */
  const crudo =
    cuerpo?.error?.details ?? cuerpo?.campos ?? cuerpo?.errores ?? cuerpo?.errors ?? cuerpo?.fields;

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
    entradas.filter(([campo, mensaje]) => campo && esMensajeApto(mensaje))
  );

  return Object.keys(campos).length ? campos : null;
}

/* Registro para desarrollo. No incluye el cuerpo enviado ni datos del usuario. */
export function registrar(error, contexto) {
  console.error("[api]", {
    momento: new Date().toISOString(),
    metodo: contexto.metodo,
    ruta: contexto.ruta,
    status: error.status,
    tecnico: error.tecnico ?? error.mensaje
  });
}

/* El backend definio autenticacion por JWT con refresh (su issue #2), no por cookie:
   el token viaja en la cabecera Authorization. Guardarlo y renovarlo es tarea del
   modulo de autenticacion; aca solo se lee para firmar cada solicitud. */
const CLAVE_TOKEN = "prece.token";

export function guardarToken(token) {
  try {
    if (token) {
      window.localStorage.setItem(CLAVE_TOKEN, token);
    } else {
      window.localStorage.removeItem(CLAVE_TOKEN);
    }
  } catch {
    /* Navegador sin almacenamiento disponible: la sesion dura lo que la pestania. */
  }
}

export function leerToken() {
  try {
    return window.localStorage.getItem(CLAVE_TOKEN);
  } catch {
    return null;
  }
}

let sesionYaInvalidada = false;

function invalidarSesion() {
  if (sesionYaInvalidada || typeof window === "undefined") {
    return;
  }

  /* Una sola notificacion aunque varias pantallas reciban 401 a la vez. */
  sesionYaInvalidada = true;
  guardarToken(null);
  window.dispatchEvent(new CustomEvent(EVENTO_SESION_EXPIRADA));
}

export function reiniciarSesionExpirada() {
  sesionYaInvalidada = false;
}

function errorDeRed(fallo) {
  const agotado = fallo?.name === "TimeoutError" || fallo?.name === "AbortError";

  return new ErrorApi(0, SIN_CONEXION.mensaje, {
    ...SIN_CONEXION,
    tecnico: agotado ? `timeout ${TIEMPO_LIMITE}ms` : (fallo?.message ?? "error de red")
  });
}

function errorDeRespuesta(respuesta, cuerpo, recurso) {
  const { status } = respuesta;
  const base = POR_CODIGO[status] ?? (status >= 500 ? ERROR_SERVIDOR : null);
  /* El backend responde { error: { code, message, details } }. */
  const delBackend = cuerpo?.error?.message ?? cuerpo?.mensaje ?? cuerpo?.message;
  const codigoBackend = cuerpo?.error?.code ?? null;
  const campos = camposDeError(cuerpo);

  let mensaje = base?.mensaje ?? `No se pudo completar la operacion (${status}).`;

  if (status === 404 && recurso) {
    mensaje = `No se encontro ${recurso}.`;
  } else if (esMensajeApto(delBackend)) {
    /* El backend puede afinar el mensaje (por ejemplo, que dato esta duplicado). */
    mensaje = delBackend;
  }

  return new ErrorApi(status, mensaje, {
    codigo: codigoBackend,
    alcance: base?.alcance ?? "local",
    reintentable: base?.reintentable ?? false,
    campos,
    tecnico: typeof delBackend === "string" ? delBackend : null
  });
}

/* `opciones` acepta lo mismo que fetch, mas:
     recurso: texto para el mensaje de 404 ("el usuario solicitado")
     tiempoLimite: milisegundos antes de cortar la solicitud */
export async function pedir(ruta, opciones = {}) {
  const { recurso, tiempoLimite = TIEMPO_LIMITE, ...resto } = opciones;
  const metodo = resto.method ?? "GET";
  let respuesta;

  const token = leerToken();

  try {
    /* Sin `credentials`: la autenticacion es por token en la cabecera, asi que el
       Access-Control-Allow-Origin: * que devuelve hoy el backend alcanza para leer.
       Las escrituras siguen bloqueadas hasta que el backend responda OPTIONS
       (su issue #70) permitiendo Authorization y Content-Type. */
    respuesta = await fetch(`${env.apiBaseUrl}${ruta}`, {
      signal: AbortSignal.timeout(tiempoLimite),
      ...resto,
      headers: {
        ...(resto.body ? { "Content-Type": "application/json" } : null),
        ...(token ? { Authorization: `Bearer ${token}` } : null),
        ...resto.headers
      }
    });
  } catch (fallo) {
    const error = errorDeRed(fallo);
    registrar(error, { metodo, ruta });
    throw error;
  }

  if (!respuesta.ok) {
    const cuerpo = await respuesta.json().catch(() => null);
    const error = errorDeRespuesta(respuesta, cuerpo, recurso);

    registrar(error, { metodo, ruta });

    if (error.esSesionExpirada) {
      invalidarSesion();
    }

    throw error;
  }

  const cuerpo = await respuesta.json().catch(() => ({}));
  return cuerpo?.data ?? cuerpo;
}
