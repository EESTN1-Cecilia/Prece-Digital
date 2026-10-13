import notificationsRepository from "./notifications.repository.mjs";
import { userRepository } from "../../database/repositories/user.repository.mjs";
import { HttpError } from "../../utils/http-error.mjs";
import { PERMISSIONS, permissionsForRole } from "../../config/permissions.config.mjs";
import {
  NOTIFICATION_TYPES,
  NOTIFICATION_STATUSES,
  NOTIFICATION_PRIORITIES,
  isValidType,
  isValidStatus,
  isValidPriority,
  isValidOriginModule
} from "./notifications.config.mjs";

const RE_REFERENCIA = /^[A-Za-z0-9_-]{1,60}$/;

function errorDeCampo(campo, mensaje) {
  return new HttpError(422, "validation_error", mensaje, [{ field: campo, message: mensaje }]);
}

function validarTextoObligatorio(value, campo, maxLength) {
  if (!value || typeof value !== "string" || !value.trim()) {
    throw errorDeCampo(campo, `El campo ${campo} es obligatorio.`);
  }
  if (value.trim().length > maxLength) {
    throw errorDeCampo(campo, `El campo ${campo} no puede superar ${maxLength} caracteres.`);
  }
  return value.trim();
}

function validarTextoOpcional(value, campo, maxLength) {
  if (value == null || value === "") return null;
  if (typeof value !== "string" || !value.trim()) {
    throw errorDeCampo(campo, `El campo ${campo} no es valido.`);
  }
  if (value.trim().length > maxLength) {
    throw errorDeCampo(campo, `El campo ${campo} no puede superar ${maxLength} caracteres.`);
  }
  return value.trim();
}

function validarReferenciaId(value, campo) {
  const referido = validarTextoOpcional(value, campo, 60);
  if (referido != null && !RE_REFERENCIA.test(referido)) {
    throw errorDeCampo(campo, `El campo ${campo} tiene un formato invalido.`);
  }
  return referido;
}

function validarFecha(value, campo) {
  if (value == null || value === "") return undefined;
  if (Number.isNaN(Date.parse(value))) {
    throw errorDeCampo(campo, `El campo ${campo} debe ser una fecha valida.`);
  }
  return value;
}

