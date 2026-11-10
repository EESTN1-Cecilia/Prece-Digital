/* Une el almacen seguro real de Expo con el adaptador de secure-store.js.
   expo-secure-store se carga como modulo nativo opcional para que el bundle no
   dependa de una importacion estatica: si el paquete no esta instalado la app
   lo informa con un mensaje claro en lugar de guardar el token en otro lado. */

import { requireOptionalNativeModule } from "expo-modules-core";
import { Platform } from "react-native";

import { configurarAlmacenamientoSeguro, crearAlmacenamientoEnMemoria } from "./secure-store.js";

const NOMBRE_NATIVO = "SecureStore";

export function crearAdaptadorSecureStore() {
  const SecureStore = requireOptionalNativeModule(NOMBRE_NATIVO);

  if (!SecureStore) {
    throw new Error(
      "expo-secure-store no esta instalado. Ejecuta `npx expo install expo-secure-store` en Frontend/mobile para habilitar el almacenamiento seguro de la sesion."
    );
  }

  /* Solo se puede leer con el dispositivo desbloqueado. */
  const opciones = {};

  if (SecureStore.WHEN_UNLOCKED) {
    opciones.whenAccessible = SecureStore.WHEN_UNLOCKED;
    opciones.keychainAccessible = SecureStore.WHEN_UNLOCKED;
  }

  return {
    getItemAsync(clave) {
      return SecureStore.getItemAsync(clave, opciones);
    },
    setItemAsync(clave, valor) {
      return SecureStore.setItemAsync(clave, valor, opciones);
    },
    deleteItemAsync(clave) {
      return SecureStore.deleteItemAsync(clave, opciones);
    }
  };
}

export function instalarAlmacenamientoSeguro() {
  /* En el navegador (vista previa de Expo web) no existe Keychain/Keystore.
     Los tokens se guardan SOLO en memoria: nunca en localStorage, y se pierden
     al recargar la pagina. En Android e iOS siempre se usa el almacen seguro. */
  if (Platform.OS === "web") {
    configurarAlmacenamientoSeguro(crearAlmacenamientoEnMemoria());
    return;
  }

  configurarAlmacenamientoSeguro(crearAdaptadorSecureStore);
}