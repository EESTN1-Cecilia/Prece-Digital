import { errorDeValidacion, noEncontrado } from "../../utils/api-error.mjs";
import attendanceFollowupsRepository from "./attendance-followups.repository.mjs";
import {
  OBSERVACIONES_MAX,
  OBSERVACIONES_MIN,
  ORDENES_ALUMNOS_SEGUIMIENTO,
  ORDENES_SEGUIMIENTOS,
  TIPOS_ACCION,
  TIPOS_VALIDOS,
  descripcionDeTipo,
  hoy,
  normalizarFecha
} from "./catalogo.mjs";

/* Servicio de seguimiento de inasistencias.

   Reglas del dominio:
   - Toda accion va asociada a un alumno existente.
   - La fecha de la accion es obligatoria y no puede estar en el futuro: se
     registra lo que ya se hizo.
   - El responsable sale siempre del usuario autenticado. Si el cuerpo trae un
     responsable distinto, la operacion se rechaza en lugar de ignorar el dato.
   - Un seguimiento no crea, modifica ni cierra una inasistencia: convive con
     ella. Un alumno puede accumulating tantas acciones como haga falta.
   - Toda modificacion guarda el estado anterior en `historial` y queda en la
     auditoria del modulo, mas la auditoria transversal que registra el request.
   - No hay baja de seguimientos: el historial de intervenciones se conserva. */

const POR_PAGINA_MAXIMO = 100;
const POR_PAGINA_DEFECTO = 20;

const collator = new Intl.Collator("es", { sensitivity: "base" });

function actorDel(user) {
  return user?.id ?? null;
}

/* La escuela sale de la asignacion del usuario autenticado y nunca del cuerpo:
   un cliente no puede escribir el seguimiento en otra escuela. Sin asignacion de
   escuela (admin, direccion) la lista no se filtra. */
function escuelaDel(user) {
  return user?.assignments?.find((a) => a.schoolId)?.schoolId ?? null;
}

/* ---------------- Vistas publicas ----------------------------------------- */

function publicAlumno(alumno) {
  return {
    id: alumno.id,
    escuelaId: alumno.escuelaId,
    apellido: alumno.apellido,
    nombre: alumno.nombre,
    dni: alumno.dni
  };
}

function publicSeguimiento(registro) {
  const alumno = attendanceFollowupsRepository.findStudentRefById(registro.alumnoId);
  const responsable = attendanceFollowupsRepository.findUserRefById(registro.responsableId);

  return {
    id: registro.id,
    escuelaId: registro.escuelaId,
    alumnoId: registro.alumnoId,
    alumno: alumno ? publicAlumno(alumno) : { id: registro.alumnoId },
    fecha: registro.fecha,
    tipo: registro.tipo,
    tipoDescripcion: descripcionDeTipo(registro.tipo),
    responsableId: registro.responsableId,
    responsable: responsable ?? { id: registro.responsableId },
    observaciones: registro.observaciones,
    historial: [...(registro.historial ?? [])],
    creadoEn: registro.creadoEn,
    creadoPor: registro.creadoPor ?? registro.responsableId ?? null,
    actualizadoEn: registro.actualizadoEn,
    actualizadoPor: registro.actualizadoPor ?? null
  };
}

/* Estado previo de una intervencion: es lo que queda en `historial` cuando el
   registro se modifica, para que la intervencion anterior siga siendo visible
   con su fecha y su tipo originales. */
function snapshotDe(registro) {
  return {
    fechaAccion: registro.fecha,
    tipo: registro.tipo,
    tipoDescripcion: descripcionDeTipo(registro.tipo),
    observaciones: registro.observaciones,
    registradoPor: registro.actualizadoPor ?? registro.creadoPor ?? null,
    registradoEn: registro.actualizadoEn ?? registro.creadoEn
  };
}

