import { getStore } from "../../database/memory-store.mjs";

function generateId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function cloneContents(contents) {
  return (contents ?? []).map((item) => ({ ...item }));
}

function cloneActivities(activities) {
  return (activities ?? []).map((item) => ({ ...item }));
}

function clonePlan(plan) {
  if (!plan) return null;
  return {
    ...plan,
    contents: cloneContents(plan.contents),
    activities: cloneActivities(plan.activities)
  };
}

function cloneEntry(entry) {
  return {
    ...entry,
    changes: (entry.changes ?? []).map((change) => ({ ...change }))
  };
}

const planificacionesRepository = {
  init() {
    const store = getStore();
    if (!store.teacherPlans) {
      store.teacherPlans = new Map();
    }
    if (!store.teacherPlanHistory) {
      store.teacherPlanHistory = new Map();
    }
  },

  createPlan(plan) {
    this.init();
    const record = {
      id: plan.id ?? generateId("tpl"),
      title: plan.title,
      teacherId: plan.teacherId,
      subjectId: plan.subjectId,
      courseId: plan.courseId,
      divisionId: plan.divisionId ?? null,
      year: plan.year,
      period: plan.period ?? null,
      contents: cloneContents(plan.contents),
      activities: cloneActivities(plan.activities),
      observations: plan.observations ?? null,
      status: plan.status ?? "borrador",
      schoolId: plan.schoolId,
      createdBy: plan.createdBy,
      createdAt: new Date().toISOString(),
      updatedBy: plan.createdBy,
      updatedAt: new Date().toISOString(),
      reviewedBy: plan.reviewedBy ?? null,
      reviewedAt: plan.reviewedAt ?? null,
      archivedAt: plan.archivedAt ?? null
    };
    getStore().teacherPlans.set(record.id, record);
    return clonePlan(record);
  },

  findPlanById(id) {
    this.init();
    return clonePlan(getStore().teacherPlans.get(id) ?? null);
  },

  listPlans({ schoolId, teacherId, subjectId, courseId, divisionId, year, period, status } = {}) {
    this.init();
    return [...getStore().teacherPlans.values()]
      .filter((plan) => {
        if (schoolId && plan.schoolId !== schoolId) return false;
        if (teacherId && plan.teacherId !== teacherId) return false;
        if (subjectId && plan.subjectId !== subjectId) return false;
        if (courseId && plan.courseId !== courseId) return false;
        if (divisionId && plan.divisionId !== divisionId) return false;
        if (year && plan.year !== Number(year)) return false;
        if (period && plan.period !== period) return false;
        if (status && plan.status !== status) return false;
        return true;
      })
      .map(clonePlan);
  },

  updatePlan(id, data) {
    this.init();
    const plan = getStore().teacherPlans.get(id);
    if (!plan) return null;
    Object.assign(plan, data, { updatedAt: new Date().toISOString() });
    return clonePlan(plan);
  },

  createHistoryEntry(entry) {
    this.init();
    const record = {
      id: entry.id ?? generateId("hpl"),
      planningId: entry.planningId,
      type: entry.type,
      fromStatus: entry.fromStatus ?? null,
      toStatus: entry.toStatus ?? null,
      changes: (entry.changes ?? []).map((change) => ({ ...change })),
      comment: entry.comment ?? null,
      performedBy: entry.performedBy,
      createdAt: new Date().toISOString()
    };
    getStore().teacherPlanHistory.set(record.id, record);
    return cloneEntry(record);
  },

  listHistoryEntries({ planningId } = {}) {
    this.init();
    const entries = [...getStore().teacherPlanHistory.values()]
      .filter((entry) => (planningId ? entry.planningId === planningId : true))
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

export default planificacionesRepository;
