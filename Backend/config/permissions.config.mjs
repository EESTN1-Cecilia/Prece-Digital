import { modules as domainModules } from "./domain.mjs";
export const ROLES = {
  ADMIN: "admin",
  DIRECTOR: "director",
  SECRETARIO: "secretario",
  PRECEPTOR: "preceptor",
  DOCENTE: "docente",
  JEFE_AREA: "jefe_area",
  SERVER: "server"
};

export const SCOPE_KEYS = ["schoolId", "courseId", "divisionId", "subjectId", "shiftId", "periodId"];

export const PERMISSIONS = {
  USERS_READ: "users.read",
  USERS_DEACTIVATE: "users.deactivate",
  IDENTITY_READ: "identity:read",
  IDENTITY_CREATE: "identity:create",
  IDENTITY_UPDATE: "identity:update",
  STUDENTS_READ: "students.read",
  STUDENTS_WRITE: "students.write",
  ATTENDANCE_READ: "attendance.read",
  ATTENDANCE_WRITE: "attendance.write",
  GRADES_READ: "grades.read",
  GRADES_WRITE: "grades.write",
  SCHOOLS_READ: "schools.read",
  SCHOOLS_MANAGE: "schools.manage",
  DOCUMENTS_READ: "documents.read",
  DOCUMENTS_WRITE: "documents.write",
  SPACES_READ: "spaces.read",
  SPACES_WRITE: "spaces.write",
  SPACES_MANAGE: "spaces.manage",
  SCHEDULES_READ: "schedules.read",
  SCHEDULES_WRITE: "schedules.write",
  SCHEDULES_MANAGE: "schedules.manage",
  TEACHERS_READ: "teachers.read",
  TEACHERS_WRITE: "teachers.write",
  TEACHERS_MANAGE: "teachers.manage",
  ABSENCES_READ: "absences.read",
  ABSENCES_WRITE: "absences.write",
  ABSENCES_MANAGE: "absences.manage",
  WORKSHOPS_READ: "workshops.read",
  WORKSHOPS_WRITE: "workshops.write",
  INVENTORY_READ: "inventory.read",
  INVENTORY_WRITE: "inventory.write",
  INVENTORY_MANAGE: "inventory.manage",
  REQUESTS_READ: "requests.read",
  REQUESTS_WRITE: "requests.write",
  REQUESTS_MANAGE: "requests.manage",
  RESERVATIONS_READ: "reservations.read",
  RESERVATIONS_WRITE: "reservations.write",
  RESERVATIONS_MANAGE: "reservations.manage",
  NOTIFICATIONS_READ: "notifications.read",
  NOTIFICATIONS_WRITE: "notifications.write",
  CURRICULUM_READ: "curriculum.read",
  CURRICULUM_WRITE: "curriculum.write",
  CURRICULUM_MANAGE: "curriculum.manage",
  ACADEMICS_READ: "academics.read",
  ACADEMICS_WRITE: "academics.write",
  ACADEMICS_MANAGE: "academics.manage"
};

const ALL_PERMISSIONS = Object.values(PERMISSIONS);

