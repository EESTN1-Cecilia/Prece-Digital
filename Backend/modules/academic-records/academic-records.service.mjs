import { errorDeValidacion, noEncontrado, conflicto } from "../../utils/api-error.mjs";
import {
  ANIO_MINIMO,
  ANIO_MAXIMO,
  ESTADOS_MATERIA,
  ESTADOS_VALIDOS,
  ESTADO_POR_DEFECTO,
  OBSERVACIONES_MAX,
  ORDENES_SITUACIONES,
  TIPOS_SITUACION,
  TIPOS_VALIDOS,
  TIPO_POR_DEFECTO,
  TRANSICIONES,
  esAnioLectivo,
  esEntero,
  etiquetaPeriodo,
  normalizarCuatrimestre,
  transicionPermitida
} from "./catalogo.mjs";
import academicRecordsRepository from "./academic-records.repository.mjs";

const POR_PAGINA_MAXIMO = 100;
const POR_PAGINA_DEFECTO = 20;

const collator = new Intl.Collator("es", { sensitivity: "base" });

function actorDel(user) {
  return user?.id ?? null;
}

function escuelaDel(user, data) {
  return data?.escuelaId ?? user.assignments?.find((a) => a.schoolId)?.schoolId ?? null;
}

function parseEntero(valor) {
  if (valor === undefined || valor === null) {
    return undefined;
  }

  const numero = Number(valor);
  return Number.isInteger(numero) ? numero : NaN;
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
    const porEntero = config.campo === "anio";

    if (porEntero) {
      return (izquierdo - derecho) * config.sentido;
    }

    return collator.compare(String(izquierdo ?? ""), String(derecho ?? "")) * config.sentido;
  });
}

/* ---------------- Vistas publicas ---------------------------------------- */

function snapshotDe(registro) {
  return {
    estado: registro.estado,
    tipo: registro.tipo,
    anio: registro.anio,
    cuatrimestre: registro.cuatrimestre ?? null,
    etiqueta: etiquetaPeriodo(registro.anio, registro.cuatrimestre),
    observaciones: registro.observaciones ?? null,
    actualizadoPor: registro.actualizadoPor ?? null,
    fecha: registro.actualizadoEn ?? registro.creadoEn
  };
}

function publicAlumno(alumno) {
  return {
    id: alumno.id,
    escuelaId: alumno.escuelaId,
    apellido: alumno.apellido,
    nombre: alumno.nombre,
    dni: alumno.dni
  };
}

function publicMateria(materia) {
  return {
    id: materia.id,
    nombre: materia.nombre
  };
}

function publicRegistro(registro) {
  const alumno = academicRecordsRepository.findStudentRefById(registro.alumnoId);
  const materia = academicRecordsRepository.findSubjectRefById(registro.materiaId);

  return {
    id: registro.id,
    escuelaId: registro.escuelaId,
    alumnoId: registro.alumnoId,
    alumno: alumno
      ? publicAlumno(alumno)
      : { id: registro.alumnoId },
    materiaId: registro.materiaId,
    materia: materia ? publicMateria(materia).nombre : null,
    periodo: {
      anio: registro.anio,
      cuatrimestre: registro.cuatrimestre ?? null,
      etiqueta: etiquetaPeriodo(registro.anio, registro.cuatrimestre)
    },
    tipo: registro.tipo,
    estado: registro.estado,
    antecedenteId: registro.antecedenteId ?? null,
    historial: (registro.historial ?? []).map(snapshotDe),
    observaciones: registro.observaciones ?? null,
    creadoEn: registro.creadoEn,
    actualizadoEn: registro.actualizadoEn,
    actualizadoPor: registro.actualizadoPor ?? null
  };
}

/* ---------------- Validaciones ------------------------------------------- */

function validarPeriodo(data, errores, { requerido } = {}) {
  if (data?.anio !== undefined && data?.anio !== null) {
    if (esAnioLectivo(data.anio)) {
      return Number(data.anio);
    }

    errores.push({
      field: "anio",
      message: `El anio lectivo debe ser un entero entre ${ANIO_MINIMO} y ${ANIO_MAXIMO}.`
    });
  } else if (requerido) {
    errores.push({ field: "anio", message: "El anio lectivo es obligatorio." });
  }

  return undefined;
}

function validarCuatrimestre(data, errores) {
  if (data?.cuatrimestre === undefined) {
    return null;
  }

  const cuatrimestre = normalizarCuatrimestre(data.cuatrimestre);

  if (cuatrimestre === undefined) {
    errores.push({ field: "cuatrimestre", message: "El cuatrimestre debe ser 1, 2 o no enviarse (periodo anual)." });
    return null;
  }

  return cuatrimestre;
}

