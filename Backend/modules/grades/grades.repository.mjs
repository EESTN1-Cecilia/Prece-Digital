import { getStore } from "../../database/memory-store.mjs";

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

const gradesRepository = {
  init() {
    const store = getStore();

    if (!store.gradesCalificaciones) {
      store.gradesCalificaciones = new Map();
    }

    if (!store.gradesAudit) {
      store.gradesAudit = [];
    }
  },

  resetData() {
    this.init();
    const store = getStore();
    store.gradesCalificaciones.clear();
    store.gradesAudit.length = 0;
  },

  /* ---------------- Calificaciones ---------------------------------------- */

  createCalificacion(data) {
    this.init();
    const record = {
      id: data.id ?? generateId("cal"),
      escuelaId: data.escuelaId,
      alumnoId: data.alumnoId,
      materiaId: data.materiaId,
      cursoId: data.cursoId ?? null,
      divisionId: data.divisionId ?? null,
      docenteId: data.docenteId ?? null,
      asignacionMateriaId: data.asignacionMateriaId ?? null,
      anio: data.anio,
      cuatrimestre: data.cuatrimestre ?? null,
      periodo: data.periodo ?? null,
      tipoEvaluacion: data.tipoEvaluacion,
      valor: data.valor,
      fecha: data.fecha,
      observaciones: data.observaciones ?? null,
      historial: Array.isArray(data.historial) ? data.historial : [],
      isActive: data.isActive ?? true,
      fechaBaja: data.fechaBaja ?? null,
      creadoPor: data.creadoPor ?? null,
      actualizadoPor: data.creadoPor ?? null,
      creadoEn: data.creadoEn ?? new Date().toISOString(),
      actualizadoEn: new Date().toISOString()
    };
    getStore().gradesCalificaciones.set(record.id, record);
    return cloneDeep(record);
  },

  findCalificacionById(id) {
    this.init();
    const record = getStore().gradesCalificaciones.get(id);
    return record ? cloneDeep(record) : null;
  },

  findCalificacionDuplicada({ alumnoId, materiaId, anio, cuatrimestre, tipoEvaluacion, excludeId } = {}) {
    this.init();

    for (const record of getStore().gradesCalificaciones.values()) {
      if (record.id === excludeId) {
        continue;
      }

      if (!record.isActive) {
        continue;
      }

      if (
        record.alumnoId === alumnoId &&
        record.materiaId === materiaId &&
        record.anio === anio &&
        (record.cuatrimestre ?? null) === (cuatrimestre ?? null) &&
        record.tipoEvaluacion === tipoEvaluacion
      ) {
        return cloneDeep(record);
      }
    }

    return null;
  },

  listCalificaciones({
    escuelaId,
    alumnoId,
    materiaId,
    cursoId,
    divisionId,
    docenteId,
    anio,
    cuatrimestre,
    tipoEvaluacion,
    estado
  } = {}) {
    this.init();

    return [...getStore().gradesCalificaciones.values()]
      .filter((record) => {
        if (escuelaId && record.escuelaId !== escuelaId) {
          return false;
        }

        if (alumnoId && record.alumnoId !== alumnoId) {
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

        if (docenteId && record.docenteId !== docenteId) {
          return false;
        }

        if (anio !== undefined && anio !== null && record.anio !== anio) {
          return false;
        }

        if (cuatrimestre !== undefined && cuatrimestre !== null && (record.cuatrimestre ?? null) !== cuatrimestre) {
          return false;
        }

        if (tipoEvaluacion && record.tipoEvaluacion !== tipoEvaluacion) {
          return false;
        }

        const activo = record.isActive !== false;

        if (estado === "activo" && !activo) {
          return false;
        }

        if (estado === "inactivo" && activo) {
          return false;
        }

        return true;
      })
      .map(cloneDeep);
  },

  updateCalificacion(id, cambios, antes) {
    this.init();
    const record = getStore().gradesCalificaciones.get(id);

    if (!record) {
      return null;
    }

    const historial = [...record.historial];

    if (antes) {
      historial.push(cloneDeep(antes));
    }

    Object.assign(record, cambios, {
      historial,
      actualizadoEn: new Date().toISOString()
    });

    return cloneDeep(record);
  },

  deactivateCalificacion(id) {
    this.init();
    const record = getStore().gradesCalificaciones.get(id);

    if (!record) {
      return null;
    }

    record.isActive = false;
    record.fechaBaja = new Date().toISOString();
    record.actualizadoEn = record.fechaBaja;
    return cloneDeep(record);
  },

  /* ---------------- Auditoria --------------------------------------------- */

  registrarAuditoria(entrada) {
    this.init();
    getStore().gradesAudit.push({
      id: generateId("au_cal"),
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
    return getStore().gradesAudit.map(cloneDeep);
  }
};

export default gradesRepository;
