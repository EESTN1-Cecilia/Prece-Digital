import { getStore } from "../../database/memory-store.mjs";

function generateId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function cloneItem(item) {
  return { ...item };
}

const inventoryRepository = {
  init() {
    const store = getStore();
    if (!store.inventoryItems) store.inventoryItems = new Map();
    if (!store.inventoryMovements) store.inventoryMovements = new Map();
    if (!store.inventoryHistory) store.inventoryHistory = new Map();
  },

  createItem(item) {
    this.init();
    const record = {
      id: item.id ?? generateId("inv"),
      name: item.name,
      description: item.description ?? null,
      category: item.category,
      quantity: item.quantity ?? 0,
      minQuantity: item.minQuantity ?? 0,
      unit: item.unit ?? "unidad",
      status: item.status ?? "disponible",
      location: item.location ?? null,
      observations: item.observations ?? null,
      schoolId: item.schoolId,
      createdBy: item.createdBy,
      updatedBy: item.createdBy,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isActive: item.isActive ?? true,
      allowReservation: item.allowReservation ?? true
    };
    getStore().inventoryItems.set(record.id, record);
    return cloneItem(record);
  },

  findItemById(id) {
    this.init();
    const item = getStore().inventoryItems.get(id);
    return item ? cloneItem(item) : null;
  },

  findByDuplicate({ schoolId, name, category }) {
    this.init();
    const normalized = String(name).trim().toLowerCase();
    return [...getStore().inventoryItems.values()].find(
      (i) =>
        i.schoolId === schoolId &&
        i.isActive &&
        i.category === category &&
        String(i.name).trim().toLowerCase() === normalized
    );
  },

  listItems({ schoolId, category, status, location, unit, search, includeInactive = false } = {}) {
    this.init();
    const term = search ? String(search).trim().toLowerCase() : null;
    return [...getStore().inventoryItems.values()]
      .filter((i) => {
        if (!includeInactive && !i.isActive) return false;
        if (schoolId && i.schoolId !== schoolId) return false;
        if (category && i.category !== category) return false;
        if (status && i.status !== status) return false;
        if (location && i.location !== location) return false;
        if (unit && i.unit !== unit) return false;
        if (term) {
          if (!i.name.toLowerCase().includes(term) && !(i.description ?? "").toLowerCase().includes(term)) {
            return false;
          }
        }
        return true;
      })
      .map(cloneItem)
      .sort((a, b) => a.name.localeCompare(b.name));
  },

  listLowStock({ schoolId, includeInactive = false } = {}) {
    this.init();
    return [...getStore().inventoryItems.values()]
      .filter((i) => {
        if (!includeInactive && !i.isActive) return false;
        if (schoolId && i.schoolId !== schoolId) return false;
        const bajo = i.minQuantity > 0 && i.quantity <= i.minQuantity;
        const agotado = i.quantity <= 0;
        return bajo || agotado;
      })
      .map(cloneItem)
      .sort((a, b) => (a.quantity - b.quantity) || a.name.localeCompare(b.name));
  },

  updateItem(id, data, user) {
    this.init();
    const item = getStore().inventoryItems.get(id);
    if (!item) return null;

    const previous = cloneItem(item);
    const updatedBy = user?.id ?? item.updatedBy;

    Object.assign(item, data, { updatedBy, updatedAt: new Date().toISOString() });

    for (const key of Object.keys(data)) {
      if (previous[key] !== item[key]) {
        this.addHistory({
          itemId: item.id,
          field: key,
          previousValue: previous[key] ?? null,
          newValue: item[key] ?? null,
          changedBy: updatedBy
        });
      }
    }

    return cloneItem(item);
  },

  deleteItem(id, user) {
    this.init();
    const item = getStore().inventoryItems.get(id);
    if (!item) return null;
    const previous = cloneItem(item);
    const updatedBy = user?.id ?? item.updatedBy;

    item.isActive = false;
    item.updatedBy = updatedBy;
    item.updatedAt = new Date().toISOString();

    this.addHistory({
      itemId: item.id,
      field: "isActive",
      previousValue: previous.isActive,
      newValue: false,
      changedBy: updatedBy
    });

    return cloneItem(item);
  },

  applyMovement(movement) {
    this.init();
    const item = getStore().inventoryItems.get(movement.itemId);
    if (!item) return null;

    item.quantity = movement.resultingStock;
    item.updatedBy = movement.userId;
    item.updatedAt = new Date().toISOString();

    if (movement.resultingStock <= 0 && item.status === "disponible") {
      item.status = "agotado";
      this.addHistory({
        itemId: item.id,
        field: "status",
        previousValue: "disponible",
        newValue: "agotado",
        changedBy: movement.userId
      });
    } else if (movement.resultingStock > 0 && item.status === "agotado") {
      item.status = "disponible";
      this.addHistory({
        itemId: item.id,
        field: "status",
        previousValue: "agotado",
        newValue: "disponible",
        changedBy: movement.userId
      });
    }

    const record = {
      id: movement.id ?? generateId("inm"),
      itemId: movement.itemId,
      type: movement.type,
      quantity: movement.quantity,
      previousStock: movement.previousStock,
      resultingStock: movement.resultingStock,
      reason: movement.reason ?? null,
      observations: movement.observations ?? null,
      referenceMovementId: movement.referenceMovementId ?? null,
      userId: movement.userId,
      schoolId: movement.schoolId,
      createdAt: new Date().toISOString()
    };

    getStore().inventoryMovements.set(record.id, record);
    return { item: cloneItem(item), movement: { ...record } };
  },

  findMovementById(id) {
    this.init();
    const movement = getStore().inventoryMovements.get(id);
    return movement ? { ...movement } : null;
  },

  listMovements({ itemId, schoolId, type, userId, reason, fromDate, toDate } = {}) {
    this.init();
    const motivo = reason ? String(reason).trim().toLowerCase() : null;
    return [...getStore().inventoryMovements.values()]
      .filter((m) => {
        if (itemId && m.itemId !== itemId) return false;
        if (schoolId && m.schoolId !== schoolId) return false;
        if (type && m.type !== type) return false;
        if (userId && m.userId !== userId) return false;
        if (motivo && !(m.reason ?? "").toLowerCase().includes(motivo)) return false;
        if (fromDate && m.createdAt < fromDate) return false;
        if (toDate && m.createdAt > toDate) return false;
        return true;
      })
      .sort((a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0))
      .map((m) => ({ ...m }));
  },

  verificarStock(itemId) {
    this.init();
    const item = getStore().inventoryItems.get(itemId);
    const movements = this.listMovements({ itemId })
      .sort((a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0));

    let stockCalculado = 0;
    let consistente = true;

    for (const m of movements) {
      if (m.previousStock !== stockCalculado) {
        consistente = false;
        stockCalculado = m.resultingStock;
        continue;
      }
      stockCalculado = m.resultingStock;
    }

    const stockActual = item?.quantity ?? 0;
    if (movements.length > 0 && stockCalculado !== stockActual) {
      consistente = false;
    }
    if (movements.length === 0 && stockActual !== 0) {
      consistente = false;
    }

    return {
      itemId,
      stockActual,
      stockCalculado,
      consistente,
      movimientos: movements.length
    };
  },

  addHistory({ itemId, field, previousValue, newValue, changedBy }) {
    const record = {
      id: generateId("inh"),
      itemId,
      field,
      previousValue,
      newValue,
      changedBy,
      changedAt: new Date().toISOString()
    };
    getStore().inventoryHistory.set(record.id, record);
    return { ...record };
  },

  listHistory({ itemId, schoolId, changedBy, fromDate, toDate } = {}) {
    this.init();
    return [...getStore().inventoryHistory.values()]
      .filter((h) => {
        if (itemId && h.itemId !== itemId) return false;
        if (changedBy && h.changedBy !== changedBy) return false;
        if (fromDate && h.changedAt < fromDate) return false;
        if (toDate && h.changedAt > toDate) return false;
        return true;
      })
      .sort((a, b) => (a.changedAt < b.changedAt ? -1 : a.changedAt > b.changedAt ? 1 : 0))
      .map((h) => ({ ...h }));
  }
};

export default inventoryRepository;