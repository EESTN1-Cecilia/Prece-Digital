import studentRepository from "../students/students.repository.mjs";
import {
  ANIO_MAXIMO,
  ANIO_MINIMO,
  CURSOS_VALIDOS,
  MOTIVO_MAX,
  MOVIMIENTOS_MASIVOS_MAX,
  ORDENES_MOVIMIENTOS,
  TIPOS_MOVIMIENTO,
  TIPOS_VALIDOS,
  buscarDivision,
  definirDestino,
  descripcionDeTipo,
  esAnioLectivo,
  etiquetaPeriodo,
  hoy,
  normalizarCuatrimestre,
  normalizarFecha,
  normalizarTexto
} from "./catalogo.mjs";
import { errorDeValidacion, noEncontrado, conflicto, errorHttp } from "../../utils/api-error.mjs";
import courseChangesRepository from "./course-changes.repository.mjs";

/* Servicio de promocion y cambio de curso.

   Reglas del dominio:
   - Todo movimiento cuelga de un alumno existente con curso y division validos.
   - El destino debe existir en el catalogo academico y la division debe
     corresponder al curso; el backend deriva turno y orientacion del destino.
   - El tipo define la regla: promocion (curso siguiente inmediato), cambio de
     curso (curso distinto), cambio de division (mismo curso, otra division) u
     otro movimiento definido por la institucion.
   - No se registra un movimiento que deja al alumno donde ya estaba.
   - El responsable sale del usuario autenticado; el cliente no lo decide.
   - Un movimiento es inmutable: el historial del alumno no se sobrescribe ni se
     borra. Solo cambia la ubicacion actual (curso/division/turno/orientacion)
     del alumno en el modulo students.
   - Las operaciones masivas validan todo antes de aplicar, aplican de forma
     atomica y detallan exitosos y fallidos sin dejar datos inconsistentes.
   - La situacion academica y las inasistencias quedan asociadas a su periodo y
     alumno: este modulo no las toca. */

const POR_PAGINA_MAXIMO = 100;
const POR_PAGINA_DEFECTO = 20;
const Q_MAX = 100;

const collator = new Intl.Collator("es", { sensitivity: "base" });

function actorDel(user) {
  return user?.id ?? null;
}

function nombreActor(user) {
  return user?.displayName ?? user?.email ?? "Usuario del sistema";
}

function escuelaDel(user) {
  return user?.assignments?.find((assignment) => assignment.schoolId)?.schoolId ?? null;
}

/* ---------------- Vistas publicas ----------------------------------------- */

export function vistaMovimiento(movimiento) {
  return {
    id: movimiento.id,
    escuelaId: movimiento.escuelaId,
    alumnoId: movimiento.alumnoId,
    alumno: movimiento.alumno,
    dni: movimiento.dni,
    cursoAnterior: movimiento.cursoAnterior,
    divisionAnterior: movimiento.divisionAnterior,
    turnoAnterior: movimiento.turnoAnterior,
    orientacionAnterior: movimiento.orientacionAnterior,
    cursoNuevo: movimiento.cursoNuevo,
    divisionNueva: movimiento.divisionNueva,
    turnoNuevo: movimiento.turnoNuevo,
    orientacionNueva: movimiento.orientacionNueva,
    tipo: movimiento.tipo,
    tipoDescripcion: descripcionDeTipo(movimiento.tipo),
    anio: movimiento.anio,
    cuatrimestre: movimiento.cuatrimestre ?? null,
    periodo: etiquetaPeriodo(movimiento.anio, movimiento.cuatrimestre),
    fecha: movimiento.fecha,
    motivo: movimiento.motivo ?? null,
    responsableId: movimiento.responsableId,
    responsable: movimiento.responsable,
    usuarioResponsable: movimiento.responsable,
    operacionId: movimiento.operacionId ?? null,
    creadoEn: movimiento.creadoEn
  };
}

function vistaAlumnoAsignado(alumno) {
  return {
    id: alumno.id,
    apellido: alumno.apellido,
    nombre: alumno.nombre,
    dni: alumno.dni,
    curso: alumno.curso,
    division: alumno.division,
    turno: alumno.turno,
    orientacion: alumno.orientacion,
    condicion: alumno.condicion
  };
}

/* ---------------- Paginacion y orden -------------------------------------- */

