/* Mis Reportes: accesos a boletín, asistencias, situación académica y previas (igual que la web). */

import React, { useState } from "react";
import { Text, View, StyleSheet, Pressable } from "react-native";

import { obtenerPrevias, obtenerSituacion } from "../../services/alumno-api.js";
import { PORTAL } from "../../theme/tokens.js";
import { fechaCorta, filtrarSituacion, tonoDeEstado } from "../../utils/alumno-reglas.js";
import { Cargando, Chips, Encabezado, ErrorCarga, Indicador, Insignia, Nota, Pantalla, Tarjeta, Vacio, h, useDatos } from "./componentes.js";

function Situacion() {
  const [soloRevisar, setSoloRevisar] = useState(true);
  const { cargando, error, datos, recargar } = useDatos(() => obtenerSituacion(), []);

  if (cargando && !datos) return h(Cargando);
  if (error && !datos) return h(ErrorCarga, { error, onReintentar: recargar });

  const { filas, totales, aclaracion, materiasSinCalificacion } = datos;
  const visibles = filtrarSituacion(filas, soloRevisar);

  return h(
    View,
    { style: { gap: 14 } },
    h(
      View,
      { style: estilos.grilla },
      h(Indicador, { titulo: "Materias con TEP", valor: totales.conTep, tono: totales.conTep ? "alerta" : "neutro" }),
      h(Indicador, { titulo: "Nota menor a 6", valor: totales.debajoDe6, tono: totales.debajoDe6 ? "peligro" : "neutro" }),
      h(Indicador, { titulo: "Pendientes", valor: totales.pendientes, tono: totales.pendientes ? "pendiente" : "neutro" }),
      h(Indicador, { titulo: "Períodos aprobados", valor: totales.aprobadas, tono: "ok" })
    ),
    h(
      Tarjeta,
      { titulo: "Detalle por materia" },
      h(Chips, { opciones: [{ valor: true, etiqueta: "A revisar" }, { valor: false, etiqueta: "Todas" }], valor: soloRevisar, onCambiar: setSoloRevisar }),
      visibles.length === 0
        ? h(Vacio, { titulo: soloRevisar ? "No tenés materias con TEP, notas menores a 6 ni pendientes." : "Todavía no hay calificaciones registradas." })
        : visibles.map((fila, indice) =>
            h(
              View,
              { key: `${fila.materiaId}-${fila.periodo}-${indice}`, style: estilos.fila },
              h(
                View,
                { style: { flex: 1, gap: 2 } },
                h(Text, { style: estilos.titulo }, fila.materia),
                h(Text, { style: estilos.detalle }, `${fila.periodo}${fila.docente ? ` · ${fila.docente}` : ""}`),
                fila.calificacion !== null && fila.calificacion !== undefined ? h(Text, { style: estilos.detalle }, `Calificación: ${fila.calificacion}`) : null
              ),
              h(Insignia, { texto: fila.estadoEtiqueta, tono: tonoDeEstado(fila.estado) })
            )
          ),
      !soloRevisar && materiasSinCalificacion.length
        ? h(Nota, null, `Sin calificaciones registradas todavía: ${materiasSinCalificacion.map((materia) => materia.materia).join(", ")}.`)
        : null,
      h(Nota, null, `${aclaracion} En cada período se toma la última calificación que registró el docente.`)
    )
  );
}

function Previa({ previa }) {
  const [abierta, setAbierta] = useState(false);
  const aprobada = previa.estado === "aprobada";

  return h(
    View,
    { style: estilos.fila2 },
    h(
      View,
      { style: estilos.filaCabecera },
      h(View, { style: { flex: 1 } }, h(Text, { style: estilos.titulo }, previa.materia), h(Text, { style: estilos.detalle }, `Cursada en ${previa.anioCursada}${previa.cursoOrigen?.etiqueta ? ` · ${previa.cursoOrigen.etiqueta}` : ""}`)),
      h(Insignia, { texto: previa.estadoEtiqueta, tono: aprobada ? "ok" : "pendiente" })
    ),
    h(Text, { style: estilos.detalle }, `Última instancia: ${previa.fechaUltimaInstancia ? fechaCorta(previa.fechaUltimaInstancia) : "sin instancias registradas"}`),
    previa.observaciones ? h(Nota, null, previa.observaciones) : null,
    previa.instancias?.length
      ? h(
          View,
          { style: { gap: 4 } },
          h(Pressable, { onPress: () => setAbierta((v) => !v), accessibilityRole: "button", accessibilityState: { expanded: abierta } }, h(Text, { style: estilos.enlace }, abierta ? "Ocultar instancias" : `Ver instancias de recuperación (${previa.instancias.length})`)),
          abierta ? previa.instancias.map((instancia, i) => h(Text, { key: i, style: estilos.detalle }, `${fechaCorta(instancia.fecha)} · ${instancia.estadoEtiqueta ?? "Sin estado"}${instancia.observaciones ? ` · ${instancia.observaciones}` : ""}`)) : null
        )
      : null
  );
}