function ordenar(lista, config) {
  if (!config) {
    return lista;
  }

  return [...lista].sort((a, b) => {
    const izquierdo = a[config.campo];
    const derecho = b[config.campo];

    if (config.porEntero) {
      return (izquierdo - derecho) * config.sentido;
    }

    return collator.compare(String(izquierdo ?? ""), String(derecho ?? "")) * config.sentido;
  });
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

function validarOrden(query, errores, porDefecto) {
  const orden = query.orden ?? porDefecto;

  if (!ORDENES_SEGUIMIENTOS[orden]) {
    errores.push({ field: "orden", message: "Orden invalido." });
    return porDefecto;
  }

  return orden;
}

function validarAlumno(data, errores) {
  if (!data?.alumnoId) {
    errores.push({ field: "alumnoId", message: "El alumno es obligatorio." });
    return null;
  }

  const alumno = attendanceFollowupsRepository.findStudentRefById(data.alumnoId);

  if (!alumno) {
    errores.push({ field: "alumnoId", message: "El alumno indicado no existe." });
    return null;
  }

  return alumno;
}

function validarFecha(data, errores, { requerido } = {}) {
  if (data?.fecha === undefined || data?.fecha === null || data?.fecha === "") {
    if (requerido) {
      errores.push({ field: "fecha", message: "La fecha de la accion es obligatoria." });
    }

    return undefined;
  }

  const fecha = normalizarFecha(data.fecha);

  if (fecha === undefined) {
    errores.push({ field: "fecha", message: "La fecha de la accion debe tener formato AAAA-MM-DD." });
    return undefined;
  }

  if (fecha > hoy()) {
    errores.push({ field: "fecha", message: "La fecha de la accion no puede ser futura." });
    return undefined;
  }

  return fecha;
}

function validarTipo(data, errores, { requerido } = {}) {
  if (data?.tipo === undefined || data?.tipo === null || data?.tipo === "") {
    if (requerido) {
      errores.push({ field: "tipo", message: "El tipo de accion es obligatorio." });
    }

    return undefined;
  }

  if (!TIPOS_VALIDOS.includes(data.tipo)) {
    errores.push({ field: "tipo", message: `El tipo de accion debe ser uno de: ${TIPOS_VALIDOS.join(", ")}.` });
    return undefined;
  }

  return data.tipo;
}

function validarObservaciones(data, errores, { requerido } = {}) {
  if (data?.observaciones === undefined || data?.observaciones === null) {
    if (requerido) {
      errores.push({ field: "observaciones", message: "Las observaciones son obligatorias." });
    }

    return null;
  }

  if (typeof data.observaciones !== "string") {
    errores.push({ field: "observaciones", message: "Las observaciones deben ser texto." });
    return null;
  }

  const observaciones = data.observaciones.trim();

  if (observaciones.length < OBSERVACIONES_MIN) {
    errores.push({
      field: "observaciones",
      message: `Las observaciones deben tener al menos ${OBSERVACIONES_MIN} caracteres.`
    });
    return null;
  }

  if (observaciones.length > OBSERVACIONES_MAX) {
    errores.push({
      field: "observaciones",
      message: `Las observaciones no pueden superar los ${OBSERVACIONES_MAX} caracteres.`
    });
    return null;
  }

  return observaciones;
}

/* El responsable nunca se toma del cuerpo: sale del usuario autenticado (verifyToken
   ya garantiza que existe y esta activo). Un responsable distinto se rechaza. */
function validarResponsable(data, user, errores) {
  const enviado = data?.usuarioResponsableId;

  if (enviado === undefined || enviado === null || enviado === "") {
    return actorDel(user);
  }

  if (enviado !== actorDel(user)) {
    errores.push({
      field: "usuarioResponsableId",
      message: "El responsable de la accion es el usuario autenticado y no se puede enviar desde el cliente."
    });
    return null;
  }

  return actorDel(user);
}

/* Filtros compartidos por el listado general y el historial de un alumno. */
function validarFiltrosDeListado(query) {
  const errores = [];
  const tipo = validarTipo(query, errores);
  const responsableId = query.responsableId || undefined;
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

  const orden = validarOrden(query, errores, "fecha_desc");
  validarPagina(query, errores);

  return { errores, tipo, responsableId, desde, hasta, orden };
}

function validarAlumnoIdDePath(alumnoId) {
  const alumno = attendanceFollowupsRepository.findStudentRefById(alumnoId);

  if (!alumno) {
    throw noEncontrado("El alumno");
  }

  return alumno;
}

/* ---------------- Servicio ------------------------------------------------ */

const attendanceFollowupsService = {
  createSeguimiento(data, user) {
    const errores = [];
    const alumno = validarAlumno(data, errores);
    const fecha = validarFecha(data, errores, { requerido: true });
    const tipo = validarTipo(data, errores, { requerido: true });
    const observaciones = validarObservaciones(data, errores, { requerido: true });
    const responsableId = validarResponsable(data, user, errores);

    if (errores.length > 0) {
      throw errorDeValidacion(errores);
    }

    const registro = attendanceFollowupsRepository.createSeguimiento({
      escuelaId: escuelaDel(user) ?? alumno.escuelaId,
      alumnoId: alumno.id,
      fecha,
      tipo,
      responsableId,
      observaciones,
      creadoPor: responsableId,
      actualizadoPor: responsableId
    });

    attendanceFollowupsRepository.registrarAuditoria({
      accion: "seguimiento:create",
      actorId: responsableId,
      entidadId: registro.id,
      antes: null,
      despues: publicSeguimiento(registro)
    });

    return { statusCode: 201, body: { data: publicSeguimiento(registro) } };
  },

  getSeguimiento(id) {
    const registro = attendanceFollowupsRepository.findSeguimientoById(id);

    if (!registro) {
      throw noEncontrado("El seguimiento de inasistencia");
    }

    return { statusCode: 200, body: { data: publicSeguimiento(registro) } };
  },

  updateSeguimiento(id, data, user) {
    const actual = attendanceFollowupsRepository.findSeguimientoById(id);

    if (!actual) {
      throw noEncontrado("El seguimiento de inasistencia");
    }

    const errores = [];

    if (data?.alumnoId !== undefined && data.alumnoId !== actual.alumnoId) {
      errores.push({ field: "alumnoId", message: "No se puede modificar el alumno de un seguimiento ya registrado." });
    }

    validarResponsable(data, user, errores);

    const fecha = validarFecha(data, errores);
    const tipo = validarTipo(data, errores);
    const observaciones = validarObservaciones(data, errores);

    if (errores.length > 0) {
      throw errorDeValidacion(errores);
    }

    const cambios = {};

    if (fecha !== undefined && fecha !== actual.fecha) {
      cambios.fecha = fecha;
    }

    if (tipo !== undefined && tipo !== actual.tipo) {
      cambios.tipo = tipo;
    }

    if (observaciones !== null && observaciones !== actual.observaciones) {
      cambios.observaciones = observaciones;
    }

    if (Object.keys(cambios).length === 0) {
      return { statusCode: 200, body: { data: publicSeguimiento(actual) } };
    }

    cambios.actualizadoPor = actorDel(user);

    const actualizado = attendanceFollowupsRepository.updateSeguimiento(id, cambios, snapshotDe(actual));

    attendanceFollowupsRepository.registrarAuditoria({
      accion: "seguimiento:update",
      actorId: actorDel(user),
      entidadId: id,
      antes: publicSeguimiento(actual),
      despues: publicSeguimiento(actualizado)
    });

    return { statusCode: 200, body: { data: publicSeguimiento(actualizado) } };
  },

  listSeguimientos(query, user) {
    const { errores, tipo, responsableId, desde, hasta, orden } = validarFiltrosDeListado(query);

    if (errores.length > 0) {
      throw errorDeValidacion(errores);
    }

    const lista = ordenar(
      attendanceFollowupsRepository
        .listSeguimientos({
          escuelaId: escuelaDel(user),
          alumnoId: query.alumnoId,
          tipo,
          responsableId,
          desde,
          hasta
        })
        .map(publicSeguimiento),
      ORDENES_SEGUIMIENTOS[orden]
    );

    return {
      statusCode: 200,
      body: paginar(lista, query, {
        alumnoId: query.alumnoId ?? null,
        tipo: tipo ?? null,
        responsableId: responsableId ?? null,
        desde: desde ?? null,
        hasta: hasta ?? null,
        orden
      })
    };
  },

  getHistorialDeAlumno(alumnoId, query) {
    const alumno = validarAlumnoIdDePath(alumnoId);
    const { errores, tipo, responsableId, desde, hasta, orden } = validarFiltrosDeListado(query);

    if (errores.length > 0) {
      throw errorDeValidacion(errores);
    }

    const acciones = ordenar(
      attendanceFollowupsRepository
        .listSeguimientos({ alumnoId: alumno.id, tipo, responsableId, desde, hasta })
        .map(publicSeguimiento),
      ORDENES_SEGUIMIENTOS[orden]
    );

    const { data, filtros, paginacion } = paginar(acciones, query, {
      alumnoId: alumno.id,
      tipo: tipo ?? null,
      responsableId: responsableId ?? null,
      desde: desde ?? null,
      hasta: hasta ?? null,
      orden
    });

    return {
      statusCode: 200,
      body: { data: { alumno: publicAlumno(alumno), acciones: data }, filtros, paginacion }
    };
  },

  getUltimoDeAlumno(alumnoId) {
    const alumno = validarAlumnoIdDePath(alumnoId);
    const ultimo = attendanceFollowupsRepository.findUltimoDeAlumno(alumno.id);

    if (!ultimo) {
      throw noEncontrado("La ultima accion de seguimiento del alumno");
    }

    return {
      statusCode: 200,
      body: { data: { alumno: publicAlumno(alumno), seguimiento: publicSeguimiento(ultimo) } }
    };
  },

  /* Responde si al alumno ya se lo intervenio: es el dato que usa la institucion
     para decidir si todavia hay que contactar a la familia. */
  getResumenDeAlumno(alumnoId) {
    const alumno = validarAlumnoIdDePath(alumnoId);
    const registros = attendanceFollowupsRepository.listSeguimientos({ alumnoId: alumno.id });
    const ultimo = attendanceFollowupsRepository.findUltimoDeAlumno(alumno.id);
    const porTipo = Object.fromEntries(TIPOS_VALIDOS.map((tipo) => [tipo, 0]));

    for (const registro of registros) {
      porTipo[registro.tipo] = (porTipo[registro.tipo] ?? 0) + 1;
    }

    const fechas = registros.map((registro) => registro.fecha).sort();

    return {
      statusCode: 200,
      body: {
        data: {
          alumno: publicAlumno(alumno),
          tieneSeguimiento: registros.length > 0,
          total: registros.length,
          primeraFecha: fechas[0] ?? null,
          ultimaFecha: fechas[fechas.length - 1] ?? null,
          porTipo,
          ultimaAccion: ultimo ? publicSeguimiento(ultimo) : null
        }
      }
    };
  },

  listAlumnosConSeguimientos(query, user) {
    const errores = [];
    const orden = query.orden ?? "alumno";

    if (!ORDENES_ALUMNOS_SEGUIMIENTO[orden]) {
      errores.push({
        field: "orden",
        message: `Orden invalido. Use uno de: ${Object.keys(ORDENES_ALUMNOS_SEGUIMIENTO).join(", ")}.`
      });
    }

    validarPagina(query, errores);

    if (errores.length > 0) {
      throw errorDeValidacion(errores);
    }

    const lista = ordenar(
      attendanceFollowupsRepository.listarAlumnosConSeguimientos({ escuelaId: escuelaDel(user) }),
      ORDENES_ALUMNOS_SEGUIMIENTO[orden]
    );

    return {
      statusCode: 200,
      body: paginar(lista, query, { orden })
    };
  },

  getCatalogos() {
    return {
      statusCode: 200,
      body: {
        data: {
          tiposAccion: TIPOS_ACCION,
          ordenes: Object.keys(ORDENES_SEGUIMIENTOS),
          ordenesAlumnos: Object.keys(ORDENES_ALUMNOS_SEGUIMIENTO)
        }
      }
    };
  }
};

export default attendanceFollowupsService;
