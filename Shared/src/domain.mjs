/* Catalogo de dominio compartido por Backend, Frontend web y Frontend mobile.

   Es la UNICA definicion de modulos y roles del proyecto:
   - Backend: config/permissions.config.mjs arma los permisos a partir de aca y
     GET /api/v1/modules y GET /api/v1/roles lo exponen.
   - Frontend: lo importa directo para menus, filtros y catalogos.

   Agregar un modulo o un rol es tocar este archivo (y, para un rol, su lista de
   permisos en Backend/config/permissions.config.mjs). */

export const modules = [
  { id: "auth", name: "Autenticacion", description: "Login, refresh token y gestion de sesiones." },
  { id: "identity", name: "Identidad y acceso", description: "Usuarios, roles y permisos." },
  { id: "users", name: "Usuarios", description: "Cuentas del sistema y su estado." },
  { id: "students", name: "Estudiantes", description: "Legajo, datos personales, observaciones, pases y constancias." },
  { id: "observations", name: "Observaciones", description: "Observaciones de preceptoria, secretaria y equipo docente sobre alumnos." },
  { id: "attendance", name: "Asistencia", description: "Registro y consulta de asistencias." },
  { id: "grades", name: "Calificaciones", description: "Notas y evaluaciones." },
  { id: "schools", name: "Escuelas", description: "Instituciones educativas." },
  { id: "documents", name: "Documentos", description: "Documentacion academica." },
  { id: "spaces", name: "Espacios", description: "Aulas, talleres, laboratorios, edificios y carreras." },
  { id: "schedules", name: "Horarios", description: "Turnos, franjas y asignaciones horarias." },
  { id: "teachers", name: "Docentes", description: "Docentes y sus materias." },
  { id: "absences", name: "Ausencias", description: "Ausencias y novedades docentes." },
  { id: "workshops", name: "Talleres", description: "Talleres y sus sesiones." },
  { id: "inventory", name: "Inventario", description: "Inventario y movimientos." },
  { id: "requests", name: "Solicitudes", description: "Solicitudes del personal." },
  { id: "reservations", name: "Reservas", description: "Reservas de espacios y recursos." },
  { id: "notifications", name: "Notificaciones", description: "Notificaciones del sistema." },
  { id: "curriculum", name: "Curriculum", description: "Seguimiento curricular." },
  { id: "academics", name: "Estructura academica", description: "Ciclos, orientaciones, cursos y divisiones." },
  { id: "academic-records", name: "Situacion academica", description: "Materias pendientes, recursadas e intensificadas." },
  { id: "audit", name: "Auditoria", description: "Historial de cambios, accesos, exportaciones y errores." }
];

export const roles = [
  { id: "admin", name: "Administrador", description: "Acceso total a todos los modulos del sistema." },
  { id: "director", name: "Direccion", description: "Gestion integral de la institucion." },
  { id: "secretario", name: "Secretaria", description: "Administracion academica y documentacion." },
  { id: "preceptor", name: "Preceptoria", description: "Seguimiento de estudiantes y asistencia." },
  { id: "docente", name: "Docente", description: "Clases, notas y asistencia de sus cursos." },
  { id: "jefe_area", name: "Jefatura de Area", description: "Planificacion curricular y equipos docentes." },
  { id: "server", name: "Responsable de Server", description: "Infraestructura, espacios y operacion tecnica." }
];

/* Acciones canonicas de un permiso "<modulo>.<accion>". */
export const actions = [
  { id: "read", name: "Consultar" },
  { id: "create", name: "Crear" },
  { id: "update", name: "Modificar" },
  { id: "delete", name: "Eliminar" },
  { id: "approve", name: "Aprobar" },
  { id: "upload", name: "Cargar" },
  { id: "write", name: "Escribir (crear, modificar y cargar)" },
  { id: "manage", name: "Gestionar (eliminar y aprobar)" }
];

/* Un permiso siempre es "<modulo>.<accion>", por ejemplo "students.read". */
export function permiso(modulo, accion) {
  return `${modulo}.${accion}`;
}
