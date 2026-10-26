import bcrypt from "bcryptjs";
import { userRepository } from "../../database/repositories/user.repository.mjs";
import { errorDeValidacion, errorHttp } from "../../utils/api-error.mjs";
import { permissionsForRole } from "../../config/permissions.config.mjs";
import { evaluateAccess, extractContext, resumenPermisos } from "./permission.service.mjs";
import { createRefreshToken, revokeRefreshToken, revokeUserSessions, rotateRefreshToken, signAccessToken } from "./token.service.mjs";
import { obtenerIpCliente, registrarFalloLogin, registrarLoginExitoso, revisarLogin } from "./login-throttle.service.mjs";

const dummyHashPromise = bcrypt.hash("__dummy_password__", 10);
const CLAVE_MINIMA = 8;

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
    const hash = user?.passwordHash ?? (await dummyHashPromise);
    const matches = await bcrypt.compare(password, hash);

    if (!user || !matches) {
      /* El fallo se cuenta por IP siempre, y por cuenta solo cuando la cuenta
         existe, para no permitir bloquear emails inexistentes. */
      registrarFalloLogin(email, ip, { trackEmail: Boolean(user) });
      throw errorHttp(401, "INVALID_CREDENTIALS", "Credenciales inválidas o cuenta desactivada");
    }

    /* Solo se informa la baja a quien ya demostro conocer la contraseña: no
       permite averiguar que cuentas existen. */
    if (!user.isActive) {
      throw errorHttp(403, "ACCOUNT_INACTIVE", "La cuenta está dada de baja. Comunicate con Dirección para reactivarla.");
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

  /* Cambio de clave del propio usuario. Es la unica operacion habilitada
     mientras la cuenta tiene la clave provisoria (el DNI). Pide la clave
     actual, guarda solo el hash de la nueva, quita la marca y cierra las demas
     sesiones; devuelve una sesion nueva para seguir sin volver a ingresar. */
  async cambiarClave(user, { actual, nueva } = {}) {
    const completo = userRepository.findById(user.id);

    if (!completo) {
      throw errorHttp(401, "ACCOUNT_INACTIVE", "La cuenta no está activa");
    }

    const errores = [];
    const claveNueva = typeof nueva === "string" ? nueva : "";

    if (typeof actual !== "string" || !actual) {
      errores.push({ field: "actual", message: "Ingresá tu clave actual." });
    }

    if (claveNueva.length < CLAVE_MINIMA) {
      errores.push({ field: "nueva", message: `La nueva clave debe tener al menos ${CLAVE_MINIMA} caracteres.` });
    } else if (!/[A-Za-z]/.test(claveNueva) || !/\d/.test(claveNueva)) {
      errores.push({ field: "nueva", message: "La nueva clave debe combinar letras y números." });
    } else if (completo.dni && claveNueva.includes(completo.dni)) {
      errores.push({ field: "nueva", message: "La nueva clave no puede contener tu DNI." });
    }

    if (errores.length) {
      throw errorDeValidacion(errores);
    }

    if (!(await bcrypt.compare(actual, completo.passwordHash))) {
      throw errorHttp(422, "VALIDATION_ERROR", "La clave actual no es correcta.", [{ field: "actual", message: "La clave actual no es correcta." }]);
    }

    if (await bcrypt.compare(claveNueva, completo.passwordHash)) {
      throw errorHttp(422, "VALIDATION_ERROR", "La nueva clave tiene que ser distinta de la actual.", [{ field: "nueva", message: "Tiene que ser distinta de la actual." }]);
    }

    const actualizado = userRepository.update(completo.id, {
      passwordHash: await bcrypt.hash(claveNueva, 10),
      debeCambiarClave: false
    });

    revokeUserSessions(completo.id);
    return sessionPayload(actualizado, signAccessToken(actualizado), createRefreshToken(actualizado.id));
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
