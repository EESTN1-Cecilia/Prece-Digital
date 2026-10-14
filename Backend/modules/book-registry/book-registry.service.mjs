import { conflicto, errorDeValidacion, noEncontrado } from "../../utils/api-error.mjs";
import bookRegistryRepository from "./book-registry.repository.mjs";
import {
  CLAVE_ADICIONAL_MAXIMA,
  DATOS_ADICIONALES_MAXIMOS,
  ESTADO_ACTIVO,
  ESTADOS_REGISTRO,
  ESTADOS_VALIDOS,
  NUMERO_FOLIO_MAXIMO,
  NUMERO_LIBRO_MAXIMO,
  ORDENES_REGISTROS,
  PATRON_NUMERO,
  VALOR_ADICIONAL_MAXIMO,
  descripcionDeEstado,
  hoy,
  normalizarFecha
} from "./catalogo.mjs";

/* Servicio del Libro Matriz digital.

   Reglas del dominio:
   - Todo registro cuelga de un alumno existente (un alumno tiene a lo sumo uno).
   - La combinacion numero de libro + folio es unica en toda la institucion.
   - El responsable sale siempre del usuario autenticado; el cliente no lo decide.
   - La escuela sale del padron del alumno y nunca del cuerpo.
   - No hay borrado fisico: el estado `archivado` da de baja logica y el registro
     se conserva completo para consulta administrativa e historica.
   - Toda modificacion conserva el estado anterior en `historial` y queda en la
     auditoria del modulo, ademas de la auditoria transversal del request. */

const POR_PAGINA_MAXIMO = 100;
const POR_PAGINA_DEFECTO = 20;

const collator = new Intl.Collator("es", { sensitivity: "base" });

function actorDel(user) {
  return user?.id ?? null;
}

function escuelaDel(user) {
  return user?.assignments?.find((assignment) => assignment.schoolId)?.schoolId ?? null;
}

function nombreActor(user) {
  return user?.displayName ?? user?.email ?? "Usuario del sistema";
}

function nombreCompleto(alumno) {
  return `${alumno.apellido}, ${alumno.nombre}`;
}

/* ---------------- Vistas publicas ----------------------------------------- */

export function vistaRegistro(registro) {
  return {
    id: registro.id,
    escuelaId: registro.escuelaId,
    alumnoId: registro.alumnoId,
    alumno: registro.alumno,
    dni: registro.dni,
    numeroLibro: registro.numeroLibro,
    numeroFolio: registro.numeroFolio,
    fechaRegistro: registro.fechaRegistro,
    estado: registro.estado,
    estadoDescripcion: descripcionDeEstado(registro.estado),
    datosAdicionales: { ...(registro.datosAdicionales ?? {}) },
    responsableId: registro.responsableId,
    responsable: registro.responsable,
    usuarioResponsable: registro.responsable,
    historial: [...(registro.historial ?? [])],
    creadoPor: registro.creadoPor ?? null,
    creadoEn: registro.creadoEn,
    actualizadoPor: registro.actualizadoPor ?? null,
    actualizadoEn: registro.actualizadoEn
  };
}

function snapshotRegistro(registro) {
  return {
    numeroLibro: registro.numeroLibro,
    numeroFolio: registro.numeroFolio,
    fechaRegistro: registro.fechaRegistro,
    estado: registro.estado,
    datosAdicionales: { ...(registro.datosAdicionales ?? {}) },
    registradoPor: registro.actualizadoPor ?? registro.creadoPor ?? null,
    registradoEn: registro.actualizadoEn ?? registro.creadoEn
  };
}

/* ---------------- Utilidades de listado ----------------------------------- */

function ordenar(lista, config) {
  if (!config) {
    return lista;
  }

  return [...lista].sort((a, b) => collator.compare(String(a[config.campo] ?? ""), String(b[config.campo] ?? "")) * config.sentido);
}

function paginar(lista, query, filtrosActivos) {
  const porPagina = query.porPagina === undefined ? POR_PAGINA_DEFECTO : Number(query.porPagina);
  const pagina = query.pagina === undefined ? 1 : Number(query.pagina);
  const total = lista.length;
  const totalPaginas = total === 0 ? 0 : Math.ceil(total / porPagina);
  const desde = (pagina - 1) * porPagina;

  return {
    data: lista.slice(desde, desde + porPagina),
    filtros: filtrosActivos,
    paginacion: {
      total,
      pagina,
      porPagina,
      totalPaginas,
      tieneAnterior: pagina > 1,
      tieneSiguiente: pagina < totalPaginas
    }
  };
}

