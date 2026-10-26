/* Identidad institucional y catalogos de support.

   Son datos de lectura que usa toda la aplicacion (encabezado del panel,
   formulario de alta de personal, modulo de Informes). Viven en el backend
   para que el frontend no escriba a mano el nombre de la institucion, el ciclo
   lectivo ni los sectores por los que se puede asignar personal. */

import { listarAreas } from "../../config/areas.config.mjs";
import { institucionConfig } from "../../config/institucion.config.mjs";

export const institucionService = {
  datos() {
    return institucionConfig();
  },

  areas() {
    return listarAreas();
  }
};
