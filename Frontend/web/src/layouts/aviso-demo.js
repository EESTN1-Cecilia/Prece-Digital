/* Aviso de sesion de demostracion, comun a toda la aplicacion.

   Vive en el layout y no dentro de cada pantalla por dos razones: antes cuatro
   vistas repetian el mismo bloque, y si la pantalla quedaba denegada el
   selector desaparecia con ella y no habia forma de volver a otro perfil.

   Solo aparece mientras GET /api/v1/me no exista. No reemplaza la validacion
   del backend, que sigue respondiendo 401 y 403 ante cada escritura. */

import React from "react";
import { BannerOrigen } from "../components/ui/index.js";
import { PERFILES_DEMO } from "../services/identity-api.js";
import { useSesion } from "../estado/hooks.js";

const h = React.createElement;

export function AvisoSesionDemo() {
  const { origen, perfilDemo, cambiarPerfilDemo } = useSesion();

  return h(
    BannerOrigen,
    {
      origen,
      detalle:
        "El backend todavia no expone GET /api/v1/me. Podes simular otro perfil para ver como cambian los controles y que secciones quedan disponibles."
    },
    h(
      "label",
      { className: "ui-alerta__perfil" },
      "Simular permisos de:",
      h(
        "select",
        {
          value: perfilDemo ?? "",
          onChange: (evento) => cambiarPerfilDemo(evento.target.value)
        },
        PERFILES_DEMO.map((perfil) =>
          h("option", { key: perfil.id, value: perfil.id }, perfil.nombre)
        )
      )
    )
  );
}
