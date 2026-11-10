/* Resolucion automatica del Backend en desarrollo.

   Web y Mobile usan LA MISMA API (Backend/, puerto 3000) y los mismos datos.
   "localhost" solo sirve en el navegador de la PC: en el celular apunta al
   propio celular. Por eso, si no se fijo EXPO_PUBLIC_API_BASE_URL, se toma la
   IP de la PC desde el servidor de desarrollo de Expo (la misma por la que el
   celular descargo la app) y se le agrega el puerto de la API.

   Este modulo importa react-native y expo-constants: no se usa en los tests. */

import { Platform } from "react-native";

import { baseUrlFijadaPorEntorno, configurarBaseUrl, esDesarrollo } from "./env.js";

const PUERTO_API = 3000;

function hostDeExpo() {
  try {
    // eslint-disable-next-line global-require
    const Constants = require("expo-constants").default;
    const hostUri = Constants?.expoConfig?.hostUri ?? Constants?.expoGoConfig?.debuggerHost ?? "";
    const host = String(hostUri).split(":")[0].trim();

    return host || null;
  } catch {
    return null;
  }
}

export function resolverBaseUrlDeDesarrollo() {
  if (!esDesarrollo() || baseUrlFijadaPorEntorno()) {
    return;
  }

  const host =
    Platform.OS === "web" && typeof window !== "undefined" && window.location?.hostname
      ? window.location.hostname
      : hostDeExpo();

  if (host) {
    configurarBaseUrl(`http://${host}:${PUERTO_API}`);
  }
}
