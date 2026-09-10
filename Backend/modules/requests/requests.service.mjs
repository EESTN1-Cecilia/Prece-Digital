import requestsRepository from "./requests.repository.mjs";
import { HttpError } from "../../utils/http-error.mjs";

function validateRequired(fields, data) {
  for (const field of fields) {
    if (!data[field]) {
      throw new HttpError(400, "validation_error", `El campo ${field} es requerido`);
    }
  }
}

const requestsService = {
  create(data, user) {
    validateRequired(["title", "description", "type", "schoolId"], data);
    const validTypes = ["espacio", "recurso", "mantenimiento", "material", "tecnologia", "academica", "otra"];
    if (!validTypes.includes(data.type)) {
      throw new HttpError(400, "validation_error", `Tipo de solicitud inválido. Tipos válidos: ${validTypes.join(", ")}`);
    }
    const request = requestsRepository.create({
      ...data,
      requesterId: user.id
    });
    return { statusCode: 201, body: { data: request } };
  },

  getById(id) {
    const request = requestsRepository.findById(id);
    if (!request) {
      throw new HttpError(404, "not_found", "Solicitud no encontrada");
    }
    return { statusCode: 200, body: { data: request } };
  },

  list(query, user) {
    const requests = requestsRepository.list({
      schoolId: user.assignments?.[0]?.schoolId ?? query.schoolId,
      type: query.type,
      status: query.status,
      priority: query.priority,
      requesterId: query.requesterId,
      assignedToId: query.assignedToId,
      sector: query.sector
    });
    return { statusCode: 200, body: { data: requests } };
  },

  update(id, data, user) {
    if (data.type) {
      const validTypes = ["espacio", "recurso", "mantenimiento", "material", "tecnologia", "academica", "otra"];
      if (!validTypes.includes(data.type)) {
        throw new HttpError(400, "validation_error", `Tipo de solicitud inválido. Tipos válidos: ${validTypes.join(", ")}`);
      }
    }
    if (data.status) {
      const validStatuses = ["pendiente", "en_progreso", "resuelta", "cerrada", "rechazada"];
      if (!validStatuses.includes(data.status)) {
        throw new HttpError(400, "validation_error", `Estado inválido. Estados válidos: ${validStatuses.join(", ")}`);
      }
    }
    if (data.priority) {
      const validPriorities = ["baja", "normal", "alta", "urgente"];
      if (!validPriorities.includes(data.priority)) {
        throw new HttpError(400, "validation_error", `Prioridad inválida. Prioridades válidas: ${validPriorities.join(", ")}`);
      }
    }
    const request = requestsRepository.update(id, data);
    if (!request) {
      throw new HttpError(404, "not_found", "Solicitud no encontrada");
    }
    return { statusCode: 200, body: { data: request } };
  },

  addComment(requestId, data, user) {
    validateRequired(["content"], data);
    const request = requestsRepository.findById(requestId);
    if (!request) {
      throw new HttpError(404, "not_found", "Solicitud no encontrada");
    }
    const comment = requestsRepository.addComment({
      requestId,
      userId: user.id,
      content: data.content
    });
    return { statusCode: 201, body: { data: comment } };
  },

  listComments(requestId) {
    const request = requestsRepository.findById(requestId);
    if (!request) {
      throw new HttpError(404, "not_found", "Solicitud no encontrada");
    }
    const comments = requestsRepository.listComments(requestId);
    return { statusCode: 200, body: { data: comments } };
  }
};

export default requestsService;