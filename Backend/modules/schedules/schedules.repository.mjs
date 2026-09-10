import { getStore } from "../../database/memory-store.mjs";

function generateId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function cloneSchedule(schedule) {
  return { ...schedule };
}

const schedulesRepository = {
  init() {
    const store = getStore();
    if (!store.shifts) {
      store.shifts = new Map();
    }
    if (!store.timeSlots) {
      store.timeSlots = new Map();
    }
    if (!store.schedules) {
      store.schedules = new Map();
    }
    if (!store.scheduleAssignments) {
      store.scheduleAssignments = new Map();
    }
  },

  createShift(shift) {
    this.init();
    const record = {
      id: shift.id ?? generateId("shf"),
      name: shift.name,
      code: shift.code,
      startTime: shift.startTime,
      endTime: shift.endTime,
      schoolId: shift.schoolId,
      isActive: shift.isActive ?? true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    getStore().shifts.set(record.id, record);
    return cloneSchedule(record);
  },

  findShiftById(id) {
    this.init();
    const shift = getStore().shifts.get(id);
    return shift ? cloneSchedule(shift) : null;
  },

  listShifts({ schoolId, includeInactive = false } = {}) {
    this.init();
    return [...getStore().shifts.values()]
      .filter((s) => (includeInactive || s.isActive) && (!schoolId || s.schoolId === schoolId))
      .map(cloneSchedule);
  },

  updateShift(id, data) {
    this.init();
    const shift = getStore().shifts.get(id);
    if (!shift) return null;
    Object.assign(shift, data, { updatedAt: new Date().toISOString() });
    return cloneSchedule(shift);
  },

  createTimeSlot(timeSlot) {
    this.init();
    const record = {
      id: timeSlot.id ?? generateId("tsl"),
      name: timeSlot.name,
      dayOfWeek: timeSlot.dayOfWeek,
      startTime: timeSlot.startTime,
      endTime: timeSlot.endTime,
      shiftId: timeSlot.shiftId,
      schoolId: timeSlot.schoolId,
      isActive: timeSlot.isActive ?? true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    getStore().timeSlots.set(record.id, record);
    return cloneSchedule(record);
  },

  findTimeSlotById(id) {
    this.init();
    const timeSlot = getStore().timeSlots.get(id);
    return timeSlot ? cloneSchedule(timeSlot) : null;
  },

  listTimeSlots({ schoolId, shiftId, dayOfWeek, includeInactive = false } = {}) {
    this.init();
    return [...getStore().timeSlots.values()]
      .filter((ts) => {
        if (!includeInactive && !ts.isActive) return false;
        if (schoolId && ts.schoolId !== schoolId) return false;
        if (shiftId && ts.shiftId !== shiftId) return false;
        if (dayOfWeek && ts.dayOfWeek !== dayOfWeek) return false;
        return true;
      })
      .map(cloneSchedule);
  },

  updateTimeSlot(id, data) {
    this.init();
    const timeSlot = getStore().timeSlots.get(id);
    if (!timeSlot) return null;
    Object.assign(timeSlot, data, { updatedAt: new Date().toISOString() });
    return cloneSchedule(timeSlot);
  },

  createSchedule(schedule) {
    this.init();
    const record = {
      id: schedule.id ?? generateId("sch"),
      name: schedule.name,
      year: schedule.year,
      period: schedule.period,
      startDate: schedule.startDate,
      endDate: schedule.endDate,
      schoolId: schedule.schoolId,
      isActive: schedule.isActive ?? true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    getStore().schedules.set(record.id, record);
    return cloneSchedule(record);
  },

  findScheduleById(id) {
    this.init();
    const schedule = getStore().schedules.get(id);
    return schedule ? cloneSchedule(schedule) : null;
  },

  listSchedules({ schoolId, year, includeInactive = false } = {}) {
    this.init();
    return [...getStore().schedules.values()]
      .filter((s) => {
        if (!includeInactive && !s.isActive) return false;
        if (schoolId && s.schoolId !== schoolId) return false;
        if (year && s.year !== year) return false;
        return true;
      })
      .map(cloneSchedule);
  },

  updateSchedule(id, data) {
    this.init();
    const schedule = getStore().schedules.get(id);
    if (!schedule) return null;
    Object.assign(schedule, data, { updatedAt: new Date().toISOString() });
    return cloneSchedule(schedule);
  },

  createAssignment(assignment) {
    this.init();
    const record = {
      id: assignment.id ?? generateId("sca"),
      scheduleId: assignment.scheduleId,
      timeSlotId: assignment.timeSlotId ?? null,
      dayOfWeek: assignment.dayOfWeek,
      startTime: assignment.startTime,
      endTime: assignment.endTime,
      spaceId: assignment.spaceId,
      subjectId: assignment.subjectId,
      teacherId: assignment.teacherId,
      courseId: assignment.courseId,
      divisionId: assignment.divisionId,
      shiftId: assignment.shiftId ?? null,
      schoolId: assignment.schoolId,
      isActive: assignment.isActive ?? true,
      createdBy: assignment.createdBy ?? null,
      updatedBy: assignment.updatedBy ?? null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    getStore().scheduleAssignments.set(record.id, record);
    return cloneSchedule(record);
  },

  findAssignmentById(id) {
    this.init();
    const assignment = getStore().scheduleAssignments.get(id);
    return assignment ? cloneSchedule(assignment) : null;
  },

  listAssignments({
    scheduleId,
    timeSlotId,
    spaceId,
    teacherId,
    courseId,
    subjectId,
    dayOfWeek,
    shiftId,
    schoolId,
    includeInactive = false
  } = {}) {
    this.init();
    return [...getStore().scheduleAssignments.values()]
      .filter((a) => {
        if (!includeInactive && !a.isActive) return false;
        if (scheduleId && a.scheduleId !== scheduleId) return false;
        if (timeSlotId && a.timeSlotId !== timeSlotId) return false;
        if (spaceId && a.spaceId !== spaceId) return false;
        if (teacherId && a.teacherId !== teacherId) return false;
        if (courseId && a.courseId !== courseId) return false;
        if (subjectId && a.subjectId !== subjectId) return false;
        if (dayOfWeek && a.dayOfWeek !== dayOfWeek) return false;
        if (shiftId && a.shiftId !== shiftId) return false;
        if (schoolId && a.schoolId !== schoolId) return false;
        return true;
      })
      .map(cloneSchedule);
  },

  updateAssignment(id, data) {
    this.init();
    const assignment = getStore().scheduleAssignments.get(id);
    if (!assignment) return null;
    Object.assign(assignment, data, { updatedAt: new Date().toISOString() });
    return cloneSchedule(assignment);
  },

  deleteAssignment(id) {
    this.init();
    const assignment = getStore().scheduleAssignments.get(id);
    if (!assignment) return null;
    assignment.isActive = false;
    assignment.updatedAt = new Date().toISOString();
    return cloneSchedule(assignment);
  }
};

export default schedulesRepository;