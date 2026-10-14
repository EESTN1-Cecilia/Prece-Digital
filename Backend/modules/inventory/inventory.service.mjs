import inventoryRepository from "./inventory.repository.mjs";
import requestsRepository from "../requests/requests.repository.mjs";
import reservationsRepository from "../reservations/reservations.repository.mjs";
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

function validarBooleano(value, campo) {
  if (value == null) return true;
  if (typeof value !== "boolean") {
    throw errorDeCampo(campo, `El campo ${campo} debe ser un booleano.`);
  }
  return value;
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
      allowReservation: validarBooleano(data.allowReservation, "allowReservation"),
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
    if (Object.hasOwn(data, "allowReservation")) cambios.allowReservation = validarBooleano(data.allowReservation, "allowReservation");

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
  },

  tableroServer(user) {
    const schoolId = String(user?.assignments?.[0]?.schoolId ?? "esc-1");
    const items = inventoryRepository.listItems({ schoolId, includeInactive: false });
    const movements = inventoryRepository.listMovements({ schoolId });
    const requests = requestsRepository.list({ schoolId });
    const reservations = reservationsRepository.list({ schoolId });

    const itemMap = new Map(items.map((i) => [i.id, i]));

    const totalMateriales = items.length;
    let disponibles = 0;
    let stockBajo = 0;
    let sinStock = 0;
    let enUso = 0;

    const categoriasMap = new Map();
    const ubicacionesSet = new Set();

    const materialesProcesados = items.map((item) => {
      let stockStatus = "normal";
      if (item.quantity === 0) {
        stockStatus = "agotado";
        sinStock++;
      } else if (item.minQuantity > 0 && item.quantity <= item.minQuantity) {
        stockStatus = "bajo";
        stockBajo++;
      } else if (item.status === "en_uso") {
        stockStatus = "en_uso";
        enUso++;
      } else {
        disponibles++;
      }

      if (item.location) {
        ubicacionesSet.add(item.location);
      }

      const cat = item.category || "otro";
      const catCount = categoriasMap.get(cat) || { cantidad: 0, items: 0 };
      catCount.items++;
      catCount.cantidad += item.quantity;
      categoriasMap.set(cat, catCount);

      return {
        ...item,
        code: item.code ?? item.id,
        stockStatus
      };
    });

    const materialesDestacados = [...materialesProcesados].sort((a, b) => {
      const score = (i) => (i.stockStatus === "agotado" ? 0 : i.stockStatus === "bajo" ? 1 : 2);
      if (score(a) !== score(b)) return score(a) - score(b);
      return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0);
    });

    const porCategoria = [...categoriasMap.entries()].map(([categoria, info]) => ({
      categoria,
      nombre: categoria.charAt(0).toUpperCase() + categoria.slice(1),
      totalItems: info.items,
      cantidadTotal: info.cantidad,
      porcentaje: totalMateriales > 0 ? Math.round((info.items / totalMateriales) * 1000) / 10 : 0
    }));

    const solicitudesPendientes = requests
      .filter((r) => r.status === "pendiente" || r.status === "en_progreso")
      .map((r) => {
        const item = r.itemId ? itemMap.get(r.itemId) : null;
        return {
          id: r.id,
          titulo: r.title,
          descripcion: r.description,
          tipo: r.type,
          prioridad: r.priority || "normal",
          estado: r.status,
          solicitante: r.requesterId || "Personal docente",
          sector: r.sector || "General",
          materialSolicitado: item ? item.name : r.title,
          cantidad: 1,
          fecha: r.createdAt ? r.createdAt.split("T")[0] : "",
          fechaLimite: r.dueDate || null
        };
      })
      .sort((a, b) => {
        const pOrder = { urgente: 0, alta: 1, normal: 2, baja: 3 };
        return (pOrder[a.prioridad] ?? 2) - (pOrder[b.prioridad] ?? 2);
      });

    const todayStr = new Date().toISOString().split("T")[0];

    const reservasDetalladas = reservations
      .map((res) => {
        const item = res.resourceType === "recurso" ? itemMap.get(res.resourceId) : null;
        const esHoy = res.date === todayStr;
        const esProxima = res.date >= todayStr;
        return {
          id: res.id,
          recursoId: res.resourceId,
          recursoTipo: res.resourceType,
          recursoNombre: item ? item.name : res.resourceId,
          solicitante: res.ownerId || "Docente",
          sector: "Recursos y Espacios",
          fecha: res.date,
          horaInicio: res.startTime,
          horaFin: res.endTime,
          proposito: res.purpose || "Actividad pedagógica",
          estado: res.status,
          esHoy,
          esProxima
        };
      })
      .sort((a, b) => {
        if (a.esHoy && !b.esHoy) return -1;
        if (!a.esHoy && b.esHoy) return 1;
        return a.fecha.localeCompare(b.fecha) || a.horaInicio.localeCompare(b.horaInicio);
      });

    const reservadosCount = reservations.filter((r) => r.status === "confirmada" && r.date >= todayStr).length;

    const alertas = [];

    for (const item of materialesProcesados) {
      if (item.quantity === 0) {
        alertas.push({
          id: `alt-sin-${item.id}`,
          tipo: "sin_stock",
          titulo: `Material sin stock: ${item.name}`,
          descripcion: `El material ${item.code} (${item.name}) se encuentra agotado en pañol/server. Requiere reposición inmediata.`,
          fecha: item.updatedAt ? item.updatedAt.split("T")[0] : todayStr,
          prioridad: "alta",
          estado: "activa",
          recursoId: item.id,
          recursoTipo: "material",
          recursoNombre: item.name
        });
      } else if (item.stockStatus === "bajo") {
        alertas.push({
          id: `alt-bajo-${item.id}`,
          tipo: "stock_bajo",
          titulo: `Stock bajo: ${item.name}`,
          descripcion: `Quedan ${item.quantity} ${item.unit || "unidades"} disponibles (Mínimo sugerido: ${item.minQuantity}).`,
          fecha: item.updatedAt ? item.updatedAt.split("T")[0] : todayStr,
          prioridad: "media",
          estado: "activa",
          recursoId: item.id,
          recursoTipo: "material",
          recursoNombre: item.name
        });
      }
    }

    for (const req of solicitudesPendientes) {
      if (req.prioridad === "urgente" || req.prioridad === "alta") {
        alertas.push({
          id: `alt-req-${req.id}`,
          tipo: "solicitud_urgente",
          titulo: `Solicitud prioritaria: ${req.titulo}`,
          descripcion: `Solicitud de ${req.solicitante} (${req.sector}) pendiente de atención.`,
          fecha: req.fecha || todayStr,
          prioridad: req.prioridad,
          estado: "activa",
          recursoId: req.id,
          recursoTipo: "solicitud",
          recursoNombre: req.titulo
        });
      }
    }

    for (const res of reservasDetalladas) {
      if (res.esHoy && res.estado === "confirmada") {
        alertas.push({
          id: `alt-res-${res.id}`,
          tipo: "reserva_hoy",
          titulo: `Reserva programada para hoy: ${res.recursoNombre}`,
          descripcion: `Horario: ${res.horaInicio} a ${res.horaFin} hs. Solicitante: ${res.solicitante}.`,
          fecha: res.fecha,
          prioridad: "normal",
          estado: "activa",
          recursoId: res.id,
          recursoTipo: "reserva",
          recursoNombre: res.recursoNombre
        });
      }
    }

    const movimientosRecientes = movements
      .slice(-10)
      .reverse()
      .map((m) => {
        const item = itemMap.get(m.itemId);
        const fechaObj = new Date(m.createdAt);
        return {
          id: m.id,
          itemId: m.itemId,
          material: item ? item.name : m.itemId,
          codigo: item ? item.code ?? item.id : "",
          tipo: m.type,
          cantidad: m.quantity,
          unidad: item?.unit || "unidades",
          usuario: m.userId || "Server",
          sector: item?.location || "Server Central",
          motivo: m.reason || "Movimiento registrado",
          fecha: !isNaN(fechaObj.getTime()) ? fechaObj.toLocaleDateString("es-AR") : "",
          hora: !isNaN(fechaObj.getTime()) ? fechaObj.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }) : "",
          estado: "Completado"
        };
      });

    return {
      statusCode: 200,
      body: {
        data: {
          institucion: {
            nombre: "E.E.S.T N° 1 MONTE GRANDE",
            sector: "Server / Pañol y Recursos Informáticos",
            cicloLectivo: 2026
          },
          resumenStock: {
            totalMateriales,
            disponibles,
            stockBajo,
            sinStock,
            reservados: reservadosCount,
            enUso,
            totalCategorias: categoriasMap.size,
            totalUbicaciones: ubicacionesSet.size || 1,
            porCategoria
          },
          materiales: materialesDestacados,
          solicitudesPendientes,
          contadorPendientes: solicitudesPendientes.length,
          reservas: reservasDetalladas,
          alertas,
          movimientosRecientes,
          catalogos: {
            categorias: ["tecnologia", "equipamiento", "material", "herramienta", "mobiliario", "otro"],
            tiposMovimiento: ["ingreso", "egreso", "transferencia", "ajuste"],
            estadosSolicitud: ["pendiente", "en_progreso", "resuelta", "cerrada", "rechazada"],
            estadosReserva: ["pendiente", "confirmada", "rechazada", "cancelada"],
            estadosMaterial: ["disponible", "en_uso", "mantenimiento", "dado_de_baja"],
            prioridades: ["baja", "normal", "alta", "urgente"]
          }
        }
      }
    };
  }
};

export default inventoryService;