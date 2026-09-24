import inasistenciasRepository from "./inasistencias.repository.mjs";
import {
  MOTIVOS,
  MOTIVOS_VALIDOS,
  ESTADOS_VALIDOS,
  ESTADO_INICIAL,
  CUATRIMESTRES,
  ORDENES_VALIDOS,
  CURSOS_VALIDOS,
  esAnioLectivo,
  etiquetaPeriodo,
  validarFechaFirme,
  calcularTotales,
  calcularTotalesPorDivision,
  calcularTotalesPorCuatrimestre,
  evaluarReglaDeTope
} from "./catalogo.mjs";
import { errorDeValidacion, noEncontrado, conflicto } from "../../utils/api-error.mjs";

const ESCUELA_DEFECTO = "esc-1";
const MAX_OBSERVACIONES = 500;
const MAX_TEXTO_JUSTIFICACION = 500;
const PAGINA_DEFECTO = 1;
const POR_PAGINA_DEFECTO = 20;
const POR_PAGINA_MAXIMO = 100;

function escuelaDel(user) {
  return String(user?.assignments?.[0]?.schoolId ?? ESCUELA_DEFECTO);
}

function esTexto(variable) {
  return typeof variable === "string" && variable.trim().length > 0;
}

function opcionalTexto(variable, campo, errores, maximo = MAX_OBSERVACIONES) {
  if (variable === undefined || variable === null) {
    return null;
  }

  if (typeof variable !== "string") {
    errores.push({ field: campo, message: `El campo ${campo} debe ser texto.` });
    return null;
  }

  const normalizado = variable.trim();

  if (normalizado.length > maximo) {
    errores.push({ field: campo, message: `El campo ${campo} no puede superar los ${maximo} caracteres.` });
    return null;
  }

  return normalizado || null;
}

function entero(valor, campo, errores) {
  if (valor === undefined || valor === null || valor === "") {
    return null;
  }

  const numero = Number(valor);

  if (!Number.isInteger(numero)) {
    errores.push({ field: campo, message: `El campo ${campo} debe ser un numero entero.` });
    return null;
  }

  return numero;
}

/* ---------------- Vista publica de un registro ----------------------------- */

function motivosDe() {
  return Object.fromEntries(MOTIVOS.map((motivo) => [motivo.codigo, motivo.nombre]));
}

function vistaInasistencia(record) {
  return {
    id: record.id,
    escuelaId: record.escuelaId,
    alumnoId: record.alumnoId,
    alumno: record.alumno,
    curso: record.curso,
    division: record.division,
    turno: record.turno,
    orientacion: record.orientacion,
    fecha: record.fecha,
    periodo: { anio: record.anio, cuatrimestre: record.cuatrimestre, etiqueta: etiquetaPeriodo(record) },
    motivo: record.motivo,
    motivoNombre: motivosDe()[record.motivo],
    estadoJustificacion: record.estadoJustificacion,
    justificacion: record.justificacion,
    observaciones: record.observaciones ?? null,
    historial: record.historial,
    createdBy: record.createdBy,
    createdAt: record.createdAt,
    updatedBy: record.updatedBy,
    updatedAt: record.updatedAt
  };
}

function normalizarJustificacion(entrada, user, errores) {
  const datos = entrada && typeof entrada === "object" ? entrada : {};

  const motivoJustificacion = opcionalTexto(datos.motivoJustificacion, "motivoJustificacion", errores, MAX_TEXTO_JUSTIFICACION);
  const descripcion = opcionalTexto(datos.descripcion, "descripcion", errores, MAX_TEXTO_JUSTIFICACION);
  const documento = opcionalTexto(datos.documento, "documento", errores, MAX_TEXTO_JUSTIFICACION);

  const datosValidos = esTexto(motivoJustificacion) || esTexto(descripcion) || esTexto(documento);

  if (!datosValidos) {
    errores.push({
      field: "justificacion",
      message: "Una justificacion requiere al menos el motivo, la descripcion o el documento presentado."
    });
    return null;
  }

  return {
    motivoJustificacion: motivoJustificacion ?? null,
    descripcion: descripcion ?? null,
    documento: documento ?? null,
    justificadaPor: user?.id ?? null,
    fechaJustificacion: new Date().toISOString()
  };
}

