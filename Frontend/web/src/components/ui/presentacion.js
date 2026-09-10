/* Presentacion de informacion: tarjetas, badges y pares etiqueta/valor. */

import { h, IconoFigma } from "../../layouts/site-layout.js";

const TONOS = ["neutral", "ok", "off", "alerta", "aviso", "info"];

/* Badge de estado o categoria. El texto siempre dice de que se trata: el color
   acompana pero no es el unico portador del significado, para que siga
   entendiendose sin distinguir colores. */
export function Badge({ tono = "neutral", children }) {
  const elegido = TONOS.includes(tono) ? tono : "neutral";

  return h(
    "span",
    { className: `ui-badge ui-badge--${elegido}` },
    h("span", { className: "ui-badge__punto", "aria-hidden": "true" }),
    children
  );
}

/* Estados que ya usa el sistema. Los que no figuran caen en el tono neutral. */
const TONOS_ESTADO = {
  activo: "ok",
  aprobado: "ok",
  publicado: "ok",
  inactivo: "off",
  rechazado: "alerta",
  suspendido: "alerta",
  pendiente: "aviso",
  revision: "aviso"
};

export function BadgeEstado({ estado }) {
  return h(Badge, { tono: TONOS_ESTADO[estado] ?? "neutral" }, estado ?? "desconocido");
}

export function Card({ titulo, descripcion, icono, valor, acciones, tono, className, children }) {
  return h(
    "article",
    { className: ["ui-card", tono ? `ui-card--${tono}` : null, className].filter(Boolean).join(" ") },
    titulo || icono
      ? h(
          "header",
          { className: "ui-card__cabecera" },
          icono ? h(IconoFigma, { className: "ui-card__icono", nombre: icono }) : null,
          titulo ? h("h3", { className: "ui-card__titulo" }, titulo) : null
        )
      : null,
    valor !== undefined && valor !== null
      ? h("p", { className: "ui-card__valor" }, valor)
      : null,
    descripcion ? h("p", { className: "ui-card__descripcion" }, descripcion) : null,
    children ? h("div", { className: "ui-card__cuerpo" }, children) : null,
    acciones ? h("footer", { className: "ui-card__pie" }, acciones) : null
  );
}

/* Par etiqueta/valor para pantallas de detalle. */
export function Dato({ etiqueta, children }) {
  return h(
    "div",
    { className: "ui-dato" },
    h("dt", null, etiqueta),
    h("dd", null, children ?? "—")
  );
}

export function ListaDatos({ children }) {
  return h("dl", { className: "ui-datos" }, children);
}
