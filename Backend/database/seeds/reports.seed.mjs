/* Datos de desarrollo del modulo Informes.

   Se cargan informes en estado borrador con la estructura de las plantillas y
   los textos de guia: no se inventan cifras ni resultados de la institucion.
   El contenido real lo completa Direccion. */

import { reportsRepository } from "../repositories/reports.repository.mjs";
import { contenidoInicial, plantillaPorId } from "../../modules/reports/plantillas.mjs";

const EJEMPLOS = [
  {
    titulo: "Informe institucional - Presentación del ciclo",
    asunto: "Presentación institucional ante la comunidad educativa",
    dirigidoA: "Personal docente y administrativo",
    autor: "Dirección General",
    autorCargo: "Dirección",
    estado: "borrador",
    plantilla: "institucional"
  },
  {
    titulo: "Informe de personal - Composición del equipo",
    asunto: "Composición de los equipos de trabajo por sector",
    dirigidoA: "Jefaturas de sector",
    autor: "Dirección General",
    autorCargo: "Dirección",
    estado: "borrador",
    plantilla: "personal"
  }
];

export function seedReports() {
  if (reportsRepository.list().length > 0) {
    return;
  }

  for (const ejemplo of EJEMPLOS) {
    if (!plantillaPorId(ejemplo.plantilla)) {
      continue;
    }

    reportsRepository.create({
      ...ejemplo,
      contenido: contenidoInicial(ejemplo.plantilla),
      schoolId: "esc-1",
      creadoPor: null,
      creadoEn: new Date().toISOString(),
      actualizadoEn: new Date().toISOString()
    });
  }
}
