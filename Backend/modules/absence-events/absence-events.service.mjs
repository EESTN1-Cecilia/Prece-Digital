import absenceEventsRepository from "./absence-events.repository.mjs";
import absencesRepository from "../absences/absences.repository.mjs";
import schedulesRepository from "../schedules/schedules.repository.mjs";
import spacesRepository from "../spaces/spaces.repository.mjs";
import teachersRepository from "../teachers/teachers.repository.mjs";
import reassignmentsRepository from "../reassignments/reassignments.repository.mjs";
import notificationsService from "../notifications/notifications.service.mjs";
import notificationsRepository from "../notifications/notifications.repository.mjs";
import { userRepository } from "../../database/repositories/user.repository.mjs";
import { HttpError } from "../../utils/http-error.mjs";

const DIRECTORS_NOTIFY_TYPES = ["medica", "personal", "injustificada"];

function validateRequired(fields, data) {
  for (const field of fields) {
    if (data[field] === undefined || data[field] === null || data[field] === "") {
      throw new HttpError(400, "validation_error", `El campo ${field} es requerido`);
    }
  }
}

function resolveEnumEvent(eventId) {
  const event = absenceEventsRepository.findEventById(eventId);
  if (!event) {
    throw new HttpError(404, "not_found", "Evento de ausencia no encontrado");
  }
  return event;
}

function resolveTeacher(teacherId) {
  const teacher = teachersRepository.findById(teacherId);
  if (!teacher) {
    throw new HttpError(404, "not_found", "El docente indicado no existe");
  }
  return teacher;
}

function resolveAssignment(assignmentId) {
  const assignment = schedulesRepository.findAssignmentById(assignmentId);
  if (!assignment) {
    throw new HttpError(404, "not_found", "La asignación horaria indicada no existe");
  }
  return assignment;
}

function resolveSpace(spaceId) {
  const space = spacesRepository.findSpaceById(spaceId);
  if (!space) {
    throw new HttpError(404, "not_found", "El espacio asociado a la asignación no existe");
  }
  return space;
}

function assertTeacherMatchesAssignment(assignment, teacherId) {
  if (assignment.teacherId !== teacherId) {
    throw new HttpError(422, "validation_error", "La asignación horaria no corresponde al docente de la ausencia");
  }
}

function activeReassignment(event) {
  return reassignmentsRepository
    .listReassignments({ scheduleAssignmentId: event.scheduleAssignmentId, date: event.date, includeInactive: true })
    .find((r) => r.status === "activa") ?? null;
}

function classStateOf(event) {
  return event.status === "anulada" ? "con_clase" : "sin_clase";
}

function spaceAvailableOf(event) {
  return event.status === "activo";
}

function notifyReason(event) {
  return event.absenceReason && DIRECTORS_NOTIFY_TYPES.includes(event.absenceType)
    ? ` Motivo: ${event.absenceReason}.`
    : "";
}

function notificationText(event, teacher, space) {
  const teacherName = teacher ? `${teacher.firstName} ${teacher.lastName}` : event.teacherId;
  const spaceLabel = space ? `${space.name} (${space.code})` : event.spaceId;
  const curso = event.divisionId
    ? `Curso ${event.courseId}, División ${event.divisionId}`
    : `Curso ${event.courseId}`;
  const materia = event.subjectId ? `Materia ${event.subjectId}` : "Materia sin identificar";
  const estado = classStateOf(event) === "sin_clase" ? "no tendrá clase" : "retoma sus clases normalmente";
  const espacio = spaceAvailableOf(event) ? `y el espacio ${spaceLabel} queda disponible para ese horario` : "y el espacio queda liberado";
  return `Ausencia del docente ${teacherName} el ${event.date} (${event.dayOfWeek}) de ${event.startTime} a ${event.endTime}. ${curso}, ${materia}. El grupo ${estado} ${espacio}.${notifyReason(event)}`;
}

function notificationTitle(event) {
  return `Ausencia docente - ${event.date}`;
}

function collectRecipients(event) {
  const schoolId = event.schoolId;
  const users = userRepository.list();
  const recipients = [];

  for (const user of users) {
    for (const assignment of user.assignments) {
      if (assignment.schoolId !== schoolId) {
        continue;
      }
      if (assignment.role === "preceptor") {
        recipients.push({ recipientId: user.id, role: "preceptor" });
      } else if (assignment.role === "director" && DIRECTORS_NOTIFY_TYPES.includes(event.absenceType)) {
        recipients.push({ recipientId: user.id, role: "director" });
      }
    }
  }

  const unique = new Map();
  for (const recipient of recipients) {
    unique.set(recipient.recipientId, recipient);
  }
  return [...unique.values()];
}

