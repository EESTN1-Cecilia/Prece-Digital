/* Piezas visuales del portal del alumno. Sin dependencias nativas extra:
   solo componentes de react-native. */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { PORTAL } from "../../theme/tokens.js";

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
    descripcion ? h(Text, { style: estilos.encabezadoTexto }, descripcion) : null
  );
}

export function Tarjeta({ titulo, children }) {
  return h(View, { style: estilos.tarjeta }, titulo ? h(Text, { style: estilos.tarjetaTitulo }, titulo) : null, children);
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

export function Indicador({ titulo, valor, detalle, tono = "neutro", onPress }) {
  const [color] = TONOS[tono] ?? TONOS.neutro;
  const contenido = [
    h(Text, { key: "t", style: estilos.indicadorTitulo }, titulo),
    h(Text, { key: "v", style: [estilos.indicadorValor, { color: valor === null || valor === undefined ? PORTAL.gris : color }] }, String(valor ?? "—")),
    detalle ? h(Text, { key: "d", style: estilos.indicadorDetalle }, detalle) : null
  ];

  return onPress
    ? h(
        Pressable,
        {
          onPress,
          accessibilityRole: "button",
          accessibilityLabel: `${titulo}: ${valor ?? "sin dato"}`,
          style: ({ pressed }) => [estilos.indicador, pressed && estilos.presionado]
        },
        contenido
      )
    : h(View, { style: estilos.indicador, accessible: true, accessibilityLabel: `${titulo}: ${valor ?? "sin dato"}` }, contenido);
}

export function Boton({ texto, onPress, variante = "primario", deshabilitado = false, cargando = false }) {
  const primario = variante === "primario";
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
      cargando ? h(ActivityIndicator, { size: "small", color: primario ? PORTAL.blanco : PORTAL.bordo2 }) : null,
      h(Text, { style: [estilos.botonTexto, { color: primario ? PORTAL.blanco : PORTAL.bordo2 }] }, texto)
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
  pantalla: { flex: 1, backgroundColor: PORTAL.fondo },
  pantallaContenido: { padding: 16, gap: 14, paddingBottom: 32 },
  centro: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  presionado: { opacity: 0.85 },
  deshabilitado: { opacity: 0.6 },
  encabezado: { gap: 2 },
  encabezadoTitulo: { fontSize: 24, fontWeight: "800", color: PORTAL.titulo },
  encabezadoTexto: { fontSize: 14, color: PORTAL.subtitulo },
  tarjeta: { backgroundColor: PORTAL.blanco, borderColor: PORTAL.linea, borderWidth: 1, borderRadius: 14, padding: 14, gap: 10 },
  tarjetaTitulo: { fontSize: 16, fontWeight: "800", color: PORTAL.titulo },
  nota: { fontSize: 12, lineHeight: 17, color: PORTAL.subtitulo },
  insignia: { alignSelf: "flex-start", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  insigniaTexto: { fontSize: 12, fontWeight: "700" },
  indicador: { flexBasis: "47%", flexGrow: 1, backgroundColor: PORTAL.blanco, borderColor: PORTAL.linea, borderWidth: 1, borderRadius: 14, padding: 14, gap: 2, minHeight: 96 },
  indicadorTitulo: { fontSize: 13, fontWeight: "700", color: PORTAL.titulo },
  indicadorValor: { fontSize: 30, fontWeight: "800" },
  indicadorDetalle: { fontSize: 11.5, color: PORTAL.subtitulo },
  boton: { minHeight: 46, alignItems: "center", justifyContent: "center", borderRadius: 999, paddingHorizontal: 18 },
  botonPrimario: { backgroundColor: PORTAL.bordo2 },
  botonClaro: { backgroundColor: PORTAL.blanco, borderColor: PORTAL.bordo2, borderWidth: 1.5 },
  botonFila: { flexDirection: "row", alignItems: "center", gap: 8 },
  botonTexto: { fontSize: 14.5, fontWeight: "700" },
  chips: { gap: 8, paddingVertical: 2 },
  chip: { minHeight: 36, justifyContent: "center", borderRadius: 999, borderWidth: 1, borderColor: PORTAL.linea, backgroundColor: PORTAL.blanco, paddingHorizontal: 14 },
  chipActivo: { backgroundColor: PORTAL.bordo2, borderColor: PORTAL.bordo2 },
  chipTexto: { fontSize: 13, fontWeight: "600", color: PORTAL.grisOscuro },
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
  vacio: { alignItems: "center", padding: 16, gap: 4 },
  vacioTitulo: { fontSize: 14, fontWeight: "700", color: PORTAL.grisOscuro, textAlign: "center" },
  vacioTexto: { fontSize: 12.5, color: PORTAL.subtitulo, textAlign: "center" }
});
