/* Guardias de los informes de Dirección. Van despues de verifyToken:

     middlewares: [verifyToken, soloDireccion]

   - `soloPersonal`: lee el listado completo (incluye lo dirigido a preceptores),
     asi que un usuario que solo es alumno queda afuera. El alumno lee sus
     novedades por /api/v1/alumno/novedades, que filtra por destinatario.
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

export async function soloDireccion(ctx) {
  if (!rolesDe(ctx).some((rol) => rol === ROLES.DIRECTOR || rol === ROLES.ADMIN)) {
    throw sinPermisos("Solo Dirección puede emitir o eliminar informes.");
  }
}
