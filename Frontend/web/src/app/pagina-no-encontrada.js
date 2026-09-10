/* Ruta inexistente del frontend: se muestra una pantalla, no una redireccion
   silenciosa, para que el error quede visible. */

import { h } from "../layouts/site-layout.js";
import { BotonEnlace, SinDatos } from "../components/ui/index.js";

export function PaginaNoEncontrada() {
  return h(
    "section",
    { className: "data-panel data-panel--centrado" },
    h(SinDatos, {
      titulo: "Pagina no encontrada",
      descripcion: "La pagina que estas buscando no existe.",
      accion: h(BotonEnlace, { variante: "primario", href: "#/inicio" }, "Volver al inicio")
    })
  );
}
