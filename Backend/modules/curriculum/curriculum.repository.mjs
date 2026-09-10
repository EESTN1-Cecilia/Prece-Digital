import { getStore } from "../../database/memory-store.mjs";

function generateId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function cloneItem(item) {
  return { ...item };
}

const curriculumRepository = {
  init() {
    const store = getStore();
    if (!store.curriculumAreas) {
      store.curriculumAreas = new Map();
    }
    if (!store.curriculumPlans) {
      store.curriculumPlans = new Map();
    }
    if (!store.curriculumActivities) {
      store.curriculumActivities = new Map();
    }
  },

  createArea(area) {
    this.init();
    const record = {
      id: area.id ?? generateId("car"),
      name: area.name,
      code: area.code,
      description: area.description ?? null,
      responsibleId: area.responsibleId ?? null,
      schoolId: area.schoolId,
      isActive: area.isActive ?? true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    getStore().curriculumAreas.set(record.id, record);
    return cloneItem(record);
  },

  findAreaById(id) {
    this.init();
    const area = getStore().curriculumAreas.get(id);
    return area ? cloneItem(area) : null;
  },

  listAreas({ schoolId, responsibleId, includeInactive = false } = {}) {
    this.init();
    return [...getStore().curriculumAreas.values()]
      .filter((a) => {
        if (!includeInactive && !a.isActive) return false;
        if (schoolId && a.schoolId !== schoolId) return false;
        if (responsibleId && a.responsibleId !== responsibleId) return false;
        return true;
      })
      .map(cloneItem);
  },

  updateArea(id, data) {
    this.init();
    const area = getStore().curriculumAreas.get(id);
    if (!area) return null;
    Object.assign(area, data, { updatedAt: new Date().toISOString() });
    return cloneItem(area);
  },

  createPlan(plan) {
    this.init();
    const record = {
      id: plan.id ?? generateId("cpl"),
      title: plan.title,
      areaId: plan.areaId,
      description: plan.description ?? null,
      startDate: plan.startDate,
      endDate: plan.endDate,
      objectives: plan.objectives ?? [],
      status: plan.status ?? "borrador",
      schoolId: plan.schoolId,
      createdBy: plan.createdBy,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    getStore().curriculumPlans.set(record.id, record);
    return cloneItem(record);
  },

  findPlanById(id) {
    this.init();
    const plan = getStore().curriculumPlans.get(id);
    return plan ? cloneItem(plan) : null;
  },

  listPlans({ schoolId, areaId, status } = {}) {
    this.init();
    return [...getStore().curriculumPlans.values()]
      .filter((p) => {
        if (schoolId && p.schoolId !== schoolId) return false;
        if (areaId && p.areaId !== areaId) return false;
        if (status && p.status !== status) return false;
        return true;
      })
      .map(cloneItem);
  },

  updatePlan(id, data) {
    this.init();
    const plan = getStore().curriculumPlans.get(id);
    if (!plan) return null;
    Object.assign(plan, data, { updatedAt: new Date().toISOString() });
    return cloneItem(plan);
  },

  createActivity(activity) {
    this.init();
    const record = {
      id: activity.id ?? generateId("cat"),
      planId: activity.planId,
      title: activity.title,
      description: activity.description ?? null,
      type: activity.type ?? "actividad",
      scheduledDate: activity.scheduledDate ?? null,
      completedDate: activity.completedDate ?? null,
      status: activity.status ?? "pendiente",
      notes: activity.notes ?? null,
      createdBy: activity.createdBy,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    getStore().curriculumActivities.set(record.id, record);
    return cloneItem(record);
  },

  findActivityById(id) {
    this.init();
    const activity = getStore().curriculumActivities.get(id);
    return activity ? cloneItem(activity) : null;
  },

  listActivities({ planId, status, type } = {}) {
    this.init();
    return [...getStore().curriculumActivities.values()]
      .filter((a) => {
        if (planId && a.planId !== planId) return false;
        if (status && a.status !== status) return false;
        if (type && a.type !== type) return false;
        return true;
      })
      .map(cloneItem);
  },

  updateActivity(id, data) {
    this.init();
    const activity = getStore().curriculumActivities.get(id);
    if (!activity) return null;
    if (data.status === "completada" && !activity.completedDate) {
      data.completedDate = new Date().toISOString();
    }
    Object.assign(activity, data, { updatedAt: new Date().toISOString() });
    return cloneItem(activity);
  }
};

export default curriculumRepository;