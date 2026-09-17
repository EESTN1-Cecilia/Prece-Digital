import inventoryRepository from "./inventory.repository.mjs";
import { HttpError } from "../../utils/http-error.mjs";

const VALID_CATEGORIES = ["mobiliario", "equipamiento", "material", "herramienta", "tecnologia", "otro"];
const VALID_STATUSES = ["disponible", "agotado", "danado", "en_reparacion", "inactivo"];
const VALID_MOVEMENT_TYPES = ["alta", "baja", "donacion", "prestamo", "devolucion", "ajuste"];
const MOVEMENTS_WITH_INCREMENT = ["alta", "donacion", "devolucion"];
const MOVEMENTS_WITH_DECREMENT = ["baja", "prestamo"];
const REGULAR_MOVEMENT_TYPES = ["alta", "baja", "donacion", "prestamo", "devolucion"];

function schoolOf(user) {
  return user?.assignments?.[0]?.schoolId ?? null;
}

function errorDeCampo(campo, mensaje) {
  return new HttpError(422, "validation_error", mensaje, [{ field: campo, message: mensaje }]);
}

function validarTextoObligatorio(value, campo, maxLength) {
  if (!value || typeof value !== "string" || !value.trim()) {
    throw errorDeCampo(campo, `El campo ${campo} es obligatorio.`);
  }
  if (value.trim().length > maxLength) {
    throw errorDeCampo(campo, `El campo ${campo} no puede superar ${maxLength} caracteres.`);
  }
  return value.trim();
}

function validarTextoOpcional(value, campo, maxLength) {
  if (value == null || value === "") return null;
  if (typeof value !== "string" || !value.trim()) {
    throw errorDeCampo(campo, `El campo ${campo} no es valido.`);
  }
  if (value.trim().length > maxLength) {
    throw errorDeCampo(campo, `El campo ${campo} no puede superar ${maxLength} caracteres.`);
  }
  return value.trim();
}

function validarCategoria(value) {
  if (!VALID_CATEGORIES.includes(value)) {
    throw errorDeCampo("category", `Categoria invalida. Validas: ${VALID_CATEGORIES.join(", ")}.`);
  }
  return value;
}

function validarEstado(value = "disponible") {
  if (!VALID_STATUSES.includes(value)) {
    throw errorDeCampo("status", `Estado invalido. Validos: ${VALID_STATUSES.join(", ")}.`);
  }
  return value;
}

function validarCantidadNoNegativa(value, campo) {
  if (value == null) return 0;
  const numero = typeof value === "string" ? Number(value) : value;
  if (!Number.isInteger(numero) || numero < 0) {
    throw errorDeCampo(campo, `El campo ${campo} debe ser un numero entero no negativo.`);
  }
  return numero;
}

function validarEnteroMayorACero(value) {
  const numero = typeof value === "string" && value.trim() !== "" ? Number(value) : value;
  if (typeof numero !== "number" || !Number.isInteger(numero) || numero <= 0) {
    throw errorDeCampo("quantity", "El campo quantity debe ser un entero mayor a cero.");
  }
  return numero;
}

function validarNuevoStock(value) {
  const numero = typeof value === "string" && value.trim() !== "" ? Number(value) : value;
  if (typeof numero !== "number" || !Number.isInteger(numero) || numero < 0) {
    throw errorDeCampo("nuevoStock", "El campo nuevoStock debe ser un entero no negativo.");
  }
  return numero;
}

