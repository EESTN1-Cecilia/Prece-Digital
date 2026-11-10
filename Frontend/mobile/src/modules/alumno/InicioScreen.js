/* Inicio: saludo, cuatro indicadores y datos personales. Solo lectura. */

import React from "react";
import { Text, View, StyleSheet } from "react-native";

import { obtenerBoletin, obtenerPerfil } from "../../services/alumno-api.js";
import { PORTAL } from "../../theme/tokens.js";
import { contarAprobadas, mayuscula, textoTaller } from "../../utils/alumno-reglas.js";
import { Cargando, ErrorCarga, Indicador, Pantalla, Tarjeta, Nota, h, useDatos } from "./componentes.js";

const sinRegistros = (valor, texto) => (valor === null || valor === undefined ? undefined : valor ? texto : "Sin registros hasta el momento");

function Dato({ etiqueta, valor }) {
  return h(
    View,
    { style: estilos.dato },
    h(Text, { style: estilos.datoEtiqueta }, etiqueta),
    h(Text, { style: estilos.datoValor, selectable: true }, valor ?? "—")
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
      h(Text, { style: estilos.saludoTitulo, accessibilityRole: "header" }, `¡Hola, ${alumno.nombre}!`),
      h(Text, { style: estilos.saludoCiclo }, `Ciclo lectivo ${alumno.cicloLectivo}`)
    ),
    h(
      View,
      { style: estilos.grilla },
      h(Indicador, { titulo: "Ausentes", valor: resumen.ausentes, detalle: sinRegistros(resumen.ausentes, "Inasistencias registradas"), tono: resumen.ausentes ? "alerta" : "ok", onPress: () => irA("asistencias") }),
      h(Indicador, { titulo: "Materias con TEP", valor: resumen.materiasConTep, detalle: sinRegistros(resumen.materiasConTep, "Trayectoria en proceso"), tono: resumen.materiasConTep ? "alerta" : "ok", onPress: () => irA("reportes", "situacion") }),
      h(Indicador, { titulo: "Materias aprobadas", valor: aprobadas, detalle: boletin.error ? "No se pudo cargar" : aprobadas === null ? "Cargando..." : sinRegistros(aprobadas, "En el ciclo actual"), tono: "ok", onPress: () => irA("boletin") }),
      h(Indicador, { titulo: "Previas pendientes", valor: resumen.previasPendientes, detalle: sinRegistros(resumen.previasPendientes, "De ciclos anteriores"), tono: resumen.previasPendientes ? "pendiente" : "ok", onPress: () => irA("reportes", "previas") })
    ),
    h(
      Tarjeta,
      { titulo: "Mis datos" },
      h(Dato, { etiqueta: "Apellido y nombre", valor: alumno.nombreCompleto }),
      h(Dato, { etiqueta: "DNI", valor: alumno.dni }),
      h(Dato, { etiqueta: "Curso y división", valor: alumno.cursoDivision }),
      h(Dato, { etiqueta: "Turno", valor: mayuscula(alumno.turno) }),
      h(Dato, { etiqueta: "Orientación", valor: alumno.orientacion ?? (alumno.curso <= 3 ? "Ciclo Básico" : null) }),
      h(Dato, { etiqueta: "Ciclo lectivo", valor: alumno.cicloLectivo }),
      h(Dato, { etiqueta: "Grupo de taller", valor: textoTaller(alumno.grupoTaller) }),
      h(Nota, null, "Si algún dato no es correcto, acercate a Secretaría: desde la app no se pueden modificar.")
    )
  );
}

const estilos = StyleSheet.create({
  saludo: { backgroundColor: PORTAL.bordo, borderRadius: 16, padding: 18, gap: 2 },
  saludoTitulo: { fontSize: 26, fontWeight: "800", color: PORTAL.blanco },
  saludoCiclo: { fontSize: 14, color: PORTAL.rojoClaro },
  grilla: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  dato: { gap: 1, borderBottomColor: PORTAL.linea, borderBottomWidth: StyleSheet.hairlineWidth, paddingBottom: 8 },
  datoEtiqueta: { fontSize: 12, color: PORTAL.subtitulo, fontWeight: "600" },
  datoValor: { fontSize: 15, color: PORTAL.titulo, fontWeight: "600" }
});
