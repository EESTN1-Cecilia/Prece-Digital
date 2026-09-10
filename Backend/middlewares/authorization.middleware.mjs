/* Autorización centralizada.

   Flujo: autenticado -> permisos del usuario -> ¿tiene el permiso requerido?

   La identidad del usuario sale de `identidadDelRequest`, que hoy es el único punto
   que hay que conectar cuando se implemente el login con JWT (issue #2). Nada de lo
   que envíe el cliente se usa para determinar roles ni permisos: se leen de la base
   a partir del id del usuario autenticado. */

import { appConfig } from "../config/app.config.mjs";
import { noAutenticado, sinPermisos } from "../utils/api-error.mjs";
import { permisosDeUsuario } from "../services/authorization.service.mjs";

/* Punto único de integración con la autenticación.
   Cuando exista el middleware de JWT, deberá dejar el usuario verificado en
   `request.usuario` y esta función no necesita cambiar. */
export function identidadDelRequest(request) {
  if (request?.usuario?.id) {
    return request.usuario;
  }

  /* Solo desarrollo: permite probar la API mientras el login no está implementado.
     Se ignora en producción y viene apagado salvo que se defina AUTH_DEV_USER_ID. */
  if (appConfig.env !== "production" && appConfig.authDevUserId) {
    return { id: appConfig.authDevUserId, origen: "dev" };
  }

  return null;
}

export async function contextoDeAutorizacion(request, pool) {
  const usuario = identidadDelRequest(request);

  if (!usuario) {
    throw noAutenticado();
  }

  return { usuario, permisos: await permisosDeUsuario(pool, usuario.id) };
}

/* Envuelve un controlador y le exige un permiso antes de ejecutarlo.
   El controlador recibe el contexto ya resuelto en `contexto`. */
export function requierePermiso(permiso, controlador) {
  return async (peticion) => {
    const contexto = await contextoDeAutorizacion(peticion.request, peticion.pool);

    if (!contexto.permisos.includes(permiso)) {
      throw sinPermisos();
    }

    return controlador({ ...peticion, contexto });
  };
}

/* Para endpoints que solo exigen sesión válida, sin un permiso puntual. */
export function requiereSesion(controlador) {
  return async (peticion) => {
    const contexto = await contextoDeAutorizacion(peticion.request, peticion.pool);
    return controlador({ ...peticion, contexto });
  };
}