export const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: ALL_PERMISSIONS,
  [ROLES.DIRECTOR]: ALL_PERMISSIONS,
  [ROLES.SECRETARIO]: [
    PERMISSIONS.USERS_READ,
    PERMISSIONS.STUDENTS_READ,
    PERMISSIONS.STUDENTS_WRITE,
    PERMISSIONS.SCHOOLS_READ,
    PERMISSIONS.DOCUMENTS_READ,
    PERMISSIONS.DOCUMENTS_WRITE,
    PERMISSIONS.SPACES_READ,
    PERMISSIONS.SCHEDULES_READ,
    PERMISSIONS.TEACHERS_READ,
    PERMISSIONS.ABSENCES_READ,
    PERMISSIONS.WORKSHOPS_READ,
    PERMISSIONS.INVENTORY_READ,
    PERMISSIONS.REQUESTS_READ,
    PERMISSIONS.RESERVATIONS_READ,
    PERMISSIONS.NOTIFICATIONS_READ,
    PERMISSIONS.CURRICULUM_READ,
    PERMISSIONS.ACADEMICS_READ
  ],
  [ROLES.PRECEPTOR]: [
    PERMISSIONS.STUDENTS_READ,
    PERMISSIONS.ATTENDANCE_READ,
    PERMISSIONS.ATTENDANCE_WRITE,
    PERMISSIONS.SCHOOLS_READ,
    PERMISSIONS.DOCUMENTS_READ,
    PERMISSIONS.DOCUMENTS_WRITE,
    PERMISSIONS.SPACES_READ,
    PERMISSIONS.SCHEDULES_READ,
    PERMISSIONS.TEACHERS_READ,
    PERMISSIONS.ABSENCES_READ,
    PERMISSIONS.WORKSHOPS_READ,
    PERMISSIONS.INVENTORY_READ,
    PERMISSIONS.REQUESTS_READ,
    PERMISSIONS.RESERVATIONS_READ,
    PERMISSIONS.NOTIFICATIONS_READ,
    PERMISSIONS.ACADEMICS_READ
  ],
  [ROLES.DOCENTE]: [
    PERMISSIONS.STUDENTS_READ,
    PERMISSIONS.ATTENDANCE_READ,
    PERMISSIONS.ATTENDANCE_WRITE,
    PERMISSIONS.GRADES_READ,
    PERMISSIONS.GRADES_WRITE,
    PERMISSIONS.SCHOOLS_READ,
    PERMISSIONS.DOCUMENTS_READ,
    PERMISSIONS.SCHEDULES_READ,
    PERMISSIONS.ABSENCES_READ,
    PERMISSIONS.WORKSHOPS_READ,
    PERMISSIONS.RESERVATIONS_READ,
    PERMISSIONS.NOTIFICATIONS_READ,
    PERMISSIONS.ACADEMICS_READ
  ],
  [ROLES.JEFE_AREA]: [
    PERMISSIONS.SCHEDULES_READ,
    PERMISSIONS.SCHEDULES_WRITE,
    PERMISSIONS.TEACHERS_READ,
    PERMISSIONS.TEACHERS_WRITE,
    PERMISSIONS.ABSENCES_READ,
    PERMISSIONS.ABSENCES_WRITE,
    PERMISSIONS.WORKSHOPS_READ,
    PERMISSIONS.WORKSHOPS_WRITE,
    PERMISSIONS.CURRICULUM_READ,
    PERMISSIONS.CURRICULUM_WRITE,
    PERMISSIONS.CURRICULUM_MANAGE,
    PERMISSIONS.STUDENTS_READ,
    PERMISSIONS.SCHOOLS_READ,
    PERMISSIONS.NOTIFICATIONS_READ,
    PERMISSIONS.NOTIFICATIONS_WRITE,
    PERMISSIONS.REQUESTS_READ,
    PERMISSIONS.RESERVATIONS_READ,
    PERMISSIONS.ACADEMICS_READ,
    PERMISSIONS.ACADEMICS_WRITE,
    PERMISSIONS.ACADEMICS_MANAGE
  ],
  [ROLES.SERVER]: [
    PERMISSIONS.SPACES_READ,
    PERMISSIONS.SPACES_WRITE,
    PERMISSIONS.SPACES_MANAGE,
    PERMISSIONS.SCHEDULES_READ,
    PERMISSIONS.SCHEDULES_WRITE,
    PERMISSIONS.SCHEDULES_MANAGE,
    PERMISSIONS.TEACHERS_READ,
    PERMISSIONS.TEACHERS_WRITE,
    PERMISSIONS.TEACHERS_MANAGE,
    PERMISSIONS.ABSENCES_READ,
    PERMISSIONS.ABSENCES_WRITE,
    PERMISSIONS.ABSENCES_MANAGE,
    PERMISSIONS.INVENTORY_READ,
    PERMISSIONS.INVENTORY_WRITE,
    PERMISSIONS.INVENTORY_MANAGE,
    PERMISSIONS.REQUESTS_READ,
    PERMISSIONS.REQUESTS_WRITE,
    PERMISSIONS.REQUESTS_MANAGE,
    PERMISSIONS.RESERVATIONS_READ,
    PERMISSIONS.RESERVATIONS_WRITE,
    PERMISSIONS.RESERVATIONS_MANAGE,
    PERMISSIONS.NOTIFICATIONS_READ,
    PERMISSIONS.NOTIFICATIONS_WRITE,
    PERMISSIONS.WORKSHOPS_READ,
    PERMISSIONS.WORKSHOPS_WRITE,
    PERMISSIONS.CURRICULUM_READ,
    PERMISSIONS.ACADEMICS_READ,
    PERMISSIONS.ACADEMICS_WRITE,
    PERMISSIONS.ACADEMICS_MANAGE
  ]
};

