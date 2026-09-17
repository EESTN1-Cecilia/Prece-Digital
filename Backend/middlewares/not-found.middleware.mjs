import { ApiError } from "../utils/api-error.mjs";



export function notFound() {
  throw new ApiError("NOT_FOUND", "El endpoint solicitado no existe.");
}
