/* Resumen de una consulta: total, cantidad por estado y ultima actualizacion.
   Los numeros los calcula el backend (`resumen` de las consultas por docente,
   materia y curso). */

import { h } from "../../../layouts/site-layout.js";
import { fecha } from "../../../utils/formato.js";
import { estadosConCantidad } from "../planificaciones-helpers.js";
import { EstadoPlanificacion } from "./estado-planificacion.js";

export function ResumenEstados({ resumen, catalogos }) {
  if (!resumen) {
    return null;
  }

  const estados = estadosConCantidad(resumen, catalogos);

  return h(
    "div",
    { className: "planif-resumen", role: "status" },
    h(
      "div",
      { className: "planif-resumen__total" },
      h("span", { className: "planif-resumen__numero" }, String(resumen.total)),
      h("span", null, resumen.total === 1 ? "planificación" : "planificaciones")
    ),
    h(
      "ul",
      { className: "planif-resumen__estados" },
      estados.map(({ estado, cantidad }) =>
        h("li", { key: estado }, h(EstadoPlanificacion, { estado }), h("strong", null, String(cantidad)))
      )
    ),
    h("p", { className: "planif-resumen__fecha" }, `Última actualización: ${fecha(resumen.ultimaActualizacion)}`)
  );
}
