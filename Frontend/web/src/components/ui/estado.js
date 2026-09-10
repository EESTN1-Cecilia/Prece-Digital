/* Estados de carga y de ausencia de datos.

   Cubre los cuatro casos que aparecen en el sistema: la pantalla completa, una
   seccion, una tabla y una accion puntual dentro de un boton. La idea es que el
   usuario nunca vea una pantalla quieta sin saber si el sistema sigue trabajando. */

import { h } from "../../layouts/site-layout.js";

export function Spinner({ tamano = "medio", etiqueta = "Cargando" }) {
  return h(
    "span",
    {
      className: `ui-spinner ui-spinner--${tamano}`,
      role: etiqueta ? "status" : undefined,
      "aria-label": etiqueta ?? undefined,
      "aria-hidden": etiqueta ? undefined : "true"
    },
    etiqueta ? h("span", { className: "ui-solo-lectores" }, etiqueta) : null
  );
}

/* Carga de una seccion: ocupa el lugar del contenido sin tapar la pantalla. */
export function Cargando({ texto = "Cargando..." }) {
  return h(
    "p",
    { className: "ui-estado", role: "status" },
    h(Spinner, { tamano: "chico", etiqueta: null }),
    h("span", null, texto)
  );
}

/* Carga de la pantalla completa, para la primera lectura de una vista. */
export function CargandoPantalla({ texto = "Cargando la informacion..." }) {
  return h(
    "div",
    { className: "ui-cargando-pantalla", role: "status" },
    h(Spinner, { tamano: "grande", etiqueta: null }),
    h("p", null, texto)
  );
}

/* Capa sobre un bloque que ya tiene contenido: se usa cuando se recarga algo que
   ya se estaba viendo y conviene mantenerlo visible en gris. */
export function CapaDeCarga({ activa, texto = "Actualizando...", children }) {
  return h(
    "div",
    { className: activa ? "ui-capa ui-capa--activa" : "ui-capa" },
    children,
    activa
      ? h(
          "div",
          { className: "ui-capa__velo", role: "status" },
          h(Spinner, { tamano: "medio", etiqueta: null }),
          h("span", null, texto)
        )
      : null
  );
}

/* Esqueleto para tablas y listados: conserva la forma del contenido mientras llega. */
export function Esqueleto({ filas = 3, columnas = 1 }) {
  return h(
    "div",
    { className: "ui-esqueleto", "aria-hidden": "true" },
    Array.from({ length: filas }, (_, fila) =>
      h(
        "div",
        { className: "ui-esqueleto__fila", key: fila },
        Array.from({ length: columnas }, (_, columna) =>
          h("span", { className: "ui-esqueleto__celda", key: columna })
        )
      )
    )
  );
}

/* Ausencia de datos. Admite una accion para resolver la situacion cuando existe
   una: "no hay usuarios" acompanado del boton para crear el primero. */
export function SinDatos({ titulo, descripcion, icono, accion }) {
  return h(
    "div",
    { className: "ui-sin-datos" },
    icono ? h("img", { className: "ui-sin-datos__icono", src: `/assets/icons/${icono}.svg`, alt: "" }) : null,
    h("p", { className: "ui-sin-datos__titulo" }, titulo),
    descripcion ? h("p", { className: "ui-sin-datos__texto" }, descripcion) : null,
    accion ? h("div", { className: "ui-sin-datos__accion" }, accion) : null
  );
}

/* Caso corriente de SinDatos: una busqueda o un filtro que no devolvio nada. */
export function SinResultados({
  texto = "No hay resultados para la busqueda y los filtros aplicados.",
  descripcion,
  accion
}) {
  return h(SinDatos, { titulo: texto, descripcion, accion });
}
