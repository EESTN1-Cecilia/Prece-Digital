import { getStore } from "../../database/memory-store.mjs";

function generateId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function cloneEvent(event) {
  return { ...event };
}

function cloneLink(link) {
  return { ...link };
}

const absenceEventsRepository = {
  init() {
    const store = getStore();
    if (!store.absenceEvents) {
      store.absenceEvents = new Map();
    }
    if (!store.absenceEventNotifications) {
      store.absenceEventNotifications = new Map();
    }
  },

  createEvent(event) {
    this.init();
    const record = {
      id: event.id ?? generateId("aev"),
      absenceId: event.absenceId,
      teacherId: event.teacherId,
      courseId: event.courseId,
      divisionId: event.divisionId ?? null,
      subjectId: event.subjectId,
      spaceId: event.spaceId,
      scheduleAssignmentId: event.scheduleAssignmentId,
      scheduleId: event.scheduleId ?? null,
      dayOfWeek: event.dayOfWeek,
      date: event.date,
      startTime: event.startTime,
      endTime: event.endTime,
      absenceType: event.absenceType,
      absenceReason: event.absenceReason ?? null,
      classState: event.classState ?? "sin_clase",
      spaceAvailable: event.spaceAvailable ?? true,
      status: event.status ?? "activo",
      schoolId: event.schoolId,
      createdBy: event.createdBy,
      updatedBy: event.updatedBy ?? event.createdBy,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    getStore().absenceEvents.set(record.id, record);
    return cloneEvent(record);
  },

  findEventById(id) {
    this.init();
    const event = getStore().absenceEvents.get(id);
    return event ? cloneEvent(event) : null;
  },

  findEventByAbsenceId(absenceId) {
    this.init();
    for (const event of getStore().absenceEvents.values()) {
      if (event.absenceId === absenceId) {
        return cloneEvent(event);
      }
    }
    return null;
  },

  listEvents({
    schoolId,
    absenceId,
    teacherId,
    courseId,
    divisionId,
    subjectId,
    spaceId,
    date,
    startDate,
    endDate,
    status,
    includeInactive = false
  } = {}) {
    this.init();
    return [...getStore().absenceEvents.values()]
      .filter((event) => {
        if (!includeInactive && event.status === "anulada") return false;
        if (schoolId && event.schoolId !== schoolId) return false;
        if (absenceId && event.absenceId !== absenceId) return false;
        if (teacherId && event.teacherId !== teacherId) return false;
        if (courseId && event.courseId !== courseId) return false;
        if (divisionId && event.divisionId !== divisionId) return false;
        if (subjectId && event.subjectId !== subjectId) return false;
        if (spaceId && event.spaceId !== spaceId) return false;
        if (date && event.date !== date) return false;
        if (startDate && event.date < startDate) return false;
        if (endDate && event.date > endDate) return false;
        if (status && event.status !== status) return false;
        return true;
      })
      .map(cloneEvent)
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.startTime.localeCompare(b.startTime)));
  },

  updateEvent(id, data, user) {
    this.init();
    const event = getStore().absenceEvents.get(id);
    if (!event) return null;
    const updatedBy = user?.id ?? event.updatedBy ?? event.createdBy;
    Object.assign(event, data, { updatedBy, updatedAt: new Date().toISOString() });
    return cloneEvent(event);
  },

  createNotificationLink({ eventId, recipientId, notificationId, role }) {
    this.init();
    const record = {
      id: generateId("ael"),
      eventId,
      recipientId,
      notificationId,
      role: role ?? null,
      createdAt: new Date().toISOString()
    };
    getStore().absenceEventNotifications.set(record.id, record);
    return cloneLink(record);
  },

  findNotificationLink({ eventId, recipientId }) {
    this.init();
    for (const link of getStore().absenceEventNotifications.values()) {
      if (link.eventId === eventId && link.recipientId === recipientId) {
        return cloneLink(link);
      }
    }
    return null;
  },

  listNotificationLinks({ eventId, recipientId } = {}) {
    this.init();
    return [...getStore().absenceEventNotifications.values()]
      .filter((link) => {
        if (eventId && link.eventId !== eventId) return false;
        if (recipientId && link.recipientId !== recipientId) return false;
        return true;
      })
      .map(cloneLink)
      .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
  }
};

export default absenceEventsRepository;