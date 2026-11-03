/* Fechas del calendario: siempre "YYYY-MM-DD" en hora de Buenos Aires.

   Nunca se convierte una fecha de calendario con new Date("2026-03-02"): eso se
   interpreta como UTC y en Argentina (UTC-3) cae el dia anterior. Los dias se
   comparan como enteros UTC armados con Date.UTC(anio, mes, dia). */

export const ZONA_HORARIA = "America/Argentina/Buenos_Aires";

const formato = new Intl.DateTimeFormat("en-CA", { timeZone: ZONA_HORARIA, year: "numeric", month: "2-digit", day: "2-digit" });

export function hoyEnBuenosAires(ahora = new Date()) {
  return formato.format(ahora);
}

export function esFechaIso(valor) {
  if (typeof valor !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const [a, m, d] = valor.split("-").map(Number);
  const f = new Date(Date.UTC(a, m - 1, d));
  return f.getUTCFullYear() === a && f.getUTCMonth() === m - 1 && f.getUTCDate() === d;
}

function aDias(iso) {
  const [a, m, d] = iso.split("-").map(Number);
  return Math.round(Date.UTC(a, m - 1, d) / 86400000);
}

export function diasEntre(desde, hasta) {
  return aDias(hasta) - aDias(desde);
}

/* Estado temporal de un evento respecto de "hoy". */
export function estadoTemporal(evento, hoy) {
  const fin = evento.fechaFin ?? evento.fechaInicio;
  if (fin < hoy) return "finalizado";
  if (evento.fechaInicio > hoy) return "proximo";
  return evento.fechaInicio === hoy && fin === hoy ? "hoy" : "en_curso";
}
