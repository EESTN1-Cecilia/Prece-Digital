/* Pantalla de inicio de sesion.
   Copia la estructura y los textos de Frontend/web/src/modules/auth/login-view.js
   (tarjeta, eyebrow, badge, alerta, campos y boton) adaptada a touch.
   Las credenciales se validan en la API comun, no aca. */

import React, { useState } from "react";
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { ALTO_BOTON, ALTO_CAMPO, COLOR_SOPORTE, COLORES, ESPACIOS, RADIOS, TIPOGRAFIA } from "../../theme/tokens.js";
import { useSesion } from "./SesionContext.js";

const h = React.createElement;

const INICIAL = { email: "", password: "" };

/* Solo presencia de datos. La validez de la contrasena la decide el Backend. */
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

export default function LoginScreen() {
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
    if (enviando) {
      return;
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
      setDatos(INICIAL);
    } catch (fallo) {
      setError(fallo);
      setErrores(fallo?.campos ?? {});
    } finally {
      setEnviando(false);
    }
  }

  return h(
    ScrollView,
    {
      style: styles.pagina,
      contentContainerStyle: styles.contenido,
      keyboardShouldPersistTaps: "handled"
    },

    h(
      View,
      { style: styles.tarjeta },

      h(
        View,
        { style: styles.barraSuperior },
        h(Text, { style: styles.eyebrow }, "E.E.S.T. Nº 1 · CECILIA BERDICHEVSKI"),
        h(
          View,
          { style: styles.badge },
          h(View, { style: styles.badgePunto }),
          h(Text, { style: styles.badgeTexto }, "ACCESO OFICIAL")
        )
      ),

      h(
        View,
        null,
        h(Text, { style: styles.titulo }, "Iniciar Sesión"),
        h(
          Text,
          { style: styles.subtitulo },
          "Ingresá con tus credenciales oficiales para acceder al sistema escolar."
        )
      ),

      h(View, { style: styles.divisor }),

      error
        ? h(
            View,
            { style: styles.alerta, accessibilityRole: "alert" },
            h(View, { style: styles.alertaIcono }),
            h(
              View,
              { style: styles.alertaContenido },
              h(Text, { style: styles.alertaTitulo }, "No se pudo iniciar sesión"),
              h(Text, { style: styles.alertaDesc }, error.mensaje ?? "Revisá tus credenciales e intentá nuevamente.")
            )
          )
        : null,

      h(
        View,
        null,

        h(
          View,
          { style: styles.campo },
          h(
            Text,
            { style: styles.etiqueta },
            "Correo institucional",
            h(Text, { style: styles.requerido }, " *")
          ),
          h(TextInput, {
            style: estilosInput(errores.email),
            value: datos.email,
            onChangeText: actualizar("email"),
            placeholder: "secretaria@prece.local",
            placeholderTextColor: COLORES.marcador,
            autoCapitalize: "none",
            autoCorrect: false,
            autoComplete: "username",
            textContentType: "username",
            keyboardType: "email-address",
            returnKeyType: "next",
            editable: !enviando,
            accessibilityLabel: "Correo institucional"
          }),
          errores.email ? h(Text, { style: styles.errorCampo }, errores.email) : null
        ),

        h(
          View,
          { style: styles.campo },
          h(
            Text,
            { style: styles.etiqueta },
            "Contraseña",
            h(Text, { style: styles.requerido }, " *")
          ),
          h(
            View,
            { style: styles.grupoInput },
            h(TextInput, {
              style: estilosInput(errores.password),
              value: datos.password,
              onChangeText: actualizar("password"),
              placeholder: "••••••••••••",
              placeholderTextColor: COLORES.marcador,
              secureTextEntry: !mostrarPassword,
              autoCapitalize: "none",
              autoCorrect: false,
              autoComplete: "current-password",
              textContentType: "password",
              returnKeyType: "go",
              editable: !enviando,
              onSubmitEditing: enviar,
              accessibilityLabel: "Contraseña"
            }),
            h(
              Pressable,
              {
                onPress: () => setMostrarPassword((actual) => !actual),
                disabled: enviando,
                accessibilityRole: "button",
                accessibilityLabel: mostrarPassword ? "Ocultar contraseña" : "Mostrar contraseña",
                style: ({ pressed }) => [styles.togglePassword, pressed && styles.togglePasswordPresionado]
              },
              h(
                Text,
                { style: styles.togglePasswordTexto },
                mostrarPassword ? "Ocultar" : "Ver"
              )
            )
          ),
          errores.password ? h(Text, { style: styles.errorCampo }, errores.password) : null
        ),

        h(
          View,
          { style: styles.enlaces },
          h(
            Pressable,
            {
              onPress: () => Linking.openURL(`mailto:${COLOR_SOPORTE}`),
              disabled: enviando,
              accessibilityRole: "link",
              style: ({ pressed }) => [styles.enlace, pressed && styles.enlacePresionado]
            },
            h(Text, { style: styles.enlaceTexto }, "Soporte")
          )
        ),

        h(
          Pressable,
          {
            onPress: enviar,
            disabled: enviando,
            accessibilityRole: "button",
            accessibilityState: { disabled: enviando, busy: enviando },
            style: ({ pressed }) => [
              styles.boton,
              pressed && !enviando && styles.botonPresionado,
              enviando && styles.botonEnviando
            ]
          },
          h(
            View,
            { style: styles.botonContenido },
            enviando ? h(ActivityIndicator, { color: COLORES.blanco, size: "small" }) : null,
            h(Text, { style: styles.botonTexto }, enviando ? "Iniciando sesión..." : "Iniciar Sesión")
          )
        )
      ),

      h(
        View,
        { style: styles.pie },
        h(Text, { style: styles.pieTexto }, "Acceso protegido · Prece.Digital")
      )
    )
  );
}

