/* Marco del portal del alumno: encabezado, contenido y barra inferior.
   Primero consulta la cuenta: con la contrasena inicial solo se muestra la
   configuracion obligatoria (el Backend igual rechaza los datos academicos). */

import React, { useCallback, useEffect, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { obtenerCuenta } from "../../services/alumno-api.js";
import { PORTAL } from "../../theme/tokens.js";
import { useSesion } from "../auth/SesionContext.js";
import AsistenciasScreen from "./AsistenciasScreen.js";
import BoletinScreen from "./BoletinScreen.js";
import ConfigurarCuentaScreen from "./ConfigurarCuentaScreen.js";
import CuentaScreen from "./CuentaScreen.js";
import InicioScreen from "./InicioScreen.js";
import NovedadesScreen from "./NovedadesScreen.js";
import ReportesScreen from "./ReportesScreen.js";
import { Cargando, ErrorCarga, Pantalla, h } from "./componentes.js";

export const SECCIONES = [
  { clave: "inicio", titulo: "Inicio", Vista: InicioScreen },
  { clave: "boletin", titulo: "Boletín", Vista: BoletinScreen },
  { clave: "asistencias", titulo: "Asistencias", Vista: AsistenciasScreen },
  { clave: "novedades", titulo: "Novedades", Vista: NovedadesScreen },
  { clave: "reportes", titulo: "Reportes", Vista: ReportesScreen },
  { clave: "cuenta", titulo: "Cuenta", Vista: CuentaScreen }
];

export default function PortalAlumno() {
  const { cerrarSesion } = useSesion();
  const [cuenta, setCuenta] = useState(null);
  const [error, setError] = useState(null);
  const [destino, setDestino] = useState({ seccion: "inicio", sub: null });
  const seccion = destino.seccion;
  const setSeccion = useCallback((clave, sub = null) => setDestino({ seccion: clave, sub }), []);

  const cargar = useCallback(() => {
    setError(null);
    obtenerCuenta().then(setCuenta, setError);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const nombre = cuenta ? `${cuenta.nombre ?? ""} ${cuenta.apellido ?? ""}`.trim() : "";
  const configurada = cuenta && !cuenta.debeCambiarPassword;
  const actual = SECCIONES.find((item) => item.clave === seccion) ?? SECCIONES[0];

  let contenido;

  if (error) {
    contenido = h(Pantalla, null, h(ErrorCarga, { error, onReintentar: cargar }));
  } else if (!cuenta) {
    contenido = h(Cargando);
  } else if (!configurada) {
    contenido = h(ConfigurarCuentaScreen, { cuenta, onConfigurada: setCuenta });
  } else {
    contenido = h(actual.Vista, { key: `${seccion}-${destino.sub ?? ""}`, sub: destino.sub, irA: setSeccion, cuenta, onCuentaActualizada: setCuenta, onSalir: cerrarSesion });
  }

  return h(
    View,
    { style: estilos.raiz },
    h(
      View,
      { style: estilos.cabecera },
      h(Image, { source: require("../../../assets/logo-chico.png"), style: estilos.logo, accessibilityLabel: "Logo de la E.E.S. Técnica N° 1", resizeMode: "contain" }),
      h(
        View,
        { style: { flex: 1 } },
        h(Text, { style: estilos.escuela }, "E.E.S. TÉCNICA N°1"),
        h(Text, { style: estilos.portal }, "Portal del alumno")
      ),
      nombre ? h(Text, { style: estilos.nombre, numberOfLines: 1 }, nombre) : null
    ),
    h(View, { style: { flex: 1 } }, contenido),
    configurada
      ? h(
          View,
          { style: estilos.barra, accessibilityRole: "tablist" },
          SECCIONES.map((item) =>
            h(
              Pressable,
              {
                key: item.clave,
                onPress: () => setSeccion(item.clave),
                accessibilityRole: "tab",
                accessibilityState: { selected: item.clave === seccion },
                style: estilos.pestana
              },
              h(Text, { numberOfLines: 1, adjustsFontSizeToFit: true, style: [estilos.pestanaTexto, item.clave === seccion && estilos.pestanaActiva] }, item.titulo)
            )
          )
        )
      : null
  );
}

const estilos = StyleSheet.create({
  raiz: { flex: 1, backgroundColor: PORTAL.fondo },
  cabecera: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: PORTAL.bordo, paddingHorizontal: 16, paddingVertical: 12 },
  logo: { width: 40, height: 40 },
  escuela: { fontSize: 11, fontWeight: "800", letterSpacing: 0.6, color: PORTAL.rojoClaro },
  portal: { fontSize: 17, fontWeight: "800", color: PORTAL.blanco },
  nombre: { maxWidth: "45%", fontSize: 13, fontWeight: "600", color: PORTAL.blanco },
  barra: { flexDirection: "row", backgroundColor: PORTAL.blanco, borderTopColor: PORTAL.linea, borderTopWidth: 1 },
  pestana: { flex: 1, minHeight: 52, alignItems: "center", justifyContent: "center", paddingHorizontal: 2 },
  pestanaTexto: { fontSize: 11, fontWeight: "600", color: PORTAL.gris },
  pestanaActiva: { color: PORTAL.bordo2, fontWeight: "800" }
});
