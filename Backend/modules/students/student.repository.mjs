import { getStore } from "../../database/memory-store.mjs";

/* Repositorio de alumnos para el CRUD de legajo.
   Usa el store en memoria del backend, igual que el resto de los modulos CRUD.
   Cuando se persista a MySQL se conserva el contrato (id, dni unico, r.escuela_id)
   y las consultas se escriben parametrizadas, como ya hace students.repository.mjs
   para los listados. */

function generarId() {
  return `alu_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function clonar(registro) {
  return { ...registro, contacto: registro.contacto ? { ...registro.contacto } : null };
}

function comparar(a, b) {
  const x = String(a ?? "");
  const y = String(b ?? "");
  return x < y ? -1 : x > y ? 1 : 0;
}

function comparador(orden) {
  const descendente = orden.endsWith("_desc");
  const campo = descendente ? orden.slice(0, -5) : orden;
  const secundario =
    campo === "apellido" ? "nombre" : campo === "nombre" ? "apellido" : campo === "curso" ? "division" : null;
  const direccion = descendente ? -1 : 1;

  return (a, b) => {
    const primero = comparar(a[campo], b[campo]) * direccion;
    if (primero !== 0 || !secundario) {
      return primero;
    }
    return comparar(a[secundario], b[secundario]) * direccion;
  };
}

const studentRepository = {
  init() {
    const store = getStore();
    store.students ??= new Map();
    store.studentsAudit ??= [];
  },

  create(datos) {
    this.init();
    const ahora = new Date().toISOString();
    const registro = {
      id: generarId(),
      escuelaId: datos.escuelaId,
      nombre: datos.nombre,
      apellido: datos.apellido,
      dni: datos.dni,
      fechaNacimiento: datos.fechaNacimiento ?? null,
      genero: datos.genero ?? null,
      nacionalidad: datos.nacionalidad ?? null,
      provincia: datos.provincia ?? null,
      localidad: datos.localidad ?? null,
      codigoPostal: datos.codigoPostal ?? null,
      direccion: datos.direccion ?? null,
      email: datos.email ?? null,
      telefono: datos.telefono ?? null,
      contacto: datos.contacto ?? null,
      curso: datos.curso ?? null,
      division: datos.division ?? null,
      turno: datos.turno ?? null,
      orientacion: datos.orientacion ?? null,
      condicion: datos.condicion ?? null,
      isActive: true,
      fechaAlta: datos.fechaAlta ?? new Date().toISOString().slice(0, 10),
      fechaBaja: null,
      creadoEn: ahora,
      actualizadoEn: ahora
    };
    getStore().students.set(registro.id, registro);
    return clonar(registro);
  },

  findById(id) {
    this.init();
    const registro = getStore().students.get(id);
    return registro ? clonar(registro) : null;
  },

  findByDni(dni) {
    this.init();
    for (const registro of getStore().students.values()) {
      if (registro.dni === dni) {
        return clonar(registro);
      }
    }
    return null;
  },

  /* Filtra y ordena. La paginacion la aplica el service para poder calcular el
     total sobre el mismo conjunto ya filtrado (por ejemplo junto al filtro de edad). */
  search({ escuelaId, criterios, orden }) {
    this.init();
    return [...getStore().students.values()]
      .filter((registro) => registro.escuelaId === escuelaId)
      .filter((registro) => this.cumple(registro, criterios))
      .sort(comparador(orden));
  },

  cumple(registro, criterios) {
    if (criterios.estado === "activo" && !registro.isActive) return false;
    if (criterios.estado === "inactivo" && registro.isActive) return false;
    if (criterios.dni && registro.dni !== criterios.dni) return false;
    if (criterios.apellido && !registro.apellido.toLowerCase().includes(criterios.apellido)) return false;
    if (criterios.nombre && !registro.nombre.toLowerCase().includes(criterios.nombre)) return false;
    if (criterios.curso != null && registro.curso !== criterios.curso) return false;
    if (criterios.division && registro.division !== criterios.division) return false;
    if (criterios.condicion && registro.condicion !== criterios.condicion) return false;
    return true;
  },

  update(id, cambios) {
    this.init();
    const registro = getStore().students.get(id);
    if (!registro) return null;
    Object.assign(registro, cambios, { actualizadoEn: new Date().toISOString() });
    return clonar(registro);
  },

  /* Desactivacion = baja logica: el registro y su historial se conservan. */
  deactivate(id, fechaBaja) {
    this.init();
    const registro = getStore().students.get(id);
    if (!registro) return null;
    registro.isActive = false;
    registro.fechaBaja = fechaBaja ?? new Date().toISOString().slice(0, 10);
    registro.actualizadoEn = new Date().toISOString();
    return clonar(registro);
  },

  /* Traza local de auditoria para operaciones sensibles (creacion, modificacion,
     desactivacion). Queda lista para integrarse a la auditoria transversal. */
  registrarAuditoria({ accion, usuarioId, registroId, valorAnterior, valorNuevo }) {
    this.init();
    getStore().studentsAudit.push({
      id: `aud_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      accion,
      usuarioId,
      registroId,
      valorAnterior: valorAnterior ?? null,
      valorNuevo: valorNuevo ?? null,
      fecha: new Date().toISOString()
    });
  },

  listarTraza(registroId) {
    this.init();
    return getStore().studentsAudit.filter((entrada) => entrada.registroId === registroId);
  }
};

export default studentRepository;