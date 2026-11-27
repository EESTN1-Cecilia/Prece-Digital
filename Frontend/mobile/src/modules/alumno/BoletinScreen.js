/* Mi Boletin: mismo documento que la web (cabecera, datos del alumno, resumen,
   tabla por secciones, inasistencias, pendientes y firmas) con descarga en PDF.
   Muestra exactamente lo que cargo el docente; no se inventa ninguna nota. */

import React, { useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";

import { descargarBoletinPdf, imprimirBoletin } from "../../services/boletin-descarga.js";
import { obtenerBoletin } from "../../services/alumno-api.js";
import { PORTAL } from "../../theme/tokens.js";
import { agruparMaterias, esNotaMarcada, estadoMateria, resumenBoletin, TEXTO_SIGLAS } from "../../utils/boletin.js";
import { tonoDeEstado } from "../../utils/alumno-reglas.js";
import { Aviso, Boton, Cargando, Encabezado, ErrorCarga, Insignia, Pantalla, SelectorCiclo, Vacio, h, useDatos } from "./componentes.js";

const COLOR_NOTA = { aprobada: PORTAL.ok, tep: PORTAL.alerta, ted: PORTAL.peligro, debajo_de_6: PORTAL.peligro };
const FONDO_NOTA = { tep: PORTAL.alertaFondo, ted: PORTAL.peligroFondo, debajo_de_6: PORTAL.peligroFondo };

function Nota({ resultado }) {
  if (!resultado) {
    return h(View, { style: estilos.colNota }, h(Text, { style: estilos.notaVacia }, "—"));
  }

  return h(
    View,
    { style: [estilos.colNota, esNotaMarcada(resultado) && { backgroundColor: FONDO_NOTA[resultado.estado] }] },
    h(Text, { style: [estilos.nota, { color: COLOR_NOTA[resultado.estado] ?? PORTAL.titulo }] }, String(resultado.valor))
  );
}

function Fila({ materia, par }) {
  const situacion = estadoMateria(materia);

  return h(
    View,
    { style: [estilos.fila, par && estilos.filaPar] },
    h(
      View,
      { style: estilos.colMateria },
      h(Text, { style: estilos.materia }, materia.materia),
      materia.docente ? h(Text, { style: estilos.docente }, materia.docente) : null
    ),
    h(Nota, { resultado: materia.periodos.c1.resultado }),
    h(Nota, { resultado: materia.periodos.c2.resultado }),
    h(Nota, { resultado: materia.periodos.final.resultado }),
    h(
      View,
      { style: estilos.colEstado },
      h(Insignia, { texto: materia.estadoActualEtiqueta, tono: tonoDeEstado(materia.estadoActual) }),
      situacion ? h(Text, { style: estilos.docente }, situacion) : null
    )
  );
}

function Documento({ datos }) {
  const { alumno, inasistencias, materiasPendientes, cicloLectivo, criterio, materias } = datos;
  const grupos = agruparMaterias(datos);

  return h(
    View,
    { style: estilos.documento, accessibilityLabel: `Boletín ${cicloLectivo}` },
    h(
      View,
      { style: estilos.cabecera },
      h(Image, { source: require("../../../assets/logo-chico.png"), style: estilos.logo, resizeMode: "contain", accessibilityLabel: "Logo de la E.E.S. Técnica N° 1" }),
      h(
        View,
        { style: { flex: 1 } },
        h(Text, { style: estilos.escuela }, "E.E.S.T. N°1 MONTE GRANDE"),
        h(Text, { style: estilos.titulo, accessibilityRole: "header" }, `Boletín de calificaciones · Ciclo lectivo ${cicloLectivo}`)
      )
    ),
    h(
      View,
      { style: estilos.alumno },
      [["Alumno/a", alumno.nombreCompleto], ["DNI", alumno.dni], ["Curso y división", alumno.cursoDivision ?? "Sin registro"], ["Ciclo lectivo", String(cicloLectivo)]].map(([etiqueta, valor]) =>
        h(View, { key: etiqueta, style: estilos.alumnoCampo }, h(Text, { style: estilos.alumnoEtiqueta }, etiqueta), h(Text, { style: estilos.alumnoValor, selectable: true }, valor ?? "—"))
      )
    ),
    /* Resumen como en la web: 2 x 2 y la ultima fila a lo ancho. */
    h(
      View,
      { style: estilos.resumen, accessibilityLabel: "Resumen del boletín" },
      resumenBoletin(datos).map(([etiqueta, valor], indice, lista) => {
        const ancho = indice === lista.length - 1 && lista.length % 2 === 1;
        return h(
          View,
          { key: etiqueta, style: [estilos.resumenItem, ancho && estilos.resumenAncho, indice % 2 === 1 && !ancho && estilos.resumenDerecha, indice >= 2 && estilos.resumenAbajo] },
          h(Text, { style: estilos.resumenValor }, String(valor)),
          h(Text, { style: [estilos.resumenEtiqueta, ancho && { marginLeft: 10 }] }, etiqueta)
        );
      })
    ),
    materias.length === 0
      ? h(Vacio, { titulo: "Todavía no hay calificaciones registradas para este ciclo." })
      : h(
          View,
          { style: estilos.tabla },
          h(
            View,
            { style: estilos.tablaCabecera },
            h(Text, { style: [estilos.th, estilos.colMateria, { textAlign: "left" }] }, "Materia"),
            h(Text, { style: [estilos.th, estilos.colNota] }, "1° C"),
            h(Text, { style: [estilos.th, estilos.colNota] }, "2° C"),
            h(Text, { style: [estilos.th, estilos.colNota] }, "Final"),
            h(Text, { style: [estilos.th, estilos.colEstado] }, "Estado")
          ),
          grupos.map((grupo) =>
            h(
              View,
              { key: grupo.titulo },
              h(View, { style: estilos.seccion }, h(Text, { style: estilos.seccionTexto }, grupo.titulo)),
              grupo.materias.map((materia, indice) => h(Fila, { key: materia.materiaId, materia, par: indice % 2 === 1 }))
            )
          )
        ),
    h(
      View,
      { style: estilos.bloque },
      h(Text, { style: estilos.bloqueTitulo }, "Inasistencias"),
      h(Text, { style: estilos.bloqueTexto }, `${inasistencias.ausentes} ausente(s) de jornada completa: ${inasistencias.ausentesJustificados} justificada(s), ${inasistencias.ausentesInjustificados} injustificada(s).`),
      inasistencias.llegadasTarde || inasistencias.ausentesParciales
        ? h(Text, { style: estilos.bloqueTexto }, `Llegadas tarde: ${inasistencias.llegadasTarde}. Retiros anticipados: ${inasistencias.ausentesParciales}.`)
        : null
    ),
    h(
      View,
      { style: estilos.bloque },
      h(Text, { style: estilos.bloqueTitulo }, "Materias pendientes de aprobación"),
      materiasPendientes.length
        ? materiasPendientes.map((previa) => h(Text, { key: previa.id, style: estilos.bloqueTexto }, `• ${previa.materia} — ciclo ${previa.anioCursada}${previa.cursoOrigen?.etiqueta ? ` (${previa.cursoOrigen.etiqueta})` : ""}`))
        : h(Text, { style: estilos.bloqueTexto }, "No tiene materias pendientes.")
    ),
    h(Text, { style: estilos.criterio }, `${criterio} ${TEXTO_SIGLAS}`),
    h(Text, { style: estilos.emision }, `Consulta generada el ${new Date().toLocaleDateString("es-AR")} desde Prece Digital.`)
  );
}

export default function BoletinScreen() {
  const [anio, setAnio] = useState(null);
  const [accion, setAccion] = useState(null); // "pdf" | "imprimir" | null
  const [fallo, setFallo] = useState(false);
  const { cargando, error, datos, recargar } = useDatos(() => obtenerBoletin(anio), [anio]);

  async function ejecutar(tipo) {
    setAccion(tipo);
    setFallo(false);

    try {
      await (tipo === "pdf" ? descargarBoletinPdf(datos) : imprimirBoletin(datos));
    } catch {
      setFallo(true);
    } finally {
      setAccion(null);
    }
  }

  if (cargando && !datos) return h(Cargando);
  if (error && !datos) return h(Pantalla, null, h(ErrorCarga, { error, onReintentar: recargar }));

  return h(
    Pantalla,
    { refrescando: cargando, onRefrescar: recargar },
    h(Encabezado, { titulo: "Mi Boletín", descripcion: `Ciclo lectivo ${datos.cicloLectivo}` }),
    h(SelectorCiclo, { anios: datos.aniosDisponibles, valor: datos.cicloLectivo, onCambiar: setAnio }),
    h(
      View,
      { style: { flexDirection: "row", gap: 10 } },
      h(View, { style: { flex: 1 } }, h(Boton, { texto: accion === "pdf" ? "Generando..." : "Descargar PDF", icono: "descarga", onPress: () => ejecutar("pdf"), cargando: accion === "pdf", deshabilitado: accion !== null, variante: "claro" })),
      h(View, { style: { flex: 1 } }, h(Boton, { texto: "Imprimir boletín", icono: "impresora", onPress: () => ejecutar("imprimir"), cargando: accion === "imprimir", deshabilitado: accion !== null }))
    ),
    fallo ? h(Aviso, null, "No se pudo generar el PDF. Probá de nuevo en unos segundos.") : null,
    error ? h(ErrorCarga, { error, onReintentar: recargar }) : null,
    h(Documento, { datos })
  );
}

const W = { bordo: "#591c23", bordo2: "#7a2530", titulo: "#1d2a44", etiqueta: "#6b7a93", gris: "#8c8c8c", linea: "#e3dfdf", fondo: "#faf8f8", rosa: "#d79aa1" };

const estilos = StyleSheet.create({
  documento: { backgroundColor: PORTAL.blanco, borderRadius: 18, borderLeftWidth: 6, borderLeftColor: W.bordo2, paddingBottom: 16, shadowColor: "#40141c", shadowOpacity: 0.08, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  cabecera: { flexDirection: "row", alignItems: "center", gap: 12, marginHorizontal: 14, paddingTop: 16, paddingBottom: 14, borderBottomColor: W.linea, borderBottomWidth: 1 },
  logo: { width: 52, height: 52 },
  escuela: { fontSize: 12, fontWeight: "800", letterSpacing: 0.5, color: W.bordo2 },
  titulo: { fontSize: 16.5, fontWeight: "800", color: W.titulo, marginTop: 2, lineHeight: 21 },
  alumno: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: 14, marginTop: 14, backgroundColor: W.fondo, borderColor: W.linea, borderWidth: 1, borderRadius: 14, paddingVertical: 6 },
  alumnoCampo: { flexBasis: "50%", flexGrow: 1, paddingHorizontal: 12, paddingVertical: 7, gap: 2 },
  alumnoEtiqueta: { fontSize: 10.5, fontWeight: "700", color: W.etiqueta, textTransform: "uppercase", letterSpacing: 0.3 },
  alumnoValor: { fontSize: 15, fontWeight: "700", color: W.titulo },
  resumen: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: 14, marginTop: 12, borderColor: W.linea, borderWidth: 1, borderRadius: 14, overflow: "hidden" },
  resumenItem: { flexBasis: "50%", flexGrow: 1, alignItems: "center", paddingVertical: 12 },
  resumenDerecha: { borderLeftColor: W.linea, borderLeftWidth: 1 },
  resumenAbajo: { borderTopColor: W.linea, borderTopWidth: 1 },
  resumenAncho: { flexBasis: "100%", flexDirection: "row", justifyContent: "center" },
  resumenValor: { fontSize: 24, fontWeight: "800", color: W.bordo2 },
  resumenEtiqueta: { fontSize: 13, color: W.gris, textAlign: "center" },
  tabla: { margin: 14, borderColor: W.linea, borderWidth: 1, borderRadius: 10, overflow: "hidden" },
  tablaCabecera: { flexDirection: "row", alignItems: "center", backgroundColor: W.bordo, paddingVertical: 8 },
  th: { fontSize: 11, fontWeight: "800", color: PORTAL.blanco, textAlign: "center" },
  seccion: { backgroundColor: "#f6eced", paddingVertical: 6, paddingHorizontal: 10, borderTopColor: W.linea, borderTopWidth: 1 },
  seccionTexto: { fontSize: 11, fontWeight: "800", letterSpacing: 0.4, color: W.bordo2 },
  fila: { flexDirection: "row", alignItems: "center", borderTopColor: W.linea, borderTopWidth: 1, minHeight: 46 },
  filaPar: { backgroundColor: W.fondo },
  colMateria: { flex: 1, paddingHorizontal: 8, paddingVertical: 6, gap: 1 },
  colNota: { width: 38, alignSelf: "stretch", alignItems: "center", justifyContent: "center", borderLeftColor: W.linea, borderLeftWidth: 1 },
  colEstado: { width: 92, alignSelf: "stretch", justifyContent: "center", alignItems: "flex-start", gap: 2, paddingHorizontal: 6, paddingVertical: 4, borderLeftColor: W.linea, borderLeftWidth: 1 },
  materia: { fontSize: 13, fontWeight: "800", color: W.titulo },
  docente: { fontSize: 10.5, color: W.gris },
  nota: { fontSize: 14, fontWeight: "800" },
  notaVacia: { fontSize: 13, color: W.gris },
  bloque: { marginHorizontal: 14, marginTop: 10, padding: 14, gap: 4, backgroundColor: W.fondo, borderColor: W.linea, borderWidth: 1, borderLeftColor: W.rosa, borderLeftWidth: 5, borderRadius: 14 },
  bloqueTitulo: { fontSize: 13, fontWeight: "800", color: W.bordo2, textTransform: "uppercase", letterSpacing: 0.3 },
  bloqueTexto: { fontSize: 14, color: W.titulo, lineHeight: 20 },
  criterio: { marginHorizontal: 14, marginTop: 12, fontSize: 12.5, lineHeight: 18, color: "#5b6b86" },
  emision: { marginHorizontal: 14, marginTop: 12, fontSize: 11.5, color: W.gris, textAlign: "center" }
});
