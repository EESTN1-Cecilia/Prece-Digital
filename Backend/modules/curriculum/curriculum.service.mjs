import curriculumRepository from "./curriculum.repository.mjs";
import { HttpError } from "../../utils/http-error.mjs";

function validateRequired(fields, data) {
  for (const field of fields) {
    if (!data[field]) {
      throw new HttpError(400, "validation_error", `El campo ${field} es requerido`);
    }
  }
}

const curriculumService = {
  createArea(data, user) {
    validateRequired(["name", "code", "schoolId"], data);
    const area = curriculumRepository.createArea({
      ...data,
      createdBy: user.id
    });
    return { statusCode: 201, body: { data: area } };
  },

  getArea(id) {
    const area = curriculumRepository.findAreaById(id);
    if (!area) {
      throw new HttpError(404, "not_found", "Área curricular no encontrada");
    }
    return { statusCode: 200, body: { data: area } };
  },

  listAreas(query, user) {
    const areas = curriculumRepository.listAreas({
      schoolId: user.assignments?.[0]?.schoolId ?? query.schoolId,
      responsibleId: query.responsibleId,
      includeInactive: query.includeInactive === "true"
    });
    return { statusCode: 200, body: { data: areas } };
  },

  updateArea(id, data) {
    const area = curriculumRepository.updateArea(id, data);
    if (!area) {
      throw new HttpError(404, "not_found", "Área curricular no encontrada");
    }
    return { statusCode: 200, body: { data: area } };
  },

  createPlan(data, user) {
    validateRequired(["title", "areaId", "startDate", "endDate", "schoolId"], data);
    const validStatuses = ["borrador", "aprobado", "en_ejecucion", "finalizado", "archivado"];
    if (data.status && !validStatuses.includes(data.status)) {
      throw new HttpError(400, "validation_error", `Estado inválido. Estados válidos: ${validStatuses.join(", ")}`);
    }
    const plan = curriculumRepository.createPlan({
      ...data,
      createdBy: user.id
    });
    return { statusCode: 201, body: { data: plan } };
  },

  getPlan(id) {
    const plan = curriculumRepository.findPlanById(id);
    if (!plan) {
      throw new HttpError(404, "not_found", "Plan curricular no encontrado");
    }
    return { statusCode: 200, body: { data: plan } };
  },

  listPlans(query, user) {
    const plans = curriculumRepository.listPlans({
      schoolId: user.assignments?.[0]?.schoolId ?? query.schoolId,
      areaId: query.areaId,
      status: query.status
    });
    return { statusCode: 200, body: { data: plans } };
  },

  updatePlan(id, data) {
    if (data.status) {
      const validStatuses = ["borrador", "aprobado", "en_ejecucion", "finalizado", "archivado"];
      if (!validStatuses.includes(data.status)) {
        throw new HttpError(400, "validation_error", `Estado inválido. Estados válidos: ${validStatuses.join(", ")}`);
      }
    }
    const plan = curriculumRepository.updatePlan(id, data);
    if (!plan) {
      throw new HttpError(404, "not_found", "Plan curricular no encontrado");
    }
    return { statusCode: 200, body: { data: plan } };
  },

  createActivity(data, user) {
    validateRequired(["planId", "title"], data);
    const plan = curriculumRepository.findPlanById(data.planId);
    if (!plan) {
      throw new HttpError(404, "not_found", "Plan curricular no encontrado");
    }
    const validTypes = ["actividad", "evaluacion", "tarea", "obra", "proyecto", "otra"];
    if (data.type && !validTypes.includes(data.type)) {
      throw new HttpError(400, "validation_error", `Tipo de actividad inválido. Tipos válidos: ${validTypes.join(", ")}`);
    }
    const activity = curriculumRepository.createActivity({
      ...data,
      createdBy: user.id
    });
    return { statusCode: 201, body: { data: activity } };
  },

  getActivity(id) {
    const activity = curriculumRepository.findActivityById(id);
    if (!activity) {
      throw new HttpError(404, "not_found", "Actividad no encontrada");
    }
    return { statusCode: 200, body: { data: activity } };
  },

  listActivities(query) {
    const activities = curriculumRepository.listActivities({
      planId: query.planId,
      status: query.status,
      type: query.type
    });
    return { statusCode: 200, body: { data: activities } };
  },

  updateActivity(id, data) {
    if (data.status) {
      const validStatuses = ["pendiente", "en_progreso", "completada", "cancelada"];
      if (!validStatuses.includes(data.status)) {
        throw new HttpError(400, "validation_error", `Estado inválido. Estados válidos: ${validStatuses.join(", ")}`);
      }
    }
    if (data.type) {
      const validTypes = ["actividad", "evaluacion", "tarea", "obra", "proyecto", "otra"];
      if (!validTypes.includes(data.type)) {
        throw new HttpError(400, "validation_error", `Tipo de actividad inválido. Tipos válidos: ${validTypes.join(", ")}`);
      }
    }
    const activity = curriculumRepository.updateActivity(id, data);
    if (!activity) {
      throw new HttpError(404, "not_found", "Actividad no encontrada");
    }
    return { statusCode: 200, body: { data: activity } };
  }
};

export default curriculumService;