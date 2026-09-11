/* Controlador de auditoría.

   Expone la consulta y la descarga de los reportes de auditoría y de errores.
   Nunca devuelve contraseñas ni tokens: la sanitización ocurre en el servicio
   al momento de registrar. */

import auditService from "./audit.service.mjs";

function queryDe(url) {
  return Object.fromEntries(url.searchParams.entries());
}

export function listLogs({ url }) {
  return { data: auditService.list(queryDe(url)) };
}

export function getLog({ params }) {
  return auditService.getById(params.logId);
}

export function listErrors({ url }) {
  return { data: auditService.listErrors(queryDe(url)) };
}

export function getError({ params }) {
  return auditService.getErrorById(params.errorId);
}

export function report() {
  return auditService.report();
}

export function exportCsv({ url, response }) {
  const logs = auditService.list(queryDe(url));
  const csv = auditService.aCsv(logs);
  const fecha = new Date().toISOString().slice(0, 10);

  response.writeHead(200, {
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": `attachment; filename="auditoria-${fecha}.csv"`,
    "Cache-Control": "no-store"
  });
  response.end(`\uFEFF${csv}`);
}