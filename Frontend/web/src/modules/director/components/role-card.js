/* Tarjeta de rol con casilla real.

   La usan los dos modales de gestión de personal: crear un perfil y modificar
   los roles de uno existente. La casilla es un <input type="checkbox"> de
   verdad, no un cuadrado dibujado con estilos: asi se puede marcar con el
   mouse, con el teclado (barra espaciadora) y con los lectores de pantalla.

   La tarjeta es una <label> que envuelve la casilla, de modo que el texto del
   rol tambien activa y desactiva la marca, como espera cualquiera. */

import { h } from "../../../layouts/site-layout.js";

export function RoleCard({ rol, marcado = false, onChange, deshabilitado = false }) {
  const id = `rol-${rol.id}`;

  return h(
    "label",
    {
      className: marcado ? "director-role-card director-role-card--active" : "director-role-card",
      htmlFor: id
    },
    h(
      "span",
      { className: "director-role-card__header" },
      h("input", {
        id,
        type: "checkbox",
        className: "director-role-card__casilla",
        checked: marcado,
        disabled: deshabilitado || undefined,
        onChange: (evento) => onChange?.(evento.target.checked, rol.id)
      }),
      h("strong", { className: "director-role-card__title" }, rol.nombre)
    ),
    h("span", { className: "director-role-card__desc" }, rol.descripcion)
  );
}

/* Grilla de tarjetas de roles: dos columnas en pantalla ancha, una sola en
   pantalla chica. Se usa igual en los dos modales para que la lista de roles
   se vea siempre igual. */
export function RoleGrid({ roles = [], seleccionados = [], onChange, deshabilitado = false }) {
  return h(
    "div",
    { className: "director-roles-grid" },
    roles.map((rol) =>
      h(RoleCard, {
        key: rol.id,
        rol,
        marcado: seleccionados.includes(rol.id),
        deshabilitado,
        onChange
      })
    )
  );
}
