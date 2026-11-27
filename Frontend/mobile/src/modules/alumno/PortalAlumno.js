/* Marco del portal del alumno: mismo diseño que la version celular de la web
   (Frontend/web/src/modules/alumno-portal/portal-layout.js): encabezado bordo
   con boton de menu, logo y "Salir", y menu lateral con las secciones.
   Primero consulta la cuenta: con la contrasena inicial solo se muestra la
   configuracion obligatoria (el Backend igual rechaza los datos academicos). */

import React, { useCallback, useEffect, useState } from "react";
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { obtenerCuenta } from "../../services/alumno-api.js";
import { useSesion } from "../auth/SesionContext.js";
import AsistenciasScreen from "./AsistenciasScreen.js";
import BoletinScreen from "./BoletinScreen.js";
import ConfigurarCuentaScreen from "./ConfigurarCuentaScreen.js";
import CuentaScreen from "./CuentaScreen.js";
import InicioScreen from "./InicioScreen.js";
import NovedadesScreen from "./NovedadesScreen.js";
import ReportesScreen from "./ReportesScreen.js";
import { Cargando, ErrorCarga, Pantalla, h } from "./componentes.js";
import { Icono } from "./iconos.js";

/* Mismos titulos e iconos que el menu de la web. */
export const SECCIONES = [
  { clave: "inicio", titulo: "Inicio", icono: "usuario", Vista: InicioScreen },
  { clave: "boletin", titulo: "Mi Boletín", icono: "libro", Vista: BoletinScreen },
  { clave: "asistencias", titulo: "Mis Asistencias", icono: "calendario", Vista: AsistenciasScreen },
  { clave: "novedades", titulo: "Novedades", icono: "info", Vista: NovedadesScreen },
  { clave: "reportes", titulo: "Mis Reportes", icono: "grafico", Vista: ReportesScreen },
  { clave: "cuenta", titulo: "Mi Cuenta", icono: "engranaje", Vista: CuentaScreen }
];

const C = { bordo: "#591c23", bordo2: "#7a2530", suave: "#f6eced", titulo: "#1d2a44", gris: "#8c8c8c", linea: "#e3dfdf" };

