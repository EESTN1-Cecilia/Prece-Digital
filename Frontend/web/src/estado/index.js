/* Estado global de la aplicacion.

   Punto unico de importacion:

       import { useSesion, usePermisos } from "../../estado/index.js";

   La guia esta en estado/README.md. */

export { ProveedorEstado, ContextoEstado, ESTADO_INICIAL, FASE, SESION, reducir } from "./proveedor.js";
export { useSesion, usePermisos, useNotificaciones, useErrorGlobal, useCarga } from "./hooks.js";
