import { userRepository } from "../database/repositories/user.repository.mjs";
import { verifyAccessToken } from "../modules/auth/token.service.mjs";
import { noAutenticado, sinPermisos } from "../utils/api-error.mjs";
import { HttpError } from "../utils/http-error.mjs";
import { verificarToken } from "../utils/jwt.mjs";

export async function verifyToken(ctx) {
  const header = ctx.request.headers.authorization ?? "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    throw new HttpError(401, "missing_token", "Se requiere un token de acceso");
  }

  const payload = verifyAccessToken(token);
  const user = userRepository.findById(payload.sub);

  if (!user) {
    throw new HttpError(401, "account_inactive", "La cuenta no está activa");
  }

  ctx.user = user;
  ctx.tokenPayload = payload;
}

export function exigirAutenticacion(request) {
  const cabecera = request?.headers?.authorization ?? "";
  const [esquema, token] = cabecera.split(" ");

  if (esquema !== "Bearer" || !token) {
    throw noAutenticado();
  }

  const payload = verificarToken(token);

  if (!payload) {
    throw noAutenticado();
  }

  return payload;
}

export function exigirRoles(payload, rolesPermitidos) {
  const rolesUsuario = payload?.roles ?? [];

  if (!rolesPermitidos.some((rol) => rolesUsuario.includes(rol))) {
    throw sinPermisos();
  }
}
