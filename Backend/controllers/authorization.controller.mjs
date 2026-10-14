/* Catalogo de autorizacion: roles, modulos, permisos y matriz rol -> permisos.

   Todo sale de config/permissions.config.mjs (y de Shared/src/domain.mjs).
   Las rutas se protegen con verifyToken + authorize en routes/index.mjs. */

import {
  MODULOS,
  ROL_CATALOGO,
  catalogoPermisos,
  catalogoRoles,
  permissionsForRole,
  replaceRolePermissions
} from "../config/permissions.config.mjs";
import { dividirPermiso, permisosDelUsuario, rolesDelUsuario } from "../modules/auth/permission.service.mjs";
import { errorDeValidacion, noEncontrado } from "../utils/api-error.mjs";

function rolExistente(codigo) {
  const rol = ROL_CATALOGO[codigo];

  if (!rol) {
    throw noEncontrado("El rol solicitado");
  }

  return rol;
}

export function getRoles() {
  return {
    data: catalogoRoles().map((rol) => ({ id: rol.codigo, nombre: rol.nombre, descripcion: rol.descripcion }))
  };
}

export function getModules() {
  return {
    data: Object.entries(MODULOS).map(([id, nombre]) => ({ id, nombre, descripcion: null }))
  };
}

export function getPermissions() {
  return {
    data: catalogoPermisos().map((codigo) => {
      const { modulo, accion } = dividirPermiso(codigo);
      return { id: codigo, modulo, accion, descripcion: null };
    })
  };
}

export function getRolePermissions({ params }) {
  const rol = rolExistente(params.codigo);
  return { data: { rol: rol.codigo, nombre: rol.nombre, permisos: permissionsForRole(rol.codigo).sort() } };
}

/* Reemplaza por completo los permisos del rol. Se rechaza cualquier codigo que no
   exista en el catalogo: el cliente no puede inventar permisos. */
export function putRolePermissions({ params, body }) {
  const rol = rolExistente(params.codigo);
  const codigos = body?.permisos ?? body?.permissions;

  if (!Array.isArray(codigos)) {
    throw errorDeValidacion([{ field: "permisos", message: "Se espera una lista de permisos." }]);
  }

  const conocidos = new Set(catalogoPermisos());
  const desconocidos = [...new Set(codigos)].filter((codigo) => !conocidos.has(codigo));

  if (desconocidos.length) {
    throw errorDeValidacion(
      desconocidos.map((codigo) => ({ field: "permisos", message: `El permiso "${codigo}" no existe en el catalogo.` }))
    );
  }

  return { data: { rol: rol.codigo, nombre: rol.nombre, permisos: replaceRolePermissions(rol.codigo, codigos) } };
}

/* Identidad, roles y permisos del usuario autenticado. Sin datos sensibles. */
export function getMe({ user }) {
  return {
    data: {
      usuario: { id: user.id },
      roles: rolesDelUsuario(user).map((codigo) => ({
        codigo,
        nombre: ROL_CATALOGO[codigo]?.nombre ?? codigo,
        escuelaId: user.assignments.find((asignacion) => asignacion.role === codigo)?.schoolId ?? null
      })),
      permisos: permisosDelUsuario(user).sort()
    }
  };
}
