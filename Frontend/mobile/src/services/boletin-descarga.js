/* Descarga e impresion del boletin como PDF.
   - Android / iOS: genera el PDF con expo-print y abre el menu de compartir
     para guardarlo (Archivos / Drive) o enviarlo.
   - Navegador (vista previa web): abre el dialogo de impresion ("Guardar como PDF").
   No se guarda nada en el dispositivo: el PDF es temporal. */

import { Platform } from "react-native";

import { LOGO_DATA_URI } from "../assets/logo-base64.js";
import { boletinHtml, nombreArchivoBoletin } from "../utils/boletin.js";

async function cargarModulos() {
  const [Print, Sharing] = await Promise.all([import("expo-print"), import("expo-sharing")]);
  return { Print, Sharing };
}

export async function descargarBoletinPdf(datos) {
  const html = boletinHtml(datos, { logo: LOGO_DATA_URI });
  const { Print, Sharing } = await cargarModulos();

  if (Platform.OS === "web") {
    await Print.printAsync({ html });
    return;
  }

  const { uri } = await Print.printToFileAsync({ html, width: 595, height: 842 });

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("Este dispositivo no puede compartir archivos.");
  }

  await Sharing.shareAsync(uri, {
    mimeType: "application/pdf",
    UTI: "com.adobe.pdf",
    dialogTitle: nombreArchivoBoletin(datos)
  });
}

export async function imprimirBoletin(datos) {
  const { Print } = await cargarModulos();
  await Print.printAsync({ html: boletinHtml(datos, { logo: LOGO_DATA_URI }) });
}
