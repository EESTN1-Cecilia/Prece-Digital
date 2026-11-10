/* Pantalla de bloqueo: pide la biometria antes de mostrar el portal. */

import React, { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";

import { Aviso, Boton, Tarjeta, estilos } from "../alumno/componentes.js";
import { COLORES, PORTAL } from "../../theme/tokens.js";

const h = React.createElement;

export default function BloqueoScreen({ nombre, onDesbloquear, onUsarPassword }) {
  const [cargando, setCargando] = useState(false);
  const [fallo, setFallo] = useState(false);
  const enCurso = useRef(false);

  async function intentar() {
    if (enCurso.current) return;
    enCurso.current = true;
    setCargando(true);
    setFallo(false);

    try {
      const ok = await onDesbloquear();
      if (!ok) setFallo(true);
    } finally {
      enCurso.current = false;
      setCargando(false);
    }
  }

  /* Se lanza solo al abrir, para no obligar a tocar un boton. */
  useEffect(() => {
    intentar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return h(
    View,
    { style: { flex: 1, justifyContent: "center", padding: 16, backgroundColor: COLORES.fondoApp } },
    h(
      Tarjeta,
      { titulo: "Ingresá a tu cuenta" },
      h(Text, { style: estilos.nota }, `Usá ${nombre} para desbloquear la app.`),
      fallo ? h(Aviso, null, "No pudimos verificar tu identidad. Probá de nuevo o ingresá con tu contraseña.") : null,
      h(Boton, { texto: `Desbloquear con ${nombre}`, onPress: intentar, cargando }),
      h(Boton, { texto: "Ingresar con usuario y contraseña", onPress: onUsarPassword, variante: "claro", deshabilitado: cargando })
    )
  );
}
