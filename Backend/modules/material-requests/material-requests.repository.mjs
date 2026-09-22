import { getStore } from "../../database/memory-store.mjs";

function generateId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function cloneRequest(request) {
  return {
    ...request,
    items: request.items.map((item) => ({ ...item }))
  };
}

const materialRequestsRepository = {
  init() {
    const store = getStore();
    if (!store.materialRequests) store.materialRequests = new Map();
    if (!store.materialRequestHistory) store.materialRequestHistory = new Map();
  },

  create(request) {
    this.init();
    const ahora = new Date().toISOString();
    const record = {
      id: request.id ?? generateId("mreq"),
      requesterId: request.requesterId,
      schoolId: request.schoolId,
      reason: request.reason,
      observations: request.observations ?? null,
      status: request.status ?? "pendiente",
      items: request.items.map((item) => ({
        id: item.id ?? generateId("mre"),
        itemId: item.itemId,
        name: item.name ?? null,
        quantity: item.quantity,
        approvedQuantity: item.approvedQuantity ?? null,
        observations: item.observations ?? null
      })),
      approvedBy: null,
      approvedAt: null,
      decidedBy: null,
      rejectedBy: null,
      rejectedAt: null,
      rejectionReason: null,
      cancelledBy: null,
      cancelledAt: null,
      cancelReason: null,
      deliveredBy: null,
      deliveredAt: null,
      deliveryMovementIds: [],
      closedBy: null,
      closedAt: null,
      updatedBy: request.requesterId,
      createdAt: ahora,
      updatedAt: ahora
    };
    getStore().materialRequests.set(record.id, record);
    return cloneRequest(record);
  },

  findById(id) {
    this.init();
    const request = getStore().materialRequests.get(id);
    return request ? cloneRequest(request) : null;
  },

  list({ schoolId, requesterId, status, itemId, fromDate, toDate, sort = "desc" } = {}) {
    this.init();
    return [...getStore().materialRequests.values()]
      .filter((r) => {
        if (schoolId && r.schoolId !== schoolId) return false;
        if (requesterId && r.requesterId !== requesterId) return false;
        if (status && r.status !== status) return false;
        if (itemId && !r.items.some((i) => i.itemId === itemId)) return false;
        if (fromDate && r.createdAt < fromDate) return false;
        if (toDate && r.createdAt > toDate) return false;
        return true;
      })
      .map(cloneRequest)
      .sort((a, b) => {
        const diff = a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0;
        return sort === "asc" ? diff : -diff;
      });
  },

  update(id, data) {
    this.init();
    const request = getStore().materialRequests.get(id);
    if (!request) return null;

    Object.assign(request, data, { updatedAt: new Date().toISOString() });
    return cloneRequest(request);
  },

  addHistory({ requestId, fromStatus, toStatus, changedBy, detail }) {
    this.init();
    const record = {
      id: generateId("mrh"),
      requestId,
      fromStatus: fromStatus ?? null,
      toStatus,
      changedBy: changedBy ?? null,
      detail: detail ?? null,
      changedAt: new Date().toISOString()
    };
    getStore().materialRequestHistory.set(record.id, record);
    return { ...record };
  },

  listHistory(requestId) {
    this.init();
    return [...getStore().materialRequestHistory.values()]
      .filter((h) => h.requestId === requestId)
      .sort((a, b) => (a.changedAt < b.changedAt ? -1 : a.changedAt > b.changedAt ? 1 : 0))
      .map((h) => ({ ...h }));
  }
};

export default materialRequestsRepository;