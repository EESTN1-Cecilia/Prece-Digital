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
    if (!store.notificationHistory) store.notificationHistory = new Map();
  },

  create(notification) {
    this.init();
    const ahora = new Date().toISOString();
    const record = {
      id: notification.id ?? generateId("ntf"),
      recipientId: notification.recipientId,
      title: notification.title,
      body: notification.body,
      type: notification.type,
      status: notification.status ?? "pendiente",
      isRead: notification.status != null ? notification.status !== "pendiente" : (notification.isRead ?? false),
      originModule: notification.originModule ?? "sistema",
      referenceType: notification.referenceType ?? null,
      referenceId: notification.referenceId ?? null,
      priority: notification.priority ?? "normal",
      dedupeKey: notification.dedupeKey ?? null,
      schoolId: notification.schoolId ?? null,
      readAt: null,
      archivedAt: null,
      createdAt: ahora,
      updatedAt: ahora
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

  list({ recipientId, schoolId, type, status, isRead, priority, originModule, fromDate, toDate, sort = "desc" } = {}) {
    this.init();
    const from = fromDate ? new Date(fromDate).getTime() : null;
    const to = toDate ? new Date(toDate).getTime() : null;
    return [...getStore().notifications.values()]
      .filter((n) => {
        if (recipientId && n.recipientId !== recipientId) return false;
        if (schoolId && n.schoolId !== schoolId) return false;
        if (type && n.type !== type) return false;
        if (status && n.status !== status) return false;
        if (isRead !== undefined && n.isRead !== (isRead === "true" || isRead === true)) return false;
        if (priority && n.priority !== priority) return false;
        if (originModule && n.originModule !== originModule) return false;
        const creada = new Date(n.createdAt).getTime();
        if (from !== null && creada < from) return false;
        if (to !== null && creada > to) return false;
        return true;
      })
      .sort((a, b) =>
        (sort === "asc" ? new Date(a.createdAt) - new Date(b.createdAt) : new Date(b.createdAt) - new Date(a.createdAt))
      )
      .map(cloneNotification);
  },

  update(id, data) {
    this.init();
    const notification = getStore().notifications.get(id);
    if (!notification) return null;
    Object.assign(notification, data, { updatedAt: new Date().toISOString() });
    if (notification.status !== "pendiente" && !notification.readAt) {
      notification.readAt ??= new Date().toISOString();
    }
    notification.isRead = notification.status !== "pendiente";
    return cloneNotification(notification);
  },

  markRead(id, leidaEn) {
    this.init();
    const notification = getStore().notifications.get(id);
    if (!notification) return null;
    notification.status = "leida";
    notification.isRead = true;
    notification.readAt ??= leidaEn ?? new Date().toISOString();
    notification.updatedAt = new Date().toISOString();
    return cloneNotification(notification);
  },

  markArchived(id) {
    this.init();
    const notification = getStore().notifications.get(id);
    if (!notification) return null;
    const ahora = new Date().toISOString();
    notification.status = "archivada";
    notification.isRead = true;
    notification.readAt ??= ahora;
    notification.archivedAt = ahora;
    notification.updatedAt = ahora;
    return cloneNotification(notification);
  },

  markManyRead(ids, recipientId) {
    this.init();
    let count = 0;
    for (const id of ids) {
      const notification = getStore().notifications.get(id);
      if (!notification) continue;
      if (recipientId && notification.recipientId !== recipientId) continue;
      if (notification.status !== "pendiente") continue;
      notification.status = "leida";
      notification.isRead = true;
      notification.readAt ??= new Date().toISOString();
      notification.updatedAt = new Date().toISOString();
      count += 1;
    }
    return count;
  },

  markAllRead(recipientId) {
    this.init();
    let count = 0;
    for (const notification of getStore().notifications.values()) {
      if (notification.recipientId !== recipientId) continue;
      if (notification.status !== "pendiente") continue;
      notification.status = "leida";
      notification.isRead = true;
      notification.readAt ??= new Date().toISOString();
      notification.updatedAt = new Date().toISOString();
      count += 1;
    }
    return count;
  }
};

export default notificationsRepository;