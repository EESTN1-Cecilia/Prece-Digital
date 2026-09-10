import reservationsRepository from "./reservations.repository.mjs";
import { HttpError } from "../../utils/http-error.mjs";

function validateRequired(fields, data) {
  for (const field of fields) {
    if (!data[field]) {
      throw new HttpError(400, "validation_error", `El campo ${field} es requerido`);
    }
  }
}

const reservationsService = {
  create(data, user) {
    validateRequired(["resourceType", "resourceId", "date", "startTime", "endTime", "schoolId"], data);
    const validResourceTypes = ["espacio", "recurso", "aula", "taller", "laboratorio"];
    if (!validResourceTypes.includes(data.resourceType)) {
      throw new HttpError(400, "validation_error", `Tipo de recurso inválido. Tipos válidos: ${validResourceTypes.join(", ")}`);
    }
    if (data.startTime >= data.endTime) {
      throw new HttpError(400, "validation_error", "La hora de inicio debe ser anterior a la hora de fin");
    }
    const overlap = reservationsRepository.findOverlap({
      resourceType: data.resourceType,
      resourceId: data.resourceId,
      date: data.date,
      startTime: data.startTime,
      endTime: data.endTime,
      schoolId: data.schoolId
    });
    if (overlap) {
      throw new HttpError(409, "conflict", "El recurso ya está reservado en ese horario");
    }
    const reservation = reservationsRepository.create({
      ...data,
      ownerId: data.ownerId ?? user.id,
      ownerType: data.ownerType ?? "user"
    });
    return { statusCode: 201, body: { data: reservation } };
  },

  getById(id) {
    const reservation = reservationsRepository.findById(id);
    if (!reservation) {
      throw new HttpError(404, "not_found", "Reserva no encontrada");
    }
    return { statusCode: 200, body: { data: reservation } };
  },

  list(query, user) {
    const reservations = reservationsRepository.list({
      schoolId: user.assignments?.[0]?.schoolId ?? query.schoolId,
      resourceType: query.resourceType,
      resourceId: query.resourceId,
      date: query.date,
      status: query.status,
      ownerId: query.ownerId
    });
    return { statusCode: 200, body: { data: reservations } };
  },

  update(id, data, user) {
    if (data.startTime && data.endTime && data.startTime >= data.endTime) {
      throw new HttpError(400, "validation_error", "La hora de inicio debe ser anterior a la hora de fin");
    }
    const existing = reservationsRepository.findById(id);
    if (!existing) {
      throw new HttpError(404, "not_found", "Reserva no encontrada");
    }
    const overlap = reservationsRepository.findOverlap({
      resourceType: data.resourceType ?? existing.resourceType,
      resourceId: data.resourceId ?? existing.resourceId,
      date: data.date ?? existing.date,
      startTime: data.startTime ?? existing.startTime,
      endTime: data.endTime ?? existing.endTime,
      schoolId: data.schoolId ?? existing.schoolId,
      excludeId: id
    });
    if (overlap) {
      throw new HttpError(409, "conflict", "El recurso ya está reservado en ese horario");
    }
    const reservation = reservationsRepository.update(id, data);
    return { statusCode: 200, body: { data: reservation } };
  },

  approve(id) {
    const reservation = reservationsRepository.update(id, { status: "confirmada" });
    if (!reservation) {
      throw new HttpError(404, "not_found", "Reserva no encontrada");
    }
    return { statusCode: 200, body: { data: reservation } };
  },

  reject(id) {
    const reservation = reservationsRepository.update(id, { status: "rechazada" });
    if (!reservation) {
      throw new HttpError(404, "not_found", "Reserva no encontrada");
    }
    return { statusCode: 200, body: { data: reservation } };
  },

  cancel(id) {
    const reservation = reservationsRepository.cancel(id);
    if (!reservation) {
      throw new HttpError(404, "not_found", "Reserva no encontrada");
    }
    return { statusCode: 200, body: { data: reservation } };
  }
};

export default reservationsService;