function validarTipo(data, errores, { requerido } = {}) {
  const tipo = data?.tipo === undefined ? (requerido ? TIPO_POR_DEFECTO : undefined) : data.tipo;

  if (tipo !== undefined && !TIPOS_VALIDOS.includes(tipo)) {
    errores.push({ field: "tipo", message: `El tipo de situacion debe ser uno de: ${TIPOS_VALIDOS.join(", ")}.` });
    return undefined;
  }

  return tipo;
}

function validarEstado(data, errores, { requerido } = {}) {
  const estado = data?.estado === undefined ? (requerido ? ESTADO_POR_DEFECTO : undefined) : data.estado;

  if (estado !== undefined && !ESTADOS_VALIDOS.includes(estado)) {
    errores.push({ field: "estado", message: `El estado de la materia debe ser uno de: ${ESTADOS_VALIDOS.join(", ")}.` });
    return undefined;
  }

  return estado;
}

function validarObservaciones(data, errores) {
  if (data?.observaciones === undefined) {
    return null;
  }

  if (data.observaciones === null) {
    return null;
  }

  if (typeof data.observaciones !== "string") {
    errores.push({ field: "observaciones", message: "Las observaciones deben ser texto." });
    return null;
  }

  const observaciones = data.observaciones.trim();

  if (observaciones.length > OBSERVACIONES_MAX) {
    errores.push({ field: "observaciones", message: `Las observaciones no pueden superar los ${OBSERVACIONES_MAX} caracteres.` });
    return null;
  }

  return observaciones || null;
}

/* ---------------- Servicio ----------------------------------------------- */

