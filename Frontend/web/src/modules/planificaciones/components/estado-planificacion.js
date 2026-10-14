/* Badge del estado de una planificacion.

   El tono acompana pero el texto siempre dice el estado, para que se entienda
   sin distinguir colores. Los estados salen del backend: uno nuevo se muestra
   igual, con tono neutral. */

import { h } from "../../../layouts/site-layout.js";
import { Badge } from "../../../components/ui/index.js";
import { nombreDeEstado, tonoDeEstado } from "../planificaciones-helpers.js";

export function EstadoPlanificacion({ estado }) {
  return h(Badge, { tono: tonoDeEstado(estado) }, nombreDeEstado(estado));
}
