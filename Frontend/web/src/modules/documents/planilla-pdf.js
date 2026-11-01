/* Descarga de la planilla de calificaciones como PDF real: Oficio (21,6 x 33 cm)
   en vertical, con margen de 0,75 cm y todo el curso en UNA hoja (las filas se ajustan). Sin librerias nuevas: reutiliza el mismo enfoque que el boletin
   (boletin-pdf.js: metricas Helvetica, WinAnsi y logo). Recibe los datos ya
   calculados por la pantalla (alumnos ordenados + metricas), asi el PDF, el Excel
   y la vista muestran exactamente lo mismo. No guarda nada: genera y descarga. */

import { ancho, cadena, cargarLogo } from "../../utils/pdf-base.js";
import { COLUMNAS, GRUPOS, FIRMAS, INSTITUCION, tituloPlanilla, resumenCurso, valoresFila, estadoCuatrimestre } from "./planilla-estructura.js";

const CM = 72 / 2.54;
export const PAGINA = { ancho: +(21.6 * CM).toFixed(2), alto: +(33 * CM).toFixed(2) }; // Oficio vertical
const { ancho: AP, alto: HP } = PAGINA;
const M = +(0.75 * CM).toFixed(2); // margen general de 0,75 cm
const CW = AP - M * 2;
const BORDO = [0.349, 0.11, 0.137];
const OSCURO = [0.1, 0.1, 0.12];
const GRIS = [0.38, 0.38, 0.4];
const LINEA = [0.55, 0.55, 0.58];
const TENUE = [0.8, 0.8, 0.82];
const BANDA_1C = [0.965, 0.93, 0.935];
const BANDA_2C = [0.93, 0.93, 0.94];
const BLANCO = [1, 1, 1];
const FILA_MAX = 17;
const FILA_MIN = 9;
const ALTO_ENC = 15;
const PIE = 24; // franja reservada para el pie de pagina

const num = (v) => Number(v.toFixed(2));
const col = (c) => c.map(num).join(" ");

/* Columnas: x relativo al margen izquierdo. El nombre toma el ancho sobrante. */
const FIJAS = { nro: 20, parc: 38, val: 28, calif: 30, inas: 22, int: 34, final: 36 };
const NOMBRE = CW - (FIJAS.nro + (FIJAS.parc + FIJAS.val + FIJAS.calif + FIJAS.inas) * 2 + FIJAS.int * 2 + FIJAS.final);
const ANCHOS = [FIJAS.nro, NOMBRE, FIJAS.parc, FIJAS.val, FIJAS.calif, FIJAS.inas, FIJAS.parc, FIJAS.val, FIJAS.calif, FIJAS.inas, FIJAS.int, FIJAS.int, FIJAS.final];
const X = ANCHOS.reduce((acc, w, i) => (acc.push(i ? acc[i - 1] + ANCHOS[i - 1] : M), acc), []);
const FIN = M + CW;

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
    this.ops.push(`${col(c)} RG ${g} w ${num(x)} ${num(HP - y - alto)} ${num(w)} ${num(alto)} re S`);
  }
  linea(x1, y1, x2, y2, c, g = 0.5) {
    this.ops.push(`${col(c)} RG ${g} w ${num(x1)} ${num(HP - y1)} m ${num(x2)} ${num(HP - y2)} l S`);
  }
  imagen(x, y, w, alto) {
    this.ops.push(`q ${num(w)} 0 0 ${num(alto)} ${num(x)} ${num(HP - y - alto)} cm /Im1 Do Q`);
  }
  /* Texto recortado con "..." si no entra en `w` (nunca invade la celda vecina). */
  texto(valor, x, y, tam0, { negrita = false, c = OSCURO, alinear = "izq", w = 0, minimo = tam0 } = {}) {
    let t = String(valor ?? "");
    let tamano = tam0;
    if (w) while (tamano > minimo && ancho(t, tamano, negrita) > w) tamano = Math.max(minimo, +(tamano - 0.25).toFixed(2));
    if (w && ancho(t, tamano, negrita) > w) {
      while (t.length > 1 && ancho(`${t}...`, tamano, negrita) > w) t = t.slice(0, -1);
      t = `${t.trimEnd()}...`;
    }
    let px = x;
    if (alinear === "centro") px = x + (w - ancho(t, tamano, negrita)) / 2;
    if (alinear === "der") px = x + w - ancho(t, tamano, negrita);
    this.ops.push(`BT /${negrita ? "F2" : "F1"} ${tamano} Tf ${col(c)} rg ${num(px)} ${num(HP - y)} Td (${cadena(t)}) Tj ET`);
  }
}

