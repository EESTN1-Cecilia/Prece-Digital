import { h } from "../../layouts/site-layout.js";
import { useUsuarioActual } from "../../estado/index.js";

/* Boton para volver al tablero de Direccion.

   Se muestra solo cuando quien mira la pantalla es el director (rol "director";
   el rol "admin" se trata como direccion en useUsuarioActual). Los demas perfiles
   (preceptor, secretaria, docente, jefe de area) no lo ven: ellos no tienen
   tablero de Direccion al que volver. */

export const RUTA_TABLERO_DIRECCION = "#/director";

const ESTILO_BARRA = {
  display: "flex",
  justifyContent: "flex-start",
  margin: "0 0 14px"
};

const ESTILO_BOTON = {
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
  padding: "9px 16px",
  border: "2px solid #2563eb",
  borderRadius: "999px",
  background: "#ffffff",
  color: "#1e293b",
  font: "inherit",
  fontSize: "14px",
  fontWeight: 600,
  lineHeight: 1,
  cursor: "pointer",
  boxShadow: "0 1px 2px rgba(15, 23, 42, 0.08)"
};

export function BotonVolverDireccion() {
  const { rol } = useUsuarioActual();

  if (rol !== "director") {
    return null;
  }

  return h(
    "div",
    { style: ESTILO_BARRA },
    h(
      "button",
      {
        type: "button",
        style: ESTILO_BOTON,
        onClick: () => {
          window.location.hash = RUTA_TABLERO_DIRECCION;
        },
        title: "Volver al tablero de Dirección"
      },
      h(
        "svg",
        {
          width: "16",
          height: "16",
          viewBox: "0 0 24 24",
          fill: "none",
          stroke: "currentColor",
          strokeWidth: "2",
          strokeLinecap: "round",
          strokeLinejoin: "round",
          "aria-hidden": "true"
        },
        h("line", { x1: "19", y1: "12", x2: "5", y2: "12" }),
        h("polyline", { points: "12 19 5 12 12 5" })
      ),
      "Volver al tablero de Dirección"
    )
  );
}
