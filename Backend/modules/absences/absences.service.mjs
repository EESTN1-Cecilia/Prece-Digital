import absencesRepository from "./absences.repository.mjs";
import { HttpError } from "../../utils/http-error.mjs";

function validateRequired(fields, data) {
  for (const field of fields) {
    if (!data[field]) {
      throw new HttpError(400, "validation_error", `El campo ${field} es requerido`);
    }
  }
}

const absencesService = {
  createAbsence(data, user) {
    validateRequired(["teacherId", "date", "type", "schoolId"], data);
    const validTypes = ["injustificada", "justificada", "medica", "personal", "capacitacion", "otra"];
    if (!validTypes.includes(data.type)) {
      throw new HttpError(400, "validation_error", `Tipo de ausencia inválido. Tipos válidos: ${validTypes.join(", ")}`);
    }
    const absence = absencesRepository.createAbsence({
      ...data,
      createdBy: user.id
    });
    return { statusCode: 201, body: { data: absence } };
  },

  getAbsence(id) {
    const absence = absencesRepository.findAbsenceById(id);
    if (!absence) {
      throw new HttpError(404, "not_found", "Ausencia no encontrada");
    }
    return { statusCode: 200, body: { data: absence } };
  },

  listAbsences(query, user) {
    const absences = absencesRepository.listAbsences({
      teacherId: query.teacherId,
      date: query.date,
      startDate: query.startDate,
      endDate: query.endDate,
      schoolId: user.assignments?.[0]?.schoolId ?? query.schoolId,
      status: query.status
    });
    return { statusCode: 200, body: { data: absences } };
  },

  updateAbsence(id, data) {
    if (data.type) {
      const validTypes = ["injustificada", "justificada", "medica", "personal", "capacitacion", "otra"];
      if (!validTypes.includes(data.type)) {
        throw new HttpError(400, "validation_error", `Tipo de ausencia inválido. Tipos válidos: ${validTypes.join(", ")}`);
      }
    }
    if (data.status) {
      const validStatuses = ["pendiente", "aprobada", "rechazada", "cancelada"];
      if (!validStatuses.includes(data.status)) {
        throw new HttpError(400, "validation_error", `Estado inválido. Estados válidos: ${validStatuses.join(", ")}`);
      }
    }
    const absence = absencesRepository.updateAbsence(id, data);
    if (!absence) {
      throw new HttpError(404, "not_found", "Ausencia no encontrada");
    }
    return { statusCode: 200, body: { data: absence } };
  },

  deleteAbsence(id) {
    const deleted = absencesRepository.deleteAbsence(id);
    if (!deleted) {
      throw new HttpError(404, "not_found", "Ausencia no encontrada");
    }
    return { statusCode: 200, body: { message: "Ausencia eliminada correctamente" } };
  },

  createIncident(data, user) {
    validateRequired(["teacherId", "date", "type", "description", "schoolId"], data);
    const validTypes = ["comportamiento", "academica", "disciplinaria", "administrativa", "otra"];
    if (!validTypes.includes(data.type)) {
      throw new HttpError(400, "validation_error", `Tipo de novedad inválido. Tipos válidos: ${validTypes.join(", ")}`);
    }
    const incident = absencesRepository.createIncident({
      ...data,
      createdBy: user.id
    });
    return { statusCode: 201, body: { data: incident } };
  },

  getIncident(id) {
    const incident = absencesRepository.findIncidentById(id);
    if (!incident) {
      throw new HttpError(404, "not_found", "Novedad no encontrada");
    }
    return { statusCode: 200, body: { data: incident } };
  },

  listIncidents(query, user) {
    const incidents = absencesRepository.listIncidents({
      teacherId: query.teacherId,
      schoolId: user.assignments?.[0]?.schoolId ?? query.schoolId,
      status: query.status,
      severity: query.severity
    });
    return { statusCode: 200, body: { data: incidents } };
  },

  updateIncident(id, data) {
    if (data.status) {
      const validStatuses = ["abierta", "en_revision", "resuelta", "cerrada"];
      if (!validStatuses.includes(data.status)) {
        throw new HttpError(400, "validation_error", `Estado inválido. Estados válidos: ${validStatuses.join(", ")}`);
      }
    }
    if (data.severity) {
      const validSeverities = ["leve", "moderada", "grave", "muy_grave"];
      if (!validSeverities.includes(data.severity)) {
        throw new HttpError(400, "validation_error", `Severidad inválida. Severidades válidas: ${validSeverities.join(", ")}`);
      }
    }
    const incident = absencesRepository.updateIncident(id, data);
    if (!incident) {
      throw new HttpError(404, "not_found", "Novedad no encontrada");
    }
    return { statusCode: 200, body: { data: incident } };
  }
};

export default absencesService;