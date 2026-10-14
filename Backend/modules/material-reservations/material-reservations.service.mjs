import materialReservationsRepository from "./material-reservations.repository.mjs";
import inventoryRepository from "../inventory/inventory.repository.mjs";
import { HttpError } from "../../utils/http-error.mjs";
import { PERMISSIONS, permissionsForRole } from "../../config/permissions.config.mjs";

const VALID_STATUSES = ["pendiente", "aprobada", "rechazada", "cancelada", "activa", "finalizada"];

// Regla institucional para bloqueo temporal de stock:
// - pendiente, aprobada y activa bloquean disponibilidad durante el periodo reservado.
// - rechazada, cancelada y finalizada liberan la disponibilidad.
const ESTADOS_BLOQUEO = ["pendiente", "aprobada", "activa"];

const TRANSITIONS = {
  pendiente: ["aprobada", "rechazada", "cancelada"],
  aprobada: ["activa", "cancelada", "finalizada"],
  activa: ["finalizada"],
  rechazada: [],
  cancelada: [],
  finalizada: []
};

const RE_FECHA = /^\d{4}-\d{2}-\d{2}$/;
const RE_HORA = /^\d{2}:\d{2}(:\d{2})?$/;

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

function validarFechaISO(value, campo) {
  if (!value || typeof value !== "string" || !RE_FECHA.test(value) || Number.isNaN(Date.parse(value))) {
    throw errorDeCampo(campo, `El campo ${campo} debe ser una fecha valida en formato YYYY-MM-DD.`);
  }
  return value;
}

function validarHora(value, campo) {
  if (!value || typeof value !== "string" || !RE_HORA.test(value)) {
    throw errorDeCampo(campo, `El campo ${campo} debe tener formato HH:mm.`);
  }
  const partes = value.split(":").map(Number);
  if (partes[0] > 23 || partes[1] > 59 || (partes[2] !== undefined && partes[2] > 59)) {
    throw errorDeCampo(campo, `El campo ${campo} no es una hora valida.`);
  }
  return value.slice(0, 5);
}

function tiempo(periodo) {
  return new Date(`${periodo.startDate}T${periodo.startTime}`).getTime();
}

function tiempoFin(periodo) {
  return new Date(`${periodo.endDate}T${periodo.endTime}`).getTime();
}

