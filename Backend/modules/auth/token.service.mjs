import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { appConfig } from "../../config/app.config.mjs";
import { refreshTokenRepository } from "../../database/repositories/refresh-token.repository.mjs";
import { HttpError } from "../../utils/http-error.mjs";

function hashToken(value) {
  return crypto.createHash("sha256").update(`${appConfig.jwtRefreshSecret}:${value}`).digest("hex");
}

function expiresAtFromTtl(ttl) {
  const match = /^(\d+)([smhd])$/.exec(ttl);

  if (!match) {
    return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  }

  const amount = Number.parseInt(match[1], 10);
  const unit = match[2];
  const multipliers = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };

  return new Date(Date.now() + amount * multipliers[unit]).toISOString();
}

/* El payload del access token lleva solo lo minimo para identificar al usuario
   (sub), su tipo y sus roles. Nunca datos sensibles ni el detalle de asignaciones. */
export function signAccessToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      typ: "access",
      roles: [...new Set(user.assignments.map((assignment) => assignment.role))]
    },
    appConfig.jwtAccessSecret,
    { expiresIn: appConfig.jwtAccessExpiresIn }
  );
}

export function verifyAccessToken(token) {
  try {
    const payload = jwt.verify(token, appConfig.jwtAccessSecret);

    if (payload.typ !== "access") {
      throw new HttpError(401, "invalid_token", "Token de acceso inválido");
    }

    if (!payload.sub) {
      throw new HttpError(401, "invalid_token", "Token de acceso inválido");
    }

    return payload;
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }

    throw new HttpError(401, "invalid_token", "Token de acceso inválido o vencido");
  }
}

export function createRefreshToken(userId) {
  const id = crypto.randomUUID();
  const secret = crypto.randomBytes(48).toString("base64url");
  const token = `${id}.${secret}`;

  refreshTokenRepository.create({
    id,
    userId,
    tokenHash: hashToken(token),
    expiresAt: expiresAtFromTtl(appConfig.jwtRefreshExpiresIn)
  });

  return token;
}

export function parseRefreshToken(token, { detectReuse = true } = {}) {
  if (typeof token !== "string" || !token.includes(".")) {
    throw new HttpError(401, "invalid_refresh_token", "Refresh token inválido");
  }

  const [id] = token.split(".");
  const stored = refreshTokenRepository.findById(id);
  const hashed = hashToken(token);

  if (!stored || stored.tokenHash !== hashed) {
    throw new HttpError(401, "invalid_refresh_token", "Refresh token inválido");
  }

  if (stored.revokedAt) {
    if (detectReuse) {
      refreshTokenRepository.revokeAllForUser(stored.userId);
    }

    throw new HttpError(401, "refresh_token_reused", "Refresh token revocado. Inicie sesión de nuevo");
  }

  if (new Date(stored.expiresAt).getTime() <= Date.now()) {
    throw new HttpError(401, "refresh_token_expired", "Refresh token vencido");
  }

  return stored;
}

export function rotateRefreshToken(currentToken) {
  const stored = parseRefreshToken(currentToken);
  const next = createRefreshToken(stored.userId);
  const nextId = next.split(".")[0];
  refreshTokenRepository.revoke(stored.id, nextId);
  return { userId: stored.userId, refreshToken: next };
}

export function revokeRefreshToken(token) {
  try {
    const stored = parseRefreshToken(token, { detectReuse: false });
    refreshTokenRepository.revoke(stored.id);
    return stored;
  } catch (error) {
    if (error instanceof HttpError && ["invalid_refresh_token", "refresh_token_expired", "refresh_token_reused"].includes(error.code)) {
      return null;
    }

    throw error;
  }
}

export function revokeUserSessions(userId) {
  refreshTokenRepository.revokeAllForUser(userId);
}
