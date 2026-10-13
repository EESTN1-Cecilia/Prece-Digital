import { errorDeValidacion, noEncontrado, conflicto, sinPermisos } from "../../utils/api-error.mjs";
import studentRepository from "../students/students.repository.mjs";
import academicRepository from "../academic/academic.repository.mjs";
import teachersRepository from "../teachers/teachers.repository.mjs";
import {
  ANIO_MAXIMO,
  ANIO_MINIMO,
  CONCEPTOS,
  CONCEPTOS_VALIDOS,
  ESCALA,
  OBSERVACIONES_MAX,
  ORDENES_CALIFICACIONES,
  PERIODO_MAX,
  TIPOS_EVALUACION,
  TIPOS_EVALUACION_VALIDOS,
  TIPO_EVALUACION_POR_DEFECTO,
  CONDICIONES,
  CONDICIONES_VALIDAS,
  condicionDe,
  esAnioLectivo,
  esFecha,
  etiquetaPeriodo,
  interpretarValor,
  normalizarCuatrimestre,
  normalizarTexto
} from "./catalogo.mjs";
import gradesRepository from "./grades.repository.mjs";

const POR_PAGINA_MAXIMO = 100;
const POR_PAGINA_DEFECTO = 20;

const collator = new Intl.Collator("es", { sensitivity: "base" });

function actorDel(user) {
  return user?.id ?? null;
}

function escuelaDel(user, data) {
  return data?.escuelaId ?? user.assignments?.find((a) => a.schoolId)?.schoolId ?? null;
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
    errores.push({ field: "porPagina", message: "porPagina debe ser un entero entre 1 y 100." });
  }

  const pagina = query.pagina === undefined ? 1 : Number(query.pagina);

  if (!Number.isInteger(pagina) || pagina < 1) {
    errores.push({ field: "pagina", message: "pagina debe ser un entero mayor a 0." });
  }
}

function ordenar(lista, config) {
  if (!config) {
    return lista;
  }

  return [...lista].sort((a, b) => {
    const izquierdo = a[config.campo];
    const derecho = b[config.campo];

    if (config.numerico) {
      return ((Number(izquierdo) || 0) - (Number(derecho) || 0)) * config.sentido;
    }

    return collator.compare(String(izquierdo ?? ""), String(derecho ?? "")) * config.sentido;
  });
}

/* ---------------- Referencias (vistas resumidas) ------------------------- */

function alumnoRef(alumno) {
  if (!alumno) {
    return null;
  }

  return {
    id: alumno.id,
    escuelaId: alumno.escuelaId,
    apellido: alumno.apellido,
    nombre: alumno.nombre,
    nombreCompleto: `${alumno.apellido}, ${alumno.nombre}`,
    dni: alumno.dni,
    curso: alumno.curso ?? null,
    division: alumno.division ?? null
  };
}

function materiaRef(materia) {
  return materia ? { id: materia.id, nombre: materia.nombre } : null;
}

function cursoRef(curso) {
  if (!curso) {
    return null;
  }

  return {
    id: curso.id,
    anio: curso.anio,
    turno: curso.turno,
    cicloId: curso.cicloId,
    orientacionId: curso.orientacionId ?? null,
    estado: curso.estado
  };
}

function divisionRef(division, curso) {
  if (!division) {
    return null;
  }

  return {
    id: division.id,
    nombre: division.nombre,
    cursoId: division.cursoId,
    curso: cursoRef(curso),
    estado: division.estado
  };
}

function docenteRef(docente) {
  if (!docente) {
    return null;
  }

  return {
    id: docente.id,
    apellido: docente.apellido,
    nombre: docente.nombre,
    nombreCompleto: `${docente.apellido}, ${docente.nombre}`,
    estado: docente.estado
  };
}

/* ---------------- Vistas publicas ---------------------------------------- */

function valorAlmacenado(info) {
  return info.tipoValor === "numerico" ? String(info.nota) : info.concepto;
}

