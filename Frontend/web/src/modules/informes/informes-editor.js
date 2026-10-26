/* Editor de contenido enriquecido del informe.

   El editor es una zona `contentEditable` con una barra de formato de dos
   filas: la primera para el formato del texto y la segunda para los bloques
   (titulos, listas, tablas, separadores) y las acciones deshacer/rehacer.

   Las acciones de la barra son reales: modifican el texto seleccionado en el
   momento de apretarlas. Se usan los comandos de edicion del navegador
   (`document.execCommand`) porque funcionan en todos los navegadores y no
   obligan a sumar una libreria de editor al proyecto.

   El contenido se guarda como HTML. El backend lo vuelve a sanear con una
   lista blanca antes de persistirlo; aca solo se evita pegar codigo ejecutable
   para que la vista previa nunca lo muestre. */

import React, { useEffect, useRef } from "react";
import { h } from "../../layouts/site-layout.js";

/* El saneado del contenido vive en el modulo de datos (es logica pura y se
   puede probar sin navegador) y se reexporta aca porque la vista previa lo
   pide junto con el editor. */
export { saneaHtml } from "./informes-datos.js";

/* Tabla de 3x3 para comparar indicadores por division. */
const TABLA_3X3 =
  "<table><thead><tr><th>&nbsp;</th><th>&nbsp;</th><th>&nbsp;</th></tr></thead>" +
  "<tbody><tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>" +
  "<tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr></tbody></table><p><br></p>";

/* Iconos de la barra: SVG en linea, sin emojis ni caracteres decorativos. */
function Icono({ children, className = "informes-barra__icono" }) {
  return h(
    "svg",
    {
      className,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "1.8",
      strokeLinecap: "round",
      strokeLinejoin: "round",
      "aria-hidden": "true",
      focusable: "false"
    },
    children
  );
}

const IconoAlineacion = {
  izquierda: h(Icono, null, h("path", { d: "M4 6h16M4 12h10M4 18h13" })),
  centro: h(Icono, null, h("path", { d: "M4 6h16M7 12h10M5.5 18h13" })),
  derecha: h(Icono, null, h("path", { d: "M4 6h16M10 12h10M7 18h13" })),
  justificar: h(Icono, null, h("path", { d: "M4 6h16M4 12h16M4 18h16" }))
};

const IconoVinetas = h(
  Icono,
  null,
  h("path", { d: "M9 6h11M9 12h11M9 18h11" }),
  h("circle", { cx: "4.5", cy: "6", r: "1.2", fill: "currentColor", stroke: "none" }),
  h("circle", { cx: "4.5", cy: "12", r: "1.2", fill: "currentColor", stroke: "none" }),
  h("circle", { cx: "4.5", cy: "18", r: "1.2", fill: "currentColor", stroke: "none" })
);

const IconoNumeracion = h(
  Icono,
  null,
  h("path", { d: "M9 6h11M9 12h11M9 18h11" }),
  h("path", { d: "M3.5 5.5h1V9M3 9h2.5M3 13.2c0-.7.5-1.2 1.2-1.2s1.3.5 1.3 1.2c0 1-2.5 1.7-2.5 3.1h2.7" })
);

const IconoTabla = h(
  Icono,
  null,
  h("rect", { x: "3", y: "4", width: "18", height: "16", rx: "2" }),
  h("path", { d: "M3 10h18M3 15h18M9 4v16M15 4v16" })
);

const IconoCita = h(Icono, null, h("path", { d: "M8 7H5.5A1.5 1.5 0 004 8.5V11h4v4.5H4" }), h("path", { d: "M20 7h-2.5A1.5 1.5 0 0016 8.5V11h4v4.5H16" }));

const IconoSeparador = h(Icono, null, h("path", { d: "M4 12h16" }), h("path", { d: "M4 7h16M4 17h16", opacity: "0.35" }));

const IconoDeshacer = h(Icono, null, h("path", { d: "M9 7H4v5" }), h("path", { d: "M4 12a8 8 0 1 0 2.4-5.7L4 8" }));

const IconoRehacer = h(Icono, null, h("path", { d: "M15 7h5v5" }), h("path", { d: "M20 12a8 8 0 1 1-2.4-5.7L20 8" }));

const IconoLimpiar = h(Icono, null, h("path", { d: "M4 7h16" }), h("path", { d: "M9 7V5h6v2" }), h("path", { d: "M6 7l1 13h10l1-13" }));

function BotonBarra({ titulo, onClick, children, activo = null }) {
  return h(
    "button",
    {
      type: "button",
      className: activo
        ? "informes-barra__boton informes-barra__boton--activo"
        : "informes-barra__boton",
      title: titulo,
      "aria-label": titulo,
      "aria-pressed": activo === null ? undefined : (activo ? "true" : "false"),
      onClick
    },
    children
  );
}

function SeparadorBarra() {
  return h("span", { className: "informes-barra__separador", "aria-hidden": "true" });
}

/* Quita de un fragmento pegado cualquier cosa que pueda ejecutarse. */
function limpiarPegado(html) {
  const contenedor = document.createElement("div");

  contenedor.innerHTML = html;

  for (const elemento of contenedor.querySelectorAll("script, style, iframe, object, embed")) {
    elemento.remove();
  }

  for (const elemento of contenedor.querySelectorAll("*")) {
    for (const atributo of [...elemento.attributes]) {
      if (atributo.name.toLowerCase().startsWith("on")) {
        elemento.removeAttribute(atributo.name);
      }
    }
  }

  return contenedor.innerHTML;
}