function enrichEvent(event) {
  const teacher = teachersRepository.findById(event.teacherId) ?? null;
  const space = spacesRepository.findSpaceById(event.spaceId) ?? null;
  const assignment = schedulesRepository.findAssignmentById(event.scheduleAssignmentId) ?? null;
  const reassignment = activeReassignment(event);
  const links = absenceEventsRepository.listNotificationLinks({ eventId: event.id });

  return {
    ...event,
    classState: classStateOf(event),
    spaceAvailable: spaceAvailableOf(event),
    teacher: teacher ? { id: teacher.id, firstName: teacher.firstName, lastName: teacher.lastName } : null,
    space: space ? { id: space.id, name: space.name, code: space.code } : null,
    scheduleAssignment: assignment ? {
      id: assignment.id,
      scheduleId: assignment.scheduleId,
      courseId: assignment.courseId,
      divisionId: assignment.divisionId,
      subjectId: assignment.subjectId,
      dayOfWeek: assignment.dayOfWeek,
      startTime: assignment.startTime,
      endTime: assignment.endTime,
      isActive: assignment.isActive
    } : null,
    reassigned: reassignment ? {
      reassignmentId: reassignment.id,
      currentSpaceId: reassignment.newSpaceId,
      currentSpace: spacesRepository.findSpaceById(reassignment.newSpaceId) ?? null,
      originalSpaceId: reassignment.originalSpaceId,
      date: reassignment.date
    } : null,
    notificationCount: links.length
  };
}

function buildAffectedClass(event) {
  const teacher = teachersRepository.findById(event.teacherId) ?? null;
  const originalSpace = spacesRepository.findSpaceById(event.spaceId) ?? null;
  const assignment = schedulesRepository.findAssignmentById(event.scheduleAssignmentId) ?? null;
  const reassignment = activeReassignment(event);
  const currentSpace = reassignment
    ? (spacesRepository.findSpaceById(reassignment.newSpaceId) ?? null)
    : originalSpace;

  return {
    scheduleAssignmentId: event.scheduleAssignmentId,
    scheduleId: event.scheduleId,
    courseId: event.courseId,
    divisionId: event.divisionId,
    subjectId: event.subjectId,
    teacherId: event.teacherId,
    spaceId: event.spaceId,
    spaceName: originalSpace?.name ?? null,
    spaceCode: originalSpace?.code ?? null,
    dayOfWeek: event.dayOfWeek,
    date: event.date,
    startTime: event.startTime,
    endTime: event.endTime,
    classState: classStateOf(event),
    spaceAvailable: spaceAvailableOf(event),
    status: event.status,
    teacherName: teacher ? `${teacher.firstName} ${teacher.lastName}` : null,
    assignmentActive: assignment?.isActive ?? false,
    reassigned: Boolean(reassignment),
    currentSpaceId: currentSpace?.id ?? null,
    currentSpaceName: currentSpace?.name ?? null,
    currentSpaceCode: currentSpace?.code ?? null
  };
}

