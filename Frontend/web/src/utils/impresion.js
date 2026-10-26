/* Impresion de documentos institucionales en hoja Oficio horizontal.

   Un documento imprimible es un elemento con la clase `documento-oficio`
   (planilla de asistencia, lista de alumnos). Antes de imprimir:
   1. Se agrega `modo-impresion` a <html>: las reglas de styles/base/impresion.css
      ocultan todo lo que no es el documento (menus, encabezados, botones) y
      le dan el ancho util de la hoja.
   2. Se fija el tamano de pagina Oficio (340 x 216 mm) con una regla @page
      agregada al final, para que gane sobre las @page de otros documentos
      (boletin y matriz usan A4 vertical). Se quita al terminar.
   3. Se calcula una escala para que el documento entre en una sola hoja, sin
      bajar de ESCALA_MINIMA: si no alcanza, se imprime en mas de una hoja y el
      documento lo avisa (data-varias-hojas), en lugar de achicar hasta que no
      se lea o de cortar datos.
   4. Los documentos con data-ajuste="hoja" (las planillas) que sobran se
      estiran hasta ocupar toda la hoja: conservan el ancho completo (las
      columnas de dias no se angostan) y crecen en alto, primero con letra mas
      grande (hasta LETRAS_AMPLIADAS[0]) y despues con mas aire entre filas.

   Funciona igual con el boton "Imprimir" y con Ctrl+P (eventos beforeprint /
   afterprint). Nada de esto toca los datos: solo la presentacion. */

/* Margen general de 1 cm en todo el contorno. */
export const PAPEL_OFICIO = { anchoMm: 340, altoMm: 216, margenMm: 10 };
export const ESCALA_MINIMA = 0.8;
/* Tamanos de letra que se prueban al ampliar, del mayor al menor. */
export const LETRAS_AMPLIADAS = [10.5, 10, 9.5, 9];

const PX_POR_MM = 96 / 25.4;
const ID_ESTILO_PAGINA = "estilo-pagina-oficio";

export function areaUtilMm(papel = PAPEL_OFICIO) {
  return { ancho: papel.anchoMm - papel.margenMm * 2, alto: papel.altoMm - papel.margenMm * 2 };
}

/* Escala que hace entrar un contenido de `altoPx` en `altoUtilPx`: nunca
   baja de `minima` y nunca supera `maxima` (1 = no agrandar). */
export function escalaParaPagina(altoPx, altoUtilPx, minima = ESCALA_MINIMA, maxima = 1) {
  if (!altoPx) {
    return 1;
  }

  const justa = Math.floor((altoUtilPx / altoPx) * 1000) / 1000;
  return Math.min(Math.max(justa, minima), Math.max(maxima, 1));
}

/* Relleno extra (px, arriba y abajo) para repartir `librePx` entre `filas`. */
export function rellenoPorFila(librePx, filas) {
  if (!filas || librePx <= 0) {
    return 0;
  }

  return Math.floor((librePx / filas / 2) * 100) / 100;
}

export function reglaPagina(papel = PAPEL_OFICIO) {
  return `@page { size: ${papel.anchoMm}mm ${papel.altoMm}mm; margin: ${papel.margenMm}mm; }`;
}

