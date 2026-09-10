import teachersRepository from "./teachers.repository.mjs";
import { HttpError } from "../../utils/http-error.mjs";

function validateRequired(fields, data) {
  for (const field of fields) {
    if (!data[field]) {
      throw new HttpError(400, "validation_error", `El campo ${field} es requerido`);
    }
  }
}

const teachersService = {
  create(data, user) {
    validateRequired(["firstName", "lastName", "documentNumber", "email", "schoolId"], data);
    const existing = teachersRepository.findByDocument(data.documentNumber, data.schoolId);
    if (existing) {
      throw new HttpError(409, "conflict", "Ya existe un docente con ese número de documento en la escuela");
    }
    const teacher = teachersRepository.create({
      ...data,
      createdBy: user.id
    });
    return { statusCode: 201, body: { data: teacher } };
  },

  getById(id) {
    const teacher = teachersRepository.findById(id);
    if (!teacher) {
      throw new HttpError(404, "not_found", "Docente no encontrado");
    }
    return { statusCode: 200, body: { data: teacher } };
  },

  list(query, user) {
    const teachers = teachersRepository.list({
      schoolId: user.assignments?.[0]?.schoolId ?? query.schoolId,
      includeInactive: query.includeInactive === "true"
    });
    return { statusCode: 200, body: { data: teachers } };
  },

  update(id, data) {
    if (data.documentNumber) {
      const existing = teachersRepository.findByDocument(data.documentNumber, data.schoolId);
      if (existing && existing.id !== id) {
        throw new HttpError(409, "conflict", "Ya existe un docente con ese número de documento en la escuela");
      }
    }
    const teacher = teachersRepository.update(id, data);
    if (!teacher) {
      throw new HttpError(404, "not_found", "Docente no encontrado");
    }
    return { statusCode: 200, body: { data: teacher } };
  },

  deactivate(id) {
    const teacher = teachersRepository.deactivate(id);
    if (!teacher) {
      throw new HttpError(404, "not_found", "Docente no encontrado");
    }
    return { statusCode: 200, body: { data: teacher } };
  },

  addSubject(teacherId, data, user) {
    validateRequired(["subjectId", "courseId", "divisionId", "schoolId"], data);
    const teacher = teachersRepository.findById(teacherId);
    if (!teacher) {
      throw new HttpError(404, "not_found", "Docente no encontrado");
    }
    const assignment = teachersRepository.addSubject(teacherId, data);
    return { statusCode: 201, body: { data: assignment } };
  },

  removeSubject(assignmentId) {
    const assignment = teachersRepository.removeSubject(assignmentId);
    if (!assignment) {
      throw new HttpError(404, "not_found", "Asignación no encontrada");
    }
    return { statusCode: 200, body: { data: assignment } };
  },

  listSubjects(query, user) {
    const subjects = teachersRepository.listSubjects({
      teacherId: query.teacherId,
      schoolId: user.assignments?.[0]?.schoolId ?? query.schoolId
    });
    return { statusCode: 200, body: { data: subjects } };
  }
};

export default teachersService;