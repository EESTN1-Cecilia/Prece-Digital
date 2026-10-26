/* Datos y reglas del modulo de Informes.

   Todo lo que se puede decidir sin navegador vive aca: validacion de los
   metadatos, conversion del contenido enriquecido a texto plano, cuenta de
   palabras y el nombre del archivo exportado. Asi se puede probar sin montar
   la interfaz y las reglas no quedan duplicadas entre la vista y el servicio.

   El backend vuelve a validar todo (el cliente no es la autoridad), pero
   validar aca evita un viaje de ida y vuelta por cada error obvio. */

export const ESTADOS_INFORME = [
  { id: "borrador", nombre: "Borrador" },
  { id: "finalizado", nombre: "Finalizado" }
];

export const CONTENIDO_MAXIMO = 200_000;

export function metadatosVacios() {
  return {
    titulo: "",
    asunto: "",
    dirigidoA: "",
    autor: "",
    autorCargo: "",
    estado: "borrador",
    plantilla: null,
    contenido: ""
  };
}

/* Devuelve `{ errores, datos }`: los errores van por campo (para pintarlos
   debajo del control que corresponde) y `datos` es la version normalizada que
   se envia al backend. */
export function validarMetadatos(metadatos = {}) {
  const errores = {};

  const titulo = String(metadatos.titulo ?? "").trim();
  const asunto = String(metadatos.asunto ?? "").trim();
  const dirigidoA = String(metadatos.dirigidoA ?? "").trim();
  const autor = String(metadatos.autor ?? "").trim();
  const autorCargo = String(metadatos.autorCargo ?? "").trim();
  const estado = metadatos.estado ?? "borrador";
  const contenido = String(metadatos.contenido ?? "");

  if (titulo.length < 3) {
    errores.titulo = "El título debe tener al menos 3 caracteres.";
  }

  if (!ESTADOS_INFORME.some((opcion) => opcion.id === estado)) {
    errores.estado = "El estado debe ser borrador o finalizado.";
  }

  if (contenido.length > CONTENIDO_MAXIMO) {
    errores.contenido = "El contenido del informe es demasiado largo.";
  }

  return {
    errores,
    datos: {
      titulo,
      asunto,
      dirigidoA,
      autor,
      autorCargo,
      estado,
      contenido
    }
  };
}

/* El contenido enriquecido se guarda como HTML: para mostrarlo como resumen
   (historial, lista lateral) hay que quitarle las etiquetas. */
