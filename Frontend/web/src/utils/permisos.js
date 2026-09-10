/* Modelo de autorizacion: un permiso es "<modulo>:<accion>", donde el modulo sale del
   catalogo real del backend (GET /api/v1/modules) y la accion del catalogo ACCIONES,
   definido en la issue #13 del backend (lectura, creacion, modificacion, eliminacion,
   aprobacion y carga).

   El frontend solo usa los permisos para ocultar o deshabilitar controles.
   La validacion definitiva la hace siempre el backend en cada request: un boton visible
   no implica que la accion este autorizada. */

export function permiso(modulo, accion) {
  return `${modulo}:${accion}`;
}

/* Usuarios y roles viven en el mismo modulo del backend ("identity"). La matriz fina
   por recurso esta pendiente de validacion (Shared/docs/mvp-scope.md). */
export const PERMISOS = {
  usuariosLeer: permiso("identity", "read"),
  usuariosCrear: permiso("identity", "create"),
  usuariosEditar: permiso("identity", "update"),
  rolesLeer: permiso("identity", "read"),
  rolesEditar: permiso("identity", "update")
};

export function puede(sesion, permisoBuscado) {
  const permisos = sesion?.permisos;

  if (!Array.isArray(permisos)) {
    return false;
  }

  return permisos.includes("*") || permisos.includes(permisoBuscado);
}

/* Alcances declarados por el rol (school, course, area, subject, shift, period).
   Sirve para avisar cuando el permiso existe pero el alcance limita el resultado. */
export function alcances(sesion) {
  return sesion?.alcances ?? [];
}
