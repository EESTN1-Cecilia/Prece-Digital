import jefaturaService from "./jefatura.service.mjs";

function query(url) {
  return Object.fromEntries(url.searchParams.entries());
}

export function listCursosGrupos({ url, user }) {
  return jefaturaService.listCursosGrupos(query(url), user);
}

export function getGrilla({ url, user }) {
  return jefaturaService.getGrilla(query(url), user);
}
