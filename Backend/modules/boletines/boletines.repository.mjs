import { getStore } from "../../database/memory-store.mjs";

/* Boletin de calificaciones de cada alumno por anio de cursada (1 a 7).

   Es la fuente unica que comparten el Boletin Digital (Secretaria y Direccion),
   la planilla de calificaciones del docente y los boletines impresos de
   preceptoria. Persiste en el store en memoria, como el resto de los modulos. */

function clave(alumnoId, anio) {
  return `${alumnoId}|${anio}`;
}

function clonar(registro) {
  return registro ? structuredClone(registro) : null;
}

const boletinesRepository = {
  init() {
    getStore().boletines ??= new Map();
  },

  find(alumnoId, anio) {
    this.init();
    return clonar(getStore().boletines.get(clave(alumnoId, anio)));
  },

  guardar(registro) {
    this.init();
    getStore().boletines.set(clave(registro.alumnoId, registro.anio), clonar(registro));
    return clonar(registro);
  }
};

export default boletinesRepository;
