/* Planilla de calificaciones desde el Portal Docente: abre la planilla oficial
   (modules/documents/planilla-calificaciones-modal.js) con las divisiones y
   materias asignadas al docente. Al guardarla, las notas quedan en el boletin
   compartido y aparecen solas en el Boletin Digital y en preceptoria. */

import { useState } from "react";
import { h } from "../../../layouts/site-layout.js";
import { useUsuarioActual } from "../../../estado/index.js";
import { PlanillaCalificacionesModal } from "../../documents/planilla-calificaciones-modal.js";

function asignacionDe(clase) {
  return { anio: clase.anio, curso: `${clase.anio}°`, division: String(clase.division), materia: clase.materia ?? "", turno: clase.turno ?? null };
}

/* clases: resultado de expandirClases(cursos). */
export function usePlanillaCalificaciones(clases = []) {
  const usuario = useUsuarioActual();
  const [abierta, setAbierta] = useState(null);

  const modal = abierta
    ? h(PlanillaCalificacionesModal, {
        key: abierta.clave,
        abierto: true,
        onCerrar: () => setAbierta(null),
        cursoInicial: `${abierta.anio}°`,
        divisionInicial: String(abierta.division),
        materiaInicial: abierta.materia ?? null,
        asignacionesDocente: clases.map(asignacionDe),
        esDocente: true,
        profesorNombre: [usuario?.nombre, usuario?.apellido].filter(Boolean).join(" ") || null
      })
    : null;

  return { abrir: setAbierta, modal };
}