function estilosInput(conError) {
  return conError ? [styles.input, styles.inputConError] : styles.input;
}

const styles = StyleSheet.create({
  pagina: {
    flex: 1,
    backgroundColor: COLORES.fondoApp
  },
  contenido: {
    flexGrow: 1,
    justifyContent: "center",
    padding: ESPACIOS.lg,
    paddingVertical: ESPACIOS.xxl
  },
  tarjeta: {
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
    backgroundColor: COLORES.blanco,
    borderColor: COLORES.borde,
    borderRadius: RADIOS.tarjeta,
    borderWidth: 1.5,
    paddingHorizontal: ESPACIOS.xxl,
    paddingVertical: ESPACIOS.xxl,
    gap: ESPACIOS.md,
    shadowColor: "#0f172a",
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 4
  },
  barraSuperior: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: ESPACIOS.sm
  },
  eyebrow: {
    ...TIPOGRAFIA.eyebrow,
    color: COLORES.textoSuave,
    textTransform: "uppercase"
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORES.azulFondo,
    borderColor: COLORES.azulBorde,
    borderWidth: 1,
    borderRadius: RADIOS.chip,
    paddingHorizontal: 10,
    paddingVertical: 3
  },
  badgePunto: {
    width: 6,
    height: 6,
    borderRadius: RADIOS.chip,
    backgroundColor: COLORES.azul
  },
  badgeTexto: {
    ...TIPOGRAFIA.badge,
    color: COLORES.azulOscuro,
    textTransform: "uppercase"
  },
  titulo: {
    ...TIPOGRAFIA.titulo,
    color: COLORES.titulo
  },
  subtitulo: {
    ...TIPOGRAFIA.subtitulo,
    color: COLORES.textoSuave,
    lineHeight: 19,
    marginTop: ESPACIOS.xs
  },
  divisor: {
    height: 1,
    backgroundColor: COLORES.divisor
  },
  alerta: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: COLORES.alertaFondo,
    borderColor: COLORES.alertaBorde,
    borderLeftColor: COLORES.alertaBarra,
    borderWidth: 1,
    borderLeftWidth: 3.5,
    borderRadius: RADIOS.alerta,
    paddingHorizontal: ESPACIOS.md,
    paddingVertical: ESPACIOS.sm
  },
  alertaIcono: {
    width: 8,
    height: 8,
    marginTop: 4,
    borderRadius: RADIOS.chip,
    backgroundColor: COLORES.alertaBarra
  },
  alertaContenido: {
    flex: 1,
    gap: 2
  },
  alertaTitulo: {
    ...TIPOGRAFIA.alertaTitulo,
    color: COLORES.errorFuerte
  },
  alertaDesc: {
    ...TIPOGRAFIA.alertaTexto,
    color: COLORES.alertaBorde,
    lineHeight: 15
  },
  campo: {
    gap: 5,
    marginTop: ESPACIOS.xs
  },
  etiqueta: {
    ...TIPOGRAFIA.etiqueta,
    color: COLORES.texto
  },
  requerido: {
    color: COLORES.alertaBarra,
    fontWeight: "800"
  },
  grupoInput: {
    justifyContent: "center"
  },
  input: {
    height: ALTO_CAMPO,
    borderColor: COLORES.azulBorde,
    borderWidth: 1.5,
    borderRadius: RADIOS.campo,
    backgroundColor: COLORES.azulFondo,
    paddingLeft: ESPACIOS.lg,
    paddingRight: ESPACIOS.lg,
    color: COLORES.titulo,
    ...TIPOGRAFIA.input
  },
  inputConError: {
    borderColor: COLORES.errorBorde,
    backgroundColor: COLORES.errorFondo,
    paddingRight: 76
  },
  togglePassword: {
    position: "absolute",
    right: ESPACIOS.md,
    paddingVertical: 2,
    paddingHorizontal: ESPACIOS.xs
  },
  togglePasswordPresionado: {
    opacity: 0.55
  },
  togglePasswordTexto: {
    ...TIPOGRAFIA.enlace,
    color: COLORES.textoSuave
  },
  errorCampo: {
    ...TIPOGRAFIA.errorCampo,
    color: COLORES.error,
    lineHeight: 14
  },
  enlaces: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: ESPACIOS.md
  },
  enlace: {
    paddingVertical: ESPACIOS.xs
  },
  enlacePresionado: {
    opacity: 0.6
  },
  enlaceTexto: {
    ...TIPOGRAFIA.enlace,
    color: COLORES.textoSuave,
    textDecorationLine: "underline"
  },
  boton: {
    height: ALTO_BOTON,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORES.boton,
    borderRadius: RADIOS.boton,
    marginTop: ESPACIOS.xs,
    shadowColor: COLORES.boton,
    shadowOpacity: 0.22,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3
  },
  botonPresionado: {
    backgroundColor: COLORES.botonPresionado
  },
  botonEnviando: {
    opacity: 0.75
  },
  botonContenido: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: ESPACIOS.sm
  },
  botonTexto: {
    ...TIPOGRAFIA.boton,
    color: COLORES.blanco
  },
  pie: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6
  },
  pieTexto: {
    ...TIPOGRAFIA.pie,
    color: COLORES.textoSuave,
    textAlign: "center"
  }
});