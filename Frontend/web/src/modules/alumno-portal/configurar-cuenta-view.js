/* Primer ingreso: cambio obligatorio de la contraseña inicial (el DNI) y,
   si el alumno quiere, un usuario propio. Hasta completarlo el backend no
   entrega ninguna informacion academica. */

import { useState } from "react";
import { h, CampoTexto, Requisitos, Tarjeta } from "./componentes.js";
import { USUARIO_RE, configurarCuenta, requisitosPassword } from "./portal-api.js";

export default function ConfigurarCuentaView({ cuenta, onConfigurada }) {
  const [datos, setDatos] = useState({ usuario: "", passwordActual: "", passwordNueva: "", confirmacion: "" });
  const [errores, setErrores] = useState({});
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const usuarioElegido = datos.usuario.trim().toLowerCase() || cuenta?.usuario;
  const requisitos = requisitosPassword(datos.passwordNueva, { dni: cuenta?.dni, usuario: usuarioElegido });

  const cambiar = (campo) => (valor) => {
    setDatos((actual) => ({ ...actual, [campo]: valor }));
    setErrores((actual) => ({ ...actual, [campo]: null }));
    setError(null);
  };

  function validar() {
    const encontrados = {};
    const usuario = datos.usuario.trim().toLowerCase();
    if (usuario && !USUARIO_RE.test(usuario)) encontrados.usuario = "Entre 4 y 40 caracteres: letras, números, punto, guion o guion bajo (puede terminar en @alumno.prece.local).";
    else if (usuario && /^\d+$/.test(usuario) && usuario !== cuenta?.dni) encontrados.usuario = "Un usuario solo numérico tiene que ser tu DNI.";
    if (!datos.passwordActual) encontrados.passwordActual = "Ingresá tu contraseña actual (tu DNI).";
    if (!requisitos.every((item) => item.cumple)) encontrados.passwordNueva = "La contraseña nueva no cumple los requisitos.";
    if (datos.confirmacion !== datos.passwordNueva) encontrados.confirmacion = "La confirmación no coincide.";
    return encontrados;
  }

  async function enviar(evento) {
    evento.preventDefault();
    const encontrados = validar();
    if (Object.keys(encontrados).length) {
      setErrores(encontrados);
      return;
    }

    setEnviando(true);
    try {
      const actualizada = await configurarCuenta({
        usuario: datos.usuario.trim() ? datos.usuario.trim().toLowerCase() : undefined,
        passwordActual: datos.passwordActual,
        passwordNueva: datos.passwordNueva,
        confirmacion: datos.confirmacion
      });
      onConfigurada(actualizada);
    } catch (fallo) {
      setError(fallo);
      setErrores(fallo?.campos ?? {});
    } finally {
      setEnviando(false);
    }
  }

  return h(
    "div",
    { className: "pa-configurar" },
    h(
      Tarjeta,
      { titulo: "Configurá tu cuenta" },
      h(
        "p",
        { className: "pa-texto" },
        `Hola${cuenta?.nombre ? `, ${cuenta.nombre}` : ""}. Antes de ver tu información tenés que cambiar la contraseña inicial. Tu DNI deja de servir como contraseña.`
      ),
      error && !Object.keys(error.campos ?? {}).length ? h("div", { className: "pa-aviso pa-aviso--error", role: "alert" }, error.mensaje) : null,
      h(
        "form",
        { className: "pa-formulario", onSubmit: enviar, noValidate: true },
        h(CampoTexto, {
          id: "conf-usuario",
          etiqueta: "Usuario (opcional)",
          valor: datos.usuario,
          onCambiar: cambiar("usuario"),
          error: errores.usuario,
          ayuda: `Si lo dejás vacío, tu usuario sigue siendo ${cuenta?.usuario ?? "tu DNI"}.`,
          autoComplete: "username"
        }),
        h(CampoTexto, {
          id: "conf-actual",
          etiqueta: "Contraseña actual",
          tipo: "password",
          valor: datos.passwordActual,
          onCambiar: cambiar("passwordActual"),
          error: errores.passwordActual,
          ayuda: "Es tu DNI.",
          autoComplete: "current-password",
          requerido: true
        }),
        h(CampoTexto, {
          id: "conf-nueva",
          etiqueta: "Contraseña nueva",
          tipo: "password",
          valor: datos.passwordNueva,
          onCambiar: cambiar("passwordNueva"),
          error: errores.passwordNueva,
          autoComplete: "new-password",
          requerido: true
        }),
        h(Requisitos, { lista: requisitos }),
        h(CampoTexto, {
          id: "conf-confirmacion",
          etiqueta: "Repetí la contraseña nueva",
          tipo: "password",
          valor: datos.confirmacion,
          onCambiar: cambiar("confirmacion"),
          error: errores.confirmacion,
          autoComplete: "new-password",
          requerido: true
        }),
        h("button", { type: "submit", className: "pa-boton pa-boton--primario", disabled: enviando }, enviando ? "Guardando..." : "Guardar y continuar")
      )
    )
  );
}