export function textoPlano(html) {
  return String(html ?? "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/(p|div|h[1-6]|li|tr|td|th)>/gi, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function tieneContenido(html) {
  return textoPlano(html).length > 0;
}

export function contarPalabras(html) {
  const texto = textoPlano(html);

  return texto ? texto.split(/\s+/).filter(Boolean).length : 0;
}

/* Nombre del archivo exportado: solo letras y numeros, sin espacios raros ni
   acentos, para que viaje bien en cualquier sistema. */
export function nombreDeArchivo(titulo) {
  const limpio = String(titulo ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\-_ ]/gu, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

  return limpio || "informe";
}

/* Busca una plantilla del catalogo por su identificador. */
export function plantillaPorId(plantillas = [], id) {
  if (!id) {
    return null;
  }

  return plantillas.find((plantilla) => plantilla.id === id) ?? null;
}

/* Fecha corta para el historial: no depende de la configuracion regional de la
   maquina que corre el navegador. */
export function fechaCorta(iso) {
  if (!iso) {
    return "—";
  }

  const fecha = new Date(iso);

  if (Number.isNaN(fecha.getTime())) {
    return "—";
  }

  const dia = String(fecha.getDate()).padStart(2, "0");
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");

  return `${dia}/${mes}/${fecha.getFullYear()}`;
}

/* Estado listo para pintar: el texto siempre dice de que se trata. */
export function etiquetaEstado(estado) {
  return ESTADOS_INFORME.find((opcion) => opcion.id === estado)?.nombre ?? "Borrador";
}

/* Escapa texto para embeberlo en HTML. */
export function escaparHtml(texto) {
  return String(texto ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/* Apartados que arrancan con una tabla de tres columnas para cargar
   indicadores. Coincide con lo que arma el backend (plantillas.mjs). */
const SECCIONES_CON_TABLA = new Set(["resultados", "detalle", "distribucion"]);

const TABLA_INDICADORES =
  "<table><thead><tr><th>División</th><th>Indicador</th><th>Detalle</th></tr></thead>" +
  "<tbody><tr><td></td><td></td><td></td></tr></tbody></table>";

/* Esqueleto de una plantilla institucional: los apartados con su guia de
   contenido, listo para que el usuario lo complete en el editor.

   El backend arma el mismo esqueleto cuando se crea un informe desde una
   plantilla; aca se replica para no obligar a guardar un informe vacio solo
   para ver la estructura. */
export function contenidoDePlantilla(plantilla) {
  const secciones = Array.isArray(plantilla?.secciones) ? plantilla.secciones : [];

  if (!secciones.length) {
    return "";
  }

  return secciones
    .map((seccion) => {
      const titulo = `<h2>${escaparHtml(seccion?.titulo)}</h2>`;
      const guia = `<p>${escaparHtml(seccion?.ayuda)}</p>`;

      if (SECCIONES_CON_TABLA.has(seccion?.clave)) {
        return `${titulo}${guia}${TABLA_INDICADORES}`;
      }

      return `${titulo}${guia}`;
    })
    .join("");
}

/* ==========================================================================
   SANEADO DEL CONTENIDO ENRICOECIDO
   ==========================================================================

   El contenido del informe es HTML producido por el editor. Antes de
   insertarlo en la pagina (vista previa) se lo pasa por una lista blanca:
   se permiten solo las etiquetas de formato y se descarta cualquier cosa que
   pueda ejecutarse.

   El backend sanea otra vez al guardar (Backend/modules/reports/
   sanitizar-html.mjs) y es la autoridad: aca esta es la segunda barrera, para
   que la vista previa nunca muestre algo que el navegador pueda ejecutar. */

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

function escaparTextoSaneado(texto) {
  return texto
    .replace(/&(?!(?:[a-zA-Z]+|#\d+|#x[0-9a-fA-F]+);)/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/* Solo se aceptan esquemas seguros en los enlaces. */
function hrefSeguro(valor) {
  const limpio = String(valor ?? "").trim();

  if (!limpio) {
    return null;
  }

  return /^(https?:|mailto:)/i.test(limpio) ? limpio : null;
}

function atributosPermitidos(etiqueta, atributos) {
  const permitidos = [];

  for (const [nombre, valor] of Object.entries(atributos)) {
    const clave = nombre.toLowerCase();

    if (etiqueta === "a" && clave === "href") {
      const href = hrefSeguro(valor);

      if (href) {
        permitidos.push(`href="${escaparHtml(href)}"`);
      }

      continue;
    }

    if ((etiqueta === "td" || etiqueta === "th") && (clave === "colspan" || clave === "rowspan")) {
      const numero = Number.parseInt(valor, 10);

      if (Number.isInteger(numero) && numero > 0 && numero <= 20) {
        permitidos.push(`${clave}="${numero}"`);
      }
    }
  }

  return permitidos;
}

function parsearAtributos(texto) {
  const atributos = {};
  const patron = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+))/g;
  let coincidencia = patron.exec(texto);

  while (coincidencia) {
    atributos[coincidencia[1]] = coincidencia[3] ?? coincidencia[4] ?? coincidencia[5] ?? "";
    coincidencia = patron.exec(texto);
  }

  return atributos;
}

/* Devuelve el HTML con solo las etiquetas permitidas y sin atributos
   peligrosos. Es la unica forma de insertar contenido de usuario. */
export function saneaHtml(html) {
  const entrada = String(html ?? "");
  const salida = [];
  const pila = [];
  const patron = /<\/?([a-zA-Z][a-zA-Z0-9]*)((?:"[^"]*"|'[^']*'|[^>])*)>|([^<]+)/g;
  let bloqueable = null;
  let coincidencia = patron.exec(entrada);

  while (coincidencia) {
    const [crudo, etiquetaCruda, atributosCrudos, texto] = coincidencia;

    if (texto !== undefined) {
      if (!bloqueable) {
        salida.push(escaparTextoSaneado(texto));
      }

      coincidencia = patron.exec(entrada);
      continue;
    }

    const nombre = etiquetaCruda.toLowerCase();

    if (bloqueable) {
      /* Dentro de un bloque no permitido se descarta todo hasta su cierre. */
      if (crudo.startsWith("</") && nombre === bloqueable) {
        bloqueable = null;
      }

      coincidencia = patron.exec(entrada);
      continue;
    }

    if (ETIQUETAS_BLOQUEABLES.has(nombre)) {
      if (!crudo.startsWith("</")) {
        bloqueable = nombre;
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
        salida.push(`</${pila.pop()}>`);
      }

      coincidencia = patron.exec(entrada);
      continue;
    }

    if (pila.includes(nombre)) {
      /* Etiqueta repetida sin cerrar: se cierra la anterior antes de abrirla
         de nuevo para no generar HTML invalido. */
      const indice = pila.lastIndexOf(nombre);

      while (pila.length > indice) {
        salida.push(`</${pila.pop()}>`);
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
