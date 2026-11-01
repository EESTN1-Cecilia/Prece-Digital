/* Logica pura del calendario (sin React ni red), para poder probarla.

   Las fechas viajan como "AAAA-MM-DD" y NUNCA se convierten con new Date("AAAA-MM-DD")
   (eso es UTC y en Argentina cae el dia anterior). "Hoy" se calcula en la zona
   America/Argentina/Buenos_Aires. */

export const CLAVE_FOCO = "prece:calendario:foco";
export const ZONA_HORARIA = "America/Argentina/Buenos_Aires";
export const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
export const DIAS_CORTOS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const DIAS_LARGOS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

export const CATEGORIAS = {
  inicio_fin_clases: "Inicio / fin de clases",
  receso: "Receso",
  evaluacion: "Evaluación",
  intensificacion: "Intensificación",
  inscripcion: "Inscripción",
  jornada: "Jornada institucional",
  reunion_docente: "Reunión docente",
  feriado: "Feriado",
  efemeride: "Efeméride",
  otro: "Otra fecha"
};
export const AMBITOS = { general: "Calendario escolar", docente: "Actividades docentes", institucional: "Institucional" };

const formato = new Intl.DateTimeFormat("en-CA", { timeZone: ZONA_HORARIA, year: "numeric", month: "2-digit", day: "2-digit" });
export const hoyEnBuenosAires = (ahora = new Date()) => formato.format(ahora);

const dias = (iso) => {
  const [a, m, d] = iso.split("-").map(Number);
  return Math.round(Date.UTC(a, m - 1, d) / 86400000);
};
export const diasEntre = (desde, hasta) => dias(hasta) - dias(desde);
export const armarIso = (a, m, d) => `${a}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
export const partesDe = (iso) => { const [a, m, d] = iso.split("-").map(Number); return { anio: a, mes: m, dia: d }; };

export function sumarMeses(anio, mes, delta) {
  const total = anio * 12 + (mes - 1) + delta;
  return { anio: Math.floor(total / 12), mes: (total % 12) + 1 };
}

/* Semanas del mes (lunes a domingo). Cada celda: { iso, dia, delMes }. */
export function semanasDelMes(anio, mes) {
  const primero = new Date(Date.UTC(anio, mes - 1, 1));
  const desfase = (primero.getUTCDay() + 6) % 7;
  const inicio = Date.UTC(anio, mes - 1, 1 - desfase);
  const total = Math.ceil((desfase + new Date(Date.UTC(anio, mes, 0)).getUTCDate()) / 7);
  return Array.from({ length: total }, (_, s) =>
    Array.from({ length: 7 }, (_, d) => {
      const f = new Date(inicio + (s * 7 + d) * 86400000);
      return { iso: armarIso(f.getUTCFullYear(), f.getUTCMonth() + 1, f.getUTCDate()), dia: f.getUTCDate(), delMes: f.getUTCMonth() === mes - 1 };
    })
  );
}

export const finDe = (ev) => ev.fechaFin ?? ev.fechaInicio;
export const eventosDelDia = (eventos, iso) => eventos.filter((e) => e.fechaInicio <= iso && finDe(e) >= iso);

/* Estado temporal calculado en el cliente con la misma regla que el backend. */
export function estadoTemporal(ev, hoy) {
  if (finDe(ev) < hoy) return "finalizado";
  if (ev.fechaInicio > hoy) return "proximo";
  return ev.fechaInicio === hoy && finDe(ev) === hoy ? "hoy" : "en_curso";
}

export function formatoFecha(iso, { conDia = true } = {}) {
  const { anio, mes, dia } = partesDe(iso);
  const nombre = DIAS_LARGOS[new Date(Date.UTC(anio, mes - 1, dia)).getUTCDay()];
  return `${conDia ? `${nombre} ` : ""}${dia} de ${MESES[mes - 1].toLowerCase()} de ${anio}`;
}

export function textoPeriodo(ev) {
  if (!ev.fechaFin || ev.fechaFin === ev.fechaInicio) return formatoFecha(ev.fechaInicio);
  const a = partesDe(ev.fechaInicio), b = partesDe(ev.fechaFin);
  const inicio = a.mes === b.mes && a.anio === b.anio ? `${a.dia}` : `${a.dia} de ${MESES[a.mes - 1].toLowerCase()}`;
  return `Del ${inicio} al ${b.dia} de ${MESES[b.mes - 1].toLowerCase()} de ${b.anio}`;
}

const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;

/* Frase del contador, derivada solo de las fechas del evento. */
export function textoDias(ev, hoy) {
  const estado = estadoTemporal(ev, hoy);
  if (estado === "finalizado") return "Finalizado";
  if (estado === "hoy") return "Es hoy";
  if (estado === "proximo") {
    const n = diasEntre(hoy, ev.fechaInicio);
    return n === 1 ? "Es mañana" : `Faltan ${plural(n, "día", "días")}`;
  }
  const n = diasEntre(hoy, finDe(ev));
  return n === 0 ? "Último día" : `En curso · ${n === 1 ? "termina mañana" : `termina en ${n} días`}`;
}

/* Etapa del aviso: el mismo evento solo vuelve a avisar al pasar a una etapa mas cercana. */
export function etapaDeAviso(ev, hoy) {
  const estado = estadoTemporal(ev, hoy);
  if (estado === "hoy" || estado === "en_curso") return "vigente";
  const n = diasEntre(hoy, ev.fechaInicio);
  return n <= 1 ? "1" : n <= 3 ? "3" : n <= 7 ? "7" : "14";
}
export const claveDeAviso = (ev, hoy) => `${ev.id}|${ev.fechaInicio}|${etapaDeAviso(ev, hoy)}`;

export function agruparAgenda(eventos, hoy) {
  const con = eventos.map((e) => ({ ...e, estadoTemporal: estadoTemporal(e, hoy) }));
  const orden = (a, b) => a.fechaInicio.localeCompare(b.fechaInicio);
  return {
    vigentes: con.filter((e) => ["hoy", "en_curso"].includes(e.estadoTemporal) && e.estadoVerificacion === "verificado").sort(orden),
    proximos: con.filter((e) => e.estadoTemporal === "proximo" && e.estadoVerificacion === "verificado").sort(orden),
    pendientes: con.filter((e) => e.estadoVerificacion !== "verificado" && e.estadoTemporal !== "finalizado").sort(orden),
    finalizados: con.filter((e) => e.estadoTemporal === "finalizado").sort((a, b) => orden(b, a))
  };
}
