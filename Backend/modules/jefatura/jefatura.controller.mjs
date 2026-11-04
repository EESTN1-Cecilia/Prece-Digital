import jefaturaService from "./jefatura.service.mjs";

function query(url) {
  return Object.fromEntries(url.searchParams.entries());
}

export function listCursosGrupos({ url, user }) {
  return jefaturaService.listCursosGrupos(query(url), user);
}

export function guardarDivisionTalleres({ body, user }) {
  return jefaturaService.guardarDivisionTalleres(body, user);
}

export function listarDocentesTalleres({ url, user }) {
  return jefaturaService.listarDocentesTalleres(query(url), user);
}

export function guardarDocentesTalleres({ body, user }) {
  return jefaturaService.guardarDocentesTalleres(body, user);
}

export function getGrilla({ url, user }) {
  return jefaturaService.getGrilla(query(url), user);
}
