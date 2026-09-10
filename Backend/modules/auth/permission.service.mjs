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