const academicRecordsService = {
  createSituacion(data, user) {
    const errores = [];
    const alumno = data?.alumnoId ? academicRecordsRepository.findStudentRefById(data.alumnoId) : null;
    const materia = data?.materiaId ? academicRecordsRepository.findSubjectRefById(data.materiaId) : null;

    if (!data?.alumnoId) {
      errores.push({ field: "alumnoId", message: "El alumno es obligatorio." });
    } else if (!alumno) {
      errores.push({ field: "alumnoId", message: "El alumno indicado no existe." });
    }

    if (!data?.materiaId) {
      errores.push({ field: "materiaId", message: "La materia es obligatoria." });
    } else if (!materia) {
      errores.push({ field: "materiaId", message: "La materia indicada no existe." });
    }

    const anio = validarPeriodo(data, errores, { requerido: true });
    const cuatrimestre = validarCuatrimestre(data, errores);
    const tipo = validarTipo(data, errores, { requerido: true });
    const estado = validarEstado(data, errores, { requerido: true });
    const observaciones = validarObservaciones(data, errores);

    if (errores.length > 0) {
      throw errorDeValidacion(errores);
    }

    const duplicado = academicRecordsRepository.findSituacionDuplicada({
      alumnoId: data.alumnoId,
      materiaId: data.materiaId,
      anio,
      cuatrimestre
    });

    if (duplicado) {
      throw conflicto("Ya existe una situacion academica para ese alumno, materia y periodo.");
    }

    let antecedenteId = null;
    let historial = [];

    if (tipo === "recursada") {
      const antecedente = academicRecordsRepository.findAntecedente({
        alumnoId: data.alumnoId,
        materiaId: data.materiaId,
        anio
      });

      if (antecedente) {
        antecedenteId = antecedente.id;
        historial = [snapshotDe(antecedente)];
      }
    }

    const registro = academicRecordsRepository.createSituacion({
      escuelaId: alumno.escuelaId,
      alumnoId: alumno.id,
      materiaId: materia.id,
      anio,
      cuatrimestre,
      tipo,
      estado,
      antecedenteId,
      historial,
      observaciones,
      actualizadoPor: actorDel(user)
    });
    academicRecordsRepository.registrarAuditoria({
      accion: "situacion:create",
      actorId: actorDel(user),
      entidad: "situacion",
      entidadId: registro.id,
      antes: null,
      despues: publicRegistro(registro)
    });

    return { statusCode: 201, body: { data: publicRegistro(registro) } };
  },

  getSituacion(id) {
    const registro = academicRecordsRepository.findSituacionById(id);

    if (!registro) {
      throw noEncontrado("La situacion academica");
    }

    return { statusCode: 200, body: { data: publicRegistro(registro) } };
  },

  updateSituacion(id, data, user) {
    const actual = academicRecordsRepository.findSituacionById(id);

    if (!actual) {
      throw noEncontrado("La situacion academica");
    }

    const errores = [];

    if (data?.alumnoId !== undefined && data.alumnoId !== actual.alumnoId) {
      errores.push({ field: "alumnoId", message: "No se puede modificar el alumno de una situacion academica." });
    }

    if (data?.materiaId !== undefined && data.materiaId !== actual.materiaId) {
      errores.push({ field: "materiaId", message: "No se puede modificar la materia de una situacion academica." });
    }

    const anio = validarPeriodo(data, errores);
    const cuatrimestre = validarCuatrimestre(data, errores);
    const tipo = validarTipo(data, errores);
    const estado = validarEstado(data, errores);
    const observaciones = validarObservaciones(data, errores);

    if (
      estado !== undefined &&
      estado !== actual.estado &&
      !transicionPermitida(actual.estado, estado)
    ) {
      errores.push({
        field: "estado",
        message: `No se puede pasar la materia de "${actual.estado}" a "${estado}". Transiciones validas: ${(TRANSICIONES[actual.estado] ?? []).join(", ") || "ninguna"}.`
      });
    }

    if (errores.length > 0) {
      throw errorDeValidacion(errores);
    }

    const nuevoAnio = anio ?? actual.anio;
    const nuevoCuatrimestre = cuatrimestre ?? actual.cuatrimestre ?? null;

    const duplicado = academicRecordsRepository.findSituacionDuplicada({
      alumnoId: actual.alumnoId,
      materiaId: actual.materiaId,
      anio: nuevoAnio,
      cuatrimestre: nuevoCuatrimestre
    });

    if (duplicado && duplicado.id !== id) {
      throw conflicto("Ya existe una situacion academica para ese alumno, materia y periodo.");
    }

    const cambios = {};

    if (anio !== undefined && anio !== actual.anio) {
      cambios.anio = nuevoAnio;
    }

    if (cuatrimestre !== undefined && cuatrimestre !== (actual.cuatrimestre ?? null)) {
      cambios.cuatrimestre = nuevoCuatrimestre;
    }

    if (tipo !== undefined && tipo !== actual.tipo) {
      cambios.tipo = tipo;
    }

    if (estado !== undefined && estado !== actual.estado) {
      cambios.estado = estado;
    }

    if (observaciones !== null && observaciones !== actual.observaciones) {
      cambios.observaciones = observaciones;
    }

    if (Object.keys(cambios).length === 0) {
      return { statusCode: 200, body: { data: publicRegistro(actual) } };
    }

    const actualizado = academicRecordsRepository.updateSituacion(id, cambios, snapshotDe(actual));
    academicRecordsRepository.registrarAuditoria({
      accion: "situacion:update",
      actorId: actorDel(user),
      entidad: "situacion",
      entidadId: id,
      antes: publicRegistro(actual),
      despues: publicRegistro(actualizado)
    });

    return { statusCode: 200, body: { data: publicRegistro(actualizado) } };
  },

  listSituaciones(query, user) {
    const errores = [];
    const estado = query.estado;
    const tipo = query.tipo;

    if (estado !== undefined && !ESTADOS_VALIDOS.includes(estado)) {
      errores.push({ field: "estado", message: `El estado de la materia debe ser uno de: ${ESTADOS_VALIDOS.join(", ")}.` });
    }

    if (tipo !== undefined && !TIPOS_VALIDOS.includes(tipo)) {
      errores.push({ field: "tipo", message: `El tipo de situacion debe ser uno de: ${TIPOS_VALIDOS.join(", ")}.` });
    }

    if (query.anio !== undefined && query.anio !== null && query.anio !== "" && !esAnioLectivo(query.anio)) {
      errores.push({ field: "anio", message: `El anio lectivo debe ser un entero entre ${ANIO_MINIMO} y ${ANIO_MAXIMO}.` });
    }

    if (query.cuatrimestre !== undefined && query.cuatrimestre !== "") {
      const cuatrimestre = normalizarCuatrimestre(query.cuatrimestre);

      if (cuatrimestre === undefined) {
        errores.push({ field: "cuatrimestre", message: "El cuatrimestre debe ser 1 o 2." });
      }
    }

    const orden = query.orden ?? "anio";

    if (!ORDENES_SITUACIONES[orden]) {
      errores.push({ field: "orden", message: "Orden invalido." });
    }

    validarPagina(query, errores);

    if (errores.length > 0) {
      throw errorDeValidacion(errores);
    }

    const escuelaId = escuelaDel(user, query);
    const anio = query.anio === undefined || query.anio === null || query.anio === "" ? undefined : Number(query.anio);
    const cuatrimestre = query.cuatrimestre === undefined || query.cuatrimestre === "" ? undefined : normalizarCuatrimestre(query.cuatrimestre);

    const lista = ordenar(
      academicRecordsRepository
        .listSituaciones({
          escuelaId,
          alumnoId: query.alumnoId,
          materiaId: query.materiaId,
          tipo,
          estado,
          anio,
          cuatrimestre
        })
        .map(publicRegistro),
      ORDENES_SITUACIONES[orden]
    );

    return {
      statusCode: 200,
      body: paginar(lista, query, {
        alumnoId: query.alumnoId ?? null,
        materiaId: query.materiaId ?? null,
        tipo: tipo ?? null,
        estado: estado ?? null,
        anio: query.anio ?? null,
        cuatrimestre: query.cuatrimestre ?? null,
        orden
      })
    };
  },

  listPendientes(query, user) {
    return this.listSituaciones({ ...query, tipo: "pendiente" }, user);
  },

  listRecursadas(query, user) {
    return this.listSituaciones({ ...query, tipo: "recursada" }, user);
  },

  listIntensificadas(query, user) {
    return this.listSituaciones({ ...query, tipo: "intensificada" }, user);
  },

  getSituacionDeAlumno(alumnoId) {
    const alumno = academicRecordsRepository.findStudentRefById(alumnoId);

    if (!alumno) {
      throw noEncontrado("El alumno");
    }

    const registros = academicRecordsRepository
      .listSituaciones({ alumnoId })
      .map(publicRegistro)
      .sort((a, b) => b.periodo.anio - a.periodo.anio);

    const camposVacios = (claves) => Object.fromEntries(claves.map((clave) => [clave, 0]));

    const resumen = {
      total: registros.length,
      porTipo: camposVacios(TIPOS_VALIDOS),
      porEstado: camposVacios(ESTADOS_VALIDOS)
    };

    for (const registro of registros) {
      resumen.porTipo[registro.tipo] = (resumen.porTipo[registro.tipo] ?? 0) + 1;
      resumen.porEstado[registro.estado] = (resumen.porEstado[registro.estado] ?? 0) + 1;
    }

    const porMateria = new Map();

    for (const registro of registros) {
      if (!porMateria.has(registro.materiaId)) {
        porMateria.set(registro.materiaId, {
          materiaId: registro.materiaId,
          materia: registro.materia,
          registros: []
        });
      }

      porMateria.get(registro.materiaId).registros.push(registro);
    }

    const materias = [...porMateria.values()].sort((a, b) =>
      collator.compare(String(a.materia ?? ""), String(b.materia ?? ""))
    );

    return {
      statusCode: 200,
      body: {
        data: {
          alumno: publicAlumno(alumno),
          resumen,
          materias
        }
      }
    };
  },

  getSituacionDeAlumnoYMateria(alumnoId, materiaId) {
    const alumno = academicRecordsRepository.findStudentRefById(alumnoId);

    if (!alumno) {
      throw noEncontrado("El alumno");
    }

    const materia = academicRecordsRepository.findSubjectRefById(materiaId);

    if (!materia) {
      throw noEncontrado("La materia");
    }

    const registros = academicRecordsRepository
      .listSituaciones({ alumnoId, materiaId })
      .map(publicRegistro)
      .sort((a, b) => b.periodo.anio - a.periodo.anio);

    return {
      statusCode: 200,
      body: {
        data: {
          alumno: publicAlumno(alumno),
          materia: publicMateria(materia),
          registros
        }
      }
    };
  },

  getHistorialDeAlumno(alumnoId) {
    const alumno = academicRecordsRepository.findStudentRefById(alumnoId);

    if (!alumno) {
      throw noEncontrado("El alumno");
    }

    const registros = academicRecordsRepository
      .listSituaciones({ alumnoId })
      .map(publicRegistro)
      .sort((a, b) => b.periodo.anio - a.periodo.anio || String(a.periodo.etiqueta).localeCompare(String(b.periodo.etiqueta)));

    return {
      statusCode: 200,
      body: {
        data: {
          alumno: publicAlumno(alumno),
          registros
        }
      }
    };
  },

  getCatalogos() {
    return {
      statusCode: 200,
      body: {
        data: {
          tipos: TIPOS_SITUACION,
          estados: ESTADOS_MATERIA,
          transiciones: TRANSICIONES
        }
      }
    };
  }
};

export default academicRecordsService;