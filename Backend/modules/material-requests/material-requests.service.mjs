import materialRequestsRepository from "./material-requests.repository.mjs";
import inventoryRepository from "../inventory/inventory.repository.mjs";
import { HttpError } from "../../utils/http-error.mjs";
import { PERMISSIONS, permissionsForRole } from "../../config/permissions.config.mjs";

const VALID_STATUSES = ["pendiente", "en_revision", "aprobada", "rechazada", "cancelada", "entregada", "cerrada"];

const TRANSITIONS = {
  pendiente: ["en_revision", "cancelada"],
  en_revision: ["aprobada", "rechazada", "cancelada"],
  aprobada: ["entregada", "cancelada"],
  entregada: ["cerrada"],
  rechazada: [],
  cancelada: [],
  cerrada: []
};

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

function validarEntero(value, campo, { min, label }) {
  const numero = typeof value === "string" && value.trim() !== "" ? Number(value) : value;
  if (typeof numero !== "number" || !Number.isInteger(numero) || numero < min) {
    throw errorDeCampo(campo, `El campo ${campo} debe ser un entero ${label}.`);
  }
  return numero;
}

function validarEstado(value) {
  if (!VALID_STATUSES.includes(value)) {
    throw errorDeCampo("status", `Estado invalido. Validos: ${VALID_STATUSES.join(", ")}.`);
  }
  return value;
}

function validarFecha(value, campo) {
  if (value == null || value === "") return undefined;
  if (Number.isNaN(Date.parse(value))) {
    throw errorDeCampo(campo, `El campo ${campo} debe ser una fecha valida.`);
  }
  return value;
}