function snapshotCalificacion(registro) {
  return {
    valor: registro.valor,
    tipoEvaluacion: registro.tipoEvaluacion,
    anio: registro.anio,
    cuatrimestre: registro.cuatrimestre ?? null,
    etiqueta: etiquetaPeriodo(registro.anio, registro.cuatrimestre),
    observaciones: registro.observaciones ?? null,
    actualizadoPor: registro.actualizadoPor ?? null,
    momento: registro.actualizadoEn ?? registro.creadoEn
  };
}

function publicCalificacion(registro) {
  const alumno = studentRepository.findById(registro.alumnoId);
  const materia = academicRepository.findSubjectRefById(registro.materiaId);
  const curso = registro.cursoId ? academicRepository.findCursoById(registro.cursoId) : null;
  const division = registro.divisionId ? academicRepository.findDivisionById(registro.divisionId) : null;
  const docente = registro.docenteId ? teachersRepository.findDocenteById(registro.docenteId) : null;
  const info = interpretarValor(registro.valor) ?? { tipoValor: null, nota: null, concepto: null };

  return {
    id: registro.id,
    escuelaId: registro.escuelaId,
    alumnoId: registro.alumnoId,
    alumno: alumnoRef(alumno) ?? { id: registro.alumnoId },
    alumnoSort: normalizarTexto(`${alumno?.apellido ?? ""} ${alumno?.nombre ?? ""}`),
    materiaId: registro.materiaId,
    materia: materiaRef(materia),
    materiaSort: normalizarTexto(materia?.nombre ?? ""),
    cursoId: registro.cursoId ?? null,
    curso: cursoRef(curso),
    divisionId: registro.divisionId ?? null,
    division: divisionRef(division, curso),
    docenteId: registro.docenteId ?? null,
    docente: docenteRef(docente),
    asignacionMateriaId: registro.asignacionMateriaId ?? null,
    periodo: {
      anio: registro.anio,
      cuatrimestre: registro.cuatrimestre ?? null,
      etiqueta: registro.periodo ?? etiquetaPeriodo(registro.anio, registro.cuatrimestre)
    },
    tipoEvaluacion: registro.tipoEvaluacion,
    valor: registro.valor,
    tipoValor: info.tipoValor,
    nota: info.nota,
    notaSort: info.nota ?? -1,
    concepto: info.concepto,
    condicion: condicionDe(info.nota),
    fecha: registro.fecha,
    observaciones: registro.observaciones ?? null,
    estado: registro.isActive ? "activo" : "inactivo",
    historial: (registro.historial ?? []).map((item) => ({ ...item })),
    creadoEn: registro.creadoEn,
    actualizadoEn: registro.actualizadoEn,
    creadoPor: registro.creadoPor ?? null,
    actualizadoPor: registro.actualizadoPor ?? null,
    fechaBaja: registro.fechaBaja ?? null
  };
}

/* ---------------- Validaciones ------------------------------------------- */

function validarAnio(data, errores, { requerido } = {}) {
  if (data?.anio !== undefined && data?.anio !== null && data?.anio !== "") {
    if (esAnioLectivo(data.anio)) {
      return Number(data.anio);
    }

    errores.push({ field: "anio", message: `El anio lectivo debe ser un entero entre ${ANIO_MINIMO} y ${ANIO_MAXIMO}.` });
    return undefined;
  }

  if (requerido) {
    errores.push({ field: "anio", message: "El anio lectivo es obligatorio." });
  }

  return undefined;
}

function validarCuatrimestre(data, errores) {
  if (data?.cuatrimestre === undefined) {
    return undefined;
  }

  const cuatrimestre = normalizarCuatrimestre(data.cuatrimestre);

  if (cuatrimestre === undefined) {
    errores.push({ field: "cuatrimestre", message: "El cuatrimestre debe ser 1, 2 o no enviarse (periodo anual)." });
    return undefined;
  }

  return cuatrimestre;
}

