import { errorDeValidacion, errorHttp, noEncontrado, conflicto } from "../../utils/api-error.mjs";
import { esAreaValida, listarAreas, nombreArea } from "../../config/areas.config.mjs";
import academicRepository from "../academic/academic.repository.mjs";
import {
  ESTADOS_ASIGNACION,
  ESTADOS_ASIGNACION_VALIDOS,
  ESTADOS_DOCENTE,
  ESTADOS_VALIDOS,
  ESTADO_POR_DEFECTO,
  LIMITES,
  ORDENES_ASIGNACIONES,
  ORDENES_DOCENTES,
  ROL_ASIGNACION_POR_DEFECTO,
  ROLES_ASIGNACION,
  ROLES_ASIGNACION_VALIDOS,
  TIPO_DOCUMENTO_POR_DEFECTO,
  TIPOS_DOCUMENTO,
  TIPOS_DOCUMENTO_VALIDOS,
  esAnioLectivo,
  esDocumento,
  esEmail,
  esTelefono,
  etiquetaPeriodo,
  normalizarCuatrimestre,
  normalizarTexto
} from "./catalogo.mjs";
import teachersRepository from "./teachers.repository.mjs";
import { userRepository } from "../../database/repositories/user.repository.mjs";
import { sincronizarCuenta, verificarCuentaDisponible } from "./docente-cuenta.service.mjs";

/* Nadie da de baja su propia cuenta docente: la baja la decide otra persona
   autorizada. */
function impedirBajaPropia(docente, user) {
  if (docente.userId && user?.id && docente.userId === user.id) {
    throw errorHttp(403, "FORBIDDEN", "No puede dar de baja su propio registro docente.");
  }
}

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

    if (config.campo === "anio") {
      return (izquierdo - derecho) * config.sentido;
    }

    return collator.compare(String(izquierdo ?? ""), String(derecho ?? "")) * config.sentido;
  });
}

/* ---------------- Vistas publicas ---------------------------------------- */

function publicDocente(docente) {
  return {
    id: docente.id,
    userId: docente.userId ?? null,
    apellido: docente.apellido,
    nombre: docente.nombre,
    nombreCompleto: `${docente.apellido}, ${docente.nombre}`,
    apellidoSort: normalizarTexto(docente.apellido),
    nombreSort: normalizarTexto(docente.nombre),
    tipoDocumento: docente.tipoDocumento,
    documento: docente.documento,
    email: docente.email,
    telefono: docente.telefono ?? null,
    titulo: docente.titulo ?? null,
    especialidades: [...(docente.especialidades ?? [])],
    area: docente.area ?? null,
    areaNombre: nombreArea(docente.area) ?? null,
    escuelaId: docente.escuelaId,
    estado: docente.estado,
    creadoEn: docente.creadoEn,
    actualizadoEn: docente.actualizadoEn,
    creadoPor: docente.creadoPor ?? null,
    actualizadoPor: docente.actualizadoPor ?? null,
    fechaBaja: docente.fechaBaja ?? null
  };
}

function etiquetaCurso(cursoId, divisionId) {
  const curso = cursoId ? academicRepository.findCursoById(cursoId) : null;
  const division = divisionId ? academicRepository.findDivisionById(divisionId) : null;

  if (!curso) {
    return division?.nombre ?? null;
  }

  return division ? `${curso.anio}° año ${division.nombre}` : `${curso.anio}° año`;
}

/* Materia declarada en el alta del perfil (Datos Academicos de la cuenta
   vinculada). Si coincide con una materia del plan se usa su id, asi el filtro
   por materia la encuentra igual que a una asignacion; si no, se identifica por
   el texto normalizado. */
const PREFIJO_DECLARADA = "declarada:";

function materiasDeclaradas(docente) {
  const cuenta = docente.userId ? userRepository.findById(docente.userId, { includeInactive: true }) : null;
  const texto = String(cuenta?.materia ?? "").trim();
  const clave = normalizarTexto(texto);

  if (!clave) {
    return [];
  }

  const materia = academicRepository.listSubjectsRef().find((item) => normalizarTexto(item.nombre) === clave);
  return [{ id: materia?.id ?? `${PREFIJO_DECLARADA}${clave}`, nombre: materia?.nombre ?? texto }];
}

/* Lo que el docente tiene asignado hoy (solo asignaciones activas). Alimenta las
   columnas de materias y cursos del listado y el aviso previo a una baja. */
function resumenAsignaciones(docenteId, docente = null) {
  const deMateria = teachersRepository.listAsignacionesMateria({ docenteId, estado: "activo" });
  const deCurso = teachersRepository.listAsignacionesCurso({ docenteId, estado: "activo" });
  const materias = new Map();
  const cursos = new Map();

  for (const asignacion of deMateria) {
    if (!materias.has(asignacion.materiaId)) {
      const materia = academicRepository.findSubjectRefById(asignacion.materiaId);
      materias.set(asignacion.materiaId, { id: asignacion.materiaId, nombre: materia?.nombre ?? asignacion.materiaId });
    }
  }

  for (const asignacion of [...deMateria, ...deCurso]) {
    const clave = `${asignacion.cursoId ?? ""}|${asignacion.divisionId ?? ""}`;
    const etiqueta = etiquetaCurso(asignacion.cursoId, asignacion.divisionId);

    if (etiqueta && !cursos.has(clave)) {
      cursos.set(clave, { cursoId: asignacion.cursoId ?? null, divisionId: asignacion.divisionId ?? null, etiqueta });
    }
  }

  return {
    materias: [...materias.values()].sort((una, otra) => collator.compare(una.nombre, otra.nombre)),
    /* Materias declaradas en el perfil que todavia no tienen asignacion: el
       listado las muestra para que el alta se vea completa desde el primer dia. */
    materiasDeclaradas: docente ? materiasDeclaradas(docente).filter((materia) => !materias.has(materia.id)) : [],
    cursos: [...cursos.values()].sort((uno, otro) => collator.compare(uno.etiqueta, otro.etiqueta)),
    asignacionesMateria: deMateria.length,
    asignacionesCurso: deCurso.length,
    totalActivas: deMateria.length + deCurso.length
  };
}

