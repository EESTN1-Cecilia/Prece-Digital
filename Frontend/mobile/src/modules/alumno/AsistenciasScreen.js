/* Mis Asistencias: totales y detalle por fecha. Solo lectura. */

import React, { useState } from "react";
import { Text, View, StyleSheet } from "react-native";

import { obtenerAsistencias } from "../../services/alumno-api.js";
import { PORTAL } from "../../theme/tokens.js";
import { etiquetaMotivo, fechaCorta, filtrarAsistencias, tonoDeEstado } from "../../utils/alumno-reglas.js";
import { Cargando, Chips, Encabezado, ErrorCarga, Indicador, Insignia, Nota, Pantalla, SelectorCiclo, Tarjeta, Vacio, h, useDatos } from "./componentes.js";

const FILTROS = [
  { valor: "todos", etiqueta: "Todos" },
  { valor: "ausente", etiqueta: "Ausentes" },
  { valor: "ausente_parcial", etiqueta: "Parciales" },
  { valor: "tarde", etiqueta: "Tardes" }
];

export default function AsistenciasScreen() {
  const [anio, setAnio] = useState(null);
  const [filtro, setFiltro] = useState("todos");
  const { cargando, error, datos, recargar } = useDatos(() => obtenerAsistencias(anio), [anio]);

  if (cargando && !datos) return h(Cargando);
  if (error && !datos) return h(Pantalla, null, h(ErrorCarga, { error, onReintentar: recargar }));

  const { totales, detalle, cicloLectivo, aniosDisponibles, cursoDivision, reglaComputo } = datos;
  const filas = filtrarAsistencias(detalle, filtro);

  return h(
    Pantalla,
    { refrescando: cargando, onRefrescar: recargar },
    h(Encabezado, { titulo: "Mis Asistencias", descripcion: `${cursoDivision ?? ""} · Ciclo lectivo ${cicloLectivo}` }),
    h(SelectorCiclo, { anios: aniosDisponibles, valor: cicloLectivo, onCambiar: setAnio }),
    error ? h(ErrorCarga, { error, onReintentar: recargar }) : null,
    h(
      View,
      { style: estilos.grilla },
      h(Indicador, { titulo: "Ausentes", valor: totales.ausentes, detalle: "Jornadas completas", tono: totales.ausentes ? "alerta" : "neutro" }),
      h(Indicador, { titulo: "Justificadas", valor: totales.ausentesJustificados, detalle: totales.ausentesPendientes ? `${totales.ausentesPendientes} pendiente(s)` : "De los ausentes", tono: "ok" }),
      h(Indicador, { titulo: "Injustificadas", valor: totales.ausentesInjustificados, detalle: "De los ausentes", tono: totales.ausentesInjustificados ? "peligro" : "neutro" }),
      h(Indicador, { titulo: "Llegadas tarde", valor: totales.llegadasTarde, detalle: "No suman como ausentes" }),
      h(Indicador, { titulo: "Ausentes parciales", valor: totales.ausentesParciales, detalle: "Retiros anticipados" }),
      h(Indicador, { titulo: "Presentes", valor: totales.presentesDisponible ? totales.presentes : "Sin registro", detalle: "El sistema registra solo inasistencias" })
    ),
    h(
      Tarjeta,
      { titulo: "Detalle por fecha" },
      h(Chips, { opciones: FILTROS, valor: filtro, onCambiar: setFiltro }),
      filas.length === 0
        ? h(Vacio, { titulo: detalle.length ? "No hay registros de este tipo." : "No tenés inasistencias registradas en este ciclo." })
        : filas.map((item) =>
            h(
              View,
              { key: `${item.fecha}-${item.tipo}`, style: estilos.fila },
              h(
                View,
                { style: { flex: 1, gap: 2 } },
                h(Text, { style: estilos.fecha }, fechaCorta(item.fecha)),
                h(Text, { style: estilos.detalle }, `${item.tipoEtiqueta}${item.motivo ? ` · Motivo: ${etiquetaMotivo(item.motivo)}` : ""}`),
                h(Text, { style: estilos.detalle }, `Curso: ${item.curso ? `${item.curso}° ${item.division ?? ""}°` : "—"}`)
              ),
              h(Insignia, { texto: item.justificacionEtiqueta, tono: tonoDeEstado(item.justificacion) })
            )
          ),
      h(Nota, null, `${reglaComputo} Para justificar una inasistencia, presentá la documentación en Preceptoría.`)
    )
  );
}

const estilos = StyleSheet.create({
  grilla: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  fila: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8, borderTopColor: PORTAL.linea, borderTopWidth: StyleSheet.hairlineWidth },
  fecha: { fontSize: 15, fontWeight: "700", color: PORTAL.titulo },
  detalle: { fontSize: 12.5, color: PORTAL.subtitulo }
});
