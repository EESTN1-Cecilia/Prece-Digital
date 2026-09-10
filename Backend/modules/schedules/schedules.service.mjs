import schedulesRepository from "./schedules.repository.mjs";
import spacesRepository from "../spaces/spaces.repository.mjs";
import teachersRepository from "../teachers/teachers.repository.mjs";
import { HttpError } from "../../utils/http-error.mjs";

export const VALID_DAYS = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"];

function validateRequired(fields, data) {
  for (const field of fields) {
    if (data[field] === undefined || data[field] === null || data[field] === "") {
      throw new HttpError(400, "validation_error", `El campo ${field} es requerido`);
    }
  }
}

function validateDayOfWeek(dayOfWeek) {
  if (!VALID_DAYS.includes(dayOfWeek)) {
    throw new HttpError(400, "validation_error", `Día inválido. Días válidos: ${VALID_DAYS.join(", ")}`);
  }
}

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

function validateTime(time, label) {
  if (!TIME_REGEX.test(time)) {
    throw new HttpError(400, "validation_error", `Formato de hora inválido para ${label}. Use HH:MM de 00:00 a 23:59`);
  }
}

function toMinutes(time) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function validateRange(startTime, endTime) {
  if (toMinutes(endTime) <= toMinutes(startTime)) {
    throw new HttpError(400, "validation_error", "El horario de fin debe ser posterior al de inicio");
  }
}

function resolveExistingSpace(spaceId) {
  const space = spacesRepository.findSpaceById(spaceId);
  if (!space) {
    throw new HttpError(404, "not_found", "El espacio referenciado no existe");
  }
  return space;
}

function resolveExistingTeacher(teacherId) {
  const teacher = teachersRepository.findById(teacherId);
  if (!teacher) {
    throw new HttpError(404, "not_found", "El docente referenciado no existe");
  }
  if (!teacher.isActive) {
    throw new HttpError(409, "conflict", "El docente referenciado está desactivado");
  }
  return teacher;
}

function resolveExistingSchedule(scheduleId) {
  const schedule = schedulesRepository.findScheduleById(scheduleId);
  if (!schedule) {
    throw new HttpError(404, "not_found", "El horario referenciado no existe");
  }
  return schedule;
}

function resolveExistingTimeSlot(timeSlotId) {
  const timeSlot = schedulesRepository.findTimeSlotById(timeSlotId);
  if (!timeSlot) {
    throw new HttpError(404, "not_found", "La franja horaria referenciada no existe");
  }
  if (!timeSlot.isActive) {
    throw new HttpError(409, "conflict", "La franja horaria referenciada está desactivada");
  }
  return timeSlot;
}

function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  return toMinutes(aStart) < toMinutes(bEnd) && toMinutes(bStart) < toMinutes(aEnd);
}

function assertNoScheduleConflicts(candidate, { excludeId } = {}) {
  const conflicts = schedulesRepository.listAssignments({
    scheduleId: candidate.scheduleId,
    dayOfWeek: candidate.dayOfWeek,
    schoolId: candidate.schoolId,
    includeInactive: true
  }).filter((a) => a.isActive && a.id !== excludeId);

  const resources = [
    { key: "course", value: `${candidate.courseId}:${candidate.divisionId}`, get: (a) => `${a.courseId}:${a.divisionId}` },
    { key: "teacher", value: candidate.teacherId, get: (a) => a.teacherId },
    { key: "space", value: candidate.spaceId, get: (a) => a.spaceId }
  ];

  for (const resource of resources) {
    const clash = conflicts.find(
      (a) => resource.get(a) === resource.value && rangesOverlap(candidate.startTime, candidate.endTime, a.startTime, a.endTime)
    );
    if (clash) {
      throw new HttpError(409, "conflict", "Conflicto de horario detectado para el recurso indicado", {
        resource: resource.key,
        existingId: clash.id
      });
    }
  }
}

