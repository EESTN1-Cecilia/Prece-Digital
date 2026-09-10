import { h } from "../layouts/site-layout.js";

/* Tarjeta blanca centrada con titulo y doble onda, comun a Login e Invitar Usuario.
   Los campos que van adentro salen de la biblioteca compartida (components/ui). */
export function FormCard({ titulo, children, onSubmit }) {
  return h(
    "form",
    {
      className: "form-card",
      onSubmit: (evento) => {
        evento.preventDefault();
        if (onSubmit) onSubmit(evento);
      }
    },
    h("h1", { className: "form-card__title" }, titulo),
    h("div", { className: "doble-onda", "aria-hidden": "true" }),
    children
  );
}

export function TituloSeccion({ children }) {
  return h("h2", { className: "form-section-title" }, children);
}
