/* Exportacion de la Planilla de Asistencias en PDF (A4 apaisado, 1 hoja)
   y Excel (.xlsx). Sin librerias externas para PDF (usa pdf-base.js). */

import { ancho, cadena, cargarLogo } from "../../utils/pdf-base.js";
import { armarPdf, dispararDescargaPdf, limpiarNombreArchivo } from "../documents/constancias-pdf.js";

const A4_LAND_W = 841.89;
const A4_LAND_H = 595.28;
const M = 18;
const CW = A4_LAND_W - M * 2;

const BORDO = [0.349, 0.11, 0.137];
const OSCURO = [0.1, 0.13, 0.2];
const GRIS = [0.42, 0.44, 0.48];
const LINEA = [0.7, 0.72, 0.76];
const ZEBRA = [0.96, 0.965, 0.975];
const FINDE = [0.91, 0.92, 0.94];
const VERDE = [0.09, 0.45, 0.22];
const ROJO = [0.72, 0.12, 0.12];
const AMBAR = [0.65, 0.38, 0.02];
const AZUL = [0.12, 0.35, 0.68];
const BLANCO = [1, 1, 1];

const n = (v) => Number(v.toFixed(2));
const col = (c) => c.map(n).join(" ");

function nombreArchivoAsistencias({ cursoActual, mesNombre, anio }, ext) {
  const curso = limpiarNombreArchivo(`${cursoActual?.curso ?? ""}_${cursoActual?.division ?? ""}`) || "curso";
  const mes = limpiarNombreArchivo(mesNombre || "mes");
  return `Asistencias_${curso}_${mes}_${anio || new Date().getFullYear()}.${ext}`;
}

