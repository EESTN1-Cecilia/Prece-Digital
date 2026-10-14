import { errorDeValidacion, noEncontrado, conflicto } from "../../utils/api-error.mjs";
import { ANIOS_VALIDOS, CICLO_ANIOS, ESTADOS_VALIDOS, NOMBRE_ANIO, ORDENES_CICLOS, ORDENES_CURSOS, ORDENES_DIVISIONES, ORDENES_ORIENTACIONES, TIPOS_CICLO, TURNOS, TURNOS_ACEPTADOS, esEntero, esNombreDivision, normalizarTexto, normalizarTurno, tipoCicloDeAnio } from "./catalogo.mjs";
import academicRepository from "./academic.repository.mjs";

const POR_PAGINA_MAXIMO = 100;
const POR_PAGINA_DEFECTO = 20;

const collator = new Intl.Collator("es", { sensitivity: "base" });

function actorDel(user) {
  return user?.id ?? null;
}

function escuelaDel(user, data) {
  return data?.escuelaId ?? user.assignments?.find((a) => a.schoolId)?.schoolId ?? null;
}

function estadoValido(valor) {
  return typeof valor === "string" && ESTADOS_VALIDOS.includes(valor);
}

function validarEstadoCampo(valor, campo, errores) {
  if (valor !== undefined && !estadoValido(valor)) {
    errores.push({ field: campo, message: "Estado invalido. Use activo, inactivo o cerrado." });
  }
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

function publicCiclo(ciclo) {
  return {
    id: ciclo.id,
    nombre: ciclo.nombre,
    descripcion: ciclo.descripcion,
    tipo: ciclo.tipo,
    anioDesde: ciclo.anioDesde,
    anioHasta: ciclo.anioHasta,
    estado: ciclo.estado,
    creadoEn: ciclo.creadoEn,
    actualizadoEn: ciclo.actualizadoEn,
    fechaBaja: ciclo.fechaBaja
  };
}

function publicOrientacion(orientacion) {
  return {
    id: orientacion.id,
    nombre: orientacion.nombre,
    descripcion: orientacion.descripcion,
    estado: orientacion.estado,
    creadoEn: orientacion.creadoEn,
    actualizadoEn: orientacion.actualizadoEn,
    fechaBaja: orientacion.fechaBaja
  };
}

function publicCurso(curso) {
  const orientacion = curso.orientacionId ? academicRepository.findOrientacionById(curso.orientacionId) : null;

  return {
    id: curso.id,
    escuelaId: curso.escuelaId,
    anio: curso.anio,
    nombre: `${NOMBRE_ANIO[curso.anio]} ${curso.turno}`,
    turno: curso.turno,
    cicloId: curso.cicloId,
    orientacionId: curso.orientacionId ?? null,
    orientacion: orientacion?.nombre ?? null,
    estado: curso.estado,
    creadoEn: curso.creadoEn,
    actualizadoEn: curso.actualizadoEn,
    fechaBaja: curso.fechaBaja
  };
}

function publicDivision(division) {
  const curso = academicRepository.findCursoById(division.cursoId);

  return {
    id: division.id,
    escuelaId: division.escuelaId,
    cursoId: division.cursoId,
    nombre: division.nombre,
    turno: curso?.turno ?? null,
    estado: division.estado,
    creadoEn: division.creadoEn,
    actualizadoEn: division.actualizadoEn,
    fechaBaja: division.fechaBaja,
    curso: curso
      ? {
          id: curso.id,
          anio: curso.anio,
          anioNombre: NOMBRE_ANIO[curso.anio],
          turno: curso.turno,
          cicloId: curso.cicloId,
          orientacionId: curso.orientacionId ?? null
        }
      : null
  };
}

/* ---------------- Ciclos -------------------------------------------------- */

function validarCiclo(data, errores) {
  if (data?.tipo !== undefined && !TIPOS_CICLO.includes(data.tipo)) {
    errores.push({ field: "tipo", message: "El tipo debe ser primer o segundo." });
  }

  for (const campo of ["anioDesde", "anioHasta"]) {
    if (data?.[campo] !== undefined && data?.[campo] !== null) {
      const valor = parseEntero(data[campo]);

      if (Number.isNaN(valor)) {
        errores.push({ field: campo, message: `${campo} debe ser un anio valido.` });
      }
    }
  }
}

const academicService = {
  createCiclo(data, user) {
    const errores = [];

    if (!data?.nombre || typeof data.nombre !== "string" || !data.nombre.trim()) {
      errores.push({ field: "nombre", message: "El nombre es obligatorio." });
    }

    validarCiclo(data, errores);

    const tipo = data?.tipo ?? null;

    if (tipo && !TIPOS_CICLO.includes(tipo)) {
      errores.push({ field: "tipo", message: "El tipo debe ser primer o segundo." });
    }

    if (errores.length > 0) {
      throw errorDeValidacion(errores);
    }

    if (!tipo) {
      throw errorDeValidacion([{ field: "tipo", message: "El tipo de ciclo es obligatorio." }]);
    }

    if (academicRepository.findCicloByNombre(data.nombre)) {
      throw conflicto("Ya existe un ciclo con ese nombre.");
    }

    const anios = CICLO_ANIOS[tipo];
    const ciclo = academicRepository.createCiclo({
      nombre: data.nombre.trim(),
      descripcion: typeof data.descripcion === "string" ? data.descripcion.trim() : null,
      tipo,
      anioDesde: data.anioDesde ?? anios[0],
      anioHasta: data.anioHasta ?? anios[anios.length - 1],
      createdBy: actorDel(user)
    });
    academicRepository.registrarAuditoria({
      accion: "ciclo:create",
      actorId: actorDel(user),
      entidad: "ciclo",
      entidadId: ciclo.id,
      antes: null,
      despues: publicCiclo(ciclo)
    });

    return { statusCode: 201, body: { data: publicCiclo(ciclo) } };
  },

  getCiclo(id) {
    const ciclo = academicRepository.findCicloById(id);

    if (!ciclo) {
      throw noEncontrado("El ciclo");
    }

    return { statusCode: 200, body: { data: publicCiclo(ciclo) } };
  },

  listCiclos(query) {
    const errores = [];
    const estado = query.estado ?? "todos";

    if (!ESTADOS_VALIDOS.includes(estado) && estado !== "todos") {
      errores.push({ field: "estado", message: "Estado invalido." });
    }

    const orden = query.orden ?? "nombre";

    if (!ORDENES_CICLOS[orden]) {
      errores.push({ field: "orden", message: "Orden invalido." });
    }

    validarPagina(query, errores);

    if (errores.length > 0) {
      throw errorDeValidacion(errores);
    }

    const lista = ordenar(
      academicRepository.listCiclos({ estado }).map(publicCiclo),
      ORDENES_CICLOS[orden]
    );

    return {
      statusCode: 200,
      body: paginar(lista, query, { estado, orden })
    };
  },

  updateCiclo(id, data, user) {
    const actual = academicRepository.findCicloById(id);

    if (!actual) {
      throw noEncontrado("El ciclo");
    }

    const errores = [];
    validarCiclo(data, errores);
    validarEstadoCampo(data?.estado, "estado", errores);

    if (
      data?.nombre !== undefined &&
      (!data.nombre || typeof data.nombre !== "string" || !data.nombre.trim())
    ) {
      errores.push({ field: "nombre", message: "El nombre no es valido." });
    } else if (
      data?.nombre !== undefined &&
      academicRepository.findCicloByNombre(data.nombre) &&
      normalizarTexto(data.nombre) !== normalizarTexto(actual.nombre)
    ) {
      errores.push({ field: "nombre", message: "Ya existe un ciclo con ese nombre." });
    }

    if (errores.length > 0) {
      throw errorDeValidacion(errores);
    }

    const cursosReferenciados = academicRepository.listCursos({ cicloId: id });

    if (data?.tipo !== undefined && data.tipo !== actual.tipo && cursosReferenciados.length > 0) {
      throw conflicto("No se puede cambiar el tipo de un ciclo que tiene cursos asociados.");
    }

    const cambios = {};

    for (const campo of ["nombre", "descripcion", "tipo", "anioDesde", "anioHasta", "estado"]) {
      if (campo === "nombre" && typeof data.nombre === "string") {
        cambios.nombre = data.nombre.trim();
      } else if (data[campo] !== undefined) {
        cambios[campo] = data[campo];
      }
    }

    const actualizado = academicRepository.updateCiclo(id, cambios);
    academicRepository.registrarAuditoria({
      accion: "ciclo:update",
      actorId: actorDel(user),
      entidad: "ciclo",
      entidadId: id,
      antes: publicCiclo(actual),
      despues: publicCiclo(actualizado)
    });

    return { statusCode: 200, body: { data: publicCiclo(actualizado) } };
  },

  deactivateCiclo(id, user) {
    const actual = academicRepository.findCicloById(id);

    if (!actual) {
      throw noEncontrado("El ciclo");
    }

    const actualizado = academicRepository.deactivateCiclo(id);
    academicRepository.registrarAuditoria({
      accion: "ciclo:deactivate",
      actorId: actorDel(user),
      entidad: "ciclo",
      entidadId: id,
      antes: publicCiclo(actual),
      despues: publicCiclo(actualizado)
    });

    return { statusCode: 200, body: { data: publicCiclo(actualizado) } };
  },

  /* ---------------- Orientaciones ----------------------------------------- */

  createOrientacion(data, user) {
    const errores = [];

    if (!data?.nombre || typeof data.nombre !== "string" || !data.nombre.trim()) {
      errores.push({ field: "nombre", message: "El nombre es obligatorio." });
    }

    if (errores.length > 0) {
      throw errorDeValidacion(errores);
    }

    if (academicRepository.findOrientacionByNombre(data.nombre)) {
      throw conflicto("Ya existe una orientacion con ese nombre.");
    }

    const orientacion = academicRepository.createOrientacion({
      nombre: data.nombre.trim(),
      descripcion: typeof data.descripcion === "string" ? data.descripcion.trim() : null,
      createdBy: actorDel(user)
    });
    academicRepository.registrarAuditoria({
      accion: "orientacion:create",
      actorId: actorDel(user),
      entidad: "orientacion",
      entidadId: orientacion.id,
      antes: null,
      despues: publicOrientacion(orientacion)
    });

    return { statusCode: 201, body: { data: publicOrientacion(orientacion) } };
  },

  getOrientacion(id) {
    const orientacion = academicRepository.findOrientacionById(id);

    if (!orientacion) {
      throw noEncontrado("La orientacion");
    }

    return { statusCode: 200, body: { data: publicOrientacion(orientacion) } };
  },

  listOrientaciones(query) {
    const errores = [];
    const estado = query.estado ?? "todos";

    if (!ESTADOS_VALIDOS.includes(estado) && estado !== "todos") {
      errores.push({ field: "estado", message: "Estado invalido." });
    }

    const orden = query.orden ?? "nombre";

    if (!ORDENES_ORIENTACIONES[orden]) {
      errores.push({ field: "orden", message: "Orden invalido." });
    }

    validarPagina(query, errores);

    if (errores.length > 0) {
      throw errorDeValidacion(errores);
    }

    const lista = ordenar(
      academicRepository.listOrientaciones({ estado }).map(publicOrientacion),
      ORDENES_ORIENTACIONES[orden]
    );

    return {
      statusCode: 200,
      body: paginar(lista, query, { estado, orden })
    };
  },

  updateOrientacion(id, data, user) {
    const actual = academicRepository.findOrientacionById(id);

    if (!actual) {
      throw noEncontrado("La orientacion");
    }

    const errores = [];
    validarEstadoCampo(data?.estado, "estado", errores);

    if (
      data?.nombre !== undefined &&
      (!data.nombre || typeof data.nombre !== "string" || !data.nombre.trim())
    ) {
      errores.push({ field: "nombre", message: "El nombre no es valido." });
    } else if (
      data?.nombre !== undefined &&
      academicRepository.findOrientacionByNombre(data.nombre) &&
      normalizarTexto(data.nombre) !== normalizarTexto(actual.nombre)
    ) {
      errores.push({ field: "nombre", message: "Ya existe una orientacion con ese nombre." });
    }

    if (errores.length > 0) {
      throw errorDeValidacion(errores);
    }

    const cambios = {};

    for (const campo of ["nombre", "descripcion", "estado"]) {
      if (campo === "nombre" && typeof data.nombre === "string") {
        cambios.nombre = data.nombre.trim();
      } else if (data[campo] !== undefined) {
        cambios[campo] = data[campo];
      }
    }

    const actualizado = academicRepository.updateOrientacion(id, cambios);
    academicRepository.registrarAuditoria({
      accion: "orientacion:update",
      actorId: actorDel(user),
      entidad: "orientacion",
      entidadId: id,
      antes: publicOrientacion(actual),
      despues: publicOrientacion(actualizado)
    });

    return { statusCode: 200, body: { data: publicOrientacion(actualizado) } };
  },

  deactivateOrientacion(id, user) {
    const actual = academicRepository.findOrientacionById(id);

    if (!actual) {
      throw noEncontrado("La orientacion");
    }

    const actualizado = academicRepository.deactivateOrientacion(id);
    academicRepository.registrarAuditoria({
      accion: "orientacion:deactivate",
      actorId: actorDel(user),
      entidad: "orientacion",
      entidadId: id,
      antes: publicOrientacion(actual),
      despues: publicOrientacion(actualizado)
    });

    return { statusCode: 200, body: { data: publicOrientacion(actualizado) } };
  },

  /* ---------------- Cursos ------------------------------------------------ */

  validarCursoCompleto(candidato, user, errores) {
    if (!esEntero(candidato.anio) || !ANIOS_VALIDOS.includes(Number(candidato.anio))) {
      errores.push({ field: "anio", message: "El anio debe ser un nivel entre 1 y 7." });
      return;
    }

    const turno = candidato.turno === undefined ? null : normalizarTurno(candidato.turno);

    if (!turno) {
      errores.push({ field: "turno", message: "El turno debe ser MANANA o TARDE." });
      return;
    }

    const anio = Number(candidato.anio);
    const tipoRequerido = tipoCicloDeAnio(anio);

    if (!candidato.cicloId) {
      errores.push({ field: "cicloId", message: "El ciclo es obligatorio." });
      return;
    }

    const ciclo = academicRepository.findCicloById(candidato.cicloId);

    if (!ciclo) {
      errores.push({ field: "cicloId", message: "El ciclo indicado no existe." });
      return;
    }

    if (ciclo.estado !== "activo") {
      errores.push({ field: "cicloId", message: "El ciclo debe estar activo para crear un curso." });
      return;
    }

    if (ciclo.tipo !== tipoRequerido) {
      errores.push({ field: "anio", message: "El anio no corresponde al ciclo indicado." });
      return;
    }

    const orientacionId = candidato.orientacionId === undefined || candidato.orientacionId === null ? null : candidato.orientacionId;

    if (tipoRequerido === "primer") {
      if (orientacionId) {
        errores.push({ field: "orientacionId", message: "Los cursos del primer ciclo no admiten orientacion." });
      }
    } else {
      if (!orientacionId) {
        errores.push({ field: "orientacionId", message: "Los cursos del segundo ciclo requieren una orientacion." });
      } else {
        const orientacion = academicRepository.findOrientacionById(orientacionId);

        if (!orientacion) {
          errores.push({ field: "orientacionId", message: "La orientacion indicada no existe." });
        } else if (orientacion.estado !== "activo") {
          errores.push({ field: "orientacionId", message: "La orientacion debe estar activa para asignarse a un curso." });
        }
      }
    }

    return { anio, turno, ciclo, orientacionId };
  },

  createCurso(data, user) {
    const errores = [];
    const escuelaId = escuelaDel(user, data);

    if (!escuelaId) {
      errores.push({ field: "escuelaId", message: "La escuela es obligatoria." });
    }

    const validado = this.validarCursoCompleto(data, user, errores);

    if (errores.length > 0) {
      throw errorDeValidacion(errores);
    }

    const duplicado = academicRepository.findCursoDuplicado({
      escuelaId,
      anio: validado.anio,
      turno: validado.turno,
      orientacionId: validado.orientacionId
    });

    if (duplicado) {
      throw conflicto("Ya existe un curso con ese anio, turno y orientacion en la escuela.");
    }

    const curso = academicRepository.createCurso({
      escuelaId,
      anio: validado.anio,
      turno: validado.turno,
      cicloId: validado.ciclo.id,
      orientacionId: validado.orientacionId,
      createdBy: actorDel(user)
    });
    academicRepository.registrarAuditoria({
      accion: "curso:create",
      actorId: actorDel(user),
      entidad: "curso",
      entidadId: curso.id,
      antes: null,
      despues: publicCurso(curso)
    });

    return { statusCode: 201, body: { data: publicCurso(curso) } };
  },

  getCurso(id) {
    const curso = academicRepository.findCursoById(id);

    if (!curso) {
      throw noEncontrado("El curso");
    }

    return { statusCode: 200, body: { data: publicCurso(curso) } };
  },

  listCursos(query, user) {
    const errores = [];
    const estado = query.estado ?? "activo";

    if (!ESTADOS_VALIDOS.includes(estado) && estado !== "todos") {
      errores.push({ field: "estado", message: "Estado invalido." });
    }

    const orden = query.orden ?? "anio";

    if (!ORDENES_CURSOS[orden]) {
      errores.push({ field: "orden", message: "Orden invalido." });
    }

    if (query.anio !== undefined && (!esEntero(query.anio) || !ANIOS_VALIDOS.includes(Number(query.anio)))) {
      errores.push({ field: "anio", message: "El anio debe ser un nivel entre 1 y 7." });
    }

    if (query.turno !== undefined && !TURNOS_ACEPTADOS.includes(query.turno.toUpperCase().replace("Ñ", "N"))) {
      errores.push({ field: "turno", message: "El turno debe ser MANANA o TARDE." });
    }

    validarPagina(query, errores);

    if (errores.length > 0) {
      throw errorDeValidacion(errores);
    }

    const escuelaId = user.assignments?.find((a) => a.schoolId)?.schoolId ?? query.schoolId;
    const lista = ordenar(
      academicRepository
        .listCursos({
          escuelaId,
          cicloId: query.cicloId,
          anio: query.anio === undefined ? undefined : Number(query.anio),
          turno: query.turno ? normalizarTurno(query.turno) : undefined,
          orientacionId: query.orientacionId,
          estado
        })
        .map(publicCurso),
      ORDENES_CURSOS[orden]
    );

    return {
      statusCode: 200,
      body: paginar(lista, query, {
        cicloId: query.cicloId ?? null,
        anio: query.anio ?? null,
        turno: query.turno ?? null,
        orientacionId: query.orientacionId ?? null,
        estado,
        orden
      })
    };
  },

  updateCurso(id, data, user) {
    const actual = academicRepository.findCursoById(id);

    if (!actual) {
      throw noEncontrado("El curso");
    }

    const errores = [];
    validarEstadoCampo(data?.estado, "estado", errores);

    const candidato = {
      anio: data.anio ?? actual.anio,
      turno: data.turno ?? actual.turno,
      cicloId: data.cicloId ?? actual.cicloId,
      orientacionId: data.orientacionId === undefined ? actual.orientacionId : data.orientacionId
    };

    const validado = this.validarCursoCompleto(candidato, user, errores);
    const escuelaId = actual.escuelaId;

    if (errores.length === 0) {
      const duplicado = academicRepository.findCursoDuplicado({
        escuelaId,
        anio: validado.anio,
        turno: validado.turno,
        orientacionId: validado.orientacionId
      });

      if (duplicado && duplicado.id !== id) {
        errores.push({ field: "curso", message: "Ya existe un curso con ese anio, turno y orientacion en la escuela." });
      }
    }

    if (errores.length > 0) {
      throw errorDeValidacion(errores);
    }

    const cambios = {};

    for (const campo of ["anio", "turno", "cicloId", "orientacionId", "estado"]) {
      if (data[campo] !== undefined) {
        cambios[campo] = data[campo];

        if (campo === "turno") {
          cambios[campo] = normalizarTurno(data[campo]);
        }

        if (campo === "orientacionId" && data[campo] === null) {
          cambios[campo] = null;
        }
      }
    }

    const actualizado = academicRepository.updateCurso(id, cambios);
    academicRepository.registrarAuditoria({
      accion: "curso:update",
      actorId: actorDel(user),
      entidad: "curso",
      entidadId: id,
      antes: publicCurso(actual),
      despues: publicCurso(actualizado)
    });

    return { statusCode: 200, body: { data: publicCurso(actualizado) } };
  },

  deactivateCurso(id, user) {
    const actual = academicRepository.findCursoById(id);

    if (!actual) {
      throw noEncontrado("El curso");
    }

    const actualizado = academicRepository.deactivateCurso(id);
    academicRepository.registrarAuditoria({
      accion: "curso:deactivate",
      actorId: actorDel(user),
      entidad: "curso",
      entidadId: id,
      antes: publicCurso(actual),
      despues: publicCurso(actualizado)
    });

    return { statusCode: 200, body: { data: publicCurso(actualizado) } };
  },

  listDivisionesDeCurso(cursoId, query) {
    const curso = academicRepository.findCursoById(cursoId);

    if (!curso) {
      throw noEncontrado("El curso");
    }

    const errores = [];
    const estado = query.estado ?? "activo";

    if (!ESTADOS_VALIDOS.includes(estado) && estado !== "todos") {
      errores.push({ field: "estado", message: "Estado invalido." });
    }

    validarPagina(query, errores);

    if (errores.length > 0) {
      throw errorDeValidacion(errores);
    }

    const lista = academicRepository
      .listDivisiones({ cursoId, estado })
      .map(publicDivision)
      .sort((a, b) => collator.compare(a.nombre, b.nombre));

    return {
      statusCode: 200,
      body: paginar(lista, query, { estado })
    };
  },

  /* ---------------- Divisiones -------------------------------------------- */

  createDivision(data, user) {
    const errores = [];

    if (!data?.cursoId) {
      errores.push({ field: "cursoId", message: "El curso es obligatorio." });
    }

    if (!esNombreDivision(data?.nombre)) {
      errores.push({ field: "nombre", message: "El nombre de la division es obligatorio (maximo 5 caracteres)." });
    }

    if (errores.length > 0) {
      throw errorDeValidacion(errores);
    }

    const curso = academicRepository.findCursoById(data.cursoId);

    if (!curso) {
      throw noEncontrado("El curso");
    }

    if (curso.estado !== "activo") {
      throw errorDeValidacion([{ field: "cursoId", message: "El curso debe estar activo para crear una division." }]);
    }

    if (academicRepository.findDivisionEnCurso(curso.id, data.nombre)) {
      throw conflicto("Ya existe una division con ese nombre en el curso.");
    }

    const division = academicRepository.createDivision({
      escuelaId: curso.escuelaId,
      cursoId: curso.id,
      nombre: data.nombre.trim(),
      createdBy: actorDel(user)
    });
    academicRepository.registrarAuditoria({
      accion: "division:create",
      actorId: actorDel(user),
      entidad: "division",
      entidadId: division.id,
      antes: null,
      despues: publicDivision(division)
    });

    return { statusCode: 201, body: { data: publicDivision(division) } };
  },

  getDivision(id) {
    const division = academicRepository.findDivisionById(id);

    if (!division) {
      throw noEncontrado("La division");
    }

    return { statusCode: 200, body: { data: publicDivision(division) } };
  },

  listDivisiones(query, user) {
    const errores = [];
    const estado = query.estado ?? "activo";

    if (!ESTADOS_VALIDOS.includes(estado) && estado !== "todos") {
      errores.push({ field: "estado", message: "Estado invalido." });
    }

    const orden = query.orden ?? "nombre";

    if (!ORDENES_DIVISIONES[orden]) {
      errores.push({ field: "orden", message: "Orden invalido." });
    }

    if (query.anio !== undefined && (!esEntero(query.anio) || !ANIOS_VALIDOS.includes(Number(query.anio)))) {
      errores.push({ field: "anio", message: "El anio debe ser un nivel entre 1 y 7." });
    }

    if (query.turno !== undefined && !TURNOS_ACEPTADOS.includes(query.turno.toUpperCase().replace("Ñ", "N"))) {
      errores.push({ field: "turno", message: "El turno debe ser MANANA o TARDE." });
    }

    validarPagina(query, errores);

    if (errores.length > 0) {
      throw errorDeValidacion(errores);
    }

    const escuelaId = user.assignments?.find((a) => a.schoolId)?.schoolId ?? query.schoolId;
    const lista = ordenar(
      academicRepository
        .listDivisiones({
          escuelaId,
          cursoId: query.cursoId,
          cicloId: query.cicloId,
          anio: query.anio === undefined ? undefined : Number(query.anio),
          turno: query.turno ? normalizarTurno(query.turno) : undefined,
          orientacionId: query.orientacionId,
          estado
        })
        .map(publicDivision),
      ORDENES_DIVISIONES[orden]
    );

    return {
      statusCode: 200,
      body: paginar(lista, query, {
        cursoId: query.cursoId ?? null,
        cicloId: query.cicloId ?? null,
        anio: query.anio ?? null,
        turno: query.turno ?? null,
        orientacionId: query.orientacionId ?? null,
        estado,
        orden
      })
    };
  },

  updateDivision(id, data, user) {
    const actual = academicRepository.findDivisionById(id);

    if (!actual) {
      throw noEncontrado("La division");
    }

    const errores = [];
    validarEstadoCampo(data?.estado, "estado", errores);

    if (data?.nombre !== undefined && !esNombreDivision(data.nombre)) {
      errores.push({ field: "nombre", message: "El nombre de la division no es valido." });
    }

    const cursoObjetivo = data?.cursoId !== undefined ? academicRepository.findCursoById(data.cursoId) : academicRepository.findCursoById(actual.cursoId);

    if (data?.cursoId !== undefined && !cursoObjetivo) {
      errores.push({ field: "cursoId", message: "El curso indicado no existe." });
    }

    if (errores.length > 0) {
      throw errorDeValidacion(errores);
    }

    if (cursoObjetivo.estado !== "activo") {
      throw errorDeValidacion([{ field: "cursoId", message: "El curso debe estar activo." }]);
    }

    const nuevoCursoId = cursoObjetivo.id;
    const nuevoNombre = data?.nombre !== undefined ? data.nombre.trim() : actual.nombre;
    const repetida = academicRepository.findDivisionEnCurso(nuevoCursoId, nuevoNombre);

    if (repetida && repetida.id !== id) {
      throw conflicto("Ya existe una division con ese nombre en el curso.");
    }

    const cambios = {};

    if (data?.nombre !== undefined) {
      cambios.nombre = data.nombre.trim();
    }

    if (data?.cursoId !== undefined && data.cursoId !== actual.cursoId) {
      cambios.cursoId = nuevoCursoId;
      cambios.escuelaId = cursoObjetivo.escuelaId;
    }

    if (data?.estado !== undefined) {
      cambios.estado = data.estado;
    }

    const actualizado = academicRepository.updateDivision(id, cambios);
    academicRepository.registrarAuditoria({
      accion: "division:update",
      actorId: actorDel(user),
      entidad: "division",
      entidadId: id,
      antes: publicDivision(actual),
      despues: publicDivision(actualizado)
    });

    return { statusCode: 200, body: { data: publicDivision(actualizado) } };
  },

  deactivateDivision(id, user) {
    const actual = academicRepository.findDivisionById(id);

    if (!actual) {
      throw noEncontrado("La division");
    }

    const actualizado = academicRepository.deactivateDivision(id);
    academicRepository.registrarAuditoria({
      accion: "division:deactivate",
      actorId: actorDel(user),
      entidad: "division",
      entidadId: id,
      antes: publicDivision(actual),
      despues: publicDivision(actualizado)
    });

    return { statusCode: 200, body: { data: publicDivision(actualizado) } };
  },

  /* ---------------- Consultas de alumnos, materias, docentes, horarios --- */

  listAlumnosDeCurso(cursoId, query) {
    const curso = academicRepository.findCursoById(cursoId);

    if (!curso) {
      throw noEncontrado("El curso");
    }

    const errores = [];
    validarPagina(query, errores);

    if (errores.length > 0) {
      throw errorDeValidacion(errores);
    }

    const alumnos = academicRepository
      .listMatricula({ cursoId })
      .filter((matricula) => matricula.isActive)
      .map((matricula) => {
        const estudiante = academicRepository.findStudentRefById(matricula.estudianteId);

        return estudiante ? { id: matricula.id, estudiante: estudiante.id, apellido: estudiante.apellido, nombre: estudiante.nombre, dni: estudiante.dni } : null;
      })
      .filter(Boolean);

    return { statusCode: 200, body: paginar(alumnos, query, {}) };
  },

  listAlumnosDeDivision(divisionId, query) {
    const division = academicRepository.findDivisionById(divisionId);

    if (!division) {
      throw noEncontrado("La division");
    }

    const errores = [];
    validarPagina(query, errores);

    if (errores.length > 0) {
      throw errorDeValidacion(errores);
    }

    const alumnos = academicRepository
      .listMatricula({ divisionId })
      .filter((matricula) => matricula.isActive)
      .map((matricula) => {
        const estudiante = academicRepository.findStudentRefById(matricula.estudianteId);

        return estudiante ? { id: matricula.id, estudiante: estudiante.id, apellido: estudiante.apellido, nombre: estudiante.nombre, dni: estudiante.dni } : null;
      })
      .filter(Boolean);

    return { statusCode: 200, body: paginar(alumnos, query, {}) };
  },

  listMateriasDeCurso(cursoId, query) {
    return this.listRelaciones("materias", "curso", cursoId, query);
  },

  listDocentesDeCurso(cursoId, query) {
    return this.listRelaciones("docentes", "curso", cursoId, query);
  },

  listHorariosDeCurso(cursoId, query) {
    return this.listRelaciones("horarios", "curso", cursoId, query);
  },

  listMateriasDeDivision(divisionId, query) {
    return this.listRelaciones("materias", "division", divisionId, query);
  },

  listDocentesDeDivision(divisionId, query) {
    return this.listRelaciones("docentes", "division", divisionId, query);
  },

  listHorariosDeDivision(divisionId, query) {
    return this.listRelaciones("horarios", "division", divisionId, query);
  },

  listRelaciones(tipoRelacion, tipoScope, scopeId, query) {
    const entidad = tipoScope === "curso" ? academicRepository.findCursoById(scopeId) : academicRepository.findDivisionById(scopeId);

    if (!entidad) {
      throw noEncontrado(tipoScope === "curso" ? "El curso" : "La division");
    }

    const errores = [];
    validarPagina(query, errores);

    if (errores.length > 0) {
      throw errorDeValidacion(errores);
    }

    let relaciones = [];

    if (tipoRelacion === "materias") {
      relaciones = academicRepository.listSubjectRelations({ tipo: tipoScope, scopeId });
    } else if (tipoRelacion === "docentes") {
      relaciones = academicRepository.listTeacherRelations({ tipo: tipoScope, scopeId });
    } else {
      relaciones = academicRepository.listScheduleRelations({ tipo: tipoScope, scopeId });
    }

    const lista = relaciones
      .map((relacion) => {
        const referencia =
          tipoRelacion === "materias"
            ? academicRepository.findSubjectRefById(relacion.subjectId)
            : tipoRelacion === "docentes"
              ? academicRepository.findTeacherRefById(relacion.teacherId)
              : academicRepository.findScheduleRefById(relacion.scheduleId);

        return referencia ? { id: relacion.id, ...referencia } : null;
      })
      .filter(Boolean);

    return { statusCode: 200, body: paginar(lista, query, {}) };
  }
};

export default academicService;