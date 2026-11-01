/* PDF del Boletin Oficial en hoja Oficio (33 x 21,6 cm), apaisada, con DOS
   boletines por hoja, lado a lado y 1 cm de margen general. Sin librerias: arma el archivo a
   mano con Helvetica, igual que el resto de los PDF de la app. Un solo alumno
   ocupa la mitad izquierda de la hoja (mismo tamaño que en la impresion del curso). */

import { ancho, cadena, cargarLogo } from "../../utils/pdf-base.js";
import { PERIODOS_PENDIENTES, anioDelAlumno, armarBoletinOficial, cicloDeAnio, promedioGeneral } from "./boletin-oficial-datos.js";
import { BoletinOficialService } from "./boletin-oficial-service.js";

const CM = 72 / 2.54;
export const HOJA = { ancho: +(33 * CM).toFixed(2), alto: +(21.6 * CM).toFixed(2) }; // Oficio apaisado
export const MARGEN = +CM.toFixed(2); // 1 cm
const AP = HOJA.ancho;
const HP = HOJA.alto;
const ANCHO_BOLETIN = (AP - MARGEN * 2) / 2; // dos boletines lado a lado
const ALTO_BOLETIN = HP - MARGEN * 2;

const BORDO = [0.42, 0.1, 0.13];
const OSCURO = [0.1, 0.1, 0.12];
const GRIS = [0.4, 0.4, 0.42];
const LINEA = [0.45, 0.45, 0.48];
const TENUE = [0.82, 0.82, 0.84];
const ROSA = [0.96, 0.89, 0.89];
const ZEBRA = [0.93, 0.93, 0.94];
const BLANCO = [1, 1, 1];

const num = (v) => Number(v.toFixed(2));
const col = (c) => c.map(num).join(" ");

class Hoja {
  constructor() {
    this.paginas = [];
    this.nueva();
  }
  nueva() {
    this.ops = [];
    this.paginas.push(this.ops);
  }
  rect(x, y, w, alto, c) {
    this.ops.push(`${col(c)} rg ${num(x)} ${num(HP - y - alto)} ${num(w)} ${num(alto)} re f`);
  }
  marco(x, y, w, alto, c, g = 0.6) {
    this.ops.push(`[] 0 d ${col(c)} RG ${g} w ${num(x)} ${num(HP - y - alto)} ${num(w)} ${num(alto)} re S`);
  }
  linea(x1, y1, x2, y2, c, g = 0.5, guiones = false) {
    this.ops.push(`${guiones ? "[3 3] 0 d" : "[] 0 d"} ${col(c)} RG ${g} w ${num(x1)} ${num(HP - y1)} m ${num(x2)} ${num(HP - y2)} l S`);
  }
  imagen(x, y, w, alto) {
    this.ops.push(`q ${num(w)} 0 0 ${num(alto)} ${num(x)} ${num(HP - y - alto)} cm /Im1 Do Q`);
  }
  /* Texto que se achica (hasta `minimo`) para entrar en `w`; si aun asi no entra, se recorta con "...". */
  texto(valor, x, y, tamano, { negrita = false, c = OSCURO, alinear = "izq", w = 0, minimo = tamano } = {}) {
    let t = String(valor ?? "");
    let tam = tamano;
    if (w) {
      while (tam > minimo && ancho(t, tam, negrita) > w) tam = Math.max(minimo, +(tam - 0.25).toFixed(2));
      if (ancho(t, tam, negrita) > w) {
        while (t.length > 1 && ancho(`${t}...`, tam, negrita) > w) t = t.slice(0, -1);
        t = `${t.trimEnd()}...`;
      }
    }
    let px = x;
    if (alinear === "centro") px = x + (w - ancho(t, tam, negrita)) / 2;
    if (alinear === "der") px = x + w - ancho(t, tam, negrita);
    this.ops.push(`BT /${negrita ? "F2" : "F1"} ${tam} Tf ${col(c)} rg ${num(px)} ${num(HP - y)} Td (${cadena(t)}) Tj ET`);
  }
}

function envolver(texto, maximo, tamano, negrita = false) {
  const lineas = [];
  let actual = "";
  for (const palabra of String(texto).split(/\s+/).filter(Boolean)) {
    const prueba = actual ? `${actual} ${palabra}` : palabra;
    if (actual && ancho(prueba, tamano, negrita) > maximo) {
      lineas.push(actual);
      actual = palabra;
    } else actual = prueba;
  }
  if (actual) lineas.push(actual);
  return lineas;
}

