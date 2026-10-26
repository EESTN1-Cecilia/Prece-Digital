import { errorDeValidacion, noEncontrado } from "../../utils/api-error.mjs";
import { alumnoEnCursos, cursosPermitidos } from "../auth/alcance-cursos.service.mjs";
import studentRepository from "../students/students.repository.mjs";
import observationsRepository from "./observations.repository.mjs";
import {
  ACCION_MAXIMA,
  ACCION_MINIMA,
  DESCRIPCION_MAXIMA,
  DESCRIPCION_MINIMA,
  ESTADOS_OBSERVACION,
  ESTADOS_SEGUIMIENTO,
  ESTADOS_SEGUIMIENTO_VALIDOS,
  ESTADOS_VALIDOS,
  ORDENES_OBSERVACIONES,
  ORDENES_SEGUIMIENTOS_OBSERVACION,
  SECTOR_MAXIMO,
  SECTORES_SUGERIDOS,
  SEGUIMIENTO_OBSERVACION_MAXIMA,
  SEGUIMIENTO_OBSERVACION_MINIMA,
  TIPOS_OBSERVACION,
  TIPOS_VALIDOS,
  descripcionDeTipo,
  hoy,
  normalizarFecha
} from "./catalogo.mjs";

/* Servicio de observaciones de alumnos.

   Reglas del dominio:
   - Toda observacion cuelga de un alumno existente.
   - El responsable sale siempre del usuario autenticado; si el cuerpo trae un
     `responsable` distinto se ignora (compatibilidad con el contrato previo).
   - La escuela sale de la asignacion del usuario y nunca del cuerpo.
   - Una observacion tiene acciones de seguimiento. Registrar una accion no
     modifica la observacion: convive con ella.
   - Toda modificacion guarda el estado anterior en `historial` y queda en la
     auditoria del modulo, ademas de la auditoria transversal del request.
   - No hay baja de observaciones ni de acciones: el historial se conserva. */

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

export function vistaObservacion(registro) {
  const seguimientos = observationsRepository.listSeguimientos({ observacionId: registro.id });

  return {
    id: registro.id,
    escuelaId: registro.escuelaId,
    alumnoId: registro.alumnoId,
    alumno: registro.alumno,
    dni: registro.dni,
    fecha: registro.fecha,
    tipo: registro.tipo,
    tipoDescripcion: descripcionDeTipo(registro.tipo),
    descripcion: registro.descripcion,
    sector: registro.sector,
    responsable: registro.responsable,
    usuarioResponsable: registro.responsable,
    estado: registro.estado,
    historial: [...(registro.historial ?? [])],
    seguimiento: {
      total: seguimientos.length,
      pendientes: seguimientos.filter((seguimiento) => seguimiento.estado === "pendiente").length,
      realizadas: seguimientos.filter((seguimiento) => seguimiento.estado === "realizada").length
    },
    creadoPor: registro.creadoPor,
    creadoEn: registro.creadoEn,
    actualizadoPor: registro.actualizadoPor ?? null,
    actualizadoEn: registro.actualizadoEn
  };
}

function publicSeguimiento(registro) {
  const responsable = observationsRepository.findUserRefById(registro.responsableId);

  return {
    id: registro.id,
    observacionId: registro.observacionId,
    escuelaId: registro.escuelaId,
    fecha: registro.fecha,
    accion: registro.accion,
    observaciones: registro.observaciones,
    estado: registro.estado,
    fechaCierre: registro.fechaCierre,
    responsableId: registro.responsableId,
    responsable: responsable ?? { id: registro.responsableId },
    usuarioResponsable: responsable?.displayName ?? null,
    historial: [...(registro.historial ?? [])],
    creadoEn: registro.creadoEn,
    creadoPor: registro.creadoPor ?? registro.responsableId ?? null,
    actualizadoEn: registro.actualizadoEn,
    actualizadoPor: registro.actualizadoPor ?? null
  };
}

function snapshotObservacion(registro) {
  return {
    fecha: registro.fecha,
    tipo: registro.tipo,
    descripcion: registro.descripcion,
    sector: registro.sector,
    estado: registro.estado,
    registradoPor: registro.actualizadoPor ?? registro.creadoPor ?? null,
    registradoEn: registro.actualizadoEn ?? registro.creadoEn
  };
}

