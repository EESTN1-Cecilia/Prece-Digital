import { getStore } from "../../database/memory-store.mjs";
import studentRepository from "../students/students.repository.mjs";

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

const inasistenciasRepository = {
  init() {
    const store = getStore();

    if (!store.inasistencias) {
      store.inasistencias = new Map();
    }

    if (!store.inasistenciasAudit) {
      store.inasistenciasAudit = [];
    }
  },

  resetData() {
    this.init();
    const store = getStore();
    store.inasistencias.clear();
    store.inasistenciasAudit.length = 0;
  },

  /* ---------------- Referencia de alumnos ---------------------------------- */

  /* Los alumnos se leen del modulo students: es la unica fuente de alumnos. */
  findStudentRefById(id) {
    const alumno = studentRepository.findById(id);

    if (!alumno) {
      return null;
    }

    return {
      id: alumno.id,
      escuelaId: alumno.escuelaId,
      apellido: alumno.apellido,
      nombre: alumno.nombre,
      dni: alumno.dni,
      curso: alumno.curso,
      division: alumno.division,
      turno: alumno.turno,
      orientacion: alumno.orientacion,
      condicion: alumno.condicion
    };
  },

  /* ---------------- Inasistencias ------------------------------------------ */

  create(data) {
    this.init();
    const record = {
      id: data.id ?? generateId("ina"),
      escuelaId: data.escuelaId,
      alumnoId: data.alumnoId,
      alumno: data.alumno,
      curso: data.curso,
      division: data.division,
      turno: data.turno,
      orientacion: data.orientacion,
      fecha: data.fecha,
      anio: data.anio,
      cuatrimestre: data.cuatrimestre ?? null,
      motivo: data.motivo,
      estadoJustificacion: data.estadoJustificacion,
      justificacion: data.justificacion ?? null,
      observaciones: data.observaciones ?? null,
      historial: Array.isArray(data.historial) ? data.historial : [],
      createdBy: data.createdBy ?? null,
      createdAt: data.createdAt ?? new Date().toISOString(),
      updatedBy: data.updatedBy ?? data.createdBy ?? null,
      updatedAt: new Date().toISOString()
    };
    getStore().inasistencias.set(record.id, record);
    return cloneDeep(record);
  },

  findById(id) {
    this.init();
    const record = getStore().inasistencias.get(id);
    return record ? cloneDeep(record) : null;
  },

  /* No se permite registrar dos veces la misma inasistencia para el mismo
     alumno y fecha (el periodo queda implícito en la fecha). */
  findDuplicada(alumnoId, fecha) {
    this.init();

    for (const record of getStore().inasistencias.values()) {
      if (record.alumnoId === alumnoId && record.fecha === fecha) {
        return cloneDeep(record);
      }
    }

    return null;
  },

  list({
    escuelaId,
    alumnoId,
    curso,
    division,
    fecha,
    desde,
    hasta,
    anio,
    cuatrimestre,
    estadoJustificacion,
    motivo
  } = {}) {
    this.init();

    return [...getStore().inasistencias.values()].filter((record) => {
      if (escuelaId && record.escuelaId !== escuelaId) {
        return false;
      }

      if (alumnoId && record.alumnoId !== alumnoId) {
        return false;
      }

      if (curso !== undefined && curso !== null && Number(record.curso) !== Number(curso)) {
        return false;
      }

      if (division && record.division !== division) {
        return false;
      }

      if (fecha && record.fecha !== fecha) {
        return false;
      }

      if (desde && record.fecha < desde) {
        return false;
      }

      if (hasta && record.fecha > hasta) {
        return false;
      }

      if (anio !== undefined && anio !== null && record.anio !== Number(anio)) {
        return false;
      }

      if (cuatrimestre !== undefined && cuatrimestre !== null && (record.cuatrimestre ?? null) !== Number(cuatrimestre)) {
        return false;
      }

      if (estadoJustificacion && record.estadoJustificacion !== estadoJustificacion) {
        return false;
      }

      if (motivo && record.motivo !== motivo) {
        return false;
      }

      return true;
    });
  },

  update(id, cambios, antes, actorId) {
    this.init();
    const record = getStore().inasistencias.get(id);

    if (!record) {
      return null;
    }

    const historial = [...record.historial];

    if (antes) {
      historial.push(cloneDeep(antes));
    }

    Object.assign(record, cambios, {
      historial,
      updatedBy: actorId ?? record.updatedBy,
      updatedAt: new Date().toISOString()
    });

    return cloneDeep(record);
  },

  /* ---------------- Auditoria --------------------------------------------- */

  /* Registro de auditoria propio del modulo: se suma a la auditoria global
     (modules/audit) y queda para revisar la trazabilidad completa. */
  registrarAuditoria(entrada) {
    this.init();
    getStore().inasistenciasAudit.push({
      id: generateId("au_ina"),
      accion: entrada.accion,
      actorId: entrada.actorId ?? null,
      entidad: "inasistencia",
      entidadId: entrada.entidadId,
      antes: entrada.antes ?? null,
      despues: entrada.despues ?? null,
      momento: new Date().toISOString()
    });
  },

  listarAuditoria() {
    this.init();
    return getStore().inasistenciasAudit.map(cloneDeep);
  }
};

export default inasistenciasRepository;