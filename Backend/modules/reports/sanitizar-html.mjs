/* Saneado del contenido enriquecido de los informes.

   El editor del frontend produce HTML (contentEditable). Ese HTML se guarda y
   despues se vuelve a mostrar, asi que tiene que pasar por una lista blanca:
   se permiten solo las etiquetas de formato, se descartan los atributos que
   no hacen falta y se elimina cualquier script.

   Reglas:
   - Etiquetas permitidas: estructura de documento, formato de texto y tablas.
   - Atributos permitidos: solo `href` (http/https/mailto) en enlaces y
     `colspan`/`rowspan` numericos en celdas. Todo lo demas (style, class,
     on*, src...) se descarta.
   - Los bloques de codigo ejecutable (script, style, iframe, object...) se
     eliminan junto con su contenido. */

const ETIQUETAS_PERMITIDAS = new Set([
  "p",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "ul",
  "ol",
  "li",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "strike",
  "sub",
  "sup",
  "br",
  "hr",
  "blockquote",
  "div",
  "span",
  "table",
  "thead",
  "tbody",
  "tfoot",
  "tr",
  "th",
  "td",
  "a",
  "code",
  "pre",
  "figure",
  "figcaption"
]);

/* Etiquetas cuyo contenido tambien se descarta. */
const ETIQUETAS_BLOQUEABLES = new Set([
  "script",
  "style",
  "iframe",
  "object",
  "embed",
  "applet",
  "noscript",
  "template",
  "svg",
  "math",
  "form",
  "input",
  "button",
  "select",
  "textarea"
]);

const ETIQUETAS_VACIAS = new Set(["br", "hr"]);

const ETIQUETAS_SIN_CIERRE = new Set([
  "br",
  "hr",
  "img",
  "input",
  "meta",
  "link",
  "source"
]);

function escaparTexto(texto) {
  return texto
    .replace(/&(?!(?:[a-zA-Z]+|#\d+|#x[0-9a-fA-F]+);)/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escaparAtributo(valor) {
  return String(valor).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/* Solo se aceptan esquemas seguros: un href con "javascript:" no se guarda. */
function hrefSeguro(valor) {
  const limpio = String(valor ?? "").trim();

  if (!limpio) {
    return null;
  }

  if (/^(https?:|mailto:)/i.test(limpio)) {
    return limpio;
  }

  return null;
}

function atributosPermitidos(etiqueta, atributos) {
  const permitidos = [];

  for (const [nombre, valor] of Object.entries(atributos ?? {})) {
    const clave = nombre.toLowerCase();

    if (etiqueta === "a" && clave === "href") {
      const href = hrefSeguro(valor);
      if (href) {
        permitidos.push(`href="${escaparAtributo(href)}"`);
      }
      continue;
    }

    if ((etiqueta === "td" || etiqueta === "th") && (clave === "colspan" || clave === "rowspan")) {
      const numero = Number.parseInt(valor, 10);
      if (Number.isInteger(numero) && numero > 0 && numero <= 20) {
        permitidos.push(`${clave}="${numero}"`);
      }
      continue;
    }
  }

  return permitidos;
}

function parsearAtributos(texto) {
  const atributos = {};
  const patron = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+))/g;
  let coincidencia = patron.exec(texto);

  while (coincidencia) {
    const valor = coincidencia[3] ?? coincidencia[4] ?? coincidencia[5] ?? "";
    atributos[coincidencia[1]] = valor;
    coincidencia = patron.exec(texto);
  }

  return atributos;
}

/* Devuelve el HTML con solo las etiquetas permitidas y sin atributos
   peligrosos. Es la unica forma de guardar contenido de usuario. */
export function sanitizarHtml(html) {
  const entrada = String(html ?? "");
  const salida = [];
  const pila = [];
  const patron = /<\/?([a-zA-Z][a-zA-Z0-9]*)((?:"[^"]*"|'[^']*'|[^>])*)>|([^<]+)/g;
  let bloqueables = 0;
  let coincidencia = patron.exec(entrada);

  while (coincidencia) {
    const [crudo, etiquetaCruda, atributosCrudos, texto] = coincidencia;

    if (texto !== undefined) {
      if (!bloqueables) {
        salida.push(escaparTexto(texto));
      }
      coincidencia = patron.exec(entrada);
      continue;
    }

    const nombre = etiquetaCruda.toLowerCase();

    if (bloqueables) {
      /* Dentro de un bloque no permitido (script, style...) se descarta todo
         hasta que se cierre la etiqueta. */
      if (crudo.startsWith("</") && nombre === bloqueables.nombre) {
        bloqueables = 0;
      }
      coincidencia = patron.exec(entrada);
      continue;
    }

    if (ETIQUETAS_BLOQUEABLES.has(nombre)) {
      if (!crudo.startsWith("</")) {
        bloqueables = { nombre };
      }
      coincidencia = patron.exec(entrada);
      continue;
    }

    if (!ETIQUETAS_PERMITIDAS.has(nombre)) {
      coincidencia = patron.exec(entrada);
      continue;
    }

    if (crudo.startsWith("</")) {
      const indice = pila.lastIndexOf(nombre);

      if (indice === -1) {
        coincidencia = patron.exec(entrada);
        continue;
      }

      /* Cierra las etiquetas que quedaron abiertas dentro de esta. */
      while (pila.length > indice) {
        const abierta = pila.pop();
        salida.push(`</${abierta}>`);
      }

      coincidencia = patron.exec(entrada);
      continue;
    }

    if (pila.includes(nombre)) {
      /* Etiqueta repetida sin cerrar: se cierra la anterior antes de abrirla
         de nuevo para no generar HTML invalido. */
      const indice = pila.lastIndexOf(nombre);
      while (pila.length > indice) {
        const abierta = pila.pop();
        salida.push(`</${abierta}>`);
      }
    }

    const atributos = atributosPermitidos(nombre, parsearAtributos(atributosCrudos));
    const atributosTexto = atributos.length ? ` ${atributos.join(" ")}` : "";

    if (ETIQUETAS_VACIAS.has(nombre)) {
      salida.push(`<${nombre}${atributosTexto} />`);
    } else {
      salida.push(`<${nombre}${atributosTexto}>`);
      pila.push(nombre);
    }

    coincidencia = patron.exec(entrada);
  }

  while (pila.length) {
    salida.push(`</${pila.pop()}>`);
  }

  return salida.join("");
}

/* Version en texto plano: se usa para la vista previa resumida, para el
   historial y para el PDF cuando el contenido es solo texto. */
export function textoPlano(html) {
  return String(html ?? "")
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/\s*(p|div|h1|h2|h3|h4|h5|h6|li|tr|blockquote)\s*>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
