/* Cambio obligatorio de la clave provisoria.

   Las cuentas nuevas se crean con el DNI como clave provisoria y la marca
   `debeCambiarClave`. Mientras la marca siga activa, el guardia de navegacion
   muestra solo esta pantalla, sea cual sea la ruta, y el backend rechaza el
   resto de la API (403 PASSWORD_CHANGE_REQUIRED): ocultar las pantallas es
   comodidad, la restriccion real esta en el servidor.

   Reutiliza la tarjeta de la pantalla de ingreso para mantener la misma
   identidad visual. */

import { useState } from "react";
import { h } from "../../layouts/site-layout.js";
import { Boton, Campo, MensajeError } from "../../components/ui/index.js";
import { useSesion } from "../../estado/index.js";

const CLAVE_MINIMA = 8;
const INICIAL = { actual: "", nueva: "", repetida: "" };

/* Mismas reglas que el backend, para avisar antes de enviar. */
export function validarCambioClave(datos) {
  const errores = {};

  if (!datos.actual) {
    errores.actual = "Ingresá tu clave actual (tu DNI sin puntos).";
  }

  if (datos.nueva.length < CLAVE_MINIMA) {
    errores.nueva = `La nueva clave debe tener al menos ${CLAVE_MINIMA} caracteres.`;
  } else if (!/[A-Za-z]/.test(datos.nueva) || !/\d/.test(datos.nueva)) {
    errores.nueva = "La nueva clave debe combinar letras y números.";
  } else if (datos.actual && datos.nueva === datos.actual) {
    errores.nueva = "Tiene que ser distinta de la clave provisoria.";
  }

  if (datos.repetida !== datos.nueva) {
    errores.repetida = "Las claves no coinciden.";
  }

  return errores;
}

export default function CambiarClaveView() {
  const { usuario, cambiarClave, cerrarSesion } = useSesion();
  const [datos, setDatos] = useState(INICIAL);
  const [errores, setErrores] = useState({});
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const cambiar = (campo) => (valor) => {
    setDatos((actual) => ({ ...actual, [campo]: valor }));
    setErrores((actuales) => (actuales[campo] ? { ...actuales, [campo]: null } : actuales));
  };

  async function enviar(evento) {
    evento.preventDefault();

    if (enviando) {
      return;
    }

    const encontrados = validarCambioClave(datos);
    setErrores(encontrados);
    setError(null);

    if (Object.values(encontrados).some(Boolean)) {
      return;
    }

    setEnviando(true);

    try {
      await cambiarClave({ actual: datos.actual, nueva: datos.nueva });
      window.location.hash = "#/inicio";
    } catch (fallo) {
      setError(fallo);
      setErrores(fallo?.campos ?? {});
    } finally {
      setEnviando(false);
    }
  }

  return h(
    "div",
    { className: "login-page-container" },
    h(
      "div",
      { className: "login-card cambiar-clave-card" },
      h(
        "div",
        { className: "login-card__header" },
        h("h1", { className: "secretaria-title login-card__title" }, "Elegí tu nueva clave"),
        h(
          "p",
          { className: "login-card__subtitle" },
          usuario?.nombre ? `Hola, ${usuario.nombre}. ` : "",
          "Ingresaste con una clave provisoria. Para continuar, reemplazala por una clave personal."
        )
      ),
      h("div", { className: "login-card__divider", "aria-hidden": "true" }),
      error && !Object.keys(error?.campos ?? {}).length ? h(MensajeError, { error }) : null,
      h(
        "form",
        { className: "cambiar-clave-form", onSubmit: enviar, noValidate: true },
        h(Campo, {
          id: "clave-actual",
          etiqueta: "Clave actual",
          tipo: "password",
          valor: datos.actual,
          onChange: cambiar("actual"),
          error: errores.actual,
          requerido: true,
          autoComplete: "current-password",
          ayuda: "Es tu DNI, sin puntos."
        }),
        h(Campo, {
          id: "clave-nueva",
          etiqueta: "Nueva clave",
          tipo: "password",
          valor: datos.nueva,
          onChange: cambiar("nueva"),
          error: errores.nueva,
          requerido: true,
          autoComplete: "new-password",
          ayuda: `Al menos ${CLAVE_MINIMA} caracteres, con letras y números. No puede contener tu DNI.`
        }),
        h(Campo, {
          id: "clave-repetida",
          etiqueta: "Repetí la nueva clave",
          tipo: "password",
          valor: datos.repetida,
          onChange: cambiar("repetida"),
          error: errores.repetida,
          requerido: true,
          autoComplete: "new-password"
        }),
        h(
          "div",
          { className: "cambiar-clave-acciones" },
          h(Boton, { variante: "texto", deshabilitado: enviando, onClick: cerrarSesion }, "Cerrar sesión"),
          h(Boton, { variante: "primario", tipo: "submit", cargando: enviando }, "Guardar nueva clave")
        )
      )
    )
  );
}
