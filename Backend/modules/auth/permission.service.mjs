import { permissionsForRole, SCOPE_KEYS } from "../../config/permissions.config.mjs";

export function extractContext(source = {}) {
  const context = {};

  for (const key of SCOPE_KEYS) {
    if (source[key] != null && source[key] !== "") {
      context[key] = String(source[key]);
    }
  }

  return context;
}

export function assignmentCoversContext(assignment, context, { skipScope = false } = {}) {
  if (skipScope) {
    return true;
  }

  for (const key of SCOPE_KEYS) {
    const granted = assignment[key] == null ? null : String(assignment[key]);
    const needed = context[key] ?? null;

    if (needed && granted && granted !== needed) {
      return false;
    }
  }

  return true;
}

export function assignmentGrantsPermission(assignment, permission) {
  return permissionsForRole(assignment.role).includes(permission);
}

export function evaluateAccess(user, { permission, roles, context = {}, skipScope = false } = {}) {
  const matching = (user.assignments ?? []).filter((assignment) => {
    if (roles?.length && !roles.includes(assignment.role)) {
      return false;
    }

    if (permission && !assignmentGrantsPermission(assignment, permission)) {
      return false;
    }

    return assignmentCoversContext(assignment, context, { skipScope });
  });

  return {
    allowed: matching.length > 0,
    matching
  };
}

/* ============================================================================
   Punto único para derivar identidad -> roles -> permisos.

   Los permisos del usuario nunca salen del cliente: se calculan en el backend a
   partir de sus asignaciones (roles) y del catálogo central de permisos.
   ============================================================================ */

export function rolesDelUsuario(user) {
  return [...new Set((user.assignments ?? []).map((assignment) => assignment.role))];
}

export function permisosDelUsuario(user) {
  return [...new Set(rolesDelUsuario(user).flatMap((role) => permissionsForRole(role)))];
}

export function dividirPermiso(codigo) {
  const match = /^([^.:]+)[.:]([^.:]+)$/.exec(codigo ?? "");

  return match ? { modulo: match[1], accion: match[2] } : null;
}

/* Agrupa los permisos del usuario por modulo y accion, para consumo de la
   interfaz (solo usabilidad; la seguridad siempre la valida el backend). */
export function resumenPermisos(user) {
  const resumen = {};

  for (const codigo of permisosDelUsuario(user)) {
    const partes = dividirPermiso(codigo);

    if (!partes) {
      continue;
    }

    resumen[partes.modulo] ??= {};
    resumen[partes.modulo][partes.accion] = true;
  }

  return resumen;
}