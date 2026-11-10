/* Mi Cuenta: activar o desactivar el ingreso con Face ID / huella. */

import React, { useEffect, useState } from "react";
import { Platform } from "react-native";

import { activarBiometria, biometriaActivada, desactivarBiometria, estadoBiometria } from "../../services/biometria.js";
import { Aviso, Boton, Nota, Tarjeta } from "./componentes.js";

const h = React.createElement;

export default function BiometriaTarjeta() {
  const [estado, setEstado] = useState(null);
  const [activada, setActivada] = useState(false);
  const [trabajando, setTrabajando] = useState(false);
  const [aviso, setAviso] = useState(null);

  useEffect(() => {
    let vigente = true;
    (async () => {
      const [e, a] = await Promise.all([estadoBiometria(Platform.OS), biometriaActivada()]);
      if (vigente) {
        setEstado(e);
        setActivada(a);
      }
    })();
    return () => {
      vigente = false;
    };
  }, []);

  /* Sin sensor, sin nada enrolado o en el navegador: no se ofrece. */
  if (!estado?.disponible) return null;

  async function alternar() {
    setTrabajando(true);
    setAviso(null);

    try {
      if (activada) {
        await desactivarBiometria();
        setActivada(false);
        return;
      }

      const resultado = await activarBiometria(Platform.OS);
      if (resultado.ok) setActivada(true);
      else if (resultado.motivo === "fallida") setAviso(`No pudimos verificar tu identidad con ${estado.nombre}.`);
    } finally {
      setTrabajando(false);
    }
  }

  return h(
    Tarjeta,
    { titulo: `Ingreso con ${estado.nombre}` },
    aviso ? h(Aviso, null, aviso) : null,
    h(Nota, null, activada
      ? `Activado: al abrir la app te pedimos ${estado.nombre}. Tu contraseña no se guarda en el teléfono.`
      : `Entrá más rápido: al abrir la app te pedimos ${estado.nombre} en lugar de la contraseña.`),
    h(Boton, { texto: activada ? "Desactivar" : `Activar ${estado.nombre}`, onPress: alternar, cargando: trabajando, variante: activada ? "claro" : "primario" })
  );
}
