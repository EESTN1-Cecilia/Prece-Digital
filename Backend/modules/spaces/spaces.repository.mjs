import { getStore } from "../../database/memory-store.mjs";

function generateId(prefix, size) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function cloneSpace(space) {
  return { ...space };
}

const spacesRepository = {
  init() {
    const store = getStore();
    if (!store.spaces) {
      store.spaces = new Map();
    }
    if (!store.buildings) {
      store.buildings = new Map();
    }
    if (!store.careers) {
      store.careers = new Map();
    }
  },

  createBuilding(building) {
    this.init();
    const record = {
      id: building.id ?? generateId("bld", 8),
      name: building.name,
      code: building.code,
      floors: building.floors ?? 1,
      schoolId: building.schoolId,
      isActive: building.isActive ?? true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    getStore().buildings.set(record.id, record);
    return cloneSpace(record);
  },

  findBuildingById(id) {
    this.init();
    const building = getStore().buildings.get(id);
    return building ? cloneSpace(building) : null;
  },

  listBuildings({ schoolId, includeInactive = false } = {}) {
    this.init();
    return [...getStore().buildings.values()]
      .filter((b) => (includeInactive || b.isActive) && (!schoolId || b.schoolId === schoolId))
      .map(cloneSpace);
  },

  updateBuilding(id, data) {
    this.init();
    const building = getStore().buildings.get(id);
    if (!building) return null;
    Object.assign(building, data, { updatedAt: new Date().toISOString() });
    return cloneSpace(building);
  },

  createSpace(space) {
    this.init();
    const status = space.status ?? (space.isActive === false ? "inactivo" : "activo");
    const record = {
      id: space.id ?? generateId("spc", 8),
      name: space.name,
      code: space.code,
      type: space.type,
      capacity: space.capacity ?? 0,
      buildingId: space.buildingId,
      floor: space.floor ?? 1,
      sector: space.sector ?? null,
      location: space.location ?? null,
      hasProjector: space.hasProjector ?? false,
      hasComputers: space.hasComputers ?? false,
      hasWorkshop: space.hasWorkshop ?? false,
      schoolId: space.schoolId,
      isActive: status !== "inactivo",
      status,
      createdBy: space.createdBy ?? null,
      updatedBy: space.updatedBy ?? null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    getStore().spaces.set(record.id, record);
    return cloneSpace(record);
  },

  findSpaceById(id) {
    this.init();
    const space = getStore().spaces.get(id);
    return space ? cloneSpace(space) : null;
  },

  listSpaces({
    schoolId,
    buildingId,
    type,
    status,
    location,
    available,
    minCapacity,
    includeInactive = false
  } = {}) {
    this.init();
    return [...getStore().spaces.values()]
      .filter((s) => {
        if (!includeInactive && !s.isActive) return false;
        if (schoolId && s.schoolId !== schoolId) return false;
        if (buildingId && s.buildingId !== buildingId) return false;
        if (type && s.type !== type) return false;
        if (status && s.status !== status) return false;
        if (location && !`${s.location ?? ""}`.toLowerCase().includes(location.toLowerCase())) return false;
        if (available === "true" && s.status !== "activo") return false;
        if (minCapacity && (s.capacity == null || s.capacity < Number(minCapacity))) return false;
        return true;
      })
      .map(cloneSpace);
  },

  updateSpace(id, data) {
    this.init();
    const space = getStore().spaces.get(id);
    if (!space) return null;
    if (data.status != null) {
      data.isActive = data.status !== "inactivo";
    }
    Object.assign(space, data, { updatedAt: new Date().toISOString() });
    return cloneSpace(space);
  },

  deleteSpace(id, user) {
    this.init();
    const space = getStore().spaces.get(id);
    if (!space) return null;
    space.isActive = false;
    space.status = "inactivo";
    space.updatedBy = user?.id ?? space.updatedBy;
    space.updatedAt = new Date().toISOString();
    return cloneSpace(space);
  },

  createCareer(career) {
    this.init();
    const record = {
      id: career.id ?? generateId("car", 8),
      name: career.name,
      code: career.code,
      duration: career.duration,
      schoolId: career.schoolId,
      isActive: career.isActive ?? true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    getStore().careers.set(record.id, record);
    return cloneSpace(record);
  },

  findCareerById(id) {
    this.init();
    const career = getStore().careers.get(id);
    return career ? cloneSpace(career) : null;
  },

  listCareers({ schoolId, includeInactive = false } = {}) {
    this.init();
    return [...getStore().careers.values()]
      .filter((c) => (includeInactive || c.isActive) && (!schoolId || c.schoolId === schoolId))
      .map(cloneSpace);
  },

  updateCareer(id, data) {
    this.init();
    const career = getStore().careers.get(id);
    if (!career) return null;
    Object.assign(career, data, { updatedAt: new Date().toISOString() });
    return cloneSpace(career);
  }
};

export default spacesRepository;