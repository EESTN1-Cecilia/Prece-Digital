/* Utilidades compartidas por los PDF sin librerias (boletin y planilla): metricas
   Helvetica, texto WinAnsi y logo institucional. */

/* Anchos de Helvetica (por mil) para ASCII 32..126; las letras acentuadas usan el de su base. */
const ANCHOS = [278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584];
const BASE = { á: "a", é: "e", í: "i", ó: "o", ú: "u", ñ: "n", ü: "u", Á: "A", É: "E", Í: "I", Ó: "O", Ú: "U", Ñ: "N", Ü: "U" };

export function ancho(texto, tamano, negrita = false) {
  let total = 0;
  for (const letra of String(texto)) {
    const c = (BASE[letra] ?? letra).charCodeAt(0);
    total += c >= 32 && c <= 126 ? ANCHOS[c - 32] : 556;
  }
  return (total * tamano * (negrita ? 1.07 : 1)) / 1000;
}

/* Texto -> bytes WinAnsi escapados para un string PDF. */
const WINANSI = { "—": 0x97, "–": 0x96, "•": 0x95, "’": 0x92, "‘": 0x91, "“": 0x93, "”": 0x94, "…": 0x85 };
export function cadena(texto) {
  let salida = "";
  for (const letra of String(texto)) {
    let codigo = WINANSI[letra] ?? letra.charCodeAt(0);
    if (codigo > 255) codigo = 63;
    const caracter = String.fromCharCode(codigo);
    salida += caracter === "\\" || caracter === "(" || caracter === ")" ? `\\${caracter}` : caracter;
  }
  return salida;
}

export async function cargarLogo() {
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
