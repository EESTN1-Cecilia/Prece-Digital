/* Generador de PDF sin dependencias externas.

   Escribe un PDF 1.4 con las fuentes base-14 (Helvetica y derivadas), que
   cualquier lector de PDF trae de serie: no hace falta incrustar fuentes ni
   agregar dependencias al proyecto.

   Alcance:
   - paginas A4 con contenido en texto latino (WinAnsiEncoding);
   - texto con negrita, cursiva y subrayado;
   - lineas, rectangulos y tablas simples;
   - indices de referencias cruzadas (xref) y trailer validos.

   El caller arma el contenido de cada pagina con `Lienzo` (ver documento-pdf.mjs)
   y lo pasa aca para serializarlo. */

const ANCHOS_REGULAR = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278,
  556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556,
  1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778,
  667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556,
  333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556,
  556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584
];

const ANCHOS_BOLD = [
  278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278,
  556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 333, 333, 584, 584, 584, 611,
  975, 722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778,
  667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333, 278, 333, 584, 556,
  333, 556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611,
  611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584
];

const ANCHO_POR_DEFECTO = 556;

export const FUENTES = {
  regular: { codigo: "F1", base: "Helvetica" },
  negrita: { codigo: "F2", base: "Helvetica-Bold" },
  cursiva: { codigo: "F3", base: "Helvetica-Oblique" },
  negritaCursiva: { codigo: "F4", base: "Helvetica-BoldOblique" }
};

export function fuenteSegun(estilo = {}) {
  if (estilo.negrita && estilo.cursiva) return FUENTES.negritaCursiva;
  if (estilo.negrita) return FUENTES.negrita;
  if (estilo.cursiva) return FUENTES.cursiva;
  return FUENTES.regular;
}

function anchoCaracter(caracter, negrita) {
  const codigo = caracter.charCodeAt(0);

  if (codigo >= 32 && codigo <= 126) {
    const tabla = negrita ? ANCHOS_BOLD : ANCHOS_REGULAR;
    return tabla[codigo - 32];
  }

  return ANCHO_POR_DEFECTO;
}

/* Ancho en puntos de una cadena con un tamano de fuente dado. */
export function anchoTexto(texto, tamano, negrita = false) {
  let total = 0;

  for (const caracter of String(texto ?? "")) {
    total += anchoCaracter(caracter, negrita);
  }

  return (total / 1000) * tamano;
}

/* Corta un texto en lineas que entren en `ancho`. */
export function partirLineas(texto, ancho, tamano, negrita = false) {
  const limpio = String(texto ?? "").replace(/\s+/g, " ").trim();

  if (!limpio) {
    return [""];
  }

  const lineas = [];
  let actual = "";

  for (const palabra of limpio.split(" ")) {
    const tentativa = actual ? `${actual} ${palabra}` : palabra;

    if (anchoTexto(tentativa, tamano, negrita) <= ancho) {
      actual = tentativa;
      continue;
    }

    if (actual) {
      lineas.push(actual);
      actual = "";
    }

    /* Palabra mas larga que la caja: se parte por caracteres. */
    if (anchoTexto(palabra, tamano, negrita) > ancho) {
      let resto = palabra;

      while (resto.length) {
        let corte = resto.length;

        while (corte > 1 && anchoTexto(resto.slice(0, corte), tamano, negrita) > ancho) {
          corte -= 1;
        }

        lineas.push(resto.slice(0, corte));
        resto = resto.slice(corte);
      }

      actual = "";
      continue;
    }

    actual = palabra;
  }

  if (actual) {
    lineas.push(actual);
  }

  return lineas.length ? lineas : [""];
}

export function escaparTextoPdf(texto) {
  return String(texto ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/[\r\n\t]+/g, " ");
}

/* Serializa las paginas (cada una es un flujo de operadores PDF) en un PDF
   valido con su tabla xref. */
export function construirPdf({ paginas, titulo = "Documento", autor = "", asunto = "", creador = "Prece Digital" }) {
  const objetos = [];
  const push = (cuerpo) => {
    objetos.push(cuerpo);
    return objetos.length;
  };

  const idCatalogo = push("<< /Type /Catalog /Pages 2 0 R >>");
  const idPaginas = push("<< /Type /Pages /Kids [] /Count 0 >>");
  const idsFuentes = Object.values(FUENTES).map((fuente) =>
    push(`<< /Type /Font /Subtype /Type1 /BaseFont /${fuente.base} /Encoding /WinAnsiEncoding >>`)
  );

  const idInfo = push("<< /Title () /Author () /Subject () /Creator () /Producer () >>");

  const idsHojas = [];

  for (const flujo of paginas) {
    const contenido = Buffer.from(flujo, "latin1");
    const idContenido = push(
      `<< /Length ${contenido.length} >>\nstream\n${contenido.toString("latin1")}\nendstream`
    );
    const idHoja = push(
      `<< /Type /Page /Parent ${idPaginas} 0 R /MediaBox [0 0 595.28 841.89] ` +
        `/Resources << /Font << ${idsFuentes
          .map((id, indice) => `/${Object.values(FUENTES)[indice].codigo} ${id} 0 R`)
          .join(" ")} >> /ProcSet [/PDF /Text] >> /Contents ${idContenido} 0 R >>`
    );

    idsHojas.push(idHoja);
  }

  objetos[idPaginas - 1] = `<< /Type /Pages /Kids [${idsHojas.map((id) => `${id} 0 R`).join(" ")}] /Count ${idsHojas.length} >>`;
  objetos[idInfo - 1] =
    `<< /Title (${escaparTextoPdf(titulo)}) /Author (${escaparTextoPdf(autor)}) ` +
    `/Subject (${escaparTextoPdf(asunto)}) /Creator (${escaparTextoPdf(creador)}) ` +
    `/Producer (${escaparTextoPdf(creador)}) /CreationDate (D:20260101000000Z) >>`;

  const trozos = [];
  let posicion = 0;
  const agregar = (texto) => {
    const buffer = Buffer.from(texto, "latin1");
    trozos.push(buffer);
    posicion += buffer.length;
  };

  agregar("%PDF-1.4\n");
  agregar("%\xE2\xE3\xCF\xD3\n");

  const posiciones = [0];

  objetos.forEach((cuerpo, indice) => {
    posiciones[indice + 1] = posicion;
    agregar(`${indice + 1} 0 obj\n${cuerpo}\nendobj\n`);
  });

  const inicioXref = posicion;
  const total = objetos.length + 1;
  const referencias = [`xref\n0 ${total}\n`, "0000000000 65535 f \n"];

  for (let indice = 1; indice <= objetos.length; indice += 1) {
    referencias.push(`${String(posiciones[indice]).padStart(10, "0")} 00000 n \n`);
  }

  agregar(referencias.join(""));
  agregar(`trailer\n<< /Size ${total} /Root ${idCatalogo} 0 R /Info ${idInfo} 0 R >>\n`);
  agregar(`startxref\n${inicioXref}\n%%EOF\n`);

  return Buffer.concat(trozos);
}
