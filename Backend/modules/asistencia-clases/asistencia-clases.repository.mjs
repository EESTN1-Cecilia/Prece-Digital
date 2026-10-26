import { getStore } from "../../database/memory-store.mjs";

/* Persistencia de la asistencia por clase. En el modelo SQL es la cabecera
   tomas_asistencia_materia + una fila por alumno en asistencias_materia +
   tomas_asistencia_correcciones (migracion 016). Una toma por
   division + materia + fecha: la unicidad se controla aca y en el SQL. */

function generarId() {
  return `acl_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function clonar(valor) {
  return structuredClone(valor);
}

const asistenciaClasesRepository = {
  init() {
    const store = getStore();

    if (!store.asistenciaClases) {
      store.asistenciaClases = new Map();
    }
  },

  create(datos) {
    this.init();
    const ahora = new Date().toISOString();
    const registro = {
      id: datos.id ?? generarId(),
      escuelaId: datos.escuelaId,
      cursoId: datos.cursoId,
      anio: datos.anio,
      division: datos.division,
      materia: datos.materia,
      materiaClave: datos.materiaClave,
      fecha: datos.fecha,
      registros: datos.registros.map((item) => ({ ...item })),
      docenteUserId: datos.docenteUserId ?? null,
      docenteId: datos.docenteId ?? null,
      creadoPor: datos.creadoPor ?? null,
      creadoEn: ahora,
      actualizadoPor: datos.creadoPor ?? null,
      actualizadoEn: ahora,
      historial: []
    };
    getStore().asistenciaClases.set(registro.id, registro);
    return clonar(registro);
  },

  findById(id) {
    this.init();
    const registro = getStore().asistenciaClases.get(id);
    return registro ? clonar(registro) : null;
  },

  findByClase({ cursoId, materiaClave, fecha }) {
    this.init();

    for (const registro of getStore().asistenciaClases.values()) {
      if (registro.cursoId === cursoId && registro.materiaClave === materiaClave && registro.fecha === fecha) {
        return clonar(registro);
      }
    }

    return null;
  },

  list({ cursos = null, cursoId, materiaClave, desde, hasta } = {}) {
    this.init();

    return [...getStore().asistenciaClases.values()]
      .filter((registro) => !cursos || cursos.has(registro.cursoId))
      .filter((registro) => !cursoId || registro.cursoId === cursoId)
      .filter((registro) => !materiaClave || registro.materiaClave === materiaClave)
      .filter((registro) => !desde || registro.fecha >= desde)
      .filter((registro) => !hasta || registro.fecha <= hasta)
      .sort((una, otra) => otra.fecha.localeCompare(una.fecha) || otra.creadoEn.localeCompare(una.creadoEn))
      .map(clonar);
  },

  /* La correccion guarda en el historial como estaba antes, quien y cuando. */
  corregir(id, { registros, actorId }) {
    this.init();
    const registro = getStore().asistenciaClases.get(id);

    if (!registro) {
      return null;
    }

    const ahora = new Date().toISOString();
    registro.historial.push({
      registrosAnteriores: registro.registros.map((item) => ({ ...item })),
      modificadoPor: actorId ?? null,
      modificadoEn: ahora
    });
    registro.registros = registros.map((item) => ({ ...item }));
    registro.actualizadoPor = actorId ?? null;
    registro.actualizadoEn = ahora;
    return clonar(registro);
  }
};

export default asistenciaClasesRepository;