function validarCamposComunes({ alumno, fecha, anio, cuatrimestre, motivo, estadoJustificacion, observaciones, justificacion, user }, errores, opciones = {}) {
  const { validarAlumno = true } = opciones;

  let fechaValida = validarFechaFirme(fecha);
  let anioFinal = anio;

  if (fechaValida) {
    const anioDeFecha = Number(fecha.slice(0, 4));
    anioFinal = anio === undefined || anio === null ? anioDeFecha : Number(anio);

    if (anioFinal !== anioDeFecha) {
      errores.push({ field: "anio", message: "El ano del periodo academico debe coincidir con el ano de la fecha." });
    }
  } else {
    errores.push({ field: "fecha", message: "La fecha debe tener formato YYYY-MM-DD y ser una fecha real." });
    anioFinal = anioFinal ?? null;
  }

  if (validarAlumno && !alumno) {
    errores.push({ field: "alumnoId", message: "Debe indicar un alumno existente." });
  }

  if (anioFinal !== null && anioFinal !== undefined) {
    if (!esAnioLectivo(anioFinal)) {
      errores.push({ field: "anio", message: "El periodo academico indicado no es valido." });
    }
  }

  if (cuatrimestre !== undefined && cuatrimestre !== null && !CUATRIMESTRES.includes(Number(cuatrimestre))) {
    errores.push({ field: "cuatrimestre", message: "El cuatrimestre debe ser 1, 2 o estar vacio (periodo anual)." });
  }

  let motivoFinal = MOTIVOS_VALIDOS.includes(motivo) ? motivo : null;

  if (!motivoFinal) {
    errores.push({ field: "motivo", message: "El motivo debe estar dentro del catalogo de motivos." });
  }

  let estadoFinal = estadoJustificacion ?? ESTADO_INICIAL;

  if (!ESTADOS_VALIDOS.includes(estadoFinal)) {
    errores.push({ field: "estadoJustificacion", message: "El estado de justificacion no es valido." });
  } else if (estadoFinal === "justificada") {
    const justificada = normalizarJustificacion(justificacion, user, errores);

    if (justificada) {
      justificacion = justificada;
    }
  } else {
    justificacion = null;
  }

  const observacionesFinal = opcionalTexto(observaciones, "observaciones", errores);

  return {
    fecha: fechaValida,
    anio: anioFinal ?? (fechaValida ? Number(fecha.slice(0, 4)) : null),
    cuatrimestre: cuatrimestre === undefined || cuatrimestre === null ? null : Number(cuatrimestre),
    motivo: motivoFinal,
    estadoJustificacion: estadoFinal,
    justificacion,
    observaciones: observacionesFinal
  };
}

/* ---------------- Registro ------------------------------------------------ */

export function crearInasistencia(body, user) {
  const errores = [];
  const alumnoId = typeof body?.alumnoId === "string" && body.alumnoId.trim() ? body.alumnoId : null;

  if (!alumnoId) {
    errores.push({ field: "alumnoId", message: "El alumnoId es obligatorio." });
  }

  if (body.curso !== undefined && body.curso !== null && !CURSOS_VALIDOS.includes(Number(body.curso))) {
    errores.push({ field: "curso", message: "El curso debe estar entre 1 y 7." });
  }

  const campos = validarCamposComunes({ alumno: null, fecha: body?.fecha, anio: body?.anio, cuatrimestre: body?.cuatrimestre, motivo: body?.motivo, estadoJustificacion: body?.estadoJustificacion, observaciones: body?.observaciones, justificacion: body?.justificacion ?? body, user }, errores, { validarAlumno: false });

  const alumno = alumnoId ? inasistenciasRepository.findStudentRefById(alumnoId) : null;

  if (alumnoId && !alumno) {
    errores.push({ field: "alumnoId", message: "El alumno indicado no existe." });
  }

  if (alumno) {
    if (body.curso !== undefined && body.curso !== null && Number(body.curso) !== Number(alumno.curso)) {
      errores.push({ field: "curso", message: "El curso indicado no corresponde al curso del alumno." });
    }

    if (body.division !== undefined && body.division !== null && String(body.division) !== String(alumno.division)) {
      errores.push({ field: "division", message: "La division indicada no corresponde a la division del alumno." });
    }
  }

  if (errores.length > 0) {
    throw errorDeValidacion(errores);
  }

  const escuelaId = escuelaDel(user);

  if (inasistenciasRepository.findDuplicada(alumnoId, campos.fecha)) {
    throw conflicto("Ya existe una inasistencia registrada para ese alumno en esa fecha.");
  }

  const registro = inasistenciasRepository.create({
    escuelaId,
    alumnoId,
    alumno: { id: alumno.id, apellido: alumno.apellido, nombre: alumno.nombre, dni: alumno.dni },
    curso: alumno.curso,
    division: alumno.division,
    turno: alumno.turno,
    orientacion: alumno.orientacion,
    fecha: campos.fecha,
    anio: campos.anio,
    cuatrimestre: campos.cuatrimestre,
    motivo: campos.motivo,
    estadoJustificacion: campos.estadoJustificacion,
    justificacion: campos.justificacion,
    observaciones: campos.observaciones,
    createdBy: user?.id ?? null
  });

  inasistenciasRepository.registrarAuditoria({
    accion: "crear",
    actorId: user?.id ?? null,
    entidadId: registro.id,
    despues: vistaInasistencia(registro)
  });

  return { statusCode: 201, body: { data: vistaInasistencia(registro) } };
}

