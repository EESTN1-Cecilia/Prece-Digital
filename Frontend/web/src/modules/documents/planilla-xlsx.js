/* Descarga de la planilla como Excel (.xlsx) con el mismo diseño institucional
   del PDF: encabezado, resumen, columnas agrupadas, firmas, paneles inmovilizados,
   filtros e impresion en Oficio vertical, en una sola hoja. Arma el archivo OOXML a mano (zip sin
   compresion), porque la libreria xlsx de la app no admite estilos. Solo exporta:
   no guarda nada. Valores numericos como numeros; sin formulas. */

import { crearZip } from "../../utils/zip-store.js";
import { cargarLogo } from "../../utils/pdf-base.js";
import { COLUMNAS, GRUPOS, FIRMAS, INSTITUCION, tituloPlanilla, resumenCurso, valoresFila } from "./planilla-estructura.js";
import { nombreArchivoPlanilla } from "./planilla-pdf.js";

const BORDO = "591C23";
const GRIS = "5F5F66";
const OSCURO = "1A1A1F";
const BANDA = { c1: "F6EBED", c2: "EDEDF0" };
const TABLA = "8C8C91";
const TENUE = "CFCFD4";
const PAPEL_OFICIO = 14; // "Folio" 8,5 x 13 in = 21,6 x 33 cm
const HOJA = "Planilla";

/* Columnas del Excel: las del PDF + DNI (util para editar y cruzar datos). */
const ANCHO_COL = { num: 9, alumno: 46, dni: 12, parc1: 14, val1: 10, calif1: 9, inas1: 7, parc2: 14, val2: 10, calif2: 9, inas2: 7, dic: 11, feb: 11, final: 12 };
const COLS = [COLUMNAS[0], COLUMNAS[1], { id: "dni", titulo: "DNI" }, ...COLUMNAS.slice(2)];
const NC = COLS.length;
const idx = (id) => COLS.findIndex((c) => c.id === id) + 1; // base 1

