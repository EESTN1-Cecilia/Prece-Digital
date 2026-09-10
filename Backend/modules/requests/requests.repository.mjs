import { getStore } from "../../database/memory-store.mjs";

function generateId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function cloneRequest(request) {
  return { ...request };
}

const requestsRepository = {
  init() {
    const store = getStore();
    if (!store.requests) {
      store.requests = new Map();
    }
    if (!store.requestComments) {
      store.requestComments = new Map();
    }
  },

  create(request) {
    this.init();
    const record = {
      id: request.id ?? generateId("req"),
      title: request.title,
      description: request.description,
      type: request.type,
      priority: request.priority ?? "normal",
      status: request.status ?? "pendiente",
      requesterId: request.requesterId,
      assignedToId: request.assignedToId ?? null,
      spaceId: request.spaceId ?? null,
      itemId: request.itemId ?? null,
      sector: request.sector ?? null,
      schoolId: request.schoolId,
      dueDate: request.dueDate ?? null,
      resolvedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    getStore().requests.set(record.id, record);
    return cloneRequest(record);
  },

  findById(id) {
    this.init();
    const request = getStore().requests.get(id);
    return request ? cloneRequest(request) : null;
  },

  list({ schoolId, type, status, priority, requesterId, assignedToId, sector, includeInactive = false } = {}) {
    this.init();
    return [...getStore().requests.values()]
      .filter((r) => {
        if (schoolId && r.schoolId !== schoolId) return false;
        if (type && r.type !== type) return false;
        if (status && r.status !== status) return false;
        if (priority && r.priority !== priority) return false;
        if (requesterId && r.requesterId !== requesterId) return false;
        if (assignedToId && r.assignedToId !== assignedToId) return false;
        if (sector && r.sector !== sector) return false;
        return true;
      })
      .map(cloneRequest);
  },

  update(id, data) {
    this.init();
    const request = getStore().requests.get(id);
    if (!request) return null;
    if (data.status === "resuelta" || data.status === "cerrada") {
      data.resolvedAt = new Date().toISOString();
    }
    Object.assign(request, data, { updatedAt: new Date().toISOString() });
    return cloneRequest(request);
  },

  addComment(comment) {
    this.init();
    const record = {
      id: comment.id ?? generateId("rqc"),
      requestId: comment.requestId,
      userId: comment.userId,
      content: comment.content,
      createdAt: new Date().toISOString()
    };
    getStore().requestComments.set(record.id, record);
    return { ...record };
  },

  listComments(requestId) {
    this.init();
    return [...getStore().requestComments.values()]
      .filter((c) => c.requestId === requestId)
      .map((c) => ({ ...c }));
  }
};

export default requestsRepository;