/* Un boletin dentro del rectangulo (x0, y0, ANCHO_BOLETIN, ALTO_BOLETIN). */
function dibujarBoletin(doc, b, xc, logo) {
  const x0 = xc + 1.5;
  const X = x0 + 9;
  const W = ANCHO_BOLETIN - 3 - 18;
  const base = MARGEN;
  const altoMarco = ALTO_BOLETIN;
  doc.marco(x0, base, ANCHO_BOLETIN - 3, altoMarco, BORDO, 1);

  // Cabecera institucional
  let y = base + 7;
  const LOGO = 42;
  if (logo) doc.imagen(X, y, LOGO, LOGO);
  const xt = X + LOGO + 6;
  const wt = W - (LOGO + 6) * 2;
  doc.texto("DIRECCIÓN GENERAL DE CULTURA Y EDUCACIÓN • PROVINCIA DE BUENOS AIRES", xt, y + 11, 6.5, { negrita: true, c: GRIS, alinear: "centro", w: wt, minimo: 5 });
  doc.texto('E.E.S.T. N° 1 "CECILIA BERDICHEVSKI"', xt, y + 26, 13, { negrita: true, c: BORDO, alinear: "centro", w: wt, minimo: 9 });
  doc.texto(`BOLETÍN DE CALIFICACIONES • ${b.anio}° AÑO`, xt, y + 38, 8, { negrita: true, c: OSCURO, alinear: "centro", w: wt });
  y += LOGO + 4;
  doc.linea(X, y, X + W, y, BORDO, 1.2);
  y += 5;

  // Datos del alumno
  const RD = 11.5;
  const cols3 = [W * 0.46, W * 0.27, W * 0.27];
  const campos = (fila) => fila;
  const filas = [
    [["APELLIDO Y NOMBRE", b.alumno.nombreCompleto, 2], ["AÑO/DIV", b.alumno.cursoDivision, 1]],
    [["LEGAJO", b.alumno.legajo, 1], ["D.N.I.", b.alumno.dni, 1], ["CICLO LECTIVO", b.cicloLectivo, 1]],
    [["FOLIO", b.alumno.folio, 1], ["LIBRO", b.alumno.libro, 1], ["TURNO", b.alumno.turno, 1]]
  ];
  doc.marco(X, y, W, RD * 3, LINEA, 0.6);
  filas.forEach((fila, i) => {
    let cx = X;
    const yy = y + i * RD;
    if (i > 0) doc.linea(X, yy, X + W, yy, TENUE, 0.4);
    let ci = 0;
    fila.forEach(([etiqueta, valor, span]) => {
      const wc = cols3.slice(ci, ci + span).reduce((s, v) => s + v, 0);
      if (cx > X) doc.linea(cx, yy, cx, yy + RD, TENUE, 0.4);
      doc.texto(`${etiqueta}:`, cx + 4, yy + 8, 6, { negrita: true, c: GRIS });
      const dx = ancho(`${etiqueta}:`, 6, true) + 8;
      doc.texto(valor, cx + dx, yy + 8, 7.5, { negrita: true, w: wc - dx - 3, minimo: 5.5 });
      cx += wc;
      ci += span;
    });
  });
  void campos;
  y += RD * 3 + 5;

  // Tabla de notas
  const AN = { informe: 36, promedio: 40, mes: 37, definitiva: 44, firmas: 46 };
  const A_MATERIA = W - (AN.informe * 2 + AN.promedio + AN.mes * 2 + AN.definitiva + AN.firmas);
  const anchos = [A_MATERIA, AN.informe, AN.informe, AN.promedio, AN.mes, AN.mes, AN.definitiva, AN.firmas];
  const xs = anchos.reduce((acc, w, i) => (acc.push(i ? acc[i - 1] + anchos[i - 1] : X), acc), []);
  const titulos = ["MATERIAS", "1° INFORME", "2° INFORME", "PROMEDIO ANUAL", "DICIEMBRE", "FEBRERO", "CALIF. DEFINITIVA", "FIRMAS"];
  const ALTO_ENC = 15;
  const ALTO_SEC = 10;
  const ALTO_PIE = 13;

  // Alto reservado para pendientes + firmas, el resto es de las filas de materias
  const PEND = 9 + 9 + 9 + b.pendientes.length * 10;
  const FIRMAS = 26;
  const materias = [...b.plan.general, ...b.plan.taller];
  const disponible = base + altoMarco - 6 - FIRMAS - 6 - PEND - 5 - ALTO_PIE - 2 * ALTO_SEC - ALTO_ENC - y;
  const alto = Math.max(9, Math.min(24, Math.floor(disponible / Math.max(materias.length, 1))));
  const inicioTabla = y;

  doc.rect(X, y, W, ALTO_ENC, BORDO);
  titulos.forEach((t, i) => {
    if (i > 0) doc.linea(xs[i], y, xs[i], y + ALTO_ENC, [0.75, 0.55, 0.57], 0.4);
    const partes = t.includes(" ") && i > 0 ? envolver(t, anchos[i] - 4, 5.8, true) : [t];
    if (partes.length > 1) {
      partes.slice(0, 2).forEach((p, k) => doc.texto(p, xs[i], y + 6.5 + k * 6.3, 5.8, { negrita: true, c: BLANCO, alinear: "centro", w: anchos[i] }));
    } else doc.texto(t, xs[i] + 1, y + 9.5, 6.3, { negrita: true, c: BLANCO, alinear: "centro", w: anchos[i] - 2, minimo: 4.6 });
  });
  y += ALTO_ENC;

  let n = 0;
  const seccion = (titulo, lista) => {
    doc.rect(X, y, W, ALTO_SEC, [0.34, 0.07, 0.1]);
    doc.texto(titulo, X + 4, y + 7.2, 6.5, { negrita: true, c: BLANCO });
    y += ALTO_SEC;
    lista.forEach((materia) => {
      const nota = b.notas[materia] ?? {};
      if (n % 2 === 1) doc.rect(X, y, W, alto, ZEBRA);
      doc.rect(xs[3], y, anchos[3], alto, ROSA);
      doc.rect(xs[6], y, anchos[6], alto, [0.93, 0.84, 0.85]);
      const lineas = alto >= 12 && ancho(materia, 6.5, true) > A_MATERIA - 6 ? envolver(materia, A_MATERIA - 6, 5.6, true).slice(0, 2) : null;
      if (lineas && lineas.length > 1) {
        lineas.forEach((l, k) => doc.texto(l, X + 3, y + alto / 2 - 0.5 + (k === 0 ? -2.2 : 4.8) - 1, 5.6, { negrita: true, w: A_MATERIA - 5 }));
      } else {
        doc.texto(materia, X + 3, y + alto / 2 + 2.3, 6.8, { negrita: true, w: A_MATERIA - 5, minimo: 4.6 });
      }
      [["informe1", 1], ["informe2", 2], ["promedioAnual", 3], ["diciembre", 4], ["febrero", 5], ["definitiva", 6]].forEach(([campo, i]) => {
        const valor = String(nota[campo] ?? "").trim();
        doc.texto(valor || "—", xs[i], y + alto / 2 + 2.6, 7.5, { negrita: i === 6, c: valor ? OSCURO : [0.62, 0.62, 0.64], alinear: "centro", w: anchos[i] });
      });
      doc.linea(X, y + alto, X + W, y + alto, TENUE, 0.35);
      y += alto;
      n += 1;
    });
  };
  seccion("FORMACIÓN GENERAL", b.plan.general);
  if (b.plan.taller.length) seccion(b.plan.tituloTaller, b.plan.taller);

  // Pie de tabla: inasistencias y promedio general
  doc.rect(X, y, W, ALTO_PIE, [0.95, 0.95, 0.96]);
  doc.texto("INASISTENCIA TOTAL:", X + 4, y + 9, 6.5, { negrita: true });
  const wi = ancho("INASISTENCIA TOTAL:", 6.5, true);
  doc.texto(b.inasistencias || "—", X + 4 + wi + 5, y + 9, 7.5, { negrita: true });
  if (b.inasistencias) doc.texto("días", X + 4 + wi + 9 + ancho(b.inasistencias, 7.5, true), y + 9, 6.5, { c: GRIS });
  doc.texto("PROMEDIO GENERAL ANUAL:", xs[3] - 4 - 110, y + 9, 6.5, { negrita: true, alinear: "der", w: 110 });
  doc.texto(promedioGeneral(b.notas, materias) || "—", xs[6], y + 9, 8, { negrita: true, c: BORDO, alinear: "centro", w: anchos[6] });
  y += ALTO_PIE;

  // Cuadricula de la tabla
  doc.marco(X, inicioTabla, W, y - inicioTabla, LINEA, 0.7);
  xs.slice(1).forEach((x) => doc.linea(x, inicioTabla + ALTO_ENC, x, y - ALTO_PIE, TENUE, 0.4));
  y += 5;

  // Materias pendientes
  doc.rect(X, y, W, 9, [0.34, 0.07, 0.1]);
  doc.texto("MATERIAS PENDIENTES DE ACREDITACIÓN / REGULARIZACIÓN", X + 4, y + 6.8, 6.3, { negrita: true, c: BLANCO });
  y += 9;
  const aPend = [A_MATERIA - 4, 34];
  const aPer = (W - aPend[0] - aPend[1]) / PERIODOS_PENDIENTES.length;
  const yp0 = y;
  doc.rect(X, y, W, 18, [0.55, 0.15, 0.18]);
  doc.texto("MATERIAS PENDIENTES", X, y + 11.5, 5.8, { negrita: true, c: BLANCO, alinear: "centro", w: aPend[0] });
  doc.texto("AÑO", X + aPend[0], y + 11.5, 5.8, { negrita: true, c: BLANCO, alinear: "centro", w: aPend[1] });
  PERIODOS_PENDIENTES.forEach(([, etiqueta], i) => {
    const px = X + aPend[0] + aPend[1] + i * aPer;
    doc.texto(etiqueta, px, y + 6.6, 6, { negrita: true, c: BLANCO, alinear: "centro", w: aPer });
    doc.texto("CALIF", px, y + 14.6, 5.2, { negrita: true, c: BLANCO, alinear: "centro", w: aPer / 2 });
    doc.texto("L/F", px + aPer / 2, y + 14.6, 5.2, { negrita: true, c: BLANCO, alinear: "centro", w: aPer / 2 });
  });
  y += 18;
  b.pendientes.forEach((p) => {
    doc.texto(p.materia, X + 3, y + 7.2, 6.5, { w: aPend[0] - 6, minimo: 4.8 });
    doc.texto(p.anio, X + aPend[0], y + 7.2, 6.5, { alinear: "centro", w: aPend[1] });
    PERIODOS_PENDIENTES.forEach(([k], i) => {
      const px = X + aPend[0] + aPend[1] + i * aPer;
      doc.texto(p[`${k}C`], px, y + 7.2, 6.5, { alinear: "centro", w: aPer / 2 });
      doc.texto(p[`${k}LF`], px + aPer / 2, y + 7.2, 6.5, { alinear: "centro", w: aPer / 2 });
    });
    doc.linea(X, y + 10, X + W, y + 10, TENUE, 0.35);
    y += 10;
  });
  doc.marco(X, yp0, W, y - yp0, LINEA, 0.6);
  doc.linea(X + aPend[0], yp0, X + aPend[0], y, TENUE, 0.4);
  doc.linea(X + aPend[0] + aPend[1], yp0, X + aPend[0] + aPend[1], y, TENUE, 0.4);
  PERIODOS_PENDIENTES.forEach((_, i) => {
    const px = X + aPend[0] + aPend[1] + i * aPer;
    if (i > 0) doc.linea(px, yp0, px, y, TENUE, 0.4);
    doc.linea(px + aPer / 2, yp0 + 9, px + aPer / 2, y, TENUE, 0.3);
  });

  // Firmas, al pie del boletin
  const yf = base + altoMarco - 15;
  const wf = W / 3;
  [["AUTORIDAD ESCOLAR", "Firma y Sello Dirección"], ["PRECEPTOR", "Firma Preceptor a Cargo"], ["ADULTO RESPONSABLE", "Firma Padre / Madre / Tutor"]].forEach(([titulo, sub], i) => {
    const fx = X + i * wf + 14;
    doc.linea(fx, yf, fx + wf - 28, yf, OSCURO, 0.6);
    doc.texto(titulo, fx, yf + 6.5, 6, { negrita: true, alinear: "centro", w: wf - 28 });
    doc.texto(sub, fx, yf + 12, 5, { c: GRIS, alinear: "centro", w: wf - 28 });
  });
}

