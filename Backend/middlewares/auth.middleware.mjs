import { userRepository } from "../database/repositories/user.repository.mjs";
import { verifyAccessToken } from "../modules/auth/token.service.mjs";
import { errorHttp } from "../utils/api-error.mjs";

/* Con la clave provisoria pendiente de cambio solo se puede consultar la propia
   sesion y cambiar la clave: el resto de la API responde 403 hasta entonces.
   (Cerrar sesion usa el refresh token y no pasa por aca.) */
const PERMITIDAS_CON_CLAVE_PROVISORIA = new Set([
  "GET /api/v1/auth/me",
  "GET /api/v1/auth/permissions",
  "POST /api/v1/auth/cambiar-clave"
]);

export async function verifyToken(ctx) {
  const header = ctx.request.headers.authorization ?? "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    throw errorHttp(401, "MISSING_TOKEN", "Se requiere un token de acceso");
  }

  const payload = verifyAccessToken(token);
  const user = userRepository.findById(payload.sub);

  if (!user) {
    throw errorHttp(401, "ACCOUNT_INACTIVE", "La cuenta no está activa");
  }

  if (user.debeCambiarClave && !PERMITIDAS_CON_CLAVE_PROVISORIA.has(`${ctx.request.method} ${ctx.url?.pathname}`)) {
    throw errorHttp(403, "PASSWORD_CHANGE_REQUIRED", "Tenés que cambiar la clave provisoria antes de continuar.");
  }

  ctx.user = user;
  ctx.tokenPayload = payload;
}