const materialReservationsService = {
  esGestionable(user) {
    return (user.assignments ?? []).some((assignment) =>
      permissionsForRole(assignment.role).includes(PERMISSIONS.RESERVATIONS_MANAGE)
    );
  },

  _obtenerReserva(id, schoolId) {
    const reserva = materialReservationsRepository.findById(id);
    if (!reserva || reserva.schoolId !== schoolId) {
      throw new HttpError(404, "not_found", "La reserva solicitada no existe.");
    }
    return reserva;
  },

  _conHistoria(reserva) {
    return {
      ...reserva,
      history: materialReservationsRepository.listHistory(reserva.id)
    };
  },

  _transicionValida(reserva, destino) {
    const permitidas = TRANSITIONS[reserva.status] ?? [];
    if (!permitidas.includes(destino)) {
      throw new HttpError(409, "conflict", `No se puede pasar la reserva de "${reserva.status}" a "${destino}".`);
    }
  },

  _validarPeriodo(data) {
    const periodo = {
      startDate: validarFechaISO(data.startDate, "startDate"),
      endDate: validarFechaISO(data.endDate, "endDate"),
      startTime: validarHora(data.startTime, "startTime"),
      endTime: validarHora(data.endTime, "endTime")
    };
    if (tiempoFin(periodo) <= tiempo(periodo)) {
      throw errorDeCampo("endTime", "La fecha y hora de finalizacion deben ser posteriores al inicio.");
    }
    return periodo;
  },

  _validarItems(rawItems, schoolId) {
    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      throw errorDeCampo("items", "La reserva debe contener al menos un material.");
    }

    const vistos = new Set();
    return rawItems.map((raw) => {
      const itemId = validarTextoObligatorio(raw?.itemId, "items", 40);
      if (vistos.has(itemId)) {
        throw errorDeCampo("items", "No se permite reservar el mismo material mas de una vez.");
      }
      vistos.add(itemId);

      const quantity = validarEntero(raw?.quantity, "items", { min: 1, label: "mayor a cero" });
      const material = inventoryRepository.findItemById(itemId);
      if (!material || material.schoolId !== schoolId) {
        throw errorDeCampo("items", `El material ${itemId} no existe en la escuela.`);
      }
      if (!material.isActive) {
        throw new HttpError(409, "conflict", `El material "${material.name}" esta desactivado y no puede reservarse.`);
      }
      if (!material.allowReservation) {
        throw new HttpError(409, "conflict", `El material "${material.name}" no esta habilitado para reservas.`);
      }

      return { itemId, name: material.name, quantity };
    });
  },

  _reservadoEntre({ schoolId, itemId, inicio, fin, excluirId }) {
    let total = 0;
    for (const r of materialReservationsRepository.all()) {
      if (r.schoolId !== schoolId) continue;
      if (excluirId && r.id === excluirId) continue;
      if (!ESTADOS_BLOQUEO.includes(r.status)) continue;
      const item = r.items.find((i) => i.itemId === itemId);
      if (!item) continue;
      const rStart = new Date(r.startAt).getTime();
      const rEnd = new Date(r.endAt).getTime();
      if (inicio < rEnd && rStart < fin) {
        total += item.quantity;
      }
    }
    return total;
  },

  _disponibilidad(material, schoolId, periodo, excluirId) {
    const inicio = tiempo(periodo);
    const fin = tiempoFin(periodo);
    const reservado = this._reservadoEntre({ schoolId, itemId: material.id, inicio, fin, excluirId });
    return { stock: material.quantity, reserved: reservado, available: material.quantity - reservado };
  },

  _validarDisponibilidad(items, schoolId, periodo, { excluirId } = {}) {
    for (const item of items) {
      const material = inventoryRepository.findItemById(item.itemId);
      const disp = this._disponibilidad(material, schoolId, periodo, excluirId);
      if (item.quantity > disp.available) {
        throw errorDeCampo(
          "items",
          `Stock insuficiente para reservar ${item.quantity} de "${material.name}" en el periodo indicado ` +
            `(disponible: ${disp.available}, reservado por otras reservas: ${disp.reserved}).`
        );
      }
    }
  },

  create(data, user) {
    const schoolId = schoolOf(user);
    if (!schoolId) {
      throw new HttpError(403, "forbidden", "No tiene asignacion de escuela para reservar materiales.");
    }

    const reason = validarTextoObligatorio(data.reason, "reason", 500);
    const observations = validarTextoOpcional(data.observations, "observations", 1000);
    const items = this._validarItems(data.items, schoolId);
    const periodo = this._validarPeriodo(data);
    this._validarDisponibilidad(items, schoolId, periodo);

    const reserva = materialReservationsRepository.create({
      ownerId: user.id,
      schoolId,
      reason,
      observations,
      items,
      ...periodo
    });

    materialReservationsRepository.addHistory({
      reservationId: reserva.id,
      fromStatus: null,
      toStatus: "pendiente",
      userId: user.id,
      action: "creacion",
      detail: null
    });

    return { statusCode: 201, body: { data: this._conHistoria(reserva) } };
  },

  getById(id, user) {
    const schoolId = schoolOf(user);
    const reserva = this._obtenerReserva(id, schoolId);
    return { statusCode: 200, body: { data: this._conHistoria(reserva) } };
  },

  list(query, user) {
    const schoolId = schoolOf(user) ?? query.schoolId;
    const status = query.status ? validarEstado(query.status) : undefined;
    const sort = query.sort === "desc" ? "desc" : "asc";

    const reservas = materialReservationsRepository.list({
      schoolId,
      ownerId: query.ownerId,
      status,
      itemId: query.itemId,
      fromDate: validarFecha(query.fromDate, "fromDate"),
      toDate: validarFecha(query.toDate, "toDate"),
      sort
    });

    return { statusCode: 200, body: { data: { reservations: reservas } } };
  },

  update(id, data, user) {
    const schoolId = schoolOf(user);
    const reserva = this._obtenerReserva(id, schoolId);

    if (!["pendiente", "aprobada"].includes(reserva.status)) {
      throw new HttpError(409, "conflict", "La reserva ya fue procesada y no puede modificarse.");
    }

    const esDueño = reserva.ownerId === user.id;
    const esGestion = this.esGestionable(user);
    if (reserva.status === "aprobada" && !esGestion) {
      throw new HttpError(403, "forbidden", "Solo el personal del Server puede modificar una reserva aprobada.");
    }
    if (!esDueño && !esGestion) {
      throw new HttpError(403, "forbidden", "No tiene permiso para modificar esta reserva.");
    }

    const cambios = {};
    if (Object.hasOwn(data, "reason")) cambios.reason = validarTextoObligatorio(data.reason, "reason", 500);
    if (Object.hasOwn(data, "observations")) cambios.observations = validarTextoOpcional(data.observations, "observations", 1000);
    if (Object.hasOwn(data, "items")) cambios.items = this._validarItems(data.items, schoolId);

    const periodo = {
      startDate: Object.hasOwn(data, "startDate") ? validarFechaISO(data.startDate, "startDate") : reserva.startDate,
      endDate: Object.hasOwn(data, "endDate") ? validarFechaISO(data.endDate, "endDate") : reserva.endDate,
      startTime: Object.hasOwn(data, "startTime") ? validarHora(data.startTime, "startTime") : reserva.startTime,
      endTime: Object.hasOwn(data, "endTime") ? validarHora(data.endTime, "endTime") : reserva.endTime
    };
    const periodoValidado = this._validarPeriodo({
      startDate: periodo.startDate,
      endDate: periodo.endDate,
      startTime: periodo.startTime,
      endTime: periodo.endTime
    });

    const itemsFinales = cambios.items ?? reserva.items;
    this._validarDisponibilidad(itemsFinales, schoolId, periodoValidado, { excluirId: reserva.id });

    for (const campo of ["startDate", "endDate", "startTime", "endTime"]) {
      if (Object.hasOwn(data, campo)) cambios[campo] = periodoValidado[campo];
    }

    if (Object.keys(cambios).length === 0) {
      throw errorDeCampo("reason", "No se enviaron cambios validos para la reserva.");
    }

    const updated = materialReservationsRepository.update(id, cambios);

    materialReservationsRepository.addHistory({
      reservationId: id,
      fromStatus: reserva.status,
      toStatus: reserva.status,
      userId: user.id,
      action: "modificacion",
      detail: { fields: Object.keys(cambios) }
    });

    return { statusCode: 200, body: { data: this._conHistoria(updated) } };
  },

  aprobar(id, data, user) {
    const schoolId = schoolOf(user);
    const reserva = this._obtenerReserva(id, schoolId);
    this._transicionValida(reserva, "aprobada");

    const periodo = { startDate: reserva.startDate, endDate: reserva.endDate, startTime: reserva.startTime, endTime: reserva.endTime };
    this._validarDisponibilidad(reserva.items, schoolId, periodo, { excluirId: reserva.id });

    const ahora = new Date().toISOString();
    const updated = materialReservationsRepository.update(id, {
      status: "aprobada",
      approvedBy: user.id,
      approvedAt: ahora,
      decidedBy: user.id
    });

    materialReservationsRepository.addHistory({
      reservationId: id,
      fromStatus: reserva.status,
      toStatus: "aprobada",
      userId: user.id,
      action: "aprobacion",
      detail: null
    });

    return { statusCode: 200, body: { data: this._conHistoria(updated) } };
  },

  rechazar(id, data, user) {
    const schoolId = schoolOf(user);
    const reserva = this._obtenerReserva(id, schoolId);
    this._transicionValida(reserva, "rechazada");

    const reason = validarTextoObligatorio(data.reason, "reason", 500);
    const ahora = new Date().toISOString();
    const updated = materialReservationsRepository.update(id, {
      status: "rechazada",
      rejectedBy: user.id,
      rejectedAt: ahora,
      rejectionReason: reason,
      decidedBy: user.id
    });

    materialReservationsRepository.addHistory({
      reservationId: id,
      fromStatus: reserva.status,
      toStatus: "rechazada",
      userId: user.id,
      action: "rechazo",
      detail: { reason }
    });

    return { statusCode: 200, body: { data: this._conHistoria(updated) } };
  },

  cancelar(id, data, user) {
    const schoolId = schoolOf(user);
    const reserva = this._obtenerReserva(id, schoolId);
    this._transicionValida(reserva, "cancelada");

    const esDueño = reserva.ownerId === user.id;
    const esGestion = this.esGestionable(user);
    if (reserva.status === "aprobada" && !esGestion) {
      throw new HttpError(403, "forbidden", "Solo el personal del Server puede cancelar una reserva aprobada.");
    }
    if (!esDueño && !esGestion) {
      throw new HttpError(403, "forbidden", "No tiene permiso para cancelar esta reserva.");
    }

    const reason = validarTextoOpcional(data?.reason, "reason", 500);
    const ahora = new Date().toISOString();
    const updated = materialReservationsRepository.update(id, {
      status: "cancelada",
      cancelledBy: user.id,
      cancelledAt: ahora,
      cancelReason: reason,
      decidedBy: user.id
    });

    materialReservationsRepository.addHistory({
      reservationId: id,
      fromStatus: reserva.status,
      toStatus: "cancelada",
      userId: user.id,
      action: "cancelacion",
      detail: { reason }
    });

    return { statusCode: 200, body: { data: this._conHistoria(updated) } };
  },

  entregar(id, user) {
    const schoolId = schoolOf(user);
    const reserva = this._obtenerReserva(id, schoolId);
    this._transicionValida(reserva, "activa");

    const periodo = { startDate: reserva.startDate, endDate: reserva.endDate, startTime: reserva.startTime, endTime: reserva.endTime };
    this._validarDisponibilidad(reserva.items, schoolId, periodo, { excluirId: reserva.id });

    const movements = reserva.items.map((item) => {
      const material = inventoryRepository.findItemById(item.itemId);
      const result = inventoryRepository.applyMovement({
        itemId: item.itemId,
        type: "baja",
        quantity: item.quantity,
        previousStock: material.quantity,
        resultingStock: material.quantity - item.quantity,
        reason: `Entrega por reserva ${reserva.id} - ${reserva.reason}`,
        observations: null,
        referenceMovementId: null,
        userId: user.id,
        schoolId
      });
      return result.movement.id;
    });

    const ahora = new Date().toISOString();
    const updated = materialReservationsRepository.update(id, {
      status: "activa",
      activatedBy: user.id,
      activatedAt: ahora,
      decidedBy: user.id,
      deliveryMovementIds: movements
    });

    materialReservationsRepository.addHistory({
      reservationId: id,
      fromStatus: reserva.status,
      toStatus: "activa",
      userId: user.id,
      action: "entrega",
      detail: { movements }
    });

    return {
      statusCode: 200,
      body: { data: this._conHistoria(updated), movements }
    };
  },

  finalizar(id, user) {
    const schoolId = schoolOf(user);
    const reserva = this._obtenerReserva(id, schoolId);
    this._transicionValida(reserva, "finalizada");

    const ahora = new Date().toISOString();
    const updated = materialReservationsRepository.update(id, {
      status: "finalizada",
      finishedBy: user.id,
      finishedAt: ahora,
      decidedBy: user.id
    });

    materialReservationsRepository.addHistory({
      reservationId: id,
      fromStatus: reserva.status,
      toStatus: "finalizada",
      userId: user.id,
      action: "finalizacion",
      detail: null
    });

    return { statusCode: 200, body: { data: this._conHistoria(updated) } };
  },

  availability(query, user) {
    const schoolId = schoolOf(user) ?? query.schoolId;

    const itemId = validarTextoObligatorio(query.itemId, "itemId", 40);
    const material = inventoryRepository.findItemById(itemId);
    if (!material || material.schoolId !== schoolId) {
      throw new HttpError(404, "not_found", "El material consultado no existe.");
    }

    const periodo = this._validarPeriodo(query);
    const disp = this._disponibilidad(material, schoolId, periodo);

    return {
      statusCode: 200,
      body: {
        data: {
          itemId: material.id,
          name: material.name,
          allowReservation: material.allowReservation,
          stock: disp.stock,
          reserved: disp.reserved,
          available: disp.available,
          periodo
        }
      }
    };
  },

  history(id, user) {
    const schoolId = schoolOf(user);
    const reserva = this._obtenerReserva(id, schoolId);
    return {
      statusCode: 200,
      body: {
        data: {
          reservationId: reserva.id,
          history: materialReservationsRepository.listHistory(reserva.id)
        }
      }
    };
  }
};

export default materialReservationsService;