export function generarAsistenciasPdf(
  { cursoActual = {}, mesNombre = "", anio = new Date().getFullYear(), diasMes = [], alumnos = [], registros = {}, calcularTotalesAlumno, balanceMensual = {}, esDocente = false },
  logo = null
) {
  const ops = [];
  const rect = (x, y, w, h, c) => ops.push(`${col(c)} rg ${n(x)} ${n(A4_LAND_H - y - h)} ${n(w)} ${n(h)} re f`);
  const marco = (x, y, w, h, c, g = 0.45) => ops.push(`${col(c)} RG ${g} w ${n(x)} ${n(A4_LAND_H - y - h)} ${n(w)} ${n(h)} re S`);
  const linea = (x1, y1, x2, y2, c, g = 0.4) => ops.push(`${col(c)} RG ${g} w ${n(x1)} ${n(A4_LAND_H - y1)} m ${n(x2)} ${n(A4_LAND_H - y2)} l S`);
  const texto = (val, x, y, tam, { negrita = false, c = OSCURO, alinear = "izq", w = 0, minimo = tam } = {}) => {
    let t = String(val ?? "");
    let s = tam;
    if (w) {
      while (s > minimo && ancho(t, s, negrita) > w) s = Math.max(minimo, +(s - 0.2).toFixed(2));
      if (ancho(t, s, negrita) > w) {
        while (t.length > 1 && ancho(`${t}..`, s, negrita) > w) t = t.slice(0, -1);
        t = `${t.trimEnd()}..`;
      }
    }
    let px = x;
    if (alinear === "centro") px = x + (w - ancho(t, s, negrita)) / 2;
    else if (alinear === "der") px = x + w - ancho(t, s, negrita);
    ops.push(`BT /${negrita ? "F2" : "F1"} ${s} Tf ${col(c)} rg ${n(px)} ${n(A4_LAND_H - y)} Td (${cadena(t)}) Tj ET`);
  };

  // Cabecera
  rect(M, M, CW, 42, BORDO);
  if (logo) ops.push(`q 32 0 0 32 ${n(M + 8)} ${n(A4_LAND_H - M - 37)} cm /Im1 Do Q`);
  const tx = logo ? M + 48 : M + 10;
  texto("E.E.S.T. N° 1 \"CECILIA BERDICHEVSKY\" - MONTE GRANDE", tx, M + 14, 7.5, { c: [0.95, 0.88, 0.89] });
  const tituloCurso =
    esDocente && cursoActual.materia
      ? `REGISTRO DE ASISTENCIA: ${cursoActual.curso || ""} ${cursoActual.division || ""}° DIV. - ${String(cursoActual.materia).toUpperCase()} (${String(cursoActual.turno || "").toUpperCase()})`
      : `REGISTRO DE ASISTENCIA: ${cursoActual.curso || ""} ${cursoActual.division || ""}° DIVISION (${String(cursoActual.turno || "").toUpperCase()})`;
  texto(tituloCurso, tx, M + 31, 10.5, { negrita: true, c: BLANCO, w: CW - 230, minimo: 8 });
  texto(`MES: ${String(mesNombre).toUpperCase()} ${anio}`, M + CW - 180, M + 16, 8.5, { negrita: true, c: BLANCO, alinear: "der", w: 170 });
  texto(`DIAS HABILES: ${balanceMensual.diasHabiles ?? "-"}   |   ALUMNOS: ${alumnos.length}`, M + CW - 180, M + 31, 7.5, { c: [0.95, 0.88, 0.89], alinear: "der", w: 170 });

  // Geometria de columnas
  const wNum = 18;
  const wNombre = 134;
  const wTotales = [24, 20, 20, 20, 24, 32]; // ASIST, INJ, JUS, TAR, TOT, %
  const sumaTotales = wTotales.reduce((a, b) => a + b, 0);
  const cantDias = diasMes.length || 31;
  const wDia = (CW - wNum - wNombre - sumaTotales) / cantDias;

  let y = M + 48;
  const hEnc = 22;
  rect(M, y, CW, hEnc, [0.92, 0.93, 0.95]);
  marco(M, y, CW, hEnc, LINEA, 0.5);

  texto("N°", M, y + 14, 6.5, { negrita: true, alinear: "centro", w: wNum });
  linea(M + wNum, y, M + wNum, y + hEnc, LINEA);
  texto("APELLIDO Y NOMBRE", M + wNum + 4, y + 14, 6.5, { negrita: true, w: wNombre - 6 });

  let cx = M + wNum + wNombre;
  diasMes.forEach((d) => {
    if (d.esFinDeSemana) rect(cx, y, wDia, hEnc, FINDE);
    linea(cx, y, cx, y + hEnc, LINEA, 0.35);
    texto(String(d.numero), cx, y + 9, 6, { negrita: true, alinear: "centro", w: wDia });
    texto(String(d.letra || "").slice(0, 2), cx, y + 18, 5, { c: GRIS, alinear: "centro", w: wDia });
    cx += wDia;
  });

  const titTot = ["ASIST", "INJ", "JUS", "TAR", "TOT", "% ASIS"];
  titTot.forEach((tit, i) => {
    linea(cx, y, cx, y + hEnc, LINEA, 0.45);
    texto(tit, cx, y + 14, 5.8, { negrita: true, alinear: "centro", w: wTotales[i] });
    cx += wTotales[i];
  });

  y += hEnc;

  // Ajuste dinamico de alto de fila para que entren todos los alumnos en 1 hoja
  const espacioPie = 36;
  const disponible = A4_LAND_H - M - espacioPie - y;
  const cantFilas = Math.max(alumnos.length, 1);
  const hFila = Math.max(8.5, Math.min(14.5, disponible / cantFilas));
  const tamNombre = hFila < 10 ? 5.8 : 6.6;
  const tamCelda = hFila < 10 ? 5.4 : 6.2;

  alumnos.forEach((al, idx) => {
    if (y + hFila > A4_LAND_H - M - espacioPie + 2) return;
    if (idx % 2 === 1) rect(M, y, CW, hFila, ZEBRA);
    marco(M, y, CW, hFila, LINEA, 0.3);

    const ty = y + hFila * 0.72;
    texto(String(al.orden ?? idx + 1), M, ty, tamCelda, { alinear: "centro", w: wNum });
    linea(M + wNum, y, M + wNum, y + hFila, LINEA, 0.3);
    texto(`${al.apellido || ""}, ${al.nombre || ""}`.replace(/^,\s*|,\s*$/g, ""), M + wNum + 3, ty, tamNombre, { negrita: true, w: wNombre - 5, minimo: 5 });

    const reg = registros?.[al.orden] || {};
    let x = M + wNum + wNombre;
    diasMes.forEach((d) => {
      if (d.esFinDeSemana) rect(x, y, wDia, hFila, FINDE);
      linea(x, y, x, y + hFila, LINEA, 0.25);
      const val = reg[d.numero] || "";
      if (val && val !== "—") {
        const cVal = val === "P" ? VERDE : val === "A" ? ROJO : val === "J" ? AZUL : val === "T" ? AMBAR : GRIS;
        texto(val, x, ty, tamCelda, { negrita: true, c: cVal, alinear: "centro", w: wDia });
      }
      x += wDia;
    });

    const tot = calcularTotalesAlumno ? calcularTotalesAlumno(al.orden) : { presentes: 0, ausentesInjust: 0, ausentesJust: 0, tardes: 0, totalInasistencias: 0, porcentaje: "100%" };
    const valsTot = [
      String(tot.presentes ?? 0),
      String(tot.ausentesInjust ?? 0),
      String(tot.ausentesJust ?? 0),
      String(tot.tardes ?? 0),
      String(tot.totalInasistencias ?? 0),
      String(tot.porcentaje ?? "100%")
    ];
    valsTot.forEach((v, i) => {
      linea(x, y, x, y + hFila, LINEA, 0.35);
      texto(v, x, ty, tamCelda, { negrita: i === 5, c: i === 5 ? BORDO : OSCURO, alinear: "centro", w: wTotales[i] });
      x += wTotales[i];
    });

    y += hFila;
  });

  // Pie de balance mensual + firmas
  const yPie = A4_LAND_H - M - 26;
  rect(M, yPie, CW, 24, [0.96, 0.94, 0.945]);
  marco(M, yPie, CW, 24, LINEA, 0.45);
  texto(
    `BALANCE MENSUAL  |  Asistencia Media: ${balanceMensual.asistenciaMedia ?? "—"}  |  % Asistencia: ${balanceMensual.porcentajeAsistencia ?? "—"}  |  Total Asistencias: ${balanceMensual.totalAsistencias ?? 0}  |  Total Inasistencias: ${balanceMensual.totalInasistencias ?? 0}`,
    M + 8,
    yPie + 15,
    7.5,
    { negrita: true, c: OSCURO, w: CW - 180, minimo: 6 }
  );
  texto("Firma Preceptor/a: _____________________", M + CW - 165, yPie + 15, 7, { c: GRIS });

  return armarPdf([ops], logo, { ancho: A4_LAND_W, alto: A4_LAND_H, sobreBordo: true });
}

