








import { appConfig } from "../config/app.config.mjs";
import { noAutenticado, sinPermisos } from "../utils/api-error.mjs";
import { permisosDeUsuario } from "../services/authorization.service.mjs";




export function identidadDelRequest(request) {
  if (request?.usuario?.id) {
    return request.usuario;
  }

  

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



export function requierePermiso(permiso, controlador) {
  return async (peticion) => {
    const contexto = await contextoDeAutorizacion(peticion.request, peticion.pool);

    if (!contexto.permisos.includes(permiso)) {
      throw sinPermisos();
    }

    return controlador({ ...peticion, contexto });
  };
}


export function requiereSesion(controlador) {
  return async (peticion) => {
    const contexto = await contextoDeAutorizacion(peticion.request, peticion.pool);
    return controlador({ ...peticion, contexto });
  };
}