/* ---------------- Validaciones -------------------------------------------- */

function validarAlumno(alumnoId) {
  const alumno = bookRegistryRepository.findStudentRefById(alumnoId);

  if (!alumno) {
    throw noEncontrado("El alumno");
  }

  return alumno;
}

function validarNumero(data, errores, { campo, maximo, requerido } = {}) {
  const crudo = data?.[campo];

  if (crudo === undefined || crudo === null || crudo === "") {
    if (requerido) {
      errores.push({ field: campo, message: `El numero de ${campo === "numeroLibro" ? "libro" : "folio"} es obligatorio.` });
    }

    return undefined;
  }

  const numero = String(crudo).trim();

  if (numero.length > maximo || !PATRON_NUMERO.test(numero)) {
    errores.push({ field: campo, message: `El numero admite hasta ${maximo} caracteres y solo letras, numeros, espacios, puntos, barras, guiones y guiones bajos.` });
    return undefined;
  }

  return numero;
}

function validarFecha(data, errores, { porDefecto } = {}) {
  const crudo = data?.fechaRegistro;

  if (crudo === undefined || crudo === null || crudo === "") {
    return porDefecto;
  }

  const fecha = normalizarFecha(crudo);

  if (fecha === undefined) {
    errores.push({ field: "fechaRegistro", message: "La fecha debe tener formato AAAA-MM-DD." });
    return undefined;
  }

  if (fecha > hoy()) {
    errores.push({ field: "fechaRegistro", message: "La fecha no puede ser futura." });
    return undefined;
  }

  return fecha;
}

function validarEstado(data, errores, { porDefecto } = {}) {
  if (data?.estado === undefined || data?.estado === null || data?.estado === "") {
    return porDefecto;
  }

  if (!ESTADOS_VALIDOS.includes(data.estado)) {
    errores.push({ field: "estado", message: `El estado debe ser uno de: ${ESTADOS_VALIDOS.join(", ")}.` });
    return undefined;
  }

  return data.estado;
}

function validarDatosAdicionales(data, errores) {
  if (data?.datosAdicionales === undefined || data?.datosAdicionales === null) {
    return undefined;
  }

  const crudo = data.datosAdicionales;

  if (typeof crudo !== "object" || Array.isArray(crudo)) {
    errores.push({ field: "datosAdicionales", message: "Los datos adicionales deben ser un objeto." });
    return undefined;
  }

  const claves = Object.keys(crudo);

  if (claves.length > DATOS_ADICIONALES_MAXIMOS) {
    errores.push({ field: "datosAdicionales", message: `Los datos adicionales admiten hasta ${DATOS_ADICIONALES_MAXIMOS} campos.` });
    return undefined;
  }

  const saneados = {};

  for (const clave of claves) {
    const nombre = String(clave).trim();

    if (!nombre || nombre.length > CLAVE_ADICIONAL_MAXIMA) {
      errores.push({ field: "datosAdicionales", message: `Cada nombre de campo debe tener hasta ${CLAVE_ADICIONAL_MAXIMA} caracteres.` });
      return undefined;
    }

    const valor = crudo[clave];

    if (valor === null || ["string", "number", "boolean"].includes(typeof valor)) {
      if (typeof valor === "string" && valor.length > VALOR_ADICIONAL_MAXIMO) {
        errores.push({ field: "datosAdicionales", message: `Cada valor admite hasta ${VALOR_ADICIONAL_MAXIMO} caracteres.` });
        return undefined;
      }

      saneados[nombre] = typeof valor === "string" ? valor.trim() : valor;
      continue;
    }

    errores.push({ field: "datosAdicionales", message: "Cada valor debe ser texto, numero, booleano o nulo." });
    return undefined;
  }

  return saneados;
}

function validarPagina(query, errores) {
  const porPagina = query.porPagina === undefined ? POR_PAGINA_DEFECTO : Number(query.porPagina);

  if (!Number.isInteger(porPagina) || porPagina < 1 || porPagina > POR_PAGINA_MAXIMO) {
    errores.push({ field: "porPagina", message: `porPagina debe ser un entero entre 1 y ${POR_PAGINA_MAXIMO}.` });
  }

  const pagina = query.pagina === undefined ? 1 : Number(query.pagina);

  if (!Number.isInteger(pagina) || pagina < 1) {
    errores.push({ field: "pagina", message: "pagina debe ser un entero mayor a 0." });
  }
}

