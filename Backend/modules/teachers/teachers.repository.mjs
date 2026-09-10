import { getStore } from "../../database/memory-store.mjs";

function generateId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function cloneTeacher(teacher) {
  return { ...teacher };
}

const teachersRepository = {
  init() {
    const store = getStore();
    if (!store.teachers) {
      store.teachers = new Map();
    }
    if (!store.teacherSubjects) {
      store.teacherSubjects = new Map();
    }
  },

  create(teacher) {
    this.init();
    const record = {
      id: teacher.id ?? generateId("tch"),
      userId: teacher.userId,
      firstName: teacher.firstName,
      lastName: teacher.lastName,
      documentNumber: teacher.documentNumber,
      documentType: teacher.documentType ?? "dni",
      email: teacher.email,
      phone: teacher.phone ?? null,
      specializations: teacher.specializations ?? [],
      schoolId: teacher.schoolId,
      isActive: teacher.isActive ?? true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    getStore().teachers.set(record.id, record);
    return cloneTeacher(record);
  },

  findById(id) {
    this.init();
    const teacher = getStore().teachers.get(id);
    return teacher ? cloneTeacher(teacher) : null;
  },

  findByDocument(documentNumber, schoolId) {
    this.init();
    for (const teacher of getStore().teachers.values()) {
      if (teacher.documentNumber === documentNumber && teacher.schoolId === schoolId) {
        return cloneTeacher(teacher);
      }
    }
    return null;
  },

  list({ schoolId, includeInactive = false } = {}) {
    this.init();
    return [...getStore().teachers.values()]
      .filter((t) => (includeInactive || t.isActive) && (!schoolId || t.schoolId === schoolId))
      .map(cloneTeacher);
  },

  update(id, data) {
    this.init();
    const teacher = getStore().teachers.get(id);
    if (!teacher) return null;
    Object.assign(teacher, data, { updatedAt: new Date().toISOString() });
    return cloneTeacher(teacher);
  },

  deactivate(id) {
    this.init();
    const teacher = getStore().teachers.get(id);
    if (!teacher) return null;
    teacher.isActive = false;
    teacher.updatedAt = new Date().toISOString();
    return cloneTeacher(teacher);
  },

  addSubject(teacherId, subjectData) {
    this.init();
    const record = {
      id: generateId("tcs"),
      teacherId,
      subjectId: subjectData.subjectId,
      courseId: subjectData.courseId,
      divisionId: subjectData.divisionId,
      schoolId: subjectData.schoolId,
      isActive: true,
      createdAt: new Date().toISOString()
    };
    getStore().teacherSubjects.set(record.id, record);
    return { ...record };
  },

  removeSubject(assignmentId) {
    this.init();
    const assignment = getStore().teacherSubjects.get(assignmentId);
    if (!assignment) return null;
    assignment.isActive = false;
    return { ...assignment };
  },

  listSubjects({ teacherId, schoolId } = {}) {
    this.init();
    return [...getStore().teacherSubjects.values()]
      .filter((ts) => {
        if (!ts.isActive) return false;
        if (teacherId && ts.teacherId !== teacherId) return false;
        if (schoolId && ts.schoolId !== schoolId) return false;
        return true;
      })
      .map((ts) => ({ ...ts }));
  }
};

export default teachersRepository;