const absenceEventsService = {
  createAbsenceEvent(data, user) {
    validateRequired(["absenceId"], data ?? {});

    const absence = absencesRepository.findAbsenceById(data.absenceId);
    if (!absence) {
      throw new HttpError(404, "not_found", "Ausencia no encontrada");
    }
    if (absence.status !== "activa") {
      throw new HttpError(409, "conflict", "La ausencia indicada no está activa");
    }

    const teacher = resolveTeacher(absence.teacherId);
    const assignment = resolveAssignment(absence.scheduleAssignmentId);
    assertTeacherMatchesAssignment(assignment, absence.teacherId);
    const space = resolveSpace(absence.spaceId);

    const existing = absenceEventsRepository.findEventByAbsenceId(absence.id);
    if (existing) {
      return {
        statusCode: 200,
        body: {
          data: {
            event: enrichEvent(existing),
            absence,
            affectedClass: buildAffectedClass(existing),
            notifications: this.listEventNotifications(existing.id),
            created: false
          }
        }
      };
    }

    const event = absenceEventsRepository.createEvent({
      absenceId: absence.id,
      teacherId: absence.teacherId,
      courseId: absence.courseId,
      divisionId: absence.divisionId,
      subjectId: absence.subjectId,
      spaceId: absence.spaceId,
      scheduleAssignmentId: absence.scheduleAssignmentId,
      scheduleId: absence.scheduleId,
      dayOfWeek: absence.dayOfWeek,
      date: absence.date,
      startTime: absence.startTime,
      endTime: absence.endTime,
      absenceType: absence.type,
      absenceReason: absence.reason,
      classState: "sin_clase",
      spaceAvailable: true,
      status: "activo",
      schoolId: absence.schoolId,
      createdBy: user.id
    });

    const notifications = [];
    for (const recipient of collectRecipients(event)) {
      const existingLink = absenceEventsRepository.findNotificationLink({
        eventId: event.id,
        recipientId: recipient.recipientId
      });
      if (existingLink) {
        continue;
      }
      const created = notificationsService.create({
        recipientId: recipient.recipientId,
        title: notificationTitle(event),
        body: notificationText(event, teacher, space),
        type: "ausencia",
        referenceType: "absence_event",
        referenceId: event.id,
        priority: DIRECTORS_NOTIFY_TYPES.includes(event.absenceType) ? "alta" : "normal",
        schoolId: event.schoolId
      }, user);
      absenceEventsRepository.createNotificationLink({
        eventId: event.id,
        recipientId: recipient.recipientId,
        notificationId: created.body.data.id,
        role: recipient.role
      });
      notifications.push({
        notificationId: created.body.data.id,
        recipientId: recipient.recipientId,
        role: recipient.role,
        title: created.body.data.title,
        body: created.body.data.body,
        type: created.body.data.type,
        priority: created.body.data.priority,
        schoolId: created.body.data.schoolId,
        isRead: created.body.data.isRead,
        createdAt: created.body.data.createdAt
      });
    }

    return {
      statusCode: 201,
      body: {
        data: {
          event: enrichEvent(event),
          absence,
          affectedClass: buildAffectedClass(event),
          notifications,
          created: true
        }
      }
    };
  },

  getEvent(eventId) {
    const event = resolveEnumEvent(eventId);
    return { statusCode: 200, body: { data: enrichEvent(event) } };
  },

  getEventByAbsence(absenceId) {
    const event = absenceEventsRepository.findEventByAbsenceId(absenceId);
    if (!event) {
      throw new HttpError(404, "not_found", "Evento de ausencia no encontrado");
    }
    return { statusCode: 200, body: { data: enrichEvent(event) } };
  },

  listEvents(query, user) {
    const schoolId = user.assignments?.[0]?.schoolId ?? query.schoolId;
    const events = absenceEventsRepository.listEvents({
      schoolId,
      absenceId: query.absenceId,
      teacherId: query.teacherId,
      courseId: query.courseId,
      divisionId: query.divisionId,
      subjectId: query.subjectId,
      spaceId: query.spaceId,
      date: query.date,
      startDate: query.startDate,
      endDate: query.endDate,
      status: query.status,
      includeInactive: query.includeInactive === "true"
    }).map(enrichEvent);
    return { statusCode: 200, body: { data: events } };
  },

  getAffectedClasses(eventId) {
    const event = resolveEnumEvent(eventId);
    return {
      statusCode: 200,
      body: {
        data: [buildAffectedClass(event)]
      }
    };
  },

  listEventNotifications(eventId) {
    const event = resolveEnumEvent(eventId);
    const links = absenceEventsRepository.listNotificationLinks({ eventId: event.id });
    const notifications = links
      .map((link) => {
        const notification = notificationsRepository.findById(link.notificationId);
        if (!notification) {
          return null;
        }
        return {
          notificationId: notification.id,
          recipientId: notification.recipientId,
          role: link.role,
          title: notification.title,
          body: notification.body,
          type: notification.type,
          priority: notification.priority,
          referenceType: notification.referenceType,
          referenceId: notification.referenceId,
          isRead: notification.isRead,
          schoolId: notification.schoolId,
          createdAt: notification.createdAt,
          readAt: notification.readAt ?? null
        };
      })
      .filter(Boolean);
    return notifications;
  },

  getEventNotifications(eventId) {
    return {
      statusCode: 200,
      body: { data: this.listEventNotifications(eventId) }
    };
  },

  getClassState(eventId) {
    const event = resolveEnumEvent(eventId);
    const reassignment = activeReassignment(event);
    const space = spacesRepository.findSpaceById(event.spaceId) ?? null;
    const currentSpace = reassignment
      ? (spacesRepository.findSpaceById(reassignment.newSpaceId) ?? null)
      : space;

    return {
      statusCode: 200,
      body: {
        data: {
          classState: classStateOf(event),
          status: event.status,
          date: event.date,
          dayOfWeek: event.dayOfWeek,
          startTime: event.startTime,
          endTime: event.endTime,
          teacherId: event.teacherId,
          courseId: event.courseId,
          divisionId: event.divisionId,
          subjectId: event.subjectId,
          scheduleAssignmentId: event.scheduleAssignmentId,
          spaceId: event.spaceId,
          currentSpaceId: currentSpace?.id ?? null,
          currentSpaceName: currentSpace?.name ?? null,
          currentSpaceCode: currentSpace?.code ?? null,
          reassigned: Boolean(reassignment)
        }
      }
    };
  },

  getSpaceAvailability(eventId) {
    const event = resolveEnumEvent(eventId);
    const space = spacesRepository.findSpaceById(event.spaceId) ?? null;
    const reassignment = activeReassignment(event);
    const availability = absencesRepository.findAvailabilityByAbsenceId(event.absenceId);

    return {
      statusCode: 200,
      body: {
        data: {
          spaceAvailable: spaceAvailableOf(event),
          classState: classStateOf(event),
          spaceId: event.spaceId,
          space: space ? { id: space.id, name: space.name, code: space.code } : null,
          date: event.date,
          dayOfWeek: event.dayOfWeek,
          startTime: event.startTime,
          endTime: event.endTime,
          reassigned: Boolean(reassignment),
          reassignment: reassignment ? {
            reassignmentId: reassignment.id,
            currentSpaceId: reassignment.newSpaceId,
            currentSpace: spacesRepository.findSpaceById(reassignment.newSpaceId) ?? null,
            originalSpaceId: reassignment.originalSpaceId
          } : null,
          availability: availability.map((a) => ({
            id: a.id,
            status: a.status,
            reason: a.reason,
            createdBy: a.createdBy,
            createdAt: a.createdAt
          })),
          note: classStateOf(event) === "sin_clase"
            ? "El grupo no tendrá clase y el espacio original queda disponible para ese horario"
            : "La ausencia fue anulada y el espacio vuelve a su uso normal"
        }
      }
    };
  },

  onAbsenceAnnuled(absence) {
    const event = absenceEventsRepository.findEventByAbsenceId(absence.id);
    if (!event || event.status === "anulada") {
      return;
    }
    absenceEventsRepository.updateEvent(event.id, {
      status: "anulada",
      classState: "con_clase",
      spaceAvailable: false
    }, { id: absence.updatedBy ?? absence.createdBy });
  },

  onAbsenceReactivated(absence) {
    const event = absenceEventsRepository.findEventByAbsenceId(absence.id);
    if (!event || event.status !== "anulada") {
      return;
    }
    absenceEventsRepository.updateEvent(event.id, {
      status: "activo",
      classState: "sin_clase",
      spaceAvailable: true
    }, { id: absence.updatedBy ?? absence.createdBy });
  },

  onAbsenceUpdated(absence) {
    const event = absenceEventsRepository.findEventByAbsenceId(absence.id);
    if (!event) {
      return;
    }
    absenceEventsRepository.updateEvent(event.id, {
      teacherId: absence.teacherId,
      courseId: absence.courseId,
      divisionId: absence.divisionId,
      subjectId: absence.subjectId,
      spaceId: absence.spaceId,
      scheduleAssignmentId: absence.scheduleAssignmentId,
      scheduleId: absence.scheduleId,
      dayOfWeek: absence.dayOfWeek,
      date: absence.date,
      startTime: absence.startTime,
      endTime: absence.endTime,
      absenceType: absence.type,
      absenceReason: absence.reason,
      status: absence.status,
      classState: absence.status === "anulada" ? "con_clase" : "sin_clase",
      spaceAvailable: absence.status === "activa"
    }, { id: absence.updatedBy ?? absence.createdBy });
  }
};

export default absenceEventsService;