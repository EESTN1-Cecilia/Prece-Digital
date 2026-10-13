import { getStore } from "../../database/memory-store.mjs";
import { userRepository } from "../../database/repositories/user.repository.mjs";
import studentRepository from "../students/students.repository.mjs";
import { normalizarTexto } from "./catalogo.mjs";

/* Repositorio del Libro Matriz digital.

   Un registro cuelga de un alumno y guarda un resumen de su identidad (`alumno`
   como "Apellido, Nombre" y `dni`). Los alumnos se leen del modulo students
   (unica fuente) y los responsables del modulo auth, por id: este repositorio no
   guarda copias propias de ninguno de los dos. Persiste en el store en memoria,
   como el resto de los modulos. */

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

const bookRegistryRepository = {
  init() {
    const store = getStore();
    store.bookRegistries ??= new Map();
    store.bookRegistriesAudit ??= [];
  },

  resetData() {
    this.init();
    getStore().bookRegistries.clear();
    getStore().bookRegistriesAudit.length = 0;
  },

  /* ---------------- Referencias de catalogo --------------------------------- */

  findStudentRefById(id) {
    const alumno = studentRepository.findById(id);
    return alumno
      ? { id: alumno.id, escuelaId: alumno.escuelaId, apellido: alumno.apellido, nombre: alumno.nombre, dni: alumno.dni }
      : null;
  },

  /* El responsable se busca incluyendo cuentas inactivas: un registro ya creado
     tiene que conservar quien lo hizo aunque la cuenta se desactive. */
  findUserRefById(id) {
    const usuario = id ? userRepository.findById(id, { includeInactive: true }) : null;
    return usuario ? { id: usuario.id, displayName: usuario.displayName, email: usuario.email } : null;
  },

  /* ---------------- Registros ---------------------------------------------- */

  createRegistry(data) {
    this.init();
    const ahora = new Date().toISOString();
    const record = {
      id: data.id ?? generateId("lm"),
      escuelaId: data.escuelaId,
      alumnoId: data.alumnoId,
      alumno: data.alumno,
      dni: data.dni ?? null,
      numeroLibro: data.numeroLibro,
      numeroFolio: data.numeroFolio,
      fechaRegistro: data.fechaRegistro,
      estado: data.estado,
      datosAdicionales: cloneDeep(data.datosAdicionales ?? {}),
      responsableId: data.responsableId,
      responsable: data.responsable,
      historial: Array.isArray(data.historial) ? data.historial : [],
      creadoEn: data.creadoEn ?? ahora,
      creadoPor: data.creadoPor ?? data.responsableId ?? null,
      actualizadoEn: data.actualizadoEn ?? ahora,
      actualizadoPor: data.actualizadoPor ?? null
    };
    getStore().bookRegistries.set(record.id, record);
    return cloneDeep(record);
  },

  findRegistryById(id) {
    this.init();
    const record = getStore().bookRegistries.get(id);
    return record ? cloneDeep(record) : null;
  },

  /* Un alumno tiene a lo sumo un registro de Libro Matriz. */
  findByAlumno(alumnoId) {
    this.init();
    const record = [...getStore().bookRegistries.values()].find((item) => item.alumnoId === alumnoId);
    return record ? cloneDeep(record) : null;
  },

  /* La combinacion libro + folio no puede repetirse (comparada sin tildes ni
     mayusculas ni espacios repetidos). Excluye un id para poder usarla tambien
     al modificar. */
  findByLibroFolio(numeroLibro, numeroFolio, excludeId) {
    this.init();
    const comparar = (texto) => normalizarTexto(texto).replace(/\s+/g, " ");
    const libroBuscado = comparar(numeroLibro);
    const folioBuscado = comparar(numeroFolio);

    return (
      [...getStore().bookRegistries.values()].find(
        (record) =>
          record.id !== excludeId &&
          comparar(record.numeroLibro) === libroBuscado &&
          comparar(record.numeroFolio) === folioBuscado
      ) ?? null
    );
  },

  listRegistries({ escuelaId, alumnoId, numeroLibro, numeroFolio, estado, desde, hasta, q } = {}) {
    this.init();
    const busqueda = q ? normalizarTexto(q) : null;
    const comparar = (texto) => normalizarTexto(texto).replace(/\s+/g, " ");
    const libroFiltro = numeroLibro ? comparar(numeroLibro) : null;
    const folioFiltro = numeroFolio ? comparar(numeroFolio) : null;

    return [...getStore().bookRegistries.values()]
      .filter((record) => {
        if (escuelaId && record.escuelaId !== escuelaId) return false;
        if (alumnoId && record.alumnoId !== alumnoId) return false;
        if (estado && record.estado !== estado) return false;
        if (libroFiltro && comparar(record.numeroLibro) !== libroFiltro) return false;
        if (folioFiltro && comparar(record.numeroFolio) !== folioFiltro) return false;
        if (desde && record.fechaRegistro < desde) return false;
        if (hasta && record.fechaRegistro > hasta) return false;

        if (busqueda) {
          const texto = normalizarTexto(`${record.alumno ?? ""} ${record.dni ?? ""} ${record.numeroLibro ?? ""} ${record.numeroFolio ?? ""}`);
          if (!texto.includes(busqueda)) return false;
        }

        return true;
      })
      .map((record) =>
        cloneDeep({
          ...record,
          alumnoSort: normalizarTexto(record.alumno),
          numeroLibroSort: normalizarTexto(record.numeroLibro),
          numeroFolioSort: normalizarTexto(record.numeroFolio)
        })
      );
  },

  updateRegistry(id, cambios, antes) {
    this.init();
    const record = getStore().bookRegistries.get(id);

    if (!record) {
      return null;
    }

    const historial = [...record.historial];

    if (antes) {
      historial.push(cloneDeep(antes));
    }

    Object.assign(record, cambios, { historial, actualizadoEn: new Date().toISOString() });

    return cloneDeep(record);
  },

  /* ---------------- Auditoria ---------------------------------------------- */

  registrarAuditoria(entrada) {
    this.init();
    getStore().bookRegistriesAudit.push({
      id: generateId("au_lm"),
      accion: entrada.accion,
      actorId: entrada.actorId ?? null,
      entidad: entrada.entidad ?? "libro_matriz",
      entidadId: entrada.entidadId,
      antes: entrada.antes ?? null,
      despues: entrada.despues ?? null,
      momento: new Date().toISOString()
    });
  },

  listarAuditoria() {
    this.init();
    return getStore().bookRegistriesAudit.map(cloneDeep);
  }
};

export default bookRegistryRepository;
