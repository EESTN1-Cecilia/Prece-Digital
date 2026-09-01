export const modules = [
  {
    id: "identity",
    name: "Identidad y acceso",
    description: "Usuarios, roles, permisos por alcance y sesiones auditadas."
  },
  {
    id: "academic-structure",
    name: "Estructura academica",
    description: "Escuelas, ciclos, turnos, cursos, materias, talleres y asignaciones."
  },
  {
    id: "attendance",
    name: "Asistencia",
    description: "Registro institucional y por materia, justificaciones, cierres y alertas."
  },
  {
    id: "students",
    name: "Estudiantes y legajos",
    description: "Datos personales, trayectoria, pases y documentacion respaldatoria."
  },
  {
    id: "grades",
    name: "Calificaciones",
    description: "Evaluaciones, cierres, intensificaciones, RITE y reaperturas justificadas."
  },
  {
    id: "files",
    name: "Excel y documentos",
    description: "Plantillas versionadas, importaciones reversibles y exportaciones autorizadas."
  },
  {
    id: "audit",
    name: "Auditoria",
    description: "Historial de cambios, accesos, exportaciones, restauraciones y aprobaciones."
  }
];

export const roles = [
  {
    id: "super-admin",
    name: "Superadministrador",
    scopes: ["global"]
  },
  {
    id: "system-admin",
    name: "Administrador del sistema",
    scopes: ["school"]
  },
  {
    id: "director",
    name: "Directivo",
    scopes: ["school", "period"]
  },
  {
    id: "secretary",
    name: "Secretaria",
    scopes: ["school", "course", "period"]
  },
  {
    id: "area-lead",
    name: "Jefatura de area",
    scopes: ["school", "area", "subject", "period"]
  },
  {
    id: "preceptor",
    name: "Preceptoria",
    scopes: ["school", "course", "shift", "period"]
  },
  {
    id: "teacher",
    name: "Docencia",
    scopes: ["school", "course", "subject", "period"]
  },
  {
    id: "attendance-operator",
    name: "Responsable operativo de asistencia",
    scopes: ["school", "course", "shift", "period"]
  }
];