const inventoryService = {
  createMaterial(data, user) {
    const schoolId = schoolOf(user);
    if (!schoolId) {
      throw new HttpError(403, "forbidden", "No tiene asignacion de escuela para operar el inventario.");
    }

    const name = validarTextoObligatorio(data.name, "name", 200);
    const category = validarCategoria(data.category);
    const unit = validarTextoObligatorio(data.unit ?? "unidad", "unit", 30);
    const duplicado = inventoryRepository.findByDuplicate({ schoolId, name, category });

    if (duplicado) {
      throw new HttpError(409, "conflict", `Ya existe un material con el nombre "${name}" en la misma categoria.`);
    }

    const initialQuantity = validarCantidadNoNegativa(data.quantity, "quantity");
    const minQuantity = validarCantidadNoNegativa(data.minQuantity, "minQuantity");
    const status = validarEstado(data.status);

    const item = inventoryRepository.createItem({
      name,
      description: validarTextoOpcional(data.description, "description", 2000),
      category,
      quantity: 0,
      minQuantity,
      unit,
      status,
      location: validarTextoOpcional(data.location, "location", 200),
      observations: validarTextoOpcional(data.observations, "observations", 2000),
      schoolId,
      createdBy: user.id
    });

    if (initialQuantity > 0) {
      inventoryRepository.applyMovement({
        itemId: item.id,
        type: "alta",
        quantity: initialQuantity,
        previousStock: 0,
        resultingStock: initialQuantity,
        reason: "Alta de material con stock inicial",
        observations: null,
        userId: user.id,
        schoolId
      });
    }

    return { statusCode: 201, body: { data: inventoryRepository.findItemById(item.id) } };
  },

  getMaterial(id, user) {
    const schoolId = schoolOf(user);
    const item = inventoryRepository.findItemById(id);

    if (!item || item.schoolId !== schoolId) {
      throw new HttpError(404, "not_found", "El material solicitado no existe.");
    }

    return { statusCode: 200, body: { data: item } };
  },

  listMaterials(query, user) {
    const schoolId = schoolOf(user) ?? query.schoolId;

    const items = inventoryRepository.listItems({
      schoolId,
      category: query.category ? validarCategoria(query.category) : undefined,
      status: query.status ? validarEstado(query.status) : undefined,
      location: query.location,
      unit: query.unit ?? undefined,
      search: query.search,
      includeInactive: query.includeInactive === "true"
    });

    return { statusCode: 200, body: { data: items } };
  },

  updateMaterial(id, data, user) {
    const schoolId = schoolOf(user);
    const item = inventoryRepository.findItemById(id);

    if (!item || item.schoolId !== schoolId) {
      throw new HttpError(404, "not_found", "El material solicitado no existe.");
    }

    if (Object.hasOwn(data, "quantity")) {
      throw errorDeCampo("quantity", "El stock se modifica a traves de movimientos, no directamente en el material.");
    }

    const cambios = {};
    if (Object.hasOwn(data, "name")) cambios.name = validarTextoObligatorio(data.name, "name", 200);
    if (Object.hasOwn(data, "description")) cambios.description = validarTextoOpcional(data.description, "description", 2000);
    if (Object.hasOwn(data, "category")) cambios.category = validarCategoria(data.category);
    if (Object.hasOwn(data, "minQuantity")) cambios.minQuantity = validarCantidadNoNegativa(data.minQuantity, "minQuantity");
    if (Object.hasOwn(data, "unit")) cambios.unit = validarTextoObligatorio(data.unit, "unit", 30);
    if (Object.hasOwn(data, "status")) cambios.status = validarEstado(data.status);
    if (Object.hasOwn(data, "location")) cambios.location = validarTextoOpcional(data.location, "location", 200);
    if (Object.hasOwn(data, "observations")) cambios.observations = validarTextoOpcional(data.observations, "observations", 2000);

    if (Object.hasOwn(data, "name") && cambios.name) {
      const duplicado = inventoryRepository.findByDuplicate({
        schoolId,
        name: cambios.name,
        category: cambios.category ?? item.category
      });
      if (duplicado && duplicado.id !== item.id) {
        throw new HttpError(409, "conflict", "Ya existe otro material con el mismo nombre y categoria.");
      }
    }

    const updated = inventoryRepository.updateItem(id, cambios, user);
    return { statusCode: 200, body: { data: updated } };
  },

  deactivateMaterial(id, user) {
    const schoolId = schoolOf(user);
    const item = inventoryRepository.findItemById(id);

    if (!item || item.schoolId !== schoolId) {
      throw new HttpError(404, "not_found", "El material solicitado no existe.");
    }

    const updated = inventoryRepository.deleteItem(id, user);
    return { statusCode: 200, body: { data: updated } };
  },

  getStock(id, user) {
    const schoolId = schoolOf(user);
    const item = inventoryRepository.findItemById(id);

    if (!item || item.schoolId !== schoolId) {
      throw new HttpError(404, "not_found", "El material solicitado no existe.");
    }

    return {
      statusCode: 200,
      body: {
        data: {
          itemId: item.id,
          name: item.name,
          quantity: item.quantity,
          minQuantity: item.minQuantity,
          unit: item.unit,
          status: item.status,
          location: item.location,
          nivel: item.quantity <= 0 ? "agotado" : item.minQuantity > 0 && item.quantity <= item.minQuantity ? "bajo" : "normal",
          updatedAt: item.updatedAt
        }
      }
    };
  },

  verifyStock(id, user) {
    const schoolId = schoolOf(user);
    const item = inventoryRepository.findItemById(id);

    if (!item || item.schoolId !== schoolId) {
      throw new HttpError(404, "not_found", "El material solicitado no existe.");
    }

    const resultado = inventoryRepository.verificarStock(id);
    return {
      statusCode: 200,
      body: {
        data: {
          itemId: item.id,
          name: item.name,
          stockActual: resultado.stockActual,
          stockCalculado: resultado.stockCalculado,
          consistente: resultado.consistente,
          movimientos: resultado.movimientos
        }
      }
    };
  },

  listLowStock(query, user) {
    const schoolId = schoolOf(user) ?? query.schoolId;
    const items = inventoryRepository.listLowStock({ schoolId, includeInactive: query.includeInactive === "true" });

    const data = items.map((i) => ({
      itemId: i.id,
      name: i.name,
      category: i.category,
      quantity: i.quantity,
      minQuantity: i.minQuantity,
      unit: i.unit,
      status: i.status,
      location: i.location,
      nivel: i.quantity <= 0 ? "agotado" : "bajo"
    }));

    return { statusCode: 200, body: { data } };
  },

  _prepararMovimiento(item, data, tipoPermitido) {
    const type = data.type;
    if (tipoPermitido === "ajuste") {
      if (type && type !== "ajuste") {
        throw errorDeCampo("type", "Para un ajuste el tipo debe ser 'ajuste'.");
      }
    } else if (!tipoPermitido.includes(type)) {
      throw errorDeCampo("type", `Tipo de movimiento invalido. Validos: ${tipoPermitido.join(", ")}.`);
    }

    const quantity = tipoPermitido === "ajuste"
      ? Math.abs(validarNuevoStock(data.nuevoStock) - item.quantity)
      : validarEnteroMayorACero(data.quantity);

    const reason = validarTextoObligatorio(data.reason, "reason", 500);
    const observations = validarTextoOpcional(data.observations, "observations", 1000);

    return { type, quantity, reason, observations };
  },

  registerMovement(id, data, user) {
    const schoolId = schoolOf(user);
    if (!schoolId) {
      throw new HttpError(403, "forbidden", "No tiene asignacion de escuela para operar el inventario.");
    }

    const item = inventoryRepository.findItemById(id);
    if (!item || item.schoolId !== schoolId) {
      throw new HttpError(404, "not_found", "El material solicitado no existe.");
    }

    if (!item.isActive) {
      throw new HttpError(409, "conflict", "El material esta desactivado y no admite nuevas operaciones de stock.");
    }

    const movimiento = this._prepararMovimiento(item, data, REGULAR_MOVEMENT_TYPES);

    const previousStock = item.quantity;
    const resultingStock = MOVEMENTS_WITH_INCREMENT.includes(movimiento.type)
      ? previousStock + movimiento.quantity
      : previousStock - movimiento.quantity;

    if (resultingStock < 0) {
      throw errorDeCampo("quantity", "La operacion supera el stock disponible del material.");
    }

    const referenceMovementId = this._validarReferenciaDevolucion(id, schoolId, data, movimiento);

    const result = inventoryRepository.applyMovement({
      itemId: item.id,
      type: movimiento.type,
      quantity: movimiento.quantity,
      previousStock,
      resultingStock,
      reason: movimiento.reason,
      observations: movimiento.observations,
      referenceMovementId,
      userId: user.id,
      schoolId
    });

    return { statusCode: 201, body: { data: result.movement } };
  },

  registerAdjust(id, data, user) {
    const schoolId = schoolOf(user);
    if (!schoolId) {
      throw new HttpError(403, "forbidden", "No tiene asignacion de escuela para operar el inventario.");
    }

    const item = inventoryRepository.findItemById(id);
    if (!item || item.schoolId !== schoolId) {
      throw new HttpError(404, "not_found", "El material solicitado no existe.");
    }

    if (!item.isActive) {
      throw new HttpError(409, "conflict", "El material esta desactivado y no admite nuevas operaciones de stock.");
    }

    const nuevoStock = validarNuevoStock(data.nuevoStock);
    const reason = validarTextoObligatorio(data.reason, "reason", 500);
    const observations = validarTextoOpcional(data.observations, "observations", 1000);

    if (nuevoStock === item.quantity) {
      throw errorDeCampo("nuevoStock", "No existe diferencia de stock para ajustar.");
    }

    const previousStock = item.quantity;
    const quantity = Math.abs(nuevoStock - previousStock);

    const result = inventoryRepository.applyMovement({
      itemId: item.id,
      type: "ajuste",
      quantity,
      previousStock,
      resultingStock: nuevoStock,
      reason,
      observations,
      referenceMovementId: null,
      userId: user.id,
      schoolId
    });

    return { statusCode: 201, body: { data: result.movement } };
  },

  _validarReferenciaDevolucion(itemId, schoolId, data, movimiento) {
    const refId = validarTextoOpcional(data.referenceMovementId, "referenceMovementId", 40);

    if (movimiento.type !== "devolucion" && refId) {
      throw errorDeCampo("referenceMovementId", "Solo las devoluciones pueden referenciar un movimiento.");
    }

    if (movimiento.type !== "devolucion" || !refId) {
      return refId;
    }

    const ref = inventoryRepository.findMovementById(refId);
    if (!ref || ref.schoolId !== schoolId || ref.itemId !== itemId) {
      throw errorDeCampo("referenceMovementId", "El movimiento referenciado no existe para este material.");
    }

    if (ref.type !== "prestamo") {
      throw errorDeCampo("referenceMovementId", "La devolucion debe referenciar un prestamo.");
    }

    const devoluciones = inventoryRepository.listMovements({ itemId, type: "devolucion" });
    const devuelto = devoluciones
      .filter((d) => d.referenceMovementId === refId)
      .reduce((total, d) => total + d.quantity, 0);

    const pendiente = ref.quantity - devuelto;
    if (pendiente <= 0) {
      throw errorDeCampo("referenceMovementId", "El prestamo referenciado ya fue devuelto en su totalidad.");
    }

    if (movimiento.quantity > pendiente) {
      throw errorDeCampo("quantity", "La devolucion supera el saldo pendiente del prestamo referenciado.");
    }

    return refId;
  },

  getMovement(movementId, user) {
    const schoolId = schoolOf(user);
    const movement = inventoryRepository.findMovementById(movementId);

    if (!movement || movement.schoolId !== schoolId) {
      throw new HttpError(404, "not_found", "El movimiento solicitado no existe.");
    }

    return { statusCode: 200, body: { data: movement } };
  },

  listItemMovements(id, query, user) {
    const schoolId = schoolOf(user);
    const item = inventoryRepository.findItemById(id);

    if (!item || item.schoolId !== schoolId) {
      throw new HttpError(404, "not_found", "El material solicitado no existe.");
    }

    const movements = inventoryRepository.listMovements({
      itemId: item.id,
      type: query.type,
      reason: query.motivo,
      fromDate: query.fromDate,
      toDate: query.toDate
    });

    return {
      statusCode: 200,
      body: {
        data: {
          material: { itemId: item.id, name: item.name },
          movements
        }
      }
    };
  },

  listMovements(query, user) {
    const schoolId = schoolOf(user) ?? query.schoolId;

    const movements = inventoryRepository.listMovements({
      schoolId,
      itemId: query.itemId,
      type: query.type,
      userId: query.userId,
      reason: query.motivo,
      fromDate: query.fromDate,
      toDate: query.toDate
    });

    return { statusCode: 200, body: { data: { movements } } };
  },

  getItemHistory(id, query, user) {
    const schoolId = schoolOf(user);
    const item = inventoryRepository.findItemById(id);

    if (!item || item.schoolId !== schoolId) {
      throw new HttpError(404, "not_found", "El material solicitado no existe.");
    }

    const history = inventoryRepository.listHistory({
      itemId: item.id,
      changedBy: query.changedBy,
      fromDate: query.fromDate,
      toDate: query.toDate
    });

    return {
      statusCode: 200,
      body: {
        data: {
          material: { itemId: item.id, name: item.name },
          history
        }
      }
    };
  }
};

export default inventoryService;