import workshopsRepository from "./workshops.repository.mjs";
import { HttpError } from "../../utils/http-error.mjs";

function validateRequired(fields, data) {
  for (const field of fields) {
    if (!data[field]) {
      throw new HttpError(400, "validation_error", `El campo ${field} es requerido`);
    }
  }
}

const workshopsService = {
  create(data, user) {
    validateRequired(["name", "code", "careerId", "spaceId", "teacherId", "schoolId"], data);
    const groupType = data.groupType ?? "completo";
    data.groupType = groupType;
    const validGroupTypes = ["completo", "par", "impar", "personalizado"];
    if (!validGroupTypes.includes(data.groupType)) {
      throw new HttpError(400, "validation_error", `Tipo de grupo inválido. Tipos válidos: ${validGroupTypes.join(", ")}`);
    }
    const workshop = workshopsRepository.create({
      ...data,
      createdBy: user.id
    });
    return { statusCode: 201, body: { data: workshop } };
  },

  getById(id) {
    const workshop = workshopsRepository.findById(id);
    if (!workshop) {
      throw new HttpError(404, "not_found", "Taller no encontrado");
    }
    return { statusCode: 200, body: { data: workshop } };
  },

  list(query, user) {
    const workshops = workshopsRepository.list({
      schoolId: user.assignments?.[0]?.schoolId ?? query.schoolId,
      careerId: query.careerId,
      teacherId: query.teacherId,
      spaceId: query.spaceId,
      includeInactive: query.includeInactive === "true"
    });
    return { statusCode: 200, body: { data: workshops } };
  },

  update(id, data) {
    if (data.groupType) {
      const validGroupTypes = ["completo", "par", "impar", "personalizado"];
      if (!validGroupTypes.includes(data.groupType)) {
        throw new HttpError(400, "validation_error", `Tipo de grupo inválido. Tipos válidos: ${validGroupTypes.join(", ")}`);
      }
    }
    const workshop = workshopsRepository.update(id, data);
    if (!workshop) {
      throw new HttpError(404, "not_found", "Taller no encontrado");
    }
    return { statusCode: 200, body: { data: workshop } };
  },

  deactivate(id) {
    const workshop = workshopsRepository.deactivate(id);
    if (!workshop) {
      throw new HttpError(404, "not_found", "Taller no encontrado");
    }
    return { statusCode: 200, body: { data: workshop } };
  },

  createSession(data, user) {
    validateRequired(["workshopId", "date", "startTime", "endTime", "schoolId"], data);
    const workshop = workshopsRepository.findById(data.workshopId);
    if (!workshop) {
      throw new HttpError(404, "not_found", "Taller no encontrado");
    }
    const session = workshopsRepository.createSession({
      ...data,
      createdBy: user.id
    });
    return { statusCode: 201, body: { data: session } };
  },

  getSession(id) {
    const session = workshopsRepository.findSessionById(id);
    if (!session) {
      throw new HttpError(404, "not_found", "Sesión no encontrada");
    }
    return { statusCode: 200, body: { data: session } };
  },

  listSessions(query, user) {
    const sessions = workshopsRepository.listSessions({
      workshopId: query.workshopId,
      date: query.date,
      startDate: query.startDate,
      endDate: query.endDate,
      schoolId: user.assignments?.[0]?.schoolId ?? query.schoolId,
      status: query.status
    });
    return { statusCode: 200, body: { data: sessions } };
  },

  updateSession(id, data) {
    if (data.status) {
      const validStatuses = ["programada", "en_curso", "completada", "cancelada"];
      if (!validStatuses.includes(data.status)) {
        throw new HttpError(400, "validation_error", `Estado inválido. Estados válidos: ${validStatuses.join(", ")}`);
      }
    }
    const session = workshopsRepository.updateSession(id, data);
    if (!session) {
      throw new HttpError(404, "not_found", "Sesión no encontrada");
    }
    return { statusCode: 200, body: { data: session } };
  }
};

export default workshopsService;