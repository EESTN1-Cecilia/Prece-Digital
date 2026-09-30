import inventoryRepository from "./inventory.repository.mjs";
import requestsRepository from "../requests/requests.repository.mjs";
import reservationsRepository from "../reservations/reservations.repository.mjs";
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
      createdBy: user?.id ?? "usr-server"
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
      schoolId: user?.assignments?.[0]?.schoolId ?? query.schoolId,
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
      createdBy: user?.id ?? "usr-server"
    });
    return { statusCode: 201, body: { data: movement } };
  },

  listMovements(query, user) {
    const movements = inventoryRepository.listMovements({
      itemId: query.itemId,
      schoolId: user?.assignments?.[0]?.schoolId ?? query.schoolId,
      type: query.type,
      startDate: query.startDate,
      endDate: query.endDate
    });
    return { statusCode: 200, body: { data: movements } };
  },

  tableroServer(user) {
    const schoolId = String(user?.assignments?.[0]?.schoolId ?? "esc-1");
    const items = inventoryRepository.listItems({ schoolId, includeInactive: false });
    const movements = inventoryRepository.listMovements({ schoolId });
    const requests = requestsRepository.list({ schoolId });
    const reservations = reservationsRepository.list({ schoolId });

    // Map de items para lookup rápido
    const itemMap = new Map(items.map((i) => [i.id, i]));

    // Calcular métricas de stock
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
      } else if (item.quantity <= item.minQuantity) {
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
      if (item.spaceId) {
        ubicacionesSet.add(item.spaceId);
      }

      const cat = item.category || "otro";
      const catCount = categoriasMap.get(cat) || { cantidad: 0, items: 0 };
      catCount.items++;
      catCount.cantidad += item.quantity;
      categoriasMap.set(cat, catCount);

      return {
        ...item,
        stockStatus
      };
    });

    // Ordenar materiales priorizando agotados y stock bajo
    const materialesDestacados = [...materialesProcesados].sort((a, b) => {
      const score = (i) => (i.stockStatus === "agotado" ? 0 : i.stockStatus === "bajo" ? 1 : 2);
      if (score(a) !== score(b)) return score(a) - score(b);
      return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0);
    });

    // Distribución por categorías
    const porCategoria = [...categoriasMap.entries()].map(([categoria, info]) => ({
      categoria,
      nombre: categoria.charAt(0).toUpperCase() + categoria.slice(1),
      totalItems: info.items,
      cantidadTotal: info.cantidad,
      porcentaje: totalMateriales > 0 ? Math.round((info.items / totalMateriales) * 1000) / 10 : 0
    }));

    // Solicitudes pendientes
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

    // Reservas de recursos
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

    // Materiales con reservas activas
    const reservadosCount = reservations.filter((r) => r.status === "confirmada" && r.date >= todayStr).length;

    // Alertas automáticas del Server
    const alertas = [];

    // Alerta por materiales agotados
    for (const item of items) {
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
      } else if (item.quantity <= item.minQuantity) {
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

    // Alerta por solicitudes pendientes urgentes
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

    // Alerta por reservas de hoy
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

    // Movimientos recientes formateados
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
          codigo: item ? item.code : "",
          tipo: m.type,
          cantidad: m.quantity,
          unidad: item?.unit || "unidades",
          usuario: m.createdBy || "Server",
          sector: m.toSpaceId || m.fromSpaceId || "Server Central",
          motivo: m.notes || "Movimiento registrado",
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