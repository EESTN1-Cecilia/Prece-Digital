import { evaluateAccess, extractContext } from "../modules/auth/permission.service.mjs";
import { errorHttp } from "../utils/api-error.mjs";

/* Unico mecanismo de autorizacion de la API. Va despues de verifyToken en la ruta:

     middlewares: [verifyToken, authorize({ permission: P.STUDENTS_READ })]

   Evalua los roles del usuario (sus asignaciones) contra el catalogo de
   config/permissions.config.mjs, respetando el alcance (schoolId, courseId, ...)
   que llegue en params, query o body. */

export function authorize({ permission, roles, skipScope = false } = {}) {
  const middleware = async (ctx) => {
    if (!ctx.user) {
      throw errorHttp(401, "UNAUTHENTICATED", "Debe autenticarse");
    }

    const context = extractContext({
      ...ctx.body,
      ...Object.fromEntries(ctx.url.searchParams.entries()),
      ...ctx.params
    });

    const access = evaluateAccess(ctx.user, { permission, roles, context, skipScope });

    if (!access.allowed) {
      throw errorHttp(403, "FORBIDDEN", "No tiene permiso para esta acción en el alcance solicitado", {
        permission,
        roles,
        context
      });
    }

    ctx.access = access;
  };

  /* Expuesto para documentacion (scripts/generar-endpoints.mjs). */
  middleware.permiso = permission;
  return middleware;
}
