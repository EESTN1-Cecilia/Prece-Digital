export const NOTIFICATION_TYPES = [
  "alerta",
  "informacion",
  "recordatorio",
  "solicitud",
  "aprobacion",
  "rechazo",
  "vencimiento",
  "cambio_estado",
  "ausencia",
  "reserva",
  "inventario",
  "academica",
  "institucional"
];

export const NOTIFICATION_STATUSES = ["pendiente", "leida", "archivada"];

export const NOTIFICATION_PRIORITIES = ["baja", "normal", "alta"];

export const ORIGIN_MODULES = [
  "sistema",
  "absences",
  "academics",
  "material_requests",
  "material_reservations",
  "inventory",
  "schedules",
  "spaces",
  "reassignments"
];

export function isValidType(type) {
  return NOTIFICATION_TYPES.includes(type);
}

export function isValidStatus(status) {
  return NOTIFICATION_STATUSES.includes(status);
}

export function isValidPriority(priority) {
  return NOTIFICATION_PRIORITIES.includes(priority);
}

export function isValidOriginModule(module) {
  return ORIGIN_MODULES.includes(module);
}