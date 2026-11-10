/* Servicios del portal del alumno contra la API comun.
   Ninguna ruta recibe un id de alumno: el Backend resuelve el legajo desde el
   token. Mobile no decide permisos ni calcula notas: solo muestra lo que
   devuelve el Backend. */

import { pedir } from "./api.js";
import { guardarTokens } from "./session-tokens.js";
import { anioValido } from "../utils/alumno-reglas.js";

const BASE = "/api/v1/alumno";

function conAnio(ruta, anio) {
  if (anio === null || anio === undefined || anio === "") {
    return ruta;
  }

  if (!anioValido(anio)) {
    throw new RangeError("Ciclo lectivo inválido.");
  }

  return `${ruta}?anio=${encodeURIComponent(Number(anio))}`;
}

export const obtenerCuenta = () => pedir(`${BASE}/cuenta`);
export const obtenerPerfil = () => pedir(`${BASE}/perfil`);
export const obtenerBoletin = async (anio) => pedir(conAnio(`${BASE}/boletin`, anio));
export const obtenerAsistencias = async (anio) => pedir(conAnio(`${BASE}/asistencias`, anio));
export const obtenerSituacion = () => pedir(`${BASE}/situacion-academica`);
export const obtenerPrevias = () => pedir(`${BASE}/previas`);

export const configurarCuenta = ({ usuario, passwordActual, passwordNueva, confirmacion }) =>
  pedir(`${BASE}/cuenta/configuracion`, {
    metodo: "POST",
    cuerpo: { usuario: usuario || undefined, passwordActual, passwordNueva, confirmacion }
  });

/* El Backend cierra las otras sesiones y entrega tokens nuevos para esta: se
   guardan en el almacen seguro y NO se devuelven a la interfaz. */
export async function cambiarPassword({ passwordActual, passwordNueva, confirmacion }) {
  const respuesta = await pedir(`${BASE}/cuenta/password`, {
    metodo: "PATCH",
    cuerpo: { passwordActual, passwordNueva, confirmacion }
  });

  const { sesion, ...cuenta } = respuesta ?? {};

  if (sesion) {
    await guardarTokens(sesion);
  }

  return cuenta;
}

export const cambiarUsuario = ({ usuario, passwordActual }) =>
  pedir(`${BASE}/cuenta/usuario`, { metodo: "PATCH", cuerpo: { usuario, passwordActual } });
