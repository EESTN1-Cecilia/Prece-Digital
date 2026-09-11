import { getStore } from "../../database/memory-store.mjs";
import { normalizarTexto } from "./catalogo.mjs";

function generateId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function clone(value) {
  return { ...value };
}

const academicRepository = {
  init() {
    const store = getStore();
    const colecciones = [
      "academicCiclos",
      "academicOrientaciones",
      "academicCursos",
      "academicDivisiones",
      "academicMatricula",
      "academicSubjectRelations",
      "academicTeacherRelations",
      "academicScheduleRelations",
      "academicStudentsRef",
      "academicTeachersRef",
      "academicSubjectsRef",
      "academicSchedulesRef"
    ];

    for (const coleccion of colecciones) {
      if (!store[coleccion]) {
        store[coleccion] = new Map();
      }
    }

    if (!store.academicAudit) {
      store.academicAudit = [];
    }
  },

  resetData() {
    this.init();
    const store = getStore();
    store.academicCiclos.clear();
    store.academicOrientaciones.clear();
    store.academicCursos.clear();
    store.academicDivisiones.clear();
    store.academicMatricula.clear();
    store.academicSubjectRelations.clear();
    store.academicTeacherRelations.clear();
    store.academicScheduleRelations.clear();
    store.academicStudentsRef.clear();
    store.academicTeachersRef.clear();
    store.academicSubjectsRef.clear();
    store.academicSchedulesRef.clear();
    store.academicAudit.length = 0;
  },

  /* ---------------- Referencias de catalogo (para enriquecer respuestas) ------- */

  setStudentsRef(lista) {
    this.init();
    for (const item of lista) {
      getStore().academicStudentsRef.set(item.id, { ...item });
    }
  },

  findStudentRefById(id) {
    this.init();
    const item = getStore().academicStudentsRef.get(id);
    return item ? clone(item) : null;
  },

  setTeachersRef(lista) {
    this.init();
    for (const item of lista) {
      getStore().academicTeachersRef.set(item.id, { ...item });
    }
  },

  findTeacherRefById(id) {
    this.init();
    const item = getStore().academicTeachersRef.get(id);
    return item ? clone(item) : null;
  },

  setSubjectsRef(lista) {
    this.init();
    for (const item of lista) {
      getStore().academicSubjectsRef.set(item.id, { ...item });
    }
  },

  findSubjectRefById(id) {
    this.init();
    const item = getStore().academicSubjectsRef.get(id);
    return item ? clone(item) : null;
  },

  setSchedulesRef(lista) {
    this.init();
    for (const item of lista) {
      getStore().academicSchedulesRef.set(item.id, { ...item });
    }
  },

  findScheduleRefById(id) {
    this.init();
    const item = getStore().academicSchedulesRef.get(id);
    return item ? clone(item) : null;
  },

  /* ---------------- Ciclos ------------------------------------------------ */

  createCiclo(data) {
    this.init();
    const record = {
      id: data.id ?? generateId("cic"),
      nombre: data.nombre,
      descripcion: data.descripcion ?? null,
      tipo: data.tipo,
      anioDesde: data.anioDesde ?? null,
      anioHasta: data.anioHasta ?? null,
      estado: data.estado ?? "activo",
      createdBy: data.createdBy ?? null,
      creadoEn: new Date().toISOString(),
      actualizadoEn: new Date().toISOString(),
      fechaBaja: data.fechaBaja ?? null
    };
    getStore().academicCiclos.set(record.id, record);
    return clone(record);
  },

  findCicloById(id) {
    this.init();
    const ciclo = getStore().academicCiclos.get(id);
    return ciclo ? clone(ciclo) : null;
  },

  findCicloByNombre(nombre) {
    this.init();
    const buscado = normalizarTexto(nombre);

    for (const ciclo of getStore().academicCiclos.values()) {
      if (normalizarTexto(ciclo.nombre) === buscado) {
        return clone(ciclo);
      }
    }

    return null;
  },

  listCiclos({ estado } = {}) {
    this.init();

    return [...getStore().academicCiclos.values()].filter((ciclo) => {
      if (estado && estado !== "todos" && ciclo.estado !== estado) {
        return false;
      }

      return true;
    }).map(clone);
  },

  updateCiclo(id, cambios) {
    this.init();
    const ciclo = getStore().academicCiclos.get(id);

    if (!ciclo) {
      return null;
    }

    Object.assign(ciclo, cambios, { actualizadoEn: new Date().toISOString() });

    if (ciclo.estado === "activo") {
      ciclo.fechaBaja = null;
    }

    return clone(ciclo);
  },

  deactivateCiclo(id) {
    this.init();
    const ciclo = getStore().academicCiclos.get(id);

    if (!ciclo) {
      return null;
    }

    ciclo.estado = "inactivo";
    ciclo.fechaBaja = new Date().toISOString();
    ciclo.actualizadoEn = ciclo.fechaBaja;
    return clone(ciclo);
  },

  /* ---------------- Orientaciones ----------------------------------------- */

  createOrientacion(data) {
    this.init();
    const record = {
      id: data.id ?? generateId("ori"),
      nombre: data.nombre,
      descripcion: data.descripcion ?? null,
      estado: data.estado ?? "activo",
      createdBy: data.createdBy ?? null,
      creadoEn: new Date().toISOString(),
      actualizadoEn: new Date().toISOString(),
      fechaBaja: data.fechaBaja ?? null
    };
    getStore().academicOrientaciones.set(record.id, record);
    return clone(record);
  },

  findOrientacionById(id) {
    this.init();
    const orientacion = getStore().academicOrientaciones.get(id);
    return orientacion ? clone(orientacion) : null;
  },

  findOrientacionByNombre(nombre) {
    this.init();
    const buscado = normalizarTexto(nombre);

    for (const orientacion of getStore().academicOrientaciones.values()) {
      if (normalizarTexto(orientacion.nombre) === buscado) {
        return clone(orientacion);
      }
    }

    return null;
  },

  listOrientaciones({ estado } = {}) {
    this.init();

    return [...getStore().academicOrientaciones.values()].filter((orientacion) => {
      if (estado && estado !== "todos" && orientacion.estado !== estado) {
        return false;
      }

      return true;
    }).map(clone);
  },

  updateOrientacion(id, cambios) {
    this.init();
    const orientacion = getStore().academicOrientaciones.get(id);

    if (!orientacion) {
      return null;
    }

    Object.assign(orientacion, cambios, { actualizadoEn: new Date().toISOString() });

    if (orientacion.estado === "activo") {
      orientacion.fechaBaja = null;
    }

    return clone(orientacion);
  },

  deactivateOrientacion(id) {
    this.init();
    const orientacion = getStore().academicOrientaciones.get(id);

    if (!orientacion) {
      return null;
    }

    orientacion.estado = "inactivo";
    orientacion.fechaBaja = new Date().toISOString();
    orientacion.actualizadoEn = orientacion.fechaBaja;
    return clone(orientacion);
  },

  /* ---------------- Cursos ------------------------------------------------ */

  createCurso(data) {
    this.init();
    const record = {
      id: data.id ?? generateId("cur"),
      escuelaId: data.escuelaId,
      anio: data.anio,
      turno: data.turno,
      cicloId: data.cicloId,
      orientacionId: data.orientacionId ?? null,
      estado: data.estado ?? "activo",
      createdBy: data.createdBy ?? null,
      creadoEn: new Date().toISOString(),
      actualizadoEn: new Date().toISOString(),
      fechaBaja: data.fechaBaja ?? null
    };
    getStore().academicCursos.set(record.id, record);
    return clone(record);
  },

  findCursoById(id) {
    this.init();
    const curso = getStore().academicCursos.get(id);
    return curso ? clone(curso) : null;
  },

  findCursoDuplicado({ escuelaId, anio, turno, orientacionId }) {
    this.init();
    const orientacion = orientacionId ?? null;

    for (const curso of getStore().academicCursos.values()) {
      if (
        curso.escuelaId === escuelaId &&
        curso.anio === anio &&
        curso.turno === turno &&
        (curso.orientacionId ?? null) === orientacion
      ) {
        return clone(curso);
      }
    }

    return null;
  },

  listCursos({ escuelaId, cicloId, anio, turno, orientacionId, estado } = {}) {
    this.init();

    return [...getStore().academicCursos.values()].filter((curso) => {
      if (escuelaId && curso.escuelaId !== escuelaId) {
        return false;
      }

      if (cicloId && curso.cicloId !== cicloId) {
        return false;
      }

      if (anio !== undefined && anio !== null && curso.anio !== anio) {
        return false;
      }

      if (turno && curso.turno !== turno) {
        return false;
      }

      if (orientacionId !== undefined && orientacionId !== null && (curso.orientacionId ?? null) !== orientacionId) {
        return false;
      }

      if (estado && estado !== "todos" && curso.estado !== estado) {
        return false;
      }

      return true;
    }).map(clone);
  },

  updateCurso(id, cambios) {
    this.init();
    const curso = getStore().academicCursos.get(id);

    if (!curso) {
      return null;
    }

    Object.assign(curso, cambios, { actualizadoEn: new Date().toISOString() });

    if (curso.estado === "activo") {
      curso.fechaBaja = null;
    }

    return clone(curso);
  },

  deactivateCurso(id) {
    this.init();
    const curso = getStore().academicCursos.get(id);

    if (!curso) {
      return null;
    }

    curso.estado = "inactivo";
    curso.fechaBaja = new Date().toISOString();
    curso.actualizadoEn = curso.fechaBaja;
    return clone(curso);
  },

  /* ---------------- Divisiones -------------------------------------------- */

  createDivision(data) {
    this.init();
    const record = {
      id: data.id ?? generateId("div"),
      escuelaId: data.escuelaId,
      cursoId: data.cursoId,
      nombre: data.nombre,
      estado: data.estado ?? "activo",
      createdBy: data.createdBy ?? null,
      creadoEn: new Date().toISOString(),
      actualizadoEn: new Date().toISOString(),
      fechaBaja: data.fechaBaja ?? null
    };
    getStore().academicDivisiones.set(record.id, record);
    return clone(record);
  },

  findDivisionById(id) {
    this.init();
    const division = getStore().academicDivisiones.get(id);
    return division ? clone(division) : null;
  },

  findDivisionEnCurso(cursoId, nombre) {
    this.init();
    const buscado = normalizarTexto(nombre);

    for (const division of getStore().academicDivisiones.values()) {
      if (division.cursoId === cursoId && normalizarTexto(division.nombre) === buscado) {
        return clone(division);
      }
    }

    return null;
  },

  listDivisiones({ escuelaId, cursoId, cicloId, anio, turno, orientacionId, estado } = {}) {
    this.init();

    const cursos = new Map([...getStore().academicCursos.values()].map((curso) => [curso.id, curso]));

    return [...getStore().academicDivisiones.values()].filter((division) => {
      if (escuelaId && division.escuelaId !== escuelaId) {
        return false;
      }

      if (cursoId && division.cursoId !== cursoId) {
        return false;
      }

      if (cicloId || anio !== undefined || turno || orientacionId !== undefined) {
        const curso = cursos.get(division.cursoId);

        if (!curso) {
          return false;
        }

        if (cicloId && curso.cicloId !== cicloId) {
          return false;
        }

        if (anio !== undefined && anio !== null && curso.anio !== anio) {
          return false;
        }

        if (turno && curso.turno !== turno) {
          return false;
        }

        if (orientacionId !== undefined && orientacionId !== null && (curso.orientacionId ?? null) !== orientacionId) {
          return false;
        }
      }

      if (estado && estado !== "todos" && division.estado !== estado) {
        return false;
      }

      return true;
    }).map(clone);
  },

  updateDivision(id, cambios) {
    this.init();
    const division = getStore().academicDivisiones.get(id);

    if (!division) {
      return null;
    }

    Object.assign(division, cambios, { actualizadoEn: new Date().toISOString() });

    if (division.estado === "activo") {
      division.fechaBaja = null;
    }

    return clone(division);
  },

  deactivateDivision(id) {
    this.init();
    const division = getStore().academicDivisiones.get(id);

    if (!division) {
      return null;
    }

    division.estado = "inactivo";
    division.fechaBaja = new Date().toISOString();
    division.actualizadoEn = division.fechaBaja;
    return clone(division);
  },

  /* ---------------- Relaciones (matricula, materias, docentes, horarios) -- */

  crearMatricula(data) {
    this.init();
    const record = {
      id: data.id ?? generateId("mat"),
      estudianteId: data.estudianteId,
      divisionId: data.divisionId,
      isActive: data.isActive ?? true,
      creadoEn: new Date().toISOString(),
      hasta: null
    };
    getStore().academicMatricula.set(record.id, record);
    return clone(record);
  },

  listMatricula({ divisionId, cursoId } = {}) {
    this.init();

    let divisionesDelCurso = null;

    if (cursoId) {
      divisionesDelCurso = this.listDivisiones({ cursoId }).map((division) => division.id);
    }

    return [...getStore().academicMatricula.values()].filter((matricula) => {
      if (divisionId && matricula.divisionId !== divisionId) {
        return false;
      }

      if (cursoId && !divisionesDelCurso.includes(matricula.divisionId)) {
        return false;
      }

      return true;
    }).map(clone);
  },

  crearSubjectRelation(data) {
    this.init();
    const record = {
      id: data.id ?? generateId("asubj"),
      tipo: data.tipo,
      scopeId: data.scopeId,
      subjectId: data.subjectId,
      isActive: data.isActive ?? true,
      creadoEn: new Date().toISOString()
    };
    getStore().academicSubjectRelations.set(record.id, record);
    return clone(record);
  },

  listSubjectRelations({ tipo, scopeId } = {}) {
    this.init();

    return [...getStore().academicSubjectRelations.values()].filter((relacion) => {
      if (!relacion.isActive) {
        return false;
      }

      if (tipo && relacion.tipo !== tipo) {
        return false;
      }

      if (scopeId && relacion.scopeId !== scopeId) {
        return false;
      }

      return true;
    }).map(clone);
  },

  crearTeacherRelation(data) {
    this.init();
    const record = {
      id: data.id ?? generateId("adoc"),
      tipo: data.tipo,
      scopeId: data.scopeId,
      teacherId: data.teacherId,
      isActive: data.isActive ?? true,
      creadoEn: new Date().toISOString()
    };
    getStore().academicTeacherRelations.set(record.id, record);
    return clone(record);
  },

  listTeacherRelations({ tipo, scopeId } = {}) {
    this.init();

    return [...getStore().academicTeacherRelations.values()].filter((relacion) => {
      if (!relacion.isActive) {
        return false;
      }

      if (tipo && relacion.tipo !== tipo) {
        return false;
      }

      if (scopeId && relacion.scopeId !== scopeId) {
        return false;
      }

      return true;
    }).map(clone);
  },

  crearScheduleRelation(data) {
    this.init();
    const record = {
      id: data.id ?? generateId("ahor"),
      tipo: data.tipo,
      scopeId: data.scopeId,
      scheduleId: data.scheduleId,
      isActive: data.isActive ?? true,
      creadoEn: new Date().toISOString()
    };
    getStore().academicScheduleRelations.set(record.id, record);
    return clone(record);
  },

  listScheduleRelations({ tipo, scopeId } = {}) {
    this.init();

    return [...getStore().academicScheduleRelations.values()].filter((relacion) => {
      if (!relacion.isActive) {
        return false;
      }

      if (tipo && relacion.tipo !== tipo) {
        return false;
      }

      if (scopeId && relacion.scopeId !== scopeId) {
        return false;
      }

      return true;
    }).map(clone);
  },

  /* ---------------- Auditoria --------------------------------------------- */

  registrarAuditoria(entrada) {
    this.init();
    getStore().academicAudit.push({
      id: generateId("au_acad"),
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
    return getStore().academicAudit.map(clone);
  }
};

export default academicRepository;