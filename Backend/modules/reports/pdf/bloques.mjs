/* Convierte el HTML enriquecido de un informe en bloques de contenido.

   El editor del frontend guarda HTML. Para exportarlo a PDF hace falta una
   estructura con tipo de bloque (titulo, parrafo, lista, tabla...), porque el
   PDF no entiende de etiquetas: entiende de parrafos, sangrias y celdas.

   Se recorre el HTML ya saneado (ver sanitizar-html.mjs), asi que solo hay
   que interpreta las etiquetas permitidas. */

const ETIQUETAS_TITULO = new Set(["h1", "h2", "h3", "h4", "h5", "h6"]);

function estiloInicial() {
  return { negrita: false, cursiva: false, subrayado: false };
}

export function parsearBloques(html) {
  const bloques = [];
  const pila = [];
  const patron = /<\/?([a-zA-Z][a-zA-Z0-9]*)((?:"[^"]*"|'[^']*'|[^>])*)>|([^<]+)/g;
  let coincidencia = patron.exec(html ?? "");
  let estilo = estiloInicial();
  let runs = [];
  let tabla = null;
  let fila = null;
  let celda = null;
  let lista = null;

  const textoDeRuns = () => runs.map((run) => run.texto).join("");

  const cerrarLista = () => {
    if (lista) {
      bloques.push(lista);
      lista = null;
    }
  };

  const cerrarTabla = () => {
    if (tabla) {
      bloques.push(tabla);
      tabla = null;
      fila = null;
      celda = null;
    }
  };

  const cerrarBloque = (tipo, extra = {}) => {
    const texto = textoDeRuns().trim();

    if (!texto) {
      runs = [];
      return;
    }

    bloques.push({ tipo, runs: runs.map((run) => ({ ...run })), ...extra });
    runs = [];
  };

  while (coincidencia) {
    const [crudo, etiqueta, , texto] = coincidencia;

    if (texto !== undefined) {
      const valor = texto.replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">");

      if (valor.trim() || (valor.length && celda)) {
        if (celda) {
          celda.texto += valor;
        } else {
          runs.push({ texto: valor, ...estilo });
        }
      }

      coincidencia = patron.exec(html ?? "");
      continue;
    }

    const nombre = etiqueta.toLowerCase();
    const cierre = crudo.startsWith("</");

    if (!cierre) {
      if (nombre === "table") {
        cerrarTabla();
        cerrarLista();
        tabla = { tipo: "tabla", filas: [] };
      } else if (nombre === "tr") {
        fila = [];
      } else if (nombre === "td" || nombre === "th") {
        celda = { texto: "", encabezado: nombre === "th" };
      } else if (nombre === "ul" || nombre === "ol") {
        cerrarLista();
        lista = { tipo: "lista", ordenada: nombre === "ol", items: [] };
      } else if (nombre === "li") {
        runs = [];
      } else if (nombre === "strong" || nombre === "b") {
        estilo.negrita = true;
      } else if (nombre === "em" || nombre === "i") {
        estilo.cursiva = true;
      } else if (nombre === "u") {
        estilo.subrayado = true;
      } else if (nombre === "p" || ETIQUETAS_TITULO.has(nombre)) {
        cerrarLista();
      } else if (nombre === "blockquote") {
        cerrarLista();
      } else if (nombre === "hr") {
        cerrarLista();
        bloques.push({ tipo: "separador" });
      }
    } else {
      if (nombre === "table") {
        cerrarTabla();
      } else if (nombre === "tr") {
        if (tabla && fila) {
          tabla.filas.push(fila);
        }
        fila = null;
        celda = null;
      } else if (nombre === "td" || nombre === "th") {
        if (fila && celda) {
          fila.push(celda);
        }
        celda = null;
      } else if (nombre === "ul" || nombre === "ol") {
        cerrarLista();
      } else if (nombre === "li") {
        const texto = textoDeRuns().trim();
        if (lista && texto) {
          lista.items.push(runs.map((run) => ({ ...run })));
        }
        runs = [];
      } else if (nombre === "strong" || nombre === "b") {
        estilo.negrita = false;
      } else if (nombre === "em" || nombre === "i") {
        estilo.cursiva = false;
      } else if (nombre === "u") {
        estilo.subrayado = false;
      } else if (nombre === "p") {
        cerrarBloque("parrafo");
      } else if (ETIQUETAS_TITULO.has(nombre)) {
        cerrarBloque("titulo", { nivel: Number.parseInt(nombre.slice(1), 10) || 1 });
      } else if (nombre === "blockquote") {
        cerrarBloque("cita");
      } else if (nombre === "div") {
        cerrarBloque("parrafo");
      }
    }

    pila.push(nombre);
    coincidencia = patron.exec(html ?? "");
  }

  if (textoDeRuns().trim()) {
    cerrarBloque("parrafo");
  }

  cerrarLista();
  cerrarTabla();

  return bloques;
}
