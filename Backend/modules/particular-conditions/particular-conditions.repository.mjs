import { getStore } from "../../database/memory-store.mjs";
import { userRepository } from "../../database/repositories/user.repository.mjs";
import studentRepository from "../students/students.repository.mjs";
import { ESTADO_ACTIVA, normalizarTexto } from "./catalogo.mjs";

/* Repositorio de condiciones particulares.

   Una condicion cuelga de un alumno y guarda un resumen de su identidad
   (`alumno` como "Apellido, Nombre" y `dni`) para no depender del padron al
   mostrarla. Los alumnos se leen del modulo students (unica fuente) y los
   responsables del modulo auth, por id: este repositorio no guarda copias
   propias de ninguno de los dos. Persiste en el store en memoria, como el resto
   de los modulos. */

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

const particularConditionsRepository = {
  init() {
    const store = getStore();
    store.particularConditions ??= new Map();
    store.particularConditionsAudit ??= [];
  },

  resetData() {
    this.init();
    getStore().particularConditions.clear();
    getStore().particularConditionsAudit.length = 0;
  },

  /* ---------------- Referencias de catalogo --------------------------------- */

  findStudentRefById(id) {
    const alumno = studentRepository.findById(id);
    return alumno
      ? { id: alumno.id, escuelaId: alumno.escuelaId, apellido: alumno.apellido, nombre: alumno.nombre, dni: alumno.dni }
      : null;
  },

  /* El responsable se busca incluyendo cuentas inactivas: una condicion ya
     registrada tiene que conservar quien la hizo aunque la cuenta se desactive. */
  findUserRefById(id) {
    const usuario = id ? userRepository.findById(id, { includeInactive: true }) : null;
    return usuario ? { id: usuario.id, displayName: usuario.displayName, email: usuario.email } : null;
  },

  /* ---------------- Condiciones -------------------------------------------- */

  createCondition(data) {
    this.init();
    const ahora = new Date().toISOString();
    const record = {
      id: data.id ?? generateId("cond"),
      escuelaId: data.escuelaId,
      alumnoId: data.alumnoId,
      alumno: data.alumno,
      dni: data.dni ?? null,
      descripcion: data.descripcion,
      fechaInicio: data.fechaInicio,
      estado: data.estado,
      responsableId: data.responsableId,
      responsable: data.responsable,
      fechaFinalizacion: data.fechaFinalizacion ?? null,
      finalizadoPor: data.finalizadoPor ?? null,
      historial: Array.isArray(data.historial) ? data.historial : [],
      creadoEn: data.creadoEn ?? ahora,
      creadoPor: data.creadoPor ?? data.responsableId ?? null,
      actualizadoEn: data.actualizadoEn ?? ahora,
      actualizadoPor: data.actualizadoPor ?? null
    };
    getStore().particularConditions.set(record.id, record);
    return cloneDeep(record);
  },

  findConditionById(id) {
    this.init();
    const record = getStore().particularConditions.get(id);
    return record ? cloneDeep(record) : null;
  },

  /* Busca una condicion activa del mismo alumno con la misma descripcion
     (comparada sin tildes ni mayusculas) para evitar duplicados. Excluye un id
     para poder usarla tambien al modificar o reactivar. */
  findActiveDuplicate({ alumnoId, descripcion, excludeId } = {}) {
    this.init();
    /* Misma descripcion sin importar tildes, mayusculas ni espacios repetidos. */
    const comparar = (texto) => normalizarTexto(texto).replace(/\s+/g, " ");
    const buscada = comparar(descripcion);

    return (
      [...getStore().particularConditions.values()].find(
        (record) =>
          record.alumnoId === alumnoId &&
          record.estado === ESTADO_ACTIVA &&
          record.id !== excludeId &&
          comparar(record.descripcion) === buscada
      ) ?? null
    );
  },

  listConditions({ escuelaId, alumnoId, estado, desde, hasta, q } = {}) {
    this.init();
    const busqueda = q ? normalizarTexto(q) : null;

    return [...getStore().particularConditions.values()]
      .filter((record) => {
        if (escuelaId && record.escuelaId !== escuelaId) return false;
        if (alumnoId && record.alumnoId !== alumnoId) return false;
        if (estado && record.estado !== estado) return false;
        if (desde && record.fechaInicio < desde) return false;
        if (hasta && record.fechaInicio > hasta) return false;

        if (busqueda) {
          const texto = normalizarTexto(`${record.alumno ?? ""} ${record.dni ?? ""} ${record.descripcion ?? ""}`);
          if (!texto.includes(busqueda)) return false;
        }

        return true;
      })
      .map((record) => cloneDeep({ ...record, alumnoSort: normalizarTexto(record.alumno) }));
  },

  updateCondition(id, cambios, antes) {
    this.init();
    const record = getStore().particularConditions.get(id);

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
    getStore().particularConditionsAudit.push({
      id: generateId("au_cond"),
      accion: entrada.accion,
      actorId: entrada.actorId ?? null,
      entidad: entrada.entidad ?? "condicion_particular",
      entidadId: entrada.entidadId,
      antes: entrada.antes ?? null,
      despues: entrada.despues ?? null,
      momento: new Date().toISOString()
    });
  },

  listarAuditoria() {
    this.init();
    return getStore().particularConditionsAudit.map(cloneDeep);
  }
};

export default particularConditionsRepository;