export default function PortalAlumno() {
  const { cerrarSesion } = useSesion();
  const [cuenta, setCuenta] = useState(null);
  const [error, setError] = useState(null);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [destino, setDestino] = useState({ seccion: "inicio", sub: null });
  const seccion = destino.seccion;
  const irA = useCallback((clave, sub = null) => {
    setMenuAbierto(false);
    setDestino({ seccion: clave, sub });
  }, []);

  const cargar = useCallback(() => {
    setError(null);
    obtenerCuenta().then(setCuenta, setError);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const nombre = cuenta ? `${cuenta.nombre ?? ""} ${cuenta.apellido ?? ""}`.trim() : "";
  const configurada = Boolean(cuenta && !cuenta.debeCambiarPassword);
  const actual = SECCIONES.find((item) => item.clave === seccion) ?? SECCIONES[0];

  let contenido;
  if (error) contenido = h(Pantalla, null, h(ErrorCarga, { error, onReintentar: cargar }));
  else if (!cuenta) contenido = h(Cargando);
  else if (!configurada) contenido = h(ConfigurarCuentaScreen, { cuenta, onConfigurada: setCuenta });
  else contenido = h(actual.Vista, { key: `${seccion}-${destino.sub ?? ""}`, sub: destino.sub, irA, cuenta, onCuentaActualizada: setCuenta, onSalir: cerrarSesion });

  return h(
    View,
    { style: estilos.raiz },
    /* Encabezado: [menu] [logo + textos] ............ [Salir] */
    h(
      View,
      { style: estilos.cabecera },
      configurada
        ? h(
            Pressable,
            { onPress: () => setMenuAbierto(true), accessibilityRole: "button", accessibilityLabel: "Abrir menú", style: ({ pressed }) => [estilos.botonMenu, pressed && estilos.presionado] },
            h(Icono, { nombre: "menu", tamano: 22, color: "#fff" })
          )
        : null,
      h(
        Pressable,
        { onPress: () => configurada && irA("inicio"), accessibilityRole: "button", accessibilityLabel: "Inicio del portal", style: estilos.marca },
        h(View, { style: estilos.logoCaja }, h(Image, { source: require("../../../assets/logo-chico.png"), style: estilos.logo, resizeMode: "contain", accessibilityLabel: "Logo de la E.E.S. Técnica N° 1" })),
        h(View, { style: { flexShrink: 1 } }, h(Text, { style: estilos.escuela, numberOfLines: 1 }, "E.E.S. TÉCNICA N°1"), h(Text, { style: estilos.portal, numberOfLines: 1 }, "Portal del alumno"))
      ),
      h(
        Pressable,
        { onPress: cerrarSesion, accessibilityRole: "button", accessibilityLabel: "Salir", style: ({ pressed }) => [estilos.botonSalir, pressed && estilos.presionado] },
        h(Icono, { nombre: "salir", tamano: 18, color: "#fff" }),
        h(Text, { style: estilos.botonSalirTexto }, "Salir")
      )
    ),
    h(View, { style: { flex: 1 } }, contenido),

    /* Menu lateral (igual al de la web en celular). */
    h(
      Modal,
      { visible: menuAbierto && configurada, transparent: true, animationType: "fade", onRequestClose: () => setMenuAbierto(false), statusBarTranslucent: true },
      h(
        View,
        { style: estilos.menuFondo },
        h(
          View,
          { style: estilos.menu },
          h(
            View,
            { style: estilos.menuCabecera },
            h(View, { style: estilos.logoCaja }, h(Image, { source: require("../../../assets/logo-chico.png"), style: estilos.logo, resizeMode: "contain" })),
            h(View, { style: { flex: 1 } }, h(Text, { style: estilos.menuEscuela }, "E.E.S. TÉCNICA N°1"), h(Text, { style: estilos.menuPortal }, "Portal del alumno")),
            h(Pressable, { onPress: () => setMenuAbierto(false), accessibilityRole: "button", accessibilityLabel: "Cerrar menú", style: estilos.menuCerrar }, h(Icono, { nombre: "cerrar", tamano: 20, color: C.titulo }))
          ),
          h(
            ScrollView,
            { contentContainerStyle: { paddingVertical: 8 } },
            SECCIONES.map((item) => {
              const activo = item.clave === seccion;
              return h(
                Pressable,
                { key: item.clave, onPress: () => irA(item.clave), accessibilityRole: "button", accessibilityState: { selected: activo }, style: ({ pressed }) => [estilos.enlace, activo && estilos.enlaceActivo, pressed && estilos.presionado] },
                h(View, { style: [estilos.enlaceIcono, activo && { backgroundColor: C.bordo2 }] }, h(Icono, { nombre: item.icono, tamano: 18, color: activo ? "#fff" : C.bordo2 })),
                h(Text, { style: [estilos.enlaceTexto, activo && { color: C.bordo2, fontWeight: "800" }] }, item.titulo)
              );
            })
          ),
          h(
            View,
            { style: estilos.menuPie },
            nombre
              ? h(
                  View,
                  { style: estilos.usuario },
                  h(View, { style: estilos.avatar }, h(Icono, { nombre: "usuario", tamano: 18, color: C.bordo2 })),
                  h(View, { style: { flex: 1 } }, h(Text, { style: estilos.usuarioNombre, numberOfLines: 1 }, nombre), h(Text, { style: estilos.usuarioRol }, "Alumno / Estudiante"))
                )
              : null,
            h(
              Pressable,
              { onPress: () => { setMenuAbierto(false); cerrarSesion(); }, accessibilityRole: "button", style: ({ pressed }) => [estilos.cerrarSesion, pressed && estilos.presionado] },
              h(Icono, { nombre: "salir", tamano: 18, color: C.bordo2 }),
              h(Text, { style: estilos.cerrarSesionTexto }, "Cerrar sesión")
            )
          )
        ),
        h(Pressable, { style: { flex: 1 }, onPress: () => setMenuAbierto(false), accessibilityLabel: "Cerrar menú" })
      )
    )
  );
}

const estilos = StyleSheet.create({
  raiz: { flex: 1, backgroundColor: "#f7f4f4" },
  presionado: { opacity: 0.8 },
  cabecera: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: C.bordo2, paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 3, borderBottomColor: C.bordo },
  botonMenu: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.45)", backgroundColor: "rgba(255,255,255,0.08)" },
  marca: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10, minWidth: 0 },
  logoCaja: { width: 42, height: 42, borderRadius: 10, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", padding: 3 },
  logo: { width: 36, height: 36 },
  escuela: { fontSize: 14, fontWeight: "800", color: "#fff", letterSpacing: 0.3 },
  portal: { fontSize: 13, color: "rgba(255,255,255,0.9)" },
  botonSalir: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderColor: "rgba(255,255,255,0.6)", borderRadius: 10, paddingHorizontal: 12, height: 38 },
  botonSalirTexto: { color: "#fff", fontWeight: "700", fontSize: 14 },
  menuFondo: { flex: 1, flexDirection: "row", backgroundColor: "rgba(20,10,12,0.45)" },
  menu: { width: "80%", maxWidth: 320, backgroundColor: "#fff", paddingTop: 36, shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 16, elevation: 12 },
  menuCabecera: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: C.linea },
  menuEscuela: { fontSize: 14, fontWeight: "800", color: C.titulo },
  menuPortal: { fontSize: 12.5, color: C.gris },
  menuCerrar: { padding: 8 },
  enlace: { flexDirection: "row", alignItems: "center", gap: 12, marginHorizontal: 10, marginVertical: 2, paddingHorizontal: 10, paddingVertical: 10, borderRadius: 12 },
  enlaceActivo: { backgroundColor: C.suave },
  enlaceIcono: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: C.suave },
  enlaceTexto: { fontSize: 15, fontWeight: "600", color: C.titulo },
  menuPie: { borderTopWidth: 1, borderTopColor: C.linea, padding: 14, gap: 12 },
  usuario: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.suave, alignItems: "center", justifyContent: "center" },
  usuarioNombre: { fontSize: 14, fontWeight: "800", color: C.titulo },
  usuarioRol: { fontSize: 12, color: C.gris },
  cerrarSesion: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1.5, borderColor: C.bordo2, borderRadius: 999, height: 44 },
  cerrarSesionTexto: { color: C.bordo2, fontWeight: "800", fontSize: 14 }
});