function armarArchivo(paginas, logo) {
  const objetos = [];
  const agregar = (contenido) => objetos.push(contenido) && objetos.length;
  agregar("");
  agregar("");
  agregar("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
  agregar("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
  const idImagen = logo
    ? agregar(`<< /Type /XObject /Subtype /Image /Width ${logo.ancho} /Height ${logo.alto} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${logo.sobreBlanco.length} >>\nstream\n${logo.sobreBlanco}\nendstream`)
    : null;
  const recursos = `<< /Font << /F1 3 0 R /F2 4 0 R >>${idImagen ? ` /XObject << /Im1 ${idImagen} 0 R >>` : ""} >>`;
  const idPaginas = paginas.map((ops) => {
    const flujo = ops.join("\n");
    const contenido = agregar(`<< /Length ${flujo.length} >>\nstream\n${flujo}\nendstream`);
    return agregar(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${AP} ${HP}] /Resources ${recursos} /Contents ${contenido} 0 R >>`);
  });
  objetos[0] = "<< /Type /Catalog /Pages 2 0 R >>";
  objetos[1] = `<< /Type /Pages /Count ${idPaginas.length} /Kids [${idPaginas.map((id) => `${id} 0 R`).join(" ")}] >>`;

  let salida = "%PDF-1.4\n%âãÏÓ\n";
  const posiciones = [];
  objetos.forEach((contenido, i) => {
    posiciones.push(salida.length);
    salida += `${i + 1} 0 obj\n${contenido}\nendobj\n`;
  });
  const inicioXref = salida.length;
  salida += `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n`;
  posiciones.forEach((p) => {
    salida += `${String(p).padStart(10, "0")} 00000 n \n`;
  });
  salida += `trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R >>\nstartxref\n${inicioXref}\n%%EOF`;
  const bytes = new Uint8Array(salida.length);
  for (let i = 0; i < salida.length; i += 1) bytes[i] = salida.charCodeAt(i) & 0xff;
  return bytes;
}

/* `boletines`: lista de resultados de armarBoletinOficial. De a dos por hoja. */
export async function generarBoletinesOficialPdf(boletines) {
  const logo = await cargarLogo();
  const doc = new Hoja();
  boletines.forEach((b, i) => {
    const lugar = i % 2;
    if (i > 0 && lugar === 0) doc.nueva();
    dibujarBoletin(doc, b, MARGEN + lugar * ANCHO_BOLETIN, logo);
    if (lugar === 0 && i < boletines.length - 1) {
      // guia de corte entre los dos boletines
      doc.linea(MARGEN + ANCHO_BOLETIN, MARGEN - 6, MARGEN + ANCHO_BOLETIN, HP - MARGEN + 6, TENUE, 0.4, true);
    }
  });
  return new Blob([armarArchivo(doc.paginas, logo)], { type: "application/pdf" });
}

export const nombreArchivoBoletines = (boletines) => {
  const limpio = (t) => String(t ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "");
  if (boletines.length === 1) return `Boletin-${limpio(boletines[0].alumno.nombreCompleto) || "alumno"}-${boletines[0].cicloLectivo}.pdf`;
  const primero = boletines[0];
  return `Boletines-${primero.anio}-${limpio(primero.alumno.cursoDivision.split(" ")[1] ?? "")}-${primero.cicloLectivo}.pdf`;
};

/* Genera el PDF y lo muestra en la ventana abierta por el clic (para imprimir). Si no hay
   ventana (bloqueada), lo descarga. */
export async function abrirBoletinesOficial(boletines, ventana = null) {
  const blob = await generarBoletinesOficialPdf(boletines);
  const url = URL.createObjectURL(blob);
  if (ventana && !ventana.closed) ventana.location.href = url;
  else {
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = nombreArchivoBoletines(boletines);
    document.body.append(enlace);
    enlace.click();
    enlace.remove();
  }
  setTimeout(() => URL.revokeObjectURL(url), 120000);
}

/* Boletines de todos los alumnos de la lista (cada uno en su año), dos por hoja. */
export async function imprimirBoletinesDeAlumnos(alumnos, ventana = null) {
  /* Las notas se leen del backend (la misma fuente que la planilla y el portal). */
  const registros = await BoletinOficialService.obtenerVarios(alumnos.map((a) => a.id), new Date().getFullYear());
  const boletines = alumnos.map((a) => armarBoletinOficial(a, anioDelAlumno(a), { registro: registros[a.id] }));
  return abrirBoletinesOficial(boletines, ventana);
}