const materialRequestsService = {
  esGestionable(user) {
    return (user.assignments ?? []).some((assignment) =>
      permissionsForRole(assignment.role).includes(PERMISSIONS.REQUESTS_MANAGE)
    );
  },

  _obtenerSolicitud(id, schoolId) {
    const request = materialRequestsRepository.findById(id);
    if (!request || request.schoolId !== schoolId) {
      throw new HttpError(404, "not_found", "La solicitud solicitada no existe.");
    }
    return request;
  },

  _conHistoria(request) {
    return {
      ...request,
      history: materialRequestsRepository.listHistory(request.id)
    };
  },

  _transicionValida(request, destino) {
    const permitidas = TRANSITIONS[request.status] ?? [];
    if (!permitidas.includes(destino)) {
      throw new HttpError(409, "conflict", `No se puede pasar la solicitud de "${request.status}" a "${destino}".`);
    }
  },

  _validarItems(rawItems, schoolId) {
    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      throw errorDeCampo("items", "La solicitud debe contener al menos un material.");
    }

    const vistos = new Set();
    return rawItems.map((raw) => {
      const itemId = validarTextoObligatorio(raw?.itemId, "items", 40);
      if (vistos.has(itemId)) {
        throw errorDeCampo("items", "No se permite pedir el mismo material mas de una vez en la solicitud.");
      }
      vistos.add(itemId);

      const quantity = validarEntero(raw?.quantity, "items", { min: 1, label: "mayor a cero" });
      const material = inventoryRepository.findItemById(itemId);
      if (!material || material.schoolId !== schoolId) {
        throw errorDeCampo("items", `El material ${itemId} no existe en la escuela.`);
      }
      if (!material.isActive) {
        throw new HttpError(409, "conflict", `El material "${material.name}" esta desactivado y no puede solicitarse.`);
      }

      return {
        itemId,
        name: material.name,
        quantity,
        approvedQuantity: null,
        observations: validarTextoOpcional(raw?.observations, "items", 1000)
      };
    });
  },

  _calcularAprobaciones(request, rawItems, schoolId) {
    const porCantidad = {};

    if (rawItems != null) {
      if (!Array.isArray(rawItems)) {
        throw errorDeCampo("items", "El campo items debe ser una lista de materiales a aprobar.");
      }
      for (const raw of rawItems) {
        const itemId = validarTextoObligatorio(raw?.itemId, "items", 40);
        const item = request.items.find((i) => i.itemId === itemId);
        if (!item) {
          throw errorDeCampo("items", `El material ${itemId} no fue solicitado en esta solicitud.`);
        }
        const aprobada = validarEntero(raw?.approvedQuantity, "items", { min: 0, label: "no negativo" });
        if (aprobada > item.quantity) {
          throw errorDeCampo("items", `La cantidad aprobada de "${item.name}" no puede superar la cantidad solicitada (${item.quantity}).`);
        }
        porCantidad[itemId] = aprobada;
      }
    }

    const aprobaciones = request.items.map((item) => ({
      itemId: item.itemId,
      name: item.name,
      quantity: item.quantity,
      approvedQuantity: Object.hasOwn(porCantidad, item.itemId) ? porCantidad[item.itemId] : item.quantity
    }));

    for (const aprobacion of aprobaciones) {
      if (aprobacion.approvedQuantity <= 0) continue;
      const material = inventoryRepository.findItemById(aprobacion.itemId);
      if (!material || material.schoolId !== schoolId) {
        throw errorDeCampo("items", `El material ${aprobacion.itemId} ya no existe en la escuela.`);
      }
      if (!material.isActive) {
        throw new HttpError(409, "conflict", `El material "${aprobacion.name}" esta desactivado.`);
      }
      if (material.quantity < aprobacion.approvedQuantity) {
        throw errorDeCampo("items", `Stock insuficiente para aprobar ${aprobacion.approvedQuantity} de "${aprobacion.name}" (disponible: ${material.quantity}).`);
      }
    }

    return aprobaciones;
  },

  create(data, user) {
    const schoolId = schoolOf(user);
    if (!schoolId) {
      throw new HttpError(403, "forbidden", "No tiene asignacion de escuela para solicitar materiales.");
    }

    const reason = validarTextoObligatorio(data.reason, "reason", 500);
    const observations = validarTextoOpcional(data.observations, "observations", 1000);
    const items = this._validarItems(data.items, schoolId);

    const request = materialRequestsRepository.create({
      requesterId: user.id,
      schoolId,
      reason,
      observations,
      items
    });

    materialRequestsRepository.addHistory({
      requestId: request.id,
      fromStatus: null,
      toStatus: "pendiente",
      changedBy: user.id,
      detail: null
    });

    return { statusCode: 201, body: { data: this._conHistoria(request) } };
  },

  getById(id, user) {
    const schoolId = schoolOf(user);
    const request = this._obtenerSolicitud(id, schoolId);
    return { statusCode: 200, body: { data: this._conHistoria(request) } };
  },

  list(query, user) {
    const schoolId = schoolOf(user) ?? query.schoolId;
    const status = query.status ? validarEstado(query.status) : undefined;
    const sort = query.sort === "asc" ? "asc" : "desc";

    const requests = materialRequestsRepository.list({
      schoolId,
      requesterId: query.requesterId,
      status,
      itemId: query.itemId,
      fromDate: validarFecha(query.fromDate, "fromDate"),
      toDate: validarFecha(query.toDate, "toDate"),
      sort
    });

    return { statusCode: 200, body: { data: { requests } } };
  },

  update(id, data, user) {
    const schoolId = schoolOf(user);
    const request = this._obtenerSolicitud(id, schoolId);

    if (!["pendiente", "en_revision"].includes(request.status)) {
      throw new HttpError(409, "conflict", "La solicitud ya fue procesada y no puede modificarse.");
    }

    const esDueño = request.requesterId === user.id;
    const esGestion = this.esGestionable(user);
    if (!esDueño && !esGestion) {
      throw new HttpError(403, "forbidden", "No tiene permiso para modificar esta solicitud.");
    }

    const cambios = {};
    if (Object.hasOwn(data, "reason")) cambios.reason = validarTextoObligatorio(data.reason, "reason", 500);
    if (Object.hasOwn(data, "observations")) cambios.observations = validarTextoOpcional(data.observations, "observations", 1000);
    if (Object.hasOwn(data, "items")) cambios.items = this._validarItems(data.items, schoolId);

    if (Object.keys(cambios).length === 0) {
      throw errorDeCampo("reason", "No se enviaron cambios validos para la solicitud.");
    }

    cambios.updatedBy = user.id;
    const updated = materialRequestsRepository.update(id, cambios);

    materialRequestsRepository.addHistory({
      requestId: id,
      fromStatus: request.status,
      toStatus: request.status,
      changedBy: user.id,
      detail: { action: "modificacion", fields: Object.keys(cambios).filter((k) => k !== "updatedBy") }
    });

    return { statusCode: 200, body: { data: this._conHistoria(updated) } };
  },

  changeStatus(id, data, user) {
    const status = validarEstado(data.status);

    switch (status) {
      case "en_revision":
        return this.revisar(id, user);
      case "aprobada":
        return this.aprobar(id, data, user);
      case "rechazada":
        return this.rechazar(id, data, user);
      case "cancelada":
        return this.cancelar(id, data, user);
      case "entregada":
        return this.entregar(id, user);
      case "cerrada":
        return this.cerrar(id, user);
      default:
        throw errorDeCampo("status", "Transicion no soportada por el endpoint de estado.");
    }
  },

  revisar(id, user) {
    const schoolId = schoolOf(user);
    const request = this._obtenerSolicitud(id, schoolId);
    this._transicionValida(request, "en_revision");

    const updated = materialRequestsRepository.update(id, {
      status: "en_revision",
      updatedBy: user.id
    });

    materialRequestsRepository.addHistory({
      requestId: id,
      fromStatus: request.status,
      toStatus: "en_revision",
      changedBy: user.id,
      detail: null
    });

    return { statusCode: 200, body: { data: this._conHistoria(updated) } };
  },

  aprobar(id, data, user) {
    const schoolId = schoolOf(user);
    const request = this._obtenerSolicitud(id, schoolId);
    this._transicionValida(request, "aprobada");

    const aprobaciones = this._calcularAprobaciones(request, data.items, schoolId);
    const ahora = new Date().toISOString();

    const updated = materialRequestsRepository.update(id, {
      status: "aprobada",
      approvedBy: user.id,
      approvedAt: ahora,
      decidedBy: user.id,
      items: request.items.map((item) => {
        const aprobacion = aprobaciones.find((a) => a.itemId === item.itemId);
        return { ...item, approvedQuantity: aprobacion.approvedQuantity };
      }),
      updatedBy: user.id
    });

    materialRequestsRepository.addHistory({
      requestId: id,
      fromStatus: request.status,
      toStatus: "aprobada",
      changedBy: user.id,
      detail: { items: aprobaciones.map((a) => ({ itemId: a.itemId, quantity: a.quantity, approvedQuantity: a.approvedQuantity })) }
    });

    return { statusCode: 200, body: { data: this._conHistoria(updated) } };
  },

  rechazar(id, data, user) {
    const schoolId = schoolOf(user);
    const request = this._obtenerSolicitud(id, schoolId);
    this._transicionValida(request, "rechazada");

    const reason = validarTextoObligatorio(data.reason, "reason", 500);
    const ahora = new Date().toISOString();

    const updated = materialRequestsRepository.update(id, {
      status: "rechazada",
      rejectedBy: user.id,
      rejectedAt: ahora,
      rejectionReason: reason,
      decidedBy: user.id,
      updatedBy: user.id
    });

    materialRequestsRepository.addHistory({
      requestId: id,
      fromStatus: request.status,
      toStatus: "rechazada",
      changedBy: user.id,
      detail: { reason }
    });

    return { statusCode: 200, body: { data: this._conHistoria(updated) } };
  },

  cancelar(id, data, user) {
    const schoolId = schoolOf(user);
    const request = this._obtenerSolicitud(id, schoolId);
    this._transicionValida(request, "cancelada");

    const esDueño = request.requesterId === user.id;
    const esGestion = this.esGestionable(user);
    if (request.status === "aprobada" && !esGestion) {
      throw new HttpError(403, "forbidden", "Solo el personal del Server puede cancelar una solicitud aprobada.");
    }
    if (!esDueño && !esGestion) {
      throw new HttpError(403, "forbidden", "No tiene permiso para cancelar esta solicitud.");
    }

    const reason = validarTextoOpcional(data?.reason, "reason", 500);
    const ahora = new Date().toISOString();

    const updated = materialRequestsRepository.update(id, {
      status: "cancelada",
      cancelledBy: user.id,
      cancelledAt: ahora,
      cancelReason: reason,
      decidedBy: user.id,
      updatedBy: user.id
    });

    materialRequestsRepository.addHistory({
      requestId: id,
      fromStatus: request.status,
      toStatus: "cancelada",
      changedBy: user.id,
      detail: { reason }
    });

    return { statusCode: 200, body: { data: this._conHistoria(updated) } };
  },

  entregar(id, user) {
    const schoolId = schoolOf(user);
    const request = this._obtenerSolicitud(id, schoolId);
    this._transicionValida(request, "entregada");

    const entregables = request.items.filter((item) => (item.approvedQuantity ?? 0) > 0);

    if (entregables.length === 0) {
      throw errorDeCampo("items", "La solicitud no tiene cantidades aprobadas para entregar.");
    }

    const validados = entregables.map((item) => {
      const material = inventoryRepository.findItemById(item.itemId);
      if (!material || material.schoolId !== schoolId) {
        throw errorDeCampo("items", `El material ${item.itemId} ya no existe en la escuela.`);
      }
      if (!material.isActive) {
        throw new HttpError(409, "conflict", `El material "${material.name}" esta desactivado y no puede entregarse.`);
      }
      if (material.quantity < item.approvedQuantity) {
        throw errorDeCampo("items", `Stock insuficiente para entregar ${item.approvedQuantity} de "${material.name}" (disponible: ${material.quantity}).`);
      }
      return { item, material };
    });

    const movements = validados.map(({ item, material }) => {
      const result = inventoryRepository.applyMovement({
        itemId: item.itemId,
        type: "baja",
        quantity: item.approvedQuantity,
        previousStock: material.quantity,
        resultingStock: material.quantity - item.approvedQuantity,
        reason: `Entrega por solicitud ${request.id} - ${request.reason}`,
        observations: item.observations ?? null,
        referenceMovementId: null,
        userId: user.id,
        schoolId
      });
      return result.movement.id;
    });

    const updated = materialRequestsRepository.update(id, {
      status: "entregada",
      deliveredBy: user.id,
      deliveredAt: new Date().toISOString(),
      decidedBy: user.id,
      deliveryMovementIds: movements,
      updatedBy: user.id
    });

    materialRequestsRepository.addHistory({
      requestId: id,
      fromStatus: request.status,
      toStatus: "entregada",
      changedBy: user.id,
      detail: { movements }
    });

    return {
      statusCode: 200,
      body: { data: this._conHistoria(updated), movements }
    };
  },

  cerrar(id, user) {
    const schoolId = schoolOf(user);
    const request = this._obtenerSolicitud(id, schoolId);
    this._transicionValida(request, "cerrada");

    const updated = materialRequestsRepository.update(id, {
      status: "cerrada",
      closedBy: user.id,
      closedAt: new Date().toISOString(),
      updatedBy: user.id
    });

    materialRequestsRepository.addHistory({
      requestId: id,
      fromStatus: request.status,
      toStatus: "cerrada",
      changedBy: user.id,
      detail: null
    });

    return { statusCode: 200, body: { data: this._conHistoria(updated) } };
  },

  history(id, user) {
    const schoolId = schoolOf(user);
    const request = this._obtenerSolicitud(id, schoolId);
    return {
      statusCode: 200,
      body: {
        data: {
          requestId: request.id,
          history: materialRequestsRepository.listHistory(request.id)
        }
      }
    };
  }
};

export default materialRequestsService;