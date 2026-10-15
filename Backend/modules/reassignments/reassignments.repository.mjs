import { getStore } from "../../database/memory-store.mjs";

function generateId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function clone(obj) {
  return { ...obj };
}

const reassignmentsRepository = {
  init() {
    const store = getStore();
    if (!store.spaceReassignments) store.spaceReassignments = new Map();
    if (!store.reassignmentHistory) store.reassignmentHistory = new Map();
  },

  createReassignment(reassignment) {
    this.init();
    const record = {
      id: reassignment.id ?? generateId("rsa"),
      scheduleAssignmentId: reassignment.scheduleAssignmentId,
      courseId: reassignment.courseId ?? null,
      divisionId: reassignment.divisionId ?? null,
      subjectId: reassignment.subjectId ?? null,
      teacherId: reassignment.teacherId,
      originalSpaceId: reassignment.originalSpaceId,
      newSpaceId: reassignment.newSpaceId,
      date: reassignment.date,
      dayOfWeek: reassignment.dayOfWeek,
      startTime: reassignment.startTime,
      endTime: reassignment.endTime,
      reason: reassignment.reason ?? null,
      availabilityId: reassignment.availabilityId ?? null,
      status: reassignment.status ?? "activa",
      schoolId: reassignment.schoolId,
      createdBy: reassignment.createdBy,
      updatedBy: reassignment.updatedBy ?? reassignment.createdBy,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    getStore().spaceReassignments.set(record.id, record);

    this.addHistory({
      reassignmentId: record.id,
      action: "create",
      previousData: null,
      newData: clone(record),
      changedBy: record.createdBy
    });

    return clone(record);
  },

  findReassignmentById(id) {
    this.init();
    const reassignment = getStore().spaceReassignments.get(id);
    return reassignment ? clone(reassignment) : null;
  },

  
  findActiveByAssignment(scheduleAssignmentId) {
    this.init();
    const reassignment = this.listReassignments({ scheduleAssignmentId, includeInactive: true }).find(
      (r) => r.status === "activa"
    );
    return reassignment ? clone(reassignment) : null;
  },

  listReassignments({
    schoolId,
    scheduleAssignmentId,
    courseId,
    divisionId,
    subjectId,
    teacherId,
    spaceId,
    originalSpaceId,
    newSpaceId,
    date,
    startDate,
    endDate,
    dayOfWeek,
    status,
    includeInactive = false
  } = {}) {
    this.init();
    return [...getStore().spaceReassignments.values()]
      .filter((r) => {
        if (!includeInactive && r.status !== "activa") return false;
        if (schoolId && r.schoolId !== schoolId) return false;
        if (scheduleAssignmentId && r.scheduleAssignmentId !== scheduleAssignmentId) return false;
        if (courseId && r.courseId !== courseId) return false;
        if (divisionId && r.divisionId !== divisionId) return false;
        if (subjectId && r.subjectId !== subjectId) return false;
        if (teacherId && r.teacherId !== teacherId) return false;
        if (spaceId && r.originalSpaceId !== spaceId && r.newSpaceId !== spaceId) return false;
        if (originalSpaceId && r.originalSpaceId !== originalSpaceId) return false;
        if (newSpaceId && r.newSpaceId !== newSpaceId) return false;
        if (date && r.date !== date) return false;
        if (startDate && r.date < startDate) return false;
        if (endDate && r.date > endDate) return false;
        if (dayOfWeek && r.dayOfWeek !== dayOfWeek) return false;
        if (status && r.status !== status) return false;
        return true;
      })
      .map(clone)
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.startTime.localeCompare(b.startTime)));
  },

  updateReassignment(id, data, user) {
    this.init();
    const reassignment = getStore().spaceReassignments.get(id);
    if (!reassignment) return null;
    const previousData = clone(reassignment);
    const updatedBy = user?.id ?? reassignment.updatedBy ?? reassignment.createdBy;
    Object.assign(reassignment, data, { updatedBy, updatedAt: new Date().toISOString() });
    this.addHistory({
      reassignmentId: reassignment.id,
      action: "update",
      previousData,
      newData: clone(reassignment),
      changedBy: updatedBy
    });
    return clone(reassignment);
  },

  setStatus(id, status, user) {
    this.init();
    const reassignment = getStore().spaceReassignments.get(id);
    if (!reassignment) return null;
    const previousData = clone(reassignment);
    const updatedBy = user?.id ?? reassignment.updatedBy ?? reassignment.createdBy;
    Object.assign(reassignment, { status, updatedBy, updatedAt: new Date().toISOString() });
    this.addHistory({
      reassignmentId: reassignment.id,
      action: status === "revertida" ? "revert" : "update",
      previousData,
      newData: clone(reassignment),
      changedBy: updatedBy
    });
    return clone(reassignment);
  },

  addHistory({ reassignmentId, action, previousData, newData, changedBy }) {
    const record = {
      id: generateId("rsh"),
      reassignmentId,
      action,
      previousData,
      newData,
      changedBy,
      changedAt: new Date().toISOString()
    };
    getStore().reassignmentHistory.set(record.id, record);
    return clone(record);
  },

  listHistory(reassignmentId) {
    this.init();
    return [...getStore().reassignmentHistory.values()]
      .filter((h) => (reassignmentId ? h.reassignmentId === reassignmentId : true))
      .sort((a, b) => (a.changedAt < b.changedAt ? -1 : a.changedAt > b.changedAt ? 1 : 0))
      .map(clone);
  }
};

export default reassignmentsRepository;