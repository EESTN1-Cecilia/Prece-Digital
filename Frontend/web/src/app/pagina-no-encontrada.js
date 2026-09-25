/* Ruta inexistente del frontend: se muestra la pantalla 404 con notfound.jpg,
   sin redirección silenciosa, para que el usuario sepa que la dirección no existe
   y pueda volver al inicio con facilidad. */

import { h } from "../layouts/site-layout.js";
import { RUTA_INICIO } from "./rutas.js";

export function PaginaNoEncontrada() {
  return h(
    "div",
    { className: "not-found-page-wrapper" },
    h(
      "section",
      { className: "not-found-card", "aria-labelledby": "not-found-title" },
      h("img", {
        className: "not-found-card__image",
        src: "/assets/notfound.jpg",
        alt: "Ilustración de página no encontrada"
      }),
      h("h1", { id: "not-found-title", className: "not-found-card__title" }, "Página no encontrada"),
      h("p", { className: "not-found-card__text" }, "La pagina que estas buscando no existe."),
      h(
        "a",
        {
          className: "not-found-card__btn",
          href: RUTA_INICIO
        },
        "Volver al Inicio"
      )
    )
  );
}


