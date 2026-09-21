import { useState } from "react";
import { h, IconoFigma } from "../../layouts/site-layout.js";
import { useSesion } from "../../estado/index.js";

const INICIAL = { email: "", password: "" };

function validar(datos) {
  const errores = {};

  if (!datos.email.trim()) {
    errores.email = "Ingresa tu correo institucional.";
  }

  if (!datos.password) {
    errores.password = "Ingresa tu contraseña.";
  }

  return Object.keys(errores).length ? errores : null;
}

export default function LoginView({ titulo = "Iniciar Sesión" }) {
  const { iniciarSesion } = useSesion();
  const [datos, setDatos] = useState(INICIAL);
  const [errores, setErrores] = useState({});
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [mostrarPassword, setMostrarPassword] = useState(false);

  const actualizar = (campo) => (valorOEvento) => {
    const valor =
      valorOEvento && typeof valorOEvento === "object" && "target" in valorOEvento
        ? valorOEvento.target.value
        : valorOEvento;
    setDatos((actual) => ({ ...actual, [campo]: valor }));
    setErrores((actual) => ({ ...actual, [campo]: null }));
    setError(null);
  };

  async function enviar(evento) {
    if (evento && typeof evento.preventDefault === "function") {
      evento.preventDefault();
    }
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

  const etiquetaPassword = mostrarPassword ? "Ocultar contraseña" : "Mostrar contraseña";

  return h(
    "div",
    { className: "login-page-container" },
    h(
      "div",
      { className: "login-card" },

      // 1. Barra superior: Eyebrow institucional + Badge de Estado Oficial
      h(
        "div",
        { className: "login-card__top-bar" },
        h(
          "div",
          { className: "secretaria-eyebrow login-card__eyebrow" },
          "E.E.S.T. Nº 1 · CICLO LECTIVO 2026"
        ),
        h(
          "div",
          { className: "login-official-badge" },
          h("span", { className: "login-official-dot", "aria-hidden": "true" }),
          h("span", null, "Acceso Oficial")
        )
      ),

      // 2. Encabezado principal: Título y Subtítulo estilo Secretaría
      h(
        "div",
        { className: "login-card__header" },
        h("h1", { className: "secretaria-title login-card__title" }, titulo),
        h(
          "p",
          { className: "login-card__subtitle" },
          titulo === "Activar Cuenta"
            ? "Configurá tus credenciales para activar tu cuenta institucional."
            : "Ingresá con tus credenciales oficiales para acceder al sistema escolar."
        )
      ),

      // Divisor sutil institucional
      h("div", { className: "login-card__divider", "aria-hidden": "true" }),

      // 3. Alerta de error si falla la autenticación (estilo AlertCard de Secretaría)
      error
        ? h(
            "div",
            { className: "login-alert", role: "alert" },
            h(
              "svg",
              {
                className: "login-alert__icon",
                viewBox: "0 0 24 24",
                fill: "none",
                stroke: "currentColor",
                strokeWidth: "2",
                strokeLinecap: "round",
                strokeLinejoin: "round",
                "aria-hidden": "true"
              },
              h("circle", { cx: "12", cy: "12", r: "10" }),
              h("line", { x1: "12", y1: "8", x2: "12", y2: "12" }),
              h("line", { x1: "12", y1: "16", x2: "12.01", y2: "16" })
            ),
            h(
              "div",
              { className: "login-alert__content" },
              h("strong", { className: "login-alert__title" }, "No se pudo iniciar sesión"),
              h(
                "p",
                { className: "login-alert__desc" },
                error.mensaje ?? error.message ?? "Revisá tus credenciales e intentá nuevamente."
              )
            )
          )
        : null,

      // 4. Formulario
      h(
        "form",
        { className: "login-form", onSubmit: enviar, noValidate: true },

        // Campo Correo Institucional
        h(
          "div",
          { className: `login-field ${errores.email ? "has-error" : ""}` },
          h(
            "label",
            { htmlFor: "login-email", className: "login-label" },
            "Correo institucional",
            h("span", { className: "login-required-star" }, " *")
          ),
          h(
            "div",
            { className: "login-input-group" },
            h(
              "div",
              { className: "login-input-icon", "aria-hidden": "true" },
              h(
                "svg",
                {
                  width: "18",
                  height: "18",
                  viewBox: "0 0 24 24",
                  fill: "none",
                  stroke: "currentColor",
                  strokeWidth: "2",
                  strokeLinecap: "round",
                  strokeLinejoin: "round"
                },
                h("path", { d: "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" }),
                h("polyline", { points: "22,6 12,13 2,6" })
              )
            ),
            h("input", {
              id: "login-email",
              name: "email",
              type: "email",
              className: "login-input",
              value: datos.email,
              onChange: actualizar("email"),
              placeholder: "ejemplo@abc.gob.ar",
              autoComplete: "username",
              required: true,
              disabled: enviando
            })
          ),
          errores.email
            ? h("p", { className: "login-field-error", role: "alert" }, errores.email)
            : null
        ),

        // Campo Contraseña
        h(
          "div",
          { className: `login-field ${errores.password ? "has-error" : ""}` },
          h(
            "label",
            { htmlFor: "login-password", className: "login-label" },
            "Contraseña",
            h("span", { className: "login-required-star" }, " *")
          ),
          h(
            "div",
            { className: "login-input-group" },
            h(
              "div",
              { className: "login-input-icon", "aria-hidden": "true" },
              h(
                "svg",
                {
                  width: "18",
                  height: "18",
                  viewBox: "0 0 24 24",
                  fill: "none",
                  stroke: "currentColor",
                  strokeWidth: "2",
                  strokeLinecap: "round",
                  strokeLinejoin: "round"
                },
                h("rect", { x: "3", y: "11", width: "18", height: "11", rx: "2", ry: "2" }),
                h("path", { d: "M7 11V7a5 5 0 0 1 10 0v4" })
              )
            ),
            h("input", {
              id: "login-password",
              name: "password",
              type: mostrarPassword ? "text" : "password",
              className: "login-input login-input--password",
              value: datos.password,
              onChange: actualizar("password"),
              placeholder: "Ingresá tu contraseña...",
              autoComplete: "current-password",
              required: true,
              disabled: enviando
            }),
            h(
              "button",
              {
                className: "login-password-toggle",
                type: "button",
                "aria-label": etiquetaPassword,
                "aria-pressed": mostrarPassword,
                title: etiquetaPassword,
                disabled: enviando,
                onClick: () => setMostrarPassword((actual) => !actual)
              },
              h("img", { src: "/assets/icons/eye.svg", alt: "", "aria-hidden": "true" })
            )
          ),
          errores.password
            ? h("p", { className: "login-field-error", role: "alert" }, errores.password)
            : null
        ),

        // Enlaces: Olvidé mi contraseña / Soporte
        h(
          "div",
          { className: "login-links-row" },
          h("a", { href: "#recuperar", className: "login-action-link" }, "¿Olvidaste tu contraseña?"),
          h(
            "a",
            {
              href: "mailto:Prece.Digital.Soporte@gmail.com",
              className: "login-action-link login-action-link--support"
            },
            h(IconoFigma, { nombre: "support", className: "login-support-icon" }),
            h("span", null, "Soporte")
          )
        ),

        // Botón Submit estilo Secretaría (Pill / Navy con elevación y spinner)
        h(
          "button",
          {
            className: `login-submit-button ${enviando ? "is-loading" : ""}`,
            type: "submit",
            disabled: enviando
          },
          enviando
            ? h(
                "span",
                { className: "login-btn-content" },
                h("span", { className: "login-spinner", "aria-hidden": "true" }),
                h("span", null, "Iniciando sesión...")
              )
            : h(
                "span",
                { className: "login-btn-content" },
                h("span", null, titulo),
                h(
                  "svg",
                  {
                    className: "login-btn-arrow",
                    width: "17",
                    height: "17",
                    viewBox: "0 0 24 24",
                    fill: "none",
                    stroke: "currentColor",
                    strokeWidth: "2.5",
                    strokeLinecap: "round",
                    strokeLinejoin: "round",
                    "aria-hidden": "true"
                  },
                  h("polyline", { points: "9 18 15 12 9 6" })
                )
              )
        )
      ),

      // 5. Nota de pie de tarjeta con sello institucional
      h(
        "div",
        { className: "login-card__footer" },
        h(
          "div",
          { className: "login-footer-badge" },
          h(
            "svg",
            {
              className: "login-footer-icon",
              width: "14",
              height: "14",
              viewBox: "0 0 24 24",
              fill: "none",
              stroke: "currentColor",
              strokeWidth: "2",
              strokeLinecap: "round",
              strokeLinejoin: "round",
              "aria-hidden": "true"
            },
            h("path", { d: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" })
          ),
          h("span", null, "Acceso protegido · Prece.Digital")
        )
      )
    )
  );
}