/* ---------------- Consultas ----------------------------------------------- */

export function obtenerInasistencia(id) {
  const registro = inasistenciasRepository.findById(id);

  if (!registro) {
    throw noEncontrado("La inasistencia solicitada");
  }

  return { statusCode: 200, body: { data: vistaInasistencia(registro) } };
}

export function historialInasistencia(id) {
  const registro = inasistenciasRepository.findById(id);

  if (!registro) {
    throw noEncontrado("La inasistencia solicitada");
  }

  return {
    statusCode: 200,
    body: {
      data: {
        id: registro.id,
        alumnoId: registro.alumnoId,
        fecha: registro.fecha,
        historial: registro.historial
      }
    }
  };
}

function leerFiltros(url, errores, { permitirAlumno = true } = {}) {
  const params = url.searchParams;
  const filtros = {};

  if (permitirAlumno) {
    const alumnoId = params.get("alumnoId");

    if (alumnoId) {
      if (!inasistenciasRepository.findStudentRefById(alumnoId)) {
        errores.push({ field: "alumnoId", message: "El alumno indicado no existe." });
      } else {
        filtros.alumnoId = alumnoId;
      }
    }
  }

  const curso = entero(params.get("curso"), "curso", errores);

  if (curso !== null && !CURSOS_VALIDOS.includes(curso)) {
    errores.push({ field: "curso", message: "El curso debe estar entre 1 y 7." });
  } else if (curso !== null) {
    filtros.curso = curso;
  }

  const division = params.get("division")?.trim();

  if (division) {
    filtros.division = division;
  }

  const fecha = params.get("fecha")?.trim();
  const desde = params.get("desde")?.trim();
  const hasta = params.get("hasta")?.trim();

  if (fecha && !validarFechaFirme(fecha)) {
    errores.push({ field: "fecha", message: "La fecha debe tener formato YYYY-MM-DD." });
  } else if (fecha) {
    filtros.fecha = fecha;
  }

  if (desde && !validarFechaFirme(desde)) {
    errores.push({ field: "desde", message: "La fecha desde debe tener formato YYYY-MM-DD." });
  } else if (desde) {
    filtros.desde = desde;
  }

  if (hasta && !validarFechaFirme(hasta)) {
    errores.push({ field: "hasta", message: "La fecha hasta debe tener formato YYYY-MM-DD." });
  } else if (hasta) {
    filtros.hasta = hasta;
  }

  if (filtros.desde && filtros.hasta && filtros.desde > filtros.hasta) {
    errores.push({ field: "desde", message: "La fecha desde no puede ser posterior a la fecha hasta." });
  }

  const anio = entero(params.get("anio"), "anio", errores);

  if (anio !== null && !esAnioLectivo(anio)) {
    errores.push({ field: "anio", message: "El periodo academico indicado no es valido." });
  } else if (anio !== null) {
    filtros.anio = anio;
  }

  const cuatrimestre = entero(params.get("cuatrimestre"), "cuatrimestre", errores);

  if (cuatrimestre !== null && !CUATRIMESTRES.includes(cuatrimestre)) {
    errores.push({ field: "cuatrimestre", message: "El cuatrimestre debe ser 1 o 2." });
  } else if (cuatrimestre !== null) {
    filtros.cuatrimestre = cuatrimestre;
  }

  const estado = params.get("estado")?.trim();

  if (estado) {
    if (!ESTADOS_VALIDOS.includes(estado)) {
      errores.push({ field: "estado", message: "El estado de justificacion no es valido." });
    } else {
      filtros.estadoJustificacion = estado;
    }
  }

  const motivo = params.get("motivo")?.trim();

  if (motivo) {
    if (!MOTIVOS_VALIDOS.includes(motivo)) {
      errores.push({ field: "motivo", message: "El motivo indicado no es valido." });
    } else {
      filtros.motivo = motivo;
    }
  }

  const orden = params.get("orden") ?? "fecha";
  const pagina = entero(params.get("pagina") ?? String(PAGINA_DEFECTO), "pagina", errores) ?? PAGINA_DEFECTO;
  const porPagina = entero(params.get("porPagina") ?? String(POR_PAGINA_DEFECTO), "porPagina", errores) ?? POR_PAGINA_DEFECTO;

  if (pagina < 1) {
    errores.push({ field: "pagina", message: "La pagina debe ser mayor o igual a 1." });
  }

  if (porPagina < 1 || porPagina > POR_PAGINA_MAXIMO) {
    errores.push({ field: "porPagina", message: `La cantidad por pagina debe estar entre 1 y ${POR_PAGINA_MAXIMO}.` });
  }

  if (!ORDENES_VALIDOS[orden]) {
    errores.push({ field: "orden", message: "El orden solicitado no esta permitido." });
  }

  return { filtros, opciones: { orden, pagina, porPagina } };
}

