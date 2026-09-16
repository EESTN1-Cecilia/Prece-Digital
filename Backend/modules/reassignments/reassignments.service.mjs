import reassignmentsRepository from "./reassignments.repository.mjs";
import spacesRepository from "../spaces/spaces.repository.mjs";
import schedulesRepository from "../schedules/schedules.repository.mjs";
import teachersRepository from "../teachers/teachers.repository.mjs";
import reservationsRepository from "../reservations/reservations.repository.mjs";
import absencesRepository from "../absences/absences.repository.mjs";
import { HttpError } from "../../utils/http-error.mjs";

export const REASSIGNMENT_STATUSES = ["activa", "revertida"];

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

function resolveDayOfWeek(date) {
  const days = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];
  return days[new Date(`${date}T00:00:00`).getDay()];
}

function toMinutes(t) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  return toMinutes(aStart) < toMinutes(bEnd) && toMinutes(bStart) < toMinutes(aEnd);
}

function driveSchoolId(assignment, schoolId) {
  return schoolId ?? assignment.schoolId;
}

function resolveExistingAssignment(scheduleAssignmentId) {
  const assignment = schedulesRepository.findAssignmentById(scheduleAssignmentId);
  if (!assignment) {
    throw new HttpError(404, "not_found", "La asignación horaria indicada no existe");
  }
  if (!assignment.isActive) {
    throw new HttpError(409, "conflict", "La asignación horaria indicada está desactivada");
  }
  return assignment;
}

function assertDifferentSpace(originalSpaceId, newSpaceId) {
  if (originalSpaceId === newSpaceId) {
    throw new HttpError(400, "validation_error", "El espacio destino no puede ser el mismo que el espacio original (reasignación innecesaria)");
  }
}

function assertNoDuplicateActive(scheduleAssignmentId) {
  const active = reassignmentsRepository.findActiveByAssignment(scheduleAssignmentId);
  if (active) {
    throw new HttpError(409, "conflict", "La actividad ya tiene una reasignación activa. Debe revertirla o corregirla antes de crear otra", {
      activeReassignmentId: active.id
    });
  }
}

function hasReservationConflict(spaceId, date, startTime, endTime, schoolId) {
  return Boolean(
    reservationsRepository.findOverlap({
      resourceType: "espacio",
      resourceId: spaceId,
      date,
      startTime,
      endTime,
      schoolId
    })
  );
}

function hasSpaceScheduleConflict(spaceId, dayOfWeek, startTime, endTime, excludeAssignmentId) {
  return schedulesRepository.listAssignments({ spaceId, dayOfWeek, includeInactive: true }).some((a) => {
    if (!a.isActive || a.id === excludeAssignmentId) return false;
    return rangesOverlap(startTime, endTime, a.startTime, a.endTime);
  });
}

function validateAvailability(newSpaceId, date, availabilityId) {
  const availability = absencesRepository.findAvailabilityById(availabilityId);
  if (!availability) {
    throw new HttpError(404, "not_found", "La liberación de espacio indicada no existe");
  }
  if (availability.status !== "disponible_por_ausencia") {
    throw new HttpError(409, "conflict", "La liberación de espacio indicada ya fue utilizada o liberada");
  }
  if (availability.spaceId !== newSpaceId) {
    throw new HttpError(422, "validation_error", "La liberación de espacio no corresponde al espacio destino indicado");
  }
  if (availability.date !== date) {
    throw new HttpError(422, "validation_error", "La liberación de espacio no corresponde a la fecha de la reasignación");
  }
  return availability;
}

function markAvailabilityUsed(availabilityId, user) {
  if (!availabilityId) return null;
  absencesRepository.updateAvailability(availabilityId, { status: "utilizada", updatedBy: user?.id });
  return availabilityId;
}

function restoreAvailability(availabilityId, user) {
  if (!availabilityId) return null;
  absencesRepository.updateAvailability(availabilityId, { status: "disponible_por_ausencia", updatedBy: user?.id });
  return availabilityId;
}

function enrichReassignment(reassignment) {
  return {
    ...reassignment,
    originalSpace: spacesRepository.findSpaceById(reassignment.originalSpaceId) ?? null,
    newSpace: spacesRepository.findSpaceById(reassignment.newSpaceId) ?? null,
    teacher: reassignment.teacherId ? teachersRepository.findById(reassignment.teacherId) ?? null : null,
    scheduleAssignment: schedulesRepository.findAssignmentById(reassignment.scheduleAssignmentId) ?? null,
    availability: reassignment.availabilityId ? absencesRepository.findAvailabilityById(reassignment.availabilityId) ?? null : null,
    history: reassignmentsRepository.listHistory(reassignment.id)
  };
}

/**
 * Valida y ejecuta el cambio de espacio sobre una asignación horaria.
 * Toda validación ocurre antes de qualquer mutación: si algo falla,
 * la asignación existente queda sin modificaciones.
 */
