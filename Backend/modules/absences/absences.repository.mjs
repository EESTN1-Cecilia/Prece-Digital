import { getStore } from "../../database/memory-store.mjs";

function generateId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function cloneAbsence(absence) {
  return { ...absence };
}

function cloneAvailability(availability) {
  return { ...availability };
}

const LIBERATION_REASON = "ausencia_docente";

const absencesRepository = {
  init() {
    const store = getStore();
    if (!store.absences) {
      store.absences = new Map();
    }
    if (!store.spaceAvailability) {
      store.spaceAvailability = new Map();
    }
    if (!store.absenceHistory) {
      store.absenceHistory = new Map();
    }
    if (!store.incidents) {
      store.incidents = new Map();
    }
  },

  createAbsence(absence) {
    this.init();
    const record = {
      id: absence.id ?? generateId("abs"),
      teacherId: absence.teacherId,
      date: absence.date,
      scheduleAssignmentId: absence.scheduleAssignmentId,
      scheduleId: absence.scheduleId ?? null,
      courseId: absence.courseId,
      divisionId: absence.divisionId ?? null,
      subjectId: absence.subjectId,
      spaceId: absence.spaceId,
      dayOfWeek: absence.dayOfWeek,
      startTime: absence.startTime,
      endTime: absence.endTime,
      type: absence.type,
      reason: absence.reason ?? null,
      observations: absence.observations ?? null,
      status: absence.status ?? "activa",
      schoolId: absence.schoolId,
      createdBy: absence.createdBy,
      updatedBy: absence.updatedBy ?? null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    getStore().absences.set(record.id, record);

    this.createSpaceAvailability({
      spaceId: record.spaceId,
      scheduleAssignmentId: record.scheduleAssignmentId,
      scheduleId: record.scheduleId,
      courseId: record.courseId,
      divisionId: record.divisionId,
      subjectId: record.subjectId,
      teacherId: record.teacherId,
      date: record.date,
      dayOfWeek: record.dayOfWeek,
      startTime: record.startTime,
      endTime: record.endTime,
      absenceId: record.id,
      absenceType: record.type,
      absenceReason: record.reason,
      schoolId: record.schoolId,
      createdBy: record.createdBy
    });

    this.addHistory({
      absenceId: record.id,
      action: "create",
      previousData: null,
      newData: cloneAbsence(record),
      changedBy: record.createdBy
    });

    return cloneAbsence(record);
  },

  findAbsenceById(id) {
    this.init();
    const absence = getStore().absences.get(id);
    return absence ? cloneAbsence(absence) : null;
  },

  listAbsences({
    teacherId,
    courseId,
    divisionId,
    subjectId,
    spaceId,
    scheduleAssignmentId,
    scheduleId,
    scheduleIds,
    date,
    startDate,
    endDate,
    dayOfWeek,
    schoolId,
    status,
    includeInactive = false
  } = {}) {
    this.init();
    return [...getStore().absences.values()]
      .filter((a) => {
        if (!includeInactive && a.status === "anulada") return false;
        if (teacherId && a.teacherId !== teacherId) return false;
        if (courseId && a.courseId !== courseId) return false;
        if (divisionId && a.divisionId !== divisionId) return false;
        if (subjectId && a.subjectId !== subjectId) return false;
        if (spaceId && a.spaceId !== spaceId) return false;
        if (scheduleAssignmentId && a.scheduleAssignmentId !== scheduleAssignmentId) return false;
        if (scheduleId && a.scheduleId !== scheduleId) return false;
        if (scheduleIds && !scheduleIds.includes(a.scheduleId)) return false;
        if (date && a.date !== date) return false;
        if (startDate && a.date < startDate) return false;
        if (endDate && a.date > endDate) return false;
        if (dayOfWeek && a.dayOfWeek !== dayOfWeek) return false;
        if (schoolId && a.schoolId !== schoolId) return false;
        if (status && a.status !== status) return false;
        return true;
      })
      .map(cloneAbsence)
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.startTime.localeCompare(b.startTime)));
  },

  updateAbsence(id, data, user) {
    this.init();
    const absence = getStore().absences.get(id);
    if (!absence) return null;
    const previousData = cloneAbsence(absence);
    const updatedBy = user?.id ?? absence.updatedBy ?? absence.createdBy;
    Object.assign(absence, data, {
      updatedBy,
      updatedAt: new Date().toISOString()
    });

    this.syncAvailability(absence, previousData);
    this.addHistory({
      absenceId: absence.id,
      action: "update",
      previousData,
      newData: cloneAbsence(absence),
      changedBy: updatedBy
    });

    return cloneAbsence(absence);
  },

  annulAbsence(id, user) {
    this.init();
    const absence = getStore().absences.get(id);
    if (!absence) return null;
    if (absence.status === "anulada") return cloneAbsence(absence);
    const previousData = cloneAbsence(absence);
    const updatedBy = user?.id ?? absence.updatedBy ?? absence.createdBy;
    Object.assign(absence, {
      status: "anulada",
      updatedBy,
      updatedAt: new Date().toISOString()
    });

    this.removeSpaceAvailability(id);
    this.addHistory({
      absenceId: absence.id,
      action: "annul",
      previousData,
      newData: cloneAbsence(absence),
      changedBy: updatedBy
    });

    return cloneAbsence(absence);
  },

  reactivateAbsence(id, user) {
    this.init();
    const absence = getStore().absences.get(id);
    if (!absence) return null;
    if (absence.status !== "anulada") return cloneAbsence(absence);
    const previousData = cloneAbsence(absence);
    const updatedBy = user?.id ?? absence.updatedBy ?? absence.createdBy;
    Object.assign(absence, {
      status: "activa",
      updatedBy,
      updatedAt: new Date().toISOString()
    });

    this.createSpaceAvailability({
      spaceId: absence.spaceId,
      scheduleAssignmentId: absence.scheduleAssignmentId,
      scheduleId: absence.scheduleId,
      courseId: absence.courseId,
      divisionId: absence.divisionId,
      subjectId: absence.subjectId,
      teacherId: absence.teacherId,
      date: absence.date,
      dayOfWeek: absence.dayOfWeek,
      startTime: absence.startTime,
      endTime: absence.endTime,
      absenceId: absence.id,
      absenceType: absence.type,
      absenceReason: absence.reason,
      schoolId: absence.schoolId,
      createdBy: updatedBy
    });
    this.addHistory({
      absenceId: absence.id,
      action: "reactivate",
      previousData,
      newData: cloneAbsence(absence),
      changedBy: updatedBy
    });

    return cloneAbsence(absence);
  },

  listAbsenceHistory(absenceId) {
    this.init();
    return [...(getStore().absenceHistory.values() ?? [])]
      .filter((h) => h.absenceId === absenceId)
      .sort((a, b) => (a.changedAt < b.changedAt ? -1 : 1));
  },

  createSpaceAvailability({
    spaceId,
    scheduleAssignmentId,
    scheduleId,
    courseId,
    divisionId,
    subjectId,
    teacherId,
    date,
    dayOfWeek,
    startTime,
    endTime,
    absenceId,
    absenceType,
    absenceReason,
    schoolId,
    createdBy
  }) {
    const availability = {
      id: generateId("ava"),
      spaceId,
      scheduleAssignmentId,
      scheduleId,
      courseId,
      divisionId,
      subjectId,
      teacherId,
      date,
      dayOfWeek,
      startTime,
      endTime,
      absenceId,
      absenceType,
      absenceReason,
      reason: LIBERATION_REASON,
      status: "disponible_por_ausencia",
      schoolId,
      createdBy,
      createdAt: new Date().toISOString(),
      updatedBy: null,
      updatedAt: new Date().toISOString()
    };
    getStore().spaceAvailability.set(availability.id, availability);
    return cloneAvailability(availability);
  },

  findAvailabilityById(id) {
    this.init();
    const availability = getStore().spaceAvailability.get(id);
    return availability ? cloneAvailability(availability) : null;
  },

  removeSpaceAvailability(absenceId) {
    for (const [key, availability] of getStore().spaceAvailability) {
      if (availability.absenceId === absenceId) {
        getStore().spaceAvailability.delete(key);
      }
    }
  },

  syncAvailability(absence, previousData) {
    const affected = [
      "spaceId",
      "date",
      "startTime",
      "endTime",
      "scheduleAssignmentId",
      "status"
    ].some((field) => absence[field] !== previousData[field]);

    if (!affected) return;

    this.removeSpaceAvailability(absence.id);

    if (absence.status !== "anulada") {
      this.createSpaceAvailability({
        spaceId: absence.spaceId,
        scheduleAssignmentId: absence.scheduleAssignmentId,
        scheduleId: absence.scheduleId,
        courseId: absence.courseId,
        divisionId: absence.divisionId,
        subjectId: absence.subjectId,
        teacherId: absence.teacherId,
        date: absence.date,
        dayOfWeek: absence.dayOfWeek,
        startTime: absence.startTime,
        endTime: absence.endTime,
        absenceId: absence.id,
        absenceType: absence.type,
        absenceReason: absence.reason,
        schoolId: absence.schoolId,
        createdBy: absence.createdBy
      });
    }
  },

  findAvailabilityByAbsenceId(absenceId) {
    this.init();
    return [...getStore().spaceAvailability.values()]
      .filter((a) => a.absenceId === absenceId)
      .map(cloneAvailability);
  },

  listAvailableSpaces({ date, startDate, endDate, spaceId, dayOfWeek, schoolId } = {}) {
    this.init();
    return [...getStore().spaceAvailability.values()]
      .filter((a) => {
        if (a.status !== "disponible_por_ausencia") return false;
        if (spaceId && a.spaceId !== spaceId) return false;
        if (date && a.date !== date) return false;
        if (startDate && a.date < startDate) return false;
        if (endDate && a.date > endDate) return false;
        if (dayOfWeek && a.dayOfWeek !== dayOfWeek) return false;
        if (schoolId && a.schoolId !== schoolId) return false;
        return true;
      })
      .map(cloneAvailability);
  },

  updateAvailability(id, data) {
    this.init();
    const availability = getStore().spaceAvailability.get(id);
    if (!availability) return null;
    Object.assign(availability, data, { updatedAt: new Date().toISOString() });
    return cloneAvailability(availability);
  },

  createIncident(incident) {
    this.init();
    const record = {
      id: incident.id ?? generateId("inc"),
      teacherId: incident.teacherId,
      date: incident.date,
      type: incident.type,
      description: incident.description,
      severity: incident.severity ?? "leve",
      schoolId: incident.schoolId,
      status: incident.status ?? "abierta",
      createdBy: incident.createdBy,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    getStore().incidents.set(record.id, record);
    return { ...record };
  },

  findIncidentById(id) {
    this.init();
    const incident = getStore().incidents.get(id);
    return incident ? { ...incident } : null;
  },

  listIncidents({ teacherId, schoolId, status, severity } = {}) {
    this.init();
    return [...getStore().incidents.values()]
      .filter((i) => {
        if (teacherId && i.teacherId !== teacherId) return false;
        if (schoolId && i.schoolId !== schoolId) return false;
        if (status && i.status !== status) return false;
        if (severity && i.severity !== severity) return false;
        return true;
      })
      .map((i) => ({ ...i }));
  },

  updateIncident(id, data) {
    this.init();
    const incident = getStore().incidents.get(id);
    if (!incident) return null;
    Object.assign(incident, data, { updatedAt: new Date().toISOString() });
    return { ...incident };
  },

  addHistory({ absenceId, action, previousData, newData, changedBy }) {
    const record = {
      id: generateId("ah"),
      absenceId,
      action,
      previousData,
      newData,
      changedBy,
      changedAt: new Date().toISOString()
    };
    getStore().absenceHistory.set(record.id, record);
    return record;
  }
};

export default absencesRepository;