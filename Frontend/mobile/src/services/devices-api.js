/* Gestion de dispositivos de la instalacion (preparacion para push).
   Reutiliza el cliente HTTP comun (api.js) y la sesion existente. La propiedad
   del dispositivo la determina el Backend con el access token: nunca se envia
   userId desde Mobile. */

import { pedir } from "./api.js";

const RUTA_DISPOSITIVOS = "/api/v1/devices";

function armarCuerpo({ installationId, platform, pushToken }) {
  if (!installationId || !platform) {
    throw new Error("Se requiere el identificador de instalacion y la plataforma");
  }

  const cuerpo = { installationId, platform };

  /* Solo se envian los campos del whitelist: nada de userId/recipientId. */
  if (typeof pushToken === "string" && pushToken.trim().length > 0) {
    cuerpo.pushToken = pushToken.trim();
  }

  return cuerpo;
}

/* POST /api/v1/devices: registro idempotente (crea, actualiza, reactiva o
   reasigna la instalacion segun el estado del Backend). */
export async function registrarDispositivo(datos = {}) {
  return pedir(RUTA_DISPOSITIVOS, { metodo: "POST", cuerpo: armarCuerpo(datos) });
}

/* GET /api/v1/devices: los dispositivos del usuario autenticado. */
export async function listarDispositivos() {
  return pedir(RUTA_DISPOSITIVOS, { metodo: "GET" });
}

/* DELETE /api/v1/devices/:deviceId: baja logica del device propio. */
export async function desasociarDispositivo(id) {
  if (!id) {
    throw new Error("Se requiere el identificador del dispositivo");
  }
  return pedir(`${RUTA_DISPOSITIVOS}/${id}`, { metodo: "DELETE" });
}
