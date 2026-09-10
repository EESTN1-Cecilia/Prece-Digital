import { solicitudInvalida } from "./api-error.mjs";

/* Lee el cuerpo JSON de una peticion. Devuelve un objeto vacio si no hay cuerpo.
   Limita el tamano para evitar abuso de memoria. */
const LIMITE_BYTES = 1_000_000;

export function leerCuerpoJson(request) {
  return new Promise((resolve, reject) => {
    let datos = "";

    request.on("data", (trozo) => {
      datos += trozo;

      if (datos.length > LIMITE_BYTES) {
        request.destroy();
        reject(solicitudInvalida("El cuerpo de la solicitud es demasiado grande."));
      }
    });

    request.on("end", () => {
      if (!datos.trim()) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(datos));
      } catch {
        reject(solicitudInvalida("El cuerpo de la solicitud debe ser JSON valido."));
      }
    });

    request.on("error", () => {
      reject(solicitudInvalida("No se pudo leer el cuerpo de la solicitud."));
    });
  });
}