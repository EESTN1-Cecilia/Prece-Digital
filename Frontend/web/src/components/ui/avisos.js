/* Avisos y errores.

   Los mensajes que llegan aca ya vienen traducidos por services/http.js: la
   interfaz muestra `error.mensaje`, nunca el texto crudo del servidor ni un
   codigo HTTP. El detalle tecnico viaja en `error.tecnico` y solo se registra
   en la consola. */

import { h } from "../../layouts/site-layout.js";
import { Boton } from "./boton.js";

const TONOS = ["info", "exito", "advertencia", "error"];

/* Aviso general del sistema. `tono` decide el color y el icono, pero el texto
   siempre alcanza por si solo: el color no es el unico portador del significado. */
export function Alerta({ tono = "info", titulo, children, onCerrar, acciones }) {
  const elegido = TONOS.includes(tono) ? tono : "info";
  const urgente = elegido === "error" || elegido === "advertencia";

  return h(
    "div",
    {
      className: `ui-alerta ui-alerta--${elegido}`,
      role: urgente ? "alert" : "status"
    },
    h(
      "div",
      { className: "ui-alerta__cuerpo" },
      titulo ? h("strong", { className: "ui-alerta__titulo" }, titulo) : null,
      h("span", null, children)
    ),
    acciones ? h("div", { className: "ui-alerta__acciones" }, acciones) : null,
    onCerrar
      ? h(
          "button",
          {
            className: "ui-alerta__cerrar",
            type: "button",
            "aria-label": "Cerrar aviso",
            onClick: onCerrar
          },
          "×"
        )
      : null
  );
}

/* Error de alcance local: afecta a la seccion donde ocurrio y no bloquea el resto
   de la pantalla. Un 403 se presenta como falta de permiso, que es mas util que
   repetir el mensaje generico de error. */
export function MensajeError({ error, onReintentar }) {
  if (!error) {
    return null;
  }

  if (error.esSinPermiso) {
    return h(SinPermiso, { permiso: error.permiso });
  }

  return h(
    Alerta,
    {
      tono: "error",
      acciones:
        onReintentar && error.reintentable !== false
          ? h(Boton, { variante: "contorno", tamano: "chico", onClick: onReintentar }, "Reintentar")
          : null
    },
    error.mensaje ?? error.message ?? "Ocurrio un error inesperado."
  );
}

/* Error de alcance global: sesion caida, servidor inaccesible o error interno.
   Se muestra sobre toda la aplicacion, no dentro de una pantalla. */
export function ErrorGlobal({ error, onReintentar, onCerrar }) {
  if (!error) {
    return null;
  }

  return h(
    "div",
    { className: "ui-error-global", role: "alert" },
    h("strong", null, error.esSesionExpirada ? "Sesion finalizada" : "Problema de conexion"),
    h("span", null, error.mensaje ?? "Ocurrio un error inesperado."),
    error.reintentable && onReintentar
      ? h(Boton, { variante: "contorno", tamano: "chico", onClick: onReintentar }, "Reintentar")
      : null,
    onCerrar
      ? h(
          "button",
          {
            className: "ui-error-global__cerrar",
            type: "button",
            "aria-label": "Cerrar aviso",
            onClick: onCerrar
          },
          "×"
        )
      : null
  );
}

/* Error de un campo de formulario (400 / 422 con detalle por campo). El `id` es
   el que referencia el input con aria-describedby. */
export function ErrorCampo({ mensaje, id }) {
  if (!mensaje) {
    return null;
  }

  return h("p", { className: "ui-campo__error", id, role: "alert" }, mensaje);
}

export function SinPermiso({ permiso }) {
  return h(
    Alerta,
    { tono: "error", titulo: "Acceso no autorizado" },
    permiso
      ? `No tenes permisos para esta accion: falta ${permiso} en tu alcance actual.`
      : "No tenes permisos para realizar esta accion."
  );
}

/* Aviso de que el dato mostrado es de demostracion porque el endpoint todavia no
   existe. Nunca aparece sobre una escritura: las escrituras no degradan. */
export function BannerOrigen({ origen, detalle, children }) {
  if (origen !== "demo") {
    return null;
  }

  return h(
    Alerta,
    { tono: "advertencia", titulo: "Datos de demostracion", acciones: children },
    detalle ??
      "El backend todavia no expone estos endpoints; al implementarlos la vista pasa a usar la API sin cambios."
  );
}