const notificationsService = {
  esGestionable(user) {
    return (user.assignments ?? []).some((assignment) =>
      permissionsForRole(assignment.role).includes(PERMISSIONS.NOTIFICATIONS_MANAGE)
    );
  },

  notify(datos) {
    const {
      recipientId,
      title,
      body,
      type = "informacion",
      originModule = "sistema",
      referenceType = null,
      referenceId = null,
      priority = "normal",
      dedupeKey = null,
      schoolId = null
    } = datos ?? {};

    const destinatario = recipientId ? userRepository.findById(recipientId) : null;
    if (!destinatario) {
      throw new HttpError(404, "not_found", "El usuario destinatario no existe.");
    }
    const titulo = validarTextoObligatorio(title, "title", 200);
    const mensaje = validarTextoObligatorio(body, "body", 2000);

    if (!isValidType(type)) {
      throw errorDeCampo("type", `Tipo de notificacion invalido. Validos: ${NOTIFICATION_TYPES.join(", ")}.`);
    }
    if (!isValidPriority(priority)) {
      throw errorDeCampo("priority", `Prioridad invalida. Validas: ${NOTIFICATION_PRIORITIES.join(", ")}.`);
    }
    if (!isValidOriginModule(originModule)) {
      throw errorDeCampo("originModule", `Modulo de origen no autorizado: ${originModule}.`);
    }

    const referenciaTipo = validarTextoOpcional(referenceType, "referenceType", 60);
    const referenciaId = validarReferenciaId(referenceId, "referenceId");
    if ((referenciaId && !referenciaTipo) || (!referenciaId && referenciaTipo)) {
      throw errorDeCampo("referenceId", "referenceType y referenceId deben enviarse juntos.");
    }
    const dedupe = validarReferenciaId(dedupeKey, "dedupeKey");

    if (dedupe) {
      const existente = notificationsRepository.findByDedupeKey(dedupe);
      if (existente) return existente;
    }

    return notificationsRepository.create({
      recipientId: destinatario.id,
      title: titulo,
      body: mensaje,
      type,
      originModule,
      referenceType: referenciaTipo,
      referenceId: referenciaId,
      priority,
      dedupeKey: dedupe,
      schoolId: schoolId ?? destinatario.assignments?.[0]?.schoolId ?? null
    });
  },

  create(data, user) {
    const escuela = user?.assignments?.[0]?.schoolId ?? data.schoolId ?? null;
    const notification = this.notify({
      ...data,
      originModule: data.originModule ?? "sistema",
      schoolId: escuela
    });
    return { statusCode: 201, body: { data: notification } };
  },

  getById(id, user) {
    const notification = notificationsRepository.findById(id);
    if (!notification) {
      throw new HttpError(404, "not_found", "La notificacion solicitada no existe.");
    }
    if (notification.recipientId !== user.id && !this.esGestionable(user)) {
      throw new HttpError(403, "forbidden", "No tiene permiso para consultar esta notificacion.");
    }
    return { statusCode: 200, body: { data: notification } };
  },

  list(query, user) {
    const gestiona = this.esGestionable(user);
    if (!gestiona && query.recipientId && query.recipientId !== user.id) {
      throw new HttpError(403, "forbidden", "Solo puede consultar sus propias notificaciones.");
    }

    const status = query.status ? query.status : undefined;
    if (status && !isValidStatus(status)) {
      throw errorDeCampo("status", `Estado invalido. Validos: ${NOTIFICATION_STATUSES.join(", ")}.`);
    }
    const type = query.type ?? undefined;
    if (type && !isValidType(type)) {
      throw errorDeCampo("type", `Tipo invalido. Validos: ${NOTIFICATION_TYPES.join(", ")}.`);
    }
    if (query.priority && !isValidPriority(query.priority)) {
      throw errorDeCampo("priority", `Prioridad invalida. Validas: ${NOTIFICATION_PRIORITIES.join(", ")}.`);
    }
    if (query.originModule && !isValidOriginModule(query.originModule)) {
      throw errorDeCampo("originModule", `Modulo de origen invalido: ${query.originModule}.`);
    }

    const notifications = notificationsRepository.list({
      recipientId: gestiona && query.recipientId ? query.recipientId : user.id,
      schoolId: query.schoolId,
      type,
      status,
      isRead: query.isRead,
      priority: query.priority,
      originModule: query.originModule,
      fromDate: validarFecha(query.fromDate, "fromDate"),
      toDate: validarFecha(query.toDate, "toDate"),
      sort: query.sort === "asc" ? "asc" : "desc"
    });

    return { statusCode: 200, body: { data: { notifications } } };
  },

  markAsRead(id, user) {
    const notification = notificationsRepository.findById(id);
    if (!notification) {
      throw new HttpError(404, "not_found", "La notificacion solicitada no existe.");
    }
    if (notification.recipientId !== user.id && !this.esGestionable(user)) {
      throw new HttpError(403, "forbidden", "No tiene permiso para modificar esta notificacion.");
    }
    if (notification.status === "archivada") {
      throw new HttpError(409, "conflict", "Una notificacion archivada no puede volver a marcarse como leida.");
    }
    const updated = notificationsRepository.markRead(id);
    return { statusCode: 200, body: { data: updated } };
  },

  markManyRead(data, user) {
    const ids = data?.notificationIds ?? data?.ids;
    if (!Array.isArray(ids) || ids.length === 0) {
      throw errorDeCampo("notificationIds", "Debe indicar al menos una notificacion a marcar como leida.");
    }
    const count = notificationsRepository.markManyRead(ids, user.id);
    return { statusCode: 200, body: { data: { markedAsRead: count } } };
  },

  markAllRead(user) {
    const count = notificationsRepository.markAllRead(user.id);
    return { statusCode: 200, body: { data: { markedAsRead: count } } };
  },

  archive(id, user) {
    const notification = notificationsRepository.findById(id);
    if (!notification) {
      throw new HttpError(404, "not_found", "La notificacion solicitada no existe.");
    }
    if (notification.recipientId !== user.id && !this.esGestionable(user)) {
      throw new HttpError(403, "forbidden", "No tiene permiso para archivar esta notificacion.");
    }
    if (notification.status === "archivada") {
      throw new HttpError(409, "conflict", "La notificacion ya esta archivada.");
    }
    const updated = notificationsRepository.markArchived(id);
    return { statusCode: 200, body: { data: updated } };
  },

  getUnreadCount(user) {
    const pendientes = notificationsRepository.list({ recipientId: user.id, status: "pendiente" });
    return { statusCode: 200, body: { data: { unreadCount: pendientes.length } } };
  }
};

export default notificationsService;