const filaAlumno = (e) => valoresFila(e).map(String);

function encabezadoTabla(doc, y) {
  const alto = ALTO_ENC * 2;
  doc.rect(M, y, CW, alto, BORDO);
  // Grupos (fila superior)
  const grupo = (i0, i1, titulo) => {
    const x0 = X[i0];
    const x1 = X[i1] + ANCHOS[i1];
    doc.texto(titulo, x0, y + 10.5, 7, { negrita: true, c: BLANCO, alinear: "centro", w: x1 - x0 - 2, minimo: 5 });
    doc.linea(x0, y + ALTO_ENC, x1, y + ALTO_ENC, [0.85, 0.7, 0.72], 0.5);
  };
  GRUPOS.forEach((g) => {
    const idx = COLUMNAS.map((c, i) => (c.grupo === g.id ? i : -1)).filter((i) => i >= 0);
    grupo(idx[0], idx[idx.length - 1], g.titulo);
  });
  // Subtítulos (fila inferior) y títulos que ocupan las dos filas
  COLUMNAS.forEach((c, i) => {
    if (c.grupo) doc.texto(c.titulo, X[i] + 1, y + ALTO_ENC + 10, 6.5, { negrita: true, c: BLANCO, alinear: "centro", w: ANCHOS[i] - 2, minimo: 4.4 });
  });
  doc.texto(COLUMNAS[0].titulo, X[0], y + 20, 7.5, { negrita: true, c: BLANCO, alinear: "centro", w: ANCHOS[0], minimo: 5 });
  doc.texto(COLUMNAS[1].titulo, X[1] + 6, y + 20, 8, { negrita: true, c: BLANCO });
  doc.texto("CALIF.", X[12], y + 14, 7, { negrita: true, c: BLANCO, alinear: "centro", w: ANCHOS[12] });
  doc.texto("FINAL", X[12], y + 24, 7, { negrita: true, c: BLANCO, alinear: "centro", w: ANCHOS[12] });
  // Divisiones verticales del encabezado
  X.slice(1).forEach((x, k) => {
    const i = k + 1;
    const interno = i === 3 || i === 4 || i === 5 || i === 7 || i === 8 || i === 9 || i === 11;
    doc.linea(x, interno ? y + ALTO_ENC : y, x, y + alto, [0.85, 0.7, 0.72], 0.5);
  });
  return y + alto;
}

/* Cuadricula y bandas de una tramo de la tabla (de `desde` a `hasta`). */
function marcoTabla(doc, desde, hasta) {
  const alto = hasta - desde;
  if (alto <= 0) return;
  X.slice(1).forEach((x) => doc.linea(x, desde, x, hasta, TENUE, 0.4));
  [1, 6, 10, 12].forEach((i) => doc.linea(X[i], desde, X[i], hasta, LINEA, 0.8)); // separa los periodos
  doc.marco(M, desde, CW, alto, LINEA, 0.8);
}

function cabeceraInstitucional(doc, d, logo) {
  let y = M;
  let xTexto = M;
  if (logo) {
    doc.imagen(M, y, 48, 48);
    xTexto = M + 58;
  }
  const wTexto = FIN - xTexto;
  doc.texto(INSTITUCION.direccion, xTexto, y + 10, 7, { negrita: true, c: GRIS, w: wTexto, minimo: 4.8 });
  doc.texto(INSTITUCION.escuela, xTexto, y + 25, 12, { negrita: true, c: BORDO, w: wTexto, minimo: 8 });
  doc.texto(tituloPlanilla(d.anioLectivo), xTexto, y + 42, 13, { negrita: true, w: wTexto, minimo: 8.5 });
  y += 54;
  doc.linea(M, y, FIN, y, BORDO, 1.4);
  y += 6;
  // Datos del curso en una sola franja de dos filas
  const campos = [
    [["MATERIA", d.materia], ["AÑO", d.curso], ["SECCIÓN", `${d.division}°`], ["TURNO", d.turno]],
    [["PROFESOR/A", d.docente], ["PRECEPTOR/A", d.preceptor || "—"]]
  ];
  const anchosCampos = [[CW * 0.44, CW * 0.14, CW * 0.18, CW * 0.24], [CW * 0.52, CW * 0.48]];
  campos.forEach((fila, r) => {
    let x = M;
    fila.forEach(([etiqueta, valor], i) => {
      const w = anchosCampos[r][i];
      doc.texto(`${etiqueta}:`, x, y + 9 + r * 14, 7, { negrita: true, c: GRIS });
      const dx = ancho(`${etiqueta}:`, 7, true) + 4;
      doc.texto(valor, x + dx, y + 9 + r * 14, 9, { negrita: true, w: w - dx - 6, minimo: 6.5 });
      x += w;
    });
  });
  return y + 34;
}

