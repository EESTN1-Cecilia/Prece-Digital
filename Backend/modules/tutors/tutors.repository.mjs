import { getStore } from "../../database/memory-store.mjs";

function generateId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function clone(value) {
  return { ...value };
}

/* Comparacion sin tildes: "perez" matchea "Pérez". */
function sinTildes(texto) {
  return String(texto ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

/* Vista publica de un tutor: nunca expone campos internos ni del actor. */
function publicTutor(tutor) {
  return {
    id: tutor.id,
    apellido: tutor.apellido,
    nombre: tutor.nombre,
    dni: tutor.dni,
    telefono: tutor.telefono,
    email: tutor.email,
    direccion: tutor.direccion,
    escuelaId: tutor.escuelaId,
    estado: tutor.isActive ? "activo" : "inactivo",
    creadoEn: tutor.creadoEn,
    actualizadoEn: tutor.actualizadoEn,
    fechaBaja: tutor.fechaBaja ?? null
  };
}

/* Vista publica de una relacion tutor/alumno. */
function publicRelation(relation) {
  return {
    id: relation.id,
    studentId: relation.studentId,
    tutorId: relation.tutorId,
    parentesco: relation.parentesco,
    responsablePrincipal: relation.responsablePrincipal,
    autorizadoRetiro: relation.autorizadoRetiro,
    estado: relation.isActive ? "activo" : "inactivo",
    creadoEn: relation.creadoEn,
    actualizadoEn: relation.actualizadoEn,
    desvinculadoEn: relation.desvinculadoEn ?? null
  };
}

const tutorsRepository = {
  init() {
    const store = getStore();

    if (!store.tutors) {
      store.tutors = new Map();
    }

    if (!store.tutorStudentRelations) {
      store.tutorStudentRelations = new Map();
    }

    if (!store.tutorsAudit) {
      store.tutorsAudit = [];
    }
  },

  resetData() {
    this.init();
    const store = getStore();
    store.tutors.clear();
    store.tutorStudentRelations.clear();
    store.tutorsAudit.length = 0;
  },

  createTutor(data) {
    this.init();
    const record = {
      id: data.id ?? generateId("tut"),
      apellido: data.apellido,
      nombre: data.nombre,
      dni: data.dni,
      telefono: data.telefono ?? null,
      email: data.email ?? null,
      direccion: data.direccion ?? null,
      escuelaId: data.escuelaId ?? null,
      isActive: data.isActive ?? true,
      createdBy: data.createdBy ?? null,
      creadoEn: new Date().toISOString(),
      actualizadoEn: new Date().toISOString(),
      fechaBaja: data.fechaBaja ?? null
    };
    getStore().tutors.set(record.id, record);
    return publicTutor(record);
  },

  findTutorById(id) {
    this.init();
    const tutor = getStore().tutors.get(id);
    return tutor ? { ...tutor } : null;
  },

  findTutorByDni(dni, escuelaId) {
    this.init();

    for (const tutor of getStore().tutors.values()) {
      if (tutor.dni === dni && tutor.escuelaId === escuelaId) {
        return { ...tutor };
      }
    }

    return null;
  },

  listTutors({ escuelaId, apellido, nombre, dni, estado, incluirInactivos = false }) {
    this.init();

    return [...getStore().tutors.values()]
      .filter((tutor) => {
        if (!incluirInactivos && estado !== "todos" && estado !== "inactivo" && !tutor.isActive) {
          return false;
        }

        if (estado === "inactivo" && tutor.isActive) {
          return false;
        }

        if (escuelaId && tutor.escuelaId !== escuelaId) {
          return false;
        }

        if (apellido && !sinTildes(tutor.apellido).includes(sinTildes(apellido))) {
          return false;
        }

        if (nombre && !sinTildes(tutor.nombre).includes(sinTildes(nombre))) {
          return false;
        }

        if (dni && tutor.dni !== dni) {
          return false;
        }

        return true;
      })
      .map(publicTutor);
  },

  updateTutor(id, cambios) {
    this.init();
    const tutor = getStore().tutors.get(id);

    if (!tutor) {
      return null;
    }

    Object.assign(tutor, cambios, { actualizadoEn: new Date().toISOString() });
    return publicTutor(tutor);
  },

  deactivateTutor(id) {
    this.init();
    const tutor = getStore().tutors.get(id);

    if (!tutor) {
      return null;
    }

    tutor.isActive = false;
    tutor.fechaBaja = new Date().toISOString();
    tutor.actualizadoEn = tutor.fechaBaja;
    return publicTutor(tutor);
  },

  createRelation(data) {
    this.init();
    const record = {
      id: data.id ?? generateId("stu_tut"),
      studentId: data.studentId,
      tutorId: data.tutorId,
      parentesco: data.parentesco,
      responsablePrincipal: data.responsablePrincipal ?? false,
      autorizadoRetiro: data.autorizadoRetiro ?? false,
      isActive: data.isActive ?? true,
      createdBy: data.createdBy ?? null,
      creadoEn: new Date().toISOString(),
      actualizadoEn: new Date().toISOString(),
      desvinculadoEn: data.desvinculadoEn ?? null
    };
    getStore().tutorStudentRelations.set(record.id, record);
    return publicRelation(record);
  },

  findRelationById(id) {
    this.init();
    const relation = getStore().tutorStudentRelations.get(id);
    return relation ? { ...relation } : null;
  },

  findRelationByPair(studentId, tutorId) {
    this.init();

    for (const relation of getStore().tutorStudentRelations.values()) {
      if (relation.studentId === studentId && relation.tutorId === tutorId) {
        return { ...relation };
      }
    }

    return null;
  },

  listRelations({ studentId, tutorId, estado, incluirInactivas = false }) {
    this.init();

    return [...getStore().tutorStudentRelations.values()]
      .filter((relation) => {
        if (!incluirInactivas && estado !== "todos" && !relation.isActive) {
          return false;
        }

        if (estado === "inactivo" && relation.isActive) {
          return false;
        }

        if (studentId && relation.studentId !== studentId) {
          return false;
        }

        if (tutorId && relation.tutorId !== tutorId) {
          return false;
        }

        return true;
      })
      .map(publicRelation);
  },

  updateRelation(id, cambios) {
    this.init();
    const relation = getStore().tutorStudentRelations.get(id);

    if (!relation) {
      return null;
    }

    Object.assign(relation, cambios, { actualizadoEn: new Date().toISOString() });
    return publicRelation(relation);
  },

  unlinkRelation(id) {
    this.init();
    const relation = getStore().tutorStudentRelations.get(id);

    if (!relation) {
      return null;
    }

    relation.isActive = false;
    relation.desvinculadoEn = new Date().toISOString();
    relation.actualizadoEn = relation.desvinculadoEn;
    return publicRelation(relation);
  },

  registrarAuditoria(entrada) {
    this.init();
    getStore().tutorsAudit.push({
      id: generateId("aud_tut"),
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
    return getStore().tutorsAudit.map(clone);
  }
};

export default tutorsRepository;