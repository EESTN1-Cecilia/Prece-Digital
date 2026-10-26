import { getStore } from "../../database/memory-store.mjs";

function clave(alumnoId, fecha) {
  return `${alumnoId}|${fecha}`;
}

function clonar(registro) {
  return registro ? { ...registro } : null;
}

/* Asistencia diaria de preceptoria.

   Persiste en el store en memoria, igual que el resto de los modulos. La clave
   funcional es alumno + fecha: un segundo registro actualiza el anterior (la
   tabla asistencias_diarias tiene la misma restriccion unica). */
const preceptorRepository = {
  init() {
    const store = getStore();
    store.preceptorAttendance ??= new Map();
  },

  find(alumnoId, fecha) {
    this.init();
    return clonar(getStore().preceptorAttendance.get(clave(alumnoId, fecha)));
  },

  listPorFecha({ alumnoIds, fecha }) {
    this.init();
    const permitidos = new Set(alumnoIds ?? []);
    return [...getStore().preceptorAttendance.values()]
      .filter((registro) => registro.fecha === fecha && (!alumnoIds || permitidos.has(registro.alumnoId)))
      .map(clonar);
  },

  /* Registros filtrados por curso ("<anio>-<division>"), conjunto de cursos
     permitidos (null = sin restriccion), alumnos y rango de fechas. */
  list({ cursoId = null, cursos = null, alumnoIds = null, desde = null, hasta = null } = {}) {
    this.init();
    const alumnos = alumnoIds ? new Set(alumnoIds) : null;
    return [...getStore().preceptorAttendance.values()]
      .filter((registro) => !cursoId || registro.cursoId === cursoId)
      .filter((registro) => !cursos || cursos.has(registro.cursoId))
      .filter((registro) => !alumnos || alumnos.has(registro.alumnoId))
      .filter((registro) => (!desde || registro.fecha >= desde) && (!hasta || registro.fecha <= hasta))
      .map(clonar);
  },

  upsert({ alumnoId, fecha, escuelaId, cursoId, anio, division, estado, observaciones, registradoPor }) {
    this.init();
    const mapa = getStore().preceptorAttendance;
    const id = clave(alumnoId, fecha);
    const anterior = mapa.get(id);
    const ahora = new Date().toISOString();
    const registro = {
      id: anterior?.id ?? `asisd_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      escuelaId,
      alumnoId,
      cursoId,
      anio,
      division,
      fecha,
      estado,
      justificada: false,
      observaciones: observaciones ?? null,
      registradoPor: registradoPor ?? null,
      creadoEn: anterior?.creadoEn ?? ahora,
      actualizadoEn: ahora
    };

    mapa.set(id, registro);
    return clonar(registro);
  }
};

export default preceptorRepository;