function ordenarRegistros(registros, orden) {
  const configuracion = ORDENES_VALIDOS[orden] ?? ORDENES_VALIDOS.fecha;
  const { campo, direccion } = configuracion;

  return [...registros].sort((a, b) => {
    const resultado = String(a[campo]).localeCompare(String(b[campo]));
    return resultado === 0 ? a.alumnoId.localeCompare(b.alumnoId) : resultado * direccion;
  });
}

export function listarInasistencias({ url, user }) {
  const errores = [];
  const { filtros, opciones } = leerFiltros(url, errores);

  if (errores.length > 0) {
    throw errorDeValidacion(errores);
  }

  const registros = ordenarRegistros(
    inasistenciasRepository.list({ escuelaId: escuelaDel(user), ...filtros }),
    opciones.orden
  );
  const total = registros.length;
  const totalPaginas = Math.max(1, Math.ceil(total / opciones.porPagina));
  const paginaReal = Math.min(opciones.pagina, totalPaginas);
  const offset = (paginaReal - 1) * opciones.porPagina;

  return {
    statusCode: 200,
    body: {
      data: registros.slice(offset, offset + opciones.porPagina).map(vistaInasistencia),
      filtros: { ...filtros, orden: opciones.orden },
      paginacion: { total, pagina: paginaReal, porPagina: opciones.porPagina, totalPaginas }
    }
  };
}

export function totalesDeAlumno(alumnoId, url, user) {
  if (!alumnoId) {
    throw errorDeValidacion([{ field: "alumnoId", message: "El alumnoId es obligatorio." }]);
  }

  const alumno = inasistenciasRepository.findStudentRefById(alumnoId);

  if (!alumno) {
    throw noEncontrado("El alumno solicitado");
  }

  const errores = [];
  const { filtros } = leerFiltros(url, errores, { permitirAlumno: false });

  if (errores.length > 0) {
    throw errorDeValidacion(errores);
  }

  const registros = inasistenciasRepository.list({ escuelaId: escuelaDel(user), alumnoId, ...filtros });
  const totales = calcularTotales(registros);

  return {
    statusCode: 200,
    body: {
      data: {
        alumno,
        totales,
        reglas: {
          topeParcialNoJustificadas: evaluarReglaDeTope(totales, "topeParcialNoJustificadas"),
          topeParcialTotal: evaluarReglaDeTope(totales, "topeParcialTotal")
        }
      },
      filtros
    }
  };
}

