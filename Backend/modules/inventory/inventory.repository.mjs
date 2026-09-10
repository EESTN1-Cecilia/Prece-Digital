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
    if (!store.inventoryItems) {
      store.inventoryItems = new Map();
    }
    if (!store.inventoryMovements) {
      store.inventoryMovements = new Map();
    }
  },

  createItem(item) {
    this.init();
    const record = {
      id: item.id ?? generateId("inv"),
      name: item.name,
      code: item.code,
      description: item.description ?? null,
      category: item.category,
      brand: item.brand ?? null,
      model: item.model ?? null,
      serialNumber: item.serialNumber ?? null,
      quantity: item.quantity ?? 0,
      minQuantity: item.minQuantity ?? 0,
      unit: item.unit ?? "unidad",
      location: item.location ?? null,
      spaceId: item.spaceId ?? null,
      status: item.status ?? "disponible",
      schoolId: item.schoolId,
      isActive: item.isActive ?? true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    getStore().inventoryItems.set(record.id, record);
    return cloneItem(record);
  },

  findItemById(id) {
    this.init();
    const item = getStore().inventoryItems.get(id);
    return item ? cloneItem(item) : null;
  },

  listItems({ schoolId, category, spaceId, status, includeInactive = false } = {}) {
    this.init();
    return [...getStore().inventoryItems.values()]
      .filter((i) => {
        if (!includeInactive && !i.isActive) return false;
        if (schoolId && i.schoolId !== schoolId) return false;
        if (category && i.category !== category) return false;
        if (spaceId && i.spaceId !== spaceId) return false;
        if (status && i.status !== status) return false;
        return true;
      })
      .map(cloneItem);
  },

  updateItem(id, data) {
    this.init();
    const item = getStore().inventoryItems.get(id);
    if (!item) return null;
    Object.assign(item, data, { updatedAt: new Date().toISOString() });
    return cloneItem(item);
  },

  deleteItem(id) {
    this.init();
    const item = getStore().inventoryItems.get(id);
    if (!item) return null;
    item.isActive = false;
    item.updatedAt = new Date().toISOString();
    return cloneItem(item);
  },

  createMovement(movement) {
    this.init();
    const record = {
      id: movement.id ?? generateId("inm"),
      itemId: movement.itemId,
      type: movement.type,
      quantity: movement.quantity,
      fromSpaceId: movement.fromSpaceId ?? null,
      toSpaceId: movement.toSpaceId ?? null,
      notes: movement.notes ?? null,
      schoolId: movement.schoolId,
      createdBy: movement.createdBy,
      createdAt: new Date().toISOString()
    };
    getStore().inventoryMovements.set(record.id, record);
    return { ...record };
  },

  listMovements({ itemId, schoolId, type, startDate, endDate } = {}) {
    this.init();
    return [...getStore().inventoryMovements.values()]
      .filter((m) => {
        if (itemId && m.itemId !== itemId) return false;
        if (schoolId && m.schoolId !== schoolId) return false;
        if (type && m.type !== type) return false;
        if (startDate && m.createdAt < startDate) return false;
        if (endDate && m.createdAt > endDate) return false;
        return true;
      })
      .map((m) => ({ ...m }));
  }
};

export default inventoryRepository;