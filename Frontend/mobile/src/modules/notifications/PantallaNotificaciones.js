import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { COLORES, ESPACIOS, RADIOS, TIPOGRAFIA } from "../../theme/tokens.js";
import {
  listarNotificaciones,
  marcarNotificacionComoLeida,
  marcarTodasComoLeidas,
  obtenerContadorNoLeidas
} from "../../services/notifications-api.js";

const h = React.createElement;

function formatoFecha(valor) {
  if (!valor) {
    return "";
  }
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) {
    return "";
  }
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short" }).format(fecha);
}

function NotificacionItem({ notificacion, ocupado, onMarcarLeida }) {
  const leida = !!notificacion.isRead;
  const fecha = notificacion.createdAt || notificacion.readAt;

  const pulsar = useCallback(() => {
    if (!leida) {
      onMarcarLeida(notificacion.id);
    }
  }, [leida, notificacion.id, onMarcarLeida]);

  return h(
    Pressable,
    {
      onPress: leida ? undefined : pulsar,
      disabled: ocupado,
      accessibilityRole: leida ? "text" : "button",
      accessibilityState: { disabled: leida || ocupado },
      style: ({ pressed }) => [
        styles.item,
        leida ? styles.itemLeida : styles.itemNoLeida,
        pressed && !leida && styles.itemPresionado
      ]
    },
    h(
      View,
      { style: styles.itemFila },
      h(View, { style: leida ? styles.indicadorLeida : styles.indicadorNoLeida }),
      h(
        View,
        { style: styles.itemTexto },
        h(Text, { style: leida ? styles.itemTituloLeida : styles.itemTituloNoLeida }, notificacion.title || "Notificacion"),
        notificacion.body ? h(Text, { style: leida ? styles.itemCuerpoLeida : styles.itemCuerpoNoLeida }, notificacion.body) : null,
        h(Text, { style: styles.itemFecha }, formatoFecha(fecha))
      ),
      ocupado && !leida ? h(ActivityIndicator, { color: COLORES.indigo, size: "small" }) : null
    )
  );
}

function EstadoVacio() {
  return h(
    View,
    { style: styles.estado },
    h(Text, { style: styles.estadoTitulo }, "No tenes notificaciones"),
    h(Text, { style: styles.estadoDetalle }, "Cuando recibas una notificacion va a aparecer aca")
  );
}

function EstadoError({ mensaje, onReintentar }) {
  return h(
    View,
    { style: styles.estado },
    h(Text, { style: styles.estadoTitulo }, "No pudimos cargar las notificaciones"),
    h(Text, { style: styles.estadoDetalle }, mensaje || "Revisa tu conexion e intenta de nuevo"),
    h(
      Pressable,
      {
        onPress: onReintentar,
        accessibilityRole: "button",
        style: ({ pressed }) => [styles.botonPrimario, pressed && styles.botonPresionado]
      },
      h(Text, { style: styles.botonPrimarioTexto }, "Reintentar")
    )
  );
}

function Cargando() {
  return h(
    View,
    { style: styles.estado },
    h(ActivityIndicator, { color: COLORES.navy, size: "large" }),
    h(Text, { style: styles.estadoDetalle }, "Cargando notificaciones...")
  );
}

