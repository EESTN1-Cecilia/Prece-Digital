import { h } from "../../layouts/site-layout.js";
import { useUsuarioActual } from "../../estado/index.js";

/**
 * Barra superior de retorno al Dashboard de Dirección.
 * Solo se muestra cuando la sesión activa tiene el rol "director".
 */
export function DirectorVolverBar({ externa = false, maxWidth = 1320 } = {}) {
  const user = useUsuarioActual();
  const esDirector =
    user?.rol === "director" ||
    (Array.isArray(user?.roles) && user.roles.includes("director"));

  if (!esDirector) return null;

  const cicloLectivo = user?.cicloLectivo || 2026;
  const escuelaNombre = user?.escuela || "E.E.ST N°1 Monte Grande";

  const estiloBarra = externa
    ? {
        width: `min(${maxWidth}px, calc(100% - 48px))`,
        maxWidth: `${maxWidth}px`,
        margin: "24px auto 0",
        boxSizing: "border-box"
      }
    : { width: "100%", marginBottom: "0" };

  return h(
    "div",
    {
      className: "dashboard-top-bar alumnos-top-nav no-print",
      style: estiloBarra
    },
    h(
      "button",
      {
        type: "button",
        className: "btn-volver-atras",
        onClick: () => {
          window.location.hash = "#/inicio";
        },
        title: "Volver al Panel de Administración",
        "aria-label": "Volver al Panel de Administración"
      },
      h(
        "svg",
        {
          className: "btn-volver-atras__icon",
          viewBox: "0 0 20 20",
          fill: "currentColor",
          "aria-hidden": "true"
        },
        h("path", {
          fillRule: "evenodd",
          d: "M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z",
          clipRule: "evenodd"
        })
      ),
      h("span", null, "Volver al Panel de Administración")
    ),
    h(
      "div",
      { className: "alumnos-top-badges" },
      h("span", { className: "badge-institucion" }, escuelaNombre),
      h("span", { className: "badge-ciclo" }, `Ciclo Lectivo ${cicloLectivo}`)
    )
  );
}
