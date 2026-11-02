/* Periodos de carga de notas (bloqueo por la Direccion).

     GET /api/v1/calificaciones/periodos?anio=       estado de cada periodo
     PUT /api/v1/calificaciones/periodos/:anio       { periodos: { cuatrimestre1: false } }

   Las funciones de este archivo no dependen de React: la planilla y el tablero
   del director las usan, y se prueban con node --test. La validacion definitiva
   la hace el backend (409 PERIODO_BLOQUEADO). */

import { pedir } from "../../services/http.js";

export const PERIODOS_CARGA_IDS = ["cuatrimestre1", "cuatrimestre2", "diciembre", "febrero"];

/* Admin y director cargan aunque el periodo este bloqueado (igual que el backend). */
const ROLES_SIN_BLOQUEO = ["admin", "director"];

export const PeriodosCargaService = {
  obtener(anio) {
    return pedir(`/api/v1/calificaciones/periodos?anio=${encodeURIComponent(anio)}`);
  },

  /* `periodos`: { cuatrimestre1: true | false, ... } (solo los que cambian). */
  actualizar(anio, periodos) {
    return pedir(`/api/v1/calificaciones/periodos/${encodeURIComponent(anio)}`, {
      method: "PUT",
      body: JSON.stringify({ periodos })
    });
  }
};

/* Codigos de rol a partir de las asignaciones del usuario o de la sesion. */
function codigosDeRol(roles = []) {
  return roles.map((rol) => rol?.role ?? rol?.id ?? rol).filter(Boolean);
}

export function ignoraBloqueo(roles = []) {
  return codigosDeRol(roles).some((codigo) => ROLES_SIN_BLOQUEO.includes(codigo));
}

/* { cuatrimestre1: true, ... } con true = bloqueado PARA ESTE USUARIO. */
export function bloqueosDe(estado, roles = []) {
  const sinBloqueo = ignoraBloqueo(roles);
  const lista = estado?.periodos ?? [];

  return Object.fromEntries(
    PERIODOS_CARGA_IDS.map((id) => {
      const periodo = lista.find((item) => item.id === id);
      return [id, !sinBloqueo && periodo?.habilitado === false];
    })
  );
}

/* Nombres de los periodos bloqueados (para avisos). */
export function periodosBloqueados(estado) {
  return (estado?.periodos ?? []).filter((periodo) => periodo.habilitado === false).map((periodo) => periodo.nombre);
}

/* "1° cuatrimestre", "1° cuatrimestre y febrero", "a, b y c". */
export function enumerar(nombres = []) {
  if (nombres.length <= 1) return nombres[0] ?? "";
  return `${nombres.slice(0, -1).join(", ")} y ${nombres[nombres.length - 1]}`;
}
