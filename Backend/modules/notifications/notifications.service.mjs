import notificationsRepository from "./notifications.repository.mjs";
import { HttpError } from "../../utils/http-error.mjs";

function validateRequired(fields, data) {
  for (const field of fields) {
    if (!data[field]) {
      throw new HttpError(400, "validation_error", `El campo ${field} es requerido`);
    }
  }
}

const notificationsService = {
  create(data, user) {
    validateRequired(["recipientId", "title", "body"], data);
    const validTypes = ["sistema", "solicitud", "reserva", "ausencia", "inventario", "mensaje", "recordatorio"];
    if (data.type && !validTypes.includes(data.type)) {
      throw new HttpError(400, "validation_error", `Tipo de notificación inválido. Tipos válidos: ${validTypes.join(", ")}`);
    }
    const notification = notificationsRepository.create({
      ...data,
      schoolId: data.schoolId ?? user.assignments?.[0]?.schoolId ?? null,
      createdBy: user.id
    });
    return { statusCode: 201, body: { data: notification } };
  },

  getById(id) {
    const notification = notificationsRepository.findById(id);
    if (!notification) {
      throw new HttpError(404, "not_found", "Notificación no encontrada");
    }
    return { statusCode: 200, body: { data: notification } };
  },

  list(query, user) {
    const notifications = notificationsRepository.list({
      recipientId: query.recipientId ?? user.id,
      schoolId: query.schoolId,
      type: query.type,
      isRead: query.isRead,
      priority: query.priority
    });
    return { statusCode: 200, body: { data: notifications } };
  },

  markAsRead(id, user) {
    const notification = notificationsRepository.findById(id);
    if (!notification) {
      throw new HttpError(404, "not_found", "Notificación no encontrada");
    }
    if (notification.recipientId !== user.id) {
      throw new HttpError(403, "forbidden", "No tiene permisos para modificar esta notificación");
    }
    const updated = notificationsRepository.update(id, { isRead: true });
    return { statusCode: 200, body: { data: updated } };
  },

  markAllRead(user) {
    const count = notificationsRepository.markAllRead(user.id);
    return { statusCode: 200, body: { data: { markedAsRead: count } } };
  },

  getUnreadCount(user) {
    const notifications = notificationsRepository.list({ recipientId: user.id, isRead: false });
    return { statusCode: 200, body: { data: { unreadCount: notifications.length } } };
  }
};

export default notificationsService;