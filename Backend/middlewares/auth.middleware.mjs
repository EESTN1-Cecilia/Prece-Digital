import { userRepository } from "../database/repositories/user.repository.mjs";
import { verifyAccessToken } from "../modules/auth/token.service.mjs";
import { errorHttp } from "../utils/api-error.mjs";

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

  ctx.user = user;
  ctx.tokenPayload = payload;
}
