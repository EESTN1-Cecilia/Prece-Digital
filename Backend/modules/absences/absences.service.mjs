import absencesRepository from "./absences.repository.mjs";
import spacesRepository from "../spaces/spaces.repository.mjs";
import teachersRepository from "../teachers/teachers.repository.mjs";
import schedulesRepository from "../schedules/schedules.repository.mjs";
import reservationsRepository from "../reservations/reservations.repository.mjs";
import { HttpError } from "../../utils/http-error.mjs";

export const ABSENCE_TYPES = ["injustificada", "justificada", "medica", "personal", "capacitacion", "otra"];
export const ABSENCE_STATUSES = ["activa", "anulada"];
export const AVAILABILITY_STATUSES = ["disponible_por_ausencia", "utilizada", "liberada"];

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function validateRequired(fields, data) {
  for (const field of fields) {
    if (data[field] === undefined || data[field] === null || data[field] === "") {
      throw new HttpError(400, "validation_error", `El campo ${field} es requerido`);
    }
  }
}

function validateDate(date) {
  if (!DATE_REGEX.test(date)) {
    throw new HttpError(400, "validation_error", "La fecha debe estar en formato YYYY-MM-DD");
  }
  const d = new Date(`${date}T00:00:00`);
  if (Number.isNaN(d.getTime())) {
    throw new HttpError(400, "validation_error", "La fecha ingresada no es válida");
  }
}

function validateType(type) {
  if (!ABSENCE_TYPES.includes(type)) {
    throw new HttpError(400, "validation_error", `Tipo de ausencia inválido. Tipos válidos: ${ABSENCE_TYPES.join(", ")}`);
  }
}

function validateStatus(status) {
  if (!ABSENCE_STATUSES.includes(status)) {
    throw new HttpError(400, "validation_error", `Estado inválido. Estados válidos: ${ABSENCE_STATUSES.join(", ")}`);
  }
}

function resolveExistingTeacher(teacherId) {
  const teacher = teachersRepository.findById(teacherId);
  if (!teacher) {
    throw new HttpError(404, "not_found", "El docente indicado no existe");
  }
  if (!teacher.isActive) {
    throw new HttpError(409, "conflict", "El docente indicado está desactivado");
  }
  return teacher;
}

function resolveExistingAssignment(assignmentId) {
  const assignment = schedulesRepository.findAssignmentById(assignmentId);
  if (!assignment) {
    throw new HttpError(404, "not_found", "La asignación horaria indicada no existe");
  }
  if (!assignment.isActive) {
    throw new HttpError(409, "conflict", "La asignación horaria indicada está desactivada");
  }
  return assignment;
}

function assertTeacherMatchesAssignment(assignment, teacherId) {
  if (assignment.teacherId !== teacherId) {
    throw new HttpError(422, "validation_error", "La asignación horaria no corresponde al docente indicado");
  }
}

function resolveExistingSpace(spaceId) {
  const space = spacesRepository.findSpaceById(spaceId);
  if (!space) {
    throw new HttpError(404, "not_found", "El espacio asociado a la asignación no existe");
  }
  return space;
}

function assertNoDuplicateAbsence({ teacherId, scheduleAssignmentId, date, excludeId }) {
  const duplicates = absencesRepository.listAbsences({
    teacherId,
    scheduleAssignmentId,
    date,
    schoolId: undefined,
    includeInactive: true
  }).filter((a) => a.status !== "anulada" && a.id !== excludeId);

  if (duplicates.length > 0) {
    throw new HttpError(409, "conflict", "Ya existe una ausencia registrada para este docente, asignación y fecha");
  }
}

function resolveDayOfWeek(date) {
  const days = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];
  const d = new Date(`${date}T00:00:00`);
  return days[d.getDay()];
}

function assertAssignmentOnDate(assignment, date) {
  if (assignment.dayOfWeek !== resolveDayOfWeek(date)) {
    throw new HttpError(422, "validation_error", "La fecha indicada no coincide con el día de la semana de la asignación horaria");
  }
}