function cabeceraCorta(doc, d) {
  doc.texto(`${tituloPlanilla(d.anioLectivo)} · ${d.materia} · ${d.curso} ${d.division}° · ${d.turno}`, M, M + 10, 9, { negrita: true, c: BORDO });
  doc.linea(M, M + 16, FIN, M + 16, BORDO, 1.2);
  return M + 24;
}

const VERDE = [0.1, 0.4, 0.2];
const ROJO = [0.7, 0.1, 0.1];
/* Valoracion y calificacion de cada cuatrimestre: verde si aprueba, rojo si desaprueba. */
function colorCelda(i, texto, estado1, estado2) {
  if (texto === "-") return GRIS;
  const estado = i === 3 || i === 4 ? estado1 : i === 7 || i === 8 ? estado2 : null;
  return estado === "aprobado" ? VERDE : estado === "desaprobado" ? ROJO : OSCURO;
}

const ALTO_RESUMEN = 33;
/* Resumen del curso, debajo de la lista de alumnos: total y, por cuatrimestre,
   aprobados / desaprobados / promedio. */
function resumen(doc, d, y) {
  const grupos = resumenCurso(d.metricas);
  const celdas = grupos.reduce((n, g) => n + g.celdas.length, 0);
  const wCelda = CW / celdas;
  let xc = M;
  grupos.forEach((g) => {
    const wg = wCelda * g.celdas.length;
    doc.rect(xc, y, wg, 10, BORDO);
    doc.texto(g.titulo, xc, y + 7.3, 6.5, { negrita: true, c: BLANCO, alinear: "centro", w: wg, minimo: 5 });
    g.celdas.forEach(([etiqueta, valor], i) => {
      const x = xc + i * wCelda;
      const color = etiqueta === "Aprobados" ? VERDE : etiqueta === "Desaprobados" ? ROJO : BORDO;
      doc.texto(String(valor), x, y + 22, 11, { negrita: true, c: color, alinear: "centro", w: wCelda });
      doc.texto(etiqueta, x, y + 30, 6, { c: GRIS, alinear: "centro", w: wCelda, minimo: 4.5 });
    });
    doc.marco(xc, y, wg, ALTO_RESUMEN, LINEA, 0.6);
    xc += wg;
  });
}

function firmas(doc, y) {
  const w = 150;
  const sep = (CW - w * 3) / 2;
  FIRMAS.forEach((t, i) => {
    const x = M + i * (w + sep);
    doc.linea(x, y, x + w, y, OSCURO, 0.7);
    doc.texto(t, x, y + 10, 7.5, { c: GRIS, alinear: "centro", w, minimo: 5.5 });
  });
}

