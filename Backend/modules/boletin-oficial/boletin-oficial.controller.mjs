import boletinOficialService from "./boletin-oficial.service.mjs";

function query(url) {
  return Object.fromEntries(url.searchParams.entries());
}

export function obtener({ params, url }) {
  return { statusCode: 200, body: { data: boletinOficialService.obtener(params.alumnoId, query(url)) } };
}

export function listar({ url }) {
  return { statusCode: 200, body: { data: boletinOficialService.listar(query(url)) } };
}

export function guardar({ params, body, user }) {
  return { statusCode: 200, body: { data: boletinOficialService.guardar(params.alumnoId, body, user) } };
}

export function resumenDeCurso({ url }) {
  return { statusCode: 200, body: { data: boletinOficialService.resumenDeCurso(query(url)) } };
}