function snapshotSeguimiento(registro) {
  return {
    fecha: registro.fecha,
    accion: registro.accion,
    observaciones: registro.observaciones,
    estado: registro.estado,
    fechaCierre: registro.fechaCierre,
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
  const alumno = observationsRepository.findStudentRefById(alumnoId);

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
    errores.push({ field: "descripcion", message: "La descripcion no puede estar vacia." });
    return undefined;
  }

  if (descripcion.length > DESCRIPCION_MAXIMA) {
    errores.push({ field: "descripcion", message: `La descripcion admite hasta ${DESCRIPCION_MAXIMA} caracteres.` });
    return undefined;
  }

  return descripcion;
}

function validarTipo(data, errores, { requerido } = {}) {
  if (data?.tipo === undefined || data?.tipo === null || data?.tipo === "") {
    if (requerido) {
      errores.push({ field: "tipo", message: "El tipo es obligatorio." });
    }

    return undefined;
  }

  if (!TIPOS_VALIDOS.includes(data.tipo)) {
    errores.push({ field: "tipo", message: `El tipo debe ser uno de: ${TIPOS_VALIDOS.join(", ")}.` });
    return undefined;
  }

  return data.tipo;
}

function validarFecha(data, errores, { porDefecto } = {}) {
  const crudo = data?.fecha;

  if (crudo === undefined || crudo === null || crudo === "") {
    return porDefecto;
  }

  const fecha = normalizarFecha(crudo);

  if (fecha === undefined) {
    errores.push({ field: "fecha", message: "La fecha debe tener formato AAAA-MM-DD." });
    return undefined;
  }

  if (fecha > hoy()) {
    errores.push({ field: "fecha", message: "La fecha no puede ser futura." });
    return undefined;
  }

  return fecha;
}

function validarSector(data, errores) {
  if (data?.sector === undefined || data?.sector === null) {
    return undefined;
  }

  if (typeof data.sector !== "string") {
    errores.push({ field: "sector", message: "El sector debe ser texto." });
    return undefined;
  }

  const sector = data.sector.trim();

  if (!sector) {
    return null;
  }

  if (sector.length > SECTOR_MAXIMO) {
    errores.push({ field: "sector", message: `El sector admite hasta ${SECTOR_MAXIMO} caracteres.` });
    return undefined;
  }

  return sector;
}

function validarEstadoObservacion(data, errores, { porDefecto } = {}) {
  if (data?.estado === undefined || data?.estado === null || data?.estado === "") {
    return porDefecto;
  }

  if (!ESTADOS_VALIDOS.includes(data.estado)) {
    errores.push({ field: "estado", message: `El estado debe ser uno de: ${ESTADOS_VALIDOS.join(", ")}.` });
    return undefined;
  }

  return data.estado;
}

function validarAccion(data, errores, { requerido } = {}) {
  if (data?.accion === undefined || data?.accion === null) {
    if (requerido) {
      errores.push({ field: "accion", message: "La accion de seguimiento es obligatoria." });
    }

    return undefined;
  }

  if (typeof data.accion !== "string") {
    errores.push({ field: "accion", message: "La accion debe ser texto." });
    return undefined;
  }

  const accion = data.accion.trim();

  if (accion.length < ACCION_MINIMA) {
    errores.push({ field: "accion", message: `La accion debe tener al menos ${ACCION_MINIMA} caracteres.` });
    return undefined;
  }

  if (accion.length > ACCION_MAXIMA) {
    errores.push({ field: "accion", message: `La accion no puede superar los ${ACCION_MAXIMA} caracteres.` });
    return undefined;
  }

  return accion;
}

function validarObservacionesSeguimiento(data, errores) {
  if (data?.observaciones === undefined || data?.observaciones === null || data?.observaciones === "") {
    return null;
  }

  if (typeof data.observaciones !== "string") {
    errores.push({ field: "observaciones", message: "Las observaciones deben ser texto." });
    return null;
  }

  const observaciones = data.observaciones.trim();

  if (observaciones.length < SEGUIMIENTO_OBSERVACION_MINIMA) {
    errores.push({ field: "observaciones", message: "Las observaciones no pueden estar vacias." });
    return null;
  }

  if (observaciones.length > SEGUIMIENTO_OBSERVACION_MAXIMA) {
    errores.push({ field: "observaciones", message: `Las observaciones no pueden superar los ${SEGUIMIENTO_OBSERVACION_MAXIMA} caracteres.` });
    return null;
  }

  return observaciones;
}

