import { getStore } from "../../database/memory-store.mjs";

/* Eventos del calendario en el store en memoria (el resto de la API tambien
   vive ahi). La migracion equivalente para SQL Server esta en
   database/sqlserver/004_calendario_oficial.sql; no se ejecuta sola. */

const clone = (v) => JSON.parse(JSON.stringify(v));

const repo = {
  init() {
    const s = getStore();
    if (!s.calendarioEventos) s.calendarioEventos = new Map();
    if (!s.calendarioHistorial) s.calendarioHistorial = [];
    if (!s.calendarioLog) s.calendarioLog = [];
  },
  resetData() {
    this.init();
    const s = getStore();
    s.calendarioEventos.clear();
    s.calendarioHistorial.length = 0;
    s.calendarioLog.length = 0;
  },
  todos() {
    this.init();
    return [...getStore().calendarioEventos.values()].map(clone);
  },
  buscar(id) {
    this.init();
    const ev = getStore().calendarioEventos.get(id);
    return ev ? clone(ev) : null;
  },
  guardar(evento) {
    this.init();
    getStore().calendarioEventos.set(evento.id, clone(evento));
    return clone(evento);
  },
  eliminar(id) {
    this.init();
    return getStore().calendarioEventos.delete(id);
  },
  registrarCambio(cambio) {
    this.init();
    getStore().calendarioHistorial.push(clone(cambio));
  },
  historial(eventoId) {
    this.init();
    return getStore().calendarioHistorial.filter((c) => !eventoId || c.eventoId === eventoId).map(clone);
  },
  registrarConsulta(entrada) {
    this.init();
    const log = getStore().calendarioLog;
    log.push(clone(entrada));
    if (log.length > 50) log.splice(0, log.length - 50);
  },
  ultimaConsulta() {
    this.init();
    const log = getStore().calendarioLog;
    return log.length ? clone(log[log.length - 1]) : null;
  },
  ultimaConsultaExitosa() {
    this.init();
    const ok = getStore().calendarioLog.filter((l) => l.ok);
    return ok.length ? clone(ok[ok.length - 1]) : null;
  }
};

export default repo;