function ordenar(lista, config) {
  if (!config) {
    return lista;
  }

  const aprenderCampo = ["anio", "cursoNuevo", "cursoAnterior"];

  return [...lista].sort((a, b) => {
    const izquierdo = a[config.campo];
    const derecho = b[config.campo];

    if (aprenderCampo.includes(config.campo)) {
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

/* ---------------- Validacion de la operacion base ------------------------- */

function validarBase(body, errores) {
  const anioCrudo = body?.anio === undefined || body?.anio === null || body?.anio === "" ? undefined : String(body.anio).trim();

  if (anioCrudo === undefined || !esAnioLectivo(anioCrudo)) {
    errores.push({ field: "anio", message: `El anio lectivo es obligatorio y debe ser un numero entre ${ANIO_MINIMO} y ${ANIO_MAXIMO}.` });
  }

  const anio = anioCrudo && esAnioLectivo(anioCrudo) ? Number(anioCrudo) : undefined;

  const cuatrimestre = normalizarCuatrimestre(body?.cuatrimestre);

  if (cuatrimestre === undefined) {
    errores.push({ field: "cuatrimestre", message: "El cuatrimestre debe ser 1, 2 o estar ausente." });
  }

  const fecha = body?.fecha === undefined || body?.fecha === null || body?.fecha === "" ? hoy() : normalizarFecha(body.fecha);

  if (fecha === undefined) {
    errores.push({ field: "fecha", message: "La fecha debe tener formato AAAA-MM-DD." });
  } else if (fecha > hoy()) {
    errores.push({ field: "fecha", message: "La fecha no puede ser futura." });
  }

  const motivo = body?.motivo === undefined || body?.motivo === null ? null : String(body.motivo).trim();

  if (motivo !== null) {
    if (motivo.length === 0) {
      errores.push({ field: "motivo", message: "El motivo no puede ser un texto vacio." });
    } else if (motivo.length > MOTIVO_MAX) {
      errores.push({ field: "motivo", message: `El motivo admite hasta ${MOTIVO_MAX} caracteres.` });
    }
  }

  return { anio, cuatrimestre: cuatrimestre ?? null, fecha, motivo };
}

/* Prepara un movimiento individual sin aplicar nada: valida alumno, destino,
   tipo y base. Devuelve { ok } con el contenido o { ok:false, error } para que
   los endpoints individuales traduzcan el error y las operaciones masivas lo
   reporten por alumno sin cortar la operacion. */
function prepararMovimientoItem({ alumnoId, tipo, cursoNuevo, divisionNueva, base }) {
  if (!alumnoId || typeof alumnoId !== "string") {
    return { ok: false, error: { code: "VALIDATION_ERROR", field: "alumnoId", message: "Cada movimiento debe indicar el alumnoId." } };
  }

  const alumno = courseChangesRepository.findStudentRefById(alumnoId);

  if (!alumno) {
    return { ok: false, error: { code: "NOT_FOUND", message: `El alumno ${alumnoId}` } };
  }

  if (alumno.curso === null || alumno.curso === undefined || !alumno.division) {
    return { ok: false, error: { code: "VALIDATION_ERROR", field: "cursoAnterior", message: "El alumno debe tener un curso y una division asignados validos." } };
  }

  if (!TIPOS_VALIDOS.includes(tipo)) {
    return { ok: false, error: { code: "VALIDATION_ERROR", field: "tipo", message: `El tipo debe ser uno de: ${TIPOS_VALIDOS.join(", ")}.` } };
  }

  if (base.errores.length > 0) {
    return { ok: false, error: { code: "VALIDATION_ERROR", field: base.errores[0].field, message: base.errores[0].message } };
  }

  const destino = definirDestino(tipo, { alumno, cursoNuevo, divisionNueva });

  if (destino.error) {
    return { ok: false, error: { code: "VALIDATION_ERROR", field: destino.error.field, message: destino.error.message } };
  }

  return {
    ok: true,
    data: {
      alumno,
      destino: {
        curso: destino.curso,
        division: destino.division,
        turno: destino.turno,
        orientacion: destino.orientacion
      },
      base: base.base
    }
  };
}

/* Aplica un movimiento ya validado: mueve al alumno y crea el registro inmutable. */
function aplicarMovimiento({ alumno, destino, base, tipo }, user, operacionId) {
  courseChangesRepository.actualizarUbicacionDelAlumno(alumno.id, {
    curso: destino.curso,
    division: destino.division,
    turno: destino.turno,
    orientacion: destino.orientacion
  });

  const movimiento = courseChangesRepository.crearMovimiento({
    escuelaId: alumno.escuelaId,
    alumnoId: alumno.id,
    alumno: `${alumno.apellido}, ${alumno.nombre}`,
    dni: alumno.dni,
    cursoAnterior: alumno.curso,
    divisionAnterior: String(alumno.division),
    turnoAnterior: alumno.turno ?? null,
    orientacionAnterior: alumno.orientacion ?? null,
    cursoNuevo: destino.curso,
    divisionNueva: destino.division,
    turnoNuevo: destino.turno,
    orientacionNueva: destino.orientacion,
    tipo,
    anio: base.anio,
    cuatrimestre: base.cuatrimestre,
    fecha: base.fecha,
    motivo: base.motivo,
    responsableId: actorDel(user),
    responsable: nombreActor(user),
    operacionId: operacionId ?? null
  });

  courseChangesRepository.registrarAuditoria({
    accion: "movimiento:create",
    actorId: actorDel(user),
    entidadId: movimiento.id,
    antes: null,
    despues: vistaMovimiento(movimiento)
  });

  return movimiento;
}

function revertirMovimiento(movimiento) {
  courseChangesRepository.actualizarUbicacionDelAlumno(movimiento.alumnoId, {
    curso: movimiento.cursoAnterior,
    division: movimiento.divisionAnterior,
    turno: movimiento.turnoAnterior,
    orientacion: movimiento.orientacionAnterior
  });

  courseChangesRepository.eliminarMovimiento(movimiento.id);
}

function aErrorApi(error) {
  if (error.code === "NOT_FOUND") {
    return noEncontrado(error.message);
  }

  if (error.code === "CONFLICT") {
    return conflicto(error.message);
  }

  if (error.field) {
    return errorDeValidacion([{ field: error.field, message: error.message }]);
  }

  return errorDeValidacion([{ field: "movimiento", message: error.message }]);
}

const courseChangesService = {
  catalogos() {
    return {
      statusCode: 200,
      body: {
        data: {
          tiposMovimiento: TIPOS_MOVIMIENTO,
          cursosValidos: CURSOS_VALIDOS,
          anioMinimo: ANIO_MINIMO,
          anioMaximo: ANIO_MAXIMO,
          ordenes: Object.keys(ORDENES_MOVIMIENTOS),
          limites: {
            motivoMaximo: MOTIVO_MAX,
            movimientosMasivosMaximos: MOVIMIENTOS_MASIVOS_MAX
          }
        }
      }
    };
  },

  /* ---------------- Movimiento individual -------------------------------- */

  registrarMovimiento(alumnoId, tipo, body, user) {
    if (body?.usuarioResponsableId !== undefined && String(body.usuarioResponsableId) !== String(actorDel(user))) {
      throw errorDeValidacion([{ field: "usuarioResponsableId", message: "El responsable sale del usuario autenticado; no puede elegirse en el cuerpo." }]);
    }

    const errores = [];
    const base = validarBase(body, errores);
    const preparado = prepararMovimientoItem({ alumnoId, tipo, cursoNuevo: body?.cursoNuevo, divisionNueva: body?.divisionNueva, base: { errores, base } });

    if (!preparado.ok) {
      throw aErrorApi(preparado.error);
    }

    const movimiento = aplicarMovimiento({ ...preparado.data, tipo }, user);

    return { statusCode: 201, body: { data: vistaMovimiento(movimiento) } };
  },

  promoverAlumno(alumnoId, body, user) {
    return this.registrarMovimiento(alumnoId, "promocion", body, user);
  },

  cambiarCurso(alumnoId, body, user) {
    return this.registrarMovimiento(alumnoId, "cambio_curso", body, user);
  },

  cambiarDivision(alumnoId, body, user) {
    return this.registrarMovimiento(alumnoId, "cambio_division", body, user);
  },

  /* ---------------- Operacion masiva ------------------------------------- */

  registrarMasivos(body, user) {
    const errores = [];

    if (body?.usuarioResponsableId !== undefined && String(body.usuarioResponsableId) !== String(actorDel(user))) {
      errores.push({ field: "usuarioResponsableId", message: "El responsable sale del usuario autenticado; no puede elegirse en el cuerpo." });
    }

    if (!TIPOS_VALIDOS.includes(body?.tipo)) {
      errores.push({ field: "tipo", message: `El tipo debe ser uno de: ${TIPOS_VALIDOS.join(", ")}.` });
    }

    const base = validarBase(body, errores);

    if (!Array.isArray(body?.movimientos) || body.movimientos.length === 0) {
      errores.push({ field: "movimientos", message: "movimientos debe ser una lista con al menos un alumno." });
    } else if (body.movimientos.length > MOVIMIENTOS_MASIVOS_MAX) {
      errores.push({ field: "movimientos", message: `movimientos admite hasta ${MOVIMIENTOS_MASIVOS_MAX} alumnos por operacion.` });
    }

    if (errores.length > 0) {
      throw errorDeValidacion(errores);
    }

    const tipo = body.tipo;
    const vistos = new Set();
    const items = [];

    for (const item of body.movimientos) {
      const alumnoId = item?.alumnoId;

      let preparado;

      if (!alumnoId || typeof alumnoId !== "string") {
        preparado = { ok: false, error: { code: "VALIDATION_ERROR", field: "alumnoId", message: "Cada movimiento debe indicar el alumnoId." } };
      } else if (vistos.has(alumnoId)) {
        preparado = { ok: false, error: { code: "CONFLICT", message: `El alumno ${alumnoId} esta repetido dentro de la misma operacion.` } };
      } else {
        vistos.add(alumnoId);
        preparado = prepararMovimientoItem({ alumnoId, tipo, cursoNuevo: item?.cursoNuevo, divisionNueva: item?.divisionNueva, base: { errores: [], base } });
      }

      items.push({ alumnoId, ...preparado });
    }

    const aplicados = [];
    const fallidos = [];
    let operacion = null;
    const operacionId = operacionIdNueva();

    try {
      for (const item of items) {
        if (!item.ok) {
          fallidos.push({
            alumnoId: item.alumnoId,
            alumno: null,
            error: item.error
          });
          continue;
        }

        const movimiento = aplicarMovimiento({ ...item.data, tipo }, user, operacionId);
        aplicados.push(movimiento);
      }
    } catch (error) {
      for (const movimiento of aplicados) {
        revertirMovimiento(movimiento);
      }

      throw error;
    }

    operacion = courseChangesRepository.crearOperacionMasiva({
      id: operacionId,
      escuelaId: escuelaDel(user),
      tipo,
      anio: base.anio,
      cuatrimestre: base.cuatrimestre,
      fecha: base.fecha,
      motivo: base.motivo,
      responsableId: actorDel(user),
      responsable: nombreActor(user),
      movimientos: [
        ...aplicados.map((movimiento) => ({
          alumnoId: movimiento.alumnoId,
          alumno: movimiento.alumno,
          exito: true,
          movimientoId: movimiento.id,
          cursoAnterior: movimiento.cursoAnterior,
          divisionAnterior: movimiento.divisionAnterior,
          cursoNuevo: movimiento.cursoNuevo,
          divisionNueva: movimiento.divisionNueva
        })),
        ...fallidos.map((fallido) => ({
          alumnoId: fallido.alumnoId,
          alumno: null,
          exito: false,
          error: fallido.error
        }))
      ],
      resumen: {
        total: items.length,
        exitosos: aplicados.length,
        fallidos: fallidos.length
      }
    });

    courseChangesRepository.registrarAuditoria({
      accion: "movimiento:bulk",
      actorId: actorDel(user),
      entidad: "operacion_masiva",
      entidadId: operacion.id,
      antes: null,
      despues: operacion
    });

    return {
      statusCode: 201,
      body: {
        data: {
          operacionId: operacion.id,
          tipo,
          anio: base.anio,
          cuatrimestre: base.cuatrimestre,
          periodo: etiquetaPeriodo(base.anio, base.cuatrimestre),
          fecha: base.fecha,
          motivo: base.motivo,
          total: operacion.resumen.total,
          exitosos: operacion.resumen.exitosos,
          fallidos: operacion.resumen.fallidos,
          movimientos: operacion.movimientos
        }
      }
    };
  },

  /* ---------------- Consultas --------------------------------------------- */

  listarMovimientos(query, user) {
    const errores = [];
    const tipo = query.tipo || undefined;
    const operacionId = query.operacionId || undefined;
    const alumnoId = query.alumnoId || undefined;
    const anioCrudo = query.anio === undefined || query.anio === "" ? undefined : query.anio;
    const anio = anioCrudo === undefined ? undefined : Number(String(anioCrudo).trim());
    const cuatrimestre = query.cuatrimestre === undefined || query.cuatrimestre === "" ? undefined : Number(String(query.cuatrimestre).trim());
    const curso = query.curso === undefined || query.curso === "" ? undefined : Number(String(query.curso).trim());
    const division = query.division || undefined;
    const desde = query.desde ? normalizarFecha(query.desde) : undefined;
    const hasta = query.hasta ? normalizarFecha(query.hasta) : undefined;
    const q = query.q ? String(query.q).trim().slice(0, Q_MAX) : undefined;

    if (tipo && !TIPOS_VALIDOS.includes(tipo)) {
      errores.push({ field: "tipo", message: `tipo debe ser uno de: ${TIPOS_VALIDOS.join(", ")}.` });
    }

    if (anioCrudo !== undefined && !esAnioLectivo(anioCrudo)) {
      errores.push({ field: "anio", message: "anio debe ser un anio lectivo valido." });
    }

    if (cuatrimestre !== undefined && ![1, 2].includes(cuatrimestre)) {
      errores.push({ field: "cuatrimestre", message: "cuatrimestre debe ser 1 o 2." });
    }

    if (curso !== undefined && !CURSOS_VALIDOS.includes(curso)) {
      errores.push({ field: "curso", message: "curso debe ser un curso del catalogo." });
    }

    if (division !== undefined) {
      if (curso !== undefined) {
        const derivo = buscarDivision(curso, division);

        if (!derivo) {
          errores.push({ field: "division", message: "Esa division no existe para el curso indicado." });
        }
      } else if (String(division).trim().length === 0) {
        errores.push({ field: "division", message: "division no puede ser vacia." });
      }
    }

    if (query.desde && desde === undefined) {
      errores.push({ field: "desde", message: "desde debe tener formato AAAA-MM-DD." });
    }

    if (query.hasta && hasta === undefined) {
      errores.push({ field: "hasta", message: "hasta debe tener formato AAAA-MM-DD." });
    }

    if (desde && hasta && desde > hasta) {
      errores.push({ field: "desde", message: "desde no puede ser posterior a hasta." });
    }

    const orden = query.orden ?? "fecha_desc";

    if (!ORDENES_MOVIMIENTOS[orden]) {
      errores.push({ field: "orden", message: "Orden invalido." });
    }

    validarPagina(query, errores);

    if (errores.length > 0) {
      throw errorDeValidacion(errores);
    }

    if (alumnoId && !studentRepository.findById(alumnoId)) {
      throw noEncontrado("El alumno");
    }

    const lista = ordenar(
      courseChangesRepository
        .listMovimientos({
          escuelaId: escuelaDel(user),
          alumnoId,
          tipo,
          anio,
          cuatrimestre,
          curso,
          division,
          desde,
          hasta,
          operacionId,
          q
        })
        .map(vistaMovimiento),
      ORDENES_MOVIMIENTOS[orden]
    );

    return {
      statusCode: 200,
      body: paginar(lista, query, {
        tipo: tipo ?? null,
        anio: anio ?? null,
        cuatrimestre: cuatrimestre ?? null,
        curso: curso ?? null,
        division: division ?? null,
        desde: desde ?? null,
        hasta: hasta ?? null,
        operacionId: operacionId ?? null,
        q: q ?? null,
        orden
      })
    };
  },

  obtenerMovimiento(id) {
    const movimiento = courseChangesRepository.findMovimientoById(id);

    if (!movimiento) {
      throw noEncontrado("El movimiento");
    }

    return { statusCode: 200, body: { data: vistaMovimiento(movimiento) } };
  },

  historialDeAlumno(alumnoId) {
    const alumno = studentRepository.findById(alumnoId);

    if (!alumno) {
      throw noEncontrado("El alumno");
    }

    const movimientos = courseChangesRepository
      .listMovimientos({ alumnoId, escuelaId: alumno.escuelaId })
      .map(vistaMovimiento)
      .sort((a, b) => b.creadoEn.localeCompare(a.creadoEn));

    return {
      statusCode: 200,
      body: {
        data: {
          alumno: {
            id: alumno.id,
            apellido: alumno.apellido,
            nombre: alumno.nombre,
            dni: alumno.dni
          },
          total: movimientos.length,
          movimientos
        }
      }
    };
  },

  ultimoDeAlumno(alumnoId) {
    const alumno = studentRepository.findById(alumnoId);

    if (!alumno) {
      throw noEncontrado("El alumno");
    }

    const movimientos = courseChangesRepository
      .listMovimientos({ alumnoId, escuelaId: alumno.escuelaId })
      .map(vistaMovimiento)
      .sort((a, b) => b.creadoEn.localeCompare(a.creadoEn));

    const ultimo = movimientos[0] ?? null;

    return {
      statusCode: 200,
      body: {
        data: {
          alumnoId: alumno.id,
          tieneMovimientos: Boolean(ultimo),
          ultimoMovimiento: ultimo
        }
      }
    };
  },

  situacionDeAlumno(alumnoId) {
    const alumno = studentRepository.findById(alumnoId);

    if (!alumno) {
      throw noEncontrado("El alumno");
    }

    const movimientos = courseChangesRepository.listMovimientos({ alumnoId, escuelaId: alumno.escuelaId });

    return {
      statusCode: 200,
      body: {
        data: {
          alumno: {
            id: alumno.id,
            apellido: alumno.apellido,
            nombre: alumno.nombre,
            dni: alumno.dni
          },
          curso: alumno.curso,
          division: alumno.division,
          turno: alumno.turno,
          orientacion: alumno.orientacion,
          condicion: alumno.condicion,
          activo: alumno.isActive,
          totalMovimientos: movimientos.length,
          ultimoMovimientoId: movimientos.at(-1)?.id ?? null
        }
      }
    };
  },

  asignados(query, user) {
    const errores = [];
    const curso = query.curso === undefined || query.curso === "" ? undefined : Number(String(query.curso).trim());
    const division = query.division || undefined;

    if (curso === undefined || !CURSOS_VALIDOS.includes(curso)) {
      errores.push({ field: "curso", message: "curso es obligatorio y debe ser uno del catalogo." });
    }

    if (division !== undefined) {
      if (curso === undefined || !buscarDivision(curso, division)) {
        errores.push({ field: "division", message: "Esa division no existe para el curso indicado." });
      }
    }

    validarPagina(query, errores);

    if (errores.length > 0) {
      throw errorDeValidacion(errores);
    }

    const lista = studentRepository
      .search({
        escuelaId: escuelaDel(user),
        criterios: { curso, division: division ?? null, estado: "activo" },
        orden: "apellido"
      })
      .map(vistaAlumnoAsignado);

    return {
      statusCode: 200,
      body: paginar(lista, query, {
        curso,
        division: division ?? null
      })
    };
  },

  obtenerOperacion(operacionId) {
    const operacion = courseChangesRepository.findOperacionById(operacionId);

    if (!operacion) {
      throw noEncontrado("La operacion masiva");
    }

    return {
      statusCode: 200,
      body: {
        data: {
          operacionId: operacion.id,
          escuelaId: operacion.escuelaId,
          tipo: operacion.tipo,
          tipoDescripcion: descripcionDeTipo(operacion.tipo),
          anio: operacion.anio,
          cuatrimestre: operacion.cuatrimestre,
          periodo: etiquetaPeriodo(operacion.anio, operacion.cuatrimestre),
          fecha: operacion.fecha,
          motivo: operacion.motivo,
          responsableId: operacion.responsableId,
          responsable: operacion.responsable,
          resumen: operacion.resumen,
          movimientos: operacion.movimientos,
          creadoEn: operacion.creadoEn
        }
      }
    };
  }
};

/* Identificador de operacion masiva compartido por todos sus movimientos. Se
   genera una vez por llamado, rotando un contador para evitar colisiones. */
let secuenciaOperacion = 0;

function operacionIdNueva() {
  secuenciaOperacion += 1;
  return `opr_${Date.now()}_${secuenciaOperacion}`;
}

export default courseChangesService;