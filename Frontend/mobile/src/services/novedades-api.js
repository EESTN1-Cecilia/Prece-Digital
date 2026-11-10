/* Novedades del alumno: comunicados de Dirección y descarga de adjuntos. */

import { Platform } from "react-native";

import { pedir } from "./api.js";
import { base64ABytes, leerDataUrl, nombreSeguro } from "../utils/novedades.js";

const BASE = "/api/v1/alumno";

export const obtenerNovedades = () => pedir(`${BASE}/novedades`);

/* La lista no trae el contenido de los adjuntos: se piden de a uno. */
export const obtenerArchivoNovedad = (informeId) =>
  pedir(`${BASE}/novedades/${encodeURIComponent(informeId)}/archivo`, { tiempoLimiteMs: 60000 });

/* Baja el adjunto y lo abre con el menú de compartir (guardar / abrir con otra app). */
export async function descargarAdjunto(informeId) {
  const archivo = await obtenerArchivoNovedad(informeId);
  const contenido = leerDataUrl(archivo?.dataUrl);

  if (!contenido) {
    throw Object.assign(new Error("Archivo inválido."), { mensaje: "El archivo no se pudo leer. Intentá de nuevo." });
  }

  const nombre = nombreSeguro(archivo.nombre);

  if (Platform.OS === "web") {
    const bytes = base64ABytes(contenido.base64);
    const direccion = URL.createObjectURL(new Blob([bytes], { type: contenido.mime }));
    const enlace = document.createElement("a");
    enlace.href = direccion;
    enlace.download = nombre;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    setTimeout(() => URL.revokeObjectURL(direccion), 10000);
    return;
  }

  const sistema = await import("expo-file-system");
  const compartir = await import("expo-sharing");
  const bytes = base64ABytes(contenido.base64);
  const destino = new sistema.File(sistema.Paths.cache, nombre);

  if (destino.exists) destino.delete();
  destino.create();
  destino.write(bytes);

  if (!(await compartir.isAvailableAsync())) {
    throw Object.assign(new Error("Sin compartir."), { mensaje: "Este dispositivo no permite abrir archivos." });
  }

  await compartir.shareAsync(destino.uri, { mimeType: contenido.mime, dialogTitle: nombre });
}
