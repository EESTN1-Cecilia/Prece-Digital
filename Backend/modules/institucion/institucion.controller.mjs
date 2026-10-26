import { institucionService } from "./institucion.service.mjs";

export function obtenerInstitucion() {
  return { data: institucionService.datos() };
}

export function obtenerAreas() {
  return { data: institucionService.areas() };
}
