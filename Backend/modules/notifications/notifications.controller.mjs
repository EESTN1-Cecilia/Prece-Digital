import notificationsService from "./notifications.service.mjs";

export function createNotification({ body, user }) {
  return notificationsService.create(body, user);
}

export function getNotification({ params }) {
  return notificationsService.getById(params.notificationId);
}

export function listNotifications({ url, user }) {
  const query = Object.fromEntries(url.searchParams.entries());
  return notificationsService.list(query, user);
}

export function markAsRead({ params, user }) {
  return notificationsService.markAsRead(params.notificationId, user);
}

export function markAllRead({ user }) {
  return notificationsService.markAllRead(user);
}

export function getUnreadCount({ user }) {
  return notificationsService.getUnreadCount(user);
}