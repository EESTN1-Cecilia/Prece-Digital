/* Inicio: saludo, cuatro indicadores y datos personales. Solo lectura.
   Mismo diseño que la versión celular de la web (Frontend/web/src/styles/alumno-portal/portal.css). */

import React from "react";
import { Pressable, Text, View, StyleSheet } from "react-native";

import { obtenerBoletin, obtenerPerfil } from "../../services/alumno-api.js";
import { contarAprobadas, mayuscula, textoTaller } from "../../utils/alumno-reglas.js";
import { Cargando, ErrorCarga, Pantalla, h, useDatos } from "./componentes.js";
import { Icono } from "./iconos.js";

/* Colores del portal web (portal.css). */
const C = {
  bordo: "#7a2530",
  titulo: "#1d2a44",
  suave: "#5b6b86",
  etiqueta: "#6b7a93",
  gris: "#8c8c8c",
  linea: "#e3dfdf",
  iconoFondo: "#f3dfe1"
};

/* Tono de cada indicador: color del borde/ícono, fondo del ícono y color del valor. */
const TONOS = {
  neutro: { color: C.bordo, fondo: C.iconoFondo },
  peligro: { color: "#a3261b", fondo: "#fbe9e7" },
  alerta: { color: "#8a5a00", fondo: "#fdf3dc", borde: "#c98a00", valor: "#a16b00" },
  ok: { color: "#1f6b3a", fondo: "#e7f4ec" },
  pendiente: { color: "#3f3d8f", fondo: "#ecebf8" }
};

function Indicador({ icono, titulo, valor, detalle, detalleVacio, tono = "neutro", onPress }) {
  const t = TONOS[tono] ?? TONOS.neutro;
  const activo = Boolean(valor);
  const texto = valor === null || valor === undefined ? (detalleVacio ?? "") : valor ? detalle : "Sin registros hasta el momento";

  return h(
    Pressable,
    {
      onPress,
      accessibilityRole: "button",
      accessibilityLabel: `${titulo}: ${valor ?? "sin dato"}`,
      style: ({ pressed }) => [estilos.kpi, { borderLeftColor: t.borde ?? t.color }, pressed && estilos.presionado]
    },
    h(
      View,
      { style: estilos.kpiArriba },
      h(View, { style: [estilos.kpiIcono, { backgroundColor: t.fondo }] }, h(Icono, { nombre: icono, tamano: 19, color: t.color })),
      h(Text, { style: [estilos.kpiValor, activo && { color: t.valor ?? t.color }] }, String(valor ?? "—"))
    ),
    h(
      View,
      { style: estilos.kpiCuerpo },
      h(Text, { style: estilos.kpiTitulo, numberOfLines: 1 }, titulo.toUpperCase()),
      h(Text, { style: estilos.kpiDetalle, numberOfLines: 1 }, texto)
    )
  );
}

function Dato({ icono, etiqueta, valor, ancho }) {
  return h(
    View,
    { style: [estilos.dato, ancho && estilos.datoAncho] },
    h(Icono, { nombre: icono, tamano: 20, color: C.bordo }),
    h(
      View,
      { style: { flex: 1, minWidth: 0 } },
      h(Text, { style: estilos.datoEtiqueta }, etiqueta.toUpperCase()),
      h(Text, { style: estilos.datoValor, selectable: true }, String(valor ?? "—"))
    )
  );
}

