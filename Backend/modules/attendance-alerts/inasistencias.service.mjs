import attendanceAlertsRepository from "./attendance-alerts.repository.mjs";
import { conflicto, errorDeValidacion, noEncontrado } from "../../utils/api-error.mjs";
import { escuelaDe, esDeLaEscuelaDelUsuario } from "./configuracion.service.mjs";
import { descripcionDeTipo, hoy, normalizarFecha, TIPOS_INASISTENCIA_VALIDOS } from "./catalogo.mjs";

/* Registro de inasistencias de alumnos.

   Es el insumo de la deteccion: guarda lo que la institucion registro, con su
   justificacion, y se da de baja de forma logica (nunca se borra fisico) para
   que el historico academico siga siendo auditable.

   El alta no decide si genera alerta: deja la evaluacion a la orquestacion, que
   corre la misma deteccion que el proceso periodico. */

const OBSERVACIONES_MAX = 500;

function validarAlumno(alumnoId, user) {
  if (alumnoId === undefined || alumnoId === null || alumnoId === "") {
    return { errores: [{ field: "alumnoId", message: "El alumno es obligatorio." }] };
  }

  if (typeof alumnoId !== "string") {
    return { errores: [{ field: "alumnoId", message: "El alumno debe ser un identificador." }] };
  }

  const alumno = attendanceAlertsRepository.findStudentRefById(alumnoId);

  if (!alumno || !esDeLaEscuelaDelUsuario(alumno.escuelaId, user)) {
    return { errores: [{ field: "alumnoId", message: "El alumno indicado no existe." }] };
  }

  return { alumno, errores: [] };
}

function validarFecha(fecha) {
  if (fecha === undefined || fecha === null || fecha === "") {
    return "La fecha de la inasistencia es obligatoria.";
  }

  if (typeof fecha !== "string") {
    return "La fecha de la inasistencia debe ser texto.";
  }

  const normalizada = normalizarFecha(fecha);

  if (!normalizada) {
    return "La fecha de la inasistencia debe tener formato AAAA-MM-DD.";
  }

  if (normalizada > hoy()) {
    return "La fecha de la inasistencia no puede ser futura.";
  }

  return null;
}

