/* Generador de PDF oficial (A4 vertical) sin librerias externas para:
   - Constancia de Alumno Regular
   - Constancia de Situacion Academica
   - Certificado de Estudio en Tramite / Pase
   - Solicitud de Pases
   - RITE (Registro Institucional de Trayectorias Educativas)
   Reutiliza pdf-base.js (metricas Helvetica, WinAnsi y logo institucional). */

import { ancho, cadena, cargarLogo } from "../../utils/pdf-base.js";

const A4_W = 595.28;
const A4_H = 841.89;
const M = 42;
const CW = A4_W - M * 2;

const BORDO = [0.349, 0.11, 0.137];
const AZUL = [0.102, 0.345, 0.58];
const OSCURO = [0.11, 0.16, 0.27];
const GRIS = [0.4, 0.42, 0.46];
const LINEA = [0.75, 0.77, 0.8];
const FONDO_SUAVE = [0.965, 0.94, 0.945];
const FONDO_ZEBRA = [0.965, 0.97, 0.98];
const BLANCO = [1, 1, 1];

const n = (v) => Number(v.toFixed(2));
const col = (c) => c.map(n).join(" ");

export function limpiarNombreArchivo(texto) {
  return String(texto ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

function envolver(texto, maxW, tam, negrita = false) {
  const lineas = [];
  for (const parrafo of String(texto ?? "").split("\n")) {
    let actual = "";
    for (const palabra of parrafo.split(/\s+/).filter(Boolean)) {
      const prueba = actual ? `${actual} ${palabra}` : palabra;
      if (actual && ancho(prueba, tam, negrita) > maxW) {
        lineas.push(actual);
        actual = palabra;
      } else {
        actual = prueba;
      }
    }
    lineas.push(actual);
  }
  return lineas;
}

class HojaA4 {
  constructor(w = A4_W, h = A4_H) {
    this.w = w;
    this.h = h;
    this.paginas = [];
    this.nueva();
  }
  nueva() {
    this.ops = [];
    this.paginas.push(this.ops);
    return this;
  }
  rect(x, y, w, alto, c) {
    this.ops.push(`${col(c)} rg ${n(x)} ${n(this.h - y - alto)} ${n(w)} ${n(alto)} re f`);
  }
  marco(x, y, w, alto, c, g = 0.6) {
    this.ops.push(`${col(c)} RG ${g} w ${n(x)} ${n(this.h - y - alto)} ${n(w)} ${n(alto)} re S`);
  }
  linea(x1, y1, x2, y2, c, g = 0.6, guiones = false) {
    this.ops.push(`${guiones ? "[3 3] 0 d" : "[] 0 d"} ${col(c)} RG ${g} w ${n(x1)} ${n(this.h - y1)} m ${n(x2)} ${n(this.h - y2)} l S`);
  }
  imagen(x, y, w, alto) {
    this.ops.push(`q ${n(w)} 0 0 ${n(alto)} ${n(x)} ${n(this.h - y - alto)} cm /Im1 Do Q`);
  }
  texto(valor, x, y, tam, { negrita = false, c = OSCURO, alinear = "izq", w = 0, minimo = tam } = {}) {
    let t = String(valor ?? "");
    let s = tam;
    if (w) {
      while (s > minimo && ancho(t, s, negrita) > w) s = Math.max(minimo, +(s - 0.25).toFixed(2));
      if (ancho(t, s, negrita) > w) {
        while (t.length > 1 && ancho(`${t}...`, s, negrita) > w) t = t.slice(0, -1);
        t = `${t.trimEnd()}...`;
      }
    }
    let px = x;
    if (alinear === "centro") px = x + (w - ancho(t, s, negrita)) / 2;
    else if (alinear === "der") px = x + w - ancho(t, s, negrita);
    this.ops.push(`BT /${negrita ? "F2" : "F1"} ${s} Tf ${col(c)} rg ${n(px)} ${n(this.h - y)} Td (${cadena(t)}) Tj ET`);
  }
  parrafo(texto, x, y, maxW, tam, { negrita = false, c = OSCURO, interlineado = tam * 1.48 } = {}) {
    let cy = y;
    for (const linea of envolver(texto, maxW, tam, negrita)) {
      if (linea) this.texto(linea, x, cy, tam, { negrita, c });
      cy += interlineado;
    }
    return cy;
  }
}

export function armarPdf(paginas, logo, { ancho: w = A4_W, alto: h = A4_H, sobreBordo = true } = {}) {
  const objetos = ["", ""];
  const agregar = (contenido) => objetos.push(contenido);
  agregar("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
  agregar("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
  const imgData = logo ? (sobreBordo ? logo.sobreBordo : logo.sobreBlanco) : null;
  const idImg = imgData
    ? agregar(`<< /Type /XObject /Subtype /Image /Width ${logo.ancho} /Height ${logo.alto} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imgData.length} >>\nstream\n${imgData}\nendstream`)
    : null;
  const recursos = `<< /Font << /F1 3 0 R /F2 4 0 R >>${idImg ? ` /XObject << /Im1 ${idImg} 0 R >>` : ""} >>`;
  const idPaginas = paginas.map((ops) => {
    const flujo = ops.join("\n");
    const contenido = agregar(`<< /Length ${flujo.length} >>\nstream\n${flujo}\nendstream`);
    return agregar(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${n(w)} ${n(h)}] /Resources ${recursos} /Contents ${contenido} 0 R >>`);
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

export function dispararDescargaPdf(bytes, nombreArchivo) {
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombreArchivo;
  document.body.append(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function dibujarCabeceraInstitucional(doc, logo, titulo, subtitulo, colorPrimario = BORDO) {
  doc.marco(M - 10, M - 10, CW + 20, A4_H - (M - 10) * 2, LINEA, 0.8);
  doc.rect(M, M, CW, 62, colorPrimario);
  if (logo) doc.imagen(M + 10, M + 7, 48, 48);
  const tx = logo ? M + 68 : M + 14;
  doc.texto("DIRECCION GENERAL DE CULTURA Y EDUCACION - PROVINCIA DE BUENOS AIRES", tx, M + 18, 7.5, { c: [0.93, 0.86, 0.87] });
  doc.texto('E.E.S.T. N° 1 "CECILIA BERDICHEVSKY" - MONTE GRANDE', tx, M + 34, 11.5, { negrita: true, c: BLANCO });
  doc.texto(subtitulo, tx, M + 50, 9, { c: [0.95, 0.92, 0.92] });

  const yTitulo = M + 86;
  doc.texto(titulo, M, yTitulo, 14, { negrita: true, c: colorPrimario, alinear: "centro", w: CW });
  doc.linea(M + 40, yTitulo + 8, M + CW - 40, yTitulo + 8, colorPrimario, 1.2);
  return yTitulo + 30;
}

function dibujarFirmas(doc, y, etiquetas) {
  const cant = etiquetas.length;
  const espacio = 24;
  const anchoFirma = (CW - espacio * (cant - 1)) / cant;
  etiquetas.forEach((etiqueta, idx) => {
    const fx = M + idx * (anchoFirma + espacio);
    doc.linea(fx + 10, y, fx + anchoFirma - 10, y, OSCURO, 0.7);
    doc.texto(etiqueta, fx, y + 14, 8.5, { negrita: true, c: GRIS, alinear: "centro", w: anchoFirma });
  });
}

function nombreAlumno(alumno) {
  if (alumno?.nombreCompleto) return alumno.nombreCompleto;
  return `${alumno?.apellido ?? ""}, ${alumno?.nombre ?? ""}`.replace(/^,\s*|,\s*$/g, "").trim() || "Estudiante";
}

function fechaActualObj(fecha) {
  if (fecha?.dia && fecha?.mes && fecha?.anio) return fecha;
  const hoy = new Date();
  const meses = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  return { dia: hoy.getDate(), mes: meses[hoy.getMonth()], anio: hoy.getFullYear() };
}

/* 1. Constancia de Alumno Regular */
export function generarAlumnoRegularPdf({ alumno = {}, destino = "quien corresponda", fecha, textoOficial = null }, logo = null) {
  const f = fechaActualObj(fecha);
  const doc = new HojaA4();
  let y = dibujarCabeceraInstitucional(doc, logo, "CONSTANCIA DE ALUMNO REGULAR", "Distrito Esteban Echeverria · Monte Grande");

  doc.rect(M, y - 4, CW, 26, FONDO_SUAVE);
  doc.texto('ESTABLECIMIENTO: E.E.S.T. N° 1 "Cecilia Berdichevsky" - Esteban Echeverria', M + 10, y + 12, 9.5, { negrita: true, c: OSCURO });
  y += 44;

  const cuerpo1 =
    textoOficial ||
    `Se hace constar que ${nombreAlumno(alumno)}, DNI N° ${alumno.dni || "S/D"}, es alumno/a regular del Establecimiento y esta matriculado/a en el presente ciclo lectivo ${f.anio} en ${alumno.curso || "1°"} Ano, ${alumno.division || "1"}a Division, concurriendo a clase en el turno ${alumno.turno || "Manana"}.`;
  y = doc.parrafo(cuerpo1, M + 8, y, CW - 16, 11, { interlineado: 19 });
  y += 16;

  const cuerpo2 = `A pedido del interesado y al solo efecto de ser presentado ante las autoridades de ${destino}, se le extiende la presente constancia en Monte Grande, a los ${f.dia} dias del mes de ${f.mes} de ${f.anio}.`;
  y = doc.parrafo(cuerpo2, M + 8, y, CW - 16, 11, { interlineado: 19 });

  doc.texto("Validez: 30 dias corridos desde la fecha de emision.", M + 8, y + 18, 9, { c: GRIS });
  dibujarFirmas(doc, A4_H - 130, ["Sello de la Institucion", "Firma y Sello de Autoridad"]);
  return armarPdf(doc.paginas, logo, { sobreBordo: true });
}

export async function descargarAlumnoRegularPdf(datos) {
  const logo = await cargarLogo();
  const bytes = generarAlumnoRegularPdf(datos, logo);
  const nom = limpiarNombreArchivo(nombreAlumno(datos.alumno)) || "alumno";
  dispararDescargaPdf(bytes, `Constancia_Alumno_Regular_${nom}.pdf`);
}

/* 2. Constancia de Situacion Academica */
export function generarSituacionAcademicaPdf({ alumno = {}, materiasAdeudadas = [], fecha }, logo = null) {
  const f = fechaActualObj(fecha);
  const doc = new HojaA4();
  let y = dibujarCabeceraInstitucional(doc, logo, "CONSTANCIA DE SITUACION ACADEMICA", `Ciclo Lectivo ${f.anio} · Distrito Esteban Echeverria`);

  const cuerpo = `La Direccion de la E.E.S.T. N° 1 "Cecilia Berdichevsky" hace constar que ${nombreAlumno(alumno)}, DNI N° ${alumno.dni || "S/D"}, cursa actualmente ${alumno.curso || "1°"} Ano, Division ${alumno.division || "1"}°, Turno ${alumno.turno || "Manana"}, registrando la siguiente situacion academica:`;
  y = doc.parrafo(cuerpo, M + 8, y, CW - 16, 10.5, { interlineado: 18 });
  y += 14;

  doc.rect(M + 8, y, CW - 16, 22, BORDO);
  doc.texto("MATERIAS ADEUDADAS / PENDIENTES DE APROBACION", M + 16, y + 14, 9.5, { negrita: true, c: BLANCO });
  y += 28;

  if (!materiasAdeudadas.length) {
    doc.rect(M + 8, y, CW - 16, 26, FONDO_SUAVE);
    doc.texto("NO ADEUDA MATERIAS A LA FECHA.", M + 16, y + 16, 10, { negrita: true, c: OSCURO });
    y += 40;
  } else {
    materiasAdeudadas.forEach((mat, idx) => {
      if (idx % 2 === 1) doc.rect(M + 8, y - 2, CW - 16, 20, FONDO_ZEBRA);
      doc.texto(`${idx + 1}. ${mat}`, M + 16, y + 12, 9.5, { c: OSCURO, w: CW - 32 });
      doc.linea(M + 8, y + 18, M + CW - 8, y + 18, LINEA, 0.4);
      y += 20;
    });
    y += 14;
  }

  y = doc.parrafo(
    `Se extiende la presente a solicitud del/la interesado/a para ser presentada ante las autoridades que la requieran, en Monte Grande a los ${f.dia} dias del mes de ${f.mes} de ${f.anio}.`,
    M + 8,
    y + 8,
    CW - 16,
    10.5,
    { interlineado: 18 }
  );

  dibujarFirmas(doc, A4_H - 130, ["Sello de la Institucion", "Secretaria", "Direccion"]);
  return armarPdf(doc.paginas, logo, { sobreBordo: true });
}

export async function descargarSituacionAcademicaPdf(datos) {
  const logo = await cargarLogo();
  const bytes = generarSituacionAcademicaPdf(datos, logo);
  const nom = limpiarNombreArchivo(nombreAlumno(datos.alumno)) || "alumno";
  dispararDescargaPdf(bytes, `Constancia_Situacion_Academica_${nom}.pdf`);
}

/* 3. Certificado de Estudio en Tramite / Pase */
export function generarTramitePasePdf({ alumno = {}, materiasAdeudadas = "NINGUNA", destino = "las autoridades que lo requieran", fecha }, logo = null) {
  const f = fechaActualObj(fecha);
  const doc = new HojaA4();
  let y = dibujarCabeceraInstitucional(
    doc,
    logo,
    "CERTIFICADO DE ESTUDIO EN TRAMITE",
    "Direccion de Educacion Media, Tecnica y Agraria · Validez: 30 dias"
  );

  const cuerpo1 = `Se hace constar que ${nombreAlumno(alumno)}, DNI N° ${alumno.dni || "S/D"}, tiene en tramite su Certificado de Estudios correspondiente a ${alumno.curso || "1°"} Ano, Division ${alumno.division || "1"}°, Turno ${alumno.turno || "Manana"}, Orientacion: ${alumno.orientacion || "Ciclo Basico"}.`;
  y = doc.parrafo(cuerpo1, M + 8, y, CW - 16, 10.5, { interlineado: 18 });
  y += 12;

  doc.rect(M + 8, y, CW - 16, 46, FONDO_SUAVE);
  doc.marco(M + 8, y, CW - 16, 46, LINEA, 0.6);
  doc.texto("MATERIAS ADEUDADAS:", M + 16, y + 16, 9, { negrita: true, c: BORDO });
  doc.parrafo(String(materiasAdeudadas || "NINGUNA"), M + 16, y + 31, CW - 32, 9.5, { negrita: true, c: OSCURO, interlineado: 13 });
  y += 66;

  const cuerpo2 = `A pedido del/la interesado/a y para ser presentado ante ${destino}, se extiende la presente constancia con validez de treinta (30) dias en Monte Grande, a los ${f.dia} dias del mes de ${f.mes} de ${f.anio}.`;
  doc.parrafo(cuerpo2, M + 8, y, CW - 16, 10.5, { interlineado: 18 });

  dibujarFirmas(doc, A4_H - 130, ["Sello del Establecimiento", "Firma y Sello Directivo"]);
  return armarPdf(doc.paginas, logo, { sobreBordo: true });
}

export async function descargarTramitePasePdf(datos) {
  const logo = await cargarLogo();
  const bytes = generarTramitePasePdf(datos, logo);
  const nom = limpiarNombreArchivo(nombreAlumno(datos.alumno)) || "alumno";
  dispararDescargaPdf(bytes, `Certificado_Estudio_Tramite_${nom}.pdf`);
}

/* 4. Solicitud de Pases */
export function generarSolicitudPasePdf({ alumno = {}, establecimientoDestino = "", distritoDestino = "Esteban Echeverria", tipoAccion = "solicita o concede", fecha }, logo = null) {
  const f = fechaActualObj(fecha);
  const doc = new HojaA4();
  let y = dibujarCabeceraInstitucional(doc, logo, "SOLICITUD DE PASES", "Formulario Oficial · Provincia de Buenos Aires", BORDO);

  const destinoTxt = establecimientoDestino?.trim() || ".......................................................................";
  const cuerpo1 = `La Direccion de la E.E.S.T. N° 1 "Cecilia Berdichevsky" del Distrito de Esteban Echeverria ${tipoAccion} el pase del/la alumno/a ${nombreAlumno(alumno)}, DNI N° ${alumno.dni || "S/D"}, quien cursa ${alumno.curso || "1°"} Ano, Division ${alumno.division || "1"}°${alumno.orientacion ? ` (${alumno.orientacion})` : ""}, Turno ${alumno.turno || "Manana"}.`;
  y = doc.parrafo(cuerpo1, M + 8, y, CW - 16, 11, { interlineado: 19 });
  y += 14;

  const cuerpo2 = `Establecimiento de destino: ${destinoTxt}\nDistrito: ${distritoDestino || "Esteban Echeverria"}`;
  y = doc.parrafo(cuerpo2, M + 8, y, CW - 16, 10.5, { negrita: true, interlineado: 18 });
  y += 14;

  doc.parrafo(
    `Monte Grande, ${f.dia} de ${f.mes} de ${f.anio}.`,
    M + 8,
    y,
    CW - 16,
    10.5,
    { interlineado: 18 }
  );

  dibujarFirmas(doc, A4_H - 130, ["Sello del Establecimiento", "Firma del Directivo"]);
  return armarPdf(doc.paginas, logo, { sobreBordo: true });
}

export async function descargarSolicitudPasePdf(datos) {
  const logo = await cargarLogo();
  const bytes = generarSolicitudPasePdf(datos, logo);
  const nom = limpiarNombreArchivo(nombreAlumno(datos.alumno)) || "alumno";
  dispararDescargaPdf(bytes, `Solicitud_Pase_${nom}.pdf`);
}

/* 5. RITE - Registro Institucional de Trayectorias Educativas */
export function generarRitePdf({ alumno = {}, materias = [], inasistencias = {}, fecha }, logo = null) {
  const f = fechaActualObj(fecha);
  const doc = new HojaA4();
  let y = dibujarCabeceraInstitucional(
    doc,
    logo,
    "REGISTRO INSTITUCIONAL DE TRAYECTORIAS EDUCATIVAS (RITE)",
    `Nivel Secundaria Tecnica · Ciclo Lectivo ${f.anio}`
  );

  // Barra de datos del alumno
  doc.rect(M, y - 6, CW, 34, FONDO_SUAVE);
  doc.marco(M, y - 6, CW, 34, LINEA, 0.5);
  doc.texto(`ESTUDIANTE: ${nombreAlumno(alumno)}`, M + 8, y + 8, 9, { negrita: true, w: CW * 0.6 });
  doc.texto(`DNI: ${alumno.dni || "S/D"}`, M + CW * 0.65, y + 8, 9, { negrita: true });
  doc.texto(`CURSO: ${alumno.curso || "—"} ${alumno.division || ""}°`, M + 8, y + 22, 8.5, { c: GRIS });
  doc.texto(`TURNO: ${String(alumno.turno || "—").toUpperCase()}`, M + 180, y + 22, 8.5, { c: GRIS });
  y += 40;

  // Tabla de materias
  const cols = [
    { titulo: "C-R", w: 28, align: "centro" },
    { titulo: "MATERIA", w: 185, align: "izq" },
    { titulo: "1° CUAT.", w: 48, align: "centro" },
    { titulo: "2° CUAT.", w: 48, align: "centro" },
    { titulo: "DIC.", w: 42, align: "centro" },
    { titulo: "FEB.", w: 42, align: "centro" },
    { titulo: "FINAL", w: 68, align: "centro" },
    { titulo: "OBS.", w: CW - (28 + 185 + 48 + 48 + 42 + 42 + 68), align: "centro" }
  ];

  const dibujarHeader = (py) => {
    doc.rect(M, py, CW, 20, BORDO);
    let cx = M;
    for (const c of cols) {
      doc.texto(c.titulo, cx + 2, py + 13, 7.5, { negrita: true, c: BLANCO, alinear: "centro", w: c.w - 4 });
      cx += c.w;
    }
    return py + 20;
  };

  y = dibujarHeader(y);
  const altoFila = materias.length > 18 ? 16 : 19;

  materias.forEach((m, idx) => {
    if (y + altoFila > A4_H - 130) {
      doc.nueva();
      y = M;
      y = dibujarHeader(y);
    }
    if (idx % 2 === 1) doc.rect(M, y, CW, altoFila, FONDO_ZEBRA);
    doc.marco(M, y, CW, altoFila, LINEA, 0.35);

    const vals = [m.tipo || "C", m.nombre || "", m.nota1C || "-", m.nota2C || "-", m.dic || "-", m.feb || "-", m.final || "-", m.obs || "-"];
    let cx = M;
    vals.forEach((val, ci) => {
      const c = cols[ci];
      if (ci > 0) doc.linea(cx, y, cx, y + altoFila, LINEA, 0.35);
      doc.texto(String(val), cx + 3, y + altoFila * 0.68, 7.5, {
        negrita: ci === 1 || ci === 6,
        c: ci === 6 ? BORDO : OSCURO,
        alinear: c.align,
        w: c.w - 6,
        minimo: 6
      });
      cx += c.w;
    });
    y += altoFila;
  });

  // Inasistencias + Firmas
  y += 14;
  if (y + 90 > A4_H - M) {
    doc.nueva();
    y = M + 10;
  }
  doc.rect(M, y, CW, 24, FONDO_SUAVE);
  doc.marco(M, y, CW, 24, LINEA, 0.5);
  doc.texto(
    `INASISTENCIAS   |   1° Cuatrimestre: ${inasistencias.c1 ?? "-"}   |   2° Cuatrimestre: ${inasistencias.c2 ?? "-"}   |   Total Anual: ${inasistencias.total ?? "0"}`,
    M + 10,
    y + 15,
    8.5,
    { negrita: true, c: OSCURO }
  );

  dibujarFirmas(doc, Math.min(A4_H - 70, y + 76), ["AUTORIDAD", "ADULTO RESPONSABLE", "ALUMNO/A"]);
  return armarPdf(doc.paginas, logo, { sobreBordo: true });
}

export async function descargarRitePdf(datos) {
  const logo = await cargarLogo();
  const bytes = generarRitePdf(datos, logo);
  const nom = limpiarNombreArchivo(nombreAlumno(datos.alumno)) || "alumno";
  const anio = datos.fecha?.anio ?? new Date().getFullYear();
  dispararDescargaPdf(bytes, `RITE_${nom}_${anio}.pdf`);
}
