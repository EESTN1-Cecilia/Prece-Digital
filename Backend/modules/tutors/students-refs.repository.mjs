import { getStore } from "../../database/memory-store.mjs";

/* Registro de alumnos usado para validar que una relacion tutor/alumno apunta a
   un alumno existente.

   Es un registro minimo (id + datos publicos del legajo), independiente del
   modulo de CRUD de alumnos. Cuando ese modulo este disponible en este backend,
   esta referencia puede reemplazarse por el repository real de alumnos: los
   endpoints no cambian, solo la fuente de datos. */

function cloneRef(student) {
  return { ...student };
}

const studentsRefRepository = {
  init() {
    const store = getStore();

    if (!store.studentsRef) {
      store.studentsRef = new Map();
    }
  },

  clear() {
    this.init();
    getStore().studentsRef.clear();
  },

  setAll(students) {
    this.init();
    const store = getStore();

    for (const student of students) {
      store.studentsRef.set(student.id, { ...student });
    }
  },

  findById(id) {
    this.init();
    const student = getStore().studentsRef.get(id);
    return student ? cloneRef(student) : null;
  },

  all() {
    this.init();
    return [...getStore().studentsRef.values()].map(cloneRef);
  }
};

export default studentsRefRepository;