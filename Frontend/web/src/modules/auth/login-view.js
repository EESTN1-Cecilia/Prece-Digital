import { useState } from "react";
import { h } from "../../layouts/site-layout.js";
import { FormCard } from "../../components/form-card.js";
import { Alerta, Boton, Campo } from "../../components/ui/index.js";
import { useSesion } from "../../estado/index.js";

/* Figma: "Login - todos" (2138:2) y su variante "Activar Cuenta" (2179:60). */
export default function LoginView({ titulo = "Iniciar Sesión" }) {
  const { iniciarSesion } = useSesion();
  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (evento) => {
    evento?.preventDefault();
    if (!correo.trim() || !contrasena) return;

    setError(null);
    setCargando(true);

    try {
      await iniciarSesion({ email: correo.trim(), password: contrasena });
      window.location.hash = "#/inicio";
    } catch (err) {
      setError(err?.mensaje ?? "Credenciales inválidas o cuenta desactivada");
    } finally {
      setCargando(false);
    }
  };

  return h(
    FormCard,
    { titulo, onSubmit: handleSubmit },
    error ? h(Alerta, { tono: "error" }, error) : null,
    h(Campo, {
      etiqueta: "Correo institucional:",
      id: "correo",
      tipo: "email",
      valor: correo,
      onChange: setCorreo,
      placeholder: "Ingrese su correo....",
      requerido: true,
      deshabilitado: cargando
    }),
    h(Campo, {
      etiqueta: "Contraseña:",
      id: "contrasena",
      tipo: "password",
      valor: contrasena,
      onChange: setContrasena,
      placeholder: "Ingrese su contraseña....",
      requerido: true,
      deshabilitado: cargando
    }),
    h(
      "div",
      { className: "form-links" },
      h("a", { href: "#recuperar" }, "Olvide mi contraseña"),
      h("a", { href: "#soporte" }, "Soporte")
    ),
    h(
      Boton,
      {
        className: "form-submit",
        tipo: "submit",
        ancho: true,
        cargando
      },
      cargando ? "Iniciando sesión..." : "Iniciar Sesión"
    )
  );
}