export function permissionsForRole(role) {
  return ROLE_PERMISSIONS[role] ?? [];
}

const LISTADOS_STUDENTS_ROLES = [
  "super-admin",
  "system-admin",
  "director",
  "secretary",
  "area-lead",
  "preceptor",
  "attendance-operator"
];

export function rolesPermitidos(operacion) {
  if (operacion === "students:listados") {
    return LISTADOS_STUDENTS_ROLES;
  }

  return [];
}

/* ============================================================================
   Catálogo central de autorización.

   Un permiso se expresa como "<modulo>.<accion>". Las acciones canónicas son:
   lectura, creación, modificación, eliminación, aprobación y carga. Por
   compatibilidad se mantienen los códigos legados "write" (crear+modificar+cargar)
   y "manage" (eliminar+aprobar), además de códigos puntuales como "users.deactivate".

   Para agregar un rol nuevo solo hace falta una entrada en ROL_CATALOGO y su lista
   en ROLE_PERMISSIONS; ningún controlador ni middleware debe cambiar.
   ============================================================================ */

export const ACCIONES = {
  READ: "read",
  CREATE: "create",
  UPDATE: "update",
  DELETE: "delete",
  APPROVE: "approve",
  UPLOAD: "upload",
  WRITE: "write",
  MANAGE: "manage"
};

export const MODULOS = Object.fromEntries([
  ...domainModules.map((modulo) => [modulo.key, modulo.label]),
  ["identity", "Identidad y acceso"]
]);

/* Construye el código de un permiso: permiso("students", "create") -> "students.create". */
export function permiso(modulo, accion) {
  return `${modulo}.${accion}`;
}

/* Traduce una acción (canónica o legada) a sus acciones canónicas equivalentes. */
export function accionesCanonicas(accion) {
  switch (accion) {
    case ACCIONES.READ:
      return [ACCIONES.READ];
    case ACCIONES.CREATE:
      return [ACCIONES.CREATE];
    case ACCIONES.UPDATE:
      return [ACCIONES.UPDATE];
    case ACCIONES.DELETE:
      return [ACCIONES.DELETE];
    case ACCIONES.APPROVE:
      return [ACCIONES.APPROVE];
    case ACCIONES.UPLOAD:
      return [ACCIONES.UPLOAD];
    case ACCIONES.WRITE:
      return [ACCIONES.CREATE, ACCIONES.UPDATE, ACCIONES.UPLOAD];
    case ACCIONES.MANAGE:
      return [ACCIONES.DELETE, ACCIONES.APPROVE];
    default:
      return [accion];
  }
}

export function permisoValido(codigo) {
  return typeof codigo === "string" && /^[a-z]+[.:][a-z]+$/.test(codigo);
}

export const ROL_CATALOGO = {
  [ROLES.ADMIN]: { codigo: ROLES.ADMIN, nombre: "Administrador", descripcion: "Acceso total a todos los modulos del sistema" },
  [ROLES.DIRECTOR]: { codigo: ROLES.DIRECTOR, nombre: "Direccion", descripcion: "Gestion integral de la institucion" },
  [ROLES.SECRETARIO]: { codigo: ROLES.SECRETARIO, nombre: "Secretaria", descripcion: "Administracion academica y documentacion" },
  [ROLES.PRECEPTOR]: { codigo: ROLES.PRECEPTOR, nombre: "Preceptoria", descripcion: "Seguimiento de estudiantes y asistencia" },
  [ROLES.DOCENTE]: { codigo: ROLES.DOCENTE, nombre: "Docentes", descripcion: "Clases, notas y asistencia de sus cursos" },
  [ROLES.JEFE_AREA]: { codigo: ROLES.JEFE_AREA, nombre: "Jefatura de Area", descripcion: "Planificacion curricular y equipos docentes" },
  [ROLES.SERVER]: { codigo: ROLES.SERVER, nombre: "Responsable de Server", descripcion: "Infraestructura, espacios y operacion tecnica" }
};

export function catalogoRoles() {
  return Object.values(ROL_CATALOGO);
}