export default function PantallaNotificaciones() {
  const [notificaciones, setNotificaciones] = useState([]);
  const [noLeidas, setNoLeidas] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [ocupadoId, setOcupadoId] = useState(null);
  const [marcandoTodas, setMarcandoTodas] = useState(false);

  const cargarDatos = useCallback(async () => {
    setCargando(true);
    setError("");
    try {
      const [lista, contador] = await Promise.all([
        listarNotificaciones(),
        obtenerContadorNoLeidas().catch(() => 0)
      ]);
      setNotificaciones(Array.isArray(lista) ? lista : []);
      setNoLeidas(typeof contador === "number" ? contador : 0);
    } catch (error) {
      setError(error?.mensaje || error?.message || "Ocurrio un problema al consultar las notificaciones");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const marcarLeida = useCallback(
    async (id) => {
      setOcupadoId(id);
      try {
        const actualizada = await marcarNotificacionComoLeida(id);
        setNotificaciones((prev) =>
          prev.map((item) =>
            item.id === id && actualizada && typeof actualizada === "object"
              ? { ...item, ...actualizada }
              : item.id === id
                ? { ...item, isRead: true }
                : item
          )
        );
        setNoLeidas((prev) => Math.max(0, prev - 1));
      } catch (error) {
        Alert.alert("Notificaciones", error?.mensaje || error?.message || "No se pudo marcar la notificacion como leida");
      } finally {
        setOcupadoId(null);
      }
    },
    []
  );

  const marcarTodas = useCallback(async () => {
    setMarcandoTodas(true);
    try {
      await marcarTodasComoLeidas();
      setNotificaciones((prev) => prev.map((item) => ({ ...item, isRead: true })));
      try {
        const contador = await obtenerContadorNoLeidas();
        setNoLeidas(typeof contador === "number" ? contador : 0);
      } catch {
        setNoLeidas(0);
      }
    } catch (error) {
      Alert.alert("Notificaciones", error?.mensaje || error?.message || "No se pudieron marcar todas como leidas");
    } finally {
      setMarcandoTodas(false);
    }
  }, []);

  const renderItem = useCallback(
    ({ item }) =>
      h(NotificacionItem, {
        notificacion: item,
        ocupado: ocupadoId === item.id || marcandoTodas,
        onMarcarLeida: marcarLeida
      }),
    [ocupadoId, marcandoTodas, marcarLeida]
  );

  const keyExtractor = useCallback((item, indice) => item?.id ? String(item.id) : String(indice), []);

  const encabezado = useCallback(
    () =>
      h(
        View,
        { style: styles.encabezado },
        h(
          View,
          { style: styles.encabezadoFila },
          h(Text, { style: styles.titulo }, "Notificaciones"),
          noLeidas > 0
            ? h(View, { style: styles.marca }, h(Text, { style: styles.marcaTexto }, String(noLeidas)))
            : null
        ),
        noLeidas > 0
          ? h(
              Pressable,
              {
                onPress: marcarTodas,
                disabled: marcandoTodas,
                accessibilityRole: "button",
                accessibilityState: { disabled: marcandoTodas },
                style: ({ pressed }) => [styles.botonSecundario, pressed && styles.botonSecundarioPresionado]
              },
              marcandoTodas
                ? h(ActivityIndicator, { color: COLORES.indigo, size: "small" })
                : h(Text, { style: styles.botonSecundarioTexto }, "Marcar todas como leidas")
            )
          : null
      ),
    [noLeidas, marcandoTodas, marcarTodas]
  );

  if (cargando) {
    return h(Cargando, null);
  }

  if (error) {
    return h(EstadoError, { mensaje: error, onReintentar: cargarDatos });
  }

  return h(
    View,
    { style: styles.pantalla },
    h(FlatList, {
      data: notificaciones,
      renderItem,
      keyExtractor,
      ListHeaderComponent: encabezado,
      ListEmptyComponent: EstadoVacio,
      contentContainerStyle: notificaciones.length === 0 ? styles.listaNuevaVacia : styles.lista,
      showsVerticalScrollIndicator: false
    })
  );
}

const styles = StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: COLORES.fondoApp
  },
  encabezado: {
    paddingHorizontal: ESPACIOS.xl,
    paddingTop: ESPACIOS.lg,
    paddingBottom: ESPACIOS.md,
    gap: ESPACIOS.md
  },
  encabezadoFila: {
    flexDirection: "row",
    alignItems: "center",
    gap: ESPACIOS.md
  },
  titulo: {
    color: COLORES.titulo,
    fontSize: 24,
    fontWeight: "800"
  },
  marca: {
    backgroundColor: COLORES.indigo,
    borderRadius: RADIOS.chip,
    minWidth: 26,
    paddingHorizontal: ESPACIOS.sm,
    paddingVertical: 2,
    alignItems: "center",
    justifyContent: "center"
  },
  marcaTexto: {
    ...TIPOGRAFIA.badge,
    color: COLORES.blanco
  },
  lista: {
    paddingHorizontal: ESPACIOS.xl,
    paddingBottom: ESPACIOS.xxl,
    gap: ESPACIOS.md
  },
  listaNuevaVacia: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: ESPACIOS.xl
  },
  item: {
    borderWidth: 1,
    borderRadius: RADIOS.alerta,
    padding: ESPACIOS.lg
  },
  itemNoLeida: {
    backgroundColor: COLORES.azulFondo,
    borderColor: COLORES.azulBorde
  },
  itemLeida: {
    backgroundColor: COLORES.blanco,
    borderColor: COLORES.borde
  },
  itemPresionado: {
    opacity: 0.9
  },
  itemFila: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: ESPACIOS.md
  },
  indicadorNoLeida: {
    width: 8,
    height: 8,
    borderRadius: RADIOS.chip,
    backgroundColor: COLORES.indigo,
    marginTop: 6
  },
  indicadorLeida: {
    width: 8,
    height: 8,
    borderRadius: RADIOS.chip,
    backgroundColor: COLORES.borde,
    marginTop: 6
  },
  itemTexto: {
    flex: 1,
    gap: ESPACIOS.xs
  },
  itemTituloNoLeida: {
    color: COLORES.titulo,
    fontSize: 15,
    fontWeight: "800"
  },
  itemTituloLeida: {
    color: COLORES.textoSuave,
    fontSize: 15,
    fontWeight: "600"
  },
  itemCuerpoNoLeida: {
    ...TIPOGRAFIA.subtitulo,
    color: COLORES.texto
  },
  itemCuerpoLeida: {
    ...TIPOGRAFIA.subtitulo,
    color: COLORES.textoSuave
  },
  itemFecha: {
    ...TIPOGRAFIA.pie,
    color: COLORES.textoSuave,
    marginTop: ESPACIOS.xs
  },
  estado: {
    alignItems: "center",
    justifyContent: "center",
    gap: ESPACIOS.md,
    padding: ESPACIOS.xl
  },
  estadoTitulo: {
    ...TIPOGRAFIA.etiqueta,
    color: COLORES.titulo,
    fontSize: 17,
    textAlign: "center"
  },
  estadoDetalle: {
    ...TIPOGRAFIA.subtitulo,
    color: COLORES.textoSuave,
    textAlign: "center"
  },
  botonPrimario: {
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORES.boton,
    borderRadius: RADIOS.boton,
    paddingHorizontal: ESPACIOS.xl,
    marginTop: ESPACIOS.sm
  },
  botonPresionado: {
    backgroundColor: COLORES.botonPresionado
  },
  botonPrimarioTexto: {
    ...TIPOGRAFIA.boton,
    color: COLORES.blanco
  },
  botonSecundario: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: ESPACIOS.sm,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: COLORES.linea,
    borderRadius: RADIOS.boton,
    backgroundColor: COLORES.papel,
    paddingVertical: ESPACIOS.sm,
    paddingHorizontal: ESPACIOS.lg
  },
  botonSecundarioPresionado: {
    opacity: 0.85
  },
  botonSecundarioTexto: {
    ...TIPOGRAFIA.enlace,
    color: COLORES.indigo
  }
});
