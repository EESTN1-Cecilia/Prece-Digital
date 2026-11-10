/* Une expo-local-authentication con el servicio de biometria.
   En el navegador (Expo web) no hay biometria: el servicio queda sin adaptador
   y la opcion no se ofrece. */

import { Platform } from "react-native";

import { configurarBiometria } from "./biometria.js";

export function crearAdaptadorBiometria() {
  /* Se carga recien al usarse: si falta el paquete, la app sigue funcionando sin biometria. */
  const cargar = () => require("expo-local-authentication");

  return {
    hayHardware: () => cargar().hasHardwareAsync(),
    hayEnrolada: () => cargar().isEnrolledAsync(),
    tipos: () => cargar().supportedAuthenticationTypesAsync(),
    autenticar: (mensaje) =>
      cargar().authenticateAsync({
        promptMessage: mensaje,
        cancelLabel: "Usar contraseña",
        fallbackLabel: "Usar código del dispositivo"
      })
  };
}

export function instalarBiometria() {
  if (Platform.OS === "web") {
    configurarBiometria(null);
    return;
  }

  configurarBiometria(crearAdaptadorBiometria());
}
