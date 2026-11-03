/* Importador de fechas oficiales (solo lectura, solo backend).

   Descarga HTML y PDF de hosts oficiales permitidos, los convierte a TEXTO y
   busca fechas con reglas fijas. Lo descargado nunca se ejecuta ni se
   interpreta como codigo. Solo se importan las fechas que las reglas reconocen
   con claridad y que caen en el anio lectivo pedido: ante cualquier duda no se
   inventa nada y el evento queda como esta.

   Reglas implementadas hoy: inicio de clases, finalizacion de clases, receso
   invernal. Sumar periodos de evaluacion, jornadas, etc. es agregar una regla
   a REGLAS una vez visto el documento oficial real. */

import { spawn } from "node:child_process";
import { esFechaIso } from "./calendario.fechas.mjs";

export const FUENTES_OFICIALES = [{ url: "https://abc.gob.ar/calendario_escolar", nombre: "Calendario Escolar (abc.gob.ar)" }];
export const HOSTS_PERMITIDOS = ["abc.gob.ar", "www.abc.gob.ar", "servicios2.abc.gob.ar", "normas.gba.gob.ar"];
const MAX_BYTES = 5 * 1024 * 1024;
const TIEMPO_LIMITE_MS = 15000;
const MAX_PDF = 3;

const MESES = { enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6, julio: 7, agosto: 8, septiembre: 9, setiembre: 9, octubre: 10, noviembre: 11, diciembre: 12 };
const iso = (a, m, d) => `${a}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
const sinAcentos = (t) => t.normalize("NFD").replace(/[̀-ͯ]/g, "");

/* ---------- Texto ---------- */
export function htmlATexto(html) {
  return sinAcentos(String(html))
    .replace(/<(script|style|noscript)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, " ").trim();
}

export function enlacesDe(html, base) {
  const salida = new Set();
  for (const m of String(html).matchAll(/href\s*=\s*["']([^"'#]+)["']/gi)) {
    try { salida.add(new URL(m[1], base).href); } catch { /* enlace invalido: se ignora */ }
  }
  return [...salida];
}

/* ---------- Fechas ---------- */
/* Devuelve [inicio, fin|null] dentro del fragmento, o null. Solo acepta el anio pedido. */
export function extraerFechas(fragmento, anio) {
  const t = sinAcentos(fragmento).toLowerCase();
  const mes = "(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)";
  /* Se toma el patron que aparece PRIMERO en el texto: la fecha pegada a la etiqueta. */
  const patrones = [
    [new RegExp(`\\bdel?\\s+(\\d{1,2})\\s+(?:de\\s+${mes}\\s+)?al\\s+(\\d{1,2})\\s+de\\s+${mes}(?:\\s+de\\s+(\\d{4}))?`), (m) => {
      const a = Number(m[5] ?? anio), mFin = MESES[m[4]], mIni = m[2] ? MESES[m[2]] : mFin;
      return { a, r: [iso(a, mIni, Number(m[1])), iso(a, mFin, Number(m[3]))] };
    }],
    [/(\d{1,2})\/(\d{1,2})\/(\d{4})/, (m) => ({ a: Number(m[3]), r: [iso(Number(m[3]), Number(m[2]), Number(m[1])), null] })],
    [new RegExp(`(\\d{1,2})\\s+de\\s+${mes}(?:\\s+de\\s+(\\d{4}))?`), (m) => {
      const a = Number(m[3] ?? anio);
      return { a, r: [iso(a, MESES[m[2]], Number(m[1])), null] };
    }]
  ];
  const hallazgos = patrones.map(([re, f]) => { const m = t.match(re); return m ? { i: m.index, ...f(m) } : null; }).filter(Boolean).sort((x, y) => x.i - y.i);
  const mejor = hallazgos[0];
  if (!mejor || mejor.a !== anio) return null;
  const [ini, fin] = mejor.r;
  if (!esFechaIso(ini) || (fin && (!esFechaIso(fin) || fin < ini))) return null;
  return [ini, fin];
}

export const REGLAS = [
  { clave: "inicio-clases", titulo: "Inicio de clases", categoria: "inicio_fin_clases", etiqueta: /inicio de (?:las )?clases|comienzo de (?:las )?clases/, descripcion: "Comienzan las clases." },
  { clave: "fin-clases", titulo: "Finalizacion de clases", categoria: "inicio_fin_clases", etiqueta: /(?:finalizacion|fin) de (?:las )?clases|cierre de (?:las )?clases/, descripcion: "Ultimo dia de clases del ciclo lectivo." },
  { clave: "receso-invernal", titulo: "Receso invernal", categoria: "receso", etiqueta: /receso (?:escolar )?invernal|vacaciones de invierno/, descripcion: "Receso escolar de invierno." }
];

/* Busca cada etiqueta y toma la primera fecha valida en los 90 caracteres siguientes. */
export function extraerEventos(texto, anio) {
  const t = sinAcentos(texto).toLowerCase();
  const halladas = [];
  for (const regla of REGLAS) {
    const re = new RegExp(regla.etiqueta.source, "g");
    for (const m of t.matchAll(re)) {
      const fechas = extraerFechas(t.slice(m.index + m[0].length, m.index + m[0].length + 90), anio);
      if (fechas) {
        halladas.push({ clave: regla.clave, titulo: regla.titulo, categoria: regla.categoria, descripcion: regla.descripcion, fechaInicio: fechas[0], fechaFin: fechas[1] ?? null, anioLectivo: anio });
        break;
      }
    }
  }
  return halladas;
}

/* ---------- Red ---------- */
function hostPermitido(url, hosts) {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && hosts.includes(u.hostname);
  } catch { return false; }
}

async function descargar(url, hosts, ejecutarFetch) {
  if (!hostPermitido(url, hosts)) throw new Error(`Host no permitido: ${url}`);
  const control = new AbortController();
  const timer = setTimeout(() => control.abort(), TIEMPO_LIMITE_MS);
  try {
    const r = await ejecutarFetch(url, { signal: control.signal, redirect: "follow", headers: { "User-Agent": "PreceDigital-calendario/1.0", Accept: "text/html,application/pdf" } });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    if (r.url && !hostPermitido(r.url, hosts)) throw new Error("Redireccion a un host no permitido");
    const largo = Number(r.headers.get("content-length") ?? 0);
    if (largo > MAX_BYTES) throw new Error("Documento demasiado grande");
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length > MAX_BYTES) throw new Error("Documento demasiado grande");
    return { buf, tipo: (r.headers.get("content-type") ?? "").toLowerCase() };
  } finally { clearTimeout(timer); }
}

function pdfATexto(buf) {
  return new Promise((resolver, rechazar) => {
    const p = spawn("pdftotext", ["-layout", "-", "-"], { stdio: ["pipe", "pipe", "ignore"] });
    const partes = [];
    p.stdout.on("data", (c) => partes.push(c));
    p.on("error", () => rechazar(new Error("pdftotext no disponible")));
    p.on("close", (codigo) => (codigo === 0 ? resolver(Buffer.concat(partes).toString("utf8")) : rechazar(new Error("PDF ilegible"))));
    p.stdin.on("error", () => {});
    p.stdin.end(buf);
  });
}

/* Consulta las fuentes. Devuelve { fuentes: [{url, ok, error?, eventos}], candidatos }. */
export async function consultarFuentes({ anio, fuentes = FUENTES_OFICIALES, hosts = HOSTS_PERMITIDOS, ejecutarFetch = fetch } = {}) {
  const resultado = [];
  const candidatos = new Map();
  for (const fuente of fuentes) {
    const entrada = { url: fuente.url, ok: false, eventos: 0 };
    resultado.push(entrada);
    try {
      const { buf, tipo } = await descargar(fuente.url, hosts, ejecutarFetch);
      const html = buf.toString("utf8");
      const textos = [{ url: fuente.url, texto: tipo.includes("pdf") ? await pdfATexto(buf) : htmlATexto(html) }];
      if (!tipo.includes("pdf")) {
        const pdfs = enlacesDe(html, fuente.url).filter((u) => /\.pdf(\?|$)/i.test(u) && hostPermitido(u, hosts)).slice(0, MAX_PDF);
        for (const u of pdfs) {
          try { const d = await descargar(u, hosts, ejecutarFetch); textos.push({ url: u, texto: await pdfATexto(d.buf) }); }
          catch (error) { entrada.avisos = [...(entrada.avisos ?? []), `${u}: ${error.message}`]; }
        }
      }
      for (const { url, texto } of textos) {
        for (const ev of extraerEventos(texto, anio)) {
          /* Los PDF/resoluciones mandan sobre la pagina: se procesan despues y pisan. */
          candidatos.set(ev.clave, { ...ev, fuente: fuente.nombre ?? fuente.url, urlReferencia: url });
          entrada.eventos += 1;
        }
      }
      entrada.ok = true;
    } catch (error) {
      entrada.error = String(error.message ?? error).slice(0, 200);
    }
  }
  return { fuentes: resultado, candidatos: [...candidatos.values()] };
}
