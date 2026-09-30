import attendanceAlertsRepository from "./attendance-alerts.repository.mjs";
import { escuelaDe, esDeLaEscuelaDelUsuario } from "./configuracion.service.mjs";
import attendanceInasistenciasService from "./inasistencias.service.mjs";
import { despacharEvento, enviarEvento } from "./despacho-notificaciones.service.mjs";
import { detectarAlertas, rachaActual } from "./deteccion.service.mjs";
import { errorDeValidacion, noEncontrado } from "../../utils/api-error.mjs";
import {
  CONDICIONES_VALIDAS,
  ESTADOS_ALERTA_VALIDOS,
  descripcionDeCondicion,
  descripcionDeEstado,
  normalizarFecha,
  transicionPermitida
} from "./catalogo.mjs";

/* Orquestacion de la deteccion de alertas.

   El orden de las operaciones es el que pide la institucion y evita estados
   inconsistentes:

     1. la deteccion (pura) dice que periodos cumplen la condicion,
     2. se descarta el periodo si ya hay una alerta valida para esa clave,
     3. se registra la situacion detectada,
     4. recien ahi se genera el evento y se notifica.

   Si el paso 4 falla, la alerta queda registrada con su evento pendiente y se
   puede reintentar sin volver a detectar nada. Como la clave del periodo depende
   solo de escuela, alumno, condicion, periodo y umbral, repetir la evaluacion no
   produce una segunda alerta. */

const POR_PAGINA_MAXIMO = 100;
const POR_PAGINA_DEFECTO = 20;

const collator = new Intl.Collator("es", { sensitivity: "base" });

const ORDENES = {
  periodo: { campo: "periodoHasta", sentido: -1 },
  periodo_asc: { campo: "periodoHasta", sentido: 1 },
  deteccion: { campo: "fechaDeteccion", sentido: -1 },
  deteccion_asc: { campo: "fechaDeteccion", sentido: 1 },
  alumno: { campo: "alumnoSort", sentido: 1 },
  alumno_desc: { campo: "alumnoSort", sentido: -1 }
};

