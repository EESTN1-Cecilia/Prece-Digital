/* Controlador de dispositivos: solo desempaqueta el contexto y delega al
   servicio. El usuario autenticado llega como `user` desde verifyToken. */

import devicesService from "./devices.service.mjs";

export function registrarDispositivo({ body, user }) {
  return devicesService.registrar(body, user);
}

export function listarDispositivos({ user }) {
  return devicesService.listar(user);
}

export function desasociarDispositivo({ params, user }) {
  return devicesService.desasociar(params.deviceId, user);
}
