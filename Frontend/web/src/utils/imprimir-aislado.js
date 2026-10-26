/* Impresion aislada de documentos largos (boletines de todo un curso).

   Imprimir la pagina entera obliga a Chrome a componer en cada hoja la
   aplicacion completa (fondo fijo con patron, filtros de desenfoque, menus) y
   solo ocultarla con CSS: con muchas hojas la vista previa se traba y el PDF
   guardado queda corrupto. Aca se copia solo el documento a un iframe oculto,
   con sus propias reglas de estilo, y se imprime ese iframe. La pagina de la
   aplicacion no se toca.

   Las partes puras (documentoDeImpresion, reglasQueCoinciden) se prueban con
   node --test (imprimir-aislado.test.mjs). */

/* Textos de reglas CSS (cssText) que nombran alguno de los fragmentos de
   selector. Las reglas @media / @page de otras hojas no se copian. */
export function reglasQueCoinciden(textosDeReglas = [], fragmentos = []) {
  return textosDeReglas.filter((texto) => !texto.startsWith("@") && fragmentos.some((fragmento) => texto.includes(fragmento)));
}

function escaparHtml(texto) {
  return String(texto ?? "").replace(/[&<>"]/g, (letra) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[letra]);
}

export function documentoDeImpresion({ titulo = "Documento", base = "/", estilos = "", html = "", hojasExternas = [] }) {
  const enlaces = hojasExternas.map((href) => `<link rel="stylesheet" href="${escaparHtml(href)}">`).join("");
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><base href="${escaparHtml(base)}"><title>${escaparHtml(titulo)}</title>${enlaces}<style>${estilos}</style></head><body>${html}</body></html>`;
}

function textosDeReglasDeLaPagina() {
  const textos = [];

  for (const hoja of Array.from(document.styleSheets)) {
    let reglas;
    try {
      reglas = hoja.cssRules;
    } catch {
      continue;
    }

    const recorrer = (lista) => {
      for (const regla of Array.from(lista ?? [])) {
        /* Las hojas importadas (@import de global.css) se recorren por dentro. */
        if (regla.styleSheet) {
          try {
            recorrer(regla.styleSheet.cssRules);
          } catch {
            /* hoja de otro origen: se ignora */
          }
        } else {
          textos.push(regla.cssText);
        }
      }
    };

    recorrer(reglas);
  }

  return textos;
}

function esperarImagenes(documento, limiteMs = 4000) {
  const pendientes = Array.from(documento.images).filter((imagen) => !imagen.complete);
  if (!pendientes.length) return Promise.resolve();

  return Promise.race([
    Promise.all(pendientes.map((imagen) => new Promise((listo) => {
      imagen.addEventListener("load", listo, { once: true });
      imagen.addEventListener("error", listo, { once: true });
    }))),
    new Promise((listo) => setTimeout(listo, limiteMs))
  ]);
}

/* Hojas de fuentes web de la pagina (tipografia institucional). */
function hojasDeFuentes() {
  return Array.from(document.querySelectorAll("link[rel=\"stylesheet\"]"))
    .map((enlace) => enlace.href)
    .filter((href) => href.includes("fonts.googleapis.com"));
}

/* Imprime `contenido` (elemento del DOM) en un iframe oculto.
   `fragmentos`: selectores cuyas reglas se copian de las hojas de la pagina.
   `estilosImpresion`: CSS propio del documento impreso (@page, hojas).
   `ajustar(documento)`: ultimo retoque con el documento ya maquetado (por
   ejemplo, escalar cada pieza para que entre en su hoja). */
export async function imprimirAislado({ contenido, titulo, fragmentos = [], estilosImpresion = "", ajustar = null }) {
  if (!contenido) return;

  const marco = document.createElement("iframe");
  marco.setAttribute("aria-hidden", "true");
  marco.setAttribute("tabindex", "-1");
  Object.assign(marco.style, { position: "fixed", right: "0", bottom: "0", width: "0", height: "0", border: "0", visibility: "hidden" });
  document.body.appendChild(marco);

  const estilos = [...reglasQueCoinciden(textosDeReglasDeLaPagina(), fragmentos), estilosImpresion].join("\n");
  const documento = marco.contentDocument;
  documento.open();
  documento.write(documentoDeImpresion({ titulo, base: `${window.location.origin}/`, estilos, html: contenido.outerHTML, hojasExternas: hojasDeFuentes() }));
  documento.close();

  await esperarImagenes(documento);
  await Promise.race([documento.fonts?.ready ?? Promise.resolve(), new Promise((listo) => setTimeout(listo, 3000))]);
  ajustar?.(documento);

  const quitar = () => setTimeout(() => marco.remove(), 0);
  marco.contentWindow.addEventListener("afterprint", quitar, { once: true });
  /* Respaldo por si el navegador no avisa el fin de la impresion. */
  setTimeout(() => marco.isConnected && marco.remove(), 10 * 60 * 1000);

  marco.contentWindow.focus();
  marco.contentWindow.print();
}