const schedulesService = {
  createShift(data, user) {
    validateRequired(["name", "code", "startTime", "endTime", "schoolId"], data);
    const shift = schedulesRepository.createShift({
      ...data,
      createdBy: user.id
    });
    return { statusCode: 201, body: { data: shift } };
  },

  getShift(id) {
    const shift = schedulesRepository.findShiftById(id);
    if (!shift) {
      throw new HttpError(404, "not_found", "Turno no encontrado");
    }
    return { statusCode: 200, body: { data: shift } };
  },

  listShifts(query, user) {
    const shifts = schedulesRepository.listShifts({
      schoolId: user.assignments?.[0]?.schoolId ?? query.schoolId,
      includeInactive: query.includeInactive === "true"
    });
    return { statusCode: 200, body: { data: shifts } };
  },

  updateShift(id, data) {
    const shift = schedulesRepository.updateShift(id, data);
    if (!shift) {
      throw new HttpError(404, "not_found", "Turno no encontrado");
    }
    return { statusCode: 200, body: { data: shift } };
  },

  createTimeSlot(data, user) {
    validateRequired(["name", "dayOfWeek", "startTime", "endTime", "shiftId", "schoolId"], data);
    const validDays = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];
    if (!validDays.includes(data.dayOfWeek)) {
      throw new HttpError(400, "validation_error", `Día inválido. Días válidos: ${validDays.join(", ")}`);
    }
    const timeSlot = schedulesRepository.createTimeSlot({
      ...data,
      createdBy: user.id
    });
    return { statusCode: 201, body: { data: timeSlot } };
  },

  getTimeSlot(id) {
    const timeSlot = schedulesRepository.findTimeSlotById(id);
    if (!timeSlot) {
      throw new HttpError(404, "not_found", "Franja horaria no encontrada");
    }
    return { statusCode: 200, body: { data: timeSlot } };
  },

  listTimeSlots(query, user) {
    const timeSlots = schedulesRepository.listTimeSlots({
      schoolId: user.assignments?.[0]?.schoolId ?? query.schoolId,
      shiftId: query.shiftId,
      dayOfWeek: query.dayOfWeek,
      includeInactive: query.includeInactive === "true"
    });
    return { statusCode: 200, body: { data: timeSlots } };
  },

  updateTimeSlot(id, data) {
    if (data.dayOfWeek) {
      const validDays = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];
      if (!validDays.includes(data.dayOfWeek)) {
        throw new HttpError(400, "validation_error", `Día inválido. Días válidos: ${validDays.join(", ")}`);
      }
    }
    const timeSlot = schedulesRepository.updateTimeSlot(id, data);
    if (!timeSlot) {
      throw new HttpError(404, "not_found", "Franja horaria no encontrada");
    }
    return { statusCode: 200, body: { data: timeSlot } };
  },

  createSchedule(data, user) {
    validateRequired(["name", "year", "period", "startDate", "endDate", "schoolId"], data);
    const schedule = schedulesRepository.createSchedule({
      ...data,
      createdBy: user.id
    });
    return { statusCode: 201, body: { data: schedule } };
  },

  getSchedule(id) {
    const schedule = schedulesRepository.findScheduleById(id);
    if (!schedule) {
      throw new HttpError(404, "not_found", "Horario no encontrado");
    }
    return { statusCode: 200, body: { data: schedule } };
  },

  listSchedules(query, user) {
    const schedules = schedulesRepository.listSchedules({
      schoolId: user.assignments?.[0]?.schoolId ?? query.schoolId,
      year: query.year ? Number(query.year) : undefined,
      includeInactive: query.includeInactive === "true"
    });
    return { statusCode: 200, body: { data: schedules } };
  },

  updateSchedule(id, data) {
    const schedule = schedulesRepository.updateSchedule(id, data);
    if (!schedule) {
      throw new HttpError(404, "not_found", "Horario no encontrado");
    }
    return { statusCode: 200, body: { data: schedule } };
  },

  createAssignment(data, user) {
    validateRequired(["scheduleId", "dayOfWeek", "startTime", "endTime", "spaceId", "subjectId", "teacherId", "courseId", "divisionId", "schoolId"], data);
    validateDayOfWeek(data.dayOfWeek);
    validateTime(data.startTime, "inicio");
    validateTime(data.endTime, "fin");
    validateRange(data.startTime, data.endTime);

    resolveExistingSchedule(data.scheduleId);

    const space = resolveExistingSpace(data.spaceId);
    if (space.status !== "activo") {
      throw new HttpError(409, "conflict", "El espacio no está disponible para asignación (debe estar activo)");
    }

    resolveExistingTeacher(data.teacherId);

    if (data.timeSlotId) {
      const timeSlot = resolveExistingTimeSlot(data.timeSlotId);
      data.dayOfWeek = data.dayOfWeek ?? timeSlot.dayOfWeek;
      data.startTime = data.startTime ?? timeSlot.startTime;
      data.endTime = data.endTime ?? timeSlot.endTime;
      data.shiftId = data.shiftId ?? timeSlot.shiftId;
    }

    assertNoScheduleConflicts({
      scheduleId: data.scheduleId,
      dayOfWeek: data.dayOfWeek,
      startTime: data.startTime,
      endTime: data.endTime,
      spaceId: data.spaceId,
      subjectId: data.subjectId,
      teacherId: data.teacherId,
      courseId: data.courseId,
      divisionId: data.divisionId,
      schoolId: data.schoolId
    });

    const assignment = schedulesRepository.createAssignment({
      ...data,
      createdBy: user.id,
      updatedBy: user.id
    });
    return { statusCode: 201, body: { data: assignment } };
  },

  getAssignment(id) {
    const assignment = schedulesRepository.findAssignmentById(id);
    if (!assignment) {
      throw new HttpError(404, "not_found", "Asignación no encontrada");
    }
    return { statusCode: 200, body: { data: assignment } };
  },

  listAssignments(query, user) {
    const assignments = schedulesRepository.listAssignments({
      scheduleId: query.scheduleId,
      timeSlotId: query.timeSlotId,
      spaceId: query.spaceId,
      teacherId: query.teacherId,
      courseId: query.courseId,
      subjectId: query.subjectId,
      dayOfWeek: query.dayOfWeek,
      shiftId: query.shiftId,
      schoolId: user.assignments?.[0]?.schoolId ?? query.schoolId,
      includeInactive: query.includeInactive === "true"
    });
    return { statusCode: 200, body: { data: assignments } };
  },

  updateAssignment(id, data, user) {
    if (data.dayOfWeek) {
      validateDayOfWeek(data.dayOfWeek);
    }
    if (data.startTime) {
      validateTime(data.startTime, "inicio");
    }
    if (data.endTime) {
      validateTime(data.endTime, "fin");
    }

    const current = schedulesRepository.findAssignmentById(id);
    if (!current) {
      throw new HttpError(404, "not_found", "Asignación no encontrada");
    }

    const startTime = data.startTime ?? current.startTime;
    const endTime = data.endTime ?? current.endTime;
    validateRange(startTime, endTime);

    if (data.spaceId && data.spaceId !== current.spaceId) {
      const space = resolveExistingSpace(data.spaceId);
      if (space.status !== "activo") {
        throw new HttpError(409, "conflict", "El espacio no está disponible para asignación (debe estar activo)");
      }
    }
    if (data.teacherId && data.teacherId !== current.teacherId) {
      resolveExistingTeacher(data.teacherId);
    }

    const resultingState = {
      scheduleId: data.scheduleId ?? current.scheduleId,
      dayOfWeek: data.dayOfWeek ?? current.dayOfWeek,
      startTime,
      endTime,
      spaceId: data.spaceId ?? current.spaceId,
      subjectId: data.subjectId ?? current.subjectId,
      teacherId: data.teacherId ?? current.teacherId,
      courseId: data.courseId ?? current.courseId,
      divisionId: data.divisionId ?? current.divisionId,
      schoolId: data.schoolId ?? current.schoolId
    };

    assertNoScheduleConflicts(resultingState, { excludeId: id });

    const assignment = schedulesRepository.updateAssignment(id, {
      ...data,
      updatedBy: user?.id ?? current.updatedBy
    });
    return { statusCode: 200, body: { data: assignment } };
  },

  deleteAssignment(id) {
    const assignment = schedulesRepository.deleteAssignment(id);
    if (!assignment) {
      throw new HttpError(404, "not_found", "Asignación no encontrada");
    }
    return { statusCode: 200, body: { data: assignment } };
  }
};

export default schedulesService;