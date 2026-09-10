/* Pantalla de acceso no autorizado.

   No muestra nada de la seccion restringida: solo dice que falta permiso y
   ofrece una salida. El permiso que falta se nombra porque le sirve a quien
   administra los roles para saber que habilitar. */

import { h } from "../layouts/site-layout.js";
import { BotonEnlace, SinDatos } from "../components/ui/index.js";
import { RUTA_INICIO } from "./rutas.js";

export function AccesoDenegado({ titulo, permiso }) {
  return h(
    "section",
    { className: "data-panel data-panel--centrado" },
    h(SinDatos, {
      titulo: "Acceso no autorizado",
      descripcion: titulo
        ? `No tenes permisos para acceder a ${titulo}.`
        : "No tenes permisos para acceder a esta seccion.",
      accion: h(BotonEnlace, { variante: "primario", href: RUTA_INICIO }, "Volver al inicio")
    }),
    permiso
      ? h(
          "p",
          { className: "data-nota data-nota--centrada" },
          `Permiso necesario: ${permiso}. Pedile a quien administre los roles que te lo habilite.`
        )
      : null
  );
}
