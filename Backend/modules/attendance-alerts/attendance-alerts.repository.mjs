import { getStore } from "../../database/memory-store.mjs";
import { userRepository } from "../../database/repositories/user.repository.mjs";
import studentRepository from "../students/students.repository.mjs";
import { ROLES } from "../../config/permissions.config.mjs";
import { configuracionPorDefecto } from "./catalogo.mjs";

/* Repositorio del modulo de alertas por inasistencias consecutivas.

   Guarda tres cosas distintas y las mantiene separadas a proposito:

   - inasistencias: los registros que alimentan la deteccion,
   - alertas: las situaciones detectadas, con su clave de deduplicacion,
   - eventos: el contrato de salida hacia el sistema de notificaciones.

   Ninguna escritura de este repositorio dispara una notificacion: eso es
   trabajo de despacho-notificaciones.service.mjs. Asi la deteccion puede
   correr sin ningun canal de envio disponible. */

function generateId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function cloneDeep(valor) {
  return structuredClone(valor);
}

const attendanceAlertsRepository = {
  init() {
    const store = getStore();

    store.attendanceInasistencias ??= new Map();
    store.attendanceAlertas ??= new Map();
    store.attendanceAlertEventos ??= new Map();
    store.attendanceAlertConfig ??= new Map();
    store.attendanceAlertEvaluaciones ??= [];
    store.attendanceAlertsAudit ??= [];
  },

  resetData() {
    this.init();

    const store = getStore();
    store.attendanceInasistencias.clear();
    store.attendanceAlertas.clear();
    store.attendanceAlertEventos.clear();
    store.attendanceAlertConfig.clear();
    store.attendanceAlertEvaluaciones.length = 0;
    store.attendanceAlertsAudit.length = 0;
  },

  /* ---------------- Referencias de alumno y usuario --------------------------- */

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
          division: alumno.division
        }
      : null;
  },

  /* Preceptores activos de una escuela: son quienes deben enterarse de la
     situacion, porque son los que gestionan el contacto con la familia. Los roles
     no viven en el usuario sino en sus asignaciones, asi que se lee la vista
     publica que ya los expone. */
  findPreceptoresDe(escuelaId) {
    return userRepository
      .list()
      .map((usuario) => userRepository.publicView(usuario))
      .filter((usuario) => usuario.roles.includes(ROLES.PRECEPTOR))
      .filter((usuario) => usuario.assignments?.some((asignacion) => asignacion.schoolId === escuelaId))
      .map((usuario) => ({ id: usuario.id, displayName: usuario.displayName, email: usuario.email }));
  },

  /* ---------------- Configuracion por escuela --------------------------------- */

  findConfiguracion(escuelaId) {
    this.init();

    const guardada = getStore().attendanceAlertConfig.get(escuelaId);

    return guardada ? cloneDeep(guardada) : configuracionPorDefecto(escuelaId);
  },

  saveConfiguracion(configuracion) {
    this.init();

    const record = { ...configuracion, actualizadoEn: new Date().toISOString() };

    getStore().attendanceAlertConfig.set(record.escuelaId, record);

    return cloneDeep(record);
  },

  /* ---------------- Inasistencias --------------------------------------------- */

  createInasistencia(data) {
    this.init();

    const ahora = new Date().toISOString();
    const record = {
      id: data.id ?? generateId("ina"),
      escuelaId: data.escuelaId,
      alumnoId: data.alumnoId,
      fecha: data.fecha,
      tipo: data.tipo,
      justificada: data.justificada,
      motivo: data.motivo,
      observaciones: data.observaciones,
      bajaEn: null,
      bajaMotivo: null,
      bajaPor: null,
      registradoPor: data.registradoPor,
      creadoEn: ahora,
      actualizadoEn: ahora,
      actualizadoPor: data.registradoPor
    };

    getStore().attendanceInasistencias.set(record.id, record);

    return cloneDeep(record);
  },

  findInasistenciaById(id) {
    this.init();

    const record = getStore().attendanceInasistencias.get(id);

    return record ? cloneDeep(record) : null;
  },

  /* Una inasistencia por alumno y dia: el motor de deteccion asume que no hay
     dos registros para la misma fecha. */
  findInasistenciaVigenteDe(alumnoId, fecha) {
    this.init();

    for (const record of getStore().attendanceInasistencias.values()) {
      if (record.alumnoId === alumnoId && record.fecha === fecha && !record.bajaEn) {
        return cloneDeep(record);
      }
    }

    return null;
  },

  listInasistencias({ escuelaId, alumnoId, desde, hasta, tipo, justificada, incluirBajas = false } = {}) {
    this.init();

    return [...getStore().attendanceInasistencias.values()]
      .filter((record) => {
        if (!incluirBajas && record.bajaEn) return false;
        if (escuelaId && record.escuelaId !== escuelaId) return false;
        if (alumnoId && record.alumnoId !== alumnoId) return false;
        if (tipo && record.tipo !== tipo) return false;
        if (desde && record.fecha < desde) return false;
        if (hasta && record.fecha > hasta) return false;
        if (justificada !== undefined && record.justificada !== (justificada === true || justificada === "true")) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (a.fecha !== b.fecha) {
          return a.fecha < b.fecha ? 1 : -1;
        }
        return String(a.id).localeCompare(String(b.id));
      })
      .map(cloneDeep);
  },

  /* Inasistencias vigentes del alumno, ordenadas de la mas antigua a la mas
     reciente: es el orden en que las recorre el motor de deteccion. */
  inasistenciasDeAlumno(alumnoId) {
    this.init();

    return [...getStore().attendanceInasistencias.values()]
      .filter((record) => record.alumnoId === alumnoId && !record.bajaEn)
      .sort((a, b) => {
        if (a.fecha !== b.fecha) {
          return a.fecha < b.fecha ? -1 : 1;
        }
        return String(a.id).localeCompare(String(b.id));
      })
      .map(cloneDeep);
  },

  actualizarInasistencia(id, cambios, actor) {
    this.init();

    const record = getStore().attendanceInasistencias.get(id);

    if (!record) {
      return null;
    }

    Object.assign(record, cambios, {
      actualizadoEn: new Date().toISOString(),
      actualizadoPor: actor ?? record.registradoPor
    });

    return cloneDeep(record);
  },

  /* ---------------- Alertas ---------------------------------------------------- */

  crearAlerta(data) {
    this.init();

    const ahora = new Date().toISOString();
    const record = {
      id: data.id ?? generateId("alt"),
      escuelaId: data.escuelaId,
      alumnoId: data.alumnoId,
      condicion: data.condicion,
      condicionDescripcion: data.condicionDescripcion,
      clave: data.clave,
      cantidadInasistencias: data.cantidadInasistencias,
      diasConsecutivosExigidos: data.diasConsecutivosExigidos,
      periodoDesde: data.periodoDesde,
      periodoHasta: data.periodoHasta,
      dias: data.dias,
      inasistenciaIds: data.inasistenciaIds,
      inasistencias: data.inasistencias,
      detectadaEn: ahora,
      fechaDeteccion: ahora.slice(0, 10),
      generadaEn: ahora,
      generadaPor: data.generadaPor,
      disparador: data.disparador,
      configuracionAplicada: data.configuracionAplicada,
      estado: data.estado ?? "activa",
      observaciones: data.observaciones ?? null,
      seguimientoId: data.seguimientoId ?? null,
      eventoId: null,
      evento: null,
      notificacionesIds: [],
      historial: [],
      resueltaEn: null,
      resueltaPor: null
    };

    getStore().attendanceAlertas.set(record.id, record);

    return cloneDeep(record);
  },

  findAlertaById(id) {
    this.init();

    const record = getStore().attendanceAlertas.get(id);

    return record ? cloneDeep(record) : null;
  },

  findAlertaPorClave(clave) {
    this.init();

    for (const record of getStore().attendanceAlertas.values()) {
      if (record.clave === clave) {
        return cloneDeep(record);
      }
    }

    return null;
  },

  listAlertas({ escuelaId, alumnoId, estado, condicion, periodoDesde, periodoHasta, desde, hasta } = {}) {
    this.init();

    return [...getStore().attendanceAlertas.values()]
      .filter((record) => {
        if (escuelaId && record.escuelaId !== escuelaId) return false;
        if (alumnoId && record.alumnoId !== alumnoId) return false;
        if (estado && record.estado !== estado) return false;
        if (condicion && record.condicion !== condicion) return false;
        if (periodoDesde && record.periodoDesde < periodoDesde) return false;
        if (periodoHasta && record.periodoHasta > periodoHasta) return false;
        if (desde && record.generadaEn < desde) return false;
        if (hasta && record.generadaEn > hasta) return false;
        return true;
      })
      .sort((a, b) => {
        if (a.periodoHasta !== b.periodoHasta) {
          return a.periodoHasta < b.periodoHasta ? 1 : -1;
        }
        return String(a.id).localeCompare(String(b.id));
      })
      .map(cloneDeep);
  },

  vincularEvento(alertaId, evento, notificacionIds) {
    this.init();

    const record = getStore().attendanceAlertas.get(alertaId);

    if (!record) {
      return null;
    }

    record.eventoId = evento.id;
    record.evento = evento;
    record.notificacionesIds = notificacionIds;
    record.actualizadoEn = new Date().toISOString();

    return cloneDeep(record);
  },

  /* La situacion se registra antes de notificarse, asi que esta transicion queda
     en el historial de la alerta igual que cualquier otra. */
  actualizarAlerta(id, cambios, antes, actor) {
    this.init();

    const record = getStore().attendanceAlertas.get(id);

    if (!record) {
      return null;
    }

    if (antes) {
      record.historial.push({
        estado: antes.estado,
        observaciones: antes.observaciones,
        seguimientoId: antes.seguimientoId,
        cambiadoPor: antes.actualizadoPor,
        cambiadoEn: antes.actualizadoEn
      });
    }

    Object.assign(record, cambios, {
      actualizadoEn: new Date().toISOString(),
      actualizadoPor: actor ?? record.generadaPor
    });

    return cloneDeep(record);
  },

  /* ---------------- Eventos de notificacion ------------------------------------ */

  crearEvento(data) {
    this.init();

    const record = {
      id: data.id ?? generateId("evt"),
      alertaId: data.alertaId,
      escuelaId: data.escuelaId,
      alumnoId: data.alumnoId,
      tipoEvento: data.tipoEvento,
      destinatarios: data.destinatarios,
      tipoNotificacion: data.tipoNotificacion,
      mensaje: data.mensaje,
      prioridad: data.prioridad,
      canales: data.canales,
      estadoEnvio: "pendiente",
      generadoEn: data.generadoEn ?? new Date().toISOString(),
      enviadoEn: null,
      datos: data.datos,
      clave: data.clave
    };

    getStore().attendanceAlertEventos.set(record.id, record);

    return cloneDeep(record);
  },

  findEventoById(id) {
    this.init();

    const record = getStore().attendanceAlertEventos.get(id);

    return record ? cloneDeep(record) : null;
  },

  findEventoPendienteDeAlerta(alertaId) {
    this.init();

    for (const record of getStore().attendanceAlertEventos.values()) {
      if (record.alertaId === alertaId && record.estadoEnvio === "pendiente") {
        return cloneDeep(record);
      }
    }

    return null;
  },

  marcarEventoEnviado(eventoId, notificacionIds) {
    this.init();

    const record = getStore().attendanceAlertEventos.get(eventoId);

    if (!record) {
      return null;
    }

    record.estadoEnvio = "enviado";
    record.enviadoEn = new Date().toISOString();
    record.notificacionIds = notificacionIds;

    return cloneDeep(record);
  },

  /* ---------------- Evaluaciones ---------------------------------------------- */

  registrarEvaluacion(evaluacion) {
    this.init();

    const record = { id: generateId("eva"), ...evaluacion };

    getStore().attendanceAlertEvaluaciones.push(record);

    return cloneDeep(record);
  },

  listEvaluaciones({ escuelaId, limite = 20 } = {}) {
    this.init();

    return getStore()
      .attendanceAlertEvaluaciones.filter((item) => !escuelaId || item.escuelaId === escuelaId)
      .slice(-limite)
      .reverse()
      .map(cloneDeep);
  },

  /* ---------------- Auditoria ------------------------------------------------- */

  registrarAuditoria(entrada) {
    this.init();

    const record = {
      id: generateId("au_alt"),
      accion: entrada.accion,
      actorId: entrada.actorId,
      entidad: entrada.entidad,
      entidadId: entrada.entidadId,
      antes: entrada.antes ?? null,
      despues: entrada.despues ?? null,
      momento: new Date().toISOString()
    };

    getStore().attendanceAlertsAudit.push(record);

    return cloneDeep(record);
  },

  listarAuditoria() {
    this.init();

    return getStore().attendanceAlertsAudit.map(cloneDeep);
  }
};

export default attendanceAlertsRepository;