function docenteConResumen(docente) {
  return { ...publicDocente(docente), asignaciones: resumenAsignaciones(docente.id, docente) };
}

/* El area es opcional y siempre sale del catalogo institucional. Devuelve
   undefined cuando el valor es invalido (y deja el error cargado). */
function normalizarArea(valor, errores) {
  if (valor === undefined) {
    return undefined;
  }

  if (valor === null || valor === "") {
    return null;
  }

  const area = String(valor).trim();

  if (!esAreaValida(area)) {
    errores.push({ field: "area", message: "El area no pertenece al catalogo institucional." });
    return undefined;
  }

  return area;
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

function snapshotAsignacionMateria(asignacion) {
  return {
    materiaId: asignacion.materiaId,
    cursoId: asignacion.cursoId ?? null,
    divisionId: asignacion.divisionId ?? null,
    anio: asignacion.anio,
    cuatrimestre: asignacion.cuatrimestre ?? null,
    etiqueta: etiquetaPeriodo(asignacion.anio, asignacion.cuatrimestre),
    horasSemanales: asignacion.horasSemanales ?? null,
    observaciones: asignacion.observaciones ?? null,
    estado: asignacion.estado,
    actualizadoPor: asignacion.actualizadoPor ?? null,
    fecha: asignacion.actualizadoEn ?? asignacion.creadoEn
  };
}

function snapshotAsignacionCurso(asignacion) {
  return {
    cursoId: asignacion.cursoId ?? null,
    divisionId: asignacion.divisionId ?? null,
    rol: asignacion.rol ?? null,
    anio: asignacion.anio,
    cuatrimestre: asignacion.cuatrimestre ?? null,
    etiqueta: etiquetaPeriodo(asignacion.anio, asignacion.cuatrimestre),
    observaciones: asignacion.observaciones ?? null,
    estado: asignacion.estado,
    actualizadoPor: asignacion.actualizadoPor ?? null,
    fecha: asignacion.actualizadoEn ?? asignacion.creadoEn
  };
}

function publicAsignacionMateria(asignacion) {
  const docente = teachersRepository.findDocenteById(asignacion.docenteId);
  const materia = academicRepository.findSubjectRefById(asignacion.materiaId);
  const curso = asignacion.cursoId ? academicRepository.findCursoById(asignacion.cursoId) : null;
  const division = asignacion.divisionId ? academicRepository.findDivisionById(asignacion.divisionId) : null;

  return {
    id: asignacion.id,
    docenteId: asignacion.docenteId,
    docente: docenteRef(docente) ?? { id: asignacion.docenteId },
    materiaId: asignacion.materiaId,
    materia: materia ? { id: materia.id, nombre: materia.nombre } : null,
    materiaSort: normalizarTexto(materia?.nombre ?? ""),
    cursoId: asignacion.cursoId ?? null,
    curso: cursoRef(curso),
    divisionId: asignacion.divisionId ?? null,
    division: divisionRef(division, curso),
    periodo: {
      anio: asignacion.anio,
      cuatrimestre: asignacion.cuatrimestre ?? null,
      etiqueta: etiquetaPeriodo(asignacion.anio, asignacion.cuatrimestre)
    },
    periodoSort: `${asignacion.anio}${String(asignacion.cuatrimestre ?? 0).padStart(2, "0")}`,
    horasSemanales: asignacion.horasSemanales ?? null,
    observaciones: asignacion.observaciones ?? null,
    estado: asignacion.estado,
    historial: (asignacion.historial ?? []).map((item) => ({ ...item })),
    creadoEn: asignacion.creadoEn,
    actualizadoEn: asignacion.actualizadoEn,
    creadoPor: asignacion.creadoPor ?? null,
    actualizadoPor: asignacion.actualizadoPor ?? null,
    fechaBaja: asignacion.fechaBaja ?? null
  };
}

function publicAsignacionCurso(asignacion) {
  const docente = teachersRepository.findDocenteById(asignacion.docenteId);
  const curso = asignacion.cursoId ? academicRepository.findCursoById(asignacion.cursoId) : null;
  const division = asignacion.divisionId ? academicRepository.findDivisionById(asignacion.divisionId) : null;

  return {
    id: asignacion.id,
    docenteId: asignacion.docenteId,
    docente: docenteRef(docente) ?? { id: asignacion.docenteId },
    cursoId: asignacion.cursoId ?? null,
    curso: cursoRef(curso),
    divisionId: asignacion.divisionId ?? null,
    division: divisionRef(division, curso),
    rol: asignacion.rol ?? null,
    periodo: {
      anio: asignacion.anio,
      cuatrimestre: asignacion.cuatrimestre ?? null,
      etiqueta: etiquetaPeriodo(asignacion.anio, asignacion.cuatrimestre)
    },
    periodoSort: `${asignacion.anio}${String(asignacion.cuatrimestre ?? 0).padStart(2, "0")}`,
    observaciones: asignacion.observaciones ?? null,
    estado: asignacion.estado,
    historial: (asignacion.historial ?? []).map((item) => ({ ...item })),
    creadoEn: asignacion.creadoEn,
    actualizadoEn: asignacion.actualizadoEn,
    creadoPor: asignacion.creadoPor ?? null,
    actualizadoPor: asignacion.actualizadoPor ?? null,
    fechaBaja: asignacion.fechaBaja ?? null
  };
}

/* ---------------- Validaciones ------------------------------------------- */

function validarTextoObligatorio(valor, campo, limite, errores, etiqueta) {
  if (typeof valor !== "string" || !valor.trim()) {
    errores.push({ field: campo, message: `${etiqueta} es obligatorio.` });
    return null;
  }

  const limpio = valor.trim();

  if (limpio.length > limite) {
    errores.push({ field: campo, message: `${etiqueta} no puede superar los ${limite} caracteres.` });
    return null;
  }

  return limpio;
}

function normalizarEspecialidades(valor, errores) {
  if (valor === undefined) {
    return undefined;
  }

  if (valor === null) {
    return [];
  }

  if (!Array.isArray(valor)) {
    errores.push({ field: "especialidades", message: "Las especialidades deben ser una lista de textos." });
    return undefined;
  }

  if (valor.length > LIMITES.especialidades) {
    errores.push({ field: "especialidades", message: `No se pueden cargar mas de ${LIMITES.especialidades} especialidades.` });
    return undefined;
  }

  const limpias = [];

  for (const item of valor) {
    if (typeof item !== "string" || !item.trim() || item.trim().length > LIMITES.especialidad) {
      errores.push({ field: "especialidades", message: `Cada especialidad debe ser un texto de hasta ${LIMITES.especialidad} caracteres.` });
      return undefined;
    }

    limpias.push(item.trim());
  }

  return limpias;
}

function normalizarObservaciones(valor, errores, campo = "observaciones") {
  if (valor === undefined) {
    return undefined;
  }

  if (valor === null) {
    return null;
  }

  if (typeof valor !== "string") {
    errores.push({ field: campo, message: "Las observaciones deben ser texto." });
    return undefined;
  }

  const limpio = valor.trim();

  if (limpio.length > LIMITES.observaciones) {
    errores.push({ field: campo, message: `Las observaciones no pueden superar los ${LIMITES.observaciones} caracteres.` });
    return undefined;
  }

  return limpio || null;
}

function normalizarHoras(valor, errores) {
  if (valor === undefined) {
    return undefined;
  }

  if (valor === null || valor === "") {
    return null;
  }

  const numero = Number(valor);

  if (!Number.isInteger(numero) || numero < 0 || numero > LIMITES.horasSemanales) {
    errores.push({ field: "horasSemanales", message: `Las horas semanales deben ser un entero entre 0 y ${LIMITES.horasSemanales}.` });
    return undefined;
  }

  return numero;
}

function normalizarPeriodo(data, errores, { requerido } = {}) {
  if (data?.anio !== undefined && data?.anio !== null && data?.anio !== "") {
    if (esAnioLectivo(data.anio)) {
      return Number(data.anio);
    }

    errores.push({ field: "anio", message: `El anio lectivo debe ser un entero entre 1990 y 2100.` });
    return undefined;
  }

  if (requerido) {
    errores.push({ field: "anio", message: "El anio lectivo es obligatorio." });
  }

  return undefined;
}

function normalizarCuatrimestreDe(data, errores) {
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

/* ---------------- Servicio ----------------------------------------------- */

const teachersService = {
  getCatalogos(user) {
    /* Materias que hoy dicta algun docente: son las que tiene sentido ofrecer
       como filtro del listado. */
    const materias = new Map();

    for (const asignacion of teachersRepository.listAsignacionesMateria({ estado: "activo" })) {
      if (!materias.has(asignacion.materiaId)) {
        const materia = academicRepository.findSubjectRefById(asignacion.materiaId);
        materias.set(asignacion.materiaId, { id: asignacion.materiaId, nombre: materia?.nombre ?? asignacion.materiaId });
      }
    }

    for (const docente of teachersRepository.listDocentes({ escuelaId: user ? escuelaDel(user, {}) : null, estado: "activo" })) {
      for (const materia of materiasDeclaradas(docente)) {
        if (!materias.has(materia.id)) {
          materias.set(materia.id, materia);
        }
      }
    }

    return {
      statusCode: 200,
      body: {
        data: {
          estados: ESTADOS_DOCENTE,
          tiposDocumento: TIPOS_DOCUMENTO,
          rolesAsignacion: ROLES_ASIGNACION,
          estadosAsignacion: ESTADOS_ASIGNACION,
          areas: listarAreas().map(({ id, nombre }) => ({ id, nombre })),
          materias: [...materias.values()].sort((una, otra) => collator.compare(una.nombre, otra.nombre))
        }
      }
    };
  },

  createDocente(data, user) {
    const errores = [];
    const escuelaId = escuelaDel(user, data);

    if (!escuelaId) {
      errores.push({ field: "escuelaId", message: "La escuela es obligatoria." });
    }

    const apellido = validarTextoObligatorio(data?.apellido, "apellido", LIMITES.apellido, errores, "El apellido");
    const nombre = validarTextoObligatorio(data?.nombre, "nombre", LIMITES.nombre, errores, "El nombre");

    const tipoDocumento = data?.tipoDocumento ?? TIPO_DOCUMENTO_POR_DEFECTO;

    if (!TIPOS_DOCUMENTO_VALIDOS.includes(tipoDocumento)) {
      errores.push({ field: "tipoDocumento", message: "El tipo de documento no es valido." });
    }

    const documento = typeof data?.documento === "string" ? data.documento.trim() : "";

    if (!documento) {
      errores.push({ field: "documento", message: "El documento es obligatorio." });
    } else if (!esDocumento(documento)) {
      errores.push({ field: "documento", message: "El documento debe tener entre 6 y 12 digitos." });
    }

    if (!data?.email) {
      errores.push({ field: "email", message: "El email es obligatorio." });
    } else if (!esEmail(data.email)) {
      errores.push({ field: "email", message: "El email no tiene un formato valido." });
    }

    if (data?.telefono !== undefined && data.telefono !== null && data.telefono !== "" && !esTelefono(String(data.telefono))) {
      errores.push({ field: "telefono", message: "El telefono no tiene un formato valido." });
    }

    /* Igual que en la modificacion: sin titulo, null o texto vacio es "sin titulo". */
    const titulo = data?.titulo === undefined || data?.titulo === null ? null : (typeof data.titulo === "string" ? data.titulo.trim() || null : undefined);

    if (titulo === undefined) {
      errores.push({ field: "titulo", message: "El titulo debe ser texto." });
    } else if (titulo && titulo.length > LIMITES.titulo) {
      errores.push({ field: "titulo", message: `El titulo no puede superar los ${LIMITES.titulo} caracteres.` });
    }

    const especialidades = normalizarEspecialidades(data?.especialidades, errores);
    const area = normalizarArea(data?.area, errores);
    const estado = data?.estado ?? ESTADO_POR_DEFECTO;

    if (!ESTADOS_VALIDOS.includes(estado)) {
      errores.push({ field: "estado", message: "El estado debe ser activo o inactivo." });
    }

    if (errores.length > 0) {
      throw errorDeValidacion(errores);
    }

    if (teachersRepository.findDocenteByDocumento(documento, escuelaId)) {
      throw conflicto("Ya existe un docente con ese documento en la escuela.");
    }

    if (teachersRepository.findDocenteByEmail(data.email, escuelaId)) {
      throw conflicto("Ya existe un docente con ese email en la escuela.");
    }

    const docente = teachersRepository.createDocente({
      apellido,
      nombre,
      tipoDocumento,
      documento,
      email: data.email.trim(),
      telefono: data.telefono ? String(data.telefono).trim() : null,
      titulo,
      especialidades: especialidades ?? [],
      area: area ?? null,
      escuelaId,
      estado,
      creadoPor: actorDel(user)
    });
    teachersRepository.registrarAuditoria({
      accion: "docente:create",
      actorId: actorDel(user),
      entidad: "docente",
      entidadId: docente.id,
      antes: null,
      despues: publicDocente(docente)
    });

    return { statusCode: 201, body: { data: publicDocente(docente) } };
  },

  getDocente(id) {
    const docente = teachersRepository.findDocenteById(id);

    if (!docente) {
      throw noEncontrado("El docente");
    }

    return { statusCode: 200, body: { data: docenteConResumen(docente) } };
  },

  listDocentes(query, user) {
    const errores = [];
    const estado = query.estado ?? "todos";

    if (estado !== "todos" && !ESTADOS_VALIDOS.includes(estado)) {
      errores.push({ field: "estado", message: "El estado debe ser activo, inactivo o todos." });
    }

    const orden = query.orden ?? "apellido";

    if (!ORDENES_DOCENTES[orden]) {
      errores.push({ field: "orden", message: "Orden invalido." });
    }

    const area = query.area || null;

    if (area && !esAreaValida(area)) {
      errores.push({ field: "area", message: "El area no pertenece al catalogo institucional." });
    }

    const materiaId = query.materiaId || null;

    validarPagina(query, errores);

    if (errores.length > 0) {
      throw errorDeValidacion(errores);
    }

    const escuelaId = escuelaDel(user, query);

    /* Filtro por materia: docentes con al menos una asignacion activa de esa
       materia. */
    const conMateria = materiaId
      ? new Set(teachersRepository.listAsignacionesMateria({ materiaId, estado: "activo" }).map((asignacion) => asignacion.docenteId))
      : null;
    const dictaMateria = (docente) =>
      conMateria.has(docente.id) || materiasDeclaradas(docente).some((materia) => materia.id === materiaId);

    const lista = ordenar(
      teachersRepository
        .listDocentes({ escuelaId, estado, q: query.q, area })
        .filter((docente) => !conMateria || dictaMateria(docente))
        .map(publicDocente),
      ORDENES_DOCENTES[orden]
    );

    const pagina = paginar(lista, query, { q: query.q ?? null, estado, area, materiaId, orden });
    pagina.data = pagina.data.map((docente) => ({ ...docente, asignaciones: resumenAsignaciones(docente.id, docente) }));

    return { statusCode: 200, body: pagina };
  },

  updateDocente(id, data, user) {
    const actual = teachersRepository.findDocenteById(id);

    if (!actual) {
      throw noEncontrado("El docente");
    }

    const errores = [];
    const cambios = {};

    if (data?.apellido !== undefined) {
      const apellido = validarTextoObligatorio(data.apellido, "apellido", LIMITES.apellido, errores, "El apellido");
      if (apellido) cambios.apellido = apellido;
    }

    if (data?.nombre !== undefined) {
      const nombre = validarTextoObligatorio(data.nombre, "nombre", LIMITES.nombre, errores, "El nombre");
      if (nombre) cambios.nombre = nombre;
    }

    if (data?.tipoDocumento !== undefined) {
      if (!TIPOS_DOCUMENTO_VALIDOS.includes(data.tipoDocumento)) {
        errores.push({ field: "tipoDocumento", message: "El tipo de documento no es valido." });
      } else {
        cambios.tipoDocumento = data.tipoDocumento;
      }
    }

    if (data?.documento !== undefined) {
      const documento = typeof data.documento === "string" ? data.documento.trim() : "";

      if (!esDocumento(documento)) {
        errores.push({ field: "documento", message: "El documento debe tener entre 6 y 12 digitos." });
      } else if (documento !== actual.documento && teachersRepository.findDocenteByDocumento(documento, actual.escuelaId)) {
        errores.push({ field: "documento", message: "Ya existe un docente con ese documento en la escuela." });
      } else {
        cambios.documento = documento;
      }
    }

    if (data?.email !== undefined) {
      if (!esEmail(data.email)) {
        errores.push({ field: "email", message: "El email no tiene un formato valido." });
      } else if (normalizarTexto(data.email) !== normalizarTexto(actual.email) && teachersRepository.findDocenteByEmail(data.email, actual.escuelaId)) {
        errores.push({ field: "email", message: "Ya existe un docente con ese email en la escuela." });
      } else {
        cambios.email = data.email.trim();
      }
    }

    if (data?.telefono !== undefined) {
      if (data.telefono === null || data.telefono === "") {
        cambios.telefono = null;
      } else if (!esTelefono(String(data.telefono))) {
        errores.push({ field: "telefono", message: "El telefono no tiene un formato valido." });
      } else {
        cambios.telefono = String(data.telefono).trim();
      }
    }

    if (data?.titulo !== undefined) {
      if (data.titulo === null || data.titulo === "") {
        cambios.titulo = null;
      } else if (typeof data.titulo !== "string" || data.titulo.trim().length > LIMITES.titulo) {
        errores.push({ field: "titulo", message: `El titulo debe ser texto de hasta ${LIMITES.titulo} caracteres.` });
      } else {
        cambios.titulo = data.titulo.trim();
      }
    }

    if (data?.especialidades !== undefined) {
      const especialidades = normalizarEspecialidades(data.especialidades, errores);
      if (especialidades !== undefined) cambios.especialidades = especialidades;
    }

    if (data?.area !== undefined) {
      const area = normalizarArea(data.area, errores);
      if (area !== undefined) cambios.area = area;
    }

    if (data?.estado !== undefined) {
      if (!ESTADOS_VALIDOS.includes(data.estado)) {
        errores.push({ field: "estado", message: "El estado debe ser activo o inactivo." });
      } else {
        cambios.estado = data.estado;
      }
    }

    if (errores.length > 0) {
      throw errorDeValidacion(errores);
    }

    if (Object.keys(cambios).length === 0) {
      return { statusCode: 200, body: { data: docenteConResumen(actual) } };
    }

    if (cambios.estado === "inactivo") {
      impedirBajaPropia(actual, user);
    }

    verificarCuentaDisponible(actual, { email: cambios.email, documento: cambios.documento });

    cambios.actualizadoPor = actorDel(user);
    if (cambios.estado === "inactivo" && actual.estado !== "inactivo") {
      cambios.fechaBaja = new Date().toISOString();
    }
    const actualizado = teachersRepository.updateDocente(id, cambios);
    sincronizarCuenta(actualizado);
    teachersRepository.registrarAuditoria({
      accion: "docente:update",
      actorId: actorDel(user),
      entidad: "docente",
      entidadId: id,
      antes: publicDocente(actual),
      despues: publicDocente(actualizado)
    });

    return { statusCode: 200, body: { data: docenteConResumen(actualizado) } };
  },

  deactivateDocente(id, user) {
    const actual = teachersRepository.findDocenteById(id);

    if (!actual) {
      throw noEncontrado("El docente");
    }

    impedirBajaPropia(actual, user);

    const actualizado = teachersRepository.deactivateDocente(id);
    sincronizarCuenta(actualizado);
    teachersRepository.registrarAuditoria({
      accion: "docente:deactivate",
      actorId: actorDel(user),
      entidad: "docente",
      entidadId: id,
      antes: publicDocente(actual),
      despues: publicDocente(actualizado)
    });

    return { statusCode: 200, body: { data: docenteConResumen(actualizado) } };
  },

  /* ---------------- Consultas inversas ------------------------------------ */

  listDocentesPorMateria(subjectId, query, user) {
    const materia = academicRepository.findSubjectRefById(subjectId);

    if (!materia) {
      throw noEncontrado("La materia");
    }

    const errores = [];
    validarPagina(query, errores);

    if (errores.length > 0) {
      throw errorDeValidacion(errores);
    }

    const asignaciones = teachersRepository.listAsignacionesMateria({
      materiaId: subjectId,
      escuelaId: escuelaDel(user, query),
      estado: "activo"
    });

    return {
      statusCode: 200,
      body: paginar(this.agruparDocentes(asignaciones, publicAsignacionMateria), query, { materiaId: subjectId })
    };
  },

  listDocentesPorCurso(cursoId, query, user) {
    const curso = academicRepository.findCursoById(cursoId);

    if (!curso) {
      throw noEncontrado("El curso");
    }

    const errores = [];
    validarPagina(query, errores);

    if (errores.length > 0) {
      throw errorDeValidacion(errores);
    }

    const escuelaId = escuelaDel(user, query);
    const asignaciones = [
      ...teachersRepository.listAsignacionesMateria({ cursoId, escuelaId, estado: "activo" }),
      ...teachersRepository.listAsignacionesCurso({ cursoId, escuelaId, estado: "activo" })
    ];

    return {
      statusCode: 200,
      body: paginar(this.agruparDocentes(asignaciones), query, { cursoId })
    };
  },

  listDocentesPorDivision(divisionId, query, user) {
    const division = academicRepository.findDivisionById(divisionId);

    if (!division) {
      throw noEncontrado("La division");
    }

    const errores = [];
    validarPagina(query, errores);

    if (errores.length > 0) {
      throw errorDeValidacion(errores);
    }

    const escuelaId = escuelaDel(user, query);
    const asignaciones = [
      ...teachersRepository.listAsignacionesMateria({ divisionId, escuelaId, estado: "activo" }),
      ...teachersRepository.listAsignacionesCurso({ divisionId, escuelaId, estado: "activo" })
    ];

    return {
      statusCode: 200,
      body: paginar(this.agruparDocentes(asignaciones), query, { divisionId })
    };
  },

  agruparDocentes(asignaciones, mapAsignacion = null) {
    const porDocente = new Map();

    for (const asignacion of asignaciones) {
      const docente = teachersRepository.findDocenteById(asignacion.docenteId);

      if (!docente) {
        continue;
      }

      if (!porDocente.has(docente.id)) {
        porDocente.set(docente.id, { ...publicDocente(docente), asignaciones: [] });
      }

      if (mapAsignacion) {
        porDocente.get(docente.id).asignaciones.push(mapAsignacion(asignacion));
      } else if ("materiaId" in asignacion) {
        porDocente.get(docente.id).asignaciones.push(publicAsignacionMateria(asignacion));
      } else {
        porDocente.get(docente.id).asignaciones.push(publicAsignacionCurso(asignacion));
      }
    }

    return [...porDocente.values()].sort((a, b) => collator.compare(a.apellidoSort, b.apellidoSort) || collator.compare(a.nombreSort, b.nombreSort));
  },

  /* ---------------- Asignaciones de materia ------------------------------- */

  addAsignacionMateria(teacherId, data, user) {
    const docente = teachersRepository.findDocenteById(teacherId);

    if (!docente) {
      throw noEncontrado("El docente");
    }

    if (docente.estado !== "activo") {
      throw conflicto("El docente esta inactivo y no puede recibir nuevas asignaciones.");
    }

    const errores = [];
    const materia = data?.materiaId ? academicRepository.findSubjectRefById(data.materiaId) : null;

    if (!data?.materiaId) {
      errores.push({ field: "materiaId", message: "La materia es obligatoria." });
    } else if (!materia) {
      errores.push({ field: "materiaId", message: "La materia indicada no existe." });
    }

    const { curso, division } = resolverAlcance({ cursoId: data?.cursoId, divisionId: data?.divisionId }, errores);
    const anio = normalizarPeriodo(data, errores, { requerido: true });
    const cuatrimestre = normalizarCuatrimestreDe(data, errores);
    const horasSemanales = normalizarHoras(data?.horasSemanales, errores);
    const observaciones = normalizarObservaciones(data?.observaciones, errores);
    const estado = data?.estado ?? "activo";

    if (!ESTADOS_ASIGNACION_VALIDOS.includes(estado)) {
      errores.push({ field: "estado", message: "El estado de la asignacion debe ser activo o inactivo." });
    }

    if (errores.length > 0) {
      throw errorDeValidacion(errores);
    }

    const duplicada = teachersRepository.findAsignacionMateriaDuplicada({
      docenteId: teacherId,
      materiaId: materia.id,
      cursoId: curso?.id ?? null,
      divisionId: division?.id ?? null,
      anio,
      cuatrimestre
    });

    if (duplicada) {
      throw conflicto("Ya existe una asignacion de esa materia para el docente en ese periodo y alcance.");
    }

    const asignacion = teachersRepository.createAsignacionMateria({
      docenteId: teacherId,
      materiaId: materia.id,
      cursoId: curso?.id ?? null,
      divisionId: division?.id ?? null,
      escuelaId: docente.escuelaId,
      anio,
      cuatrimestre,
      horasSemanales,
      observaciones,
      estado,
      creadoPor: actorDel(user)
    });
    teachersRepository.registrarAuditoria({
      accion: "asignacion-materia:create",
      actorId: actorDel(user),
      entidad: "asignacion-materia",
      entidadId: asignacion.id,
      antes: null,
      despues: publicAsignacionMateria(asignacion)
    });

    return { statusCode: 201, body: { data: publicAsignacionMateria(asignacion) } };
  },

  getAsignacionMateria(teacherId, assignmentId) {
    const asignacion = teachersRepository.findAsignacionMateriaById(assignmentId);

    if (!asignacion || (teacherId && asignacion.docenteId !== teacherId)) {
      throw noEncontrado("La asignacion de materia");
    }

    return { statusCode: 200, body: { data: publicAsignacionMateria(asignacion) } };
  },

  listAsignacionesMateria(teacherId, query) {
    const docente = teachersRepository.findDocenteById(teacherId);

    if (!docente) {
      throw noEncontrado("El docente");
    }

    const errores = [];
    const estado = query.estado ?? "todos";

    if (estado !== "todos" && !ESTADOS_ASIGNACION_VALIDOS.includes(estado)) {
      errores.push({ field: "estado", message: "El estado debe ser activo, inactivo o todos." });
    }

    if (query.anio !== undefined && query.anio !== null && query.anio !== "" && !esAnioLectivo(query.anio)) {
      errores.push({ field: "anio", message: "El anio lectivo debe ser un entero entre 1990 y 2100." });
    }

    if (query.cuatrimestre !== undefined && query.cuatrimestre !== "" && normalizarCuatrimestre(query.cuatrimestre) === undefined) {
      errores.push({ field: "cuatrimestre", message: "El cuatrimestre debe ser 1 o 2." });
    }

    const orden = query.orden ?? "materia";

    if (!ORDENES_ASIGNACIONES[orden]) {
      errores.push({ field: "orden", message: "Orden invalido." });
    }

    validarPagina(query, errores);

    if (errores.length > 0) {
      throw errorDeValidacion(errores);
    }

    const anio = query.anio === undefined || query.anio === null || query.anio === "" ? undefined : Number(query.anio);
    const cuatrimestre = query.cuatrimestre === undefined || query.cuatrimestre === "" ? undefined : normalizarCuatrimestre(query.cuatrimestre);

    const lista = ordenar(
      teachersRepository
        .listAsignacionesMateria({ docenteId: teacherId, anio, cuatrimestre, estado })
        .map(publicAsignacionMateria),
      ORDENES_ASIGNACIONES[orden]
    );

    return {
      statusCode: 200,
      body: paginar(lista, query, { anio: query.anio ?? null, cuatrimestre: query.cuatrimestre ?? null, estado, orden })
    };
  },

  updateAsignacionMateria(assignmentId, data, user) {
    const actual = teachersRepository.findAsignacionMateriaById(assignmentId);

    if (!actual) {
      throw noEncontrado("La asignacion de materia");
    }

    const errores = [];
    const cambios = {};

    if (data?.docenteId !== undefined && data.docenteId !== actual.docenteId) {
      errores.push({ field: "docenteId", message: "No se puede cambiar el docente de una asignacion." });
    }

    if (data?.materiaId !== undefined) {
      const materia = academicRepository.findSubjectRefById(data.materiaId);

      if (!materia) {
        errores.push({ field: "materiaId", message: "La materia indicada no existe." });
      } else {
        cambios.materiaId = materia.id;
      }
    }

    if (data?.cursoId !== undefined || data?.divisionId !== undefined) {
      const { curso, division } = resolverAlcance(
        {
          cursoId: data.cursoId !== undefined ? data.cursoId : actual.cursoId,
          divisionId: data.divisionId !== undefined ? data.divisionId : actual.divisionId
        },
        errores
      );

      cambios.cursoId = curso?.id ?? null;
      cambios.divisionId = division?.id ?? null;
    }

    const anio = normalizarPeriodo(data, errores);
    const cuatrimestre = normalizarCuatrimestreDe(data, errores);
    const horasSemanales = normalizarHoras(data?.horasSemanales, errores);
    const observaciones = normalizarObservaciones(data?.observaciones, errores);

    if (anio !== undefined) cambios.anio = anio;
    if (cuatrimestre !== undefined) cambios.cuatrimestre = cuatrimestre;
    if (horasSemanales !== undefined) cambios.horasSemanales = horasSemanales;
    if (observaciones !== undefined) cambios.observaciones = observaciones;

    if (data?.estado !== undefined) {
      if (!ESTADOS_ASIGNACION_VALIDOS.includes(data.estado)) {
        errores.push({ field: "estado", message: "El estado de la asignacion debe ser activo o inactivo." });
      } else {
        cambios.estado = data.estado;
      }
    }

    if (errores.length > 0) {
      throw errorDeValidacion(errores);
    }

    const duplicada = teachersRepository.findAsignacionMateriaDuplicada({
      docenteId: actual.docenteId,
      materiaId: cambios.materiaId ?? actual.materiaId,
      cursoId: cambios.cursoId !== undefined ? cambios.cursoId : actual.cursoId,
      divisionId: cambios.divisionId !== undefined ? cambios.divisionId : actual.divisionId,
      anio: cambios.anio ?? actual.anio,
      cuatrimestre: cambios.cuatrimestre !== undefined ? cambios.cuatrimestre : actual.cuatrimestre,
      excludeId: assignmentId
    });

    if (duplicada) {
      throw conflicto("Ya existe una asignacion de esa materia para el docente en ese periodo y alcance.");
    }

    if (Object.keys(cambios).length === 0) {
      return { statusCode: 200, body: { data: publicAsignacionMateria(actual) } };
    }

    cambios.actualizadoPor = actorDel(user);
    const actualizado = teachersRepository.updateAsignacionMateria(assignmentId, cambios, snapshotAsignacionMateria(actual));
    teachersRepository.registrarAuditoria({
      accion: "asignacion-materia:update",
      actorId: actorDel(user),
      entidad: "asignacion-materia",
      entidadId: assignmentId,
      antes: publicAsignacionMateria(actual),
      despues: publicAsignacionMateria(actualizado)
    });

    return { statusCode: 200, body: { data: publicAsignacionMateria(actualizado) } };
  },

  deactivateAsignacionMateria(assignmentId, user) {
    const actual = teachersRepository.findAsignacionMateriaById(assignmentId);

    if (!actual) {
      throw noEncontrado("La asignacion de materia");
    }

    const actualizado = teachersRepository.deactivateAsignacionMateria(assignmentId);
    teachersRepository.registrarAuditoria({
      accion: "asignacion-materia:deactivate",
      actorId: actorDel(user),
      entidad: "asignacion-materia",
      entidadId: assignmentId,
      antes: publicAsignacionMateria(actual),
      despues: publicAsignacionMateria(actualizado)
    });

    return { statusCode: 200, body: { data: publicAsignacionMateria(actualizado) } };
  },

  /* ---------------- Asignaciones de curso/division ------------------------ */

  addAsignacionCurso(teacherId, data, user) {
    const docente = teachersRepository.findDocenteById(teacherId);

    if (!docente) {
      throw noEncontrado("El docente");
    }

    if (docente.estado !== "activo") {
      throw conflicto("El docente esta inactivo y no puede recibir nuevas asignaciones.");
    }

    const errores = [];

    if (!data?.cursoId && !data?.divisionId) {
      errores.push({ field: "cursoId", message: "La asignacion requiere un curso o una division." });
    }

    const { curso, division } = resolverAlcance({ cursoId: data?.cursoId, divisionId: data?.divisionId }, errores);
    const anio = normalizarPeriodo(data, errores, { requerido: true });
    const cuatrimestre = normalizarCuatrimestreDe(data, errores);
    const observaciones = normalizarObservaciones(data?.observaciones, errores);
    const rol = data?.rol ?? ROL_ASIGNACION_POR_DEFECTO;

    if (!ROLES_ASIGNACION_VALIDOS.includes(rol)) {
      errores.push({ field: "rol", message: "El rol de asignacion no es valido." });
    }

    const estado = data?.estado ?? "activo";

    if (!ESTADOS_ASIGNACION_VALIDOS.includes(estado)) {
      errores.push({ field: "estado", message: "El estado de la asignacion debe ser activo o inactivo." });
    }

    if (errores.length > 0) {
      throw errorDeValidacion(errores);
    }

    const duplicada = teachersRepository.findAsignacionCursoDuplicada({
      docenteId: teacherId,
      cursoId: curso?.id ?? null,
      divisionId: division?.id ?? null,
      rol,
      anio,
      cuatrimestre
    });

    if (duplicada) {
      throw conflicto("Ya existe una asignacion de ese curso/division para el docente en ese periodo.");
    }

    const asignacion = teachersRepository.createAsignacionCurso({
      docenteId: teacherId,
      cursoId: curso?.id ?? null,
      divisionId: division?.id ?? null,
      rol,
      escuelaId: docente.escuelaId,
      anio,
      cuatrimestre,
      observaciones,
      estado,
      creadoPor: actorDel(user)
    });
    teachersRepository.registrarAuditoria({
      accion: "asignacion-curso:create",
      actorId: actorDel(user),
      entidad: "asignacion-curso",
      entidadId: asignacion.id,
      antes: null,
      despues: publicAsignacionCurso(asignacion)
    });

    return { statusCode: 201, body: { data: publicAsignacionCurso(asignacion) } };
  },

  getAsignacionCurso(teacherId, assignmentId) {
    const asignacion = teachersRepository.findAsignacionCursoById(assignmentId);

    if (!asignacion || (teacherId && asignacion.docenteId !== teacherId)) {
      throw noEncontrado("La asignacion de curso");
    }

    return { statusCode: 200, body: { data: publicAsignacionCurso(asignacion) } };
  },

  listAsignacionesCurso(teacherId, query) {
    const docente = teachersRepository.findDocenteById(teacherId);

    if (!docente) {
      throw noEncontrado("El docente");
    }

    const errores = [];
    const estado = query.estado ?? "todos";

    if (estado !== "todos" && !ESTADOS_ASIGNACION_VALIDOS.includes(estado)) {
      errores.push({ field: "estado", message: "El estado debe ser activo, inactivo o todos." });
    }

    if (query.anio !== undefined && query.anio !== null && query.anio !== "" && !esAnioLectivo(query.anio)) {
      errores.push({ field: "anio", message: "El anio lectivo debe ser un entero entre 1990 y 2100." });
    }

    if (query.cuatrimestre !== undefined && query.cuatrimestre !== "" && normalizarCuatrimestre(query.cuatrimestre) === undefined) {
      errores.push({ field: "cuatrimestre", message: "El cuatrimestre debe ser 1 o 2." });
    }

    const orden = query.orden ?? "periodo";

    if (!ORDENES_ASIGNACIONES[orden]) {
      errores.push({ field: "orden", message: "Orden invalido." });
    }

    validarPagina(query, errores);

    if (errores.length > 0) {
      throw errorDeValidacion(errores);
    }

    const anio = query.anio === undefined || query.anio === null || query.anio === "" ? undefined : Number(query.anio);
    const cuatrimestre = query.cuatrimestre === undefined || query.cuatrimestre === "" ? undefined : normalizarCuatrimestre(query.cuatrimestre);

    const lista = ordenar(
      teachersRepository
        .listAsignacionesCurso({ docenteId: teacherId, anio, cuatrimestre, estado })
        .map(publicAsignacionCurso),
      ORDENES_ASIGNACIONES[orden]
    );

    return {
      statusCode: 200,
      body: paginar(lista, query, { anio: query.anio ?? null, cuatrimestre: query.cuatrimestre ?? null, estado, orden })
    };
  },

  updateAsignacionCurso(assignmentId, data, user) {
    const actual = teachersRepository.findAsignacionCursoById(assignmentId);

    if (!actual) {
      throw noEncontrado("La asignacion de curso");
    }

    const errores = [];
    const cambios = {};

    if (data?.docenteId !== undefined && data.docenteId !== actual.docenteId) {
      errores.push({ field: "docenteId", message: "No se puede cambiar el docente de una asignacion." });
    }

    if (data?.cursoId !== undefined || data?.divisionId !== undefined) {
      const { curso, division } = resolverAlcance(
        {
          cursoId: data.cursoId !== undefined ? data.cursoId : actual.cursoId,
          divisionId: data.divisionId !== undefined ? data.divisionId : actual.divisionId
        },
        errores
      );

      if (!curso && !division) {
        errores.push({ field: "cursoId", message: "La asignacion requiere un curso o una division." });
      }

      cambios.cursoId = curso?.id ?? null;
      cambios.divisionId = division?.id ?? null;
    }

    const anio = normalizarPeriodo(data, errores);
    const cuatrimestre = normalizarCuatrimestreDe(data, errores);
    const observaciones = normalizarObservaciones(data?.observaciones, errores);

    if (anio !== undefined) cambios.anio = anio;
    if (cuatrimestre !== undefined) cambios.cuatrimestre = cuatrimestre;
    if (observaciones !== undefined) cambios.observaciones = observaciones;

    if (data?.rol !== undefined) {
      if (!ROLES_ASIGNACION_VALIDOS.includes(data.rol)) {
        errores.push({ field: "rol", message: "El rol de asignacion no es valido." });
      } else {
        cambios.rol = data.rol;
      }
    }

    if (data?.estado !== undefined) {
      if (!ESTADOS_ASIGNACION_VALIDOS.includes(data.estado)) {
        errores.push({ field: "estado", message: "El estado de la asignacion debe ser activo o inactivo." });
      } else {
        cambios.estado = data.estado;
      }
    }

    if (errores.length > 0) {
      throw errorDeValidacion(errores);
    }

    const duplicada = teachersRepository.findAsignacionCursoDuplicada({
      docenteId: actual.docenteId,
      cursoId: cambios.cursoId !== undefined ? cambios.cursoId : actual.cursoId,
      divisionId: cambios.divisionId !== undefined ? cambios.divisionId : actual.divisionId,
      rol: cambios.rol ?? actual.rol,
      anio: cambios.anio ?? actual.anio,
      cuatrimestre: cambios.cuatrimestre !== undefined ? cambios.cuatrimestre : actual.cuatrimestre,
      excludeId: assignmentId
    });

    if (duplicada) {
      throw conflicto("Ya existe una asignacion de ese curso/division para el docente en ese periodo.");
    }

    if (Object.keys(cambios).length === 0) {
      return { statusCode: 200, body: { data: publicAsignacionCurso(actual) } };
    }

    cambios.actualizadoPor = actorDel(user);
    const actualizado = teachersRepository.updateAsignacionCurso(assignmentId, cambios, snapshotAsignacionCurso(actual));
    teachersRepository.registrarAuditoria({
      accion: "asignacion-curso:update",
      actorId: actorDel(user),
      entidad: "asignacion-curso",
      entidadId: assignmentId,
      antes: publicAsignacionCurso(actual),
      despues: publicAsignacionCurso(actualizado)
    });

    return { statusCode: 200, body: { data: publicAsignacionCurso(actualizado) } };
  },

  deactivateAsignacionCurso(assignmentId, user) {
    const actual = teachersRepository.findAsignacionCursoById(assignmentId);

    if (!actual) {
      throw noEncontrado("La asignacion de curso");
    }

    const actualizado = teachersRepository.deactivateAsignacionCurso(assignmentId);
    teachersRepository.registrarAuditoria({
      accion: "asignacion-curso:deactivate",
      actorId: actorDel(user),
      entidad: "asignacion-curso",
      entidadId: assignmentId,
      antes: publicAsignacionCurso(actual),
      despues: publicAsignacionCurso(actualizado)
    });

    return { statusCode: 200, body: { data: publicAsignacionCurso(actualizado) } };
  }
};

export default teachersService;
