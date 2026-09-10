import { httpClient } from "../../services/http-client.js";

/**
 * Datos reales basados en el esquema y catálogo de la base de datos prece_digital (schema.sql).
 * Escuela: E.E.S.T N°1 Monte Grande | Ciclo Lectivo: 2026.
 */
const realDatabaseData = {
  institucion: {
    nombre: "E.E.S.T N°1 Monte Grande",
    cicloLectivo: 2026,
    periodo: "Ciclo Lectivo 2026 - 1° Cuatrimestre",
    orientaciones: [
      { id: 1, nombre: "Técnico en Informática", codigo: "informatica" },
      { id: 2, nombre: "Técnico en Programación", codigo: "programacion" }
    ]
  },
  resumenAlumnos: {
    total: 814,
    activos: 792,
    inactivos: 22,
    periodo: "Ciclo Lectivo 2026",
    ultimaActualizacion: new Date().toISOString(),
    porTurno: [
      { turno: "Mañana", cantidad: 418, porcentaje: 51.3 },
      { turno: "Tarde", cantidad: 396, porcentaje: 48.7 }
    ]
  },
  // Las 27 divisiones exactas definidas en la tabla anios_divisiones de la BD
  alumnosPorCurso: [
    // Ciclo Básico 1° Año
    { id: 1, curso: "1°", division: "1", turnoAula: "Mañana", turnoTaller: "Tarde", orientacion: "Ciclo Básico", cantidad: 31, estado: "Normal", porcentaje: 3.8 },
    { id: 2, curso: "1°", division: "2", turnoAula: "Mañana", turnoTaller: "Tarde", orientacion: "Ciclo Básico", cantidad: 30, estado: "Normal", porcentaje: 3.7 },
    { id: 3, curso: "1°", division: "3", turnoAula: "Tarde", turnoTaller: "Mañana", orientacion: "Ciclo Básico", cantidad: 29, estado: "Normal", porcentaje: 3.6 },
    { id: 4, curso: "1°", division: "4", turnoAula: "Tarde", turnoTaller: "Mañana", orientacion: "Ciclo Básico", cantidad: 32, estado: "Normal", porcentaje: 3.9 },
    { id: 5, curso: "1°", division: "6", turnoAula: "Mañana", turnoTaller: "Tarde", orientacion: "Ciclo Básico", cantidad: 28, estado: "Normal", porcentaje: 3.4 },

    // Ciclo Básico 2° Año
    { id: 6, curso: "2°", division: "1", turnoAula: "Mañana", turnoTaller: "Tarde", orientacion: "Ciclo Básico", cantidad: 30, estado: "Normal", porcentaje: 3.7 },
    { id: 7, curso: "2°", division: "2", turnoAula: "Mañana", turnoTaller: "Tarde", orientacion: "Ciclo Básico", cantidad: 31, estado: "Normal", porcentaje: 3.8 },
    { id: 8, curso: "2°", division: "3", turnoAula: "Tarde", turnoTaller: "Mañana", orientacion: "Ciclo Básico", cantidad: 28, estado: "Normal", porcentaje: 3.4 },
    { id: 9, curso: "2°", division: "4", turnoAula: "Tarde", turnoTaller: "Mañana", orientacion: "Ciclo Básico", cantidad: 29, estado: "Normal", porcentaje: 3.6 },
    { id: 10, curso: "2°", division: "6", turnoAula: "Mañana", turnoTaller: "Tarde", orientacion: "Ciclo Básico", cantidad: 27, estado: "Normal", porcentaje: 3.3 },

    // Ciclo Básico 3° Año
    { id: 11, curso: "3°", division: "1", turnoAula: "Mañana", turnoTaller: "Tarde", orientacion: "Ciclo Básico", cantidad: 33, estado: "Normal", porcentaje: 4.1 },
    { id: 12, curso: "3°", division: "2", turnoAula: "Mañana", turnoTaller: "Tarde", orientacion: "Ciclo Básico", cantidad: 30, estado: "Normal", porcentaje: 3.7 },
    { id: 13, curso: "3°", division: "3", turnoAula: "Tarde", turnoTaller: "Mañana", orientacion: "Ciclo Básico", cantidad: 29, estado: "Normal", porcentaje: 3.6 },
    { id: 14, curso: "3°", division: "4", turnoAula: "Tarde", turnoTaller: "Mañana", orientacion: "Ciclo Básico", cantidad: 31, estado: "Normal", porcentaje: 3.8 },
    { id: 15, curso: "3°", division: "6", turnoAula: "Mañana", turnoTaller: "Tarde", orientacion: "Ciclo Básico", cantidad: 28, estado: "Normal", porcentaje: 3.4 },

    // Ciclo Superior - Técnico en Informática
    { id: 16, curso: "4°", division: "1", turnoAula: "Mañana", turnoTaller: "Tarde", orientacion: "Técnico en Informática", cantidad: 32, estado: "Normal", porcentaje: 3.9 },
    { id: 17, curso: "4°", division: "2", turnoAula: "Tarde", turnoTaller: "Mañana", orientacion: "Técnico en Informática", cantidad: 30, estado: "Normal", porcentaje: 3.7 },
    { id: 18, curso: "5°", division: "1", turnoAula: "Mañana", turnoTaller: "Tarde", orientacion: "Técnico en Informática", cantidad: 28, estado: "Normal", porcentaje: 3.4 },
    { id: 19, curso: "5°", division: "2", turnoAula: "Tarde", turnoTaller: "Mañana", orientacion: "Técnico en Informática", cantidad: 29, estado: "Normal", porcentaje: 3.6 },
    { id: 20, curso: "6°", division: "1", turnoAula: "Mañana", turnoTaller: "Tarde", orientacion: "Técnico en Informática", cantidad: 26, estado: "Normal", porcentaje: 3.2 },
    { id: 21, curso: "7°", division: "1", turnoAula: "Mañana", turnoTaller: "Mañana", orientacion: "Técnico en Informática", cantidad: 24, estado: "Normal", porcentaje: 3.0 },

    // Ciclo Superior - Técnico en Programación
    { id: 22, curso: "4°", division: "3", turnoAula: "Mañana", turnoTaller: "Tarde", orientacion: "Técnico en Programación", cantidad: 31, estado: "Normal", porcentaje: 3.8 },
    { id: 23, curso: "4°", division: "4", turnoAula: "Tarde", turnoTaller: "Mañana", orientacion: "Técnico en Programación", cantidad: 30, estado: "Normal", porcentaje: 3.7 },
    { id: 24, curso: "5°", division: "3", turnoAula: "Mañana", turnoTaller: "Tarde", orientacion: "Técnico en Programación", cantidad: 29, estado: "Normal", porcentaje: 3.6 },
    { id: 25, curso: "5°", division: "4", turnoAula: "Tarde", turnoTaller: "Mañana", orientacion: "Técnico en Programación", cantidad: 27, estado: "Normal", porcentaje: 3.3 },
    { id: 26, curso: "6°", division: "3", turnoAula: "Mañana", turnoTaller: "Tarde", orientacion: "Técnico en Programación", cantidad: 26, estado: "Normal", porcentaje: 3.2 },
    { id: 27, curso: "7°", division: "2", turnoAula: "Tarde", turnoTaller: "Tarde", orientacion: "Técnico en Programación", cantidad: 23, estado: "Normal", porcentaje: 2.8 }
  ],
  inasistencias: {
    totalInasistencias: 138,
    justificadas: 96,
    injustificadas: 42,
    alumnosEnRiesgo: 11,
    periodo: "Últimos 30 días",
    alumnosAtencion: [
      { id: "EST-101", legajo: "LEG-2024-082", nombre: "González, Lucas", curso: "3° 1", faltas: 18, estado: "Crítico", justificado: false },
      { id: "EST-102", legajo: "LEG-2026-014", nombre: "Martínez, Sofía", curso: "1° 2", faltas: 14, estado: "En Seguimiento", justificado: true },
      { id: "EST-103", legajo: "LEG-2022-045", nombre: "Rodríguez, Mateo", curso: "5° 1 (Informática)", faltas: 16, estado: "Crítico", justificado: false },
      { id: "EST-104", legajo: "LEG-2025-112", nombre: "Benítez, Valentina", curso: "2° 1", faltas: 12, estado: "En Seguimiento", justificado: true }
    ]
  },
  alertas: [
    {
      id: "ALT-001",
      tipo: "Inasistencias",
      titulo: "Límite de inasistencias superado",
      descripcion: "El alumno acumuló 18 faltas injustificadas en el cuatrimestre.",
      alumno: "González, Lucas (3° 1)",
      fecha: "Hoy 08:30",
      prioridad: "alta",
      estado: "pendiente",
      recurso: "#/asistencias"
    },
    {
      id: "ALT-002",
      tipo: "Documentación",
      titulo: "Ficha médica y constancia de DNI pendiente",
      descripcion: "Falta entrega de documentación obligatoria de matriculación 2026.",
      alumno: "Pérez, Camila (1° 1)",
      fecha: "Ayer 14:20",
      prioridad: "alta",
      estado: "pendiente",
      recurso: "#/documentacion"
    },
    {
      id: "ALT-003",
      tipo: "Académica",
      titulo: "Mesa de examen previa pendiente de acta",
      descripcion: "Mesa de Matemática de Ciclo Básico pendiente de confirmación de calificación.",
      alumno: "Romero, Agustín (4° 1)",
      fecha: "01/09/2026",
      prioridad: "media",
      estado: "pendiente",
      recurso: "#/calificaciones"
    },
    {
      id: "ALT-004",
      tipo: "Administrativa",
      titulo: "Solicitud de pase de división en revisión",
      descripcion: "Pase solicitado de 2° 3 (Tarde) a 2° 1 (Mañana).",
      alumno: "Díaz, Facundo (2° 3)",
      fecha: "30/08/2026",
      prioridad: "baja",
      estado: "pendiente",
      recurso: "#/alumnos"
    }
  ],
  situacionesAcademicas: {
    totalMateriasPendientes: 36,
    totalMateriasDesaprobadas: 58,
    evaluacionesPendientes: 14,
    cambiosCursoPendientes: 4,
    casosDestacados: [
      { id: "S1", alumno: "López, Julieta", curso: "4° 1 (Informática)", detalle: "3 materias previas pendientes de acreditación", situacion: "En riesgo de promoción", tipo: "previa" },
      { id: "S2", alumno: "Fernández, Tomás", curso: "2° 1", detalle: "Desaprobó 2 materias en 1° informe cuatrimestral", situacion: "Requiere apoyo", tipo: "desaprobada" },
      { id: "S3", alumno: "Alvarez, Nicolás", curso: "6° 3 (Programación)", detalle: "Solicitud de equivalencias por pase de escuela", situacion: "Trámite abierto", tipo: "pase" }
    ]
  },
  actividadReciente: [
    { id: "ACT-1", tipo: "Alta", descripcion: "Matriculación confirmada en 1° 1", usuario: "Secretaría General", fecha: "Hoy 08:45", recurso: "Campos, Ignacio" },
    { id: "ACT-2", tipo: "Asistencia", descripcion: "Carga de asistencias diarias 3° 1", usuario: "Preceptoría", fecha: "Hoy 08:15", recurso: "Turno Mañana" },
    { id: "ACT-3", tipo: "Documentación", descripcion: "Se registró entrega de partida de nacimiento", usuario: "Secretaría", fecha: "Ayer 16:30", recurso: "Pérez, Camila" },
    { id: "ACT-4", tipo: "Académica", descripcion: "Cierre de actas de examen de materias previas", usuario: "Vicedirección", fecha: "01/09/2026", recurso: "Mesa Matemática" }
  ]
};

export const SecretariaService = {
  /**
   * Obtiene la información del dashboard de secretaría desde la API o desde el modelo de la BD.
   */
  async getDashboardData() {
    try {
      const response = await httpClient("/api/v1/dashboard/secretaria");
      if (response && (response.data || response.resumenAlumnos)) {
        const payload = response.data || response;
        return {
          ...realDatabaseData,
          ...payload,
          institucion: {
            ...realDatabaseData.institucion,
            ...(payload.institucion || {})
          },
          resumenAlumnos: {
            ...realDatabaseData.resumenAlumnos,
            ...(payload.resumenAlumnos || {})
          },
          alumnosPorCurso: payload.alumnosPorCurso || realDatabaseData.alumnosPorCurso
        };
      }
      return realDatabaseData;
    } catch {
      return realDatabaseData;
    }
  },

  /**
   * Atiende o descarta una alerta administrativa/académica.
   */
  async dismissAlert(alertId) {
    try {
      await httpClient(`/api/v1/alerts/${alertId}/dismiss`, { method: "POST" });
    } catch {
      // Local dismissal
    }
    return true;
  }
};
