/* Formulario compartido de contrasena nueva (primer ingreso y Mi Cuenta). */

import React, { useState } from "react";
import { View } from "react-native";

import { requisitosPassword, validarCambioDePassword } from "../../utils/alumno-reglas.js";
import { Aviso, Boton, CampoTexto, Requisitos, h } from "./componentes.js";

export default function FormularioPassword({ cuenta, usuarioElegido, textoBoton, ayudaActual, onEnviar, conUsuario = false }) {
  const [datos, setDatos] = useState({ usuario: "", passwordActual: "", passwordNueva: "", confirmacion: "" });
  const [errores, setErrores] = useState({});
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const usuario = (datos.usuario.trim().toLowerCase() || usuarioElegido || cuenta?.usuario) ?? "";
  const requisitos = requisitosPassword(datos.passwordNueva, { dni: cuenta?.dni, usuario });

  const cambiar = (campo) => (valor) => {
    setDatos((actual) => ({ ...actual, [campo]: valor }));
    setErrores((actual) => ({ ...actual, [campo]: null }));
    setError(null);
  };

  async function enviar() {
    if (enviando) return;

    const encontrados = validarCambioDePassword(datos, { dni: cuenta?.dni, usuario });

    if (encontrados) {
      setErrores(encontrados);
      return;
    }

    setEnviando(true);

    try {
      await onEnviar(datos);
      setDatos({ usuario: "", passwordActual: "", passwordNueva: "", confirmacion: "" });
    } catch (fallo) {
      setError(fallo);
      setErrores(fallo?.campos ?? {});
    } finally {
      setEnviando(false);
    }
  }

  return h(
    View,
    { style: { gap: 12 } },
    error && !Object.keys(error.campos ?? {}).length ? h(Aviso, null, error.mensaje) : null,
    conUsuario
      ? h(CampoTexto, { etiqueta: "Usuario (opcional)", valor: datos.usuario, onCambiar: cambiar("usuario"), error: errores.usuario, ayuda: `Si lo dejás vacío, tu usuario sigue siendo ${cuenta?.usuario ?? "tu DNI"}.`, autoComplete: "username" })
      : null,
    h(CampoTexto, { etiqueta: "Contraseña actual", valor: datos.passwordActual, onCambiar: cambiar("passwordActual"), error: errores.passwordActual, ayuda: ayudaActual, secreto: true, autoComplete: "current-password", textContentType: "password" }),
    h(CampoTexto, { etiqueta: "Contraseña nueva", valor: datos.passwordNueva, onCambiar: cambiar("passwordNueva"), error: errores.passwordNueva, secreto: true, autoComplete: "new-password", textContentType: "newPassword" }),
    h(Requisitos, { lista: requisitos }),
    h(CampoTexto, { etiqueta: "Repetí la contraseña nueva", valor: datos.confirmacion, onCambiar: cambiar("confirmacion"), error: errores.confirmacion, secreto: true, autoComplete: "new-password", textContentType: "newPassword" }),
    h(Boton, { texto: enviando ? "Guardando..." : textoBoton, onPress: enviar, cargando: enviando })
  );
}
