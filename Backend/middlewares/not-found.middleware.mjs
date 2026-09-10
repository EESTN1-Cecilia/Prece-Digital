import { ApiError } from "../utils/api-error.mjs";

/* La ruta inexistente se resuelve como cualquier otro error previsto:
   lo traduce el middleware centralizado. */
export function notFound() {
  throw new ApiError("NOT_FOUND", "El endpoint solicitado no existe.");
}
