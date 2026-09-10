import bcrypt from "bcryptjs";
import { userRepository } from "../../database/repositories/user.repository.mjs";
import { HttpError } from "../../utils/http-error.mjs";
import { permissionsForRole } from "../../config/permissions.config.mjs";
import { evaluateAccess, extractContext } from "./permission.service.mjs";
import { createRefreshToken, revokeRefreshToken, revokeUserSessions, rotateRefreshToken, signAccessToken } from "./token.service.mjs";

const dummyHashPromise = bcrypt.hash("__dummy_password__", 10);

function rolesFromAssignments(assignments = []) {
  return [...new Set(assignments.map((assignment) => assignment.role))];
}

function permissionsFromRoles(roles = []) {
  return [...new Set(roles.flatMap((role) => permissionsForRole(role)))];
}

function scopesFromAssignments(assignments = []) {
  return [...new Set(assignments.flatMap((assignment) => Object.keys(assignment).filter((key) => key !== "role")))];
}

function sessionData(user) {
  const publicUser = userRepository.publicView(user);
  const roles = rolesFromAssignments(publicUser.assignments);

  return {
    ...publicUser,
    user: publicUser,
    usuario: publicUser,
    roles,
    permisos: permissionsFromRoles(roles),
    alcances: scopesFromAssignments(publicUser.assignments)
  };
}

function sessionPayload(user, accessToken, refreshToken) {
  return {
    accessToken,
    refreshToken,
    tokenType: "Bearer",
    ...sessionData(user)
  };
}

export const authService = {
  async login({ email, password }) {
    if (!email || !password) {
      throw new HttpError(400, "invalid_credentials_payload", "Email y contraseña son obligatorios");
    }

    const user = userRepository.findByEmail(email, { includeInactive: true });
    const hash = user?.passwordHash ?? (await dummyHashPromise);
    const matches = await bcrypt.compare(password, hash);

    if (!user || !matches || !user.isActive) {
      throw new HttpError(401, "invalid_credentials", "Credenciales inválidas o cuenta desactivada");
    }

    return sessionPayload(user, signAccessToken(user), createRefreshToken(user.id));
  },

  refresh(refreshToken) {
    const rotated = rotateRefreshToken(refreshToken);
    const user = userRepository.findById(rotated.userId);

    if (!user) {
      revokeUserSessions(rotated.userId);
      throw new HttpError(401, "account_inactive", "La cuenta no está activa");
    }

    return sessionPayload(user, signAccessToken(user), rotated.refreshToken);
  },

  logout(refreshToken) {
    if (!refreshToken) {
      throw new HttpError(400, "refresh_token_required", "El refresh token es obligatorio para cerrar sesión");
    }

    revokeRefreshToken(refreshToken);
    return { ok: true };
  },

  me(user) {
    return sessionData(user);
  },

  listUsers() {
    return userRepository.list({ includeInactive: true }).map((user) => userRepository.publicView(user));
  },

  deactivateUser(actor, targetUserId, contextSource) {
    const target = userRepository.findById(targetUserId, { includeInactive: true });

    if (!target) {
      throw new HttpError(404, "user_not_found", "Usuario no encontrado");
    }

    const context = extractContext(contextSource);
    const access = evaluateAccess(actor, {
      permission: "users.deactivate",
      context: Object.keys(context).length ? context : extractContext(target.assignments[0] ?? {})
    });

    if (!access.allowed) {
      throw new HttpError(403, "forbidden", "No tiene permiso para desactivar esta cuenta en el alcance indicado");
    }

    const updated = userRepository.deactivate(target.id);
    revokeUserSessions(target.id);
    return userRepository.publicView(updated);
  }
};