const limpiar = (t) => String(t ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
const esc = (t) => limpiar(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
function letra(n) {
  let s = "";
  for (let k = n; k > 0; k = Math.floor((k - 1) / 26)) s = String.fromCharCode(65 + ((k - 1) % 26)) + s;
  return s;
}
const ref = (r, c) => `${letra(c)}${r}`;

/* ---------- estilos ---------- */
class Estilos {
  constructor() {
    this.fuentes = [];
    this.rellenos = ['<fill><patternFill patternType="none"/></fill>', '<fill><patternFill patternType="gray125"/></fill>'];
    this.bordes = ["<border><left/><right/><top/><bottom/><diagonal/></border>"];
    this.xfs = ['<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'];
    this.fuente({}); // fuente 0 por defecto
  }
  _id(lista, xml) {
    const i = lista.indexOf(xml);
    if (i >= 0) return i;
    lista.push(xml);
    return lista.length - 1;
  }
  fuente({ b = false, i = false, sz = 10, color = OSCURO } = {}) {
    return this._id(this.fuentes, `<font>${b ? "<b/>" : ""}${i ? "<i/>" : ""}<sz val="${sz}"/><color rgb="FF${color}"/><name val="Arial"/><family val="2"/></font>`);
  }
  /* borde: { l, r, t, b } -> color o undefined */
  borde(spec = {}, estilo = "thin") {
    const lado = (n, c) => (c ? `<${n} style="${estilo}"><color rgb="FF${c}"/></${n}>` : `<${n}/>`);
    return this._id(this.bordes, `<border>${lado("left", spec.l)}${lado("right", spec.r)}${lado("top", spec.t)}${lado("bottom", spec.b)}<diagonal/></border>`);
  }
  relleno(color) {
    if (!color) return 0;
    return this._id(this.rellenos, `<fill><patternFill patternType="solid"><fgColor rgb="FF${color}"/><bgColor indexed="64"/></patternFill></fill>`);
  }
  /* o: { b,i,sz,color, fill, bordes:{l,r,t,b}, grosor, h, v, wrap, indent, fmt } */
  xf(o = {}) {
    const f = this.fuente(o);
    const r = this.relleno(o.fill);
    const bo = o.bordes ? this.borde(o.bordes, o.grosor ?? "thin") : 0;
    const al = `<alignment horizontal="${o.h ?? "general"}" vertical="${o.v ?? "center"}"${o.wrap ? ' wrapText="1"' : ""}${o.indent ? ` indent="${o.indent}"` : ""}/>`;
    const fmt = o.fmt ?? 0;
    return this._id(this.xfs, `<xf numFmtId="${fmt}" fontId="${f}" fillId="${r}" borderId="${bo}" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">${al}</xf>`);
  }
  xml() {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="${this.fuentes.length}">${this.fuentes.join("")}</fonts><fills count="${this.rellenos.length}">${this.rellenos.join("")}</fills><borders count="${this.bordes.length}">${this.bordes.join("")}</borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="${this.xfs.length}">${this.xfs.join("")}</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
  }
}

/* ---------- hoja ---------- */
class Hoja {
  constructor() {
    this.filas = new Map();
    this.combinadas = [];
  }
  fila(r) {
    if (!this.filas.has(r)) this.filas.set(r, { alto: null, celdas: new Map() });
    return this.filas.get(r);
  }
  alto(r, pt) {
    this.fila(r).alto = pt;
  }
  poner(r, c, valor, s) {
    let xml;
    if (valor === null || valor === undefined || valor === "") xml = `<c r="${ref(r, c)}" s="${s}"/>`;
    else if (typeof valor === "number" && Number.isFinite(valor)) xml = `<c r="${ref(r, c)}" s="${s}"><v>${valor}</v></c>`;
    else if (valor && valor.rico) xml = `<c r="${ref(r, c)}" s="${s}" t="inlineStr"><is>${valor.rico}</is></c>`;
    else xml = `<c r="${ref(r, c)}" s="${s}" t="inlineStr"><is><t xml:space="preserve">${esc(valor)}</t></is></c>`;
    this.fila(r).celdas.set(c, xml);
  }
  /* Combina y aplica el mismo estilo a toda la region (para que lleve bordes completos). */
  combinar(r1, c1, r2, c2, valor, s) {
    for (let r = r1; r <= r2; r += 1) for (let c = c1; c <= c2; c += 1) this.poner(r, c, r === r1 && c === c1 ? valor : null, s);
    if (r1 !== r2 || c1 !== c2) this.combinadas.push(`${ref(r1, c1)}:${ref(r2, c2)}`);
  }
  datos() {
    return [...this.filas.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([r, { alto, celdas }]) => {
        const cs = [...celdas.entries()].sort((a, b) => a[0] - b[0]).map((e) => e[1]).join("");
        return `<row r="${r}"${alto ? ` ht="${alto}" customHeight="1"` : ""}>${cs}</row>`;
      })
      .join("");
  }
}

const rico = (etiqueta, valor, fuenteEtiqueta, fuenteValor) => ({
  rico: `<r><rPr><b/><sz val="${fuenteEtiqueta.sz}"/><color rgb="FF${fuenteEtiqueta.color}"/><rFont val="Arial"/><family val="2"/></rPr><t xml:space="preserve">${esc(etiqueta)} </t></r><r><rPr><b/><sz val="${fuenteValor.sz}"/><color rgb="FF${fuenteValor.color}"/><rFont val="Arial"/><family val="2"/></rPr><t xml:space="preserve">${esc(valor)}</t></r>`
});

const aNumero = (v) => {
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) && String(v).trim() !== "" && String(v).trim() !== "-" ? n : v;
};

/* Arma el libro y devuelve los bytes del .xlsx. `logo` (opcional): { sobreBlanco } JPEG en cadena binaria. */
export function generarPlanillaXlsx(d, logo = null) {
  const E = new Estilos();
  const H = new Hoja();
  const ultima = NC;

  // --- Encabezado institucional (filas 1-3, logo en A1:A3)
  const sDir = E.xf({ b: true, sz: 8, color: GRIS, v: "center", indent: 1 });
  const sEsc = E.xf({ b: true, sz: 14, color: BORDO, indent: 1 });
  const sTit = E.xf({ b: true, sz: 17, indent: 1, bordes: { b: BORDO }, grosor: "medium" });
  H.alto(1, 15);
  H.alto(2, 21);
  H.alto(3, 26);
  H.combinar(1, 2, 1, ultima, INSTITUCION.direccion, sDir);
  H.combinar(2, 2, 2, ultima, INSTITUCION.escuela, sEsc);
  H.combinar(3, 2, 3, ultima, tituloPlanilla(d.anioLectivo), sTit);
  H.poner(3, 1, null, E.xf({ bordes: { b: BORDO }, grosor: "medium" }));
  H.alto(4, 6);

  // --- Datos del curso (filas 5-6)
  const eti = { sz: 8, color: GRIS };
  const val = { sz: 10, color: OSCURO };
  const sInfo = E.xf({ indent: 1 });
  const info = (r, c1, c2, etiqueta, valor) => H.combinar(r, c1, r, c2, rico(`${etiqueta}:`, valor, eti, val), sInfo);
  H.alto(5, 18);
  H.alto(6, 18);
  info(5, 1, 3, "MATERIA", d.materia);
  info(5, 4, 6, "AÑO", d.curso);
  info(5, 7, 9, "SECCIÓN", `${d.division}°`);
  info(5, 10, 12, "TURNO", d.turno);
  info(6, 1, 6, "PROFESOR/A", d.docente);
  info(6, 7, ultima, "PRECEPTOR/A", d.preceptor || "—");
  H.alto(7, 6);

  // --- Resumen (filas 8-9)
  const sEtiqRes = E.xf({ b: true, sz: 8, color: GRIS, fill: "F6EBED", h: "center", bordes: { l: TABLA, r: TABLA, t: TABLA } });
  const sNumRes = E.xf({ b: true, sz: 14, color: BORDO, h: "center", bordes: { l: TABLA, r: TABLA, b: TABLA } });
  const sNumRes2 = E.xf({ b: true, sz: 14, color: BORDO, h: "center", fmt: 2, bordes: { l: TABLA, r: TABLA, b: TABLA } });
  H.alto(8, 16);
  H.alto(9, 22);
  // Total + por cuatrimestre (aprobados, desaprobados, promedio): 7 cajas de 2 columnas
  const cajas = Array.from({ length: 7 }, (_, i) => [i * 2 + 1, i * 2 + 2]);
  let k = 0;
  resumenCurso(d.metricas).forEach((grupo) => {
    grupo.celdas.forEach(([nombre, valor]) => {
      const [c1, c2] = cajas[k];
      const etiqueta = grupo.celdas.length === 1 ? grupo.titulo : `${grupo.titulo.replace("CUATRIMESTRE", "CUAT.")} · ${nombre.toUpperCase()}`;
      const n = nombre === "Promedio" ? aNumero(valor) : Number(valor);
      H.combinar(8, c1, 8, c2, etiqueta, sEtiqRes);
      H.combinar(9, c1, 9, c2, typeof n === "number" && Number.isFinite(n) ? n : "-", nombre === "Promedio" && typeof n === "number" ? sNumRes2 : sNumRes);
      k += 1;
    });
  });
  H.alto(10, 8);

  // --- Encabezado de la tabla (filas 11-12)
  const FILA_G = 11;
  const FILA_S = 12;
  const bordeEnc = { l: "D9B8BC", r: "D9B8BC", t: "D9B8BC", b: "D9B8BC" };
  const sEnc = E.xf({ b: true, sz: 9, color: "FFFFFF", fill: BORDO, h: "center", wrap: true, bordes: bordeEnc });
  const sEncIzq = E.xf({ b: true, sz: 9, color: "FFFFFF", fill: BORDO, h: "left", indent: 1, bordes: bordeEnc });
  const sSub = E.xf({ b: true, sz: 8, color: "FFFFFF", fill: BORDO, h: "center", wrap: true, bordes: bordeEnc });
  H.alto(FILA_G, 18);
  H.alto(FILA_S, 24);
  COLS.forEach((col, i) => {
    const c = i + 1;
    if (!col.grupo) H.combinar(FILA_G, c, FILA_S, c, col.titulo, col.id === "alumno" ? sEncIzq : sEnc);
  });
  GRUPOS.forEach((g) => {
    const cs = COLS.map((col, i) => (col.grupo === g.id ? i + 1 : 0)).filter(Boolean);
    H.combinar(FILA_G, cs[0], FILA_G, cs[cs.length - 1], g.titulo, sEnc);
  });
  COLS.forEach((col, i) => {
    if (col.grupo) H.poner(FILA_S, i + 1, col.titulo, sSub);
  });

  // --- Alumnos
  const estudiantes = d.estudiantes;
  const celda = (col, banda) => {
    const lados = { l: TENUE, r: TENUE, t: TENUE, b: TENUE };
    const base = { sz: 10, fill: banda, bordes: lados, h: "center" };
    if (col.id === "alumno") return E.xf({ ...base, h: "left", indent: 1, b: false });
    if (col.id === "dni") return E.xf({ ...base, color: GRIS, fmt: 1 });
    if (col.nota) return E.xf({ ...base, b: true });
    return E.xf({ ...base });
  };
  const estilos = COLS.map((col) => celda(col, BANDA[col.grupo]));
  let r = FILA_S + 1;
  const primera = r;
  estudiantes.forEach((e) => {
    const v = valoresFila(e);
    const fila = [v[0], v[1], aNumero(String(e.dni ?? "").trim()) || "-", ...v.slice(2)];
    fila.forEach((valor, i) => H.poner(r, i + 1, valor === "" ? "-" : valor, estilos[i]));
    H.alto(r, 18);
    r += 1;
  });
  if (estudiantes.length === 0) {
    H.combinar(r, 1, r, ultima, "No hay estudiantes cargados en esta división.", E.xf({ i: true, color: GRIS, indent: 1, bordes: { l: TENUE, r: TENUE, t: TENUE, b: TENUE } }));
    H.alto(r, 22);
    r += 1;
  }
  const ultimaFila = r - 1;

  // --- Firmas
  r += 1;
  H.alto(r, 46);
  r += 1;
  const sFirma = E.xf({ sz: 9, color: GRIS, h: "center", bordes: { t: OSCURO } });
  [[1, 3], [5, 9], [11, ultima]].forEach(([c1, c2], i) => H.combinar(r, c1, r, c2, FIRMAS[i], sFirma));
  H.alto(r, 18);
  const finArea = r;

  // --- XML de la hoja
  const filtro = estudiantes.length ? `<autoFilter ref="A${FILA_S}:${letra(ultima)}${ultimaFila}"/>` : "";
  const cols = COLS.map((c, i) => `<col min="${i + 1}" max="${i + 1}" width="${ANCHO_COL[c.id]}" customWidth="1"/>`).join("");
  const pie = "&amp;L&amp;8E.E.S.T. N.º 1 “Cecilia Berdichevski” · Planilla de calificaciones&amp;R&amp;8Página &amp;P de &amp;N";
  const hoja = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheetPr><tabColor rgb="FF${BORDO}"/><pageSetUpPr fitToPage="1"/></sheetPr><dimension ref="A1:${letra(ultima)}${finArea}"/><sheetViews><sheetView showGridLines="0" workbookViewId="0"><pane ySplit="${FILA_S}" topLeftCell="A${FILA_S + 1}" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A${FILA_S + 1}" sqref="A${FILA_S + 1}"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="15"/><cols>${cols}</cols><sheetData>${H.datos()}</sheetData>${filtro}<mergeCells count="${H.combinadas.length}">${H.combinadas.map((m) => `<mergeCell ref="${m}"/>`).join("")}</mergeCells><printOptions horizontalCentered="1"/><pageMargins left="0.3" right="0.3" top="0.3" bottom="0.4" header="0.15" footer="0.2"/><pageSetup paperSize="${PAPEL_OFICIO}" orientation="portrait" fitToWidth="1" fitToHeight="1"/><headerFooter><oddFooter>${pie}</oddFooter></headerFooter>${logo ? '<drawing r:id="rId1"/>' : ""}</worksheet>`;

  const nombres = `<definedName name="_xlnm._FilterDatabase" localSheetId="0" hidden="1">${HOJA}!$A$${FILA_S}:$${letra(ultima)}$${ultimaFila}</definedName>`;
  const libro = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView/></bookViews><sheets><sheet name="${HOJA}" sheetId="1" r:id="rId1"/></sheets><definedNames>${estudiantes.length ? nombres : ""}<definedName name="_xlnm.Print_Area" localSheetId="0">${HOJA}!$A$1:$${letra(ultima)}$${finArea}</definedName><definedName name="_xlnm.Print_Titles" localSheetId="0">${HOJA}!$${FILA_G}:$${FILA_S}</definedName></definedNames></workbook>`;

  const REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
  const archivos = [
    { nombre: "[Content_Types].xml", datos: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="jpeg" ContentType="image/jpeg"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${logo ? '<Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>' : ""}</Types>` },
    { nombre: "_rels/.rels", datos: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${REL}/officeDocument" Target="xl/workbook.xml"/></Relationships>` },
    { nombre: "xl/workbook.xml", datos: libro },
    { nombre: "xl/_rels/workbook.xml.rels", datos: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${REL}/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="${REL}/styles" Target="styles.xml"/></Relationships>` },
    { nombre: "xl/styles.xml", datos: E.xml() },
    { nombre: "xl/worksheets/sheet1.xml", datos: hoja }
  ];
  if (logo) {
    const px = 9525;
    archivos.push(
      { nombre: "xl/worksheets/_rels/sheet1.xml.rels", datos: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${REL}/drawing" Target="../drawings/drawing1.xml"/></Relationships>` },
      { nombre: "xl/drawings/drawing1.xml", datos: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><xdr:oneCellAnchor><xdr:from><xdr:col>0</xdr:col><xdr:colOff>${4 * px}</xdr:colOff><xdr:row>0</xdr:row><xdr:rowOff>${8 * px}</xdr:rowOff></xdr:from><xdr:ext cx="${60 * px}" cy="${60 * px}"/><xdr:pic><xdr:nvPicPr><xdr:cNvPr id="2" name="Logo" descr="Logo de la E.E.S.T. N.º 1"/><xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr></xdr:nvPicPr><xdr:blipFill><a:blip xmlns:r="${REL}" r:embed="rId1"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill><xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${60 * px}" cy="${60 * px}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic><xdr:clientData/></xdr:oneCellAnchor></xdr:wsDr>` },
      { nombre: "xl/drawings/_rels/drawing1.xml.rels", datos: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${REL}/image" Target="../media/logo.jpeg"/></Relationships>` },
      { nombre: "xl/media/logo.jpeg", datos: Uint8Array.from(logo.sobreBlanco, (ch) => ch.charCodeAt(0)) }
    );
  }
  return crearZip(archivos);
}

export async function descargarPlanillaXlsx(datos) {
  const logo = await cargarLogo();
  const bytes = generarPlanillaXlsx(datos, logo);
  const blob = new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombreArchivoPlanilla(datos, "xlsx");
  document.body.append(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
