/* Exportacion en PDF (A4 apaisado) de la Nomina de Alumnos filtrada. */

import { ancho, cadena, cargarLogo } from "../../utils/pdf-base.js";
import { armarPdf, dispararDescargaPdf } from "../documents/constancias-pdf.js";

const A4_LAND_W = 841.89;
const A4_LAND_H = 595.28;
const M = 24;
const CW = A4_LAND_W - M * 2;

const BORDO = [0.349, 0.11, 0.137];
const OSCURO = [0.1, 0.13, 0.2];
const GRIS = [0.42, 0.44, 0.48];
const LINEA = [0.74, 0.76, 0.8];
const ZEBRA = [0.965, 0.97, 0.98];
const BLANCO = [1, 1, 1];

const n = (v) => Number(v.toFixed(2));
const col = (c) => c.map(n).join(" ");

export function generarNominaPdf(alumnos = [], filtrosTexto = "", logo = null) {
  const paginas = [];
  let ops = [];
  const nueva = () => {
    ops = [];
    paginas.push(ops);
  };
  nueva();

  const rect = (x, y, w, h, c) => ops.push(`${col(c)} rg ${n(x)} ${n(A4_LAND_H - y - h)} ${n(w)} ${n(h)} re f`);
  const marco = (x, y, w, h, c, g = 0.4) => ops.push(`${col(c)} RG ${g} w ${n(x)} ${n(A4_LAND_H - y - h)} ${n(w)} ${n(h)} re S`);
  const linea = (x1, y1, x2, y2, c, g = 0.35) => ops.push(`${col(c)} RG ${g} w ${n(x1)} ${n(A4_LAND_H - y1)} m ${n(x2)} ${n(A4_LAND_H - y2)} l S`);
  const texto = (val, x, y, tam, { negrita = false, c = OSCURO, alinear = "izq", w = 0, minimo = tam } = {}) => {
    let t = String(val ?? "");
    let s = tam;
    if (w) {
      while (s > minimo && ancho(t, s, negrita) > w) s = Math.max(minimo, +(s - 0.2).toFixed(2));
      if (ancho(t, s, negrita) > w) {
        while (t.length > 1 && ancho(`${t}...`, s, negrita) > w) t = t.slice(0, -1);
        t = `${t.trimEnd()}...`;
      }
    }
    let px = x;
    if (alinear === "centro") px = x + (w - ancho(t, s, negrita)) / 2;
    else if (alinear === "der") px = x + w - ancho(t, s, negrita);
    ops.push(`BT /${negrita ? "F2" : "F1"} ${s} Tf ${col(c)} rg ${n(px)} ${n(A4_LAND_H - y)} Td (${cadena(t)}) Tj ET`);
  };

  const cols = [
    { tit: "N°", w: 28, align: "centro" },
    { tit: "APELLIDO", w: 148, align: "izq" },
    { tit: "NOMBRE", w: 148, align: "izq" },
    { tit: "DNI", w: 78, align: "centro" },
    { tit: "CURSO", w: 50, align: "centro" },
    { tit: "DIV.", w: 42, align: "centro" },
    { tit: "TURNO", w: 70, align: "centro" },
    { tit: "TALLER", w: 66, align: "centro" },
    { tit: "CONDICION", w: 86, align: "centro" },
    { tit: "ESTADO", w: CW - (28 + 148 + 148 + 78 + 50 + 42 + 70 + 66 + 86), align: "centro" }
  ];

  const dibujarCabecera = () => {
    rect(M, M, CW, 42, BORDO);
    if (logo) ops.push(`q 30 0 0 30 ${n(M + 8)} ${n(A4_LAND_H - M - 36)} cm /Im1 Do Q`);
    const tx = logo ? M + 46 : M + 10;
    texto('E.E.S.T. N° 1 "CECILIA BERDICHEVSKY" - MONTE GRANDE', tx, M + 15, 7.5, { c: [0.95, 0.88, 0.89] });
    texto("NOMINA DE ALUMNOS", tx, M + 31, 11.5, { negrita: true, c: BLANCO });
    texto(`Total: ${alumnos.length} alumnos  |  ${new Date().toLocaleDateString("es-AR")}`, M + CW - 240, M + 16, 8, { negrita: true, c: BLANCO, alinear: "der", w: 230 });
    if (filtrosTexto) texto(filtrosTexto, M + CW - 360, M + 32, 7, { c: [0.95, 0.88, 0.89], alinear: "der", w: 350 });

    const yEnc = M + 48;
    rect(M, yEnc, CW, 18, [0.91, 0.92, 0.95]);
    marco(M, yEnc, CW, 18, LINEA, 0.45);
    let cx = M;
    cols.forEach((c, i) => {
      if (i > 0) linea(cx, yEnc, cx, yEnc + 18, LINEA);
      texto(c.tit, cx + 2, yEnc + 12, 7, { negrita: true, alinear: "centro", w: c.w - 4 });
      cx += c.w;
    });
    return yEnc + 18;
  };

  let y = dibujarCabecera();
  const hFila = 16;

  alumnos.forEach((a, idx) => {
    if (y + hFila > A4_LAND_H - M - 14) {
      nueva();
      y = dibujarCabecera();
    }
    if (idx % 2 === 1) rect(M, y, CW, hFila, ZEBRA);
    marco(M, y, CW, hFila, LINEA, 0.3);
    const vals = [
      String(idx + 1),
      a.apellido ?? "",
      a.nombre ?? "",
      a.dni ?? "",
      a.curso ?? "",
      a.division ?? "",
      a.turno ?? "",
      a.grupoTaller ?? "—",
      a.condicion ?? "",
      a.estado ?? ""
    ];
    let cx = M;
    vals.forEach((val, ci) => {
      if (ci > 0) linea(cx, y, cx, y + hFila, LINEA, 0.25);
      texto(String(val), cx + 3, y + 11, 7.2, {
        negrita: ci === 1,
        alinear: cols[ci].align,
        w: cols[ci].w - 6,
        minimo: 5.5
      });
      cx += cols[ci].w;
    });
    y += hFila;
  });

  return armarPdf(paginas, logo, { ancho: A4_LAND_W, alto: A4_LAND_H, sobreBordo: true });
}

export async function descargarNominaPdf(alumnos, filtrosTexto = "") {
  const logo = await cargarLogo();
  const bytes = generarNominaPdf(alumnos, filtrosTexto, logo);
  dispararDescargaPdf(bytes, `Nomina_alumnos_${new Date().toISOString().slice(0, 10)}.pdf`);
}
