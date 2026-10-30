/* Descarga del boletin como PDF (A4), sin librerias: arma el archivo a mano
   con las fuentes estandar Helvetica. Usa exactamente los mismos datos que
   BoletinDocumento (un solo calculo del backend), asi el PDF, la pantalla y la
   impresion muestran lo mismo. No guarda nada: genera y descarga. */

import { estadoMateria, resumenBoletin } from "./boletin-documento.js";

const ANCHO = 595.28;
const ALTO = 841.89;
const M = 40;
const BORDO = [0.349, 0.11, 0.137];
const ROSA = [0.965, 0.925, 0.929];
const GRIS = [0.4, 0.4, 0.4];
const OSCURO = [0.11, 0.16, 0.27];
const BLANCO = [1, 1, 1];
const COLOR_ESTADO = {
  aprobada: { texto: [0.12, 0.42, 0.23] },
  tep: { texto: [0.54, 0.35, 0], fondo: [0.99, 0.95, 0.86] },
  ted: { texto: [0.64, 0.15, 0.11], fondo: [0.98, 0.91, 0.9] },
  debajo_de_6: { texto: [0.64, 0.15, 0.11], fondo: [0.98, 0.91, 0.9] }
};

/* Anchos de Helvetica (por mil) para ASCII 32..126; las letras acentuadas usan el de su base. */
const ANCHOS = [278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584];
const BASE = { á: "a", é: "e", í: "i", ó: "o", ú: "u", ñ: "n", ü: "u", Á: "A", É: "E", Í: "I", Ó: "O", Ú: "U", Ñ: "N", Ü: "U" };

function ancho(texto, tamano, negrita = false) {
  let total = 0;
  for (const letra of String(texto)) {
    const c = (BASE[letra] ?? letra).charCodeAt(0);
    total += c >= 32 && c <= 126 ? ANCHOS[c - 32] : 556;
  }
  return (total * tamano * (negrita ? 1.07 : 1)) / 1000;
}

function envolver(texto, maximo, tamano) {
  const lineas = [];
  let actual = "";
  for (const palabra of String(texto).split(/\s+/).filter(Boolean)) {
    const prueba = actual ? `${actual} ${palabra}` : palabra;
    if (actual && ancho(prueba, tamano) > maximo) {
      lineas.push(actual);
      actual = palabra;
    } else actual = prueba;
  }
  if (actual) lineas.push(actual);
  return lineas;
}

/* Texto -> bytes WinAnsi escapados para un string PDF. */
const WINANSI = { "—": 0x97, "–": 0x96, "•": 0x95, "’": 0x92, "‘": 0x91, "“": 0x93, "”": 0x94, "…": 0x85 };
function cadena(texto) {
  let salida = "";
  for (const letra of String(texto)) {
    let codigo = WINANSI[letra] ?? letra.charCodeAt(0);
    if (codigo > 255) codigo = 63;
    const caracter = String.fromCharCode(codigo);
    salida += caracter === "\\" || caracter === "(" || caracter === ")" ? `\\${caracter}` : caracter;
  }
  return salida;
}

const num = (valor) => Number(valor.toFixed(2));
const color = (c) => c.map(num).join(" ");

class Documento {
  constructor() {
    this.paginas = [];
    this.nueva();
  }
  nueva() {
    this.ops = [];
    this.paginas.push(this.ops);
    return this;
  }
  rect(x, y, w, alto, c) {
    this.ops.push(`${color(c)} rg ${num(x)} ${num(ALTO - y - alto)} ${num(w)} ${num(alto)} re f`);
  }
  texto(valor, x, y, tamano, { negrita = false, c = OSCURO, alinear = "izq", w = 0 } = {}) {
    let px = x;
    if (alinear === "centro") px = x + (w - ancho(valor, tamano, negrita)) / 2;
    if (alinear === "der") px = x + w - ancho(valor, tamano, negrita);
    this.ops.push(`BT /${negrita ? "F2" : "F1"} ${tamano} Tf ${color(c)} rg ${num(px)} ${num(ALTO - y)} Td (${cadena(valor)}) Tj ET`);
  }
  imagen(x, y, w, alto, nombre = "Im1", transparencia = "") {
    this.ops.push(`q ${transparencia} ${num(w)} 0 0 ${num(alto)} ${num(x)} ${num(ALTO - y - alto)} cm /${nombre} Do Q`);
  }
  marco(x, y, w, alto, c, grosor = 0.6) {
    this.ops.push(`${color(c)} RG ${grosor} w ${num(x)} ${num(ALTO - y - alto)} ${num(w)} ${num(alto)} re S`);
  }
  linea(x1, y1, x2, y2, c, grosor = 0.5) {
    this.ops.push(`${color(c)} RG ${grosor} w ${num(x1)} ${num(ALTO - y1)} m ${num(x2)} ${num(ALTO - y2)} l S`);
  }
}

