/* Modelo de autorizacion del frontend: un permiso es "<modulo>.<accion>", igual
   que en el backend (Backend/config/permissions.config.mjs). La funcion
   `permiso()` y los modulos salen de Shared/src/domain.mjs.

   El frontend solo usa los permisos para ocultar o deshabilitar controles.
   La validacion definitiva la hace siempre el backend en cada request: un boton
   visible no implica que la accion este autorizada. */

import { permiso } from "../../../../Shared/src/domain.mjs";

export { permiso };

export const PERMISOS = {
  usuariosLeer: permiso("users", "read"),
  usuariosCrear: permiso("identity", "create"),
  usuariosEditar: permiso("identity", "update"),
  rolesLeer: permiso("identity", "read"),
  rolesEditar: permiso("identity", "update"),
  alumnosLeer: permiso("students", "read"),
  alumnosCrear: permiso("students", "write"),
  alumnosEditar: permiso("students", "write"),
  observacionesLeer: permiso("observations", "read"),
  observacionesCrear: permiso("observations", "write")
};

export function puede(sesion, permisoBuscado) {
  const permisos = sesion?.permisos;

  if (!Array.isArray(permisos)) {
    return false;
  }

  return permisos.includes(permisoBuscado);
}

/* Alcances declarados por las asignaciones del usuario (schoolId, courseId, ...).
   Sirve para avisar cuando el permiso existe pero el alcance limita el resultado. */
export function alcances(sesion) {
  return sesion?.alcances ?? [];
}
