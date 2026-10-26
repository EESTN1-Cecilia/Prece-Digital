/* Acceso al Portal Docente.

   Usa la misma autenticacion de toda la aplicacion (POST /api/v1/auth/login,
   contraseñas con hash en el backend, tokens JWT): no hay un sistema de
   claves aparte. Lo propio es la presentacion y el destino: una cuenta con rol
   Docente entra a su portal; cualquier otra cuenta va a su tablero habitual. */

import { useEffect, useState } from "react";
import { h } from "../../layouts/site-layout.js";
import { useSesion } from "../../estado/index.js";

const INICIAL = { email: "", password: "" };

function destinoSegun(roles = []) {
  const codigos = roles.map((rol) => rol?.id ?? rol);
  return codigos.includes("docente") ? "#/docente" : "#/inicio";
}

/* Mensaje para una persona, segun lo que respondio el backend. */
function mensajeDeError(fallo) {
  if (fallo?.codigo === "ACCOUNT_INACTIVE" || fallo?.status === 403) {
    return { titulo: "Cuenta dada de baja", texto: fallo.mensaje ?? "Tu cuenta no está activa. Comunicate con Dirección." };
  }

  if (fallo?.status === 401) {
    return { titulo: "No pudimos validar tus datos", texto: "El correo o la contraseña no son correctos." };
  }

  if (fallo?.status === 429) {
    return { titulo: "Demasiados intentos", texto: fallo.mensaje ?? "Esperá unos minutos antes de volver a intentar." };
  }

  return { titulo: "No se pudo ingresar", texto: fallo?.mensaje ?? "Revisá tu conexión e intentá nuevamente." };
}

export default function PortalLoginView() {
  const { iniciarSesion, autenticado, roles } = useSesion();
  const [datos, setDatos] = useState(INICIAL);
  const [errores, setErrores] = useState({});
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [verClave, setVerClave] = useState(false);

  /* Con una sesion abierta no tiene sentido mostrar el formulario. */
  useEffect(() => {
    if (autenticado) {
      window.location.hash = destinoSegun(roles ?? []);
    }
  }, [autenticado, roles]);

  const cambiar = (campo) => (evento) => {
    const valor = evento.target.value;
    setDatos((actual) => ({ ...actual, [campo]: valor }));
    setErrores((actual) => ({ ...actual, [campo]: null }));
    setError(null);
  };

  const enviar = async (evento) => {
    evento.preventDefault();

    const encontrados = {};
    if (!datos.email.trim()) encontrados.email = "Ingresá tu correo institucional.";
    if (!datos.password) encontrados.password = "Ingresá tu contraseña.";

    if (Object.keys(encontrados).length) {
      setErrores(encontrados);
      return;
    }

    setEnviando(true);
    setError(null);

    try {
      const sesion = await iniciarSesion({ email: datos.email.trim(), password: datos.password });
      window.location.hash = destinoSegun(sesion?.usuario?.roles ?? sesion?.roles ?? []);
    } catch (fallo) {
      setError(mensajeDeError(fallo));
      setDatos((actual) => ({ ...actual, password: "" }));
    } finally {
      setEnviando(false);
    }
  };

  const campo = ({ id, etiqueta, tipo, valor, onChange, error: mensaje, autoComplete, extra }) =>
    h(
      "div",
      { className: "portal-login__campo" },
      h("label", { htmlFor: id }, etiqueta),
      h(
        "div",
        { className: "portal-login__control" },
        h("input", {
          id,
          name: id,
          type: tipo,
          value: valor,
          onChange,
          autoComplete,
          required: true,
          disabled: enviando,
          "aria-invalid": mensaje ? "true" : undefined,
          "aria-describedby": mensaje ? `${id}-error` : undefined
        }),
        extra
      ),
      mensaje ? h("p", { className: "portal-login__error-campo", id: `${id}-error` }, mensaje) : null
    );

  return h(
    "div",
    { className: "portal-login" },
    h(
      "section",
      { className: "portal-login__tarjeta", "aria-labelledby": "portal-login-titulo" },
      h(
        "div",
        { className: "portal-login__marca" },
        h("img", { src: "/assets/tecnica-n1-monte-grande.png", alt: "E.E.S.T. N°1 Monte Grande", className: "portal-login__escudo" }),
        h(
          "div",
          null,
          h("span", { className: "portal-login__eyebrow" }, "Prece Digital · E.E.S.T. N°1"),
          h("h1", { id: "portal-login-titulo", className: "portal-login__titulo" }, "Portal Docente")
        )
      ),
      h(
        "p",
        { className: "portal-login__bajada" },
        "Ingresá con tu cuenta institucional para ver tus cursos, las listas de alumnos y tomar asistencia."
      ),
      error
        ? h(
            "div",
            { className: "portal-login__alerta", role: "alert" },
            h("strong", null, error.titulo),
            h("span", null, error.texto)
          )
        : null,
      h(
        "form",
        { className: "portal-login__form", onSubmit: enviar, noValidate: true },
        campo({
          id: "portal-email",
          etiqueta: "Correo institucional",
          tipo: "email",
          valor: datos.email,
          onChange: cambiar("email"),
          error: errores.email,
          autoComplete: "username"
        }),
        campo({
          id: "portal-password",
          etiqueta: "Contraseña",
          tipo: verClave ? "text" : "password",
          valor: datos.password,
          onChange: cambiar("password"),
          error: errores.password,
          autoComplete: "current-password",
          extra: h(
            "button",
            {
              type: "button",
              className: "portal-login__ver",
              onClick: () => setVerClave((actual) => !actual),
              "aria-label": verClave ? "Ocultar contraseña" : "Mostrar contraseña",
              "aria-pressed": verClave
            },
            verClave ? "Ocultar" : "Ver"
          )
        }),
        h(
          "button",
          { type: "submit", className: "portal-login__ingresar", disabled: enviando, "aria-busy": enviando ? "true" : undefined },
          enviando ? h("span", { className: "portal-login__spinner", "aria-hidden": "true" }) : null,
          enviando ? "Ingresando..." : "Ingresar"
        )
      ),
      h(
        "p",
        { className: "portal-login__pie" },
        "¿Sos parte de Dirección, Secretaría o Preceptoría? ",
        h("a", { href: "#/login" }, "Usá el acceso general"),
        "."
      )
    )
  );
}
