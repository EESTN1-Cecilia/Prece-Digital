import { reportsService } from "./reports.service.mjs";

export function listReports({ url }) {
  const resultado = reportsService.list(Object.fromEntries(url.searchParams.entries()));

  return {
    statusCode: 200,
    body: { data: resultado.items, paginacion: resultado.paginacion }
  };
}

export function listTemplates() {
  return { data: reportsService.plantillas() };
}

export function getReport({ params }) {
  return { data: reportsService.get(params.reportId) };
}

export function createReport({ user, body }) {
  return { statusCode: 201, body: { data: reportsService.create(user, body) } };
}

export function updateReport({ user, params, body }) {
  return { data: reportsService.update(user, params.reportId, body) };
}

export function deleteReport({ user, params }) {
  return { data: reportsService.remove(user, params.reportId) };
}

export function listVersions({ params }) {
  return { data: reportsService.versiones(params.reportId) };
}

export function restoreVersion({ user, params }) {
  return { data: reportsService.restaurar(user, params.reportId, params.versionId) };
}

/* El PDF se devuelve como archivo binario: se escribe directo en la respuesta
   porque no es un JSON de la API. */
export function exportPdf({ params, response }) {
  const { buffer, nombre } = reportsService.pdf(params.reportId);

  response.writeHead(200, {
    "Content-Type": "application/pdf",
    "Content-Disposition": `attachment; filename="${nombre}"`,
    "Content-Length": buffer.length,
    "Cache-Control": "no-store"
  });
  response.end(buffer);
}
