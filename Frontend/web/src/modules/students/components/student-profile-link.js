import { h } from "../../../layouts/site-layout.js";

/**
 * StudentProfileLink: Botón interactivo estilizado para acceder a la vista de Perfil Completo del Alumno
 */
export function StudentProfileLink({ alumnoId, url, label = "Ver Perfil Completo" }) {
  const getTargetUrl = () => {
    if (url) return url;
    if (alumnoId) return `#/alumnos/${alumnoId}/perfil`;
    const hash = window.location.hash || "";
    const match = hash.match(/#\/alumnos\/([^/?]+)/);
    if (match && match[1] && match[1] !== "cargar" && match[1] !== "nuevo" && match[1] !== "buscar") {
      return `#/alumnos/${match[1]}/perfil`;
    }
    return "#/alumnos";
  };

  const handleClick = (e) => {
    e.preventDefault();
    const target = getTargetUrl();
    window.location.hash = target;
  };

  return h(
    "button",
    {
      type: "button",
      className: "btn-ver-perfil-completo-styled",
      onClick: handleClick,
      title: "Consultar perfil completo y detallado del alumno",
      "aria-label": label
    },
    h(
      "svg",
      {
        className: "btn-perfil-icon",
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: "2",
        strokeLinecap: "round",
        strokeLinejoin: "round",
        "aria-hidden": "true"
      },
      h("path", { d: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" }),
      h("circle", { cx: "12", cy: "7", r: "4" })
    ),
    h("span", null, label)
  );
}