async function cargarLogo() {
  try {
    const imagen = new Image();
    imagen.src = "/assets/tecnica-n1-monte-grande.png";
    await imagen.decode();
    const lado = 240;
    const componer = (fondo) => {
      const lienzo = document.createElement("canvas");
      lienzo.width = lado;
      lienzo.height = lado;
      const ctx = lienzo.getContext("2d");
      ctx.fillStyle = fondo; // el logo es transparente: se compone sobre el fondo donde va
      ctx.fillRect(0, 0, lado, lado);
      const escala = Math.min(lado / imagen.naturalWidth, lado / imagen.naturalHeight);
      const w = imagen.naturalWidth * escala;
      const alto = imagen.naturalHeight * escala;
      ctx.drawImage(imagen, (lado - w) / 2, (lado - alto) / 2, w, alto);
      return atob(lienzo.toDataURL("image/jpeg", 0.92).split(",")[1]);
    };
    return { sobreBordo: componer("#591c23"), sobreBlanco: componer("#ffffff"), ancho: lado, alto: lado };
  } catch {
    return null; // sin logo el PDF sale igual
  }
}

function celdaNota(doc, resultado, x, y, w) {
  if (!resultado) return doc.texto("—", x, y, 10, { c: GRIS, alinear: "centro", w });
  const marca = COLOR_ESTADO[resultado.estado];
  if (marca?.fondo) doc.rect(x + 6, y - 11, w - 12, 16, marca.fondo);
  doc.texto(String(resultado.valor), x, y, 10, { negrita: true, c: marca?.texto ?? OSCURO, alinear: "centro", w });
}

