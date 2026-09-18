import notificationsRepository from "./notifications.repository.mjs";
import { errorHttp } from "../../utils/api-error.mjs";

function validateRequired(fields, data) {
  for (const field of fields) {
    if (!data[field]) {
      throw errorHttp(422, "VALIDATION_ERROR", `El campo ${field} es requerido`);
    }
  }
}

const notificationsService = {
  create(data, user) {
    validateRequired(["recipientId", "title", "body"], data);
    const validTypes = ["sistema", "solicitud", "reserva", "ausencia", "inventario", "mensaje", "recordatorio"];
    if (data.type && !validTypes.includes(data.type)) {
      throw errorHttp(422, "VALIDATION_ERROR", `Tipo de notificación inválido. Tipos válidos: ${validTypes.join(", ")}`);
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
      throw errorHttp(404, "NOT_FOUND", "Notificación no encontrada");
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
      throw errorHttp(404, "NOT_FOUND", "Notificación no encontrada");
    }
    if (notification.recipientId !== user.id) {
      throw errorHttp(403, "FORBIDDEN", "No tiene permisos para modificar esta notificación");
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