function Previas() {
  const { cargando, error, datos, recargar } = useDatos(() => obtenerPrevias(), []);

  if (cargando && !datos) return h(Cargando);
  if (error && !datos) return h(ErrorCarga, { error, onReintentar: recargar });

  const { pendientes, aprobadas } = datos;

  return h(
    View,
    { style: { gap: 14 } },
    h(
      Tarjeta,
      { titulo: `Pendientes (${pendientes.length})` },
      pendientes.length
        ? pendientes.map((previa) => h(Previa, { key: previa.id, previa }))
        : h(Vacio, { titulo: "No tenés materias previas pendientes.", descripcion: "Una nota baja durante el año no es una previa." })
    ),
    aprobadas.length ? h(Tarjeta, { titulo: `Aprobadas (${aprobadas.length})` }, aprobadas.map((previa) => h(Previa, { key: previa.id, previa }))) : null,
    h(Nota, null, "Las fechas de mesas de examen las informa Secretaría. Una materia deja de figurar como pendiente cuando la aprobación queda registrada.")
  );
}

const REPORTES = [
  { clave: "boletin", titulo: "Boletín", texto: "Calificaciones por período y estado de cada materia. Se imprime en A4." },
  { clave: "asistencias", titulo: "Asistencias", texto: "Inasistencias, llegadas tarde y retiros anticipados, con su justificación." },
  { clave: "situacion", titulo: "Situación académica", texto: "Materias con TEP, notas menores a 6 y materias pendientes." },
  { clave: "previas", titulo: "Previas", texto: "Materias pendientes de aprobación de ciclos anteriores." }
];

export default function ReportesScreen({ irA, sub = null }) {
  const [seccion, setSeccion] = useState(sub === "situacion" || sub === "previas" ? sub : null);

  const abrir = (clave) => (clave === "situacion" || clave === "previas" ? setSeccion(clave) : irA(clave));

  if (seccion) {
    return h(
      Pantalla,
      null,
      h(Pressable, { onPress: () => setSeccion(null), accessibilityRole: "button" }, h(Text, { style: estilos.enlace }, "← Mis Reportes")),
      h(Encabezado, { titulo: seccion === "situacion" ? "Mi Situación Académica" : "Mis Previas", descripcion: seccion === "situacion" ? "Materias con TEP, notas menores a 6 y pendientes." : "Materias pendientes de ciclos anteriores." }),
      seccion === "situacion" ? h(Situacion) : h(Previas)
    );
  }

  return h(
    Pantalla,
    null,
    h(Encabezado, { titulo: "Mis Reportes", descripcion: "Consultá e imprimí tus informes académicos." }),
    REPORTES.map((reporte) =>
      h(
        Pressable,
        { key: reporte.clave, onPress: () => abrir(reporte.clave), accessibilityRole: "button", style: ({ pressed }) => [estilos.reporte, pressed && { opacity: 0.85 }] },
        h(View, { style: { flex: 1, gap: 2 } }, h(Text, { style: estilos.titulo }, reporte.titulo), h(Text, { style: estilos.detalle }, reporte.texto)),
        h(Text, { style: estilos.chevron }, "›")
      )
    )
  );
}

const estilos = StyleSheet.create({
  grilla: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  fila: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8, borderTopColor: PORTAL.linea, borderTopWidth: StyleSheet.hairlineWidth },
  fila2: { gap: 6, paddingVertical: 8, borderTopColor: PORTAL.linea, borderTopWidth: StyleSheet.hairlineWidth },
  filaCabecera: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  titulo: { fontSize: 15, fontWeight: "800", color: PORTAL.titulo },
  detalle: { fontSize: 12.5, color: PORTAL.subtitulo },
  reporte: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: PORTAL.linea, backgroundColor: PORTAL.blanco },
  chevron: { fontSize: 26, color: PORTAL.bordo2 },
  enlace: { fontSize: 13, fontWeight: "700", color: PORTAL.bordo2, textDecorationLine: "underline" }
});
