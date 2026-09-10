/* Layout de la aplicacion autenticada: encabezado, contenido y menu de movil.

   Toda pantalla interna se dibuja adentro, asi que ninguna repite el encabezado
   ni el menu. Las rutas publicas (login, activar cuenta) usan el layout del
   sitio, que es el del diseno original con su encabezado y su pie.

   En escritorio se navega desde el encabezado, igual que en el diseno. El panel
   lateral es solo de movil: ahi no entra la barra de secciones. */

import React, { useEffect, useState } from "react";
import { Sidebar } from "./sidebar.js";
import { EncabezadoApp, Migas } from "./encabezado-app.js";
import { AvisoSesionDemo } from "./aviso-demo.js";

const h = React.createElement;

export function AppLayout({ ruta, children }) {
  const [abierto, setAbierto] = useState(false);

  /* Al cambiar de pantalla el panel movil se cierra: si no, tapa lo que se
     acaba de abrir. */
  useEffect(() => {
    setAbierto(false);
  }, [ruta]);

  return h(
    "div",
    { className: abierto ? "app-layout app-layout--menu-abierto" : "app-layout" },
    h(Sidebar, { hash: ruta, abierto, onCerrar: () => setAbierto(false) }),
    /* Velo del menu movil: cierra al tocar afuera. */
    abierto
      ? h("div", {
          className: "app-layout__velo",
          role: "presentation",
          onClick: () => setAbierto(false)
        })
      : null,
    h(
      "div",
      { className: "app-layout__cuerpo" },
      h(EncabezadoApp, { hash: ruta, onAbrirMenu: () => setAbierto(true) }),
      h(
        "main",
        { className: "app-layout__contenido", id: "contenido" },
        /* Las migas van sobre el contenido: en el encabezado azul competirian
           con la barra de secciones. */
        h(Migas, { hash: ruta }),
        h(AvisoSesionDemo),
        children
      )
    )
  );
}
