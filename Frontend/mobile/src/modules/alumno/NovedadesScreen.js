/* Novedades: cartelera escolar (comunicados de Dirección + avisos fijos) y
   actividad académica reciente. Igual que la vista web. */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { descargarAdjunto, obtenerNovedades } from "../../services/novedades-api.js";
import { obtenerAsistencias, obtenerBoletin } from "../../services/alumno-api.js";
import { PORTAL } from "../../theme/tokens.js";
import { fechaCorta, tonoDeEstado } from "../../utils/alumno-reglas.js";
import { AREAS, armarActividad, construirPublicaciones, paginar } from "../../utils/novedades.js";
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

function Cartelera() {
  const [informes, setInformes] = useState([]);
  const [area, setArea] = useState("");
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

  const publicaciones = useMemo(() => construirPublicaciones(informes, area), [informes, area]);
  const vista = paginar(publicaciones, pagina);

  return h(
    Tarjeta,
    { titulo: "Cartelera escolar" },
    h(Text, { style: estilos.subtitulo }, "Avisos institucionales"),
    h(Chips, {
      opciones: [{ valor: "", etiqueta: "Todas las áreas" }, ...AREAS.map((item) => ({ valor: item, etiqueta: item }))],
      valor: area,
      onCambiar: (valor) => {
        setArea(valor);
        setPagina(0);
      }
    }),
    vista.items.map((pub, indice) =>
      h(
        Pressable,
        {
          key: pub.id,
          onPress: () => setAbierta(pub),
          accessibilityRole: "button",
          accessibilityLabel: `Leer comunicado: ${pub.titulo}`,
          style: ({ pressed }) => [estilos.publicacion, indice === 0 && vista.pagina === 0 && estilos.destacada, pressed && { opacity: 0.85 }]
        },
        h(
          View,
          { style: estilos.meta },
          h(Text, { style: estilos.area }, pub.area),
          h(Text, { style: estilos.categoria }, pub.categoria),
          pub.fecha ? h(Text, { style: estilos.fechaMeta }, fechaCorta(pub.fecha)) : null
        ),
        h(Text, { style: estilos.titulo }, pub.titulo),
        h(Text, { style: estilos.texto, numberOfLines: 3 }, pub.texto),
        pub.archivo?.nombre ? h(Text, { style: estilos.adjuntoTexto }, `📎 Archivo adjunto: ${pub.archivo.nombre}`) : null,
        h(Text, { style: estilos.leer }, "Leer comunicado →")
      )
    ),
    h(
      View,
      { style: estilos.paginas },
      h(Boton, { texto: "Ver anterior", onPress: () => setPagina(vista.pagina - 1), deshabilitado: vista.pagina === 0, variante: "claro" }),
      h(Text, { style: estilos.paginaTexto, accessibilityRole: "text" }, `Página ${vista.pagina + 1} de ${vista.total}`),
      h(Boton, { texto: "Ver próximo", onPress: () => setPagina(vista.pagina + 1), deshabilitado: vista.pagina + 1 >= vista.total, variante: "claro" })
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
    { titulo: "Mi actividad académica" },
    h(Pressable, { onPress: () => setAbierta((v) => !v), accessibilityRole: "button", accessibilityState: { expanded: abierta } }, h(Text, { style: estilos.enlace }, abierta ? "Ocultar actividad" : "Ver actividad reciente")),
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

  return h(
    Pantalla,
    { refrescando: false, onRefrescar: () => setVersion((v) => v + 1) },
    h(Encabezado, { titulo: "Comunicados institucionales", descripcion: "Información de Dirección, Jefatura de Área y Preceptoría para estudiantes y familias." }),
    h(Cartelera, { key: `c${version}` }),
    h(Tarjeta, { titulo: "Información académica" }, h(Nota, null, "Consultá tu información académica y los datos de tu cuenta."), h(Boton, { texto: "Mi Boletín", onPress: () => irA("boletin"), variante: "claro" }), h(Boton, { texto: "Mis Asistencias", onPress: () => irA("asistencias"), variante: "claro" })),
    h(Actividad, { key: `a${version}`, irA })
  );
}

const estilos = StyleSheet.create({
  subtitulo: { fontSize: 12.5, color: PORTAL.subtitulo },
  publicacion: { gap: 6, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: PORTAL.linea, backgroundColor: PORTAL.blanco },
  destacada: { backgroundColor: PORTAL.bordo, borderColor: PORTAL.bordo },
  meta: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" },
  area: { fontSize: 11, fontWeight: "800", color: PORTAL.bordo2, textTransform: "uppercase" },
  categoria: { fontSize: 11.5, color: PORTAL.subtitulo },
  fechaMeta: { marginLeft: "auto", fontSize: 11.5, color: PORTAL.subtitulo },
  titulo: { fontSize: 15.5, fontWeight: "800", color: PORTAL.titulo },
  texto: { fontSize: 13.5, lineHeight: 19, color: PORTAL.titulo },
  leer: { fontSize: 12.5, fontWeight: "700", color: PORTAL.bordo2 },
  adjuntoTexto: { fontSize: 12, color: PORTAL.subtitulo },
  paginas: { gap: 8, alignItems: "stretch" },
  paginaTexto: { textAlign: "center", fontSize: 13, color: PORTAL.subtitulo },
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
