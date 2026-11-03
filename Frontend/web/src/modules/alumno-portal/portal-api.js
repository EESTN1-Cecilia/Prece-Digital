/* Adaptador de datos del portal del alumno.

   Endpoints que consume (todos del alumno autenticado; ninguno recibe un id):
     GET   /api/v1/alumno/cuenta
     POST  /api/v1/alumno/cuenta/configuracion
     PATCH /api/v1/alumno/cuenta/password
     PATCH /api/v1/alumno/cuenta/usuario
     GET   /api/v1/alumno/perfil
     GET   /api/v1/alumno/boletin?anio=
     GET   /api/v1/alumno/asistencias?anio=
     GET   /api/v1/alumno/situacion-academica
     GET   /api/v1/alumno/previas

   El ingreso es el login general (POST /api/v1/auth/login). No hay datos de
   ejemplo: lo que no devuelve el backend no se muestra. */

import { guardarCredenciales, pedir } from "../../services/http.js";

export const obtenerCuenta = () => pedir("/api/v1/alumno/cuenta");

export const configurarCuenta = (datos) =>
  pedir("/api/v1/alumno/cuenta/configuracion", { method: "POST", body: JSON.stringify(datos) });

export async function cambiarPassword(datos) {
  const respuesta = await pedir("/api/v1/alumno/cuenta/password", { method: "PATCH", body: JSON.stringify(datos) });
  /* El backend cierra las otras sesiones y entrega una nueva para esta. */
  if (respuesta?.sesion) guardarCredenciales(respuesta.sesion);
  return respuesta;
}

export const cambiarUsuario = (datos) =>
  pedir("/api/v1/alumno/cuenta/usuario", { method: "PATCH", body: JSON.stringify(datos) });

function conAnio(ruta, anio) {
  return anio ? `${ruta}?anio=${encodeURIComponent(anio)}` : ruta;
}

export const obtenerPerfil = () => pedir("/api/v1/alumno/perfil");
export const obtenerBoletin = (anio) => pedir(conAnio("/api/v1/alumno/boletin", anio));
export const obtenerAsistencias = (anio) => pedir(conAnio("/api/v1/alumno/asistencias", anio));
export const obtenerSituacion = () => pedir("/api/v1/alumno/situacion-academica");
export const obtenerPrevias = () => pedir("/api/v1/alumno/previas");

/* Reglas de la contraseña, iguales a las del backend (que es quien decide). */
export function requisitosPassword(password, { dni, usuario } = {}) {
  const valor = password ?? "";
  return [
    { clave: "largo", texto: "Al menos 8 caracteres", cumple: valor.length >= 8 },
    { clave: "mezcla", texto: "Letras y números", cumple: /[a-zA-Z]/.test(valor) && /\d/.test(valor) },
    { clave: "dni", texto: "No contiene tu DNI", cumple: !dni || !valor.includes(dni) },
    { clave: "usuario", texto: "Distinta de tu usuario", cumple: !usuario || valor.toLowerCase() !== String(usuario).toLowerCase() }
  ];
}

export const USUARIO_RE = /^[a-z0-9._-]{4,40}(@alumno\.prece\.local)?$/;
