/* Plantillas de informes disponibles en el panel de Dirección.

   Cada plantilla es una estructura de trabajo: el editor la abre con los
   apartados ya ordenados y el usuario completa los textos. No son datos de la
   institucion: son esquemas, asi que puede haberplantillas que no se usen en
   un ciclo lectivo. */

export const PLANTILLAS_INFORMES = [
  {
    id: "institucional",
    nombre: "Informe Institucional",
    descripcion: "Apartados para comunicaciones y notas institucionales de Dirección.",
    icono: "clipboard",
    secciones: [
      { clave: "presentacion", titulo: "Presentación", ayuda: "Motivo del informe y contexto del ciclo lectivo." },
      { clave: "fundamentos", titulo: "Fundamentos", ayuda: "Antecedentes y normativa de referencia." },
      { clave: "medidas", titulo: "Medidas adoptadas", ayuda: "Acciones realizadas y responsables." },
      { clave: "conclusiones", titulo: "Conclusiones", ayuda: "Cierre y próximos pasos." }
    ]
  },
  {
    id: "academico",
    nombre: "Informe Académico",
    descripcion: "Estructura para el seguimiento del cursado y los resultados por división.",
    icono: "academic",
    secciones: [
      { clave: "datos", titulo: "Datos generales", ayuda: "Ciclo lectivo, courses y divisiones analizadas." },
      { clave: "resultados", titulo: "Resultados por división", ayuda: "Tabla con los indicadores de cada división." },
      { clave: "analisis", titulo: "Análisis", ayuda: "Lectura de los resultados y casos que requieren seguimiento." },
      { clave: "conclusiones", titulo: "Conclusiones", ayuda: "Cierre y recomendaciones." }
    ]
  },
  {
    id: "asistencia",
    nombre: "Informe de Asistencia",
    descripcion: "Estructura para el panorama de inasistencias y su seguimiento.",
    icono: "attendance",
    secciones: [
      { clave: "panorama", titulo: "Panorama general", ayuda: "Totales de inasistencias del período." },
      { clave: "detalle", titulo: "Detalle por división", ayuda: "Tabla con la distribución de las inasistencias." },
      { clave: "seguimiento", titulo: "Seguimiento", ayuda: "Seguimientos y Justificaciones registradas." },
      { clave: "conclusiones", titulo: "Conclusiones", ayuda: "Cierre del informe." }
    ]
  },
  {
    id: "personal",
    nombre: "Informe de Personal",
    descripcion: "Estructura para la composición y la situación del equipo docente y administrativo.",
    icono: "people",
    secciones: [
      { clave: "composicion", titulo: "Composición del equipo", ayuda: "Cantidad de personal por sector." },
      { clave: "distribucion", titulo: "Distribución por área", ayuda: "Tabla con el detalle por área institucional." },
      { clave: "administrativa", titulo: "Situación administrativa", ayuda: "Altas, bajas y cuentas inactivas." },
      { clave: "conclusiones", titulo: "Conclusiones", ayuda: "Cierre y próximos pasos." }
    ]
  }
];

const PLANTILLAS_POR_ID = new Map(PLANTILLAS_INFORMES.map((plantilla) => [plantilla.id, plantilla]));

export function listarPlantillas() {
  return PLANTILLAS_INFORMES.map((plantilla) => ({
    ...plantilla,
    secciones: plantilla.secciones.map((seccion) => ({ ...seccion }))
  }));
}

export function plantillaPorId(id) {
  return PLANTILLAS_POR_ID.get(id) ?? null;
}

/* Esqueleto HTML de una plantilla: los apartados con su guia de contenido.
   El usuario puede borrar, reordenar o completar cada bloque en el editor. */
export function contenidoInicial(id) {
  const plantilla = plantillaPorId(id);

  if (!plantilla) {
    return "";
  }

  return plantilla.secciones
    .map((seccion) => {
      const titulo = `<h2>${seccion.titulo}</h2>`;
      const guia = `<p>${seccion.ayuda}</p>`;

      if (seccion.clave === "resultados" || seccion.clave === "detalle" || seccion.clave === "distribucion") {
        const tabla =
          "<table><thead><tr><th>División</th><th>Indicador</th><th>Detalle</th></tr></thead>" +
          "<tbody><tr><td></td><td></td><td></td></tr></tbody></table>";
        return `${titulo}${guia}${tabla}`;
      }

      return `${titulo}${guia}`;
    })
    .join("");
}
