import { getStore } from "../../database/memory-store.mjs";
import { userRepository } from "../../database/repositories/user.repository.mjs";
import studentRepository from "../students/students.repository.mjs";
import { normalizarTexto } from "./catalogo.mjs";

/* Repositorio de promocion y cambio de curso.

   Un movimiento es inmutable: se crea, se consulta y jamas se modifica ni se
   borra (el historial no se sobrescribe). Cuelga del alumno y guarda un resumen
   de su identidad (`alumno` como "Apellido, Nombre" y `dni`); los alumnos se leen
   del modulo students (unica fuente) y los responsables del modulo auth, por id.

   Las operaciones masivas se guardan por separado (`operacionId`) para conservar
   la trazabilidad de que movimientos comparten una misma carga. */

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

const courseChangesRepository = {
  init() {
    const store = getStore();
    store.courseChangesMovimientos ??= new Map();
    store.courseChangesOperaciones ??= new Map();
    store.courseChangesAudit ??= [];
  },

  resetData() {
    this.init();
    const store = getStore();
    store.courseChangesMovimientos.clear();
    store.courseChangesOperaciones.clear();
    store.courseChangesAudit.length = 0;
  },

  /* ---------------- Referencias de catalogo ------------------------------- */

  findStudentRefById(id) {
    const alumno = studentRepository.findById(id);
    return alumno
      ? {
          id: alumno.id,
          escuelaId: alumno.escuelaId,
          apellido: alumno.apellido,
          nombre: alumno.nombre,
          dni: alumno.dni,
          curso: alumno.curso,
          division: alumno.division,
          turno: alumno.turno,
          orientacion: alumno.orientacion
        }
      : null;
  },

  /* El responsable se busca incluyendo cuentas inactivas: un movimiento ya
     registrado debe conservar quien lo hizo aunque la cuenta se desactive. */
  findUserRefById(id) {
    const usuario = id ? userRepository.findById(id, { includeInactive: true }) : null;
    return usuario ? { id: usuario.id, displayName: usuario.displayName, email: usuario.email } : null;
  },

  /* ---------------- Movimientos ------------------------------------------- */

  actualizarUbicacionDelAlumno(alumnoId, { curso, division, turno, orientacion }) {
    return studentRepository.update(alumnoId, { curso, division, turno, orientacion });
  },

  crearMovimiento(data) {
    this.init();
    const record = {
      id: data.id ?? generateId("mc"),
      escuelaId: data.escuelaId,
      alumnoId: data.alumnoId,
      alumno: data.alumno,
      dni: data.dni ?? null,
      cursoAnterior: data.cursoAnterior,
      divisionAnterior: data.divisionAnterior,
      turnoAnterior: data.turnoAnterior ?? null,
      orientacionAnterior: data.orientacionAnterior ?? null,
      cursoNuevo: data.cursoNuevo,
      divisionNueva: data.divisionNueva,
      turnoNuevo: data.turnoNuevo ?? null,
      orientacionNueva: data.orientacionNueva ?? null,
      tipo: data.tipo,
      anio: data.anio,
      cuatrimestre: data.cuatrimestre ?? null,
      fecha: data.fecha,
      motivo: data.motivo ?? null,
      responsableId: data.responsableId,
      responsable: data.responsable,
      operacionId: data.operacionId ?? null,
      creadoEn: data.creadoEn ?? new Date().toISOString()
    };
    getStore().courseChangesMovimientos.set(record.id, record);
    return cloneDeep(record);
  },

  findMovimientoById(id) {
    this.init();
    const record = getStore().courseChangesMovimientos.get(id);
    return record ? cloneDeep(record) : null;
  },

  /* Solo lo usa el rollback de una operacion masiva que falla a mitad de camino;
     en operacion normal un movimiento jamás se elimina. */
  eliminarMovimiento(id) {
    this.init();
    getStore().courseChangesMovimientos.delete(id);
  },

  listMovimientos({
    escuelaId,
    alumnoId,
    tipo,
    anio,
    cuatrimestre,
    curso,
    division,
    desde,
    hasta,
    operacionId,
    q
  } = {}) {
    this.init();
    const busqueda = q ? normalizarTexto(q) : null;

    return [...getStore().courseChangesMovimientos.values()]
      .filter((record) => {
        if (escuelaId && record.escuelaId !== escuelaId) return false;
        if (alumnoId && record.alumnoId !== alumnoId) return false;
        if (tipo && record.tipo !== tipo) return false;
        if (anio !== undefined && anio !== null && record.anio !== anio) return false;
        if (cuatrimestre !== undefined && cuatrimestre !== null && (record.cuatrimestre ?? null) !== cuatrimestre) return false;
        if (curso !== undefined && curso !== null && record.cursoNuevo !== curso) return false;
        if (division && record.divisionNueva !== division) return false;
        if (desde && record.fecha < desde) return false;
        if (hasta && record.fecha > hasta) return false;
        if (operacionId && record.operacionId !== operacionId) return false;

        if (busqueda) {
          const texto = normalizarTexto(`${record.alumno ?? ""} ${record.dni ?? ""}`);
          if (!texto.includes(busqueda)) return false;
        }

        return true;
      })
      .map((record) => cloneDeep({ ...record, alumnoSort: normalizarTexto(record.alumno) }));
  },

  /* ---------------- Operaciones masivas ------------------------------------ */

  crearOperacionMasiva(data) {
    this.init();
    const record = {
      id: data.id ?? generateId("opr"),
      escuelaId: data.escuelaId,
      tipo: data.tipo,
      anio: data.anio,
      cuatrimestre: data.cuatrimestre ?? null,
      fecha: data.fecha,
      motivo: data.motivo ?? null,
      responsableId: data.responsableId,
      responsable: data.responsable,
      movimientos: Array.isArray(data.movimientos) ? data.movimientos : [],
      resumen: {
        total: data.resumen?.total ?? 0,
        exitosos: data.resumen?.exitosos ?? 0,
        fallidos: data.resumen?.fallidos ?? 0
      },
      creadoEn: data.creadoEn ?? new Date().toISOString()
    };
    getStore().courseChangesOperaciones.set(record.id, record);
    return cloneDeep(record);
  },

  findOperacionById(id) {
    this.init();
    const record = getStore().courseChangesOperaciones.get(id);
    return record ? cloneDeep(record) : null;
  },

  /* ---------------- Auditoria ---------------------------------------------- */

  registrarAuditoria(entrada) {
    this.init();
    getStore().courseChangesAudit.push({
      id: generateId("au_mc"),
      accion: entrada.accion,
      actorId: entrada.actorId ?? null,
      entidad: entrada.entidad ?? "movimiento_curso",
      entidadId: entrada.entidadId,
      antes: entrada.antes ?? null,
      despues: entrada.despues ?? null,
      momento: new Date().toISOString()
    });
  },

  listarAuditoria() {
    this.init();
    return getStore().courseChangesAudit.map(cloneDeep);
  }
};

export default courseChangesRepository;