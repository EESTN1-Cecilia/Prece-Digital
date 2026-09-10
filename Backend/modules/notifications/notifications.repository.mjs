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
    if (!store.notifications) {
      store.notifications = new Map();
    }
  },

  create(notification) {
    this.init();
    const record = {
      id: notification.id ?? generateId("ntf"),
      recipientId: notification.recipientId,
      title: notification.title,
      body: notification.body,
      type: notification.type ?? "sistema",
      referenceType: notification.referenceType ?? null,
      referenceId: notification.referenceId ?? null,
      priority: notification.priority ?? "normal",
      isRead: notification.isRead ?? false,
      readAt: null,
      schoolId: notification.schoolId ?? null,
      createdAt: new Date().toISOString()
    };
    getStore().notifications.set(record.id, record);
    return cloneNotification(record);
  },

  findById(id) {
    this.init();
    const notification = getStore().notifications.get(id);
    return notification ? cloneNotification(notification) : null;
  },

  list({ recipientId, schoolId, type, isRead, priority } = {}) {
    this.init();
    return [...getStore().notifications.values()]
      .filter((n) => {
        if (recipientId && n.recipientId !== recipientId) return false;
        if (schoolId && n.schoolId !== schoolId) return false;
        if (type && n.type !== type) return false;
        if (isRead !== undefined && n.isRead !== (isRead === "true" || isRead === true)) return false;
        if (priority && n.priority !== priority) return false;
        return true;
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map(cloneNotification);
  },

  update(id, data) {
    this.init();
    const notification = getStore().notifications.get(id);
    if (!notification) return null;
    Object.assign(notification, data);
    if (data.isRead && !notification.readAt) {
      notification.readAt = new Date().toISOString();
    }
    return cloneNotification(notification);
  },

  markAllRead(recipientId) {
    this.init();
    let count = 0;
    for (const notification of getStore().notifications.values()) {
      if (notification.recipientId === recipientId && !notification.isRead) {
        notification.isRead = true;
        notification.readAt = new Date().toISOString();
        count += 1;
      }
    }
    return count;
  }
};

export default notificationsRepository;