import { getStore } from "../../database/memory-store.mjs";

function generateId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function cloneNotification(notification) {
  return { ...notification };
}

const notificationsRepository = {
  init() {
    const store = getStore();
    if (!store.notifications) store.notifications = new Map();
  },

  create(notification) {
    this.init();
    const record = {
      id: notification.id ?? generateId("ntf"),
      recipientId: notification.recipientId,
      schoolId: notification.schoolId ?? null,
      type: notification.type ?? "informacion",
      title: notification.title,
      body: notification.body,
      status: notification.status ?? "pendiente",
      isRead: notification.isRead ?? false,
      readAt: notification.readAt ?? null,
      archivedAt: notification.archivedAt ?? null,
      priority: notification.priority ?? "normal",
      originModule: notification.originModule ?? "sistema",
      referenceType: notification.referenceType ?? null,
      referenceId: notification.referenceId ?? null,
      dedupeKey: notification.dedupeKey ?? null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    getStore().notifications.set(record.id, record);
    return cloneNotification(record);
  },

  findById(id) {
    this.init();
    const notification = getStore().notifications.get(id);
    return notification ? cloneNotification(notification) : null;
  },

  findByDedupeKey(dedupeKey) {
    this.init();
    if (!dedupeKey) return null;
    for (const notification of getStore().notifications.values()) {
      if (notification.dedupeKey === dedupeKey) {
        return cloneNotification(notification);
      }
    }
    return null;
  },

  list({
    recipientId,
    schoolId,
    type,
    status,
    priority,
    originModule,
    isRead,
    fromDate,
    toDate,
    sort = "desc"
  } = {}) {
    this.init();
    const from = fromDate ? new Date(fromDate).getTime() : null;
    const to = toDate ? new Date(toDate).getTime() : null### Aceptación
- `esGestionable(user)` true solo con `notifications.manage` → Server/Server/admin/director.
- `getById`: propietario o cantidad gestionable; cualquier otro rol no puede ver notificaciones ajenas (403).
- `list`: si el usuario no gestiona, solo lista las suyas (`recipientId = user.id`), ignorando
  `recipientId` del query. Un usuario NO puede consultar notificaciones de otro (403 en get,
  filtro forzado en list).
- `markAsRead/markAsRead/markAllRead/archive`: operan sobre notificaciones propias salvo
  `notifications.manage`.
- `notify(...)`: servicio a nivel de módulo (sin HTTP). `dedupeKey` evita duplicados.
- Los recursos `referenceType/referenceId` y `originModule` se registran para trazabilidad del evento.
- Los estados son `pendiente`, `leida` y `archivada`; las transiciones las controla el backend.

## Migración

Archivo `database/migrations/008_notificaciones.sql` define la persistencia relacional
(`notificaciones`, `notificaciones_leidas`) con los mismos estados, reglas e integridad referencial.
