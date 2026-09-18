import { getStore } from "../../database/memory-store.mjs";
import studentRepository from "../students/students.repository.mjs";
import { normalizarTexto } from "./catalogo.mjs";

function generateId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function clone(value) {
  return { ...value };
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

const academicRecordsRepository = {
  init() {
    const store = getStore();
    const colecciones = [
      "academicRecordsSituaciones",
      "academicRecordsSubjectRefs"
    ];

    for (const coleccion of colecciones) {
      if (!store[coleccion]) {
        store[coleccion] = new Map();
      }
    }

    if (!store.academicRecordsAudit) {
      store.academicRecordsAudit = [];
    }
  },

  resetData() {
    this.init();
    const store = getStore();
    store.academicRecordsSituaciones.clear();
    store.academicRecordsSubjectRefs.clear();
    store.academicRecordsAudit.length = 0;
  },

  /* ---------------- Referencias de catalogo (alumnos y materias) ---------- */

  /* Los alumnos se leen del modulo students: es la unica fuente de alumnos. */
  findStudentRefById(id) {
    const alumno = studentRepository.findById(id);
    return alumno ? { id: alumno.id, escuelaId: alumno.escuelaId, apellido: alumno.apellido, nombre: alumno.nombre, dni: alumno.dni } : null;
  },

  setSubjectsRef(lista) {
    this.init();
    for (const item of lista) {
      getStore().academicRecordsSubjectRefs.set(item.id, { ...item });
    }
  },

  findSubjectRefById(id) {
    this.init();
    const item = getStore().academicRecordsSubjectRefs.get(id);
    return item ? clone(item) : null;
  },

  /* ---------------- Situaciones academicas -------------------------------- */

  createSituacion(data) {
    this.init();
    const record = {
      id: data.id ?? generateId("rs"),
      escuelaId: data.escuelaId,
      alumnoId: data.alumnoId,
      materiaId: data.materiaId,
      anio: data.anio,
      cuatrimestre: data.cuatrimestre ?? null,
      tipo: data.tipo,
      estado: data.estado,
      antecedenteId: data.antecedenteId ?? null,
      historial: Array.isArray(data.historial) ? data.historial : [],
      observaciones: data.observaciones ?? null,
      creadoEn: data.creadoEn ?? new Date().toISOString(),
      actualizadoEn: new Date().toISOString(),
      actualizadoPor: data.actualizadoPor ?? null
    };
    getStore().academicRecordsSituaciones.set(record.id, record);
    return cloneDeep(record);
  },

  findSituacionById(id) {
    this.init();
    const record = getStore().academicRecordsSituaciones.get(id);
    return record ? cloneDeep(record) : null;
  },

  findSituacionDuplicada({ alumnoId, materiaId, anio, cuatrimestre }) {
    this.init();

    for (const record of getStore().academicRecordsSituaciones.values()) {
      if (
        record.alumnoId === alumnoId &&
        record.materiaId === materiaId &&
        record.anio === anio &&
        (record.cuatrimestre ?? null) === (cuatrimestre ?? null)
      ) {
        return cloneDeep(record);
      }
    }

    return null;
  },

  findAntecedente({ alumnoId, materiaId, anio }) {
    this.init();

    let antecedente = null;

    for (const record of getStore().academicRecordsSituaciones.values()) {
      if (record.alumnoId !== alumnoId || record.materiaId !== materiaId || record.anio >= anio) {
        continue;
      }

      if (!antecedente || record.anio > antecedente.anio || record.creadoEn > antecedente.creadoEn) {
        antecedente = record;
      }
    }

    return antecedente ? cloneDeep(antecedente) : null;
  },

  listSituaciones({
    escuelaId,
    alumnoId,
    materiaId,
    tipo,
    estado,
    anio,
    cuatrimestre
  } = {}) {
    this.init();

    const materiaIds = this.listSituacionesMateria();
    const registros = [...getStore().academicRecordsSituaciones.values()].filter((record) => {
      if (escuelaId && record.escuelaId !== escuelaId) {
        return false;
      }

      if (alumnoId && record.alumnoId !== alumnoId) {
        return false;
      }

      if (materiaId && record.materiaId !== materiaId) {
        return false;
      }

      if (tipo && record.tipo !== tipo) {
        return false;
      }

      if (estado && record.estado !== estado) {
        return false;
      }

      if (anio !== undefined && anio !== null && record.anio !== anio) {
        return false;
      }

      if (cuatrimestre !== undefined && cuatrimestre !== null && (record.cuatrimestre ?? null) !== cuatrimestre) {
        return false;
      }

      return true;
    });

    return registros
      .map((record) => {
        const materia = materiaIds[record.materiaId] ?? null;

        return cloneDeep({
          ...record,
          materiaSort: normalizarTexto(materia?.nombre ?? "")
        });
      });
  },

  listSituacionesMateria() {
    this.init();

    return Object.fromEntries(
      [...getStore().academicRecordsSubjectRefs.entries()].map(([id, materia]) => [id, materia])
    );
  },

  updateSituacion(id, cambios, antes) {
    this.init();
    const record = getStore().academicRecordsSituaciones.get(id);

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

  /* ---------------- Auditoria --------------------------------------------- */

  registrarAuditoria(entrada) {
    this.init();
    getStore().academicRecordsAudit.push({
      id: generateId("au_sit"),
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
    return getStore().academicRecordsAudit.map(cloneDeep);
  }
};

export default academicRecordsRepository;