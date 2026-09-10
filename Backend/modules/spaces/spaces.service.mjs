import spacesRepository from "./spaces.repository.mjs";
import { HttpError } from "../../utils/http-error.mjs";

const SPACES_READ = "spaces.read";
const SPACES_WRITE = "spaces.write";
const SPACES_MANAGE = "spaces.manage";

export const SPACE_TYPES = ["aula", "taller", "laboratorio", "otro"];

export const SPACE_STATUS = {
  ACTIVO: "activo",
  INACTIVO: "inactivo",
  EN_MANTENIMIENTO: "en_mantenimiento",
  NO_DISPONIBLE: "no_disponible"
};

function validateRequired(fields, data) {
  for (const field of fields) {
    if (data[field] === undefined || data[field] === null || data[field] === "") {
      throw new HttpError(400, "validation_error", `El campo ${field} es requerido`);
    }
  }
}

function validateType(type) {
  if (!SPACE_TYPES.includes(type)) {
    throw new HttpError(400, "validation_error", `Tipo de espacio inválido. Tipos válidos: ${SPACE_TYPES.join(", ")}`);
  }
}

function validateStatus(status) {
  if (!Object.values(SPACE_STATUS).includes(status)) {
    throw new HttpError(400, "validation_error", `Estado inválido. Estados válidos: ${Object.values(SPACE_STATUS).join(", ")}`);
  }
}

function validateCapacity(capacity) {
  const value = Number(capacity);
  if (!Number.isInteger(value) || value <= 0) {
    throw new HttpError(400, "validation_error", "La capacidad debe ser un número entero mayor a 0");
  }
}

function assertSpaceCodeUnique(code, schoolId, excludeId) {
  const existing = spacesRepository.listSpaces({ schoolId, includeInactive: true }).find(
    (s) => s.code === code && s.id !== excludeId
  );
  if (existing) {
    throw new HttpError(409, "conflict", `Ya existe un espacio con el código "${code}" en la escuela`);
  }
}

const spacesService = {
  createBuilding(data, user) {
    validateRequired(["name", "code", "schoolId"], data);
    const building = spacesRepository.createBuilding({
      ...data,
      createdBy: user.id
    });
    return { statusCode: 201, body: { data: building } };
  },

  getBuilding(id) {
    const building = spacesRepository.findBuildingById(id);
    if (!building) {
      throw new HttpError(404, "not_found", "Edificio no encontrado");
    }
    return { statusCode: 200, body: { data: building } };
  },

  listBuildings(query, user) {
    const buildings = spacesRepository.listBuildings({
      schoolId: user.assignments?.[0]?.schoolId ?? query.schoolId,
      includeInactive: query.includeInactive === "true"
    });
    return { statusCode: 200, body: { data: buildings } };
  },

  updateBuilding(id, data) {
    const building = spacesRepository.updateBuilding(id, data);
    if (!building) {
      throw new HttpError(404, "not_found", "Edificio no encontrado");
    }
    return { statusCode: 200, body: { data: building } };
  },

  createSpace(data, user) {
    validateRequired(["name", "code", "type", "capacity", "schoolId"], data);
    validateType(data.type);
    validateCapacity(data.capacity);
    if (data.status != null) {
      validateStatus(data.status);
    }
    assertSpaceCodeUnique(data.code, data.schoolId);
    const space = spacesRepository.createSpace({
      ...data,
      createdBy: user.id,
      updatedBy: user.id
    });
    return { statusCode: 201, body: { data: space } };
  },

  getSpace(id) {
    const space = spacesRepository.findSpaceById(id);
    if (!space) {
      throw new HttpError(404, "not_found", "Espacio no encontrado");
    }
    return { statusCode: 200, body: { data: space } };
  },

  listSpaces(query, user) {
    const spaces = spacesRepository.listSpaces({
      schoolId: user.assignments?.[0]?.schoolId ?? query.schoolId,
      buildingId: query.buildingId,
      type: query.type,
      status: query.status,
      location: query.location,
      available: query.available,
      minCapacity: query.minCapacity,
      includeInactive: query.includeInactive === "true"
    });
    return { statusCode: 200, body: { data: spaces } };
  },

  updateSpace(id, data, user) {
    if (data.type) {
      validateType(data.type);
    }
    if (data.status != null) {
      validateStatus(data.status);
    }
    if (data.capacity != null) {
      validateCapacity(data.capacity);
    }
    const existing = spacesRepository.findSpaceById(id);
    if (!existing) {
      throw new HttpError(404, "not_found", "Espacio no encontrado");
    }
    assertSpaceCodeUnique(data.code ?? existing.code, data.schoolId ?? existing.schoolId, id);
    const space = spacesRepository.updateSpace(id, {
      ...data,
      updatedBy: user?.id ?? existing.updatedBy
    });
    return { statusCode: 200, body: { data: space } };
  },

  deleteSpace(id, user) {
    const space = spacesRepository.deleteSpace(id, user);
    if (!space) {
      throw new HttpError(404, "not_found", "Espacio no encontrado");
    }
    return { statusCode: 200, body: { data: space } };
  },

  createCareer(data, user) {
    validateRequired(["name", "code", "duration", "schoolId"], data);
    const career = spacesRepository.createCareer({
      ...data,
      createdBy: user.id
    });
    return { statusCode: 201, body: { data: career } };
  },

  getCareer(id) {
    const career = spacesRepository.findCareerById(id);
    if (!career) {
      throw new HttpError(404, "not_found", "Carrera no encontrada");
    }
    return { statusCode: 200, body: { data: career } };
  },

  listCareers(query, user) {
    const careers = spacesRepository.listCareers({
      schoolId: user.assignments?.[0]?.schoolId ?? query.schoolId,
      includeInactive: query.includeInactive === "true"
    });
    return { statusCode: 200, body: { data: careers } };
  },

  updateCareer(id, data) {
    const career = spacesRepository.updateCareer(id, data);
    if (!career) {
      throw new HttpError(404, "not_found", "Carrera no encontrada");
    }
    return { statusCode: 200, body: { data: career } };
  }
};

export default spacesService;