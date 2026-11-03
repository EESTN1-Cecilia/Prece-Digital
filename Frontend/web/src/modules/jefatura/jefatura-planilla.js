/* Planilla oficial de calificaciones por grupo de taller.

   Es la misma planilla que se descarga desde "Documentos" (Oficio, cabecera
   institucional, cuatrimestres, intensificacion, resumen y firmas): se reutiliza
   su generador y solo se arman los datos del grupo. Sale con las notas en blanco
   para completarlas a mano. */

import { generarPlanillaPdf, nombreArchivoPlanilla } from "../documents/planilla-pdf.js";
import { calcularMetricas } from "../documents/planilla-estructura.js";

function unicos(valores) {
  return [...new Set(valores.filter(Boolean))];
}

/* `grupo`: { codigo, sesiones: [{ turno, docente }], alumnos: [{ apellido, nombre }] }
   `division`: { anio, division } */
export function armarDatosPlanilla({ division, grupo, ahora = new Date() }) {
  const estudiantes = grupo.alumnos.map((alumno, indice) => ({
    num: indice + 1,
    apellido: alumno.apellido ?? "",
    nombre: alumno.nombre ?? "",
    p1: "", p2: "", v1: "", c1: "", f1: 0,
    p3: "", p4: "", v2: "", c2: "", f2: 0,
    dic: "", feb: "", final: ""
  }));

  const turnos = unicos((grupo.sesiones ?? []).map((sesion) => String(sesion.turno ?? "").toUpperCase()));
  const docentes = unicos((grupo.sesiones ?? []).map((sesion) => sesion.docente));

  return {
    anioLectivo: String(ahora.getFullYear()),
    materia: `Taller · Grupo ${grupo.codigo}`,
    curso: `${division.anio}°`,
    division: String(division.division),
    turno: turnos.join(" y ") || "—",
    docente: docentes.join(", ") || "A designar",
    preceptor: "",
    estudiantes,
    metricas: calcularMetricas(estudiantes)
  };
}

export const nombrePlanillaGrupo = (datos) => nombreArchivoPlanilla(datos);

/* Genera el PDF y lo abre en otra pestana (desde ahi se imprime o se guarda).
   Si el navegador bloquea la ventana nueva, lo descarga. */
export async function abrirPlanillaPdf(datos) {
  const ventana = window.open("", "_blank");
  const blob = await generarPlanillaPdf(datos);
  const url = URL.createObjectURL(blob);

  if (ventana) {
    ventana.location.href = url;
  } else {
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = nombrePlanillaGrupo(datos);
    document.body.append(enlace);
    enlace.click();
    enlace.remove();
  }
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
