import { h } from "../../layouts/site-layout.js";
import { usePermisos } from "../../estado/index.js";

/* Selector entre los tableros de Preceptoria y Secretaria.

   Ya no cambia de rol (el rol sale de la sesion real): solo navega entre los dos
   tableros y se muestra unicamente a quien puede abrir ambos (students.write,
   por ejemplo direccion o secretaria). */
export function RoleSwitch({ activeRole }) {
  const { puede } = usePermisos();

  if (!puede("students.write")) {
    return null;
  }

  const isSecretaria = activeRole === "secretaria";
  const ir = (hash) => () => {
    window.location.hash = hash;
  };

  return h(
    "div",
    { className: "role-segmented-control", "aria-label": "Tablero" },
    h(
      "button",
      {
        type: "button",
        className: `role-segment-btn ${!isSecretaria ? "active" : ""}`,
        onClick: ir("#/preceptoria"),
        "aria-pressed": !isSecretaria
      },
      "Preceptoría"
    ),
    h(
      "button",
      {
        type: "button",
        className: `role-segment-btn ${isSecretaria ? "active" : ""}`,
        onClick: ir("#/secretaria"),
        "aria-pressed": isSecretaria
      },
      "Secretaría"
    )
  );
}