function applyMove({
  scheduleAssignmentId,
  newSpaceId,
  date,
  reason,
  availabilityId,
  schoolId
}) {
  const assignment = resolveExistingAssignment(scheduleAssignmentId);

  const dateVal = date;
  const dayOfWeek = assignment.dayOfWeek;
  const startTime = assignment.startTime;
  const endTime = assignment.endTime;
  const spaceId = assignment.spaceId;

  if (!dateVal) {
    throw new HttpError(400, "validation_error", "La fecha es requerida");
  }
  validateDate(dateVal);

  if (resolveDayOfWeek(dateVal) !== dayOfWeek) {
    throw new HttpError(422, "validation_error", "La fecha indicada no coincide con el día de la semana de la asignación horaria");
  }
  assertNoDuplicateActive(scheduleAssignmentId);
  assertDifferentSpace(spaceId, newSpaceId);

  const newSpace = spacesRepository.findSpaceById(newSpaceId);
  if (!newSpace) {
    throw new HttpError(404, "not_found", "El espacio destino indicado no existe");
  }
  if (newSpace.status !== "activo") {
    throw new HttpError(409, "conflict", "El espacio destino no está disponible (debe estar activo)");
  }

  if (hasReservationConflict(newSpaceId, dateVal, startTime, endTime, driveSchoolId(assignment, schoolId))) {
    throw new HttpError(409, "conflict", "El espacio destino tiene una reserva incompatible en ese día y horario");
  }
  if (hasSpaceScheduleConflict(newSpaceId, dayOfWeek, startTime, endTime, scheduleAssignmentId)) {
    throw new HttpError(409, "conflict", "El espacio destino tiene otra clase asignada en el mismo día y horario");
  }

  if (availabilityId) {
    validateAvailability(newSpaceId, dateVal, availabilityId);
  }

  return {
    assignment,
    originalSpaceId: spaceId,
    courseId: assignment.courseId,
    divisionId: assignment.divisionId,
    subjectId: assignment.subjectId,
    teacherId: assignment.teacherId,
    dayOfWeek,
    startTime,
    endTime,
    scheduleId: assignment.scheduleId,
    schoolId: driveSchoolId(assignment, schoolId)
  };
}