export async function generarBoletinPdf(datos) {
  const { alumno, materias, inasistencias, materiasPendientes, cicloLectivo, criterio } = datos;
  const logo = await cargarLogo();
  const doc = new Documento();
  const CW = ANCHO - M * 2;
  const COL = { materia: M, c1: M + 215, c2: M + 270, final: M + 325, estado: M + 385 };
  const LIMITE = ALTO - 62;
  const LINEA = [0.85, 0.78, 0.79];

  // Cabecera institucional: dentro del marco de la pagina (18 pt de margen)
  const BORDE = 18;
  doc.rect(BORDE, BORDE, ANCHO - BORDE * 2, 84, BORDO);
  doc.rect(BORDE, BORDE + 84, ANCHO - BORDE * 2, 3, [0.84, 0.6, 0.63]);
  let xTexto = M;
  if (logo) {
    doc.imagen(M, BORDE + 10, 64, 64);
    xTexto = M + 80;
  }
  doc.texto("E.E.S.T. N°1 MONTE GRANDE", xTexto, BORDE + 31, 9.5, { negrita: true, c: [0.93, 0.8, 0.82] });
  doc.texto("BOLETÍN DE CALIFICACIONES", xTexto, BORDE + 55, 19, { negrita: true, c: BLANCO });
  doc.texto(`Ciclo lectivo ${cicloLectivo}`, M, BORDE + 55, 11, { c: [0.93, 0.8, 0.82], alinear: "der", w: CW });

  // Datos del alumno (cuadro con divisiones)
  let y = 124;
  doc.marco(M, y, CW, 44, LINEA);
  const campos = [["ALUMNO/A", alumno.nombreCompleto, 0], ["DNI", alumno.dni, 215], ["CURSO Y DIVISIÓN", alumno.cursoDivision ?? "Sin registro", 330], ["CICLO LECTIVO", String(cicloLectivo), 440]];
  campos.forEach(([etiqueta, valor, dx], i) => {
    if (i > 0) doc.linea(M + dx, y, M + dx, y + 44, LINEA);
    doc.texto(etiqueta, M + dx + 10, y + 16, 7.5, { negrita: true, c: GRIS });
    doc.texto(String(valor), M + dx + 10, y + 33, 10.5, { negrita: true });
  });
  y += 44;

  // Resumen: solo cuenta lo que ya figura en el boletin
  const resumen = resumenBoletin(datos);
  const anchoResumen = CW / resumen.length;
  doc.rect(M, y + 10, CW, 40, ROSA);
  resumen.forEach(([etiqueta, valor], i) => {
    const x = M + i * anchoResumen;
    if (i > 0) doc.linea(x, y + 16, x, y + 44, [0.84, 0.6, 0.63]);
    doc.texto(String(valor), x, y + 31, 16, { negrita: true, c: BORDO, alinear: "centro", w: anchoResumen });
    doc.texto(etiqueta, x, y + 44, 8, { c: GRIS, alinear: "centro", w: anchoResumen });
  });
  y += 70;

  // Tabla con cuadricula
  const columnas = [COL.c1, COL.c2, COL.final, COL.estado];
  const encabezadoTabla = () => {
    doc.rect(M, y, CW, 24, BORDO);
    doc.texto("Materia", COL.materia + 10, y + 16, 9.5, { negrita: true, c: BLANCO });
    doc.texto("1° C", COL.c1, y + 16, 9.5, { negrita: true, c: BLANCO, alinear: "centro", w: 55 });
    doc.texto("2° C", COL.c2, y + 16, 9.5, { negrita: true, c: BLANCO, alinear: "centro", w: 55 });
    doc.texto("Final", COL.final, y + 16, 9.5, { negrita: true, c: BLANCO, alinear: "centro", w: 60 });
    doc.texto("Estado", COL.estado + 10, y + 16, 9.5, { negrita: true, c: BLANCO });
    y += 24;
  };
  const cuadricula = (desde, alto) => {
    doc.marco(M, desde, CW, alto, LINEA);
    columnas.forEach((x) => doc.linea(x, desde, x, desde + alto, LINEA));
  };
  let inicioTabla = y;
  encabezadoTabla();

  if (materias.length === 0) {
    doc.texto("Todavía no hay calificaciones registradas para este ciclo.", M + 10, y + 24, 10, { c: GRIS });
    y += 40;
  }

  materias.forEach((materia, indice) => {
    const situacion = estadoMateria(materia);
    const alto = 32 + (situacion ? 10 : 0);
    if (y + alto > LIMITE) {
      cuadricula(inicioTabla, y - inicioTabla);
      doc.nueva();
      y = M;
      inicioTabla = y;
      encabezadoTabla();
    }
    if (indice % 2 === 1) doc.rect(M, y, CW, alto, [0.985, 0.972, 0.973]);
    const base = y + 17;
    doc.texto(materia.materia, COL.materia + 10, base, 10.5, { negrita: true });
    if (materia.docente) doc.texto(materia.docente, COL.materia + 10, base + 11, 8, { c: GRIS });
    celdaNota(doc, materia.periodos.c1.resultado, COL.c1, base, 55);
    celdaNota(doc, materia.periodos.c2.resultado, COL.c2, base, 55);
    celdaNota(doc, materia.periodos.final.resultado, COL.final, base, 60);
    const marca = COLOR_ESTADO[materia.estadoActual];
    doc.texto(materia.estadoActualEtiqueta ?? "", COL.estado + 10, base, 9.5, { negrita: true, c: marca?.texto ?? OSCURO });
    if (situacion) doc.texto(situacion, COL.estado + 10, base + 11, 8, { c: GRIS });
    doc.linea(M, y + alto, M + CW, y + alto, LINEA);
    y += alto;
  });
  cuadricula(inicioTabla, y - inicioTabla);
  y += 18;

  // Pie: inasistencias y pendientes
  const mitad = (CW - 14) / 2;
  const bloqueInasistencias = [
    `${inasistencias.ausentes} ausente(s) de jornada completa: ${inasistencias.ausentesJustificados} justificada(s), ${inasistencias.ausentesInjustificados} injustificada(s).`,
    ...(inasistencias.llegadasTarde || inasistencias.ausentesParciales ? [`Llegadas tarde: ${inasistencias.llegadasTarde}. Retiros anticipados: ${inasistencias.ausentesParciales}.`] : [])
  ].flatMap((parrafo) => envolver(parrafo, mitad - 28, 9.5));
  const bloquePendientes = materiasPendientes.length
    ? materiasPendientes.flatMap((previa) => envolver(`• ${previa.materia} — ciclo ${previa.anioCursada}${previa.cursoOrigen?.etiqueta ? ` (${previa.cursoOrigen.etiqueta})` : ""}`, mitad - 28, 9.5))
    : ["No tiene materias pendientes."];
  const altoPie = 34 + Math.max(bloqueInasistencias.length, bloquePendientes.length) * 12;
  if (y + altoPie > LIMITE) {
    doc.nueva();
    y = M;
  }
  [["Inasistencias", bloqueInasistencias, M], ["Materias pendientes de aprobación", bloquePendientes, M + mitad + 14]].forEach(([titulo, lineas, x]) => {
    doc.marco(x, y, mitad, altoPie, LINEA);
    doc.rect(x, y, 4, altoPie, [0.84, 0.6, 0.63]);
    doc.texto(titulo, x + 16, y + 18, 10.5, { negrita: true, c: BORDO });
    lineas.forEach((linea, i) => doc.texto(linea, x + 16, y + 34 + i * 12, 9.5));
  });
  y += altoPie + 14;

  // Criterio
  const parrafo = envolver(`${criterio} TEP: trayectoria educativa en proceso. TED: trayectoria educativa con dificultad.`, CW, 8.5);
  if (y + parrafo.length * 11 + 70 > LIMITE) {
    doc.nueva();
    y = M;
  }
  parrafo.forEach((linea, i) => doc.texto(linea, M, y + 8 + i * 11, 8.5, { c: GRIS }));
  y += parrafo.length * 11 + 56;

  // Firmas (en blanco: se completan a mano al imprimir)
  [["Firma del preceptor/a", M + 30], ["Firma y sello de Dirección", ANCHO - M - 30 - 170]].forEach(([etiqueta, x]) => {
    doc.linea(x, y, x + 170, y, [0.35, 0.35, 0.35], 0.6);
    doc.texto(etiqueta, x, y + 12, 8.5, { c: GRIS, alinear: "centro", w: 170 });
  });

  // Marco, marca de agua y pie de cada pagina
  const emitido = new Date().toLocaleDateString("es-AR");
  doc.paginas.forEach((ops, i) => {
    doc.ops = [];
    if (logo) doc.imagen((ANCHO - 330) / 2, (ALTO - 330) / 2 + 20, 330, 330, "Im2", "/GS1 gs");
    doc.marco(18, 18, ANCHO - 36, ALTO - 36, [0.81, 0.66, 0.68], 0.8);
    doc.rect(M, ALTO - 42, CW, 0.5, [0.85, 0.82, 0.82]);
    doc.texto(`Consulta generada el ${emitido} desde Prece Digital.`, M, ALTO - 28, 8, { c: GRIS });
    doc.texto(`Página ${i + 1} de ${doc.paginas.length}`, M, ALTO - 28, 8, { c: GRIS, alinear: "der", w: CW });
    const fondo = logo ? 2 : 1; // marca de agua + marco van debajo del contenido
    ops.unshift(...doc.ops.slice(0, fondo));
    ops.push(...doc.ops.slice(fondo));
  });

  return new Blob([armarArchivo(doc.paginas, logo)], { type: "application/pdf" });
}

