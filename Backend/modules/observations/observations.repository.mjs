import { getStore } from "../../database/memory-store.mjs";
import { userRepository } from "../../database/repositories/user.repository.mjs";
import studentRepository from "../students/students.repository.mjs";
import { normalizarTexto } from "./catalogo.mjs";

/* Repositorio de observaciones de alumnos.

   Una observacion cuelga de un alumno y guarda un resumen de su identidad
   (`alumno` como "Apellido, Nombre" y `dni`) para no depender del padron al
   mostrarla. Sobre cada observacion cuelgan acciones de seguimiento.

   Los alumnos se leen del modulo students (unica fuente) y los responsables del
   modulo auth, por id: este repositorio no guarda copias propias de ninguno de
   los dos. Persiste en el store en memoria, como el resto de los modulos. */

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

const observationsRepository = {
  init() {
    const store = getStore();
    store.observations ??= new Map();
    store.observationFollowups ??= new Map();
    store.observationsAudit ??= [];
  },

  resetData() {
    this.init();
    getStore().observations.clear();
    getStore().observationFollowups.clear();
    getStore().observationsAudit.length = 0;
  },

  /* ---------------- Referencias de catalogo --------------------------------- */

  findStudentRefById(id) {
    const alumno = studentRepository.findById(id);
    return alumno
      ? { id: alumno.id, escuelaId: alumno.escuelaId, apellido: alumno.apellido, nombre: alumno.nombre, dni: alumno.dni }
      : null;
  },

  /* El responsable se busca incluyendo cuentas inactivas: una observacion ya
     registrada tiene que conservar quien la hizo aunque la cuenta se desactive. */
  findUserRefById(id) {
    const usuario = id ? userRepository.findById(id, { includeInactive: true }) : null;
    return usuario ? { id: usuario.id, displayName: usuario.displayName, email: usuario.email } : null;
  },

  /* ---------------- Observaciones ------------------------------------------ */

  createObservation(data) {
    this.init();
    const ahora = new Date().toISOString();
    const record = {
      id: data.id ?? generateId("obs"),
      escuelaId: data.escuelaId,
      alumnoId: data.alumnoId,
      alumno: data.alumno,
      dni: data.dni ?? null,
      fecha: data.fecha,
      tipo: data.tipo,
      descripcion: data.descripcion,
      sector: data.sector ?? null,
      estado: data.estado,
      responsable: data.responsable,
      historial: Array.isArray(data.historial) ? data.historial : [],
      creadoEn: data.creadoEn ?? ahora,
      creadoPor: data.creadoPor ?? null,
      actualizadoEn: data.actualizadoEn ?? ahora,
      actualizadoPor: data.actualizadoPor ?? null
    };
    getStore().observations.set(record.id, record);
    return cloneDeep(record);
  },

  findObservationById(id) {
    this.init();
    const record = getStore().observations.get(id);
    return record ? cloneDeep(record) : null;
  },

  listObservations({ escuelaId, alumnoId, tipo, estado, sector, desde, hasta, q } = {}) {
    this.init();
    const busqueda = q ? normalizarTexto(q) : null;

    return [...getStore().observations.values()]
      .filter((record) => {
        if (escuelaId && record.escuelaId !== escuelaId) return false;
        if (alumnoId && record.alumnoId !== alumnoId) return false;
        if (tipo && record.tipo !== tipo) return false;
        if (estado && record.estado !== estado) return false;
        if (sector && normalizarTexto(record.sector) !== normalizarTexto(sector)) return false;
        if (desde && record.fecha < desde) return false;
        if (hasta && record.fecha > hasta) return false;

        if (busqueda) {
          const texto = normalizarTexto(`${record.alumno ?? ""} ${record.dni ?? ""} ${record.descripcion ?? ""} ${record.sector ?? ""}`);
          if (!texto.includes(busqueda)) return false;
        }

        return true;
      })
      .map((record) => cloneDeep({ ...record, alumnoSort: normalizarTexto(record.alumno) }));
  },

  updateObservation(id, cambios, antes) {
    this.init();
    const record = getStore().observations.get(id);

    if (!record) {
      return null;
    }

    const historial = [...record.historial];

    if (antes) {
      historial.push(cloneDeep(antes));
    }

    Object.assign(record, cambios, { historial, actualizadoEn: new Date().toISOString() });

    return cloneDeep(record);
  },

  /* ---------------- Seguimientos de una observacion ------------------------ */

  createSeguimiento(data) {
    this.init();
    const ahora = new Date().toISOString();
    const record = {
      id: data.id ?? generateId("oseg"),
      observacionId: data.observacionId,
      escuelaId: data.escuelaId,
      fecha: data.fecha,
      accion: data.accion,
      observaciones: data.observaciones ?? null,
      estado: data.estado,
      fechaCierre: data.fechaCierre ?? null,
      responsableId: data.responsableId,
      historial: Array.isArray(data.historial) ? data.historial : [],
      creadoEn: data.creadoEn ?? ahora,
      creadoPor: data.creadoPor ?? data.responsableId ?? null,
      actualizadoEn: data.actualizadoEn ?? ahora,
      actualizadoPor: data.actualizadoPor ?? null
    };
    getStore().observationFollowups.set(record.id, record);
    return cloneDeep(record);
  },

  findSeguimientoById(id) {
    this.init();
    const record = getStore().observationFollowups.get(id);
    return record ? cloneDeep(record) : null;
  },

  listSeguimientos({ observacionId, escuelaId, estado, responsableId, desde, hasta } = {}) {
    this.init();

    return [...getStore().observationFollowups.values()]
      .filter((record) => {
        if (observacionId && record.observacionId !== observacionId) return false;
        if (escuelaId && record.escuelaId !== escuelaId) return false;
        if (estado && record.estado !== estado) return false;
        if (responsableId && record.responsableId !== responsableId) return false;
        if (desde && record.fecha < desde) return false;
        if (hasta && record.fecha > hasta) return false;
        return true;
      })
      .map((record) => cloneDeep(record));
  },

  updateSeguimiento(id, cambios, antes) {
    this.init();
    const record = getStore().observationFollowups.get(id);

    if (!record) {
      return null;
    }

    const historial = [...record.historial];

    if (antes) {
      historial.push(cloneDeep(antes));
    }

    Object.assign(record, cambios, { historial, actualizadoEn: new Date().toISOString() });

    return cloneDeep(record);
  },

  /* ---------------- Auditoria ---------------------------------------------- */

  registrarAuditoria(entrada) {
    this.init();
    getStore().observationsAudit.push({
      id: generateId("au_obs"),
      accion: entrada.accion,
      actorId: entrada.actorId ?? null,
      entidad: entrada.entidad ?? "observacion",
      entidadId: entrada.entidadId,
      antes: entrada.antes ?? null,
      despues: entrada.despues ?? null,
      momento: new Date().toISOString()
    });
  },

  listarAuditoria() {
    this.init();
    return getStore().observationsAudit.map(cloneDeep);
  }
};

export default observationsRepository;