export function estadisticas({ url, user }) {
  const errores = [];
  const { filtros } = leerFiltros(url, errores);

  if (errores.length > 0) {
    throw errorDeValidacion(errores);
  }

  const registros = inasistenciasRepository.list({ escuelaId: escuelaDel(user), ...filtros });
  const totales = calcularTotales(registros);

  return {
    statusCode: 200,
    body: {
      data: {
        totales,
        porDivision: calcularTotalesPorDivision(registros),
        porCuatrimestre: calcularTotalesPorCuatrimestre(registros),
        reglas: {
          topeParcialNoJustificadas: evaluarReglaDeTope(totales, "topeParcialNoJustificadas"),
          topeParcialTotal: evaluarReglaDeTope(totales, "topeParcialTotal")
        }
      },
      filtros
    }
  };
}

export function listarMotivos() {
  return {
    statusCode: 200,
    body: {
      data: {
        motivos: MOTIVOS,
        estados: ESTADOS_VALIDOS,
        cuatrimestres: CUATRIMESTRES
      }
    }
  };
}

/* ---------------- Justificacion ------------------------------------------ */

export function justificarInasistencia(id, body, user) {
  const registro = inasistenciasRepository.findById(id);

  if (!registro) {
    throw noEncontrado("La inasistencia solicitada");
  }

  const errores = [];
  const justificacion = normalizarJustificacion(body?.justificacion ?? body, user, errores);

  if (errores.length > 0) {
    throw errorDeValidacion(errores);
  }

  const cambio = {
    estadoJustificacion: "justificada",
    justificacion
  };

  const actualizado = inasistenciasRepository.update(id, cambio, registro, user?.id ?? null);

  inasistenciasRepository.registrarAuditoria({
    accion: "justificar",
    actorId: user?.id ?? null,
    entidadId: id,
    antes: vistaInasistencia(registro),
    despues: vistaInasistencia(actualizado)
  });

  return { statusCode: 200, body: { data: vistaInasistencia(actualizado) } };
}

/* ---------------- Correccion --------------------------------------------- */

export function modificarInasistencia(id, body, user) {
  const registro = inasistenciasRepository.findById(id);

  if (!registro) {
    throw noEncontrado("La inasistencia solicitada");
  }

  const errores = [];

  const cambios = {
    fecha: body.fecha ?? registro.fecha,
    anio: body.anio ?? registro.anio,
    cuatrimestre: body.cuatrimestre ?? registro.cuatrimestre,
    motivo: body.motivo ?? registro.motivo,
    estadoJustificacion: body.estadoJustificacion ?? registro.estadoJustificacion,
    observaciones: body.observaciones !== undefined ? body.observaciones : registro.observaciones,
    justificacion: body.justificacion !== undefined ? body.justificacion : registro.justificacion
  };

  const campos = validarCamposComunes(
    {
      alumno: registro.alumno,
      fecha: cambios.fecha,
      anio: cambios.anio,
      cuatrimestre: cambios.cuatrimestre,
      motivo: cambios.motivo,
      estadoJustificacion: cambios.estadoJustificacion,
      observaciones: cambios.observaciones,
      justificacion: cambios.justificacion,
      user
    },
    errores,
    { validarAlumno: false }
  );

  if (errores.length > 0) {
    throw errorDeValidacion(errores);
  }

  if (campos.fecha !== registro.fecha) {
    const duplicada = inasistenciasRepository.findDuplicada(registro.alumnoId, campos.fecha);

    if (duplicada && duplicada.id !== id) {
      throw conflicto("Ya existe una inasistencia registrada para ese alumno en esa fecha.");
    }
  }

  const cambiosAplicables = {
    fecha: campos.fecha,
    anio: campos.anio,
    cuatrimestre: campos.cuatrimestre,
    motivo: campos.motivo,
    estadoJustificacion: campos.estadoJustificacion,
    justificacion: campos.justificacion,
    observaciones: campos.observaciones
  };

  const actualizado = inasistenciasRepository.update(id, cambiosAplicables, registro, user?.id ?? null);

  inasistenciasRepository.registrarAuditoria({
    accion: "modificar",
    actorId: user?.id ?? null,
    entidadId: id,
    antes: vistaInasistencia(registro),
    despues: vistaInasistencia(actualizado)
  });

  return { statusCode: 200, body: { data: vistaInasistencia(actualizado) } };
}