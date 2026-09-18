import inventoryRepository from "./inventory.repository.mjs";
import { errorHttp } from "../../utils/api-error.mjs";

function validateRequired(fields, data) {
  for (const field of fields) {
    if (!data[field]) {
      throw errorHttp(422, "VALIDATION_ERROR", `El campo ${field} es requerido`);
    }
  }
}

const inventoryService = {
  createItem(data, user) {
    validateRequired(["name", "code", "category", "schoolId"], data);
    const validCategories = ["mobiliario", "equipamiento", "material", "herramienta", "tecnologia", "otro"];
    if (!validCategories.includes(data.category)) {
      throw errorHttp(422, "VALIDATION_ERROR", `Categoría inválida. Categorías válidas: ${validCategories.join(", ")}`);
    }
    const item = inventoryRepository.createItem({
      ...data,
      createdBy: user.id
    });
    return { statusCode: 201, body: { data: item } };
  },

  getItem(id) {
    const item = inventoryRepository.findItemById(id);
    if (!item) {
      throw errorHttp(404, "NOT_FOUND", "Item no encontrado");
    }
    return { statusCode: 200, body: { data: item } };
  },

  listItems(query, user) {
    const items = inventoryRepository.listItems({
      schoolId: user.assignments?.[0]?.schoolId ?? query.schoolId,
      category: query.category,
      spaceId: query.spaceId,
      status: query.status,
      includeInactive: query.includeInactive === "true"
    });
    return { statusCode: 200, body: { data: items } };
  },

  updateItem(id, data) {
    if (data.category) {
      const validCategories = ["mobiliario", "equipamiento", "material", "herramienta", "tecnologia", "otro"];
      if (!validCategories.includes(data.category)) {
        throw errorHttp(422, "VALIDATION_ERROR", `Categoría inválida. Categorías válidas: ${validCategories.join(", ")}`);
      }
    }
    if (data.status) {
      const validStatuses = ["disponible", "en_uso", "mantenimiento", "dado_de_baja"];
      if (!validStatuses.includes(data.status)) {
        throw errorHttp(422, "VALIDATION_ERROR", `Estado inválido. Estados válidos: ${validStatuses.join(", ")}`);
      }
    }
    const item = inventoryRepository.updateItem(id, data);
    if (!item) {
      throw errorHttp(404, "NOT_FOUND", "Item no encontrado");
    }
    return { statusCode: 200, body: { data: item } };
  },

  deleteItem(id) {
    const item = inventoryRepository.deleteItem(id);
    if (!item) {
      throw errorHttp(404, "NOT_FOUND", "Item no encontrado");
    }
    return { statusCode: 200, body: { data: item } };
  },

  createMovement(data, user) {
    validateRequired(["itemId", "type", "quantity", "schoolId"], data);
    const validTypes = ["ingreso", "egreso", "transferencia", "ajuste"];
    if (!validTypes.includes(data.type)) {
      throw errorHttp(422, "VALIDATION_ERROR", `Tipo de movimiento inválido. Tipos válidos: ${validTypes.join(", ")}`);
    }
    const item = inventoryRepository.findItemById(data.itemId);
    if (!item) {
      throw errorHttp(404, "NOT_FOUND", "Item no encontrado");
    }
    if (data.type === "egreso" && item.quantity < data.quantity) {
      throw errorHttp(422, "VALIDATION_ERROR", "Stock insuficiente para el egreso");
    }
    const newQuantity = data.type === "ingreso" 
      ? item.quantity + data.quantity 
      : data.type === "egreso" 
        ? item.quantity - data.quantity 
        : item.quantity;
    inventoryRepository.updateItem(data.itemId, { quantity: newQuantity });
    const movement = inventoryRepository.createMovement({
      ...data,
      createdBy: user.id
    });
    return { statusCode: 201, body: { data: movement } };
  },

  listMovements(query, user) {
    const movements = inventoryRepository.listMovements({
      itemId: query.itemId,
      schoolId: user.assignments?.[0]?.schoolId ?? query.schoolId,
      type: query.type,
      startDate: query.startDate,
      endDate: query.endDate
    });
    return { statusCode: 200, body: { data: movements } };
  }
};

export default inventoryService;