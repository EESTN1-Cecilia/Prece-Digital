import { getStore } from "../../database/memory-store.mjs";
import { userRepository } from "../../database/repositories/user.repository.mjs";
import studentRepository from "../students/students.repository.mjs";
import { normalizarTexto } from "./catalogo.mjs";

/* Repositorio del seguimiento de inasistencias.

   Un registro es una intervencion sobre un alumno: alumno, fecha, tipo de accion,
   responsable, observaciones y las fechas de alta y ultima modificacion. Cada
   modificacion guarda el estado anterior en `historial`, de modo que el historial
   de intervenciones nunca pierde informacion.

   Los alumnos se leen del modulo students (unica fuente) y los responsables del
   modulo auth, por id: este repositorio no guarda copias propias de ninguno de
   los dos. Persiste en el store en memoria, como el resto de los modulos. */

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

const attendanceFollowupsRepository = {
  init() {
    const store = getStore();
    store.attendanceFollowups ??= new Map();
    store.attendanceFollowupsAudit ??= [];
  },

  resetData() {
    this.init();
    getStore().attendanceFollowups.clear();
    getStore().attendanceFollowupsAudit.length = 0;
  },

  /* ---------------- Referencias de catalogo --------------------------------- */

  findStudentRefById(id) {
    const alumno = studentRepository.findById(id);
    return alumno
      ? { id: alumno.id, escuelaId: alumno.escuelaId, apellido: alumno.apellido, nombre: alumno.nombre, dni: alumno.dni }
      : null;
  },

  /* El responsable se busca includiendo cuentas inactivas: un seguimiento ya
     registrado tiene que conservar quien lo hizo aunque la cuenta se desactive. */
  findUserRefById(id) {
    const usuario = id ? userRepository.findById(id, { includeInactive: true }) : null;
    return usuario ? { id: usuario.id, displayName: usuario.displayName, email: usuario.email } : null;
  },

  /* ---------------- Seguimientos ------------------------------------------- */

  createSeguimiento(data) {
    this.init();
    const ahora = new Date().toISOString();
    const record = {
      id: data.id ?? generateId("seg"),
      escuelaId: data.escuelaId,
      alumnoId: data.alumnoId,
      fecha: data.fecha,
      tipo: data.tipo,
      responsableId: data.responsableId,
      observaciones: data.observaciones,
      historial: Array.isArray(data.historial) ? data.historial : [],
      creadoEn: data.creadoEn ?? ahora,
      creadoPor: data.creadoPor ?? data.responsableId ?? null,
      actualizadoEn: ahora,
      actualizadoPor: data.actualizadoPor ?? null
    };
    getStore().attendanceFollowups.set(record.id, record);
    return cloneDeep(record);
  },

  findSeguimientoById(id) {
    this.init();
    const record = getStore().attendanceFollowups.get(id);
    return record ? cloneDeep(record) : null;
  },

  listSeguimientos({ escuelaId, alumnoId, tipo, responsableId, desde, hasta } = {}) {
    this.init();

    return [...getStore().attendanceFollowups.values()]
      .filter((record) => {
        if (escuelaId && record.escuelaId !== escuelaId) {
          return false;
        }

        if (alumnoId && record.alumnoId !== alumnoId) {
          return false;
        }

        if (tipo && record.tipo !== tipo) {
          return false;
        }

        if (responsableId && record.responsableId !== responsableId) {
          return false;
        }

        if (desde && record.fecha < desde) {
          return false;
        }

        if (hasta && record.fecha > hasta) {
          return false;
        }

        return true;
      })
      .map((record) => {
        const alumno = this.findStudentRefById(record.alumnoId);

        return cloneDeep({
          ...record,
          alumnoSort: normalizarTexto(`${alumno?.apellido ?? ""} ${alumno?.nombre ?? ""}`)
        });
      });
  },

  /* Ultima intervencion registrada de un alumno: la de fecha mas reciente y, a
     igual fecha, la creada mas tarde. */
  findUltimoDeAlumno(alumnoId) {
    this.init();

    let ultimo = null;

    for (const record of getStore().attendanceFollowups.values()) {
      if (record.alumnoId !== alumnoId) {
        continue;
      }

      if (
        !ultimo ||
        record.fecha > ultimo.fecha ||
        (record.fecha === ultimo.fecha && record.creadoEn > ultimo.creadoEn)
      ) {
        ultimo = record;
      }
    }

    return ultimo ? cloneDeep(ultimo) : null;
  },

  /* Alumnos con al menos un seguimiento, con la cantidad de intervenciones y la
     fecha de la ultima. Es la consulta que permite saber a quien hay que llamar. */
  listarAlumnosConSeguimientos({ escuelaId } = {}) {
    this.init();

    const porAlumno = new Map();

    for (const record of getStore().attendanceFollowups.values()) {
      if (escuelaId && record.escuelaId !== escuelaId) {
        continue;
      }

      const actual = porAlumno.get(record.alumnoId);

      if (!actual) {
        porAlumno.set(record.alumnoId, { alumnoId: record.alumnoId, total: 1, ultimaFecha: record.fecha });
        continue;
      }

      actual.total += 1;

      if (record.fecha > actual.ultimaFecha) {
        actual.ultimaFecha = record.fecha;
      }
    }

    return [...porAlumno.values()].map((item) => {
      const alumno = this.findStudentRefById(item.alumnoId);

      return {
        alumnoId: item.alumnoId,
        total: item.total,
        ultimaFecha: item.ultimaFecha,
        alumno: alumno
          ? { id: alumno.id, apellido: alumno.apellido, nombre: alumno.nombre, dni: alumno.dni }
          : { id: item.alumnoId },
        alumnoSort: normalizarTexto(`${alumno?.apellido ?? ""} ${alumno?.nombre ?? ""}`)
      };
    });
  },

  updateSeguimiento(id, cambios, antes) {
    this.init();
    const record = getStore().attendanceFollowups.get(id);

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

  /* ---------------- Auditoria ---------------------------------------------- */

  registrarAuditoria(entrada) {
    this.init();
    getStore().attendanceFollowupsAudit.push({
      id: generateId("au_seg"),
      accion: entrada.accion,
      actorId: entrada.actorId ?? null,
      entidad: "seguimiento_inasistencia",
      entidadId: entrada.entidadId,
      antes: entrada.antes ?? null,
      despues: entrada.despues ?? null,
      momento: new Date().toISOString()
    });
  },

  listarAuditoria() {
    this.init();
    return getStore().attendanceFollowupsAudit.map(cloneDeep);
  }
};

export default attendanceFollowupsRepository;
