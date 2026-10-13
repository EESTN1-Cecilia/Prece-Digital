import { conflicto, errorDeValidacion, noEncontrado } from "../../utils/api-error.mjs";
import particularConditionsRepository from "./particular-conditions.repository.mjs";
import {
  DESCRIPCION_MAXIMA,
  DESCRIPCION_MINIMA,
  ESTADO_ACTIVA,
  ESTADO_FINALIZADA,
  ESTADOS_CONDICION,
  ESTADOS_VALIDOS,
  ORDENES_CONDICIONES,
  descripcionDeEstado,
  hoy,
  normalizarFecha
} from "./catalogo.mjs";

/* Servicio de condiciones particulares de alumnos.

   Reglas del dominio:
   - Toda condicion cuelga de un alumno existente.
   - El responsable sale siempre del usuario autenticado; el cliente no lo decide.
   - La escuela sale del padron del alumno y nunca del cuerpo.
   - Una condicion ACTIVA puede modificarse o finalizarse; una finalizada no se
     toca, pero se conserva completa para consulta historica.
   - No se admiten dos condiciones activas del mismo alumno con la misma
     descripcion (comparada sin tildes ni mayusculas).
   - Finalizar no elimina el registro: guarda fecha y responsable de finalizacion.
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

export function vistaCondicion(registro) {
  return {
    id: registro.id,
    escuelaId: registro.escuelaId,
    alumnoId: registro.alumnoId,
    alumno: registro.alumno,
    dni: registro.dni,
    descripcion: registro.descripcion,
    fechaInicio: registro.fechaInicio,
    estado: registro.estado,
    estadoDescripcion: descripcionDeEstado(registro.estado),
    activa: registro.estado === ESTADO_ACTIVA,
    responsableId: registro.responsableId,
    responsable: registro.responsable,
    usuarioResponsable: registro.responsable,
    fechaFinalizacion: registro.fechaFinalizacion ?? null,
    finalizadoPorId: registro.finalizadoPor ?? null,
    finalizadoPor: particularConditionsRepository.findUserRefById(registro.finalizadoPor)?.displayName ?? null,
    historial: [...(registro.historial ?? [])],
    creadoPor: registro.creadoPor ?? null,
    creadoEn: registro.creadoEn,
    actualizadoPor: registro.actualizadoPor ?? null,
    actualizadoEn: registro.actualizadoEn
  };
}

function snapshotCondicion(registro) {
  return {
    descripcion: registro.descripcion,
    fechaInicio: registro.fechaInicio,
    estado: registro.estado,
    fechaFinalizacion: registro.fechaFinalizacion ?? null,
    finalizadoPor: registro.finalizadoPor ?? null,
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
  const alumno = particularConditionsRepository.findStudentRefById(alumnoId);

  if (!alumno) {
    throw noEncontrado("El alumno");
  }

  return alumno;
}

function validarDescripcion(data, errores, { requerido } = {}) {
  if (data?.descripcion === undefined || data?.descripcion === null) {
    if (requerido) {
      errores.push({ field: "descripcion", message: "La descripcion es obligatoria." });
    }

    return undefined;
  }

  if (typeof data.descripcion !== "string") {
    errores.push({ field: "descripcion", message: "La descripcion debe ser texto." });
    return undefined;
  }

  const descripcion = data.descripcion.trim();

  if (descripcion.length < DESCRIPCION_MINIMA) {
    errores.push({ field: "descripcion", message: `La descripcion debe tener al menos ${DESCRIPCION_MINIMA} caracteres.` });
    return undefined;
  }

  if (descripcion.length > DESCRIPCION_MAXIMA) {
    errores.push({ field: "descripcion", message: `La descripcion admite hasta ${DESCRIPCION_MAXIMA} caracteres.` });
    return undefined;
  }

  return descripcion;
}

function validarFecha(data, errores, { campo = "fechaInicio", porDefecto } = {}) {
  const crudo = data?.[campo];

  if (crudo === undefined || crudo === null || crudo === "") {
    return porDefecto;
  }

  const fecha = normalizarFecha(crudo);

  if (fecha === undefined) {
    errores.push({ field: campo, message: "La fecha debe tener formato AAAA-MM-DD." });
    return undefined;
  }

  if (fecha > hoy()) {
    errores.push({ field: campo, message: "La fecha no puede ser futura." });
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

  const orden = query.orden ?? "fecha_inicio_desc";

  if (!ORDENES_CONDICIONES[orden]) {
    errores.push({ field: "orden", message: "Orden invalido." });
  }

  validarPagina(query, errores);

  return { errores, alumnoId, estado, q, desde, hasta, orden };
}

/* ---------------- Servicio ------------------------------------------------ */