export default function InicioScreen({ irA }) {
  const perfil = useDatos(() => obtenerPerfil(), []);
  const boletin = useDatos(() => obtenerBoletin(), []);

  if (perfil.cargando && !perfil.datos) return h(Cargando);
  if (perfil.error && !perfil.datos) return h(Pantalla, null, h(ErrorCarga, { error: perfil.error, onReintentar: perfil.recargar }));

  const { datosPersonales: alumno, resumen } = perfil.datos;
  const aprobadas = boletin.datos ? contarAprobadas(boletin.datos.materias) : null;

  return h(
    Pantalla,
    { refrescando: perfil.cargando, onRefrescar: () => { perfil.recargar(); boletin.recargar(); } },
    h(
      View,
      { style: estilos.saludo },
      h(
        Text,
        { style: estilos.saludoTitulo, accessibilityRole: "header" },
        "¡Hola, ",
        h(Text, { style: { color: C.bordo } }, `${alumno.nombre}!`)
      ),
      h(Text, { style: estilos.saludoCiclo }, `Ciclo lectivo ${alumno.cicloLectivo}`),
      h(View, { style: estilos.linea })
    ),
    h(
      View,
      { style: estilos.grilla },
      h(Indicador, { icono: "usuario", titulo: "Ausentes", valor: resumen.ausentes, detalle: "Inasistencias registradas", tono: resumen.ausentes ? "peligro" : "neutro", onPress: () => irA("asistencias") }),
      h(Indicador, { icono: "libro", titulo: "Materias con TEP", valor: resumen.materiasConTep, detalle: "Trayectoria en proceso", tono: resumen.materiasConTep ? "alerta" : "neutro", onPress: () => irA("reportes", "situacion") }),
      h(Indicador, { icono: "tilde", titulo: "Materias aprobadas", valor: aprobadas, detalle: "En el ciclo actual", detalleVacio: boletin.error ? "No se pudo cargar" : "Cargando...", tono: "ok", onPress: () => irA("boletin") }),
      h(Indicador, { icono: "portapapeles", titulo: "Previas pendientes", valor: resumen.previasPendientes, detalle: "De ciclos anteriores", tono: resumen.previasPendientes ? "pendiente" : "neutro", onPress: () => irA("reportes", "previas") })
    ),
    h(
      View,
      { style: estilos.misDatos },
      h(
        View,
        { style: estilos.misDatosCabecera },
        h(View, { style: [estilos.kpiIcono, { backgroundColor: C.iconoFondo }] }, h(Icono, { nombre: "usuario", tamano: 18, color: C.bordo })),
        h(
          View,
          null,
          h(Text, { style: estilos.misDatosTitulo, accessibilityRole: "header" }, "Mis datos"),
          h(View, { style: estilos.linea })
        )
      ),
      h(
        View,
        { style: estilos.misDatosGrilla },
        h(Dato, { icono: "usuario", etiqueta: "Apellido y nombre", valor: alumno.nombreCompleto, ancho: true }),
        h(Dato, { icono: "tarjeta", etiqueta: "DNI", valor: alumno.dni }),
        h(Dato, { icono: "grupo", etiqueta: "Curso y división", valor: alumno.cursoDivision }),
        h(Dato, { icono: "sol", etiqueta: "Turno", valor: mayuscula(alumno.turno) }),
        h(Dato, { icono: "birrete", etiqueta: "Orientación", valor: alumno.orientacion ?? (alumno.curso <= 3 ? "Ciclo Básico" : null) }),
        h(Dato, { icono: "calendario", etiqueta: "Ciclo lectivo", valor: alumno.cicloLectivo }),
        h(Dato, { icono: "engranaje", etiqueta: "Grupo de taller", valor: textoTaller(alumno.grupoTaller) })
      ),
      h(
        View,
        { style: estilos.nota },
        h(Icono, { nombre: "info", tamano: 18, color: C.gris }),
        h(Text, { style: estilos.notaTexto }, "Si algún dato no es correcto, acercate a Secretaría: desde el portal no se pueden modificar.")
      )
    )
  );
}

const SOMBRA = { shadowColor: "#40141c", shadowOpacity: 0.08, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 3 };

const estilos = StyleSheet.create({
  presionado: { opacity: 0.88 },
  saludo: { gap: 0 },
  saludoTitulo: { fontSize: 26, fontWeight: "800", lineHeight: 30, letterSpacing: -0.3, color: C.titulo },
  saludoCiclo: { marginTop: 4, marginBottom: 8, fontSize: 13.5, color: C.suave },
  linea: { width: 38, height: 3, borderRadius: 2, backgroundColor: C.bordo },
  grilla: { flexDirection: "row", flexWrap: "wrap", columnGap: 8, rowGap: 10 },
  kpi: { flexBasis: "47%", flexGrow: 1, minHeight: 104, justifyContent: "space-between", gap: 8, paddingTop: 12, paddingBottom: 11, paddingHorizontal: 11, backgroundColor: "#fff", borderRadius: 14, borderLeftWidth: 5, ...SOMBRA },
  kpiArriba: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  kpiIcono: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  kpiValor: { fontSize: 26, fontWeight: "800", lineHeight: 28, color: C.titulo },
  kpiCuerpo: { gap: 2 },
  kpiTitulo: { fontSize: 11, lineHeight: 14, fontWeight: "700", letterSpacing: 0.15, color: C.suave },
  kpiDetalle: { fontSize: 10, lineHeight: 12.5, color: C.gris },
  misDatos: { backgroundColor: "#fff", borderRadius: 16, paddingTop: 16, paddingHorizontal: 14, paddingBottom: 14, ...SOMBRA },
  misDatosCabecera: { flexDirection: "row", alignItems: "center", gap: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: C.linea },
  misDatosTitulo: { fontSize: 18, fontWeight: "800", color: C.titulo, marginBottom: 3 },
  misDatosGrilla: { flexDirection: "row", flexWrap: "wrap", columnGap: 10, rowGap: 14, paddingTop: 14, paddingBottom: 6 },
  dato: { flexBasis: "47%", flexGrow: 1, flexDirection: "row", alignItems: "flex-start", gap: 10, minWidth: 0 },
  datoAncho: { flexBasis: "100%" },
  datoEtiqueta: { fontSize: 10.5, fontWeight: "700", letterSpacing: 0.2, color: C.etiqueta },
  datoValor: { marginTop: 2, fontSize: 14, fontWeight: "700", color: C.titulo },
  nota: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: C.linea },
  notaTexto: { flex: 1, fontSize: 11.5, lineHeight: 16, color: C.gris }
});
