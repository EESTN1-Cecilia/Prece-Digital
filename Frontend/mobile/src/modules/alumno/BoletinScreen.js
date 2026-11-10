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
        h(Text, { style: estilos.escuela }, "E.E.S. TÉCNICA N°1"),
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
    h(
      View,
      { style: estilos.resumen, accessibilityLabel: "Resumen del boletín" },
      resumenBoletin(datos).map(([etiqueta, valor]) =>
        h(View, { key: etiqueta, style: estilos.resumenItem }, h(Text, { style: estilos.resumenValor }, String(valor)), h(Text, { style: estilos.resumenEtiqueta }, etiqueta))
      )
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
    h(
      View,
      { style: estilos.firmas, accessibilityElementsHidden: true, importantForAccessibility: "no-hide-descendants" },
      h(View, { style: estilos.firma }, h(Text, { style: estilos.firmaTexto }, "Firma del preceptor/a")),
      h(View, { style: estilos.firma }, h(Text, { style: estilos.firmaTexto }, "Firma y sello de Dirección"))
    ),
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
      { style: { gap: 10 } },
      h(Boton, { texto: accion === "pdf" ? "Generando PDF..." : "Descargar PDF", onPress: () => ejecutar("pdf"), cargando: accion === "pdf", deshabilitado: accion !== null, variante: "claro" }),
      h(Boton, { texto: "Imprimir boletín", onPress: () => ejecutar("imprimir"), cargando: accion === "imprimir", deshabilitado: accion !== null })
    ),
    fallo ? h(Aviso, null, "No se pudo generar el PDF. Probá de nuevo en unos segundos.") : null,
    error ? h(ErrorCarga, { error, onReintentar: recargar }) : null,
    h(Documento, { datos })
  );
}

const estilos = StyleSheet.create({
  documento: { backgroundColor: PORTAL.blanco, borderColor: PORTAL.linea, borderWidth: 1, borderRadius: 14, overflow: "hidden", paddingBottom: 14 },
  cabecera: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: PORTAL.bordo, padding: 14, borderBottomColor: PORTAL.rojoClaro, borderBottomWidth: 3 },
  logo: { width: 52, height: 52 },
  escuela: { fontSize: 10, fontWeight: "800", letterSpacing: 0.6, color: PORTAL.rojoClaro },
  titulo: { fontSize: 15, fontWeight: "800", color: PORTAL.blanco, marginTop: 2 },
  alumno: { flexDirection: "row", flexWrap: "wrap", margin: 12, borderColor: PORTAL.linea, borderWidth: 1 },
  alumnoCampo: { flexBasis: "50%", flexGrow: 1, padding: 10, gap: 2, borderColor: PORTAL.linea, borderWidth: StyleSheet.hairlineWidth },
  alumnoEtiqueta: { fontSize: 10, fontWeight: "700", color: PORTAL.grisOscuro, textTransform: "uppercase" },
  alumnoValor: { fontSize: 13.5, fontWeight: "700", color: PORTAL.titulo },
  resumen: { flexDirection: "row", backgroundColor: PORTAL.bordoSuave, marginHorizontal: 12, paddingVertical: 10 },
  resumenItem: { flex: 1, alignItems: "center", paddingHorizontal: 2 },
  resumenValor: { fontSize: 18, fontWeight: "800", color: PORTAL.bordo },
  resumenEtiqueta: { fontSize: 9.5, color: PORTAL.grisOscuro, textAlign: "center" },
  tabla: { margin: 12, borderColor: PORTAL.linea, borderWidth: 1 },
  tablaCabecera: { flexDirection: "row", alignItems: "center", backgroundColor: PORTAL.bordo, paddingVertical: 7 },
  th: { fontSize: 11, fontWeight: "800", color: PORTAL.blanco, textAlign: "center" },
  seccion: { backgroundColor: PORTAL.bordo, paddingVertical: 5, paddingHorizontal: 10, borderTopColor: PORTAL.blanco, borderTopWidth: 1 },
  seccionTexto: { fontSize: 11, fontWeight: "800", letterSpacing: 0.4, color: PORTAL.blanco },
  fila: { flexDirection: "row", alignItems: "center", borderTopColor: PORTAL.linea, borderTopWidth: 1, minHeight: 46 },
  filaPar: { backgroundColor: "#fbf8f8" },
  colMateria: { flex: 1, paddingHorizontal: 8, paddingVertical: 6, gap: 1 },
  colNota: { width: 38, alignSelf: "stretch", alignItems: "center", justifyContent: "center", borderLeftColor: PORTAL.linea, borderLeftWidth: 1 },
  colEstado: { width: 92, alignSelf: "stretch", justifyContent: "center", alignItems: "flex-start", gap: 2, paddingHorizontal: 6, paddingVertical: 4, borderLeftColor: PORTAL.linea, borderLeftWidth: 1 },
  materia: { fontSize: 13, fontWeight: "800", color: PORTAL.titulo },
  docente: { fontSize: 10.5, color: PORTAL.grisOscuro },
  nota: { fontSize: 14, fontWeight: "800" },
  notaVacia: { fontSize: 13, color: PORTAL.gris },
  bloque: { marginHorizontal: 12, marginTop: 4, marginBottom: 6, padding: 10, gap: 3, borderColor: PORTAL.linea, borderWidth: 1, borderLeftColor: PORTAL.rojoClaro, borderLeftWidth: 4 },
  bloqueTitulo: { fontSize: 13, fontWeight: "800", color: PORTAL.bordo },
  bloqueTexto: { fontSize: 12.5, color: PORTAL.titulo, lineHeight: 18 },
  criterio: { marginHorizontal: 12, marginTop: 6, fontSize: 11, lineHeight: 16, color: PORTAL.grisOscuro },
  firmas: { flexDirection: "row", justifyContent: "space-around", marginTop: 34, marginHorizontal: 12, gap: 14 },
  firma: { flex: 1, borderTopColor: PORTAL.grisOscuro, borderTopWidth: 1, paddingTop: 4 },
  firmaTexto: { fontSize: 10.5, color: PORTAL.grisOscuro, textAlign: "center" },
  emision: { marginHorizontal: 12, marginTop: 14, fontSize: 10, color: PORTAL.grisOscuro }
});
