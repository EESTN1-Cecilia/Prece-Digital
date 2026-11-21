import bcrypt from "bcryptjs";
import { userRepository } from "../../database/repositories/user.repository.mjs";
import { errorDeValidacion, errorHttp } from "../../utils/api-error.mjs";
import { permissionsForRole } from "../../config/permissions.config.mjs";
import { evaluateAccess, extractContext, resumenPermisos } from "./permission.service.mjs";
import { createRefreshToken, revokeRefreshToken, revokeUserSessions, rotateRefreshToken, signAccessToken } from "./token.service.mjs";
import { studentAccountsService } from "../student-portal/student-accounts.service.mjs";
import { DOMINIO_ALUMNOS } from "../student-portal/catalogo.mjs";
import { obtenerIpCliente, registrarFalloLogin, registrarLoginExitoso, revisarLogin } from "./login-throttle.service.mjs";

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
  async login({ email, password, request }) {
    if (!email || !password) {
      throw errorHttp(400, "INVALID_CREDENTIALS_PAYLOAD", "Email y contraseña son obligatorios");
    }

    const ip = obtenerIpCliente(request);
    revisarLogin(email, ip);

    const user = userRepository.findByEmail(email, { includeInactive: true });

    /* Alumnos: entran por este mismo login con su usuario
       (nombre.apellido@alumno.prece.local, uno propio o el DNI). */
    const identificador = String(email).trim().toLowerCase();
    if (!user && (!identificador.includes("@") || identificador.endsWith(`@${DOMINIO_ALUMNOS}`))) {
      return studentAccountsService.login({ usuario: identificador, password, request });
    }
    const hash = user?.passwordHash ?? (await dummyHashPromise);
    const matches = await bcrypt.compare(password, hash);

    if (!user || !matches || !user.isActive) {
      /* El fallo se cuenta por IP siempre, y por cuenta solo cuando la cuenta
         existe, para no permitir bloquear emails inexistentes. */
      registrarFalloLogin(email, ip, { trackEmail: Boolean(user) });
      throw errorHttp(401, "INVALID_CREDENTIALS", "Credenciales inválidas o cuenta desactivada");
    }

    registrarLoginExitoso(email);
    return sessionPayload(user, signAccessToken(user), createRefreshToken(user.id));
  },

  refresh(refreshToken) {
    const rotated = rotateRefreshToken(refreshToken);
    const user = userRepository.findById(rotated.userId);

    if (!user) {
      revokeUserSessions(rotated.userId);
      throw errorHttp(401, "ACCOUNT_INACTIVE", "La cuenta no está activa");
    }

    return sessionPayload(user, signAccessToken(user), rotated.refreshToken);
  },

  /* Cambio de contraseña propio del personal (por ejemplo, despues de que
     Direccion la reseteo). Exige la clave actual, cierra las demas sesiones y
     entrega una sesion nueva para esta. */
  async changePassword(actor, { passwordActual, passwordNueva } = {}) {
    const user = userRepository.findById(actor?.id);

    if (!user) {
      throw errorHttp(401, "ACCOUNT_INACTIVE", "La cuenta no está activa");
    }

    if (user.assignments.some((assignment) => assignment.role === "alumno") || user.studentId) {
      throw errorHttp(403, "FORBIDDEN", "Las cuentas de alumnos cambian su contraseña desde el portal del alumno");
    }

    const nueva = String(passwordNueva ?? "");
    const errores = [];

    if (nueva.length < 8 || nueva.length > 120) {
      errores.push({ field: "passwordNueva", message: "La contraseña debe tener entre 8 y 120 caracteres." });
    } else if (!/[a-zA-Z]/.test(nueva) || !/\d/.test(nueva)) {
      errores.push({ field: "passwordNueva", message: "La contraseña debe combinar letras y números." });
    }

    if (errores.length) {
      throw errorDeValidacion(errores);
    }

    const coincide = await bcrypt.compare(String(passwordActual ?? ""), user.passwordHash);

    if (!coincide) {
      throw errorHttp(400, "INVALID_CURRENT_PASSWORD", "La contraseña actual no es correcta");
    }

    if (await bcrypt.compare(nueva, user.passwordHash)) {
      throw errorDeValidacion([{ field: "passwordNueva", message: "La contraseña nueva debe ser distinta de la actual." }]);
    }

    const actualizado = userRepository.update(user.id, {
      passwordHash: await bcrypt.hash(nueva, 10),
      passwordChangedAt: new Date().toISOString(),
      mustChangePassword: false
    });

    revokeUserSessions(user.id);
    return sessionPayload(actualizado, signAccessToken(actualizado), createRefreshToken(actualizado.id));
  },

  logout(refreshToken) {
    if (!refreshToken) {
      throw errorHttp(400, "REFRESH_TOKEN_REQUIRED", "El refresh token es obligatorio para cerrar sesión");
    }

    revokeRefreshToken(refreshToken);
    return { ok: true };
  },

  me(user) {
    return sessionData(user);
  },

  /* Roles, permisos y resumen por modulo del usuario autenticado. Se calculan en
     el backend a partir del catalogo: la interfaz no puede agregarlos. */
  permissions(user) {
    const roles = rolesFromAssignments(user.assignments);

    return {
      roles,
      permisos: permissionsFromRoles(roles),
      resumen: resumenPermisos(user)
    };
  },


  deactivateUser(actor, targetUserId, contextSource) {
    const target = userRepository.findById(targetUserId, { includeInactive: true });

    if (!target) {
      throw errorHttp(404, "USER_NOT_FOUND", "Usuario no encontrado");
    }

    if (actor?.id && actor.id === target.id) {
      throw errorHttp(403, "FORBIDDEN", "No puede modificar su propia cuenta");
    }

    const context = extractContext(contextSource);
    const access = evaluateAccess(actor, {
      permission: "users.deactivate",
      context: Object.keys(context).length ? context : extractContext(target.assignments[0] ?? {})
    });

    if (!access.allowed) {
      throw errorHttp(403, "FORBIDDEN", "No tiene permiso para desactivar esta cuenta en el alcance indicado");
    }

    const updated = userRepository.deactivate(target.id);
    revokeUserSessions(target.id);
    return userRepository.publicView(updated);
  }
};