function validarFiltros(query) {
  const errores = [];
  const alumnoId = query.alumnoId || undefined;
  const numeroLibro = query.numeroLibro ? String(query.numeroLibro).trim() : undefined;
  const numeroFolio = query.numeroFolio ? String(query.numeroFolio).trim() : undefined;
  const estado = validarEstado(query, errores);
  const q = query.q ? String(query.q).trim() : undefined;
  const desde = query.desde ? normalizarFecha(query.desde) : undefined;
  const hasta = query.hasta ? normalizarFecha(query.hasta) : undefined;

  if (query.desde && desde === undefined) {
    errores.push({ field: "desde", message: "desde debe tener formato AAAA-MM-DD." });
  }

  if (query.hasta && hasta === undefined) {
    errores.push({ field: "hasta", message: "hasta debe tener formato AAAA-MM-DD." });
  }

  if (desde !== undefined && hasta !== undefined && desde > hasta) {
    errores.push({ field: "desde", message: "desde no puede ser posterior a hasta." });
  }

  const orden = query.orden ?? "creado_desc";

  if (!ORDENES_REGISTROS[orden]) {
    errores.push({ field: "orden", message: "Orden invalido." });
  }

  validarPagina(query, errores);

  return { errores, alumnoId, numeroLibro, numeroFolio, estado, q, desde, hasta, orden };
}

/* ---------------- Servicio ------------------------------------------------ */

