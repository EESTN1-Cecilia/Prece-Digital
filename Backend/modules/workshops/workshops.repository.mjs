import { getStore } from "../../database/memory-store.mjs";

function generateId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function cloneWorkshop(workshop) {
  return { ...workshop };
}

const workshopsRepository = {
  init() {
    const store = getStore();
    if (!store.workshops) {
      store.workshops = new Map();
    }
    if (!store.workshopSessions) {
      store.workshopSessions = new Map();
    }
  },

  create(workshop) {
    this.init();
    const record = {
      id: workshop.id ?? generateId("wrk"),
      name: workshop.name,
      code: workshop.code,
      description: workshop.description ?? null,
      careerId: workshop.careerId,
      subjectId: workshop.subjectId ?? null,
      spaceId: workshop.spaceId,
      teacherId: workshop.teacherId,
      capacity: workshop.capacity ?? 0,
      groupType: workshop.groupType ?? "completo",
      schoolId: workshop.schoolId,
      isActive: workshop.isActive ?? true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    getStore().workshops.set(record.id, record);
    return cloneWorkshop(record);
  },

  findById(id) {
    this.init();
    const workshop = getStore().workshops.get(id);
    return workshop ? cloneWorkshop(workshop) : null;
  },

  list({ schoolId, careerId, teacherId, spaceId, includeInactive = false } = {}) {
    this.init();
    return [...getStore().workshops.values()]
      .filter((w) => {
        if (!includeInactive && !w.isActive) return false;
        if (schoolId && w.schoolId !== schoolId) return false;
        if (careerId && w.careerId !== careerId) return false;
        if (teacherId && w.teacherId !== teacherId) return false;
        if (spaceId && w.spaceId !== spaceId) return false;
        return true;
      })
      .map(cloneWorkshop);
  },

  update(id, data) {
    this.init();
    const workshop = getStore().workshops.get(id);
    if (!workshop) return null;
    Object.assign(workshop, data, { updatedAt: new Date().toISOString() });
    return cloneWorkshop(workshop);
  },

  deactivate(id) {
    this.init();
    const workshop = getStore().workshops.get(id);
    if (!workshop) return null;
    workshop.isActive = false;
    workshop.updatedAt = new Date().toISOString();
    return cloneWorkshop(workshop);
  },

  createSession(session) {
    this.init();
    const record = {
      id: session.id ?? generateId("wks"),
      workshopId: session.workshopId,
      date: session.date,
      startTime: session.startTime,
      endTime: session.endTime,
      topic: session.topic ?? null,
      notes: session.notes ?? null,
      status: session.status ?? "programada",
      schoolId: session.schoolId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    getStore().workshopSessions.set(record.id, record);
    return { ...record };
  },

  findSessionById(id) {
    this.init();
    const session = getStore().workshopSessions.get(id);
    return session ? { ...session } : null;
  },

  listSessions({ workshopId, date, startDate, endDate, schoolId, status } = {}) {
    this.init();
    return [...getStore().workshopSessions.values()]
      .filter((s) => {
        if (workshopId && s.workshopId !== workshopId) return false;
        if (date && s.date !== date) return false;
        if (startDate && s.date < startDate) return false;
        if (endDate && s.date > endDate) return false;
        if (schoolId && s.schoolId !== schoolId) return false;
        if (status && s.status !== status) return false;
        return true;
      })
      .map((s) => ({ ...s }));
  },

  updateSession(id, data) {
    this.init();
    const session = getStore().workshopSessions.get(id);
    if (!session) return null;
    Object.assign(session, data, { updatedAt: new Date().toISOString() });
    return { ...session };
  }
};

export default workshopsRepository;