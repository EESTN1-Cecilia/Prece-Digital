/* Novedades: cartelera escolar (comunicados de Dirección + avisos fijos) y
   actividad académica reciente. Igual que la vista web. */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { descargarAdjunto, obtenerNovedades } from "../../services/novedades-api.js";
import { obtenerAsistencias, obtenerBoletin } from "../../services/alumno-api.js";
import { PORTAL } from "../../theme/tokens.js";
import { fechaCorta, tonoDeEstado } from "../../utils/alumno-reglas.js";
import { AREAS, armarActividad, construirPublicaciones, paginar } from "../../utils/novedades.js";
import { Icono } from "./iconos.js";
import { Aviso, Boton, Cargando, Chips, Encabezado, ErrorCarga, Insignia, Nota, Pantalla, Tarjeta, Vacio, h, useDatos } from "./componentes.js";

const REFRESCO_MS = 60000;

function Aviso_({ publicacion, onCerrar }) {
  const [descargando, setDescargando] = useState(false);
  const [error, setError] = useState("");

  async function bajar() {
    setDescargando(true);
    setError("");
    try {
      await descargarAdjunto(publicacion.id);
    } catch (fallo) {
      setError(fallo?.mensaje ?? "No se pudo descargar el archivo. Intentá de nuevo.");
    } finally {
      setDescargando(false);
    }
  }

  return h(
    Modal,
    { visible: Boolean(publicacion), animationType: "slide", onRequestClose: onCerrar, transparent: true },
    h(
      View,
      { style: estilos.fondoModal },
      h(
        View,
        { style: estilos.modal },
        publicacion
          ? [
              h(
                View,
                { key: "c", style: estilos.modalCabecera },
                h(Text, { style: estilos.modalMeta }, `${publicacion.area} · ${publicacion.categoria}`),
                h(Pressable, { onPress: onCerrar, accessibilityRole: "button", accessibilityLabel: "Cerrar comunicado", hitSlop: 10 }, h(Text, { style: estilos.cerrar }, "Cerrar"))
              ),
              h(
                ScrollView,
                { key: "s", contentContainerStyle: { gap: 10, paddingBottom: 16 } },
                h(Text, { style: estilos.modalTitulo, accessibilityRole: "header" }, publicacion.titulo),
                publicacion.fecha ? h(Text, { style: estilos.fecha }, `Fecha de emisión: ${fechaCorta(publicacion.fecha)}`) : null,
                h(Text, { style: estilos.texto, selectable: true }, publicacion.texto),
                publicacion.archivo?.nombre
                  ? h(
                      View,
                      { style: estilos.adjunto },
                      h(Text, { style: estilos.adjuntoTexto }, `📎 Archivo adjunto: ${publicacion.archivo.nombre}`),
                      publicacion.archivo.descargable ? h(Boton, { texto: "Descargar", onPress: bajar, cargando: descargando, variante: "claro" }) : null
                    )
                  : null,
                error ? h(Aviso, null, error) : null
              )
            ]
          : null
      )
    )
  );
}

