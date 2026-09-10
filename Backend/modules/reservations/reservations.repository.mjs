import { getStore } from "../../database/memory-store.mjs";

function generateId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function cloneReservation(reservation) {
  return { ...reservation };
}

const reservationsRepository = {
  init() {
    const store = getStore();
    if (!store.reservations) {
      store.reservations = new Map();
    }
  },

  create(reservation) {
    this.init();
    const record = {
      id: reservation.id ?? generateId("res"),
      ownerId: reservation.ownerId,
      ownerType: reservation.ownerType ?? "user",
      resourceType: reservation.resourceType,
      resourceId: reservation.resourceId,
      date: reservation.date,
      startTime: reservation.startTime,
      endTime: reservation.endTime,
      purpose: reservation.purpose ?? null,
      status: reservation.status ?? "pendiente",
      schoolId: reservation.schoolId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    getStore().reservations.set(record.id, record);
    return cloneReservation(record);
  },

  findById(id) {
    this.init();
    const reservation = getStore().reservations.get(id);
    return reservation ? cloneReservation(reservation) : null;
  },

  list({ schoolId, resourceType, resourceId, date, status, ownerId, includeInactive = false } = {}) {
    this.init();
    return [...getStore().reservations.values()]
      .filter((r) => {
        if (schoolId && r.schoolId !== schoolId) return false;
        if (resourceType && r.resourceType !== resourceType) return false;
        if (resourceId && r.resourceId !== resourceId) return false;
        if (date && r.date !== date) return false;
        if (status && r.status !== status) return false;
        if (ownerId && r.ownerId !== ownerId) return false;
        return true;
      })
      .map(cloneReservation);
  },

  update(id, data) {
    this.init();
    const reservation = getStore().reservations.get(id);
    if (!reservation) return null;
    Object.assign(reservation, data, { updatedAt: new Date().toISOString() });
    return cloneReservation(reservation);
  },

  cancel(id) {
    this.init();
    const reservation = getStore().reservations.get(id);
    if (!reservation) return null;
    reservation.status = "cancelada";
    reservation.cancelledAt = new Date().toISOString();
    reservation.updatedAt = new Date().toISOString();
    return cloneReservation(reservation);
  },

  findOverlap({ resourceType, resourceId, date, startTime, endTime, schoolId, excludeId }) {
    this.init();
    return this.list({ resourceType, resourceId, date, schoolId }).find((r) => {
      if (excludeId && r.id === excludeId) return false;
      if (r.status === "cancelada" || r.status === "rechazada") return false;
      return startTime < r.endTime && endTime > r.startTime;
    }) ?? null;
  }
};

export default reservationsRepository;