const attendanceInasistenciasService = {
  /* La evaluacion no se dispara aca: la devuelve la orquestacion para que el
     cliente vea en la misma respuesta la inasistencia y las alertas que produjo. */
  createInasistencia(data, user) {
    const errores = [];
    const { alumno, errores: erroresAlumno } = validarAlumno(data?.alumnoId, user);

    errores.push(...erroresAlumno);

    const errorFecha = validarFecha(data?.fecha);

    if (errorFecha) {
      errores.push({ field: "fecha", message: errorFecha });
    }

    if (!TIPOS_INASISTENCIA_VALIDOS.includes(data?.tipo)) {
      errores.push({
        field: "tipo",
        message: `El tipo de inasistencia debe ser uno de: ${TIPOS_INASISTENCIA_VALIDOS.join(", ")}.`
      });
    }

    if (typeof data?.justificada !== "boolean") {
      errores.push({ field: "justificada", message: "Indique si la inasistencia esta justificada." });
    }

    const motivo = data?.motivo === undefined || data?.motivo === null ? "" : String(data.motivo).trim();

    if (data?.justificada === true && motivo.length < 5) {
      errores.push({
        field: "motivo",
        message: "Una inasistencia justificada necesita un motivo de al menos 5 caracteres."
      });
    }

    if (motivo.length > OBSERVACIONES_MAX) {
      errores.push({
        field: "motivo",
        message: `El motivo no puede superar los ${OBSERVACIONES_MAX} caracteres.`
      });
    }

    const observaciones = data?.observaciones === undefined || data?.observaciones === null
      ? null
      : String(data.observaciones).trim();

    if (observaciones && observaciones.length > OBSERVACIONES_MAX) {
      errores.push({
        field: "observaciones",
        message: `Las observaciones no pueden superar los ${OBSERVACIONES_MAX} caracteres.`
      });
    }

    if (errores.length > 0) {
      throw errorDeValidacion(errores);
    }

    const fecha = normalizarFecha(data.fecha);
    const existente = attendanceAlertsRepository.findInasistenciaVigenteDe(alumno.id, fecha);

    if (existente) {
      throw conflicto(
        `El alumno ya tiene una inasistencia registrada el ${fecha}. Modifiquela en lugar de duplicarla.`
      );
    }

    const inasistencia = attendanceAlertsRepository.createInasistencia({
      escuelaId: escuelaDe(user) ?? alumno.escuelaId,
      alumnoId: alumno.id,
      fecha,
      tipo: data.tipo,
      justificada: data.justificada,
      motivo: motivo || null,
      observaciones: observaciones || null,
      registradoPor: user.id
    });

    attendanceAlertsRepository.registrarAuditoria({
      accion: "inasistencia:create",
      actorId: user.id,
      entidad: "inasistencia",
      entidadId: inasistencia.id,
      despues: inasistencia
    });

    return { statusCode: 201, body: { data: publicInasistencia(inasistencia) } };
  },

  getInasistencia(id, user) {
    const inasistencia = attendanceAlertsRepository.findInasistenciaById(id);

    if (!inasistencia || !esDeLaEscuelaDelUsuario(inasistencia.escuelaId, user)) {
      throw noEncontrado("La inasistencia");
    }

    return { statusCode: 200, body: { data: publicInasistencia(inasistencia) } };
  },

  listInasistencias(query, user) {
    const errores = [];
    const desde = query.desde ? normalizarFecha(query.desde) : null;
    const hasta = query.hasta ? normalizarFecha(query.hasta) : null;

    if (query.desde && !desde) {
      errores.push({ field: "desde", message: "El filtro desde debe tener formato AAAA-MM-DD." });
    }

    if (query.hasta && !hasta) {
      errores.push({ field: "hasta", message: "El filtro hasta debe tener formato AAAA-MM-DD." });
    }

    if (desde && hasta && desde > hasta) {
      errores.push({ field: "desde", message: "El filtro desde no puede ser posterior al filtro hasta." });
    }

    if (query.tipo && !TIPOS_INASISTENCIA_VALIDOS.includes(query.tipo)) {
      errores.push({
        field: "tipo",
        message: `El tipo de inasistencia debe ser uno de: ${TIPOS_INASISTENCIA_VALIDOS.join(", ")}.`
      });
    }

    if (errores.length > 0) {
      throw errorDeValidacion(errores);
    }

    const registros = attendanceAlertsRepository.listInasistencias({
      escuelaId: escuelaDe(user),
      alumnoId: query.alumnoId,
      desde,
      hasta,
      tipo: query.tipo,
      justificada: query.justificada,
      incluirBajas: query.incluirBajas === "true"
    });

    return {
      statusCode: 200,
      body: {
        data: registros.map(publicInasistencia),
        filtros: {
          alumnoId: query.alumnoId ?? null,
          tipo: query.tipo ?? null,
          justificada: query.justificada ?? null,
          desde: desde ?? null,
          hasta: hasta ?? null,
          incluirBajas: query.incluirBajas === "true"
        }
      }
    };
  },

  /* Modificar una inasistencia puede cambiar el resultado de la deteccion: al
     justificar una ausencia la racha se corta. Por eso se vuelve a evaluar, y
     como la deteccion es idempotente no aparecen alertas duplicadas. */
  updateInasistencia(id, data, user) {
    const inasistencia = attendanceAlertsRepository.findInasistenciaById(id);

    if (!inasistencia || inasistencia.bajaEn || !esDeLaEscuelaDelUsuario(inasistencia.escuelaId, user)) {
      throw noEncontrado("La inasistencia");
    }

    const errores = [];
    const cambios = {};

    if (data.fecha !== undefined) {
      const errorFecha = validarFecha(data.fecha);

      if (errorFecha) {
        errores.push({ field: "fecha", message: errorFecha });
      } else {
        const fecha = normalizarFecha(data.fecha);
        const choque = attendanceAlertsRepository.findInasistenciaVigenteDe(inasistencia.alumnoId, fecha);

        if (choque && choque.id !== inasistencia.id) {
          errores.push({
            field: "fecha",
            message: `El alumno ya tiene otra inasistencia registrada el ${fecha}.`
          });
        } else if (fecha !== inasistencia.fecha) {
          cambios.fecha = fecha;
        }
      }
    }

    if (data.tipo !== undefined) {
      if (!TIPOS_INASISTENCIA_VALIDOS.includes(data.tipo)) {
        errores.push({
          field: "tipo",
          message: `El tipo de inasistencia debe ser uno de: ${TIPOS_INASISTENCIA_VALIDOS.join(", ")}.`
        });
      } else if (data.tipo !== inasistencia.tipo) {
        cambios.tipo = data.tipo;
      }
    }

    if (data.justificada !== undefined) {
      if (typeof data.justificada !== "boolean") {
        errores.push({ field: "justificada", message: "El campo justificada debe ser verdadero o falso." });
      } else if (data.justificada !== inasistencia.justificada) {
        cambios.justificada = data.justificada;
      }
    }

    const motivoPropuesto =
      data.motivo === undefined ? (inasistencia.motivo ?? "") : String(data.motivo ?? "").trim();

    if (motivoPropuesto.length > OBSERVACIONES_MAX) {
      errores.push({ field: "motivo", message: `El motivo no puede superar los ${OBSERVACIONES_MAX} caracteres.` });
    }

    const justificadaResultante = cambios.justificada ?? inasistencia.justificada;

    /* El motivo va atado a la justificacion: si queda justificada tiene que
       decir por que, y si deja de estarlo se puede vaciar. */
    if (justificadaResultante) {
      if (motivoPropuesto.length < 5) {
        errores.push({
          field: "motivo",
          message: "Una inasistencia justificada necesita un motivo de al menos 5 caracteres."
        });
      } else if (motivoPropuesto !== (inasistencia.motivo ?? "")) {
        cambios.motivo = motivoPropuesto;
      }
    } else if (data.motivo !== undefined) {
      cambios.motivo = motivoPropuesto || null;
    }

    if (data.observaciones !== undefined) {
      const observaciones = data.observaciones === null ? null : String(data.observaciones).trim();

      if (observaciones && observaciones.length > OBSERVACIONES_MAX) {
        errores.push({
          field: "observaciones",
          message: `Las observaciones no pueden superar los ${OBSERVACIONES_MAX} caracteres.`
        });
      } else if (observaciones !== (inasistencia.observaciones ?? null)) {
        cambios.observaciones = observaciones || null;
      }
    }

    if (errores.length > 0) {
      throw errorDeValidacion(errores);
    }

    if (Object.keys(cambios).length === 0) {
      return { statusCode: 200, body: { data: publicInasistencia(inasistencia), cambios: false } };
    }

    const actualizada = attendanceAlertsRepository.actualizarInasistencia(id, cambios, user.id);

    attendanceAlertsRepository.registrarAuditoria({
      accion: "inasistencia:update",
      actorId: user.id,
      entidad: "inasistencia",
      entidadId: id,
      antes: inasistencia,
      despues: actualizada
    });

    return { statusCode: 200, body: { data: publicInasistencia(actualizada), cambios: true } };
  },

  /* Baja logica: el registro queda con fecha y motivo, nunca se borra fisico. */
  deactivateInasistencia(id, data, user) {
    const inasistencia = attendanceAlertsRepository.findInasistenciaById(id);

    if (!inasistencia || inasistencia.bajaEn || !esDeLaEscuelaDelUsuario(inasistencia.escuelaId, user)) {
      throw noEncontrado("La inasistencia");
    }

    const motivo = data?.motivo === undefined || data?.motivo === null ? "" : String(data.motivo).trim();

    if (motivo.length < 5) {
      throw errorDeValidacion([
        { field: "motivo", message: "Indique el motivo de la baja (al menos 5 caracteres)." }
      ]);
    }

    if (motivo.length > OBSERVACIONES_MAX) {
      throw errorDeValidacion([
        { field: "motivo", message: `El motivo no puede superar los ${OBSERVACIONES_MAX} caracteres.` }
      ]);
    }

    const actualizada = attendanceAlertsRepository.actualizarInasistencia(
      id,
      { bajaEn: new Date().toISOString(), bajaMotivo: motivo, bajaPor: user.id },
      user.id
    );

    attendanceAlertsRepository.registrarAuditoria({
      accion: "inasistencia:deactivate",
      actorId: user.id,
      entidad: "inasistencia",
      entidadId: id,
      antes: inasistencia,
      despues: actualizada
    });

    return { statusCode: 200, body: { data: publicInasistencia(actualizada) } };
  },

  getInasistenciasDeAlumno(alumnoId, query, user) {
    const { alumno, errores: erroresAlumno } = validarAlumno(alumnoId, user);

    if (erroresAlumno.length > 0) {
      throw errorDeValidacion(erroresAlumno);
    }

    const desde = query.desde ? normalizarFecha(query.desde) : null;
    const hasta = query.hasta ? normalizarFecha(query.hasta) : null;
    const errores = [];

    if (query.desde && !desde) {
      errores.push({ field: "desde", message: "El filtro desde debe tener formato AAAA-MM-DD." });
    }

    if (query.hasta && !hasta) {
      errores.push({ field: "hasta", message: "El filtro hasta debe tener formato AAAA-MM-DD." });
    }

    if (desde && hasta && desde > hasta) {
      errores.push({ field: "desde", message: "El filtro desde no puede ser posterior al filtro hasta." });
    }

    if (errores.length > 0) {
      throw errorDeValidacion(errores);
    }

    const registros = attendanceAlertsRepository
      .listInasistencias({
        alumnoId: alumno.id,
        desde,
        hasta,
        incluirBajas: query.incluirBajas === "true"
      })
      .sort((a, b) => (a.fecha < b.fecha ? -1 : 1));

    return {
      statusCode: 200,
      body: {
        data: {
          alumno: publicAlumno(alumno),
          inasistencias: registros.map(publicInasistencia),
          filtros: { desde: desde ?? null, hasta: hasta ?? null, incluirBajas: query.incluirBajas === "true" }
        }
      }
    };
  }
};

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

function publicInasistencia(inasistencia) {
  const alumno = attendanceAlertsRepository.findStudentRefById(inasistencia.alumnoId);

  return {
    id: inasistencia.id,
    escuelaId: inasistencia.escuelaId,
    alumnoId: inasistencia.alumnoId,
    alumno: alumno ? publicAlumno(alumno) : { id: inasistencia.alumnoId },
    fecha: inasistencia.fecha,
    tipo: inasistencia.tipo,
    tipoDescripcion: descripcionDeTipo(inasistencia.tipo),
    justificada: inasistencia.justificada,
    motivo: inasistencia.motivo,
    observaciones: inasistencia.observaciones,
    baja: Boolean(inasistencia.bajaEn),
    bajaEn: inasistencia.bajaEn,
    bajaMotivo: inasistencia.bajaMotivo,
    registradoPor: inasistencia.registradoPor,
    creadoEn: inasistencia.creadoEn,
    actualizadoEn: inasistencia.actualizadoEn,
    actualizadoPor: inasistencia.actualizadoPor
  };
}

export default attendanceInasistenciasService;
