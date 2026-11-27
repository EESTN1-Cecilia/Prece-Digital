/* Íconos de trazo (24x24) del portal del alumno. Son los mismos trazados que usa
   la web (Frontend/web/src/modules/alumno-portal/componentes.js), para que la
   app se vea igual. Decorativos: el texto siempre los acompaña. */

import React from "react";
import Svg, { Path } from "react-native-svg";

const TRAZOS = {
  usuario: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 20c.6-3.6 3.7-5.5 8-5.5s7.4 1.9 8 5.5",
  libro: "M5 4h10a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4zM5 17a3 3 0 0 1 3-3h10",
  tilde: "M5 12.5l4.5 4.5L19 7.5",
  portapapeles: "M9 4h6v3H9zM7 5H6a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1h-1M9 12h6M9 16h6",
  tarjeta: "M3 6h18v12H3zM7 11h4M7 14h3M15 10h3M15 13h3",
  grupo: "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 19c.4-3 2.7-4.5 6-4.5s5.6 1.5 6 4.5M16 6a3 3 0 0 1 0 5.5M18 14.8c1.7.6 2.7 1.9 3 4.2",
  sol: "M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4",
  birrete: "M2 9l10-5 10 5-10 5zM6 11v5c0 1.5 3 3 6 3s6-1.5 6-3v-5",
  calendario: "M7 3v3M17 3v3M4 8h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z",
  engranaje: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19 12c0-.4 0-.8-.1-1.2l2-1.5-2-3.4-2.3.9a7 7 0 0 0-2-1.2L14.2 3h-4l-.4 2.6a7 7 0 0 0-2 1.2l-2.3-.9-2 3.4 2 1.5A7 7 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.4 2.3-.9c.6.5 1.3.9 2 1.2l.4 2.6h4l.4-2.6c.7-.3 1.4-.7 2-1.2l2.3.9 2-3.4-2-1.5c.1-.4.1-.8.1-1.2z",
  info: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v5M12 8v.5"
};

export function Icono({ nombre, tamano = 20, color = "#7a2530" }) {
  return React.createElement(
    Svg,
    { width: tamano, height: tamano, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", accessibilityElementsHidden: true, importantForAccessibility: "no" },
    React.createElement(Path, { d: TRAZOS[nombre] ?? TRAZOS.libro })
  );
}
