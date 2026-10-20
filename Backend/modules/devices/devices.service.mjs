/* Servicio de dispositivos.

   Reglas de negocio:

   - La propiedad del dispositivo la establece SIEMPRE el Backend con el
     usuario del token verificado. Todo `userId`/`recipientId` que llegue en
     el cuerpo se ignora (solo se leen los campos del whitelist).
   - El registro es idempotente por `installationId`:
       * instalacion nueva            -> 201, registro activo para el usuario del token;
       * misma cuenta, ya registrada  -> 200, actualiza plataforma/token y queda activa;
       * instalacion de otra cuenta   -> 200, se reasigna a la cuenta actual
         (una instalacion fisica pertenece, a la vez, a la última cuenta que
         la registro: es lo que espera el flujo "cambiar de cuenta").
   - El token push es opcional hasta que exista integracion con un proveedor:
     una instalacion sin token queda registrada para poder completar el token
     mas tarde re-registrando con el mismo `installationId`.
   - Desasociar marca el registro inactivo (baja logica): queda la traza para
     auditoria y una instalacion puede reactivarse re-registrandose.
     Operar sobre un device ajeno o inexistente responde 404 generico, para no
     revelar la existencia de dispositivos de otros usuarios; repetir una
     desasociacion es no-op con 200.
   - Las respuestas nunca incluyen el token completo (solo `hasPushToken`). */

import { errorDeValidacion, errorHttp } from "../../utils/api-error.mjs";
import devicesRepository from "./devices.repository.mjs";

const LONGITUD_MAX_INSTALACION = 128;
const LONGITUD_MAX_TOKEN = 4096;
export const PLATAFORMAS = ["android", "ios"];

function esTextoOk(valor) {
  return typeof valor === "string" && valor.length > 0;
}

function validarRegistro(cuerpo) {
  const errores = [];

  let installationId = "";
  if (typeof cuerpo.installationId !== "string" || cuerpo.installationId.trim().length === 0) {
    errores.push({ field: "installationId", message: "El identificador de instalacion es obligatorio." });
  } else {
    installationId = cuerpo.installationId.trim();
    if (installationId.length > LONGITUD_MAX_INSTALACION) {
      errores.push({ field: "installationId", message: `No puede superar ${LONGITUD_MAX_INSTALACION} caracteres.` });
    }
    if (/\s/.test(installationId)) {
      errores.push({ field: "installationId", message: "No puede contener espacios." });
    }
  }

  let platform = "";
  if (typeof cuerpo.platform !== "string" || cuerpo.platform.trim().length === 0) {
    errores.push({ field: "platform", message: `La plataforma es obligatoria (${PLATAFORMAS.join(", ")}).` });
  } else {
    platform = cuerpo.platform.trim();
    if (!PLATAFORMAS.includes(platform)) {
      errores.push({ field: "platform", message: `Plataforma no soportada. Valores: ${PLATAFORMAS.join(", ")}.` });
    }
  }

  let pushToken = null;
  if (cuerpo.pushToken !== undefined && cuerpo.pushToken !== null) {
    if (typeof cuerpo.pushToken !== "string" || cuerpo.pushToken.trim().length === 0) {
      errores.push({ field: "pushToken", message: "El token push, si viene, debe ser texto no vacío." });
    } else {
      pushToken = cuerpo.pushToken.trim();
      if (pushToken.length > LONGITUD_MAX_TOKEN) {
        errores.push({ field: "pushToken", message: `No puede superar ${LONGITUD_MAX_TOKEN} caracteres.` });
      }
      if (/\s/.test(pushToken)) {
        errores.push({ field: "pushToken", message: "No puede contener espacios." });
      }
    }
  }

  if (errores.length) throw errorDeValidacion(errores);

  return { installationId, platform, pushToken };
}

const devicesService = {
  /* POST /api/v1/devices: registro idempotente (crear / actualizar / reactivar /
     reasignar). El userId del cuerpo, si llega, se descarta silenciosamente. */
  registrar(cuerpo = {}, user) {
    const datos = validarRegistro(cuerpo);
    const existente = devicesRepository.findByInstallationId(datos.installationId);

    if (!existente) {
      const creado = devicesRepository.create({
        userId: user.id,
        installationId: datos.installationId,
        platform: datos.platform,
        pushToken: datos.pushToken
      });
      return { statusCode: 201, body: { data: devicesRepository.vistaPublica(creado) } };
    }

    const patch = { platform: datos.platform, isActive: true, pushToken: existente.pushToken };
    if (datos.pushToken !== null) {
      patch.pushToken = datos.pushToken;
    }

    /* Re-registro desde otra cuenta: la instalacion pertenece a la ultima cuenta
       que la registro y a el se reasigna. */
    if (existente.userId !== user.id) {
      patch.userId = user.id;
    }

    const actualizado = devicesRepository.update(existente.id, patch);
    return { statusCode: 200, body: { data: devicesRepository.vistaPublica(actualizado) } };
  },

  /* GET /api/v1/devices: solo los del usuario autenticado, sin token completo. */
  listar(user) {
    const dispositivos = devicesRepository
      .listByUser(user.id)
      .map((record) => devicesRepository.vistaPublica(record));
    return { statusCode: 200, body: { data: dispositivos } };
  },

  /* DELETE /api/v1/devices/:deviceId: baja logica del device propio. */
  desasociar(deviceId, user) {
    const dispositivo = devicesRepository.findById(deviceId);

    /* 404 generico por inexistente o ajeno: no revelar dispositivos de otros. */
    if (!dispositivo || dispositivo.userId !== user.id) {
      throw errorHttp(404, "NOT_FOUND", "Dispositivo no encontrado");
    }

    if (dispositivo.isActive) {
      devicesRepository.update(dispositivo.id, { isActive: false });
    }

    const vigente = devicesRepository.findById(dispositivo.id);
    return { statusCode: 200, body: { data: devicesRepository.vistaPublica(vigente) } };
  }
};

export default devicesService;
