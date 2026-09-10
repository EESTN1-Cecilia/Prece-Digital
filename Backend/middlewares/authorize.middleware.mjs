import { evaluateAccess, extractContext } from "../modules/auth/permission.service.mjs";
import { HttpError } from "../utils/http-error.mjs";

export function authorize({ permission, roles, skipScope = false } = {}) {
  return async (ctx) => {
    if (!ctx.user) {
      throw new HttpError(401, "unauthenticated", "Debe autenticarse");
    }

    const context = extractContext({
      ...ctx.body,
      ...Object.fromEntries(ctx.url.searchParams.entries()),
      ...ctx.params
    });

    const access = evaluateAccess(ctx.user, { permission, roles, context, skipScope });

    if (!access.allowed) {
      throw new HttpError(403, "forbidden", "No tiene permiso para esta acción en el alcance solicitado", {
        permission,
        roles,
        context
      });
    }

    ctx.access = access;
  };
}
