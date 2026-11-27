/* Guardias de los informes de Dirección. Van despues de verifyToken:

     middlewares: [verifyToken, soloDireccion]

   - `soloPersonal`: lee el listado completo (incluye lo dirigido a preceptores),
     asi que un usuario que solo es alumno queda afuera. El alumno lee sus
     novedades por /api/v1/alumno/novedades, que filtra por destinatario.
   - `esSoloDocente`: el controlador lo usa para recortar el listado y los adjuntos
     a lo dirigido a docentes.
   - `soloDireccion`: emitir y eliminar comunicados es del director (o admin). */

import { ROLES } from "../../config/permissions.config.mjs";
import { sinPermisos } from "../../utils/api-error.mjs";

function rolesDe(ctx) {
  return (ctx.user?.assignments ?? []).map((asignacion) => asignacion.role);
}

export async function soloPersonal(ctx) {
  if (!rolesDe(ctx).some((rol) => rol !== ROLES.ALUMNO)) {
    throw sinPermisos("Esta sección es solo para el personal de la escuela.");
  }
}

/* Quien solo es docente (sin otro rol del personal) ve unicamente los informes
   dirigidos a docentes; el resto del personal mantiene el listado completo. */
export function esSoloDocente(user) {
  const roles = (user?.assignments ?? []).map((asignacion) => asignacion.role);
  return roles.length > 0 && roles.every((rol) => rol === ROLES.DOCENTE);
}

export async function soloDireccion(ctx) {
  if (!rolesDe(ctx).some((rol) => rol === ROLES.DIRECTOR || rol === ROLES.ADMIN)) {
    throw sinPermisos("Solo la Dirección puede realizar esta acción.");
  }
}
