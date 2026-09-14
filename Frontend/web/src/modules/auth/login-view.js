import { useState } from "react";
import { h } from "../../layouts/site-layout.js";
import { FormCard } from "../../components/form-card.js";
import { Alerta, Boton, Campo } from "../../components/ui/index.js";
import { useSesion } from "../../estado/index.js";

<<<<<<< HEAD
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
=======
const INICIAL = { email: "", password: "" };

function validar(datos) {
  const errores = {};

  if (!datos.email.trim()) {
    errores.email = "Ingresa tu correo institucional.";
  }

  if (!datos.password) {
    errores.password = "Ingresa tu contrasena.";
  }

  return Object.keys(errores).length ? errores : null;
}

/* Figma: "Login - todos" (2138:2) y su variante "Activar Cuenta" (2179:60). */
export default function LoginView({ titulo = "Iniciar Sesión" }) {
  const { iniciarSesion } = useSesion();
  const [datos, setDatos] = useState(INICIAL);
  const [errores, setErrores] = useState({});
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [mostrarPassword, setMostrarPassword] = useState(false);

  const actualizar = (campo) => (valor) => {
    setDatos((actual) => ({ ...actual, [campo]: valor }));
    setErrores((actual) => ({ ...actual, [campo]: null }));
    setError(null);
  };

  async function enviar() {
    const erroresValidacion = validar(datos);

    if (erroresValidacion) {
      setErrores(erroresValidacion);
      return;
    }

    setEnviando(true);
    setError(null);

    try {
      await iniciarSesion({ email: datos.email.trim(), password: datos.password });
      window.location.hash = "#/inicio";
    } catch (fallo) {
      setError(fallo);
      setErrores(fallo?.campos ?? {});
    } finally {
      setEnviando(false);
    }
  }

  const etiquetaPassword = mostrarPassword ? "Ocultar contrasena" : "Mostrar contrasena";

  return h(
    FormCard,
    { titulo, onSubmit: enviar },
    error
      ? h(
          Alerta,
          { tono: "error", titulo: "No se pudo iniciar sesion" },
          error.mensaje ?? error.message ?? "Revisa tus credenciales e intenta nuevamente."
        )
      : null,
>>>>>>> 010894b2c6392ebe8fe48bafa272246de5ab7d60
    h(Campo, {
      etiqueta: "Correo institucional:",
      id: "email",
      tipo: "email",
<<<<<<< HEAD
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
=======
      valor: datos.email,
      onChange: actualizar("email"),
      placeholder: "Ingrese su correo....",
      autoComplete: "username",
      error: errores.email,
      requerido: true,
      deshabilitado: enviando
    }),
    h(Campo, {
      etiqueta: "Contraseña:",
      id: "password",
      tipo: mostrarPassword ? "text" : "password",
      valor: datos.password,
      onChange: actualizar("password"),
      placeholder: "Ingrese su contraseña....",
      autoComplete: "current-password",
      error: errores.password,
      requerido: true,
      deshabilitado: enviando,
      sufijo: h(
        "button",
        {
          className: "password-toggle",
          type: "button",
          "aria-label": etiquetaPassword,
          "aria-pressed": mostrarPassword ? "true" : "false",
          title: etiquetaPassword,
          disabled: enviando || undefined,
          onClick: () => setMostrarPassword((actual) => !actual)
        },
        h("img", { src: "/assets/icons/eye.svg", alt: "", "aria-hidden": "true" })
      )
>>>>>>> 010894b2c6392ebe8fe48bafa272246de5ab7d60
    }),
    h(
      "div",
      { className: "form-links" },
      h("a", { href: "#recuperar" }, "Olvide mi contraseña"),
      h("a", { href: "#soporte" }, "Soporte")
    ),
<<<<<<< HEAD
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
=======
    h(Boton, { className: "form-submit", tipo: "submit", ancho: true, cargando: enviando }, "Iniciar Sesión")
>>>>>>> 010894b2c6392ebe8fe48bafa272246de5ab7d60
  );
}