function validateObservations(observations) {
  if (observations != null && typeof observations !== "string") {
    throw new HttpError(400, "validation_error", "Las observaciones deben ser texto");
  }
  if (observations != null && observations.length > 2000) {
    throw new HttpError(400, "validation_error", "Las observaciones no pueden superar los 2000 caracteres");
  }
}

function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  const toMin = (t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
  return toMin(aStart) < toMin(bEnd) && toMin(bStart) < toMin(aEnd);
}

function hasReservationConflict(spaceId, date, startTime, endTime, excludeAbsenceId) {
  const reservations = reservationsRepository.list({
    resourceId: spaceId,
    date,
    status: "pendiente"
  });
  return reservations.some((r) => rangesOverlap(startTime, endTime, r.startTime, r.endTime));
}

function hasAssignmentConflict(spaceId, date, startTime, endTime, excludeAssignmentId) {
  const assignments = schedulesRepository.listAssignments({ spaceId });
  return assignments.some((a) => {
    if (!a.isActive) return false;
    if (a.id === excludeAssignmentId) return false;
    if (a.date !== date && a.dayOfWeek !== resolveDayOfWeek(date)) return false;
    return rangesOverlap(startTime, endTime, a.startTime, a.endTime);
  });
}

const absencesService = {
  createAbsence(data, user) {
    const fields = data && data.scheduleAssignmentId
      ? ["teacherId", "scheduleAssignmentId", "date", "type"]
      : ["teacherId", "scheduleAssignmentId", "date", "type", "schoolId"];

    validateRequired(fields, data ?? {});
    validateDate(data.date);
    validateType(data.type);
    validateStatus(data.status ?? "activa");
    validateObservations(data.observations);

    const teacher = resolveExistingTeacher(data.teacherId);
    const assignment = resolveExistingAssignment(data.scheduleAssignmentId);
    assertTeacherMatchesAssignment(assignment, data.teacherId);
    assertAssignmentOnDate(assignment, data.date);

    const space = resolveExistingSpace(assignment.spaceId);
    let schoolId = data.schoolId ?? user?.assignments?.[0]?.schoolId ?? assignment.schoolId;

    const record = {
      ...data,
      courseId: assignment.courseId,
      divisionId: assignment.divisionId,
      subjectId: assignment.subjectId,
      spaceId: assignment.spaceId,
      scheduleId: assignment.scheduleId,
      dayOfWeek: assignment.dayOfWeek,
      startTime: assignment.startTime,
      endTime: assignment.endTime,
      schoolId
    };

    assertNoDuplicateAbsence({
      teacherId: data.teacherId,
      scheduleAssignmentId: data.scheduleAssignmentId,
      date: data.date
    });

    const absence = absencesRepository.createAbsence({
      ...record,
      createdBy: user.id
    });

    return {
      statusCode: 201,
      body: {
        data: absence,
        availability: absencesRepository.findAvailabilityByAbsenceId(absence.id),
        meta: {
          teacher: { id: teacher.id },
          space: { id: space.id, name: space.name, code: space.code },
          affectedActivity: {
            scheduleAssignmentId: assignment.id,
            scheduleId: assignment.scheduleId,
            courseId: assignment.courseId,
            divisionId: assignment.divisionId,
            subjectId: assignment.subjectId,
            dayOfWeek: assignment.dayOfWeek,
            startTime: assignment.startTime,
            endTime: assignment.endTime
          }
        }
      }
    };
  },

  getAbsence(id) {
    const absence = absencesRepository.findAbsenceById(id);
    if (!absence) {
      throw new HttpError(404, "not_found", "Ausencia no encontrada");
    }
    return {
      statusCode: 200,
      body: {
        data: absence,
        availability: absencesRepository.findAvailabilityByAbsenceId(absence.id)
      }
    };
  },

  getAbsenceAvailability(id) {
    const absence = absencesRepository.findAbsenceById(id);
    if (!absence) {
      throw new HttpError(404, "not_found", "Ausencia no encontrada");
    }
    const availabilities = absencesRepository.findAvailabilityByAbsenceId(id);
    const enriched = availabilities.map((av) => ({
      ...av,
      space: spacesRepository.findSpaceById(av.spaceId) ?? null,
      teacher: teachersRepository.findById(av.teacherId) ?? null,
      scheduleAssignment: schedulesRepository.findAssignmentById(av.scheduleAssignmentId) ?? null
    }));
    return { statusCode: 200, body: { data: enriched } };
  },

  listAbsences(query, user) {
    const schoolId = user.assignments?.[0]?.schoolId ?? query.schoolId;
    let scheduleIds;
    if (query.period) {
      scheduleIds = schedulesRepository
        .listSchedules({ schoolId })
        .filter((s) => s.period === query.period)
        .map((s) => s.id);
    }

    const absences = absencesRepository.listAbsences({
      teacherId: query.teacherId,
      courseId: query.courseId,
      divisionId: query.divisionId,
      subjectId: query.subjectId,
      spaceId: query.spaceId,
      scheduleAssignmentId: query.scheduleAssignmentId,
      scheduleId: query.scheduleId,
      scheduleIds,
      date: query.date,
      startDate: query.startDate,
      endDate: query.endDate,
      dayOfWeek: query.dayOfWeek,
      schoolId,
      status: query.status,
      includeInactive: query.includeInactive === "true"
    });
    return { statusCode: 200, body: { data: absences } };
  },

  updateAbsence(id, data, user) {
    const current = absencesRepository.findAbsenceById(id);
    if (!current) {
      throw new HttpError(404, "not_found", "Ausencia no encontrada");
    }
    if (current.status === "anulada") {
      throw new HttpError(409, "conflict", "No se puede modificar una ausencia anulada");
    }

    if (data.type) {
      validateType(data.type);
    }
    if (data.status) {
      validateStatus(data.status);
    }
    if (data.date) {
      validateDate(data.date);
    }
    validateObservations(data.observations);

    let resultingTeacherId = data.teacherId ?? current.teacherId;
    let resultingAssignmentId = data.scheduleAssignmentId ?? current.scheduleAssignmentId;
    let resultingDate = data.date ?? current.date;

    const teacher = resolveExistingTeacher(resultingTeacherId);
    const assignment = resolveExistingAssignment(resultingAssignmentId);
    assertTeacherMatchesAssignment(assignment, resultingTeacherId);
    assertAssignmentOnDate(assignment, resultingDate);

    const patch = {
      ...data,
      courseId: assignment.courseId,
      divisionId: assignment.divisionId,
      subjectId: assignment.subjectId,
      spaceId: assignment.spaceId,
      scheduleId: assignment.scheduleId,
      dayOfWeek: assignment.dayOfWeek,
      startTime: assignment.startTime,
      endTime: assignment.endTime,
      schoolId: data.schoolId ?? current.schoolId
    };

    assertNoDuplicateAbsence({
      teacherId: resultingTeacherId,
      scheduleAssignmentId: resultingAssignmentId,
      date: resultingDate,
      excludeId: id
    });

    const absence = absencesRepository.updateAbsence(id, patch, user);
    return {
      statusCode: 200,
      body: {
        data: absence,
        availability: absencesRepository.findAvailabilityByAbsenceId(absence.id)
      }
    };
  },

  annulAbsence(id, user) {
    const absence = absencesRepository.annulAbsence(id, user);
    if (!absence) {
      throw new HttpError(404, "not_found", "Ausencia no encontrada");
    }
    return { statusCode: 200, body: { data: absence } };
  },

  reactivateAbsence(id, user) {
    const absence = absencesRepository.reactivateAbsence(id, user);
    if (!absence) {
      throw new HttpError(404, "not_found", "Ausencia no encontrada");
    }
    return { statusCode: 200, body: { data: absence } };
  },

  getAbsenceHistory(id) {
    const absence = absencesRepository.findAbsenceById(id);
    if (!absence) {
      throw new HttpError(404, "not_found", "Ausencia no encontrada");
    }
    const history = absencesRepository.listAbsenceHistory(id);
    return { statusCode: 200, body: { data: history } };
  },

  listAvailableSpaces(query, user) {
    const schoolId = user.assignments?.[0]?.schoolId ?? query.schoolId;
    const liberations = absencesRepository.listAvailableSpaces({
      date: query.date,
      startDate: query.startDate,
      endDate: query.endDate,
      spaceId: query.spaceId,
      dayOfWeek: query.dayOfWeek,
      schoolId
    });

    const available = [];
    for (const lib of liberations) {
      if (lib.status !== "disponible_por_ausencia") continue;

      const reservationConflict = hasReservationConflict(
        lib.spaceId, lib.date, lib.startTime, lib.endTime
      );
      if (reservationConflict) continue;

      const assignmentConflict = hasAssignmentConflict(
        lib.spaceId, lib.date, lib.startTime, lib.endTime,
        lib.scheduleAssignmentId
      );
      if (assignmentConflict) continue;

      available.push({
        ...lib,
        space: spacesRepository.findSpaceById(lib.spaceId) ?? null,
        teacher: teachersRepository.findById(lib.teacherId) ?? null,
        scheduleAssignment: schedulesRepository.findAssignmentById(lib.scheduleAssignmentId) ?? null
      });
    }

    return { statusCode: 200, body: { data: available } };
  },

  updateAbsenceAvailabilityStatus(availabilityId, data, user) {
    if (data.status) {
      if (!AVAILABILITY_STATUSES.includes(data.status)) {
        throw new HttpError(400, "validation_error", `Estado inválido. Estados válidos: ${AVAILABILITY_STATUSES.join(", ")}`);
      }
    }
    const availability = absencesRepository.updateAvailability(availabilityId, {
      ...data,
      updatedBy: user?.id
    });
    if (!availability) {
      throw new HttpError(404, "not_found", "Disponibilidad no encontrada");
    }
    return { statusCode: 200, body: { data: availability } };
  },

  listAffectedActivities(query, user) {
    const schoolId = user.assignments?.[0]?.schoolId ?? query.schoolId;
    let scheduleIds;
    if (query.period) {
      scheduleIds = schedulesRepository
        .listSchedules({ schoolId })
        .filter((s) => s.period === query.period)
        .map((s) => s.id);
    }

    const absences = absencesRepository.listAbsences({
      teacherId: query.teacherId,
      courseId: query.courseId,
      divisionId: query.divisionId,
      subjectId: query.subjectId,
      spaceId: query.spaceId,
      scheduleAssignmentId: query.scheduleAssignmentId,
      scheduleId: query.scheduleId,
      scheduleIds,
      date: query.date,
      startDate: query.startDate,
      endDate: query.endDate,
      dayOfWeek: query.dayOfWeek,
      schoolId,
      status: query.status,
      includeInactive: true
    });

    const activities = absences.map((a) => {
      const space = spacesRepository.findSpaceById(a.spaceId);
      const teacher = teachersRepository.findById(a.teacherId);
      const assignment = schedulesRepository.findAssignmentById(a.scheduleAssignmentId);
      const availability = absencesRepository.findAvailabilityByAbsenceId(a.id);

      return {
        absenceId: a.id,
        absenceStatus: a.status,
        absenceType: a.type,
        absenceReason: a.reason,
        absenceObservations: a.observations,
        teacherId: a.teacherId,
        teacherName: teacher ? `${teacher.firstName} ${teacher.lastName}` : null,
        scheduleAssignmentId: a.scheduleAssignmentId,
        scheduleId: a.scheduleId,
        courseId: a.courseId,
        divisionId: a.divisionId,
        subjectId: a.subjectId,
        spaceId: a.spaceId,
        spaceName: space?.name ?? null,
        spaceCode: space?.code ?? null,
        dayOfWeek: a.dayOfWeek,
        startTime: a.startTime,
        endTime: a.endTime,
        assignmentActive: assignment?.isActive ?? false,
        availabilityStatus: availability[0]?.status ?? null,
        createdBy: a.createdBy,
        createdAt: a.createdAt,
        updatedBy: a.updatedBy,
        updatedAt: a.updatedAt
      };
    });

    return { statusCode: 200, body: { data: activities } };
  },

  getGrid(query, user) {
    return this.listAffectedActivities(query, user);
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