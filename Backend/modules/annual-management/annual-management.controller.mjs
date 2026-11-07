import annualManagementService from "./annual-management.service.mjs";

export function preview({ url, user }) {
  return annualManagementService.obtenerPreview(url.searchParams, user);
}

export function confirmar({ body, user, request }) {
  return annualManagementService.confirmarCierre(body, user, request);
}

export function informe({ url, user }) {
  return annualManagementService.obtenerInforme(url.searchParams, user);
}

export function historial({ user }) {
  return annualManagementService.historial(user);
}

export function registrarExportacion({ body, user, request }) {
  return annualManagementService.registrarExportacion(body, user, request);
}
