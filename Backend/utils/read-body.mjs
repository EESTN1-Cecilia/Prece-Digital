import { HttpError } from "./http-error.mjs";

const MAX_BODY_BYTES = 1024 * 1024;

export function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;

    request.on("data", (chunk) => {
      size += chunk.length;

      if (size > MAX_BODY_BYTES) {
        reject(new HttpError(413, "payload_too_large", "El cuerpo de la solicitud supera el límite"));
        request.destroy();
        return;
      }

      chunks.push(chunk);
    });

    request.on("end", () => {
      if (size === 0) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch {
        reject(new HttpError(400, "invalid_json", "El cuerpo debe ser JSON válido"));
      }
    });

    request.on("error", () => {
      reject(new HttpError(400, "invalid_body", "No se pudo leer el cuerpo de la solicitud"));
    });
  });
}
