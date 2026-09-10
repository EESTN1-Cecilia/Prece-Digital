import { getStore } from "../../database/memory-store.mjs";

function generateId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function cloneAbsence(absence) {
  return { ...absence };
}

const absencesRepository = {
  init() {
    const store = getStore();
    if (!store.absences) {
      store.absences = new Map();
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
      startTime: absence.startTime,
      endTime: absence.endTime,
      type: absence.type,
      reason: absence.reason ?? null,
      documented: absence.documented ?? false,
      replacementTeacherId: absence.replacementTeacherId ?? null,
      scheduleAssignmentId: absence.scheduleAssignmentId ?? null,
      schoolId: absence.schoolId,
      status: absence.status ?? "pendiente",
      createdBy: absence.createdBy,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    getStore().absences.set(record.id, record);
    return cloneAbsence(record);
  },

  findAbsenceById(id) {
    this.init();
    const absence = getStore().absences.get(id);
    return absence ? cloneAbsence(absence) : null;
  },

  listAbsences({ teacherId, date, startDate, endDate, schoolId, status, includeInactive = false } = {}) {
    this.init();
    return [...getStore().absences.values()]
      .filter((a) => {
        if (teacherId && a.teacherId !== teacherId) return false;
        if (date && a.date !== date) return false;
        if (startDate && a.date < startDate) return false;
        if (endDate && a.date > endDate) return false;
        if (schoolId && a.schoolId !== schoolId) return false;
        if (status && a.status !== status) return false;
        return true;
      })
      .map(cloneAbsence);
  },

  updateAbsence(id, data) {
    this.init();
    const absence = getStore().absences.get(id);
    if (!absence) return null;
    Object.assign(absence, data, { updatedAt: new Date().toISOString() });
    return cloneAbsence(absence);
  },

  deleteAbsence(id) {
    this.init();
    return getStore().absences.delete(id);
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
  }
};

export default absencesRepository;