/* Generador de PDF oficial A4 para el Libro Matriz / Certificado Analitico. */

import { ancho, cadena, cargarLogo } from "../../utils/pdf-base.js";
import { armarPdf, dispararDescargaPdf, limpiarNombreArchivo } from "../documents/constancias-pdf.js";

const A4_W = 595.28;
const A4_H = 841.89;
const M = 26;
const CW = A4_W - M * 2;

const CABECERA_OFICIAL = [0.886, 0.91, 0.941];
const OSCURO = [0.1, 0.13, 0.2];
const GRIS = [0.4, 0.42, 0.46];
const LINEA = [0.45, 0.48, 0.52];
const CABECERA_ANIO = [0.945, 0.96, 0.976];
const ZEBRA = [0.98, 0.985, 0.99];
const BLANCO = [1, 1, 1];

const n = (v) => Number(v.toFixed(2));
const col = (c) => c.map(n).join(" ");

export function generarMatrizPdf({ datosEstudiante = {}, orientacionNombre = "", anios = [], promedio = {} }, logo = null) {
  const paginas = [];
  let ops = [];
  const nuevaPagina = () => {
    ops = [];
    paginas.push(ops);
  };
  nuevaPagina();

  const rect = (x, y, w, h, c) => ops.push(`${col(c)} rg ${n(x)} ${n(A4_H - y - h)} ${n(w)} ${n(h)} re f`);
  const marco = (x, y, w, h, c, g = 0.4) => ops.push(`${col(c)} RG ${g} w ${n(x)} ${n(A4_H - y - h)} ${n(w)} ${n(h)} re S`);
  const linea = (x1, y1, x2, y2, c, g = 0.4) => ops.push(`${col(c)} RG ${g} w ${n(x1)} ${n(A4_H - y1)} m ${n(x2)} ${n(A4_H - y2)} l S`);
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
    ops.push(`BT /${negrita ? "F2" : "F1"} ${s} Tf ${col(c)} rg ${n(px)} ${n(A4_H - y)} Td (${cadena(t)}) Tj ET`);
  };

  // Cabecera pagina 1
  rect(M, M, CW, 46, CABECERA_OFICIAL);
  marco(M, M, CW, 46, LINEA, 0.5);
  if (logo) ops.push(`q 34 0 0 34 ${n(M + 8)} ${n(A4_H - M - 40)} cm /Im1 Do Q`);
  const tx = logo ? M + 50 : M + 10;
  texto("PROVINCIA DE BUENOS AIRES · DIRECCION GENERAL DE CULTURA Y EDUCACION", tx, M + 15, 7, { c: GRIS });
  texto('LIBRO MATRIZ Y CERTIFICADO ANALITICO - E.E.S.T. N° 1 "CECILIA BERDICHEVSKY"', tx, M + 30, 9.5, { negrita: true, c: OSCURO, w: CW - 60, minimo: 7.5 });
  texto(`Orientacion: ${orientacionNombre || "Secundaria Tecnica"}`, tx, M + 41, 7.5, { c: GRIS });

  let y = M + 52;
  const nombre = `${datosEstudiante.apellido || ""}, ${datosEstudiante.nombre || ""}`.replace(/^,\s*|,\s*$/g, "").trim() || "Estudiante";
  rect(M, y, CW, 26, CABECERA_ANIO);
  marco(M, y, CW, 26, LINEA, 0.45);
  texto(`ESTUDIANTE: ${nombre}`, M + 8, y + 10, 8, { negrita: true, w: CW * 0.56 });
  texto(`DNI: ${datosEstudiante.dni || "S/D"}`, M + CW * 0.58, y + 10, 8, { negrita: true });
  texto(`LIBRO: ${datosEstudiante.libro || "-"}   FOLIO: ${datosEstudiante.folio || "-"}`, M + CW * 0.78, y + 10, 7.5, { c: GRIS });
  texto(`LEGAJO: ${datosEstudiante.legajo || "-"}   |   PROMEDIO GENERAL: ${promedio.promedioNumerico || "-"} (${promedio.promedioTexto || "-"})`, M + 8, y + 21, 7.2, { c: GRIS });
  y += 32;

  const cols = [
    { tit: "ESPACIO CURRICULAR", w: 232, align: "izq" },
    { tit: "CALIF.", w: 40, align: "centro" },
    { tit: "EN LETRAS", w: 85, align: "izq" },
    { tit: "CONDICION", w: 66, align: "centro" },
    { tit: "MES", w: 36, align: "centro" },
    { tit: "ANO", w: 36, align: "centro" },
    { tit: "ESTAB.", w: CW - (232 + 40 + 85 + 66 + 36 + 36), align: "centro" }
  ];

  const dibujarTablaAnio = (anio) => {
    const materias = anio.materias || [];
    const altoNecesario = 24 + materias.length * 12;
    if (y + Math.min(altoNecesario, 60) > A4_H - M - 40) {
      nuevaPagina();
      y = M;
    }

    rect(M, y, CW, 13, CABECERA_OFICIAL);
    marco(M, y, CW, 13, LINEA, 0.4);
    texto(`${anio.titulo} ANO`, M + 6, y + 9.5, 7.5, { negrita: true, c: OSCURO });
    y += 13;

    rect(M, y, CW, 11, CABECERA_ANIO);
    marco(M, y, CW, 11, LINEA, 0.35);
    let cx = M;
    cols.forEach((c, i) => {
      if (i > 0) linea(cx, y, cx, y + 11, LINEA, 0.35);
      texto(c.tit, cx + 2, y + 8, 6, { negrita: true, alinear: "centro", w: c.w - 4 });
      cx += c.w;
    });
    y += 11;

    materias.forEach((m, idx) => {
      if (y + 12 > A4_H - M - 30) {
        nuevaPagina();
        y = M;
      }
      if (idx % 2 === 1) rect(M, y, CW, 11.5, ZEBRA);
      marco(M, y, CW, 11.5, LINEA, 0.3);
      const vals = [
        m.espacio || m.materia || "",
        m.calificacion || "-",
        m.calificacionTexto || "-",
        m.condicion || "-",
        m.mes || "-",
        m.anio || "-",
        m.establecimiento || "Este Est."
      ];
      let x = M;
      vals.forEach((val, ci) => {
        if (ci > 0) linea(x, y, x, y + 11.5, LINEA, 0.25);
        texto(String(val), x + 2.5, y + 8.3, 6.2, {
          negrita: ci === 0 || ci === 1,
          alinear: cols[ci].align,
          w: cols[ci].w - 5,
          minimo: 5
        });
        x += cols[ci].w;
      });
      y += 11.5;
    });
    y += 6;
  };

  anios.forEach((anio) => {
    dibujarTablaAnio(anio);
    if (anio.clave === "cuarto" && anios.length > 4) {
      nuevaPagina();
      y = M;
    }
  });

  // Pie de firmas
  if (y + 52 > A4_H - M) {
    nuevaPagina();
    y = M + 20;
  }
  const yFirma = Math.min(A4_H - M - 18, y + 36);
  const firmas = ["Sello del Establecimiento", "Secretaria", "Direccion"];
  const fw = (CW - 40) / 3;
  firmas.forEach((et, i) => {
    const fx = M + i * (fw + 20);
    linea(fx + 8, yFirma, fx + fw - 8, yFirma, OSCURO, 0.6);
    texto(et, fx, yFirma + 11, 7.5, { negrita: true, c: GRIS, alinear: "centro", w: fw });
  });

  return armarPdf(paginas, logo, { ancho: A4_W, alto: A4_H, sobreBordo: false });
}

export async function descargarMatrizPdf(datos) {
  const logo = await cargarLogo();
  const bytes = generarMatrizPdf(datos, logo);
  const nom = limpiarNombreArchivo(`${datos.datosEstudiante?.apellido || ""}_${datos.datosEstudiante?.nombre || ""}`) || "alumno";
  dispararDescargaPdf(bytes, `Libro_Matriz_${nom}.pdf`);
}
