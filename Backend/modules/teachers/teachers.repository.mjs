import { getStore } from "../../database/memory-store.mjs";
import { normalizarTexto } from "./catalogo.mjs";

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

function aliasDocente(docente) {
  if (!docente) {
    return null;
  }

  return {
    ...docente,
    firstName: docente.nombre,
    lastName: docente.apellido,
    documentNumber: docente.documento,
    documentType: docente.tipoDocumento,
    phone: docente.telefono,
    specializations: docente.especialidades,
    schoolId: docente.escuelaId
  };
}

function aliasAsignacion(asignacion) {
  if (!asignacion) {
    return null;
  }

  return {
    ...asignacion,
    teacherId: asignacion.docenteId,
    subjectId: asignacion.materiaId,
    courseId: asignacion.cursoId,
    schoolId: asignacion.escuelaId
  };
}

function aCamposDocente(data = {}) {
  const cambios = { ...data };

  if ("firstName" in cambios) {
    cambios.nombre = cambios.firstName;
    delete cambios.firstName;
  }

  if ("lastName" in cambios) {
    cambios.apellido = cambios.lastName;
    delete cambios.lastName;
  }

  if ("documentNumber" in cambios) {
    cambios.documento = cambios.documentNumber;
    delete cambios.documentNumber;
  }

  if ("documentType" in cambios) {
    cambios.tipoDocumento = cambios.documentType;
    delete cambios.documentType;
  }

  if ("phone" in cambios) {
    cambios.telefono = cambios.phone;
    delete cambios.phone;
  }

  if ("specializations" in cambios) {
    cambios.especialidades = cambios.specializations;
    delete cambios.specializations;
  }

  if ("schoolId" in cambios) {
    cambios.escuelaId = cambios.schoolId;
    delete cambios.schoolId;
  }

  if ("isActive" in cambios) {
    cambios.estado = cambios.isActive === false ? "inactivo" : "activo";
    delete cambios.isActive;
  }

  return cambios;
}