function validarEstadoSeguimiento(data, errores, { porDefecto } = {}) {
  if (data?.estado === undefined || data?.estado === null || data?.estado === "") {
    return porDefecto;
  }

  if (!ESTADOS_SEGUIMIENTO_VALIDOS.includes(data.estado)) {
    errores.push({ field: "estado", message: `El estado debe ser uno de: ${ESTADOS_SEGUIMIENTO_VALIDOS.join(", ")}.` });
    return undefined;
  }

  return data.estado;
}

function validarTipoFiltro(query, errores) {
  if (query.tipo === undefined || query.tipo === null || query.tipo === "") {
    return undefined;
  }

  if (!TIPOS_VALIDOS.includes(query.tipo)) {
    errores.push({ field: "tipo", message: `El tipo debe ser uno de: ${TIPOS_VALIDOS.join(", ")}.` });
  }

  return query.tipo;
}

function validarEstadoFiltro(query, errores) {
  if (query.estado === undefined || query.estado === null || query.estado === "") {
    return undefined;
  }

  if (!ESTADOS_VALIDOS.includes(query.estado)) {
    errores.push({ field: "estado", message: `El estado debe ser uno de: ${ESTADOS_VALIDOS.join(", ")}.` });
  }

  return query.estado;
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

function validarFiltrosObservaciones(query) {
  const errores = [];
  const tipo = validarTipoFiltro(query, errores);
  const estado = validarEstadoFiltro(query, errores);
  const sector = query.sector ? String(query.sector).trim() : undefined;
  const alumnoId = query.alumnoId || undefined;
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

  const orden = query.orden ?? "fecha_desc";

  if (!ORDENES_OBSERVACIONES[orden]) {
    errores.push({ field: "orden", message: "Orden invalido." });
  }

  validarPagina(query, errores);

  return { errores, tipo, estado, sector, alumnoId, q, desde, hasta, orden };
}

/* ---------------- Servicio ------------------------------------------------ */

const observationsService = {
  catalogos() {
    return {
      statusCode: 200,
      body: {
        data: {
          tiposObservacion: TIPOS_OBSERVACION,
          estadosObservacion: ESTADOS_OBSERVACION,
          sectoresSugeridos: SECTORES_SUGERIDOS,
          estadosSeguimiento: ESTADOS_SEGUIMIENTO,
          ordenesObservaciones: Object.keys(ORDENES_OBSERVACIONES),
          ordenesSeguimientos: Object.keys(ORDENES_SEGUIMIENTOS_OBSERVACION)
        }
      }
    };
  },

  crearObservacion(alumnoId, data, user) {
    const alumno = validarAlumno(alumnoId);
    const errores = [];
    const descripcion = validarDescripcion(data, errores, { requerido: true });
    const tipo = validarTipo(data, errores, { requerido: true });
    const fecha = validarFecha(data, errores, { porDefecto: hoy() });
    const sector = validarSector(data, errores);
    const estado = validarEstadoObservacion(data, errores, { porDefecto: "Activa" });

    if (errores.length > 0) {
      throw errorDeValidacion(errores);
    }

    const responsableId = actorDel(user);
    const registro = observationsRepository.createObservation({
      escuelaId: escuelaDel(user) ?? alumno.escuelaId,
      alumnoId: alumno.id,
      alumno: nombreCompleto(alumno),
      dni: alumno.dni,
      fecha,
      tipo,
      descripcion,
      sector: sector ?? null,
      estado,
      /* El responsable es siempre quien esta autenticado: no lo decide el cliente. */
      responsable: nombreActor(user),
      creadoPor: responsableId
    });

    observationsRepository.registrarAuditoria({
      accion: "observacion:create",
      actorId: responsableId,
      entidad: "observacion",
      entidadId: registro.id,
      antes: null,
      despues: vistaObservacion(registro)
    });

    return { statusCode: 201, body: { data: vistaObservacion(registro) } };
  },

  listarObservaciones(query, user) {
    const { errores, tipo, estado, sector, alumnoId, q, desde, hasta, orden } = validarFiltrosObservaciones(query);

    if (errores.length > 0) {
      throw errorDeValidacion(errores);
    }

    const permitidos = cursosPermitidos(user);
    const lista = ordenar(
      observationsRepository
        .listObservations({ escuelaId: escuelaDel(user), alumnoId, tipo, estado, sector, desde, hasta, q })
        .filter((registro) => !permitidos || alumnoEnCursos(studentRepository.findById(registro.alumnoId), permitidos))
        .map(vistaObservacion),
      ORDENES_OBSERVACIONES[orden]
    );

    return {
      statusCode: 200,
      body: paginar(lista, query, {
        alumnoId: alumnoId ?? null,
        tipo: tipo ?? null,
        estado: estado ?? null,
        sector: sector ?? null,
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
      observationsRepository.listObservations({ alumnoId: alumno.id }).map(vistaObservacion),
      ORDENES_OBSERVACIONES.creado_desc
    );

    return { statusCode: 200, body: { data: lista } };
  },

  obtenerObservacion(id) {
    const registro = observationsRepository.findObservationById(id);

    if (!registro) {
      throw noEncontrado("La observacion");
    }

    return { statusCode: 200, body: { data: vistaObservacion(registro) } };
  },

  actualizarObservacion(id, data, user) {
    const actual = observationsRepository.findObservationById(id);

    if (!actual) {
      throw noEncontrado("La observacion");
    }

    const errores = [];

    if (data?.alumnoId !== undefined && data.alumnoId !== actual.alumnoId) {
      errores.push({ field: "alumnoId", message: "No se puede modificar el alumno de una observacion ya registrada." });
    }

    const descripcion = validarDescripcion(data, errores);
    const tipo = validarTipo(data, errores);
    const fecha = validarFecha(data, errores);
    const sector = validarSector(data, errores);
    const estado = validarEstadoObservacion(data, errores);

    if (errores.length > 0) {
      throw errorDeValidacion(errores);
    }

    const cambios = {};

    if (fecha !== undefined && fecha !== actual.fecha) cambios.fecha = fecha;
    if (tipo !== undefined && tipo !== actual.tipo) cambios.tipo = tipo;
    if (descripcion !== undefined && descripcion !== actual.descripcion) cambios.descripcion = descripcion;
    if (sector !== undefined && sector !== actual.sector) cambios.sector = sector;
    if (estado !== undefined && estado !== actual.estado) cambios.estado = estado;

    if (Object.keys(cambios).length === 0) {
      return { statusCode: 200, body: { data: vistaObservacion(actual) } };
    }

    /* Editar una observacion activa la marca como modificada, salvo que el
       cliente indique explicitamente otro estado. */
    if (cambios.estado === undefined && actual.estado === "Activa") {
      cambios.estado = "Modificada";
    }

    cambios.actualizadoPor = actorDel(user);

    const actualizado = observationsRepository.updateObservation(id, cambios, snapshotObservacion(actual));

    observationsRepository.registrarAuditoria({
      accion: "observacion:update",
      actorId: actorDel(user),
      entidad: "observacion",
      entidadId: id,
      antes: vistaObservacion(actual),
      despues: vistaObservacion(actualizado)
    });

    return { statusCode: 200, body: { data: vistaObservacion(actualizado) } };
  },

  crearSeguimiento(observacionId, data, user) {
    const observacion = observationsRepository.findObservationById(observacionId);

    if (!observacion) {
      throw noEncontrado("La observacion");
    }

    const errores = [];
    const fecha = validarFecha(data, errores, { porDefecto: hoy() });
    const accion = validarAccion(data, errores, { requerido: true });
    const observaciones = validarObservacionesSeguimiento(data, errores);
    const estado = validarEstadoSeguimiento(data, errores, { porDefecto: "pendiente" });

    if (errores.length > 0) {
      throw errorDeValidacion(errores);
    }

    const responsableId = actorDel(user);
    const registro = observationsRepository.createSeguimiento({
      observacionId: observacion.id,
      escuelaId: escuelaDel(user) ?? observacion.escuelaId,
      fecha,
      accion,
      observaciones,
      estado,
      fechaCierre: estado === "realizada" ? fecha : null,
      responsableId,
      creadoPor: responsableId
    });

    observationsRepository.registrarAuditoria({
      accion: "observacion-seguimiento:create",
      actorId: responsableId,
      entidad: "observacion_seguimiento",
      entidadId: registro.id,
      antes: null,
      despues: publicSeguimiento(registro)
    });

    return { statusCode: 201, body: { data: publicSeguimiento(registro) } };
  },

  listarSeguimientosDeObservacion(observacionId) {
    const observacion = observationsRepository.findObservationById(observacionId);

    if (!observacion) {
      throw noEncontrado("La observacion");
    }

    const lista = ordenar(
      observationsRepository.listSeguimientos({ observacionId: observacion.id }),
      ORDENES_SEGUIMIENTOS_OBSERVACION.creado_desc
    ).map(publicSeguimiento);

    return { statusCode: 200, body: { data: lista } };
  },

  obtenerSeguimiento(id) {
    const registro = observationsRepository.findSeguimientoById(id);

    if (!registro) {
      throw noEncontrado("El seguimiento de la observacion");
    }

    return { statusCode: 200, body: { data: publicSeguimiento(registro) } };
  },

  actualizarSeguimiento(id, data, user) {
    const actual = observationsRepository.findSeguimientoById(id);

    if (!actual) {
      throw noEncontrado("El seguimiento de la observacion");
    }

    const errores = [];
    const fecha = validarFecha(data, errores);
    const accion = validarAccion(data, errores);
    const observaciones = validarObservacionesSeguimiento(data, errores);
    const estado = validarEstadoSeguimiento(data, errores);

    if (errores.length > 0) {
      throw errorDeValidacion(errores);
    }

    const cambios = {};

    if (fecha !== undefined && fecha !== actual.fecha) cambios.fecha = fecha;
    if (accion !== undefined && accion !== actual.accion) cambios.accion = accion;
    if (observaciones !== null && observaciones !== actual.observaciones) cambios.observaciones = observaciones;

    if (estado !== undefined && estado !== actual.estado) {
      cambios.estado = estado;
      cambios.fechaCierre = estado === "realizada" ? (fecha ?? actual.fecha) : null;
    }

    if (Object.keys(cambios).length === 0) {
      return { statusCode: 200, body: { data: publicSeguimiento(actual) } };
    }

    cambios.actualizadoPor = actorDel(user);

    const actualizado = observationsRepository.updateSeguimiento(id, cambios, snapshotSeguimiento(actual));

    observationsRepository.registrarAuditoria({
      accion: "observacion-seguimiento:update",
      actorId: actorDel(user),
      entidad: "observacion_seguimiento",
      entidadId: id,
      antes: publicSeguimiento(actual),
      despues: publicSeguimiento(actualizado)
    });

    return { statusCode: 200, body: { data: publicSeguimiento(actualizado) } };
  },

  historialDeAlumno(alumnoId) {
    const alumno = validarAlumno(alumnoId);
    const observaciones = ordenar(
      observationsRepository.listObservations({ alumnoId: alumno.id }).map(vistaObservacion),
      ORDENES_OBSERVACIONES.creado_desc
    ).map((observacion) => ({
      ...observacion,
      seguimientos: ordenar(
        observationsRepository.listSeguimientos({ observacionId: observacion.id }),
        ORDENES_SEGUIMIENTOS_OBSERVACION.creado_desc
      ).map(publicSeguimiento)
    }));

    const seguimientos = observaciones.flatMap((observacion) => observacion.seguimientos);

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
          observaciones,
          seguimiento: {
            total: seguimientos.length,
            pendientes: seguimientos.filter((seguimiento) => seguimiento.estado === "pendiente").length,
            realizadas: seguimientos.filter((seguimiento) => seguimiento.estado === "realizada").length
          }
        }
      }
    };
  },

  resumenDeAlumno(alumnoId) {
    const alumno = validarAlumno(alumnoId);
    const observaciones = observationsRepository.listObservations({ alumnoId: alumno.id });
    const porTipo = Object.fromEntries(TIPOS_VALIDOS.map((tipo) => [tipo, 0]));
    const porEstado = Object.fromEntries(ESTADOS_VALIDOS.map((estado) => [estado, 0]));

    for (const observacion of observaciones) {
      porTipo[observacion.tipo] = (porTipo[observacion.tipo] ?? 0) + 1;
      porEstado[observacion.estado] = (porEstado[observacion.estado] ?? 0) + 1;
    }

    const seguimientos = observaciones.flatMap((observacion) => observationsRepository.listSeguimientos({ observacionId: observacion.id }));
    const fechas = observaciones.map((observacion) => observacion.fecha).sort();

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
          tieneObservaciones: observaciones.length > 0,
          total: observaciones.length,
          primeraFecha: fechas[0] ?? null,
          ultimaFecha: fechas[fechas.length - 1] ?? null,
          porTipo,
          porEstado,
          seguimiento: {
            total: seguimientos.length,
            pendientes: seguimientos.filter((seguimiento) => seguimiento.estado === "pendiente").length,
            realizadas: seguimientos.filter((seguimiento) => seguimiento.estado === "realizada").length
          }
        }
      }
    };
  }
};

export default observationsService;
