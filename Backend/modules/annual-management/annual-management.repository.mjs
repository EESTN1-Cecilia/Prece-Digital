import { getStore } from "../../database/memory-store.mjs";

function clone(value) {
  if (Array.isArray(value)) {
    return value.map(clone);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, clone(item)]));
  }

  return value;
}

const annualManagementRepository = {
  init() {
    const store = getStore();
    store.annualManagementPreviews ??= new Map();
    store.annualManagementClosures ??= new Map();
    store.annualManagementSnapshots ??= new Map();
  },

  createPreview(preview) {
    this.init();
    getStore().annualManagementPreviews.set(preview.id, clone(preview));
    return clone(preview);
  },

  findPreview(id) {
    this.init();
    const preview = getStore().annualManagementPreviews.get(id);
    return preview ? clone(preview) : null;
  },

  markPreviewConfirmed(id, closureId) {
    this.init();
    const preview = getStore().annualManagementPreviews.get(id);
    if (!preview) return null;
    preview.confirmedByClosureId = closureId;
    return clone(preview);
  },

  createClosure(closure) {
    this.init();
    const key = this.closureKey(closure.escuelaId, closure.anioActual);
    if (getStore().annualManagementClosures.has(key)) return null;
    getStore().annualManagementClosures.set(key, clone(closure));
    return clone(closure);
  },

  closureKey(escuelaId, anio) {
    return `${escuelaId}:${anio}`;
  },

  findClosure(escuelaId, anio) {
    this.init();
    const closure = getStore().annualManagementClosures.get(this.closureKey(escuelaId, anio));
    return closure ? clone(closure) : null;
  },

  removeClosure(escuelaId, anio) {
    this.init();
    getStore().annualManagementClosures.delete(this.closureKey(escuelaId, anio));
  },

  listClosures(escuelaId) {
    this.init();
    return [...getStore().annualManagementClosures.values()]
      .filter((closure) => closure.escuelaId === escuelaId)
      .sort((a, b) => b.anioActual - a.anioActual)
      .map(clone);
  },

  getSnapshot(escuelaId, anio) {
    this.init();
    const snapshot = getStore().annualManagementSnapshots.get(this.closureKey(escuelaId, anio));
    return snapshot ? clone(snapshot) : null;
  },

  saveSnapshot(snapshot) {
    this.init();
    const key = this.closureKey(snapshot.escuelaId, snapshot.anio);
    if (getStore().annualManagementSnapshots.has(key)) return false;
    getStore().annualManagementSnapshots.set(key, clone(snapshot));
    return true;
  },

  removeSnapshot(escuelaId, anio) {
    this.init();
    getStore().annualManagementSnapshots.delete(this.closureKey(escuelaId, anio));
  }
};

export default annualManagementRepository;
