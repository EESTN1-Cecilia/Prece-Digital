import { h } from "../../layouts/site-layout.js";

/* Pantalla publica de "Olvidaste tu contraseña".
   Todavia no existe un envio automatico de enlaces de recuperacion: la clave la
   restablece la Direccion o la Secretaria. Esta pantalla se dibuja con el layout
   de acceso (sin menu de usuario ni "Cerrar sesion"), igual que el login. */

const CORREO_SOPORTE = "Prece.Digital.Soporte@gmail.com";

export default function RecuperarView() {
  return h(
    "div",
    { className: "login-page-container" },
    h(
      "div",
      { className: "login-card" },
      h(
        "div",
        { className: "login-card__top-bar" },
        h("div", { className: "secretaria-eyebrow login-card__eyebrow" }, "E.E.S.T. Nº 1 · CECILIA BERDICHEVSKI")
      ),
      h(
        "div",
        { className: "login-card__header" },
        h("h1", { className: "secretaria-title login-card__title" }, "Recuperar contraseña"),
        h(
          "p",
          { className: "login-card__subtitle" },
          "Por seguridad, la contraseña la restablece la Dirección o la Secretaría de la escuela. Pedí que te generen una contraseña temporal; en tu próximo ingreso el sistema te va a pedir cambiarla."
        )
      ),
      h("div", { className: "login-card__divider", "aria-hidden": "true" }),
      h(
        "div",
        { className: "login-links-row" },
        h(
          "a",
          {
            href: `mailto:${CORREO_SOPORTE}?subject=${encodeURIComponent("Recuperar contraseña - Prece.Digital")}`,
            className: "login-action-link login-action-link--support"
          },
          "Escribir a soporte"
        )
      ),
      h(
        "a",
        { href: "#/login", className: "login-submit-button", style: { textDecoration: "none", textAlign: "center" } },
        h("span", { className: "login-btn-content" }, h("span", null, "Volver a iniciar sesión"))
      )
    )
  );
}
