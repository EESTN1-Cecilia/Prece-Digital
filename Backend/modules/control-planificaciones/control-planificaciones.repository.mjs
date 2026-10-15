import { getStore } from "../../database/memory-store.mjs";

function generateId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function cloneContents(contents) {
  return (contents ?? []).map((item) => ({ ...item }));
}

function cloneControl(control) {
  if (!control) return null;
  return { ...control, contents: cloneContents(control.contents) };
}

function cloneEntry(entry) {
  return { ...entry, changes: (entry.changes ?? []).map((change) => ({ ...change })) };
}

const controlPlanificacionesRepository = {
  init() {
    const store = getStore();
    if (!store.planningControls) {
      store.planningControls = new Map();
    }
    if (!store.planningControlHistory) {
      store.planningControlHistory = new Map();
    }
  },

  createControl(control) {
    this.init();
    const record = {
      id: control.id ?? generateId("ctl"),
      planningId: control.planningId,
      teacherId: control.teacherId,
      subjectId: control.subjectId,
      courseId: control.courseId,
      divisionId: control.divisionId ?? null,
      year: control.year,
      period: control.period ?? null,
      designIds: control.designIds ?? [],
      contents: cloneContents(control.contents),
      curriculumMatch: control.curriculumMatch ?? "no_evaluado",
      observations: control.observations ?? null,
      status: control.status ?? "pendiente",
      reviewDate: control.reviewDate,
      reviewedBy: control.reviewedBy,
      schoolId: control.schoolId,
      createdBy: control.createdBy,
      createdAt: new Date().toISOString(),
      updatedBy: control.createdBy,
      updatedAt: new Date().toISOString()
    };
    getStore().planningControls.set(record.id, record);
    return cloneControl(record);
  },

  findControlById(id) {
    this.init();
    return cloneControl(getStore().planningControls.get(id) ?? null);
  },

  listControls({
    schoolId,
    planningId,
    teacherId,
    subjectId,
    courseId,
    divisionId,
    year,
    period,
    status,
    statuses,
    curriculumMatch
  } = {}) {
    this.init();
    return [...getStore().planningControls.values()]
      .filter((control) => {
        if (schoolId && control.schoolId !== schoolId) return false;
        if (planningId && control.planningId !== planningId) return false;
        if (teacherId && control.teacherId !== teacherId) return false;
        if (subjectId && control.subjectId !== subjectId) return false;
        if (courseId && control.courseId !== courseId) return false;
        if (divisionId && control.divisionId !== divisionId) return false;
        if (year && control.year !== Number(year)) return false;
        if (period && control.period !== period) return false;
        if (status && control.status !== status) return false;
        if (statuses && !statuses.includes(control.status)) return false;
        if (curriculumMatch && control.curriculumMatch !== curriculumMatch) return false;
        return true;
      })
      .map(cloneControl);
  },

  updateControl(id, data) {
    this.init();
    const control = getStore().planningControls.get(id);
    if (!control) return null;
    Object.assign(control, data, { updatedAt: new Date().toISOString() });
    return cloneControl(control);
  },

  createHistoryEntry(entry) {
    this.init();
    const record = {
      id: entry.id ?? generateId("chl"),
      controlId: entry.controlId,
      planningId: entry.planningId,
      type: entry.type,
      fromStatus: entry.fromStatus ?? null,
      toStatus: entry.toStatus ?? null,
      changes: (entry.changes ?? []).map((change) => ({ ...change })),
      comment: entry.comment ?? null,
      performedBy: entry.performedBy,
      createdAt: new Date().toISOString()
    };
    getStore().planningControlHistory.set(record.id, record);
    return cloneEntry(record);
  },

  listHistoryEntries({ controlId, planningId } = {}) {
    this.init();
    const entries = [...getStore().planningControlHistory.values()]
      .filter((entry) => {
        if (controlId && entry.controlId !== controlId) return false;
        if (planningId && entry.planningId !== planningId) return false;
        return true;
      })
      .map(cloneEntry);
    return entries
      .map((entry, index) => ({ entry, index }))
      .sort((a, b) => {
        if (a.entry.createdAt !== b.entry.createdAt) {
          return a.entry.createdAt < b.entry.createdAt ? 1 : -1;
        }
        return b.index - a.index;
      })
      .map(({ entry }) => entry);
  }
};

export default controlPlanificacionesRepository;
