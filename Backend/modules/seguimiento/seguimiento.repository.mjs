import { getStore } from "../../database/memory-store.mjs";

function generateId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function cloneItem(item) {
  return { ...item };
}

const seguimientoRepository = {
  init() {
    const store = getStore();
    if (!store.curriculumSubjects) {
      store.curriculumSubjects = new Map();
    }
    if (!store.curriculumDesigns) {
      store.curriculumDesigns = new Map();
    }
    if (!store.curriculumContents) {
      store.curriculumContents = new Map();
    }
    if (!store.curriculumTrackings) {
      store.curriculumTrackings = new Map();
    }
    if (!store.curriculumTrackingHistory) {
      store.curriculumTrackingHistory = new Map();
    }
  },

  createSubject(subject) {
    this.init();
    const record = {
      id: subject.id ?? generateId("mat"),
      name: subject.name,
      code: subject.code,
      description: subject.description ?? null,
      schoolId: subject.schoolId,
      isActive: subject.isActive ?? true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    getStore().curriculumSubjects.set(record.id, record);
    return cloneItem(record);
  },

  findSubjectById(id) {
    this.init();
    const subject = getStore().curriculumSubjects.get(id);
    return subject ? cloneItem(subject) : null;
  },

  listSubjects({ schoolId, includeInactive = false } = {}) {
    this.init();
    return [...getStore().curriculumSubjects.values()]
      .filter((s) => {
        if (!includeInactive && !s.isActive) return false;
        if (schoolId && s.schoolId !== schoolId) return false;
        return true;
      })
      .map(cloneItem);
  },

  updateSubject(id, data) {
    this.init();
    const subject = getStore().curriculumSubjects.get(id);
    if (!subject) return null;
    Object.assign(subject, data, { updatedAt: new Date().toISOString() });
    return cloneItem(subject);
  },

  createDesign(design) {
    this.init();
    const record = {
      id: design.id ?? generateId("dcr"),
      subjectId: design.subjectId,
      year: design.year,
      courseId: design.courseId,
      divisionId: design.divisionId ?? null,
      name: design.name,
      description: design.description ?? null,
      objectives: design.objectives ?? [],
      status: design.status ?? "borrador",
      schoolId: design.schoolId,
      createdBy: design.createdBy,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    getStore().curriculumDesigns.set(record.id, record);
    return cloneItem(record);
  },

  findDesignById(id) {
    this.init();
    const design = getStore().curriculumDesigns.get(id);
    return design ? cloneItem(design) : null;
  },

  listDesigns({ schoolId, subjectId, courseId, year, status, includeInactive = false } = {}) {
    this.init();
    return [...getStore().curriculumDesigns.values()]
      .filter((d) => {
        if (!includeInactive && d.status === "archivado") return false;
        if (schoolId && d.schoolId !== schoolId) return false;
        if (subjectId && d.subjectId !== subjectId) return false;
        if (courseId && d.courseId !== courseId) return false;
        if (year && d.year !== Number(year)) return false;
        if (status && d.status !== status) return false;
        return true;
      })
      .map(cloneItem);
  },

  updateDesign(id, data) {
    this.init();
    const design = getStore().curriculumDesigns.get(id);
    if (!design) return null;
    Object.assign(design, data, { updatedAt: new Date().toISOString() });
    return cloneItem(design);
  },

  createContent(content) {
    this.init();
    const record = {
      id: content.id ?? generateId("cnt"),
      designId: content.designId,
      name: content.name,
      description: content.description ?? null,
      teacherId: content.teacherId ?? null,
      order: content.order ?? null,
      status: content.status ?? "no_iniciado",
      progress: content.progress ?? 0,
      schoolId: content.schoolId,
      createdBy: content.createdBy,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    getStore().curriculumContents.set(record.id, record);
    return cloneItem(record);
  },

  findContentById(id) {
    this.init();
    const content = getStore().curriculumContents.get(id);
    return content ? cloneItem(content) : null;
  },

  listContents({ designId, teacherId, status, statuses, schoolId } = {}) {
    this.init();
    return [...getStore().curriculumContents.values()]
      .filter((c) => {
        if (designId && c.designId !== designId) return false;
        if (teacherId && c.teacherId !== teacherId) return false;
        if (status && c.status !== status) return false;
        if (statuses && !statuses.includes(c.status)) return false;
        if (schoolId && c.schoolId !== schoolId) return false;
        return true;
      })
      .map(cloneItem);
  },

  updateContent(id, data) {
    this.init();
    const content = getStore().curriculumContents.get(id);
    if (!content) return null;
    Object.assign(content, data, { updatedAt: new Date().toISOString() });
    return cloneItem(content);
  },

  createTracking(tracking) {
    this.init();
    const record = {
      id: tracking.id ?? generateId("seg"),
      contentId: tracking.contentId,
      status: tracking.status,
      progress: tracking.progress,
      note: tracking.note ?? null,
      date: tracking.date,
      schoolId: tracking.schoolId,
      createdBy: tracking.createdBy,
      createdAt: new Date().toISOString(),
      updatedBy: tracking.updatedBy ?? tracking.createdBy,
      updatedAt: new Date().toISOString()
    };
    getStore().curriculumTrackings.set(record.id, record);
    return cloneItem(record);
  },

  findTrackingById(id) {
    this.init();
    const tracking = getStore().curriculumTrackings.get(id);
    return tracking ? cloneItem(tracking) : null;
  },

  listTrackings({ contentId, status, schoolId } = {}) {
    this.init();
    return [...getStore().curriculumTrackings.values()]
      .filter((t) => {
        if (contentId && t.contentId !== contentId) return false;
        if (status && t.status !== status) return false;
        if (schoolId && t.schoolId !== schoolId) return false;
        return true;
      })
      .map(cloneItem)
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.createdAt.localeCompare(b.createdAt)));
  },

  updateTracking(id, data) {
    this.init();
    const tracking = getStore().curriculumTrackings.get(id);
    if (!tracking) return null;
    Object.assign(tracking, data, { updatedAt: new Date().toISOString() });
    return cloneItem(tracking);
  },

  createHistoryEntry(entry) {
    this.init();
    const record = {
      id: entry.id ?? generateId("sgh"),
      contentId: entry.contentId,
      trackingId: entry.trackingId ?? null,
      type: entry.type,
      status: entry.status,
      progress: entry.progress,
      note: entry.note ?? null,
      date: entry.date,
      performedBy: entry.performedBy,
      createdAt: new Date().toISOString()
    };
    getStore().curriculumTrackingHistory.set(record.id, record);
    return cloneItem(record);
  },

  listHistoryEntries({ contentId } = {}) {
    this.init();
    return [...getStore().curriculumTrackingHistory.values()]
      .filter((h) => (contentId ? h.contentId === contentId : true))
      .map(cloneItem)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));
  }
};

export default seguimientoRepository;