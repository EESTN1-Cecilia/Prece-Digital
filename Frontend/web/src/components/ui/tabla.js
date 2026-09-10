/* Tabla compartida para listados.

   Una misma tabla para usuarios, alumnos, stock, reservas y docentes: la vista
   describe las columnas y entrega las filas ya normalizadas; la tabla resuelve
   la cabecera, el ordenamiento, la seleccion, los estados de carga, de error y
   de listado vacio, y el scroll lateral en pantallas chicas.

   Columna:
     { id, titulo, celda?, ordenable?, valor?, alineacion?, ancho? }
       celda(fila)  contenido de la celda; por defecto fila[id]
       valor(fila)  clave de ordenamiento; por defecto la celda cruda */

import { h } from "../../layouts/site-layout.js";
import { MensajeError } from "./avisos.js";
import { Esqueleto, SinResultados } from "./estado.js";
import { Paginacion } from "./paginacion.js";

const SIN_DATO = "—";

function valorCrudo(columna, fila) {
  if (columna.valor) {
    return columna.valor(fila);
  }

  return fila?.[columna.id];
}

function contenidoCelda(columna, fila) {
  if (columna.celda) {
    return columna.celda(fila);
  }

  const valor = fila?.[columna.id];

  return valor === null || valor === undefined || valor === "" ? SIN_DATO : valor;
}

/* Ordenamiento en memoria. Los listados que ordena el backend no lo usan: pasan
   `orden` y `onOrden` y resuelven el pedido por su cuenta. */
export function ordenarFilas(filas, orden, columnas = []) {
  if (!orden?.columna) {
    return filas;
  }

  const columna = columnas.find((candidata) => candidata.id === orden.columna);

  if (!columna) {
    return filas;
  }

  const signo = orden.direccion === "desc" ? -1 : 1;

  return [...filas].sort((una, otra) => {
    const izquierda = valorCrudo(columna, una);
    const derecha = valorCrudo(columna, otra);

    /* Los vacios van siempre al final, sin importar la direccion. */
    if (izquierda === null || izquierda === undefined || izquierda === "") return 1;
    if (derecha === null || derecha === undefined || derecha === "") return -1;

    if (typeof izquierda === "number" && typeof derecha === "number") {
      return (izquierda - derecha) * signo;
    }

    return String(izquierda).localeCompare(String(derecha), "es", { numeric: true }) * signo;
  });
}

/* Alterna asc -> desc -> sin orden sobre la misma columna. */
export function siguienteOrden(orden, columnaId) {
  if (orden?.columna !== columnaId) {
    return { columna: columnaId, direccion: "asc" };
  }

  if (orden.direccion === "asc") {
    return { columna: columnaId, direccion: "desc" };
  }

  return { columna: null, direccion: null };
}

function Encabezado({ columna, orden, onOrden }) {
  const activa = orden?.columna === columna.id;
  const direccion = activa ? orden.direccion : null;

  const propiedades = {
    scope: "col",
    style: columna.ancho ? { width: columna.ancho } : undefined,
    className: columna.alineacion ? `ui-tabla__celda--${columna.alineacion}` : undefined,
    "aria-sort": activa ? (direccion === "asc" ? "ascending" : "descending") : undefined
  };

  if (!columna.ordenable || !onOrden) {
    return h("th", propiedades, columna.titulo);
  }

  return h(
    "th",
    propiedades,
    h(
      "button",
      {
        className: activa ? "ui-tabla__orden ui-tabla__orden--activo" : "ui-tabla__orden",
        type: "button",
        onClick: () => onOrden(siguienteOrden(orden, columna.id))
      },
      columna.titulo,
      h(
        "span",
        { className: "ui-tabla__flecha", "aria-hidden": "true" },
        activa ? (direccion === "asc" ? "▲" : "▼") : "↕"
      )
    )
  );
}

export function Tabla({
  columnas = [],
  filas = [],
  clave = (fila, indice) => fila?.id ?? indice,
  titulo,
  cargando = false,
  error = null,
  onReintentar,
  vacio,
  orden,
  onOrden,
  ordenarEnMemoria = false,
  acciones,
  seleccion,
  onSeleccion,
  paginacion
}) {
  if (error) {
    return h(MensajeError, { error, onReintentar });
  }

  if (cargando) {
    return h(Esqueleto, { filas: 4, columnas: Math.max(1, columnas.length) });
  }

  const visibles = ordenarEnMemoria ? ordenarFilas(filas, orden, columnas) : filas;

  if (!visibles.length) {
    return vacio ?? h(SinResultados);
  }

  const seleccionable = Boolean(seleccion && onSeleccion);
  const marcadas = new Set(seleccion ?? []);

  const alternarFila = (id) => {
    const proxima = new Set(marcadas);
    /* Set no tiene "toggle": se quita si estaba y se agrega si no. */
    if (proxima.has(id)) {
      proxima.delete(id);
    } else {
      proxima.add(id);
    }
    onSeleccion([...proxima]);
  };

  const todasMarcadas = seleccionable && visibles.every((fila, indice) => marcadas.has(clave(fila, indice)));

  return h(
    "div",
    { className: "ui-tabla__contenedor" },
    h(
      "div",
      { className: "ui-tabla__scroll", tabIndex: 0, role: "region", "aria-label": titulo ?? "Listado" },
      h(
        "table",
        { className: "ui-tabla" },
        titulo ? h("caption", { className: "ui-solo-lectores" }, titulo) : null,
        h(
          "thead",
          null,
          h(
            "tr",
            null,
            seleccionable
              ? h(
                  "th",
                  { scope: "col", className: "ui-tabla__celda--seleccion" },
                  h("input", {
                    type: "checkbox",
                    checked: todasMarcadas,
                    "aria-label": "Seleccionar todo",
                    onChange: () =>
                      onSeleccion(todasMarcadas ? [] : visibles.map((fila, indice) => clave(fila, indice)))
                  })
                )
              : null,
            columnas.map((columna) =>
              h(Encabezado, { key: columna.id, columna, orden, onOrden })
            ),
            acciones ? h("th", { scope: "col" }, "Acciones") : null
          )
        ),
        h(
          "tbody",
          null,
          visibles.map((fila, indice) => {
            const id = clave(fila, indice);

            return h(
              "tr",
              { key: id, className: marcadas.has(id) ? "ui-tabla__fila--marcada" : undefined },
              seleccionable
                ? h(
                    "td",
                    { className: "ui-tabla__celda--seleccion" },
                    h("input", {
                      type: "checkbox",
                      checked: marcadas.has(id),
                      "aria-label": `Seleccionar ${id}`,
                      onChange: () => alternarFila(id)
                    })
                  )
                : null,
              columnas.map((columna) =>
                h(
                  "td",
                  {
                    key: columna.id,
                    className: columna.alineacion ? `ui-tabla__celda--${columna.alineacion}` : undefined
                  },
                  contenidoCelda(columna, fila)
                )
              ),
              acciones ? h("td", null, h("div", { className: "ui-acciones" }, acciones(fila))) : null
            );
          })
        )
      )
    ),
    paginacion ? h(Paginacion, paginacion) : null
  );
}
