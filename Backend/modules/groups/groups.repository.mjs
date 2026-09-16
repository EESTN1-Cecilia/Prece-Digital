import { getStore } from "../../database/memory-store.mjs";

function generateId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function clone(obj) {
  return { ...obj };
}

const groupsRepository = {
  init() {
    const store = getStore();
    if (!store.groups) store.groups = new Map();
    if (!store.groupMembers) store.groupMembers = new Map();
    if (!store.groupHistory) store.groupHistory = new Map();
  },

  createGroup(group) {
    this.init();
    const record = {
      id: group.id ?? generateId("grp"),
      name: group.name,
      type: group.type,
      courseId: group.courseId ?? null,
      divisionId: group.divisionId ?? null,
      workshopId: group.workshopId ?? null,
      spaceId: group.spaceId ?? null,
      scheduleId: group.scheduleId ?? null,
      status: group.status ?? "activo",
      description: group.description ?? null,
      observations: group.observations ?? null,
      schoolId: group.schoolId,
      createdBy: group.createdBy,
      updatedBy: group.updatedBy ?? group.createdBy,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    getStore().groups.set(record.id, record);

    this.addHistory({
      groupId: record.id,
      action: "create",
      previousData: null,
      newData: clone(record),
      changedBy: record.createdBy
    });

    return clone(record);
  },

  findGroupById(id) {
    this.init();
    const group = getStore().groups.get(id);
    return group ? clone(group) : null;
  },

  listGroups({
    schoolId,
    type,
    courseId,
    divisionId,
    workshopId,
    spaceId,
    scheduleId,
    status,
    includeInactive = false
  } = {}) {
    this.init();
    return [...getStore().groups.values()]
      .filter((g) => {
        if (!includeInactive && g.status !== "activo") return false;
        if (schoolId && g.schoolId !== schoolId) return false;
        if (type && g.type !== type) return false;
        if (courseId && g.courseId !== courseId) return false;
        if (divisionId && g.divisionId !== divisionId) return false;
        if (workshopId && g.workshopId !== workshopId) return false;
        if (spaceId && g.spaceId !== spaceId) return false;
        if (scheduleId && g.scheduleId !== scheduleId) return false;
        if (status && g.status !== status) return false;
        return true;
      })
      .map(clone)
      .sort((a, b) => a.name.localeCompare(b.name));
  },

  updateGroup(id, data, user) {
    this.init();
    const group = getStore().groups.get(id);
    if (!group) return null;
    const previousData = clone(group);
    const updatedBy = user?.id ?? group.updatedBy ?? group.createdBy;
    Object.assign(group, data, { updatedBy, updatedAt: new Date().toISOString() });
    this.addHistory({
      groupId: group.id,
      action: "update",
      previousData,
      newData: clone(group),
      changedBy: updatedBy
    });
    return clone(group);
  },

  setGroupStatus(id, status, user) {
    this.init();
    const group = getStore().groups.get(id);
    if (!group) return null;
    const previousData = clone(group);
    const updatedBy = user?.id ?? group.updatedBy ?? group.createdBy;
    Object.assign(group, { status, updatedBy, updatedAt: new Date().toISOString() });
    this.addHistory({
      groupId: group.id,
      action: status,
      previousData,
      newData: clone(group),
      changedBy: updatedBy
    });
    return clone(group);
  },

  addMember({ groupId, studentId, schoolId, createdBy }) {
    this.init();
    const existing = [...getStore().groupMembers.values()].find(
      (m) => m.groupId === groupId && m.studentId === studentId
    );
    if (existing) {
      if (!existing.isActive) {
        existing.isActive = true;
        existing.removedBy = null;
        existing.removedAt = null;
        Object.assign(existing, {
          updatedBy: createdBy,
          updatedAt: new Date().toISOString()
        });
        this.addHistory({
          groupId,
          action: "member_added",
          previousData: null,
          newData: { groupId, studentId },
          changedBy: createdBy
        });
        return clone(existing);
      }
      return null;
    }

    const record = {
      id: generateId("gmb"),
      groupId,
      studentId,
      schoolId,
      isActive: true,
      createdBy,
      updatedBy: createdBy,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      removedBy: null,
      removedAt: null
    };
    getStore().groupMembers.set(record.id, record);
    this.addHistory({
      groupId,
      action: "member_added",
      previousData: null,
      newData: { groupId, studentId },
      changedBy: createdBy
    });
    return clone(record);
  },

  removeMember(groupId, studentId, user) {
    this.init();
    const membership = [...getStore().groupMembers.values()].find(
      (m) => m.groupId === groupId && m.studentId === studentId && m.isActive
    );
    if (!membership) return null;
    membership.isActive = false;
    membership.removedBy = user?.id ?? null;
    membership.removedAt = new Date().toISOString();
    membership.updatedAt = new Date().toISOString();
    this.addHistory({
      groupId,
      action: "member_removed",
      previousData: { groupId, studentId },
      newData: null,
      changedBy: user?.id ?? null
    });
    return clone(membership);
  },

  listMembers({ groupId, studentId, schoolId, includeInactive = false } = {}) {
    this.init();
    return [...getStore().groupMembers.values()]
      .filter((m) => {
        if (!includeInactive && !m.isActive) return false;
        if (groupId && m.groupId !== groupId) return false;
        if (studentId && m.studentId !== studentId) return false;
        if (schoolId && m.schoolId !== schoolId) return false;
        return true;
      })
      .map(clone);
  },

  listMemberStudentIds(groupId) {
    return this.listMembers({ groupId })
      .filter((m) => m.isActive)
      .map((m) => m.studentId);
  },

  listGroupsForStudent(studentId, { schoolId, includeInactive = false } = {}) {
    this.init();
    const memberships = this.listMembers({ studentId, schoolId, includeInactive }).filter((m) => m.isActive);
    const groupIds = [...new Set(memberships.map((m) => m.groupId))];
    return groupIds
      .map((id) => getStore().groups.get(id))
      .filter(Boolean)
      .map(clone);
  },

  countMembers(groupId) {
    return this.listMembers({ groupId }).filter((m) => m.isActive).length;
  },

  addHistory({ groupId, action, previousData, newData, changedBy }) {
    const record = {
      id: generateId("gh"),
      groupId,
      action,
      previousData,
      newData,
      changedBy,
      changedAt: new Date().toISOString()
    };
    getStore().groupHistory.set(record.id, record);
    return clone(record);
  },

  listHistory(groupId) {
    this.init();
    return [...getStore().groupHistory.values()]
      .filter((h) => (groupId ? h.groupId === groupId : true))
      .sort((a, b) => (a.changedAt < b.changedAt ? -1 : a.changedAt > b.changedAt ? 1 : 0))
      .map(clone);
  }
};

export default groupsRepository;