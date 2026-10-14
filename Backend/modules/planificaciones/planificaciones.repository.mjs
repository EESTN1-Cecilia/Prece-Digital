import { getStore } from "../../database/memory-store.mjs";

/* Persistencia de planificaciones docentes en el store en memoria.

   Igual que el resto de los modulos: la migracion a la base real reemplaza este
   repositorio sin tocar el controlador ni el servicio. */

function generateId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function cloneDeep(value) {
  if (Array.isArray(value)) {
    return value.map(cloneDeep);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([clave, contenido]) => [clave, cloneDeep(contenido)]));
  }

  return value;
}

const planificacionesRepository = {
  init() {
    const store = getStore();

    if (!store.planificaciones) {
      store.planificaciones = new Map();
    }

    if (!store.planificacionesAudit) {
      store.planificacionesAudit = [];
    }
  },

  resetData() {
    this.init();
    const store = getStore();
    store.planificaciones.clear();
    store.planificacionesAudit.length = 0;
  },

  /* ---------------- Planificaciones --------------------------------------- */

  createPlanificacion(data) {
    this.init();
    const ahora = new Date().toISOString();
    const record = {
      id: data.id ?? generateId("pla"),
      escuelaId: data.escuelaId,
      docenteId: data.docenteId,
      materiaId: data.materiaId,
      cursoId: data.cursoId,
      divisionId: data.divisionId,
      asignacionMateriaId: data.asignacionMateriaId ?? null,
      anioLectivo: data.anioLectivo,
      cuatrimestre: data.cuatrimestre ?? null,
      contenido: { ...(data.contenido ?? {}) },
      estado: data.estado,
      fechaPresentacion: data.fechaPresentacion ?? null,
      fechaRevision: data.fechaRevision ?? null,
      revisadoPor: data.revisadoPor ?? null,
      motivoRevision: data.motivoRevision ?? null,
      historialEstados: Array.isArray(data.historialEstados) ? data.historialEstados : [],
      creadoPor: data.creadoPor ?? null,
      actualizadoPor: data.creadoPor ?? null,
      creadoEn: data.creadoEn ?? ahora,
      actualizadoEn: data.actualizadoEn ?? data.creadoEn ?? ahora
    };
    getStore().planificaciones.set(record.id, record);
    return cloneDeep(record);
  },

  findPlanificacionById(id) {
    this.init();
    const record = getStore().planificaciones.get(id);
    return record ? cloneDeep(record) : null;
  },

  /* Planificacion vigente (no rechazada) para la misma combinacion. */
  findPlanificacionDuplicada({ docenteId, materiaId, divisionId, anioLectivo, cuatrimestre, estadosExcluidos = [], excludeId } = {}) {
    this.init();

    for (const record of getStore().planificaciones.values()) {
      if (record.id === excludeId || estadosExcluidos.includes(record.estado)) {
        continue;
      }

      if (
        record.docenteId === docenteId &&
        record.materiaId === materiaId &&
        record.divisionId === divisionId &&
        record.anioLectivo === anioLectivo &&
        (record.cuatrimestre ?? null) === (cuatrimestre ?? null)
      ) {
        return cloneDeep(record);
      }
    }

    return null;
  },

  listPlanificaciones({ escuelaId, docenteId, materiaId, cursoId, divisionId, anioLectivo, cuatrimestre, estado } = {}) {
    this.init();

    return [...getStore().planificaciones.values()]
      .filter((record) => {
        if (escuelaId && record.escuelaId !== escuelaId) {
          return false;
        }

        if (docenteId && record.docenteId !== docenteId) {
          return false;
        }

        if (materiaId && record.materiaId !== materiaId) {
          return false;
        }

        if (cursoId && record.cursoId !== cursoId) {
          return false;
        }

        if (divisionId && record.divisionId !== divisionId) {
          return false;
        }

        if (anioLectivo !== undefined && anioLectivo !== null && record.anioLectivo !== anioLectivo) {
          return false;
        }

        if (cuatrimestre !== undefined && (record.cuatrimestre ?? null) !== cuatrimestre) {
          return false;
        }

        if (estado && record.estado !== estado) {
          return false;
        }

        return true;
      })
      .map(cloneDeep);
  },

  /* Aplica los cambios y, si se informa, agrega una entrada al historial de
     estados. El historial no se reescribe nunca: solo crece. */
  updatePlanificacion(id, cambios, entradaHistorial) {
    this.init();
    const record = getStore().planificaciones.get(id);

    if (!record) {
      return null;
    }

    const historialEstados = [...record.historialEstados];

    if (entradaHistorial) {
      historialEstados.push(cloneDeep(entradaHistorial));
    }

    Object.assign(record, cloneDeep(cambios), {
      historialEstados,
      actualizadoEn: new Date().toISOString()
    });

    return cloneDeep(record);
  },

  /* ---------------- Auditoria --------------------------------------------- */

  registrarAuditoria(entrada) {
    this.init();
    getStore().planificacionesAudit.push({
      id: generateId("au_pla"),
      accion: entrada.accion,
      actorId: entrada.actorId ?? null,
      entidad: entrada.entidad,
      entidadId: entrada.entidadId,
      antes: entrada.antes ?? null,
      despues: entrada.despues ?? null,
      momento: new Date().toISOString()
    });
  },

  listarAuditoria() {
    this.init();
    return getStore().planificacionesAudit.map(cloneDeep);
  }
};

export default planificacionesRepository;
