import React from "react";
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, View } from "react-native";
import { modules } from "../../../../Shared/src/domain.mjs";

import LoginScreen from "../modules/auth/LoginScreen.js";
import { ESTADO_ANONIMO, ESTADO_AUTENTICADO, ProveedorDeSesion, useSesion } from "../modules/auth/SesionContext.js";
import { instalarAlmacenamientoSeguro } from "../services/adaptador-secure-store.js";
import { ALTO_BOTON, COLORES, ESPACIOS, RADIOS, TIPOGRAFIA } from "../theme/tokens.js";

const h = React.createElement;

/* El almacen seguro se resuelve de forma perezosa: solo se toca cuando hace
   falta leer o escribir un token. */
instalarAlmacenamientoSeguro();

function PantallaDeEspera() {
  return h(
    View,
    { style: styles.espera },
    h(ActivityIndicator, { color: COLORES.navy, size: "large" })
  );
}

function SesionActual({ sesion, cerrarSesion, cerrando }) {
  const nombre = sesion.usuario?.displayName || sesion.usuario?.email || "";

  return h(
    ScrollView,
    { contentContainerStyle: styles.contenedor },
    h(Text, { style: styles.brand }, "Prece Digital"),
    h(Text, { style: styles.titulo }, "Asistencia movil"),

    h(
      View,
      { style: styles.tarjetaSesion },
      h(Text, { style: styles.tarjetaSesionEtiqueta }, "Sesion activa"),
      h(Text, { style: styles.tarjetaSesionNombre }, nombre),
      sesion.usuario?.email ? h(Text, { style: styles.tarjetaSesionDetalle }, sesion.usuario.email) : null,
      h(
        Text,
        { style: styles.tarjetaSesionDetalle },
        sesion.roles.length ? `Roles: ${sesion.roles.join(", ")}` : "Roles: sin identificar"
      ),
      h(
        Pressable,
        {
          onPress: cerrarSesion,
          disabled: cerrando,
          accessibilityRole: "button",
          accessibilityState: { disabled: cerrando, busy: cerrando },
          style: ({ pressed }) => [styles.botonCerrar, pressed && styles.botonCerrarPresionado]
        },
        h(
          View,
          { style: styles.botonCerrarContenido },
          cerrando ? h(ActivityIndicator, { color: COLORES.blanco, size: "small" }) : null,
          h(Text, { style: styles.botonCerrarTexto }, cerrando ? "Cerrando sesion..." : "Cerrar sesion")
        )
      )
    ),

    modules.map((module) =>
      h(
        View,
        { key: module.id, style: styles.card },
        h(Text, { style: styles.cardTitle }, module.name),
        h(Text, { style: styles.cardBody }, module.description)
      )
    )
  );
}

function Contenido() {
  const { estado, sesion, cerrarSesion } = useSesion();

  if (estado === ESTADO_ANONIMO) {
    return h(LoginScreen, null);
  }

  if (estado !== ESTADO_AUTENTICADO) {
    return h(PantallaDeEspera, null);
  }

  return h(SesionActual, { sesion, cerrarSesion, cerrando: false });
}

export default function App() {
  return h(
    SafeAreaView,
    { style: styles.safeArea },
    h(StatusBar, { barStyle: "dark-content" }),
    h(
      ProveedorDeSesion,
      null,
      h(Contenido, null)
    )
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORES.fondoApp
  },
  espera: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORES.fondoApp
  },
  contenedor: {
    gap: 12,
    padding: ESPACIOS.xl
  },
  brand: {
    color: COLORES.indigo,
    fontSize: 13,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.6
  },
  titulo: {
    color: COLORES.ink,
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 8
  },
  tarjetaSesion: {
    backgroundColor: COLORES.papel,
    borderColor: COLORES.linea,
    borderRadius: RADIOS.tarjeta,
    borderWidth: 1,
    padding: ESPACIOS.lg,
    gap: ESPACIOS.xs
  },
  tarjetaSesionEtiqueta: {
    ...TIPOGRAFIA.eyebrow,
    color: COLORES.textoSuave,
    textTransform: "uppercase"
  },
  tarjetaSesionNombre: {
    color: COLORES.titulo,
    fontSize: 18,
    fontWeight: "800"
  },
  tarjetaSesionDetalle: {
    color: COLORES.textoSuave,
    fontSize: 13,
    fontWeight: "500"
  },
  botonCerrar: {
    height: ALTO_BOTON,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORES.boton,
    borderRadius: RADIOS.boton,
    marginTop: ESPACIOS.md
  },
  botonCerrarPresionado: {
    backgroundColor: COLORES.botonPresionado
  },
  botonCerrarContenido: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: ESPACIOS.sm
  },
  botonCerrarTexto: {
    ...TIPOGRAFIA.boton,
    color: COLORES.blanco
  },
  card: {
    backgroundColor: COLORES.blanco,
    borderColor: COLORES.borde,
    borderRadius: RADIOS.alerta,
    borderWidth: 1,
    padding: ESPACIOS.lg
  },
  cardTitle: {
    color: COLORES.ink,
    fontSize: 16,
    fontWeight: "800",
    marginBottom: ESPACIOS.xs
  },
  cardBody: {
    color: COLORES.textoSuave,
    fontSize: 14,
    lineHeight: 20
  }
});