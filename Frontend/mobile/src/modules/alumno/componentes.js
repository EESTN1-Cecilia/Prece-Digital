/* Piezas visuales del portal del alumno. Sin dependencias nativas extra:
   solo componentes de react-native. */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { PORTAL } from "../../theme/tokens.js";
import { Icono } from "./iconos.js";

/* Colores del portal web (Frontend/web/src/styles/alumno-portal/portal.css). */
export const WEB = { bordo: "#591c23", bordo2: "#7a2530", suave: "#f6eced", iconoFondo: "#f3dfe1", titulo: "#1d2a44", subtitulo: "#5b6b86", gris: "#8c8c8c", linea: "#e3dfdf" };
const SOMBRA = { shadowColor: "#40141c", shadowOpacity: 0.08, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 3 };

export const h = React.createElement;

/* Carga datos del Backend. Ignora respuestas de pantallas ya cerradas. */
export function useDatos(cargar, dependencias = []) {
  const [estado, setEstado] = useState({ cargando: true, error: null, datos: null });
  const [version, setVersion] = useState(0);
  const cargarRef = useRef(cargar);
  cargarRef.current = cargar;

  useEffect(() => {
    let vigente = true;
    setEstado((actual) => ({ ...actual, cargando: true, error: null }));

    Promise.resolve()
      .then(() => cargarRef.current())
      .then(
        (datos) => vigente && setEstado({ cargando: false, error: null, datos }),
        (error) => vigente && setEstado((actual) => ({ cargando: false, error, datos: actual.datos }))
      );

    return () => {
      vigente = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...dependencias, version]);

  const recargar = useCallback(() => setVersion((valor) => valor + 1), []);

  return { ...estado, recargar };
}

/* Pantalla con desplazamiento y "tirar para actualizar". */
export function Pantalla({ children, refrescando = false, onRefrescar }) {
  return h(
    ScrollView,
    {
      style: estilos.pantalla,
      contentContainerStyle: estilos.pantallaContenido,
      keyboardShouldPersistTaps: "handled",
      refreshControl: onRefrescar
        ? h(RefreshControl, { refreshing: refrescando, onRefresh: onRefrescar, tintColor: PORTAL.bordo2, colors: [PORTAL.bordo2] })
        : undefined
    },
    children
  );
}

export function Cargando() {
  return h(View, { style: estilos.centro, accessibilityRole: "progressbar" }, h(ActivityIndicator, { size: "large", color: PORTAL.bordo2 }));
}

export function ErrorCarga({ error, onReintentar }) {
  return h(
    View,
    { style: estilos.aviso, accessibilityRole: "alert" },
    h(Text, { style: estilos.avisoTitulo }, "No se pudo cargar"),
    h(Text, { style: estilos.avisoTexto }, error?.mensaje ?? "Ocurrió un error inesperado."),
    onReintentar ? h(Boton, { texto: "Reintentar", onPress: onReintentar, variante: "claro" }) : null
  );
}

export function Vacio({ titulo, descripcion }) {
  return h(
    View,
    { style: estilos.vacio },
    h(Text, { style: estilos.vacioTitulo }, titulo),
    descripcion ? h(Text, { style: estilos.vacioTexto }, descripcion) : null
  );
}

export function Encabezado({ titulo, descripcion }) {
  return h(
    View,
    { style: estilos.encabezado },
    h(Text, { style: estilos.encabezadoTitulo, accessibilityRole: "header" }, titulo),
    descripcion ? h(Text, { style: estilos.encabezadoTexto }, descripcion) : null,
    h(View, { style: estilos.encabezadoLinea })
  );
}

export function Tarjeta({ titulo, children, acento = true }) {
  return h(View, { style: [estilos.tarjeta, acento && estilos.tarjetaAcento] }, titulo ? h(Text, { style: estilos.tarjetaTitulo }, titulo) : null, children);
}

export function Nota({ children }) {
  return h(Text, { style: estilos.nota }, children);
}

const TONOS = {
  ok: [PORTAL.ok, PORTAL.okFondo],
  alerta: [PORTAL.alerta, PORTAL.alertaFondo],
  peligro: [PORTAL.peligro, PORTAL.peligroFondo],
  pendiente: [PORTAL.pendiente, PORTAL.pendienteFondo],
  neutro: [PORTAL.neutro, PORTAL.neutroFondo]
};

export function Insignia({ texto, tono = "neutro" }) {
  const [color, fondo] = TONOS[tono] ?? TONOS.neutro;
  return h(View, { style: [estilos.insignia, { backgroundColor: fondo }] }, h(Text, { style: [estilos.insigniaTexto, { color }] }, texto));
}

/* Indicador como .pa-indicador de la web: etiqueta, valor y detalle, con borde
   izquierdo de color e icono en un circulo arriba a la derecha. */
export function Indicador({ titulo, valor, detalle, tono = "neutro", onPress, icono }) {
  const [color, fondo] = TONOS[tono] ?? TONOS.neutro;
  const sinDato = valor === null || valor === undefined;
  const esTexto = typeof valor === "string" && !/^\d+$/.test(valor);
  const borde = tono === "neutro" ? WEB.bordo2 : color;
  const contenido = [
    h(
      View,
      { key: "a", style: estilos.indicadorArriba },
      h(Text, { style: estilos.indicadorTitulo, numberOfLines: 2 }, titulo),
      icono ? h(View, { style: [estilos.indicadorIcono, { backgroundColor: tono === "neutro" ? WEB.iconoFondo : fondo }] }, h(Icono, { nombre: icono, tamano: 18, color: borde })) : null
    ),
    h(Text, { key: "v", style: [estilos.indicadorValor, esTexto && estilos.indicadorValorTexto, { color: sinDato ? PORTAL.gris : tono === "neutro" ? WEB.titulo : color }] }, String(valor ?? "—")),
    detalle ? h(Text, { key: "d", style: estilos.indicadorDetalle }, detalle) : null
  ];

  return onPress
    ? h(
        Pressable,
        {
          onPress,
          accessibilityRole: "button",
          accessibilityLabel: `${titulo}: ${valor ?? "sin dato"}`,
          style: ({ pressed }) => [estilos.indicador, { borderLeftColor: borde }, pressed && estilos.presionado]
        },
        contenido
      )
    : h(View, { style: [estilos.indicador, { borderLeftColor: borde }], accessible: true, accessibilityLabel: `${titulo}: ${valor ?? "sin dato"}` }, contenido);
}

export function Boton({ texto, onPress, variante = "primario", deshabilitado = false, cargando = false, icono }) {
  const primario = variante === "primario";
  const colorTexto = primario ? PORTAL.blanco : WEB.bordo;
  return h(
    Pressable,
    {
      onPress,
      disabled: deshabilitado || cargando,
      accessibilityRole: "button",
      accessibilityState: { disabled: deshabilitado || cargando, busy: cargando },
      style: ({ pressed }) => [
        estilos.boton,
        primario ? estilos.botonPrimario : estilos.botonClaro,
        (deshabilitado || cargando) && estilos.deshabilitado,
        pressed && estilos.presionado
      ]
    },
    h(
      View,
      { style: estilos.botonFila },
      cargando ? h(ActivityIndicator, { size: "small", color: colorTexto }) : icono ? h(Icono, { nombre: icono, tamano: 19, color: colorTexto }) : null,
      h(Text, { style: [estilos.botonTexto, { color: colorTexto }] }, texto)
    )
  );
}

/* Grupo de opciones tipo "chips" (un solo valor activo). */
export function Chips({ opciones, valor, onCambiar }) {
  return h(
    ScrollView,
    { horizontal: true, showsHorizontalScrollIndicator: false, contentContainerStyle: estilos.chips },
    opciones.map((opcion) =>
      h(
        Pressable,
        {
          key: String(opcion.valor),
          onPress: () => onCambiar(opcion.valor),
          accessibilityRole: "button",
          accessibilityState: { selected: valor === opcion.valor },
          style: [estilos.chip, valor === opcion.valor && estilos.chipActivo]
        },
        h(Text, { style: [estilos.chipTexto, valor === opcion.valor && estilos.chipTextoActivo] }, opcion.etiqueta)
      )
    )
  );
}

export function SelectorCiclo({ anios = [], valor, onCambiar }) {
  if (anios.length < 2) {
    return null;
  }

  return h(Chips, { opciones: anios.map((anio) => ({ valor: anio, etiqueta: `Ciclo ${anio}` })), valor, onCambiar });
}

export function Requisitos({ lista }) {
  return h(
    View,
    { style: estilos.requisitos },
    lista.map((item) =>
      h(Text, { key: item.clave, style: [estilos.requisito, { color: item.cumple ? PORTAL.ok : PORTAL.gris }] }, `${item.cumple ? "✓" : "○"} ${item.texto}`)
    )
  );
}

export function CampoTexto({ etiqueta, valor, onCambiar, error, ayuda, secreto = false, ...resto }) {
  const [visible, setVisible] = useState(false);

  return h(
    View,
    { style: estilos.campo },
    h(Text, { style: estilos.etiqueta }, etiqueta),
    h(
      View,
      { style: estilos.campoFila },
      h(TextInput, {
        style: [estilos.input, error && estilos.inputError, secreto && estilos.inputSecreto],
        value: valor,
        onChangeText: onCambiar,
        secureTextEntry: secreto && !visible,
        autoCapitalize: "none",
        autoCorrect: false,
        accessibilityLabel: etiqueta,
        placeholderTextColor: PORTAL.gris,
        ...resto
      }),
      secreto
        ? h(
            Pressable,
            {
              onPress: () => setVisible((actual) => !actual),
              accessibilityRole: "button",
              accessibilityLabel: visible ? "Ocultar contraseña" : "Mostrar contraseña",
              style: estilos.verClave
            },
            h(Text, { style: estilos.verClaveTexto }, visible ? "Ocultar" : "Ver")
          )
        : null
    ),
    ayuda && !error ? h(Text, { style: estilos.ayuda }, ayuda) : null,
    error ? h(Text, { style: estilos.errorCampo }, error) : null
  );
}

export function Aviso({ tipo = "error", children }) {
  return h(
    View,
    { style: [estilos.aviso, tipo === "ok" && estilos.avisoOk], accessibilityRole: "alert" },
    h(Text, { style: [estilos.avisoTexto, tipo === "ok" && { color: PORTAL.ok }] }, children)
  );
}

export const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: "#f7f4f4" },
  pantallaContenido: { padding: 16, gap: 14, paddingBottom: 36 },
  centro: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  presionado: { opacity: 0.85 },
  deshabilitado: { opacity: 0.6 },
  encabezado: { gap: 0 },
  encabezadoTitulo: { fontSize: 26, fontWeight: "800", lineHeight: 30, letterSpacing: -0.3, color: WEB.titulo },
  encabezadoLinea: { width: 38, height: 3, borderRadius: 2, backgroundColor: WEB.bordo2 },
  tarjetaAcento: { borderLeftWidth: 5, borderLeftColor: WEB.bordo2 },
  indicadorArriba: { flexDirection: "row", alignItems: "flex-start", gap: 6 },
  indicadorIcono: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  indicadorValorTexto: { fontSize: 22 },
  encabezadoTexto: { marginTop: 4, marginBottom: 8, fontSize: 13.5, color: WEB.subtitulo },
  tarjeta: { backgroundColor: PORTAL.blanco, borderRadius: 16, padding: 16, gap: 12, ...SOMBRA },
  tarjetaTitulo: { fontSize: 19, fontWeight: "800", color: WEB.titulo },
  nota: { fontSize: 12.5, lineHeight: 18, color: WEB.subtitulo },
  insignia: { alignSelf: "flex-start", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  insigniaTexto: { fontSize: 12, fontWeight: "700" },
  indicador: { flexBasis: "47%", flexGrow: 1, backgroundColor: PORTAL.blanco, borderRadius: 14, borderLeftWidth: 5, paddingTop: 12, paddingBottom: 12, paddingHorizontal: 12, gap: 2, minHeight: 104, ...SOMBRA },
  indicadorTitulo: { flex: 1, fontSize: 12.5, fontWeight: "600", color: WEB.subtitulo },
  indicadorValor: { fontSize: 26, fontWeight: "800", lineHeight: 30 },
  indicadorDetalle: { fontSize: 11, lineHeight: 14, color: WEB.gris },
  boton: { minHeight: 48, alignItems: "center", justifyContent: "center", borderRadius: 12, paddingHorizontal: 18 },
  botonPrimario: { backgroundColor: WEB.bordo },
  botonClaro: { backgroundColor: PORTAL.blanco, borderColor: WEB.bordo, borderWidth: 1.5 },
  botonFila: { flexDirection: "row", alignItems: "center", gap: 8 },
  botonTexto: { fontSize: 15, fontWeight: "700" },
  chips: { gap: 8, paddingVertical: 2 },
  chip: { minHeight: 38, justifyContent: "center", borderRadius: 999, borderWidth: 1, borderColor: WEB.linea, backgroundColor: PORTAL.blanco, paddingHorizontal: 16 },
  chipActivo: { backgroundColor: WEB.bordo, borderColor: WEB.bordo },
  chipTexto: { fontSize: 13.5, fontWeight: "600", color: WEB.titulo },
  chipTextoActivo: { color: PORTAL.blanco },
  requisitos: { gap: 2 },
  requisito: { fontSize: 12.5 },
  campo: { gap: 5 },
  campoFila: { justifyContent: "center" },
  etiqueta: { fontSize: 13, fontWeight: "700", color: PORTAL.grisOscuro },
  input: { minHeight: 46, borderWidth: 1.5, borderColor: PORTAL.linea, borderRadius: 12, backgroundColor: PORTAL.blanco, paddingHorizontal: 14, fontSize: 15, color: PORTAL.titulo },
  inputSecreto: { paddingRight: 70 },
  inputError: { borderColor: PORTAL.peligro },
  verClave: { position: "absolute", right: 12, padding: 6 },
  verClaveTexto: { fontSize: 12.5, fontWeight: "700", color: PORTAL.bordo2 },
  ayuda: { fontSize: 11.5, color: PORTAL.subtitulo },
  errorCampo: { fontSize: 12, fontWeight: "600", color: PORTAL.peligro },
  aviso: { backgroundColor: PORTAL.peligroFondo, borderColor: PORTAL.peligro, borderWidth: 1, borderRadius: 12, padding: 12, gap: 6 },
  avisoOk: { backgroundColor: PORTAL.okFondo, borderColor: PORTAL.ok },
  avisoTitulo: { fontSize: 14, fontWeight: "800", color: PORTAL.peligro },
  avisoTexto: { fontSize: 13, color: PORTAL.peligro },
  vacio: { alignItems: "center", paddingVertical: 26, paddingHorizontal: 12, gap: 6 },
  vacioTitulo: { fontSize: 16, lineHeight: 23, fontWeight: "500", color: "#2b2b2b", textAlign: "center" },
  vacioTexto: { fontSize: 12.5, color: PORTAL.subtitulo, textAlign: "center" }
});