export async function descargarAsistenciasPdf(datos) {
  const logo = await cargarLogo();
  const bytes = generarAsistenciasPdf(datos, logo);
  dispararDescargaPdf(bytes, nombreArchivoAsistencias(datos, "pdf"));
}

export async function descargarAsistenciasExcel({
  cursoActual = {},
  mesNombre = "",
  anio = new Date().getFullYear(),
  diasMes = [],
  alumnos = [],
  registros = {},
  calcularTotalesAlumno,
  balanceMensual = {}
}) {
  const XLSX = await import("xlsx");
  const filas = alumnos.map((al, idx) => {
    const reg = registros?.[al.orden] || {};
    const tot = calcularTotalesAlumno ? calcularTotalesAlumno(al.orden) : {};
    const fila = {
      "N°": al.orden ?? idx + 1,
      "Apellido y Nombre": `${al.apellido || ""}, ${al.nombre || ""}`.replace(/^,\s*|,\s*$/g, "")
    };
    diasMes.forEach((d) => {
      fila[`${d.numero} (${d.letra})`] = reg[d.numero] || "";
    });
    fila["Asistencia"] = tot.presentes ?? 0;
    fila["Injust."] = tot.ausentesInjust ?? 0;
    fila["Just."] = tot.ausentesJust ?? 0;
    fila["Tarde"] = tot.tardes ?? 0;
    fila["Total Inasist."] = tot.totalInasistencias ?? 0;
    fila["% Asistencia"] = tot.porcentaje ?? "100%";
    return fila;
  });

  const libro = XLSX.utils.book_new();
  const hoja = XLSX.utils.json_to_sheet(filas);
  hoja["!cols"] = [{ wch: 5 }, { wch: 28 }, ...diasMes.map(() => ({ wch: 5 })), { wch: 10 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 12 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(libro, hoja, "Asistencias");

  const hojaBalance = XLSX.utils.json_to_sheet([
    { Indicador: "Curso", Valor: `${cursoActual.curso || ""} ${cursoActual.division || ""}°` },
    { Indicador: "Turno", Valor: cursoActual.turno || "" },
    { Indicador: "Mes / Año", Valor: `${mesNombre} ${anio}` },
    { Indicador: "Días hábiles", Valor: balanceMensual.diasHabiles ?? "" },
    { Indicador: "Asistencia media", Valor: balanceMensual.asistenciaMedia ?? "" },
    { Indicador: "% Asistencia mensual", Valor: balanceMensual.porcentajeAsistencia ?? "" },
    { Indicador: "Total asistencias", Valor: balanceMensual.totalAsistencias ?? 0 },
    { Indicador: "Total inasistencias", Valor: balanceMensual.totalInasistencias ?? 0 }
  ]);
  hojaBalance["!cols"] = [{ wch: 24 }, { wch: 22 }];
  XLSX.utils.book_append_sheet(libro, hojaBalance, "Balance Mensual");

  XLSX.writeFile(libro, nombreArchivoAsistencias({ cursoActual, mesNombre, anio }, "xlsx"));
}
