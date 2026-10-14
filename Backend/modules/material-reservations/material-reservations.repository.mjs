import { getStore } from "../../database/memory-store.mjs";

function generateId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function cloneItem(item) {
  return { ...item, items: item.items.map((i) => ({ ...i })) };
}

function cloneHistory(entry) {
  return { ...entry, detail: entry.detail ? { ...entry.detail } : null };
}

function combinarPeriodo(reserva) {
  return {
    startAt: new Date(`${reserva.startDate}T${reserva.startTime}`).getTime(),
    endAt: new Date(`${reserva.endDate}T${reserva.endTime}`).getTime()
  };
}

const materialReservationsRepository = {
  init() {
    const store = getStore();
    if (!store.materialReservations) store.materialReservations = new Map();
    if (!store.materialReservationHistory) store.materialReservationHistory = new Map();
  },

  create(reserva) {
    this.init();
    const ahora = new Date().toISOString();
    const { startAt, endAt } = combinarPeriodo(reserva);
    const record = {
      id: reserva.id ?? generateId("mres"),
      ownerId: reserva.ownerId,
      schoolId: reserva.schoolId,
      status: reserva.status ?? "pendiente",
      items: reserva.items.map((i) => ({
        id: i.id ?? generateId("mri"),
        itemId: i.itemId,
        name: i.name,
        quantity: i.quantity
      })),
      reason: reserva.reason,
      observations: reserva.observations ?? null,
      startDate: reserva.startDate,
      endDate: reserva.endDate,
      startTime: reserva.startTime,
      endTime: reserva.endTime,
      startAt: new Date(startAt).toISOString(),
      endAt: new Date(endAt).toISOString(),
      decidedBy: null,
      approvedBy: null,
      approvedAt: null,
      rejectedBy: null,
      rejectedAt: null,
      rejectionReason: null,
      cancelledBy: null,
      cancelledAt: null,
      cancelReason: null,
      activatedBy: null,
      activatedAt: null,
      deliveryMovementIds: [],
      finishedBy: null,
      finishedAt: null,
      createdAt: ahora,
      updatedAt: ahora
    };
    getStore().materialReservations.set(record.id, record);
    return cloneItem(record);
  },

  findById(id) {
    this.init();
    const reserva = getStore().materialReservations.get(id);
    return reserva ? cloneItem(reserva) : null;
  },

  list({ schoolId, ownerId, status, itemId, fromDate, toDate, sort = "asc" } = {}) {
    this.init();
    return [...getStore().materialReservations.values()]
      .filter((r) => {
        if (schoolId && r.schoolId !== schoolId) return false;
        if (ownerId && r.ownerId !== ownerId) return false;
        if (status && r.status !== status) return false;
        if (itemId && !r.items.some((i) => i.itemId === itemId)) return false;
        if (fromDate || toDate) {
          const qStart = new Date(`${fromDate ?? "1970-01-01"}T00:00:00`).getTime();
          const qEnd = new Date(`${toDate ?? "9999-12-31"}T23:59:59.999`).getTime();
          const { startAt, endAt } = combinarPeriodo(r);
          if (!(startAt < qEnd && qStart < endAt)) return false;
        }
        return true;
      })
      .map(cloneItem)
      .sort((a, b) => (sort === "desc" ? b.startAt.localeCompare(a.startAt) : a.startAt.localeCompare(b.startAt)));
  },

  update(id, data) {
    this.init();
    const reserva = getStore().materialReservations.get(id);
    if (!reserva) return null;
    Object.assign(reserva, data, { updatedAt: new Date().toISOString() });
    if (data.startDate || data.endDate || data.startTime || data.endTime) {
      const { startAt, endAt } = combinarPeriodo(reserva);
      reserva.startAt = new Date(startAt).toISOString();
      reserva.endAt = new Date(endAt).toISOString();
    }
    return cloneItem(reserva);
  },

  addHistory(entry) {
    this.init();
    const record = {
      id: entry.id ?? generateId("mrh"),
      reservationId: entry.reservationId,
      fromStatus: entry.fromStatus ?? null,
      toStatus: entry.toStatus,
      userId: entry.userId ?? null,
      action: entry.action,
      detail: entry.detail ?? null,
      createdAt: new Date().toISOString()
    };
    getStore().materialReservationHistory.set(record.id, record);
    return cloneHistory(record);
  },

  listHistory(reservationId) {
    this.init();
    return [...getStore().materialReservationHistory.values()]
      .filter((h) => h.reservationId === reservationId)
      .map(cloneHistory)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  },

  all() {
    this.init();
    return [...getStore().materialReservations.values()].map(cloneItem);
  }
};

export default materialReservationsRepository;