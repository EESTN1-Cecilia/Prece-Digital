/* Mi Cuenta: datos de acceso, cambio de contrasena y de usuario, cierre de sesion. */

import React, { useState } from "react";
import { Text, View } from "react-native";

import { cambiarPassword, cambiarUsuario } from "../../services/alumno-api.js";
import { fechaCorta, validarUsuario } from "../../utils/alumno-reglas.js";
import { Aviso, Boton, CampoTexto, Encabezado, Nota, Pantalla, Tarjeta, estilos, h } from "./componentes.js";
import BiometriaTarjeta from "./BiometriaTarjeta.js";
import FormularioPassword from "./FormularioPassword.js";

function CambiarUsuario({ cuenta, onCambiada }) {
  const [usuario, setUsuario] = useState("");
  const [passwordActual, setPasswordActual] = useState("");
  const [errores, setErrores] = useState({});
  const [error, setError] = useState(null);
  const [ok, setOk] = useState(false);
  const [enviando, setEnviando] = useState(false);

  async function enviar() {
    if (enviando) return;

    const encontrados = {};
    const errorUsuario = validarUsuario(usuario, { dni: cuenta.dni });
    if (errorUsuario) encontrados.usuario = errorUsuario;
    if (!passwordActual) encontrados.passwordActual = "Ingresá tu contraseña actual.";

    if (Object.keys(encontrados).length) {
      setErrores(encontrados);
      return;
    }

    setEnviando(true);
    setError(null);
    setOk(false);

    try {
      const actualizada = await cambiarUsuario({ usuario: usuario.trim().toLowerCase(), passwordActual });
      onCambiada(actualizada);
      setUsuario("");
      setPasswordActual("");
      setOk(true);
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
    ok ? h(Aviso, { tipo: "ok" }, "Listo: tu usuario se actualizó.") : null,
    error && !Object.keys(error.campos ?? {}).length ? h(Aviso, null, error.mensaje) : null,
    h(CampoTexto, { etiqueta: "Usuario nuevo", valor: usuario, onCambiar: (v) => { setUsuario(v); setErrores((a) => ({ ...a, usuario: null })); }, error: errores.usuario, autoComplete: "username" }),
    h(CampoTexto, { etiqueta: "Contraseña actual", valor: passwordActual, onCambiar: (v) => { setPasswordActual(v); setErrores((a) => ({ ...a, passwordActual: null })); }, error: errores.passwordActual, secreto: true, autoComplete: "current-password" }),
    h(Boton, { texto: "Cambiar usuario", onPress: enviar, cargando: enviando, variante: "claro" })
  );
}

export default function CuentaScreen({ cuenta, onCuentaActualizada, onSalir }) {
  const [cambioOk, setCambioOk] = useState(false);
  const [saliendo, setSaliendo] = useState(false);

  async function salir() {
    setSaliendo(true);
    try {
      await onSalir();
    } finally {
      setSaliendo(false);
    }
  }

  return h(
    Pantalla,
    null,
    h(Encabezado, { titulo: "Mi Cuenta", descripcion: `${cuenta.nombre ?? ""} ${cuenta.apellido ?? ""}`.trim() }),
    h(
      Tarjeta,
      { titulo: "Datos de acceso" },
      h(Text, { style: estilos.nota, selectable: true }, `Usuario: ${cuenta.usuario}`),
      h(Text, { style: estilos.nota }, `Contraseña actualizada: ${fechaCorta(cuenta.passwordActualizadaEn)}`),
      h(Text, { style: estilos.nota }, `Último ingreso: ${fechaCorta(cuenta.ultimoIngreso)}`)
    ),
    h(
      Tarjeta,
      { titulo: "Cambiar contraseña" },
      cambioOk ? h(Aviso, { tipo: "ok" }, "Listo: tu contraseña se actualizó. Se cerraron las demás sesiones abiertas.") : null,
      h(FormularioPassword, {
        cuenta,
        usuarioElegido: cuenta.usuario,
        textoBoton: "Cambiar contraseña",
        onEnviar: async (datos) => {
          setCambioOk(false);
          const actualizada = await cambiarPassword(datos);
          onCuentaActualizada(actualizada);
          setCambioOk(true);
        }
      })
    ),
    h(BiometriaTarjeta, null),
    h(Tarjeta, { titulo: "Cambiar usuario" }, h(CambiarUsuario, { cuenta, onCambiada: onCuentaActualizada })),
    h(Boton, { texto: saliendo ? "Cerrando sesión..." : "Cerrar sesión", onPress: salir, cargando: saliendo, variante: "claro" }),
    h(Nota, null, "Si olvidaste tu contraseña, pedí el reinicio en Secretaría.")
  );
}