export function EditorInforme({ valor = "", onChange, error = null, etiqueta = "Contenido del informe" }) {
  const nodo = useRef(null);

  /* El HTML se escribe una sola vez por cambio externo (cargar un informe,
     aplicar una plantilla, restaurar una version). Mientras se escribe no se
     vuelve a pintar: eso moveria el cursor. */
  useEffect(() => {
    const editor = nodo.current;

    if (!editor) {
      return;
    }

    if (editor.innerHTML !== (valor ?? "")) {
      editor.innerHTML = valor ?? "";
    }
  }, [valor]);

  const aplicar = (comando, argumento = null) => {
    const editor = nodo.current;

    if (!editor) {
      return;
    }

    editor.focus();
    document.execCommand(comando, false, argumento);
    onChange?.(editor.innerHTML);
  };

  const pegar = (evento) => {
    /* Se intercepta el pegado para no insertar codigo: el backend igual lo
       sanea, pero la vista previa no tiene que mostrarlo nunca. */
    evento.preventDefault();

    const pegado = evento.clipboardData?.getData("text/html");

    if (!pegado) {
      const texto = evento.clipboardData?.getData("text/plain") ?? "";
      document.execCommand("insertText", false, texto);
      onChange?.(nodo.current?.innerHTML ?? "");
      return;
    }

    document.execCommand("insertHTML", false, limpiarPegado(pegado));
    onChange?.(nodo.current?.innerHTML ?? "");
  };

  const barra = h(
    "div",
    { className: "informes-barra", role: "toolbar", "aria-label": "Formato del contenido" },
    /* Fila 1: formato del texto y alineacion. */
    h(
      "div",
      { className: "informes-barra__fila" },
      h(BotonBarra, { titulo: "Negrita", onClick: () => aplicar("bold") }, h("span", { className: "informes-barra__letra informes-barra__letra--negrita" }, "B")),
      h(BotonBarra, { titulo: "Cursiva", onClick: () => aplicar("italic") }, h("span", { className: "informes-barra__letra informes-barra__letra--cursiva" }, "I")),
      h(BotonBarra, { titulo: "Subrayado", onClick: () => aplicar("underline") }, h("span", { className: "informes-barra__letra informes-barra__letra--subrayado" }, "U")),
      h(BotonBarra, { titulo: "Tachado", onClick: () => aplicar("strikeThrough") }, h("span", { className: "informes-barra__letra informes-barra__letra--tachado" }, "S")),
      h(SeparadorBarra, null),
      h(BotonBarra, { titulo: "Alinear a la izquierda", onClick: () => aplicar("justifyLeft") }, IconoAlineacion.izquierda),
      h(BotonBarra, { titulo: "Centrar", onClick: () => aplicar("justifyCenter") }, IconoAlineacion.centro),
      h(BotonBarra, { titulo: "Alinear a la derecha", onClick: () => aplicar("justifyRight") }, IconoAlineacion.derecha),
      h(BotonBarra, { titulo: "Justificar", onClick: () => aplicar("justifyFull") }, IconoAlineacion.justificar),
      h(SeparadorBarra, null),
      h(BotonBarra, { titulo: "Lista con viñetas", onClick: () => aplicar("insertUnorderedList") }, IconoVinetas),
      h(BotonBarra, { titulo: "Lista numerada", onClick: () => aplicar("insertOrderedList") }, IconoNumeracion)
    ),
    /* Fila 2: bloques y acciones del documento. */
    h(
      "div",
      { className: "informes-barra__fila" },
      h(BotonBarra, { titulo: "Título de sección", onClick: () => aplicar("formatBlock", "<h2>") }, h("span", { className: "informes-barra__letra" }, "H2")),
      h(BotonBarra, { titulo: "Párrafo", onClick: () => aplicar("formatBlock", "<p>") }, h("span", { className: "informes-barra__letra" }, "P")),
      h(BotonBarra, { titulo: "Cita", onClick: () => aplicar("formatBlock", "<blockquote>") }, IconoCita),
      h(SeparadorBarra, null),
      h(BotonBarra, { titulo: "Insertar tabla de 3 columnas", onClick: () => aplicar("insertHTML", TABLA_3X3) }, IconoTabla),
      h(BotonBarra, { titulo: "Separador horizontal", onClick: () => aplicar("insertHorizontalRule") }, IconoSeparador),
      h(SeparadorBarra, null),
      h(BotonBarra, { titulo: "Deshacer", onClick: () => aplicar("undo") }, IconoDeshacer),
      h(BotonBarra, { titulo: "Rehacer", onClick: () => aplicar("redo") }, IconoRehacer),
      h(SeparadorBarra, null),
      h(BotonBarra, { titulo: "Limpiar formato", onClick: () => aplicar("removeFormat") }, IconoLimpiar)
    )
  );

  return h(
    "div",
    { className: "informes-editor" },
    barra,
    h(
      "div",
      {
        ref: nodo,
        className: "informes-editor__area",
        contentEditable: true,
        suppressContentEditableWarning: true,
        role: "textbox",
        "aria-multiline": "true",
        "aria-label": etiqueta,
        "aria-invalid": error ? "true" : undefined,
        "data-placeholder": "Escribí el informe en este espacio.",
        onInput: (evento) => onChange?.(evento.currentTarget.innerHTML),
        onPaste: pegar
      }
    ),
    error ? h("p", { className: "informes-editor__error", role: "alert" }, error) : null
  );
}