function ordenar(lista, config) {
  if (!config) {
    return lista;
  }

  return [...lista].sort(
    (a, b) => collator.compare(String(a[config.campo] ?? ""), String(b[config.campo] ?? "")) * config.sentido
  );
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

function validarPagina(query, errores) {
  if (query.pagina !== undefined) {
    const pagina = Number(query.pagina);

    if (!Number.isInteger(pagina) || pagina < 1) {
      errores.push({ field: "pagina", message: "La pagina debe ser un numero entero mayor o igual a 1." });
    }
  }

  if (query.porPagina !== undefined) {
    const porPagina = Number(query.porPagina);

    if (!Number.isInteger(porPagina) || porPagina < 1 || porPagina > POR_PAGINA_MAXIMO) {
      errores.push({
        field: "porPagina",
        message: `La cantidad por pagina debe estar entre 1 y ${POR_PAGINA_MAXIMO}.`
      });
    }
  }
}

function validarOrden(query, errores, porDefecto) {
  const orden = query.orden ?? porDefecto;

  if (!ORDENES[orden]) {
    errores.push({ field: "orden", message: `Orden invalido. Use uno de: ${Object.keys(ORDENES).join(", ")}.` });
    return porDefecto;
  }

  return orden;
}

/* Una alerta es valida mientras no fue descartada: mientras exista una valida para
   la clave, el mismo periodo no vuelve a generar otra. */
function alertaValidaPara(clave) {
  const existente = attendanceAlertsRepository.findAlertaPorClave(clave);

  if (!existente) {
    return null;
  }

  return existente.estado === "descartada" ? null : existente;
}

function registrarSituacion({ periodo, alumno, configuracion, disparador, actor }) {
  const alerta = attendanceAlertsRepository.crearAlerta({
    escuelaId: configuracion.escuelaId,
    alumnoId: alumno.id,
    condicion: periodo.condicion,
    condicionDescripcion: descripcionDeCondicion(periodo.condicion),
    clave: periodo.clave,
    cantidadInasistencias: periodo.cantidadInasistencias,
    diasConsecutivosExigidos: periodo.diasConsecutivosExigidos,
    periodoDesde: periodo.periodoDesde,
    periodoHasta: periodo.periodoHasta,
    dias: periodo.dias,
    inasistenciaIds: periodo.inasistenciaIds,
    inasistencias: periodo.inasistencias,
    generadaPor: actor,
    disparador,
    estado: "activa",
    observaciones: null,
    /* Queda guardado con que regla se detecto: si la escuela despues cambia el
       umbral, la alerta vieja sigue explicando por que salto. */
    configuracionAplicada: {
      diasConsecutivos: configuracion.diasConsecutivos,
      tiposContabilizados: [...configuracion.tiposContabilizados],
      justificadasGeneranAlerta: configuracion.justificadasGeneranAlerta,
      justificadasReinicianRacha: configuracion.justificadasReinicianRacha,
      prioridadNotificacion: configuracion.prioridadNotificacion,
      canales: [...configuracion.canales],
      diasNoHabiles: [...configuracion.diasNoHabiles]
    }
  });

  attendanceAlertsRepository.registrarAuditoria({
    accion: "alerta:create",
    actorId: actor,
    entidad: "alerta_ausencia",
    entidadId: alerta.id,
    despues: alerta
  });

  return alerta;
}

/* Evalua un alumno y deja el resultado listo para responder. */
function evaluarAlumno({ alumno, disparador, actor }) {
  const configuracion = attendanceAlertsRepository.findConfiguracion(alumno.escuelaId);
  const inasistencias = attendanceAlertsRepository.inasistenciasDeAlumno(alumno.id);
  const periodos = detectarAlertas(inasistencias, configuracion, alumno);

  const creadas = [];
  const omitidas = [];

  for (const periodo of periodos) {
    const existente = alertaValidaPara(periodo.clave);

    if (existente) {
      omitidas.push({
        clave: periodo.clave,
        alertaId: existente.id,
        periodoDesde: periodo.periodoDesde,
        periodoHasta: periodo.periodoHasta,
        motivo: "Ya existe una alerta valida para este alumno, condicion y periodo."
      });
      continue;
    }

    const alerta = registrarSituacion({ periodo, alumno, configuracion, disparador, actor });
    const { evento, notificaciones } = despacharEvento({ alerta, alumno });
    const conEvento = attendanceAlertsRepository.vincularEvento(
      alerta.id,
      evento,
      notificaciones.map((notificacion) => notificacion.id)
    );

    creadas.push(conEvento);
  }

  return { creadas, omitidas, total: periodos.length };
}

function resumirEvaluacion({ escuelaId, disparador, actor, resultados, iniciadoEn }) {
  const alertasCreadas = resultados.flatMap((item) => item.creadas);
  const omitidas = resultados.flatMap((item) => item.omitidas);

  attendanceAlertsRepository.registrarEvaluacion({
    escuelaId,
    disparador,
    ejecutadaPor: actor,
    iniciadaEn: iniciadoEn,
    finalizadaEn: new Date().toISOString(),
    alumnosEvaluados: resultados.length,
    periodosDetectados: resultados.reduce((suma, item) => suma + item.total, 0),
    alertasCreadas: alertasCreadas.length,
    alertasOmitidasPorDuplicado: omitidas.length
  });

  return { alertasCreadas, omitidas };
}

function publicAlumno(alumno) {
  return {
    id: alumno.id,
    escuelaId: alumno.escuelaId,
    apellido: alumno.apellido,
    nombre: alumno.nombre,
    dni: alumno.dni,
    curso: alumno.curso,
    division: alumno.division
  };
}

function publicAlerta(alerta) {
  const alumno = attendanceAlertsRepository.findStudentRefById(alerta.alumnoId);

  return {
    id: alerta.id,
    escuelaId: alerta.escuelaId,
    alumnoId: alerta.alumnoId,
    alumno: alumno ? publicAlumno(alumno) : { id: alerta.alumnoId },
    condicion: alerta.condicion,
    condicionDescripcion: alerta.condicionDescripcion,
    clave: alerta.clave,
    estado: alerta.estado,
    estadoDescripcion: descripcionDeEstado(alerta.estado),
    cantidadInasistencias: alerta.cantidadInasistencias,
    diasConsecutivosExigidos: alerta.diasConsecutivosExigidos,
    periodo: {
      desde: alerta.periodoDesde,
      hasta: alerta.periodoHasta,
      dias: alerta.dias
    },
    periodoDesde: alerta.periodoDesde,
    periodoHasta: alerta.periodoHasta,
    dias: alerta.dias,
    inasistenciaIds: alerta.inasistenciaIds,
    inasistencias: alerta.inasistencias,
    detectadaEn: alerta.detectadaEn,
    fechaDeteccion: alerta.fechaDeteccion,
    generadaEn: alerta.generadaEn,
    generadaPor: alerta.generadaPor,
    disparador: alerta.disparador,
    configuracionAplicada: alerta.configuracionAplicada,
    observaciones: alerta.observaciones,
    seguimientoId: alerta.seguimientoId,
    /* Relacion con el sistema de notificaciones: el modulo detecta y registra,
       el envio es responsabilidad de otro. */
    notificacion: alerta.evento
      ? {
          eventoId: alerta.eventoId,
          tipoEvento: alerta.evento.tipoEvento,
          tipoNotificacion: alerta.evento.tipoNotificacion,
          prioridad: alerta.evento.prioridad,
          canales: alerta.evento.canales,
          destinatarios: alerta.evento.destinatarios,
          estadoEnvio: alerta.evento.estadoEnvio,
          mensaje: alerta.evento.mensaje,
          generadoEn: alerta.evento.generadoEn,
          enviadoEn: alerta.evento.enviadoEn,
          notificacionesIds: alerta.notificacionesIds
        }
      : null,
    historial: [...(alerta.historial ?? [])],
    resueltaEn: alerta.resueltaEn,
    resueltaPor: alerta.resueltaPor,
    actualizadoEn: alerta.actualizadoEn,
    actualizadoPor: alerta.actualizadoPor
  };
}

/* Una alerta de otra escuela no existe para quien pregunta: se responde 404 y no
   403 para no revelar que el id existe. */
function alertaDeLaEscuela(alertaId, user) {
  const alerta = attendanceAlertsRepository.findAlertaById(alertaId);

  if (!alerta || !esDeLaEscuelaDelUsuario(alerta.escuelaId, user)) {
    throw noEncontrado("La alerta");
  }

  return alerta;
}

/* Lo mismo para el alumno: si es de otra escuela, la API no lo reconoce. */
function alumnoDeLaEscuela(alumnoId, user) {
  const alumno = attendanceAlertsRepository.findStudentRefById(alumnoId);

  if (!alumno || !esDeLaEscuelaDelUsuario(alumno.escuelaId, user)) {
    throw noEncontrado("El alumno");
  }

  return alumno;
}

const attendanceAlertsService = {
  /* Se llama desde el alta, la modificacion y la baja de una inasistencia, y
     desde el proceso periodico. Mismo codigo de deteccion en los tres casos. */
  evaluarAlumno(alumnoId, { disparador = "registro_inasistencia", actor = null } = {}) {
    const alumno = attendanceAlertsRepository.findStudentRefById(alumnoId);

    if (!alumno) {
      throw noEncontrado("El alumno");
    }

    return evaluarAlumno({ alumno, disparador, actor });
  },

  /* Evaluacion periodica: recorre todos los alumnos de la escuela. El cliente no
     puede intervenir la deteccion, solo pedir que se corra. */
  evaluarEscuela({ alumnoId, disparador = "periodica", user }) {
    const escuelaId = escuelaDe(user);
    const iniciadoEn = new Date().toISOString();

    let alumnos;

    if (alumnoId) {
      const alumno = attendanceAlertsRepository.findStudentRefById(alumnoId);

      if (!alumno) {
        throw errorDeValidacion([{ field: "alumnoId", message: "El alumno indicado no existe." }]);
      }

      if (escuelaId && alumno.escuelaId !== escuelaId) {
        throw noEncontrado("El alumno");
      }

      alumnos = [alumno];
    } else {
      const registrados = attendanceAlertsRepository
        .listInasistencias({ escuelaId })
        .filter((registro) => !registro.bajaEn);

      const ids = [...new Set(registrados.map((registro) => registro.alumnoId))];

      alumnos = ids
        .map((id) => attendanceAlertsRepository.findStudentRefById(id))
        .filter((alumno) => alumno && (!escuelaId || alumno.escuelaId === escuelaId));
    }

    const resultados = alumnos.map((alumno) => {
      try {
        return evaluarAlumno({ alumno, disparador, actor: user.id });
      } catch {
        /* Un alumno con datos inconsistentes no puede frenar la evaluacion del
           resto de la escuela: se lo omite y sigue. */
        return { creadas: [], omitidas: [], total: 0 };
      }
    });

    const { alertasCreadas, omitidas } = resumirEvaluacion({
      escuelaId,
      disparador,
      actor: user.id,
      resultados,
      iniciadoEn
    });

    return {
      statusCode: 200,
      body: {
        data: {
          disparador,
          escuelaId,
          alumnosEvaluados: alumnos.length,
          periodosDetectados: resultados.reduce((suma, item) => suma + item.total, 0),
          alertasCreadas: alertasCreadas.length,
          alertasOmitidasPorDuplicado: omitidas.length,
          omitidas,
          alertas: alertasCreadas.map(publicAlerta),
          iniciadaEn: iniciadoEn,
          finalizadaEn: new Date().toISOString()
        }
      }
    };
  },

  listEvaluaciones(query, user) {
    const limite = query.limite === undefined ? 20 : Number(query.limite);

    if (!Number.isInteger(limite) || limite < 1 || limite > 100) {
      throw errorDeValidacion([{ field: "limite", message: "El limite debe estar entre 1 y 100." }]);
    }

    return {
      statusCode: 200,
      body: { data: attendanceAlertsRepository.listEvaluaciones({ escuelaId: escuelaDe(user), limite }) }
    };
  },

  /* Reintenta el envio de un evento que quedo pendiente, sin volver a detectar
     la situacion. */
  reenviarNotificacion(alertaId, user) {
    const alerta = alertaDeLaEscuela(alertaId, user);

    const evento = alerta.eventoId
      ? attendanceAlertsRepository.findEventoById(alerta.eventoId)
      : attendanceAlertsRepository.findEventoPendienteDeAlerta(alerta.id);

    if (!evento) {
      throw noEncontrado("El evento de notificacion de la alerta");
    }

    const { evento: enviado, notificaciones } = enviarEvento({ evento });

    if (enviado.estadoEnvio === "enviado" && notificaciones.length === 0) {
      return { statusCode: 200, body: { data: { alerta: publicAlerta(alerta), reenviada: false } } };
    }

    const actualizada = attendanceAlertsRepository.vincularEvento(
      alerta.id,
      enviado,
      (alerta.notificacionesIds ?? []).concat(notificaciones.map((notificacion) => notificacion.id))
    );

    attendanceAlertsRepository.registrarAuditoria({
      accion: "alerta:reenviar",
      actorId: user.id,
      entidad: "alerta_ausencia",
      entidadId: alerta.id,
      despues: actualizada
    });

    return {
      statusCode: 200,
      body: { data: { alerta: publicAlerta(actualizada), reenviada: notificaciones.length > 0 } }
    };
  },

  getAlerta(id, user) {
    return { statusCode: 200, body: { data: publicAlerta(alertaDeLaEscuela(id, user)) } };
  },

  listAlertas(query, user) {
    const errores = [];
    const orden = validarOrden(query, errores, "periodo");

    if (query.estado && !ESTADOS_ALERTA_VALIDOS.includes(query.estado)) {
      errores.push({
        field: "estado",
        message: `Estado invalido. Use uno de: ${ESTADOS_ALERTA_VALIDOS.join(", ")}.`
      });
    }

    if (query.condicion && !CONDICIONES_VALIDAS.includes(query.condicion)) {
      errores.push({
        field: "condicion",
        message: `Condicion invalida. Use una de: ${CONDICIONES_VALIDAS.join(", ")}.`
      });
    }

    const periodoDesde = query.periodoDesde ? normalizarFecha(query.periodoDesde) : null;
    const periodoHasta = query.periodoHasta ? normalizarFecha(query.periodoHasta) : null;

    if (query.periodoDesde && !periodoDesde) {
      errores.push({ field: "periodoDesde", message: "El filtro periodoDesde debe tener formato AAAA-MM-DD." });
    }

    if (query.periodoHasta && !periodoHasta) {
      errores.push({ field: "periodoHasta", message: "El filtro periodoHasta debe tener formato AAAA-MM-DD." });
    }

    validarPagina(query, errores);

    if (errores.length > 0) {
      throw errorDeValidacion(errores);
    }

    const registros = attendanceAlertsRepository
      .listAlertas({
        escuelaId: escuelaDe(user),
        alumnoId: query.alumnoId,
        estado: query.estado,
        condicion: query.condicion,
        periodoDesde,
        periodoHasta
      })
      .map((alerta) => {
        const alumno = attendanceAlertsRepository.findStudentRefById(alerta.alumnoId);

        return {
          ...alerta,
          alumnoSort: alumno ? `${alumno.apellido}, ${alumno.nombre}` : alerta.alumnoId
        };
      });

    const lista = ordenar(registros, ORDENES[orden]).map((alerta) => {
      const { alumnoSort, ...resto } = alerta;

      return publicAlerta(resto);
    });

    return {
      statusCode: 200,
      body: paginar(lista, query, {
        alumnoId: query.alumnoId ?? null,
        estado: query.estado ?? null,
        condicion: query.condicion ?? null,
        periodoDesde: periodoDesde ?? null,
        periodoHasta: periodoHasta ?? null,
        orden
      })
    };
  },

  /* Cambiar el estado de una alerta deja rastro del estado anterior. Las
     transiciones validas son las del catalogo: una alerta resuelta no vuelve a
     abrirse sola. */
  updateAlerta(id, data, user) {
    const alerta = alertaDeLaEscuela(id, user);

    const errores = [];
    const cambios = {};

    if (data.estado !== undefined) {
      if (!ESTADOS_ALERTA_VALIDOS.includes(data.estado)) {
        errores.push({
          field: "estado",
          message: `Estado invalido. Use uno de: ${ESTADOS_ALERTA_VALIDOS.join(", ")}.`
        });
      } else if (data.estado !== alerta.estado) {
        if (!transicionPermitida(alerta.estado, data.estado)) {
          errores.push({
            field: "estado",
            message: `No se puede pasar de "${alerta.estado}" a "${data.estado}".`
          });
        } else {
          cambios.estado = data.estado;
        }
      }
    }

    if (data.observaciones !== undefined) {
      const observaciones = data.observaciones === null ? null : String(data.observaciones).trim();

      if (observaciones && observaciones.length > 500) {
        errores.push({ field: "observaciones", message: "Las observaciones no pueden superar los 500 caracteres." });
      } else if (observaciones !== alerta.observaciones) {
        cambios.observaciones = observaciones || null;
      }
    }

    /* Referencia opcional a la intervencion que resolvio la alerta. Queda como
       dato, no como relacion obligatoria: el modulo de seguimiento es
       independiente de este. */
    if (data.seguimientoId !== undefined) {
      const seguimientoId = data.seguimientoId === null ? null : String(data.seguimientoId).trim();

      if (seguimientoId !== "" && seguimientoId !== alerta.seguimientoId) {
        cambios.seguimientoId = seguimientoId;
      }
    }

    if (errores.length > 0) {
      throw errorDeValidacion(errores);
    }

    if (Object.keys(cambios).length === 0) {
      return { statusCode: 200, body: { data: publicAlerta(alerta), cambios: false } };
    }

    if (cambios.estado === "resuelta" || cambios.estado === "descartada") {
      cambios.resueltaEn = new Date().toISOString();
      cambios.resueltaPor = user.id;
    }

    if (cambios.estado && cambios.estado !== "resuelta" && cambios.estado !== "descartada") {
      cambios.resueltaEn = null;
      cambios.resueltaPor = null;
    }

    const actualizada = attendanceAlertsRepository.actualizarAlerta(id, cambios, alerta, user.id);

    attendanceAlertsRepository.registrarAuditoria({
      accion: "alerta:update",
      actorId: user.id,
      entidad: "alerta_ausencia",
      entidadId: id,
      antes: alerta,
      despues: actualizada
    });

    return { statusCode: 200, body: { data: publicAlerta(actualizada), cambios: true } };
  },

  getAlertasDeAlumno(alumnoId, query, user) {
    const alumno = alumnoDeLaEscuela(alumnoId, user);

    const errores = [];
    const orden = validarOrden(query, errores, "periodo");

    if (query.estado && !ESTADOS_ALERTA_VALIDOS.includes(query.estado)) {
      errores.push({
        field: "estado",
        message: `Estado invalido. Use uno de: ${ESTADOS_ALERTA_VALIDOS.join(", ")}.`
      });
    }

    validarPagina(query, errores);

    if (errores.length > 0) {
      throw errorDeValidacion(errores);
    }

    const alertas = attendanceAlertsRepository.listAlertas({ alumnoId: alumno.id, estado: query.estado });

    return {
      statusCode: 200,
      body: paginar(
        ordenar(alertas, ORDENES[orden]).map(publicAlerta),
        query,
        { alumnoId: alumno.id, estado: query.estado ?? null, orden }
      )
    };
  },

  /* Lo que la institucion necesita ver para actuar: si el alumno ya fue
     intervenido, cuantas inasistencias lleva y cuanto falta para la alerta. */
  getResumenDeAlumno(alumnoId, user) {
    const alumno = alumnoDeLaEscuela(alumnoId, user);

    const escuelaId = alumno.escuelaId;
    const configuracion = attendanceAlertsRepository.findConfiguracion(escuelaId);
    const inasistencias = attendanceAlertsRepository.inasistenciasDeAlumno(alumno.id);
    const alertas = attendanceAlertsRepository.listAlertas({ alumnoId: alumno.id });
    const computadas = inasistencias.filter((registro) =>
      configuracion.tiposContabilizados.includes(registro.tipo)
    );

    const porTipo = {};
    for (const registro of computadas) {
      porTipo[registro.tipo] = (porTipo[registro.tipo] ?? 0) + 1;
    }

    return {
      statusCode: 200,
      body: {
        data: {
          alumno: publicAlumno(alumno),
          configuracion,
          totalInasistencias: inasistencias.length,
          computadasPorRegla: computadas.length,
          justificadas: computadas.filter((registro) => registro.justificada).length,
          injustificadas: computadas.filter((registro) => !registro.justificada).length,
          porTipo,
          racha: rachaActual(inasistencias, configuracion),
          alertasActivas: alertas.filter((alerta) => alerta.estado === "activa" || alerta.estado === "en_revision")
            .length,
          alertasResueltas: alertas.filter((alerta) => alerta.estado === "resuelta").length,
          alertasDescartadas: alertas.filter((alerta) => alerta.estado === "descartada").length,
          ultimaAlerta: alertas.length > 0 ? publicAlerta(alertas[0]) : null
        }
      }
    };
  },

  /* Punto de entrada unico para cuando cambia una inasistencia: detecta y, si
     corresponde, registra la alerta y genera la notificacion. */
  registrarInasistencia(data, user) {
    const respuesta = attendanceInasistenciasService.createInasistencia(data, user);
    const evaluacion = attendanceAlertsService.evaluarAlumno(respuesta.body.data.alumnoId, {
      disparador: "registro_inasistencia",
      actor: user.id
    });

    return {
      statusCode: respuesta.statusCode,
      body: {
        data: respuesta.body.data,
        evaluacion: {
          disparador: "registro_inasistencia",
          periodosDetectados: evaluacion.total,
          alertasCreadas: evaluacion.creadas.map(publicAlerta),
          alertasOmitidasPorDuplicado: evaluacion.omitidas
        }
      }
    };
  },

  actualizarInasistencia(id, data, user) {
    const respuesta = attendanceInasistenciasService.updateInasistencia(id, data, user);
    const evaluacion = attendanceAlertsService.evaluarAlumno(respuesta.body.data.alumnoId, {
      disparador: "modificacion_inasistencia",
      actor: user.id
    });

    return {
      statusCode: respuesta.statusCode,
      body: {
        ...respuesta.body,
        evaluacion: {
          disparador: "modificacion_inasistencia",
          periodosDetectados: evaluacion.total,
          alertasCreadas: evaluacion.creadas.map(publicAlerta),
          alertasOmitidasPorDuplicado: evaluacion.omitidas
        }
      }
    };
  },

  bajaInasistencia(id, data, user) {
    const respuesta = attendanceInasistenciasService.deactivateInasistencia(id, data, user);
    const evaluacion = attendanceAlertsService.evaluarAlumno(respuesta.body.data.alumnoId, {
      disparador: "baja_inasistencia",
      actor: user.id
    });

    return {
      statusCode: respuesta.statusCode,
      body: {
        ...respuesta.body,
        evaluacion: {
          disparador: "baja_inasistencia",
          periodosDetectados: evaluacion.total,
          alertasCreadas: evaluacion.creadas.map(publicAlerta),
          alertasOmitidasPorDuplicado: evaluacion.omitidas
        }
      }
    };
  }
};

export { publicAlerta };
export default attendanceAlertsService;
