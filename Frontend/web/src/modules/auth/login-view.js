import { h } from "../../layouts/site-layout.js";
import { FormCard } from "../../components/form-card.js";
import { Boton, Campo } from "../../components/ui/index.js";

/* Figma: "Login - todos" (2138:2) y su variante "Activar Cuenta" (2179:60).
   El envio al backend corresponde a la issue #61: falta el endpoint de login. */
export default function LoginView({ titulo = "Iniciar Sesión" }) {
  return h(
    FormCard,
    { titulo },
    h(Campo, {
      etiqueta: "Correo institucional:",
      id: "correo",
      tipo: "email",
      placeholder: "Ingrese su correo....",
      requerido: true
    }),
    h(Campo, {
      etiqueta: "Contraseña:",
      id: "contrasena",
      tipo: "password",
      placeholder: "Ingrese su contraseña....",
      requerido: true
    }),
    h(
      "div",
      { className: "form-links" },
      h("a", { href: "#recuperar" }, "Olvide mi contraseña"),
      h("a", { href: "#soporte" }, "Soporte")
    ),
    h(Boton, { className: "form-submit", tipo: "submit", ancho: true }, "Iniciar Sesión")
  );
}
