import { getStore } from "../../database/memory-store.mjs";

/* Datos del Boletin Oficial que no son notas: inasistencias del boletin,
   materias previas, libro/folio y el detalle fino de la planilla del docente
   (parciales, valoraciones, faltas). Las NOTAS no se guardan aca: viven en el
   modulo de calificaciones, que es la fuente que tambien lee el portal. */

const clone = (valor) => JSON.parse(JSON.stringify(valor));
const clave = (alumnoId, anio) => `${alumnoId}:${anio}`;

const boletinOficialRepository = {
  init() {
    const store = getStore();
    if (!store.boletinOficial) store.boletinOficial = new Map();
  },

  resetData() {
    this.init();
    getStore().boletinOficial.clear();
  },

  obtener(alumnoId, anio) {
    this.init();
    const registro = getStore().boletinOficial.get(clave(alumnoId, anio));
    return registro ? clone(registro) : { inasistencias: "", pendientes: [], libroFolio: null, detalle: {} };
  },

  guardar(alumnoId, anio, cambios) {
    this.init();
    const actual = this.obtener(alumnoId, anio);
    const nuevo = { ...actual, ...cambios, detalle: { ...actual.detalle, ...(cambios.detalle ?? {}) }, actualizadoEn: new Date().toISOString() };
    getStore().boletinOficial.set(clave(alumnoId, anio), nuevo);
    return clone(nuevo);
  }
};

export default boletinOficialRepository;