/* Estira una planilla que sobra en la hoja, sin tocar su ancho. */
function rellenarHoja(documento, altoUtilPx) {
  /* Solo las filas de la tabla principal (no las de los cuadros de balance). */
  const filas = documento.querySelector("table")?.querySelectorAll("tbody tr").length ?? 0;

  for (const letra of LETRAS_AMPLIADAS) {
    documento.style.setProperty("--impresion-letra", `${letra}px`);
    if (documento.offsetHeight <= altoUtilPx) break;
  }

  if (documento.offsetHeight > altoUtilPx) {
    documento.style.removeProperty("--impresion-letra");
    return;
  }

  /* Algunas filas (titulos de seccion) no crecen: unas pasadas mas reparten
     lo que quede libre. */
  let relleno = 0;
  for (let pasada = 0; pasada < 4; pasada += 1) {
    const libre = altoUtilPx - documento.offsetHeight - 2;
    if (libre < 2) break;
    relleno = Math.round((relleno + rellenoPorFila(libre, filas)) * 100) / 100;
    documento.style.setProperty("--impresion-relleno-extra", `${relleno}px`);
  }

  /* Los bordes y el redondeo pueden sumar algun pixel: se recorta lo justo. */
  while (documento.offsetHeight > altoUtilPx && relleno > 0) {
    relleno = Math.max(0, Math.round((relleno - 0.2) * 100) / 100);
    documento.style.setProperty("--impresion-relleno-extra", `${relleno}px`);
  }
}

function ajustarDocumento(documento, util) {
  const altoUtilPx = util.alto * PX_POR_MM;
  let escala = 1;

  /* El ancho depende de la escala (a menor escala, mas ancho disponible) y el
     alto depende del ancho: unas pocas pasadas alcanzan para estabilizarlo. */
  for (let pasada = 0; pasada < 4; pasada += 1) {
    documento.style.zoom = "";
    documento.style.width = `${util.ancho / escala}mm`;
    const alto = documento.offsetHeight;
    const siguiente = escalaParaPagina(alto, altoUtilPx, ESCALA_MINIMA);

    if (Math.abs(siguiente - escala) < 0.005) {
      break;
    }

    escala = siguiente;
  }

  /* Ajuste fino: al cambiar el ancho la altura tambien cambia; si quedo
     apenas pasado, se baja de a 0,01 hasta entrar (o hasta el minimo).
     offsetHeight no incluye el zoom propio: se compara la altura escalada. */
  const altoEscalado = () => {
    documento.style.zoom = "";
    documento.style.width = `${util.ancho / escala}mm`;
    return documento.offsetHeight * escala;
  };

  while (altoEscalado() > altoUtilPx + 1 && escala > ESCALA_MINIMA) {
    escala = Math.max(ESCALA_MINIMA, Math.round((escala - 0.01) * 1000) / 1000);
  }

  const entra = altoEscalado() <= altoUtilPx + 1;
  documento.style.zoom = String(escala);

  if (escala === 1 && documento.dataset.ajuste === "hoja") {
    rellenarHoja(documento, altoUtilPx);
  }

  documento.toggleAttribute("data-varias-hojas", !entra);
  return { escala, entra };
}

export function prepararImpresion(raiz = document) {
  const documentos = [...raiz.querySelectorAll(".documento-oficio")];

  if (!documentos.length) {
    return [];
  }

  raiz.documentElement.classList.add("modo-impresion");

  if (!raiz.getElementById(ID_ESTILO_PAGINA)) {
    const estilo = raiz.createElement("style");
    estilo.id = ID_ESTILO_PAGINA;
    estilo.textContent = reglaPagina();
    raiz.head.appendChild(estilo);
  }

  const util = areaUtilMm();
  return documentos.map((documento) => ajustarDocumento(documento, util));
}

export function restaurarImpresion(raiz = document) {
  raiz.documentElement.classList.remove("modo-impresion");
  raiz.getElementById(ID_ESTILO_PAGINA)?.remove();

  for (const documento of raiz.querySelectorAll(".documento-oficio")) {
    documento.style.zoom = "";
    documento.style.width = "";
    documento.style.removeProperty("--impresion-letra");
    documento.style.removeProperty("--impresion-relleno-extra");
    documento.removeAttribute("data-varias-hojas");
  }
}

/* Se instala una vez al iniciar la aplicacion. */
export function instalarImpresion(ventana = window) {
  ventana.addEventListener("beforeprint", () => prepararImpresion(ventana.document));
  ventana.addEventListener("afterprint", () => restaurarImpresion(ventana.document));
}

export function imprimirDocumento() {
  window.print();
}
