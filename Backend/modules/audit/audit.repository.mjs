/* Persistencia de la auditoría transversal.
   Almacena en memoria los registros de acciones sensibles (auditLogs) y los
   log de errores (errorLogs). Cuando el backend migre a MySQL, estas dos
   colecciones se reemplazan por `auditoria_logs` y `logs_errores`
   (ver database/schema.sql) sin tocar la capa de servicio. */

import { getStore } from "../../database/memory-store.mjs";

function generateId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function cloneRecord(record) {
  return {
    ...record,
    valorAnterior: record.valorAnterior ? JSON.parse(JSON.stringify(record.valorAnterior)) : null,
    valorNuevo: record.valorNuevo ? JSON.parse(JSON.stringify(record.valorNuevo)) : null
  };
}

function estaDentro(fecha, desde, hasta) {
  if (desde && fecha < desde) return false;
  if (hasta && fecha > hasta) return false;
  return true;
}

const auditRepository = {
  init() {
    const store = getStore();
    if (!store.auditLogs) store.auditLogs = new Map();
    if (!store.errorLogs) store.errorLogs = new Map();
  },

  create(entrada) {
    this.init();
    const registro = {
      id: entrada.id ?? generateId("aud"),
      usuarioId: entrada.usuarioId ?? null,
      escuelaId: entrada.escuelaId ?? null,
      accion: entrada.accion,
      tabla: entrada.tabla ?? null,
      registroId: entrada.registroId ?? null,
      valorAnterior: entrada.valorAnterior ?? null,
      valorNuevo: entrada.valorNuevo ?? null,
      motivo: entrada.motivo ?? null,
      metodo: entrada.metodo ?? null,
      ruta: entrada.ruta ?? null,
      ip: entrada.ip ?? null,
      fechaHora: entrada.fechaHora ?? new Date().toISOString()
    };
    getStore().auditLogs.set(registro.id, registro);
    return cloneRecord(registro);
  },

  findById(id) {
    this.init();
    const registro = getStore().auditLogs.get(id);
    return registro ? cloneRecord(registro) : null;
  },

  list({ usuarioId, accion, tabla, registroId, desde, hasta } = {}) {
    this.init();
    return [...getStore().auditLogs.values()]
      .filter((registro) => {
        if (usuarioId && String(registro.usuarioId) !== String(usuarioId)) return false;
        if (accion && registro.accion !== accion) return false;
        if (tabla && registro.tabla !== tabla) return false;
        if (registroId && String(registro.registroId) !== String(registroId)) return false;
        if (!estaDentro(registro.fechaHora, desde, hasta)) return false;
        return true;
      })
      .sort((a, b) => new Date(b.fechaHora) - new Date(a.fechaHora))
      .map(cloneRecord);
  },

  registrarError(entrada) {
    this.init();
    const registro = {
      id: entrada.id ?? generateId("err"),
      usuarioId: entrada.usuarioId ?? null,
      fechaHora: entrada.fechaHora ?? new Date().toISOString(),
      metodo: entrada.metodo ?? null,
      ruta: entrada.ruta ?? null,
      tipo: entrada.tipo ?? "inesperado",
      code: entrada.code ?? null,
      message: entrada.message ?? null,
      ip: entrada.ip ?? null
    };
    getStore().errorLogs.set(registro.id, registro);
    return cloneRecord(registro);
  },

  findErrorById(id) {
    this.init();
    const registro = getStore().errorLogs.get(id);
    return registro ? cloneRecord(registro) : null;
  },

  listErrors({ tipo, desde, hasta } = {}) {
    this.init();
    return [...getStore().errorLogs.values()]
      .filter((registro) => {
        if (tipo && registro.tipo !== tipo) return false;
        if (!estaDentro(registro.fechaHora, desde, hasta)) return false;
        return true;
      })
      .sort((a, b) => new Date(b.fechaHora) - new Date(a.fechaHora))
      .map(cloneRecord);
  }
};

export default auditRepository;