function validarTipoEvaluacion(data, errores, { requerido } = {}) {
  const tipo = data?.tipoEvaluacion === undefined ? (requerido ? TIPO_EVALUACION_POR_DEFECTO : undefined) : data.tipoEvaluacion;

  if (tipo !== undefined && !TIPOS_EVALUACION_VALIDOS.includes(tipo)) {
    errores.push({ field: "tipoEvaluacion", message: `El tipo de evaluacion debe ser uno de: ${TIPOS_EVALUACION_VALIDOS.join(", ")}.` });
    return undefined;
  }

  return tipo;
}

function validarValor(data, errores, { requerido } = {}) {
  if (data?.valor === undefined || data?.valor === null || data?.valor === "") {
    if (requerido) {
      errores.push({ field: "valor", message: "El valor de la calificacion es obligatorio." });
    }

    return undefined;
  }

  const info = interpretarValor(data.valor);

  if (!info) {
    errores.push({
      field: "valor",
      message: `El valor debe ser una nota entre ${ESCALA.minimo} y ${ESCALA.maximo} o un concepto (${CONCEPTOS_VALIDOS.join(", ")}).`
    });
    return undefined;
  }

  return info;
}

function validarFecha(data, errores, { requerido } = {}) {
  if (data?.fecha === undefined || data?.fecha === null || data?.fecha === "") {
    if (requerido) {
      return new Date().toISOString().slice(0, 10);
    }

    return undefined;
  }

  if (!esFecha(data.fecha)) {
    errores.push({ field: "fecha", message: "La fecha debe tener el formato AAAA-MM-DD." });
    return undefined;
  }

  return data.fecha;
}

function validarObservaciones(data, errores) {
  if (data?.observaciones === undefined) {
    return undefined;
  }

  if (data.observaciones === null) {
    return null;
  }

  if (typeof data.observaciones !== "string") {
    errores.push({ field: "observaciones", message: "Las observaciones deben ser texto." });
    return undefined;
  }

  const observaciones = data.observaciones.trim();

  if (observaciones.length > OBSERVACIONES_MAX) {
    errores.push({ field: "observaciones", message: `Las observaciones no pueden superar los ${OBSERVACIONES_MAX} caracteres.` });
    return undefined;
  }

  return observaciones || null;
}

function validarPeriodoTexto(data, errores) {
  if (data?.periodo === undefined) {
    return undefined;
  }

  if (data.periodo === null || data.periodo === "") {
    return null;
  }

  if (typeof data.periodo !== "string") {
    errores.push({ field: "periodo", message: "El periodo debe ser texto." });
    return undefined;
  }

  const periodo = data.periodo.trim();

  if (periodo.length > PERIODO_MAX) {
    errores.push({ field: "periodo", message: `El periodo no puede superar los ${PERIODO_MAX} caracteres.` });
    return undefined;
  }

  return periodo || null;
}

function resolverAlcance({ cursoId, divisionId }, errores) {
  let curso = null;
  let division = null;

  if (divisionId) {
    division = academicRepository.findDivisionById(divisionId);

    if (!division) {
      errores.push({ field: "divisionId", message: "La division indicada no existe." });
    }
  }

  if (cursoId) {
    curso = academicRepository.findCursoById(cursoId);

    if (!curso) {
      errores.push({ field: "cursoId", message: "El curso indicado no existe." });
    }
  }

  if (division && curso && division.cursoId !== curso.id) {
    errores.push({ field: "divisionId", message: "La division indicada no pertenece al curso indicado." });
  }

  if (division && !curso) {
    curso = academicRepository.findCursoById(division.cursoId);
  }

  return { curso, division };
}

/* Alcance por defecto: la division vigente del alumno (matricula) y su curso. */
function alcanceDeAlumno(alumno) {
  const matriculas = academicRepository.listMatricula().filter((matricula) => matricula.estudianteId === alumno.id);
  const matricula = matriculas[matriculas.length - 1] ?? null;

  if (!matricula) {
    return { cursoId: null, divisionId: null };
  }

  const division = academicRepository.findDivisionById(matricula.divisionId);

  return { cursoId: division?.cursoId ?? null, divisionId: matricula.divisionId ?? null };
}