const bookRegistryService = {
  catalogos() {
    return {
      statusCode: 200,
      body: {
        data: {
          estadosRegistro: ESTADOS_REGISTRO,
          ordenesRegistros: Object.keys(ORDENES_REGISTROS),
          limites: {
            numeroLibroMaximo: NUMERO_LIBRO_MAXIMO,
            numeroFolioMaximo: NUMERO_FOLIO_MAXIMO,
            datosAdicionalesMaximos: DATOS_ADICIONALES_MAXIMOS,
            claveAdicionalMaxima: CLAVE_ADICIONAL_MAXIMA,
            valorAdicionalMaximo: VALOR_ADICIONAL_MAXIMO
          }
        }
      }
    };
  },

  crearRegistro(alumnoId, data, user) {
    const alumno = validarAlumno(alumnoId);
    const errores = [];
    const numeroLibro = validarNumero(data, errores, { campo: "numeroLibro", maximo: NUMERO_LIBRO_MAXIMO, requerido: true });
    const numeroFolio = validarNumero(data, errores, { campo: "numeroFolio", maximo: NUMERO_FOLIO_MAXIMO, requerido: true });
    const fechaRegistro = validarFecha(data, errores, { porDefecto: hoy() });
    const estado = validarEstado(data, errores, { porDefecto: ESTADO_ACTIVO });
    const datosAdicionales = validarDatosAdicionales(data, errores);

    if (errores.length > 0) {
      throw errorDeValidacion(errores);
    }

    if (bookRegistryRepository.findByAlumno(alumno.id)) {
      throw conflicto("El alumno ya tiene un Libro Matriz asociado.");
    }

    if (bookRegistryRepository.findByLibroFolio(numeroLibro, numeroFolio)) {
      throw conflicto("Ya existe un Libro Matriz con ese numero de libro y folio.");
    }

    const responsableId = actorDel(user);
    const registro = bookRegistryRepository.createRegistry({
      escuelaId: alumno.escuelaId,
      alumnoId: alumno.id,
      alumno: nombreCompleto(alumno),
      dni: alumno.dni,
      numeroLibro,
      numeroFolio,
      fechaRegistro,
      estado,
      datosAdicionales: datosAdicionales ?? {},
      /* El responsable es siempre quien esta autenticado: no lo decide el cliente. */
      responsableId,
      responsable: nombreActor(user),
      creadoPor: responsableId
    });

    bookRegistryRepository.registrarAuditoria({
      accion: "libro-matriz:create",
      actorId: responsableId,
      entidadId: registro.id,
      antes: null,
      despues: vistaRegistro(registro)
    });

    return { statusCode: 201, body: { data: vistaRegistro(registro) } };
  },

  listarRegistros(query, user) {
    const { errores, alumnoId, numeroLibro, numeroFolio, estado, q, desde, hasta, orden } = validarFiltros(query);

    if (errores.length > 0) {
      throw errorDeValidacion(errores);
    }

    if (alumnoId) {
      validarAlumno(alumnoId);
    }

    const lista = ordenar(
      bookRegistryRepository
        .listRegistries({ escuelaId: escuelaDel(user), alumnoId, numeroLibro, numeroFolio, estado, desde, hasta, q })
        .map(vistaRegistro),
      ORDENES_REGISTROS[orden]
    );

    return {
      statusCode: 200,
      body: paginar(lista, query, {
        alumnoId: alumnoId ?? null,
        numeroLibro: numeroLibro ?? null,
        numeroFolio: numeroFolio ?? null,
        estado: estado ?? null,
        q: q ?? null,
        desde: desde ?? null,
        hasta: hasta ?? null,
        orden
      })
    };
  },

  obtenerDeAlumno(alumnoId) {
    const alumno = validarAlumno(alumnoId);
    const registro = bookRegistryRepository.findByAlumno(alumno.id);

    if (!registro) {
      throw noEncontrado("El Libro Matriz del alumno");
    }

    return { statusCode: 200, body: { data: vistaRegistro(registro) } };
  },

  existeDeAlumno(alumnoId) {
    const alumno = validarAlumno(alumnoId);
    const registro = bookRegistryRepository.findByAlumno(alumno.id);

    return {
      statusCode: 200,
      body: {
        data: {
          alumnoId: alumno.id,
          alumno: nombreCompleto(alumno),
          tieneLibroMatriz: Boolean(registro),
          registroId: registro?.id ?? null
        }
      }
    };
  },

  obtenerRegistro(id) {
    const registro = bookRegistryRepository.findRegistryById(id);

    if (!registro) {
      throw noEncontrado("El Libro Matriz");
    }

    return { statusCode: 200, body: { data: vistaRegistro(registro) } };
  },

  actualizarRegistro(id, data, user) {
    const actual = bookRegistryRepository.findRegistryById(id);

    if (!actual) {
      throw noEncontrado("El Libro Matriz");
    }

    const errores = [];

    if (data?.alumnoId !== undefined && data.alumnoId !== actual.alumnoId) {
      errores.push({ field: "alumnoId", message: "No se puede reasignar un Libro Matriz ya registrado a otro alumno." });
    }

    const numeroLibro = validarNumero(data, errores, { campo: "numeroLibro", maximo: NUMERO_LIBRO_MAXIMO });
    const numeroFolio = validarNumero(data, errores, { campo: "numeroFolio", maximo: NUMERO_FOLIO_MAXIMO });
    const fechaRegistro = validarFecha(data, errores);
    const estado = validarEstado(data, errores);
    const datosAdicionales = validarDatosAdicionales(data, errores);

    if (errores.length > 0) {
      throw errorDeValidacion(errores);
    }

    const libroFinal = numeroLibro ?? actual.numeroLibro;
    const folioFinal = numeroFolio ?? actual.numeroFolio;

    if ((numeroLibro !== undefined || numeroFolio !== undefined) && bookRegistryRepository.findByLibroFolio(libroFinal, folioFinal, id)) {
      throw conflicto("Ya existe un Libro Matriz con ese numero de libro y folio.");
    }

    const cambios = {};

    if (numeroLibro !== undefined && numeroLibro !== actual.numeroLibro) cambios.numeroLibro = numeroLibro;
    if (numeroFolio !== undefined && numeroFolio !== actual.numeroFolio) cambios.numeroFolio = numeroFolio;
    if (fechaRegistro !== undefined && fechaRegistro !== actual.fechaRegistro) cambios.fechaRegistro = fechaRegistro;
    if (estado !== undefined && estado !== actual.estado) cambios.estado = estado;

    if (datosAdicionales !== undefined) {
      cambios.datosAdicionales = { ...datosAdicionales };
    }

    if (Object.keys(cambios).length === 0) {
      return { statusCode: 200, body: { data: vistaRegistro(actual) } };
    }

    cambios.actualizadoPor = actorDel(user);

    const actualizado = bookRegistryRepository.updateRegistry(id, cambios, snapshotRegistro(actual));

    bookRegistryRepository.registrarAuditoria({
      accion: "libro-matriz:update",
      actorId: actorDel(user),
      entidadId: id,
      antes: vistaRegistro(actual),
      despues: vistaRegistro(actualizado)
    });

    return { statusCode: 200, body: { data: vistaRegistro(actualizado) } };
  },

  historialDeRegistro(id) {
    const registro = bookRegistryRepository.findRegistryById(id);

    if (!registro) {
      throw noEncontrado("El Libro Matriz");
    }

    const historial = [...(registro.historial ?? [])];

    return {
      statusCode: 200,
      body: {
        data: {
          id: registro.id,
          alumnoId: registro.alumnoId,
          numeroLibro: registro.numeroLibro,
          numeroFolio: registro.numeroFolio,
          estado: registro.estado,
          total: historial.length,
          historial
        }
      }
    };
  }
};

export default bookRegistryService;