function Cartelera({ area }) {
  const [informes, setInformes] = useState([]);
  const [pagina, setPagina] = useState(0);
  const [abierta, setAbierta] = useState(null);

  const cargar = useCallback(() => {
    obtenerNovedades().then(
      (items) => Array.isArray(items) && setInformes(items),
      () => {} /* sin conexión: se conserva lo ya mostrado */
    );
  }, []);

  useEffect(() => {
    cargar();
    const intervalo = setInterval(cargar, REFRESCO_MS);
    return () => clearInterval(intervalo);
  }, [cargar]);

  useEffect(() => setPagina(0), [area]);
  const publicaciones = useMemo(() => construirPublicaciones(informes, area), [informes, area]);
  const vista = paginar(publicaciones, pagina);

  return h(
    Tarjeta,
    { acento: false },
    h(View, { style: estilos.carteleraCabecera }, h(Text, { style: estilos.carteleraTitulo, accessibilityRole: "header" }, "Cartelera escolar"), h(Text, { style: estilos.subtitulo }, "Avisos institucionales")),
    vista.items.length === 0 ? h(Vacio, { titulo: "No hay comunicados para esta área." }) : null,
    vista.items.map((pub, indice) => {
      const destacada = indice === 0 && vista.pagina === 0;
      return h(
        Pressable,
        {
          key: pub.id,
          onPress: () => setAbierta(pub),
          accessibilityRole: "button",
          accessibilityLabel: `Leer comunicado: ${pub.titulo}`,
          style: ({ pressed }) => [estilos.publicacion, destacada && estilos.destacada, pressed && { opacity: 0.85 }]
        },
        h(
          View,
          { style: estilos.meta },
          h(View, { style: [estilos.areaPill, destacada && { backgroundColor: "#fff" }] }, h(Text, { style: estilos.area }, pub.area)),
          h(Text, { style: [estilos.categoria, destacada && estilos.blancoSuave] }, pub.categoria),
          pub.fecha ? h(Text, { style: [estilos.fechaMeta, destacada && estilos.blancoSuave] }, fechaCorta(pub.fecha)) : null
        ),
        h(Text, { style: [estilos.titulo, destacada && { color: "#fff" }] }, pub.titulo),
        h(Text, { style: [estilos.texto, destacada && { color: "#fff" }], numberOfLines: 4 }, pub.texto),
        pub.archivo?.nombre
          ? h(View, { style: estilos.adjuntoFila }, h(Icono, { nombre: "clip", tamano: 15, color: destacada ? "#e8c5c5" : "#8c8c8c" }), h(Text, { style: [estilos.adjuntoTexto, destacada && { color: "#e8c5c5" }] }, `Archivo adjunto: ${pub.archivo.nombre}`))
          : null,
        h(Text, { style: [estilos.leer, destacada && { color: "#fff" }] }, "Leer comunicado →")
      );
    }),
    h(
      View,
      { style: estilos.paginas },
      h(Pressable, { onPress: () => setPagina(vista.pagina - 1), disabled: vista.pagina === 0, accessibilityRole: "button", style: [estilos.paginaBoton, vista.pagina === 0 && { opacity: 0.55 }] }, h(Text, { style: estilos.paginaBotonTexto }, "Ver anterior")),
      h(Text, { style: estilos.paginaTexto, accessibilityRole: "text" }, `Página ${vista.pagina + 1} de ${vista.total}`),
      h(Pressable, { onPress: () => setPagina(vista.pagina + 1), disabled: vista.pagina + 1 >= vista.total, accessibilityRole: "button", style: [estilos.paginaBoton, vista.pagina + 1 >= vista.total && { opacity: 0.55 }] }, h(Text, { style: estilos.paginaBotonTexto }, "Ver próximo"))
    ),
    h(Aviso_, { publicacion: abierta, onCerrar: () => setAbierta(null) })
  );
}

function Actividad({ irA }) {
  const { cargando, error, datos, recargar } = useDatos(async () => {
    const [boletin, asistencias] = await Promise.all([obtenerBoletin(), obtenerAsistencias()]);
    return armarActividad(boletin, asistencias);
  }, []);
  const [abierta, setAbierta] = useState(false);

  return h(
    Tarjeta,
    { acento: false },
    h(Pressable, { onPress: () => setAbierta((v) => !v), accessibilityRole: "button", accessibilityState: { expanded: abierta } }, h(Text, { style: estilos.carteleraTitulo }, `${abierta ? "▼" : "▶"} Mi actividad académica`)),
    !abierta
      ? null
      : cargando && !datos
      ? h(Cargando)
      : error && !datos
      ? h(ErrorCarga, { error, onReintentar: recargar })
      : datos.length === 0
      ? h(Vacio, { titulo: "Todavía no hay novedades.", descripcion: "Cuando se registren calificaciones o inasistencias, las vas a ver acá." })
      : datos.map((item) =>
          h(
            Pressable,
            { key: item.clave, onPress: () => irA(item.destino), accessibilityRole: "button", style: estilos.fila },
            h(
              View,
              { style: { flex: 1, gap: 2 } },
              h(Text, { style: estilos.filaTitulo }, item.titulo),
              h(Text, { style: estilos.filaDetalle }, `${item.detalle} · ${fechaCorta(item.fecha)}`)
            ),
            item.marca ? h(Insignia, { texto: item.marca.etiqueta, tono: tonoDeEstado(item.marca.estado) }) : null,
            item.justificacion ? h(Insignia, { texto: item.justificacion.etiqueta, tono: tonoDeEstado(item.justificacion.estado) }) : null
          )
        )
  );
}

