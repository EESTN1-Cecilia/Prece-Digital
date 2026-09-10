import {
  listarModulos,
  listarPermisos,
  listarRoles,
  permisosDeRol,
  reemplazarPermisosDeRol,
  rolesDeUsuario
} from "../services/authorization.service.mjs";
import { leerCuerpoJson } from "../utils/request-body.mjs";

export async function getRoles({ pool }) {
  const roles = await listarRoles(pool);

  return {
    data: roles.map((rol) => ({
      id: rol.codigo,
      nombre: rol.nombre,
      descripcion: rol.descripcion
    }))
  };
}

export async function getModules({ pool }) {
  const modulos = await listarModulos(pool);

  return {
    data: modulos.map((modulo) => ({
      id: modulo.codigo,
      nombre: modulo.nombre,
      descripcion: modulo.descripcion
    }))
  };
}

export async function getPermissions({ pool }) {
  const permisos = await listarPermisos(pool);

  return {
    data: permisos.map((permiso) => ({
      id: permiso.codigo,
      modulo: permiso.modulo,
      accion: permiso.accion,
      descripcion: permiso.descripcion
    }))
  };
}

export async function getRolePermissions({ params, pool }) {
  const { rol, permisos } = await permisosDeRol(pool, params.codigo);

  return { data: { rol: rol.codigo, nombre: rol.nombre, permisos } };
}

export async function putRolePermissions({ request, params, pool, body }) {
  const cuerpo = body && Object.keys(body).length ? body : await leerCuerpoJson(request);
  const { rol, permisos } = await reemplazarPermisosDeRol(
    pool,
    params.codigo,
    cuerpo?.permisos ?? cuerpo?.permissions
  );

  return { data: { rol: rol.codigo, nombre: rol.nombre, permisos } };
}

/* Identidad, roles y permisos del usuario autenticado. Solo datos propios y ningun
   campo sensible: sin hash de contrasenia, sin tokens. */
export async function getMe({ contexto, pool }) {
  return {
    data: {
      usuario: { id: contexto.usuario.id },
      roles: await rolesDeUsuario(pool, contexto.usuario.id),
      permisos: contexto.permisos
    }
  };
}
