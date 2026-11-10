/* App movil de Prece Digital - sector Alumno.
   Flujo: login unico (usuario o DNI) -> si la cuenta no es de alumno se cierra
   el acceso -> portal del alumno. El Backend es quien autoriza cada dato. */

import React from "react";
import { ActivityIndicator, StatusBar, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";

import LoginScreen from "../modules/auth/LoginScreen.js";
import BloqueoScreen from "../modules/auth/BloqueoScreen.js";
import { ESTADO_ANONIMO, ESTADO_AUTENTICADO, ESTADO_BLOQUEADO, ProveedorDeSesion, useSesion } from "../modules/auth/SesionContext.js";
import PortalAlumno from "../modules/alumno/PortalAlumno.js";
import { Boton, Tarjeta } from "../modules/alumno/componentes.js";
import { resolverBaseUrlDeDesarrollo } from "../config/api-host.js";
import { instalarBiometria } from "../services/adaptador-biometria.js";
import { instalarAlmacenamientoSeguro } from "../services/adaptador-secure-store.js";
import { COLORES, PORTAL } from "../theme/tokens.js";
import { esAlumno } from "../utils/alumno-reglas.js";

const h = React.createElement;

/* El almacen seguro se resuelve de forma perezosa: solo se toca cuando hace
   falta leer o escribir un token. */
instalarAlmacenamientoSeguro();
instalarBiometria();
resolverBaseUrlDeDesarrollo();

function PantallaDeEspera() {
  return h(View, { style: estilos.espera }, h(ActivityIndicator, { color: PORTAL.bordo2, size: "large" }));
}

/* Una cuenta de personal no tiene nada que hacer en esta app: se le explica y
   puede cerrar la sesion. No se consulta ningun dato del portal. */
function SoloAlumnos({ cerrarSesion }) {
  return h(
    View,
    { style: estilos.centrado },
    h(
      Tarjeta,
      { titulo: "Esta app es solo para alumnos" },
      h(Text, { style: estilos.texto }, "Tu cuenta no corresponde a un alumno. El personal debe ingresar desde el sistema web."),
      h(Boton, { texto: "Cerrar sesión", onPress: cerrarSesion })
    )
  );
}

function Contenido() {
  const { estado, sesion, cerrarSesion, desbloquear, usarPassword, nombreBiometria } = useSesion();

  if (estado === ESTADO_ANONIMO) return h(LoginScreen, null);
  if (estado === ESTADO_BLOQUEADO) return h(BloqueoScreen, { nombre: nombreBiometria, onDesbloquear: desbloquear, onUsarPassword: usarPassword });
  if (estado !== ESTADO_AUTENTICADO) return h(PantallaDeEspera, null);
  if (!esAlumno(sesion.roles)) return h(SoloAlumnos, { cerrarSesion });

  return h(PortalAlumno, null);
}

function Marco() {
  const insets = useSafeAreaInsets();

  return h(
    View,
    { style: [estilos.raiz, { paddingTop: insets.top }] },
    h(StatusBar, { barStyle: "light-content", backgroundColor: PORTAL.bordo }),
    h(View, { style: [estilos.cuerpo, { paddingBottom: insets.bottom }] }, h(ProveedorDeSesion, null, h(Contenido, null)))
  );
}

export default function App() {
  return h(SafeAreaProvider, null, h(Marco, null));
}

const estilos = StyleSheet.create({
  raiz: { flex: 1, backgroundColor: PORTAL.bordo },
  cuerpo: { flex: 1, backgroundColor: COLORES.fondoApp },
  espera: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORES.fondoApp },
  centrado: { flex: 1, justifyContent: "center", padding: 16 },
  texto: { fontSize: 14, color: PORTAL.subtitulo, lineHeight: 20 }
});