const teachersRepository = {
  init() {
    const store = getStore();
    const colecciones = ["teachers", "teacherSubjects", "teacherCourses"];

    for (const coleccion of colecciones) {
      if (!store[coleccion]) {
        store[coleccion] = new Map();
      }
    }

    if (!store.teachersAudit) {
      store.teachersAudit = [];
    }
  },

  resetData() {
    this.init();
    const store = getStore();
    store.teachers.clear();
    store.teacherSubjects.clear();
    store.teacherCourses.clear();
    store.teachersAudit.length = 0;
  },

  /* ---------------- Docentes ----------------------------------------------- */

  createDocente(data) {
    this.init();
    const record = {
      id: data.id ?? generateId("tch"),
      userId: data.userId ?? null,
      apellido: data.apellido,
      nombre: data.nombre,
      tipoDocumento: data.tipoDocumento,
      documento: data.documento,
      email: data.email,
      telefono: data.telefono ?? null,
      titulo: data.titulo ?? null,
      especialidades: Array.isArray(data.especialidades) ? [...data.especialidades] : [],
      escuelaId: data.escuelaId,
      estado: data.estado,
      isActive: data.estado !== "inactivo",
      creadoPor: data.creadoPor ?? null,
      actualizadoPor: data.creadoPor ?? null,
      creadoEn: data.creadoEn ?? new Date().toISOString(),
      actualizadoEn: new Date().toISOString(),
      fechaBaja: data.fechaBaja ?? null
    };
    getStore().teachers.set(record.id, record);
    return cloneDeep(record);
  },

  findDocenteById(id) {
    this.init();
    const docente = getStore().teachers.get(id);
    return docente ? cloneDeep(docente) : null;
  },

  /* Alias de compatibilidad con schedules y jefatura. */
  findById(id) {
    return aliasDocente(this.findDocenteById(id));
  },

  /* Aliases en ingles usados por los modulos de seguimiento/planificaciones. */
  create(teacher = {}) {
    const docente = this.createDocente(aCamposDocente(teacher));
    return aliasDocente(docente);
  },

  list({ schoolId, includeInactive = false } = {}) {
    const docentes = this.listDocentes({ escuelaId: schoolId });
    const filtrados = includeInactive ? docentes : docentes.filter((docente) => docente.isActive);
    return filtrados.map(aliasDocente);
  },

  update(id, data = {}) {
    return aliasDocente(this.updateDocente(id, aCamposDocente(data)));
  },

  addSubject(teacherId, subjectData = {}) {
    const asignacion = this.createAsignacionMateria({
      docenteId: teacherId,
      materiaId: subjectData.subjectId ?? subjectData.materiaId,
      cursoId: subjectData.courseId ?? null,
      divisionId: subjectData.divisionId ?? null,
      escuelaId: subjectData.schoolId ?? subjectData.escuelaId,
      anio: subjectData.anio ?? new Date().getFullYear(),
      estado: "activo"
    });
    return aliasAsignacion(asignacion);
  },

  listSubjects({ teacherId, schoolId } = {}) {
    return this.listAsignacionesMateria({
      docenteId: teacherId,
      escuelaId: schoolId,
      estado: "activo"
    }).map(aliasAsignacion);
  },

  findDocenteByDocumento(documento, escuelaId) {
    this.init();
    const buscado = String(documento ?? "").trim();

    for (const docente of getStore().teachers.values()) {
      if (docente.documento === buscado && (!escuelaId || docente.escuelaId === escuelaId)) {
        return cloneDeep(docente);
      }
    }

    return null;
  },

  findDocenteByEmail(email, escuelaId) {
    this.init();
    const buscado = normalizarTexto(email);

    for (const docente of getStore().teachers.values()) {
      if (normalizarTexto(docente.email) === buscado && (!escuelaId || docente.escuelaId === escuelaId)) {
        return cloneDeep(docente);
      }
    }

    return null;
  },

  findDocenteByUserId(userId, escuelaId) {
    this.init();

    if (!userId) {
      return null;
    }

    for (const docente of getStore().teachers.values()) {
      if (docente.userId === userId && (!escuelaId || docente.escuelaId === escuelaId)) {
        return cloneDeep(docente);
      }
    }

    return null;
  },

  listDocentes({ escuelaId, estado, q } = {}) {
    this.init();
    const buscado = normalizarTexto(q);

    return [...getStore().teachers.values()]
      .filter((docente) => {
        if (escuelaId && docente.escuelaId !== escuelaId) {
          return false;
        }

        if (estado && estado !== "todos" && docente.estado !== estado) {
          return false;
        }

        if (buscado) {
          const texto = normalizarTexto(`${docente.apellido} ${docente.nombre} ${docente.documento} ${docente.email}`);
          if (!texto.includes(buscado)) {
            return false;
          }
        }

        return true;
      })
      .map(cloneDeep);
  },

  updateDocente(id, cambios) {
    this.init();
    const docente = getStore().teachers.get(id);

    if (!docente) {
      return null;
    }

    Object.assign(docente, cambios, { actualizadoEn: new Date().toISOString() });

    if (docente.estado === "activo") {
      docente.fechaBaja = null;
    }

    docente.isActive = docente.estado !== "inactivo";
    return cloneDeep(docente);
  },

  deactivateDocente(id) {
    this.init();
    const docente = getStore().teachers.get(id);

    if (!docente) {
      return null;
    }

    docente.estado = "inactivo";
    docente.isActive = false;
    docente.fechaBaja = new Date().toISOString();
    docente.actualizadoEn = docente.fechaBaja;
    return cloneDeep(docente);
  },

  /* ---------------- Asignaciones docente <-> materia ----------------------- */

  createAsignacionMateria(data) {
    this.init();
    const record = {
      id: data.id ?? generateId("tcm"),
      docenteId: data.docenteId,
      materiaId: data.materiaId,
      cursoId: data.cursoId ?? null,
      divisionId: data.divisionId ?? null,
      escuelaId: data.escuelaId,
      anio: data.anio,
      cuatrimestre: data.cuatrimestre ?? null,
      horasSemanales: data.horasSemanales ?? null,
      observaciones: data.observaciones ?? null,
      estado: data.estado ?? "activo",
      isActive: (data.estado ?? "activo") !== "inactivo",
      historial: [],
      creadoPor: data.creadoPor ?? null,
      actualizadoPor: data.creadoPor ?? null,
      creadoEn: data.creadoEn ?? new Date().toISOString(),
      actualizadoEn: new Date().toISOString(),
      fechaBaja: data.fechaBaja ?? null
    };
    getStore().teacherSubjects.set(record.id, record);
    return cloneDeep(record);
  },

  findAsignacionMateriaById(id) {
    this.init();
    const asignacion = getStore().teacherSubjects.get(id);
    return asignacion ? cloneDeep(asignacion) : null;
  },

  findAsignacionMateriaDuplicada({ docenteId, materiaId, cursoId, divisionId, anio, cuatrimestre, excludeId } = {}) {
    this.init();

    for (const asignacion of getStore().teacherSubjects.values()) {
      if (asignacion.id === excludeId) {
        continue;
      }

      if (
        asignacion.docenteId === docenteId &&
        asignacion.materiaId === materiaId &&
        (asignacion.cursoId ?? null) === (cursoId ?? null) &&
        (asignacion.divisionId ?? null) === (divisionId ?? null) &&
        asignacion.anio === anio &&
        (asignacion.cuatrimestre ?? null) === (cuatrimestre ?? null)
      ) {
        return cloneDeep(asignacion);
      }
    }

    return null;
  },

  listAsignacionesMateria({ docenteId, materiaId, escuelaId, cursoId, divisionId, anio, cuatrimestre, estado } = {}) {
    this.init();

    return [...getStore().teacherSubjects.values()]
      .filter((asignacion) => {
        if (docenteId && asignacion.docenteId !== docenteId) {
          return false;
        }

        if (materiaId && asignacion.materiaId !== materiaId) {
          return false;
        }

        if (escuelaId && asignacion.escuelaId !== escuelaId) {
          return false;
        }

        if (cursoId && asignacion.cursoId !== cursoId) {
          return false;
        }

        if (divisionId && asignacion.divisionId !== divisionId) {
          return false;
        }

        if (anio !== undefined && anio !== null && asignacion.anio !== anio) {
          return false;
        }

        if (cuatrimestre !== undefined && cuatrimestre !== null && (asignacion.cuatrimestre ?? null) !== cuatrimestre) {
          return false;
        }

        if (estado && estado !== "todos" && asignacion.estado !== estado) {
          return false;
        }

        return true;
      })
      .map(cloneDeep);
  },

  updateAsignacionMateria(id, cambios, antes) {
    this.init();
    const asignacion = getStore().teacherSubjects.get(id);

    if (!asignacion) {
      return null;
    }

    const historial = [...asignacion.historial];

    if (antes) {
      historial.push(cloneDeep(antes));
    }

    Object.assign(asignacion, cambios, {
      historial,
      actualizadoEn: new Date().toISOString()
    });

    if (asignacion.estado === "activo") {
      asignacion.fechaBaja = null;
    }

    asignacion.isActive = asignacion.estado !== "inactivo";
    return cloneDeep(asignacion);
  },

  deactivateAsignacionMateria(id) {
    this.init();
    const asignacion = getStore().teacherSubjects.get(id);

    if (!asignacion) {
      return null;
    }

    asignacion.estado = "inactivo";
    asignacion.isActive = false;
    asignacion.fechaBaja = new Date().toISOString();
    asignacion.actualizadoEn = asignacion.fechaBaja;
    return cloneDeep(asignacion);
  },

  /* ---------------- Asignaciones docente <-> curso/division --------------- */

  createAsignacionCurso(data) {
    this.init();
    const record = {
      id: data.id ?? generateId("tcc"),
      docenteId: data.docenteId,
      cursoId: data.cursoId ?? null,
      divisionId: data.divisionId ?? null,
      rol: data.rol,
      escuelaId: data.escuelaId,
      anio: data.anio,
      cuatrimestre: data.cuatrimestre ?? null,
      observaciones: data.observaciones ?? null,
      estado: data.estado ?? "activo",
      isActive: (data.estado ?? "activo") !== "inactivo",
      historial: [],
      creadoPor: data.creadoPor ?? null,
      actualizadoPor: data.creadoPor ?? null,
      creadoEn: data.creadoEn ?? new Date().toISOString(),
      actualizadoEn: new Date().toISOString(),
      fechaBaja: data.fechaBaja ?? null
    };
    getStore().teacherCourses.set(record.id, record);
    return cloneDeep(record);
  },

  findAsignacionCursoById(id) {
    this.init();
    const asignacion = getStore().teacherCourses.get(id);
    return asignacion ? cloneDeep(asignacion) : null;
  },

  findAsignacionCursoDuplicada({ docenteId, cursoId, divisionId, rol, anio, cuatrimestre, excludeId } = {}) {
    this.init();

    for (const asignacion of getStore().teacherCourses.values()) {
      if (asignacion.id === excludeId) {
        continue;
      }

      if (
        asignacion.docenteId === docenteId &&
        (asignacion.cursoId ?? null) === (cursoId ?? null) &&
        (asignacion.divisionId ?? null) === (divisionId ?? null) &&
        (asignacion.rol ?? null) === (rol ?? null) &&
        asignacion.anio === anio &&
        (asignacion.cuatrimestre ?? null) === (cuatrimestre ?? null)
      ) {
        return cloneDeep(asignacion);
      }
    }

    return null;
  },

  listAsignacionesCurso({ docenteId, cursoId, divisionId, escuelaId, anio, cuatrimestre, estado } = {}) {
    this.init();

    return [...getStore().teacherCourses.values()]
      .filter((asignacion) => {
        if (docenteId && asignacion.docenteId !== docenteId) {
          return false;
        }

        if (cursoId && asignacion.cursoId !== cursoId) {
          return false;
        }

        if (divisionId && asignacion.divisionId !== divisionId) {
          return false;
        }

        if (escuelaId && asignacion.escuelaId !== escuelaId) {
          return false;
        }

        if (anio !== undefined && anio !== null && asignacion.anio !== anio) {
          return false;
        }

        if (cuatrimestre !== undefined && cuatrimestre !== null && (asignacion.cuatrimestre ?? null) !== cuatrimestre) {
          return false;
        }

        if (estado && estado !== "todos" && asignacion.estado !== estado) {
          return false;
        }

        return true;
      })
      .map(cloneDeep);
  },

  updateAsignacionCurso(id, cambios, antes) {
    this.init();
    const asignacion = getStore().teacherCourses.get(id);

    if (!asignacion) {
      return null;
    }

    const historial = [...asignacion.historial];

    if (antes) {
      historial.push(cloneDeep(antes));
    }

    Object.assign(asignacion, cambios, {
      historial,
      actualizadoEn: new Date().toISOString()
    });

    if (asignacion.estado === "activo") {
      asignacion.fechaBaja = null;
    }

    asignacion.isActive = asignacion.estado !== "inactivo";
    return cloneDeep(asignacion);
  },

  deactivateAsignacionCurso(id) {
    this.init();
    const asignacion = getStore().teacherCourses.get(id);

    if (!asignacion) {
      return null;
    }

    asignacion.estado = "inactivo";
    asignacion.isActive = false;
    asignacion.fechaBaja = new Date().toISOString();
    asignacion.actualizadoEn = asignacion.fechaBaja;
    return cloneDeep(asignacion);
  },

  /* ---------------- Auditoria ---------------------------------------------- */

  registrarAuditoria(entrada) {
    this.init();
    getStore().teachersAudit.push({
      id: generateId("au_tch"),
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
    return getStore().teachersAudit.map(cloneDeep);
  }
};

export default teachersRepository;