/* ---------------- Autorizacion docente ----------------------------------- */

/* Un usuario con rol docente queda acotado a sus propias asignaciones
   (modulo docentes). Admin y director no se restringen. */
function esDocenteRestringido(user) {
  const roles = [...new Set((user?.assignments ?? []).map((assignment) => assignment.role))];

  if (roles.includes("admin") || roles.includes("director")) {
    return false;
  }

  return roles.includes("docente");
}

function buscarAsignacion(docenteId, { materiaId, cursoId, divisionId, anio }) {
  const asignaciones = teachersRepository.listAsignacionesMateria({ docenteId, materiaId, anio, estado: "activo" });

  return (
    asignaciones.find((asignacion) => {
      if (asignacion.cursoId && asignacion.cursoId !== cursoId) {
        return false;
      }

      if (asignacion.divisionId && asignacion.divisionId !== divisionId) {
        return false;
      }

      return true;
    }) ?? null
  );
}

function exigirAutorizacionDocente(user, alcance) {
  const docente = teachersRepository.findDocenteByUserId(user?.id);

  if (!docente) {
    throw sinPermisos("El usuario no tiene un legajo de docente asociado a esta escuela.");
  }

  if (docente.estado !== "activo") {
    throw conflicto("El docente esta inactivo y no puede cargar calificaciones.");
  }

  const asignacion = buscarAsignacion(docente.id, alcance);

  if (!asignacion) {
    throw sinPermisos("No podes cargar calificaciones para esa materia, curso o periodo.");
  }

  return { docenteId: docente.id, asignacionMateriaId: asignacion.id };
}

/* ---------------- Boletin / resumen -------------------------------------- */

function promedio(valores) {
  const numeros = valores.filter((valor) => typeof valor === "number");

  if (numeros.length === 0) {
    return null;
  }

  return Math.round((numeros.reduce((suma, valor) => suma + valor, 0) / numeros.length) * 100) / 100;
}

function armarBoletin(alumno) {
  const calificaciones = gradesRepository.listCalificaciones({ alumnoId: alumno.id, estado: "activo" }).map(publicCalificacion);

  const porMateria = new Map();

  for (const calificacion of calificaciones) {
    if (!porMateria.has(calificacion.materiaId)) {
      porMateria.set(calificacion.materiaId, {
        materiaId: calificacion.materiaId,
        materia: calificacion.materia,
        calificaciones: []
      });
    }

    porMateria.get(calificacion.materiaId).calificaciones.push(calificacion);
  }

  const materias = [...porMateria.values()]
    .map((grupo) => ({
      ...grupo,
      promedio: promedio(grupo.calificaciones.map((calificacion) => calificacion.nota))
    }))
    .sort((a, b) => collator.compare(String(a.materia?.nombre ?? ""), String(b.materia?.nombre ?? "")));

  const porCondicion = Object.fromEntries(CONDICIONES_VALIDAS.map((condicion) => [condicion, 0]));
  const porTipoEvaluacion = Object.fromEntries(TIPOS_EVALUACION_VALIDOS.map((tipo) => [tipo, 0]));

  for (const calificacion of calificaciones) {
    if (calificacion.condicion) {
      porCondicion[calificacion.condicion] = (porCondicion[calificacion.condicion] ?? 0) + 1;
    }

    porTipoEvaluacion[calificacion.tipoEvaluacion] = (porTipoEvaluacion[calificacion.tipoEvaluacion] ?? 0) + 1;
  }

  const resumen = {
    total: calificaciones.length,
    promedioGeneral: promedio(calificaciones.map((calificacion) => calificacion.nota)),
    porCondicion,
    porTipoEvaluacion
  };

  return { alumno, calificaciones, materias, resumen };
}

/* ---------------- Servicio ----------------------------------------------- */