export default function NovedadesScreen({ irA }) {
  const [version, setVersion] = useState(0);
  const [area, setArea] = useState("");

  return h(
    Pantalla,
    { refrescando: false, onRefrescar: () => setVersion((v) => v + 1) },
    h(Encabezado, { titulo: "Comunicados institucionales", descripcion: "Información de Dirección, Jefatura de Área y Preceptoría para estudiantes y familias." }),
    h(Cartelera, { key: `c${version}`, area }),
    h(
      Tarjeta,
      { acento: false },
      h(Text, { style: estilos.filtroTitulo }, "Filtrar por área"),
      h(Chips, { opciones: [{ valor: "", etiqueta: "Todas las áreas" }, ...AREAS.map((item) => ({ valor: item, etiqueta: item }))], valor: area, onCambiar: setArea }),
      h(Text, { style: [estilos.carteleraTitulo, { marginTop: 6 }] }, "Información académica"),
      h(Text, { style: estilos.texto }, "Consultá tu información académica y los datos de tu cuenta."),
      h(Pressable, { onPress: () => irA("boletin"), accessibilityRole: "link", style: estilos.linkFila }, h(Text, { style: estilos.link }, "Mi Boletín")),
      h(Pressable, { onPress: () => irA("asistencias"), accessibilityRole: "link", style: [estilos.linkFila, { borderBottomWidth: 0 }] }, h(Text, { style: estilos.link }, "Mis Asistencias"))
    ),
    h(Actividad, { key: `a${version}`, irA })
  );
}

const estilos = StyleSheet.create({
  subtitulo: { fontSize: 13, color: "#5b6b86" },
  carteleraCabecera: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "#e3dfdf" },
  carteleraTitulo: { fontSize: 19, fontWeight: "800", color: "#2b2b2b" },
  filtroTitulo: { fontSize: 16, fontWeight: "700", color: "#404040" },
  publicacion: { gap: 8, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: "#e3dfdf", backgroundColor: PORTAL.blanco },
  destacada: { backgroundColor: "#6a1e28", borderColor: "#6a1e28" },
  areaPill: { backgroundColor: "#f6eced", borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4 },
  blancoSuave: { color: "rgba(255,255,255,0.85)" },
  adjuntoFila: { flexDirection: "row", alignItems: "center", gap: 6 },
  paginaBoton: { flex: 1, alignItems: "center", justifyContent: "center", minHeight: 44, borderRadius: 10, borderWidth: 1, borderColor: "#e8d5d7", backgroundColor: "#f6eced" },
  paginaBotonTexto: { fontSize: 14, color: "#5b6b86", fontWeight: "600" },
  linkFila: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#e3dfdf" },
  link: { fontSize: 15, color: "#7a2530", textDecorationLine: "underline" },
  meta: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" },
  area: { fontSize: 12.5, fontWeight: "800", color: "#7a2530" },
  categoria: { fontSize: 11.5, color: PORTAL.subtitulo },
  fechaMeta: { marginLeft: "auto", fontSize: 11.5, color: PORTAL.subtitulo },
  titulo: { fontSize: 15.5, fontWeight: "800", color: PORTAL.titulo },
  texto: { fontSize: 13.5, lineHeight: 19, color: PORTAL.titulo },
  leer: { fontSize: 12.5, fontWeight: "700", color: PORTAL.bordo2 },
  adjuntoTexto: { fontSize: 12, color: PORTAL.subtitulo },
  paginas: { flexDirection: "row", alignItems: "center", gap: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#e3dfdf" },
  paginaTexto: { textAlign: "center", fontSize: 13.5, color: "#404040" },
  fondoModal: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.45)" },
  modal: { maxHeight: "85%", backgroundColor: PORTAL.blanco, borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 18, gap: 10 },
  modalCabecera: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  modalMeta: { flex: 1, fontSize: 12, fontWeight: "700", color: PORTAL.bordo2 },
  modalTitulo: { fontSize: 20, fontWeight: "800", color: PORTAL.titulo },
  cerrar: { fontSize: 14, fontWeight: "800", color: PORTAL.bordo2, padding: 6 },
  fecha: { fontSize: 12, fontWeight: "600", color: PORTAL.subtitulo },
  adjunto: { gap: 8, padding: 10, borderRadius: 10, backgroundColor: PORTAL.fondo },
  enlace: { fontSize: 13, fontWeight: "700", color: PORTAL.bordo2, textDecorationLine: "underline" },
  fila: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8, borderTopColor: PORTAL.linea, borderTopWidth: StyleSheet.hairlineWidth },
  filaTitulo: { fontSize: 14.5, fontWeight: "700", color: PORTAL.titulo },
  filaDetalle: { fontSize: 12, color: PORTAL.subtitulo }
});