const particularConditionsService = {
  catalogos() {
    return {
      statusCode: 200,
      body: {
        data: {
          estadosCondicion: ESTADOS_CONDICION,
          ordenesCondiciones: Object.keys(ORDENES_CONDICIONES)
        }
      }
    };
  },

  crearCondicion(alumnoId, data, user) {
    const alumno = validarAlumno(alumnoId);
    const errores = [];
    const descripcion = validarDescripcion(data, errores, { requerido: true });
    const fechaInicio = validarFecha(data, errores, { porDefecto: hoy() });
    const estado = validarEstado(data, errores, { porDefecto: ESTADO_ACTIVA });

    if (errores.length > 0) {
      throw errorDeValidacion(errores);
    }

    if (estado === ESTADO_ACTIVA && particularConditionsRepository.findActiveDuplicate({ alumnoId: alumno.id, descripcion })) {
      throw conflicto("El alumno ya tiene una condicion activa con la misma descripcion.");
    }

    const responsableId = actorDel(user);
    const registro = particularConditionsRepository.createCondition({
      escuelaId: alumno.escuelaId,
      alumnoId: alumno.id,
      alumno: nombreCompleto(alumno),
      dni: alumno.dni,
      descripcion,
      fechaInicio,
      estado,
      /* El responsable es siempre quien esta autenticado: no lo decide el cliente. */
      responsableId,
      responsable: nombreActor(user),
      fechaFinalizacion: estado === ESTADO_FINALIZADA ? fechaInicio : null,
      finalizadoPor: estado === ESTADO_FINALIZADA ? responsableId : null,
      creadoPor: responsableId
    });

    particularConditionsRepository.registrarAuditoria({
      accion: "condicion-particular:create",
      actorId: responsableId,
      entidadId: registro.id,
      antes: null,
      despues: vistaCondicion(registro)
    });

    return { statusCode: 201, body: { data: vistaCondicion(registro) } };
  },

  listarCondiciones(query, user) {
    const { errores, alumnoId, estado, q, desde, hasta, orden } = validarFiltros(query);

    if (errores.length > 0) {
      throw errorDeValidacion(errores);
    }

    if (alumnoId) {
      validarAlumno(alumnoId);
    }

    const lista = ordenar(
      particularConditionsRepository
        .listConditions({ escuelaId: escuelaDel(user), alumnoId, estado, desde, hasta, q })
        .map(vistaCondicion),
      ORDENES_CONDICIONES[orden]
    );

    return {
      statusCode: 200,
      body: paginar(lista, query, {
        alumnoId: alumnoId ?? null,
        estado: estado ?? null,
        q: q ?? null,
        desde: desde ?? null,
        hasta: hasta ?? null,
        orden
      })
    };
  },

  listarDeAlumno(alumnoId) {
    const alumno = validarAlumno(alumnoId);
    const lista = ordenar(
      particularConditionsRepository.listConditions({ alumnoId: alumno.id }).map(vistaCondicion),
      ORDENES_CONDICIONES.creado_desc
    );

    return { statusCode: 200, body: { data: lista } };
  },

  obtenerCondicion(id) {
    const registro = particularConditionsRepository.findConditionById(id);

    if (!registro) {
      throw noEncontrado("La condicion particular");
    }

    return { statusCode: 200, body: { data: vistaCondicion(registro) } };
  },

  actualizarCondicion(id, data, user) {
    const actual = particularConditionsRepository.findConditionById(id);

    if (!actual) {
      throw noEncontrado("La condicion particular");
    }

    if (actual.estado === ESTADO_FINALIZADA) {
      throw conflicto("No se puede modificar una condicion finalizada. Su historial queda disponible para consulta.");
    }

    const errores = [];

    if (data?.alumnoId !== undefined && data.alumnoId !== actual.alumnoId) {
      errores.push({ field: "alumnoId", message: "No se puede modificar el alumno de una condicion ya registrada." });
    }

    const descripcion = validarDescripcion(data, errores);
    const fechaInicio = validarFecha(data, errores);

    if (errores.length > 0) {
      throw errorDeValidacion(errores);
    }

    if (
      descripcion !== undefined &&
      descripcion !== actual.descripcion &&
      particularConditionsRepository.findActiveDuplicate({ alumnoId: actual.alumnoId, descripcion, excludeId: id })
    ) {
      throw conflicto("El alumno ya tiene una condicion activa con la misma descripcion.");
    }

    const cambios = {};

    if (descripcion !== undefined && descripcion !== actual.descripcion) cambios.descripcion = descripcion;
    if (fechaInicio !== undefined && fechaInicio !== actual.fechaInicio) cambios.fechaInicio = fechaInicio;

    if (Object.keys(cambios).length === 0) {
      return { statusCode: 200, body: { data: vistaCondicion(actual) } };
    }

    cambios.actualizadoPor = actorDel(user);

    const actualizado = particularConditionsRepository.updateCondition(id, cambios, snapshotCondicion(actual));

    particularConditionsRepository.registrarAuditoria({
      accion: "condicion-particular:update",
      actorId: actorDel(user),
      entidadId: id,
      antes: vistaCondicion(actual),
      despues: vistaCondicion(actualizado)
    });

    return { statusCode: 200, body: { data: vistaCondicion(actualizado) } };
  },

  finalizarCondicion(id, data, user) {
    const actual = particularConditionsRepository.findConditionById(id);

    if (!actual) {
      throw noEncontrado("La condicion particular");
    }

    if (actual.estado === ESTADO_FINALIZADA) {
      throw conflicto("La condicion ya esta finalizada.");
    }

    const errores = [];
    const fechaFinalizacion = validarFecha(data, errores, { campo: "fechaFinalizacion", porDefecto: hoy() });

    if (errores.length > 0) {
      throw errorDeValidacion(errores);
    }

    const actorId = actorDel(user);
    const actualizado = particularConditionsRepository.updateCondition(
      id,
      {
        estado: ESTADO_FINALIZADA,
        fechaFinalizacion,
        finalizadoPor: actorId,
        actualizadoPor: actorId
      },
      snapshotCondicion(actual)
    );

    particularConditionsRepository.registrarAuditoria({
      accion: "condicion-particular:finalizar",
      actorId,
      entidadId: id,
      antes: vistaCondicion(actual),
      despues: vistaCondicion(actualizado)
    });

    return { statusCode: 200, body: { data: vistaCondicion(actualizado) } };
  },

  historialDeAlumno(alumnoId) {
    const alumno = validarAlumno(alumnoId);
    const condiciones = ordenar(
      particularConditionsRepository.listConditions({ alumnoId: alumno.id }).map(vistaCondicion),
      ORDENES_CONDICIONES.creado_desc
    );

    return {
      statusCode: 200,
      body: {
        data: {
          alumno: {
            id: alumno.id,
            apellido: alumno.apellido,
            nombre: alumno.nombre,
            dni: alumno.dni,
            nombreCompleto: nombreCompleto(alumno)
          },
          total: condiciones.length,
          activas: condiciones.filter((condicion) => condicion.activa).length,
          finalizadas: condiciones.filter((condicion) => !condicion.activa).length,
          condiciones
        }
      }
    };
  },

  resumenDeAlumno(alumnoId) {
    const alumno = validarAlumno(alumnoId);
    const condiciones = particularConditionsRepository.listConditions({ alumnoId: alumno.id });
    const activas = condiciones.filter((condicion) => condicion.estado === ESTADO_ACTIVA);
    const fechas = condiciones.map((condicion) => condicion.fechaInicio).sort();
    const finalizadas = condiciones
      .filter((condicion) => condicion.estado === ESTADO_FINALIZADA && condicion.fechaFinalizacion)
      .sort((a, b) => (a.fechaFinalizacion < b.fechaFinalizacion ? 1 : -1));

    return {
      statusCode: 200,
      body: {
        data: {
          alumno: {
            id: alumno.id,
            apellido: alumno.apellido,
            nombre: alumno.nombre,
            dni: alumno.dni,
            nombreCompleto: nombreCompleto(alumno)
          },
          tieneCondiciones: condiciones.length > 0,
          total: condiciones.length,
          activas: activas.length,
          finalizadas: condiciones.length - activas.length,
          primeraFecha: fechas[0] ?? null,
          ultimaFecha: fechas[fechas.length - 1] ?? null,
          ultimaFinalizacion: finalizadas[0]?.fechaFinalizacion ?? null
        }
      }
    };
  }
};

export default particularConditionsService;