const gradesService = {
  getCatalogos() {
    return {
      statusCode: 200,
      body: {
        data: {
          tiposEvaluacion: TIPOS_EVALUACION,
          conceptos: CONCEPTOS,
          condiciones: CONDICIONES,
          escala: ESCALA
        }
      }
    };
  },

  createCalificacion(data, user) {
    const errores = [];
    const alumno = data?.alumnoId ? studentRepository.findById(data.alumnoId) : null;

    if (!data?.alumnoId) {
      errores.push({ field: "alumnoId", message: "El alumno es obligatorio." });
    } else if (!alumno) {
      errores.push({ field: "alumnoId", message: "El alumno indicado no existe." });
    } else if (alumno.isActive === false) {
      errores.push({ field: "alumnoId", message: "El alumno esta inactivo." });
    }

    const materia = data?.materiaId ? academicRepository.findSubjectRefById(data.materiaId) : null;

    if (!data?.materiaId) {
      errores.push({ field: "materiaId", message: "La materia es obligatoria." });
    } else if (!materia) {
      errores.push({ field: "materiaId", message: "La materia indicada no existe." });
    }

    const anio = validarAnio(data, errores, { requerido: true });
    const cuatrimestre = validarCuatrimestre(data, errores);
    const tipoEvaluacion = validarTipoEvaluacion(data, errores, { requerido: true });
    const valorInfo = validarValor(data, errores, { requerido: true });
    const fecha = validarFecha(data, errores, { requerido: true });
    const observaciones = validarObservaciones(data, errores);
    const periodo = validarPeriodoTexto(data, errores);

    let cursoId = data?.cursoId ?? null;
    let divisionId = data?.divisionId ?? null;

    if (cursoId || divisionId) {
      const { curso, division } = resolverAlcance({ cursoId, divisionId }, errores);
      cursoId = curso?.id ?? null;
      divisionId = division?.id ?? null;
    } else if (alumno) {
      ({ cursoId, divisionId } = alcanceDeAlumno(alumno));
    }

    if (errores.length > 0) {
      throw errorDeValidacion(errores);
    }

    let docenteId = null;
    let asignacionMateriaId = null;

    if (esDocenteRestringido(user)) {
      ({ docenteId, asignacionMateriaId } = exigirAutorizacionDocente(user, {
        materiaId: materia.id,
        cursoId,
        divisionId,
        anio
      }));
    } else if (data?.docenteId) {
      const docente = teachersRepository.findDocenteById(data.docenteId);

      if (!docente) {
        throw errorDeValidacion([{ field: "docenteId", message: "El docente indicado no existe." }]);
      }

      if (docente.estado !== "activo") {
        throw conflicto("El docente esta inactivo.");
      }

      docenteId = docente.id;
      asignacionMateriaId = buscarAsignacion(docente.id, { materiaId: materia.id, cursoId, divisionId, anio })?.id ?? null;
    }

    const duplicada = gradesRepository.findCalificacionDuplicada({
      alumnoId: alumno.id,
      materiaId: materia.id,
      anio,
      cuatrimestre,
      tipoEvaluacion
    });

    if (duplicada) {
      throw conflicto("Ya existe una calificacion de ese tipo para el alumno, la materia y el periodo.");
    }

    const registro = gradesRepository.createCalificacion({
      escuelaId: alumno.escuelaId,
      alumnoId: alumno.id,
      materiaId: materia.id,
      cursoId,
      divisionId,
      docenteId,
      asignacionMateriaId,
      anio,
      cuatrimestre,
      periodo,
      tipoEvaluacion,
      valor: valorAlmacenado(valorInfo),
      fecha,
      observaciones,
      creadoPor: actorDel(user)
    });
    gradesRepository.registrarAuditoria({
      accion: "calificacion:create",
      actorId: actorDel(user),
      entidad: "calificacion",
      entidadId: registro.id,
      antes: null,
      despues: publicCalificacion(registro)
    });

    return { statusCode: 201, body: { data: publicCalificacion(registro) } };
  },

  getCalificacion(id) {
    const registro = gradesRepository.findCalificacionById(id);

    if (!registro) {
      throw noEncontrado("La calificacion");
    }

    return { statusCode: 200, body: { data: publicCalificacion(registro) } };
  },

  listCalificaciones(query, user) {
    const errores = [];
    const estado = query.estado ?? "activo";

    if (!["activo", "inactivo", "todos"].includes(estado)) {
      errores.push({ field: "estado", message: "El estado debe ser activo, inactivo o todos." });
    }

    if (query.tipoEvaluacion !== undefined && !TIPOS_EVALUACION_VALIDOS.includes(query.tipoEvaluacion)) {
      errores.push({ field: "tipoEvaluacion", message: `El tipo de evaluacion debe ser uno de: ${TIPOS_EVALUACION_VALIDOS.join(", ")}.` });
    }

    if (query.condicion !== undefined && !CONDICIONES_VALIDAS.includes(query.condicion)) {
      errores.push({ field: "condicion", message: `La condicion debe ser una de: ${CONDICIONES_VALIDAS.join(", ")}.` });
    }

    if (query.anio !== undefined && query.anio !== null && query.anio !== "" && !esAnioLectivo(query.anio)) {
      errores.push({ field: "anio", message: `El anio lectivo debe ser un entero entre ${ANIO_MINIMO} y ${ANIO_MAXIMO}.` });
    }

    if (query.cuatrimestre !== undefined && query.cuatrimestre !== "" && normalizarCuatrimestre(query.cuatrimestre) === undefined) {
      errores.push({ field: "cuatrimestre", message: "El cuatrimestre debe ser 1 o 2." });
    }

    const orden = query.orden ?? "fecha_desc";

    if (!ORDENES_CALIFICACIONES[orden]) {
      errores.push({ field: "orden", message: "Orden invalido." });
    }

    validarPagina(query, errores);

    if (errores.length > 0) {
      throw errorDeValidacion(errores);
    }

    const anio = query.anio === undefined || query.anio === null || query.anio === "" ? undefined : Number(query.anio);
    const cuatrimestre = query.cuatrimestre === undefined || query.cuatrimestre === "" ? undefined : normalizarCuatrimestre(query.cuatrimestre);

    let lista = gradesRepository
      .listCalificaciones({
        escuelaId: escuelaDel(user, query),
        alumnoId: query.alumnoId,
        materiaId: query.materiaId,
        cursoId: query.cursoId,
        divisionId: query.divisionId,
        docenteId: query.docenteId,
        anio,
        cuatrimestre,
        tipoEvaluacion: query.tipoEvaluacion,
        estado
      })
      .map(publicCalificacion);

    if (query.condicion) {
      lista = lista.filter((calificacion) => calificacion.condicion === query.condicion);
    }

    lista = ordenar(lista, ORDENES_CALIFICACIONES[orden]);

    return {
      statusCode: 200,
      body: paginar(lista, query, {
        alumnoId: query.alumnoId ?? null,
        materiaId: query.materiaId ?? null,
        cursoId: query.cursoId ?? null,
        divisionId: query.divisionId ?? null,
        docenteId: query.docenteId ?? null,
        anio: query.anio ?? null,
        cuatrimestre: query.cuatrimestre ?? null,
        tipoEvaluacion: query.tipoEvaluacion ?? null,
        condicion: query.condicion ?? null,
        estado,
        orden
      })
    };
  },

  updateCalificacion(id, data, user) {
    const actual = gradesRepository.findCalificacionById(id);

    if (!actual) {
      throw noEncontrado("La calificacion");
    }

    if (!actual.isActive) {
      throw conflicto("La calificacion esta dada de baja y no se puede modificar.");
    }

    const errores = [];

    if (data?.alumnoId !== undefined && data.alumnoId !== actual.alumnoId) {
      errores.push({ field: "alumnoId", message: "No se puede modificar el alumno de una calificacion." });
    }

    if (data?.materiaId !== undefined && data.materiaId !== actual.materiaId) {
      errores.push({ field: "materiaId", message: "No se puede modificar la materia de una calificacion." });
    }

    const anio = validarAnio(data, errores);
    const cuatrimestre = validarCuatrimestre(data, errores);
    const tipoEvaluacion = validarTipoEvaluacion(data, errores);
    const valorInfo = validarValor(data, errores);
    const fecha = validarFecha(data, errores);
    const observaciones = validarObservaciones(data, errores);
    const periodo = validarPeriodoTexto(data, errores);

    let curso = null;
    let division = null;

    if (data?.cursoId !== undefined || data?.divisionId !== undefined) {
      ({ curso, division } = resolverAlcance(
        {
          cursoId: data.cursoId !== undefined ? data.cursoId : actual.cursoId,
          divisionId: data.divisionId !== undefined ? data.divisionId : actual.divisionId
        },
        errores
      ));
    }

    if (errores.length > 0) {
      throw errorDeValidacion(errores);
    }

    const nuevoCursoId = curso?.id ?? (data?.cursoId !== undefined || data?.divisionId !== undefined ? null : actual.cursoId);
    const nuevoDivisionId = division?.id ?? (data?.cursoId !== undefined || data?.divisionId !== undefined ? null : actual.divisionId);
    const nuevoAnio = anio ?? actual.anio;

    let docenteId = actual.docenteId;
    let asignacionMateriaId = actual.asignacionMateriaId;

    if (esDocenteRestringido(user)) {
      const autorizado = exigirAutorizacionDocente(user, {
        materiaId: actual.materiaId,
        cursoId: nuevoCursoId,
        divisionId: nuevoDivisionId,
        anio: nuevoAnio
      });
      docenteId = autorizado.docenteId;
      asignacionMateriaId = autorizado.asignacionMateriaId;
    } else if (data?.docenteId !== undefined) {
      if (data.docenteId === null) {
        docenteId = null;
        asignacionMateriaId = null;
      } else {
        const docente = teachersRepository.findDocenteById(data.docenteId);

        if (!docente) {
          throw errorDeValidacion([{ field: "docenteId", message: "El docente indicado no existe." }]);
        }

        if (docente.estado !== "activo") {
          throw conflicto("El docente esta inactivo.");
        }

        docenteId = docente.id;
        asignacionMateriaId = buscarAsignacion(docente.id, { materiaId: actual.materiaId, cursoId: nuevoCursoId, divisionId: nuevoDivisionId, anio: nuevoAnio })?.id ?? null;
      }
    }

    const nuevoCuatrimestre = cuatrimestre !== undefined ? cuatrimestre : (actual.cuatrimestre ?? null);
    const nuevoTipo = tipoEvaluacion ?? actual.tipoEvaluacion;

    const duplicada = gradesRepository.findCalificacionDuplicada({
      alumnoId: actual.alumnoId,
      materiaId: actual.materiaId,
      anio: nuevoAnio,
      cuatrimestre: nuevoCuatrimestre,
      tipoEvaluacion: nuevoTipo,
      excludeId: id
    });

    if (duplicada) {
      throw conflicto("Ya existe una calificacion de ese tipo para el alumno, la materia y el periodo.");
    }

    const cambios = {};

    if (anio !== undefined && anio !== actual.anio) cambios.anio = anio;
    if (cuatrimestre !== undefined && cuatrimestre !== (actual.cuatrimestre ?? null)) cambios.cuatrimestre = cuatrimestre;
    if (tipoEvaluacion !== undefined && tipoEvaluacion !== actual.tipoEvaluacion) cambios.tipoEvaluacion = tipoEvaluacion;
    if (valorInfo !== undefined) cambios.valor = valorAlmacenado(valorInfo);
    if (fecha !== undefined && fecha !== actual.fecha) cambios.fecha = fecha;
    if (observaciones !== undefined && observaciones !== actual.observaciones) cambios.observaciones = observaciones;
    if (periodo !== undefined && periodo !== actual.periodo) cambios.periodo = periodo;

    if (data?.cursoId !== undefined || data?.divisionId !== undefined) {
      cambios.cursoId = nuevoCursoId;
      cambios.divisionId = nuevoDivisionId;
    }

    if (docenteId !== actual.docenteId) cambios.docenteId = docenteId;
    if (asignacionMateriaId !== actual.asignacionMateriaId) cambios.asignacionMateriaId = asignacionMateriaId;

    if (Object.keys(cambios).length === 0) {
      return { statusCode: 200, body: { data: publicCalificacion(actual) } };
    }

    cambios.actualizadoPor = actorDel(user);
    const actualizado = gradesRepository.updateCalificacion(id, cambios, snapshotCalificacion(actual));
    gradesRepository.registrarAuditoria({
      accion: "calificacion:update",
      actorId: actorDel(user),
      entidad: "calificacion",
      entidadId: id,
      antes: publicCalificacion(actual),
      despues: publicCalificacion(actualizado)
    });

    return { statusCode: 200, body: { data: publicCalificacion(actualizado) } };
  },

  deleteCalificacion(id, user) {
    const actual = gradesRepository.findCalificacionById(id);

    if (!actual) {
      throw noEncontrado("La calificacion");
    }

    if (!actual.isActive) {
      throw conflicto("La calificacion ya esta dada de baja.");
    }

    if (esDocenteRestringido(user)) {
      exigirAutorizacionDocente(user, {
        materiaId: actual.materiaId,
        cursoId: actual.cursoId,
        divisionId: actual.divisionId,
        anio: actual.anio
      });
    }

    const actualizado = gradesRepository.deactivateCalificacion(id);
    gradesRepository.registrarAuditoria({
      accion: "calificacion:deactivate",
      actorId: actorDel(user),
      entidad: "calificacion",
      entidadId: id,
      antes: publicCalificacion(actual),
      despues: publicCalificacion(actualizado)
    });

    return { statusCode: 200, body: { data: publicCalificacion(actualizado) } };
  },

  getCalificacionesDeAlumno(alumnoId) {
    const alumno = studentRepository.findById(alumnoId);

    if (!alumno) {
      throw noEncontrado("El alumno");
    }

    const boletin = armarBoletin(alumno);

    return {
      statusCode: 200,
      body: {
        data: {
          alumno: alumnoRef(alumno),
          resumen: boletin.resumen,
          materias: boletin.materias
        }
      }
    };
  },

  getResumenDeAlumno(alumnoId) {
    const alumno = studentRepository.findById(alumnoId);

    if (!alumno) {
      throw noEncontrado("El alumno");
    }

    const boletin = armarBoletin(alumno);

    return {
      statusCode: 200,
      body: {
        data: {
          alumno: alumnoRef(alumno),
          resumen: boletin.resumen,
          materias: boletin.materias.map((grupo) => ({
            materiaId: grupo.materiaId,
            materia: grupo.materia,
            total: grupo.calificaciones.length,
            promedio: grupo.promedio
          }))
        }
      }
    };
  },

  getCalificacionesDeDocente(docenteId, query) {
    const docente = teachersRepository.findDocenteById(docenteId);

    if (!docente) {
      throw noEncontrado("El docente");
    }

    const errores = [];
    const estado = query.estado ?? "activo";

    if (!["activo", "inactivo", "todos"].includes(estado)) {
      errores.push({ field: "estado", message: "El estado debe ser activo, inactivo o todos." });
    }

    const orden = query.orden ?? "fecha_desc";

    if (!ORDENES_CALIFICACIONES[orden]) {
      errores.push({ field: "orden", message: "Orden invalido." });
    }

    validarPagina(query, errores);

    if (errores.length > 0) {
      throw errorDeValidacion(errores);
    }

    const lista = ordenar(
      gradesRepository
        .listCalificaciones({ docenteId, escuelaId: docente.escuelaId, estado })
        .map(publicCalificacion),
      ORDENES_CALIFICACIONES[orden]
    );

    return {
      statusCode: 200,
      body: paginar(lista, query, { docenteId, estado, orden })
    };
  }
};

export default gradesService;
