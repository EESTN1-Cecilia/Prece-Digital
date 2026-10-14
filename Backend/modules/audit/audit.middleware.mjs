/* Middleware de auditoría transversal.

   `auditarAccion` envuelve cualquier controlador y, tras una respuesta exitosa,
   registra la acción con usuario, fecha, valores anterior/nuevo e IP. Se usa para
   cubrir de forma explícita los accesos sensibles y las exportaciones, además del
   registro automático de altas/modificaciones/bajas que ya hace `auditService.registrarRequest`
   en el arranque de la app (src/app.mjs). Los fallos se registran por separado en
   middlewares/error.middleware.mjs.

   El registro nunca falla la petición: cualquier problema de auditoría se ignora. */

import auditService from "./audit.service.mjs";
import { obtenerIp } from "./audit.service.mjs";

function accionSegunMetodo(metodo) {
  const mapa = { POST: "create", PATCH: "update", PUT: "update", DELETE: "delete", GET: "access" };
  return mapa[metodo] ?? "access";
}

function registrarId(peticion, tabla) {
  if (peticion?.params?.id) return peticion.params.id;

  if (tabla && peticion?.params) {
    const clave = Object.keys(peticion.params).find((param) => param.toLowerCase().includes("id"));
    return clave ? peticion.params[clave] : null;
  }

  return null;
}

export function auditarAccion({ tabla, accion, obtenerAnterior } = {}) {
  return function conAuditoria(controlador) {
    return async (peticion) => {
      let valorAnterior = null;

      if (typeof obtenerAnterior === "function") {
        try {
          valorAnterior = await obtenerAnterior(peticion);
        } catch {
          valorAnterior = null;
        }
      }

      const resultado = await controlador(peticion);

      try {
        auditService.registrar({
          usuarioId:
            peticion?.contexto?.usuario?.id ??
            peticion?.request?.usuario?.id ??
            peticion?.usuario?.id ??
            null,
          escuelaId: peticion?.body?.schoolId ?? peticion?.params?.schoolId ?? null,
          accion: accion ?? accionSegunMetodo(peticion?.request?.method),
          tabla: tabla ?? peticion?.auditTabla ?? null,
          registroId: registrarId(peticion, tabla),
          valorAnterior,
          valorNuevo: peticion?.body ?? {},
          motivo: peticion?.body?.motivo ?? null,
          metodo: peticion?.request?.method ?? null,
          ruta: peticion?.url?.pathname ?? null,
          ip: obtenerIp(peticion?.request)
        });
      } catch {
        /* La auditoría nunca interrumpe el flujo principal. */
      }

      return resultado;
    };
  };
}