const reassignmentsService = {
  createReassignment(data, user) {
    validateRequired(["scheduleAssignmentId", "newSpaceId", "date"], data ?? {});

    const ctx = applyMove({
      scheduleAssignmentId: data.scheduleAssignmentId,
      newSpaceId: data.newSpaceId,
      date: data.date,
      reason: data.reason,
      availabilityId: data.availabilityId,
      schoolId: data.schoolId
    });

    const reassignment = reassignmentsRepository.createReassignment({
      scheduleAssignmentId: ctx.assignment.id,
      courseId: ctx.courseId,
      divisionId: ctx.divisionId,
      subjectId: ctx.subjectId,
      teacherId: ctx.teacherId,
      originalSpaceId: ctx.originalSpaceId,
      newSpaceId: data.newSpaceId,
      date: data.date,
      dayOfWeek: ctx.dayOfWeek,
      startTime: ctx.startTime,
      endTime: ctx.endTime,
      reason: data.reason ?? null,
      availabilityId: markAvailabilityUsed(data.availabilityId, user),
      status: "activa",
      schoolId: ctx.schoolId,
      createdBy: user.id,
      updatedBy: user.id
    });

    schedulesRepository.updateAssignment(ctx.assignment.id, { spaceId: data.newSpaceId, updatedBy: user.id });

    return { statusCode: 201, body: { data: enrichReassignment(reassignment) } };
  },

  getReassignment(id) {
    const reassignment = reassignmentsRepository.findReassignmentById(id);
    if (!reassignment) {
      throw new HttpError(404, "not_found", "Reasignación no encontrada");
    }
    return { statusCode: 200, body: { data: enrichReassignment(reassignment) } };
  },

  listReassignments(query, user) {
    const schoolId = user.assignments?.[0]?.schoolId ?? query.schoolId;
    const reassignments = reassignmentsRepository.listReassignments({
      schoolId,
      scheduleAssignmentId: query.scheduleAssignmentId,
      courseId: query.courseId,
      divisionId: query.divisionId,
      subjectId: query.subjectId,
      teacherId: query.teacherId,
      spaceId: query.spaceId,
      originalSpaceId: query.originalSpaceId,
      newSpaceId: query.newSpaceId,
      date: query.date,
      startDate: query.startDate,
      endDate: query.endDate,
      dayOfWeek: query.dayOfWeek,
      status: query.status,
      includeInactive: query.includeInactive === "true"
    });
    return { statusCode: 200, body: { data: reassignments.map(enrichReassignment) } };
  },

  updateReassignment(id, data, user) {
    const current = reassignmentsRepository.findReassignmentById(id);
    if (!current) {
      throw new HttpError(404, "not_found", "Reasignación no encontrada");
    }
    if (current.status !== "activa") {
      throw new HttpError(409, "conflict", "Solo se puede corregir una reasignación activa");
    }

    const resultingNewSpaceId = data.newSpaceId ?? current.newSpaceId;
    const resultingDate = data.date ?? current.date;

    if (data.reason !== undefined) {
      validateRequired(["reason"], data);
    }
    if (data.date) {
      validateDate(data.date);
    }

    const assignment = resolveExistingAssignment(current.scheduleAssignmentId);

    assertDifferentSpace(assignment.spaceId, resultingNewSpaceId);

    const newSpace = spacesRepository.findSpaceById(resultingNewSpaceId);
    if (!newSpace) {
      throw new HttpError(404, "not_found", "El espacio destino indicado no existe");
    }
    if (newSpace.status !== "activo") {
      throw new HttpError(409, "conflict", "El espacio destino no está disponible (debe estar activo)");
    }

    if (hasReservationConflict(resultingNewSpaceId, resultingDate, assignment.startTime, assignment.endTime, current.schoolId)) {
      throw new HttpError(409, "conflict", "El espacio destino tiene una reserva incompatible en ese día y horario");
    }
    if (hasSpaceScheduleConflict(resultingNewSpaceId, assignment.dayOfWeek, assignment.startTime, assignment.endTime, assignment.id)) {
      throw new HttpError(409, "conflict", "El espacio destino tiene otra clase asignada en el mismo día y horario");
    }

    const resultingAvailabilityId = data.availabilityId !== undefined ? data.availabilityId : current.availabilityId;
    if (resultingAvailabilityId) {
      validateAvailability(resultingNewSpaceId, resultingDate, resultingAvailabilityId);
    }

    const reassignment = reassignmentsRepository.updateReassignment(id, {
      newSpaceId: resultingNewSpaceId,
      date: resultingDate,
      reason: data.reason ?? current.reason,
      availabilityId: resultingAvailabilityId !== current.availabilityId
        ? markAvailabilityUsed(resultingAvailabilityId, user)
        : current.availabilityId,
      updatedBy: user?.id
    }, user);

    schedulesRepository.updateAssignment(assignment.id, { spaceId: resultingNewSpaceId, updatedBy: user?.id });

    return { statusCode: 200, body: { data: enrichReassignment(reassignment) } };
  },

  revertReassignment(id, user) {
    const current = reassignmentsRepository.findReassignmentById(id);
    if (!current) {
      throw new HttpError(404, "not_found", "Reasignación no encontrada");
    }
    if (current.status !== "activa") {
      throw new HttpError(409, "conflict", "La reasignación ya fue revertida");
    }

    const assignment = schedulesRepository.findAssignmentById(current.scheduleAssignmentId);
    if (!assignment) {
      throw new HttpError(404, "not_found", "La asignación horaria asociada no existe");
    }

    const reassignment = reassignmentsRepository.setStatus(id, "revertida", user);

    if (current.availabilityId) {
      restoreAvailability(current.availabilityId, user);
    }

    schedulesRepository.updateAssignment(assignment.id, { spaceId: current.originalSpaceId, updatedBy: user?.id });

    return { statusCode: 200, body: { data: enrichReassignment(reassignment) } };
  },

  getCurrentSpace(scheduleAssignmentId, query) {
    const assignment = resolveExistingAssignment(scheduleAssignmentId);

    if (query?.date) {
      validateDate(query.date);
      const active = reassignmentsRepository.listReassignments({
        scheduleAssignmentId,
        date: query.date,
        includeInactive: true
      }).find((r) => r.status === "activa");

      return {
        statusCode: 200,
        body: {
          data: {
            scheduleAssignmentId,
            courseId: assignment.courseId,
            divisionId: assignment.divisionId,
            subjectId: assignment.subjectId,
            teacherId: assignment.teacherId,
            dayOfWeek: assignment.dayOfWeek,
            startTime: assignment.startTime,
            endTime: assignment.endTime,
            date: query.date,
            spaceId: active ? active.newSpaceId : assignment.spaceId,
            space: spacesRepository.findSpaceById(active ? active.newSpaceId : assignment.spaceId) ?? null,
            originalSpaceId: assignment.spaceId,
            reassigned: Boolean(active),
            reassignmentId: active?.id ?? null
          }
        }
      };
    }

    return {
      statusCode: 200,
      body: {
        data: {
          scheduleAssignmentId,
          courseId: assignment.courseId,
          divisionId: assignment.divisionId,
          subjectId: assignment.subjectId,
          teacherId: assignment.teacherId,
          dayOfWeek: assignment.dayOfWeek,
          startTime: assignment.startTime,
          endTime: assignment.endTime,
          date: null,
          spaceId: assignment.spaceId,
          space: spacesRepository.findSpaceById(assignment.spaceId) ?? null,
          originalSpaceId: assignment.spaceId,
          reassigned: false,
          reassignmentId: null
        }
      }
    };
  },

  listReassignmentsByActivity(scheduleAssignmentId, query, user) {
    resolveExistingAssignment(scheduleAssignmentId);
    const reassignments = reassignmentsRepository.listReassignments({
      scheduleAssignmentId,
      schoolId: user.assignments?.[0]?.schoolId ?? query?.schoolId,
      includeInactive: true
    });
    return { statusCode: 200, body: { data: reassignments.map(enrichReassignment) } };
  }
};

export default reassignmentsService;