export async function generarPlanillaPdf(d) {
  const logo = await cargarLogo();
  const doc = new Hoja();
  const limite = HP - M - PIE;
  const ALTO_FIRMAS = 60 + ALTO_RESUMEN + 10; // firmas + resumen que viajan con la ultima fila

  let y = cabeceraInstitucional(doc, d, logo);
  y = encabezadoTabla(doc, y);
  let inicio = y;
  // Alto de fila: el que haga falta para que todo el curso entre en UNA hoja (entre FILA_MIN y FILA_MAX)
  const filas = Math.max(d.estudiantes.length, 1);
  const ALTO_FILA = Math.max(FILA_MIN, Math.min(FILA_MAX, Math.floor(((limite - y - ALTO_FIRMAS) / filas) * 10) / 10));
  const tamFila = Math.min(8.5, ALTO_FILA - 3.5);
  const bandas = (desde, alto) => {
    doc.rect(X[2], desde, X[6] - X[2], alto, BANDA_1C);
    doc.rect(X[6], desde, X[10] - X[6], alto, BANDA_2C);
  };

  if (d.estudiantes.length === 0) {
    doc.texto("No hay estudiantes cargados en esta división.", M + 10, y + 20, 10, { c: GRIS });
    y += 34;
  }

  d.estudiantes.forEach((e, k) => {
    // La ultima fila viaja con las firmas: nunca queda una hoja solo con firmas
    const reserva = k === d.estudiantes.length - 1 ? ALTO_FIRMAS : 0;
    if (y + ALTO_FILA + reserva > limite) {
      marcoTabla(doc, inicio, y);
      doc.nueva();
      y = encabezadoTabla(doc, cabeceraCorta(doc, d));
      inicio = y;
    }
    bandas(y, ALTO_FILA);
    const celdas = filaAlumno(e);
    const estado1 = estadoCuatrimestre(e.v1, e.c1);
    const estado2 = estadoCuatrimestre(e.v2, e.c2);
    celdas.forEach((t, i) => {
      const esNombre = i === 1;
      const final = i === 12;
      const nota = [4, 8, 12].includes(i);
      doc.texto(t, esNombre ? X[i] + 4 : X[i], y + ALTO_FILA / 2 + tamFila * 0.35, tamFila, {
        negrita: final || nota,
        alinear: esNombre ? "izq" : "centro",
        w: esNombre ? ANCHOS[i] - 7 : ANCHOS[i] - 2,
        minimo: 5.5,
        c: colorCelda(i, t, estado1, estado2)
      });
    });
    doc.linea(M, y + ALTO_FILA, FIN, y + ALTO_FILA, TENUE, 0.4);
    y += ALTO_FILA;
  });
  marcoTabla(doc, inicio, y);

  // Firmas al final de la ultima pagina (hoja propia solo si no entran)
  if (y + ALTO_FIRMAS > limite) {
    doc.nueva();
    y = cabeceraCorta(doc, d);
  }
  resumen(doc, d, y + 8);
  firmas(doc, Math.min(Math.max(y + 8 + ALTO_RESUMEN + 36, limite - 26), limite - 14)); // al pie de la hoja

  // Pie de cada pagina
  const emitido = new Date().toLocaleDateString("es-AR");
  const total = doc.paginas.length;
  doc.paginas.forEach((ops, i) => {
    doc.ops = ops;
    doc.linea(M, HP - M - 14, FIN, HP - M - 14, TENUE, 0.5);
    doc.texto(`${INSTITUCION.escuela} · Generado el ${emitido} desde Prece Digital`, M, HP - M - 4, 7, { c: GRIS, w: CW - 70, minimo: 5 });
    doc.texto(`Página ${i + 1} de ${total}`, M, HP - M - 4, 7.5, { c: GRIS, alinear: "der", w: CW });
  });

  return new Blob([armarArchivo(doc.paginas, logo)], { type: "application/pdf" });
}

function armarArchivo(paginas, logo) {
  const objetos = [];
  const agregar = (contenido) => objetos.push(contenido) && objetos.length;
  agregar(""); // 1 catalogo
  agregar(""); // 2 paginas
  agregar("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>"); // 3
  agregar("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>"); // 4
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

export function nombreArchivoPlanilla({ curso, division, materia, anioLectivo }, extension = "pdf") {
  const limpio = (t) => String(t ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_|_$/g, "");
  const n = Number(String(curso).replace(/\D/g, "")) || 0;
  const ordinal = { 1: "ro", 2: "do", 3: "ro", 4: "to", 5: "to", 6: "to", 7: "mo" }[n] ?? "";
  const cursoDiv = `${n ? `${n}${ordinal}` : "curso"}_${limpio(division) || "1"}ra`;
  return `Planilla_Calificaciones_${cursoDiv}_${limpio(materia) || "materia"}_${anioLectivo}.${extension}`;
}

export async function descargarPlanillaPdf(datos) {
  const blob = await generarPlanillaPdf(datos);
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombreArchivoPlanilla(datos);
  document.body.append(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