function armarArchivo(paginas, logo) {
  const objetos = []; // objetos[n-1] = contenido del objeto n
  const agregar = (contenido) => objetos.push(contenido) && objetos.length;
  const reservar = () => agregar("");

  reservar(); // 1 catalogo
  reservar(); // 2 paginas
  agregar("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>"); // 3
  agregar("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>"); // 4
  const imagenPdf = (binario) => agregar(`<< /Type /XObject /Subtype /Image /Width ${logo.ancho} /Height ${logo.alto} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${binario.length} >>\nstream\n${binario}\nendstream`);
  const idImagen = logo ? imagenPdf(logo.sobreBordo) : null;
  const idMarca = logo ? imagenPdf(logo.sobreBlanco) : null;

  const recursos = `<< /Font << /F1 3 0 R /F2 4 0 R >>${idImagen ? ` /XObject << /Im1 ${idImagen} 0 R /Im2 ${idMarca} 0 R >> /ExtGState << /GS1 << /ca 0.045 >> >>` : ""} >>`;
  const idPaginas = paginas.map((ops) => {
    const flujo = ops.join("\n");
    const contenido = agregar(`<< /Length ${flujo.length} >>\nstream\n${flujo}\nendstream`);
    return agregar(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${ANCHO} ${ALTO}] /Resources ${recursos} /Contents ${contenido} 0 R >>`);
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
  posiciones.forEach((posicion) => {
    salida += `${String(posicion).padStart(10, "0")} 00000 n \n`;
  });
  salida += `trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R >>\nstartxref\n${inicioXref}\n%%EOF`;

  const bytes = new Uint8Array(salida.length);
  for (let i = 0; i < salida.length; i += 1) bytes[i] = salida.charCodeAt(i) & 0xff;
  return bytes;
}

function nombreArchivo(datos) {
  const limpio = (texto) => String(texto ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `Boletin-${limpio(datos.alumno.nombreCompleto) || "alumno"}-${datos.cicloLectivo}.pdf`;
}

export async function descargarBoletinPdf(datos) {
  const blob = await generarBoletinPdf(datos);
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombreArchivo(datos);
  document.body.append(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
