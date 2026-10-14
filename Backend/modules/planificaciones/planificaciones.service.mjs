import { conflicto, errorDeValidacion, noEncontrado, sinPermisos } from "../../utils/api-error.mjs";
import { PERMISSIONS } from "../../config/permissions.config.mjs";
import { userRepository } from "../../database/repositories/user.repository.mjs";
import { permisosDelUsuario, rolesDelUsuario } from "../auth/permission.service.mjs";
import academicRepository from "../academic/academic.repository.mjs";
import { NOMBRE_ANIO } from "../academic/catalogo.mjs";
import teachersRepository from "../teachers/teachers.repository.mjs";
import {
  ANIO_MAXIMO,
  ANIO_MINIMO,
  ANIOS_CURSO,
  ESTADO_INICIAL,
  ESTADOS,
  ESTADOS_BANDEJA_REVISION,
  ESTADOS_CON_MOTIVO,
  ESTADOS_EDITABLES,
  ESTADOS_SIN_UNICIDAD,
  ESTADOS_VALIDOS,
  LIMITES,
  ORDEN_POR_DEFECTO,
  ORDENES,
  PERIODOS,
  PRESENTACION,
  PRIORIDAD_REVISION,
  SECCIONES,
  SECCIONES_VALIDAS,
  TRANSICIONES_REVISION,
  TURNOS,
  TURNOS_VALIDOS,
  descripcionTurno,
  esAnioLectivo,
  etiquetaPeriodo,
  normalizarCuatrimestre,
  normalizarTexto
} from "./catalogo.mjs";
import planificacionesRepository from "./planificaciones.repository.mjs";

const POR_PAGINA_MAXIMO = 100;
const POR_PAGINA_DEFECTO = 20;

const collator = new Intl.Collator("es", { sensitivity: "base", numeric: true });

function actorDel(user) {
  return user?.id ?? null;
}

function escuelaDel(user, data) {
  return data?.escuelaId ?? user?.assignments?.find((a) => a.schoolId)?.schoolId ?? null;
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

function validarFechaFiltro(query, campo, errores) {
  const valor = query[campo];

  if (valor === undefined || valor === "") {
    return null;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(valor))) {
    errores.push({ field: campo, message: `${campo} debe tener formato AAAA-MM-DD.` });
    return null;
  }

  const fecha = new Date(`${valor}T00:00:00.000Z`);

  if (Number.isNaN(fecha.getTime()) || fecha.toISOString().slice(0, 10) !== valor) {
    errores.push({ field: campo, message: `${campo} debe ser una fecha valida.` });
    return null;
  }

  return String(valor);
}

/* ---------------- Contexto de autorizacion ------------------------------- */

/* Un usuario con rol docente (sin ser ademas admin, director o jefatura) queda
   acotado a sus propias planificaciones, resueltas por su legajo de docente. */
function esDocenteRestringido(user) {
  const roles = rolesDelUsuario(user ?? {});

  if (roles.includes("admin") || roles.includes("director") || roles.includes("jefe_area")) {
    return false;
  }

  return roles.includes("docente");
}

/* Se calcula una vez por pedido: permisos efectivos, si el usuario esta
   acotado a lo propio y cual es su legajo de docente. */
function contextoDe(user) {
  const restringido = esDocenteRestringido(user);
  const docente = restringido ? teachersRepository.findDocenteByUserId(user?.id) : null;

  return {
    user,
    permisos: new Set(permisosDelUsuario(user ?? {})),
    restringido,
    docenteId: docente?.id ?? null
  };
}

function esPropia(registro, ctx) {
  return !ctx.restringido || (Boolean(ctx.docenteId) && registro.docenteId === ctx.docenteId);
}

function exigirPropia(registro, ctx) {
  if (!esPropia(registro, ctx)) {
    throw sinPermisos("No podes operar sobre planificaciones de otros docentes.");
  }
}

/* Acciones que el usuario puede ejecutar hoy sobre la planificacion. El
   frontend las muestra tal cual: no reconstruye las reglas por su cuenta. */
function accionesPara(registro, ctx) {
  const acciones = ["ver"];
  const puedeEscribir = ctx.permisos.has(PERMISSIONS.TEACHING_PLANS_WRITE) && esPropia(registro, ctx);

  if (puedeEscribir && ESTADOS_EDITABLES.includes(registro.estado)) {
    acciones.push("editar", "presentar");
  }

  if (ctx.permisos.has(PERMISSIONS.TEACHING_PLANS_MANAGE) && (TRANSICIONES_REVISION[registro.estado] ?? []).length) {
    acciones.push("revisar");
  }

  return acciones;
}

/* ---------------- Vistas publicas ---------------------------------------- */

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

function materiaRef(materia) {
  return materia ? { id: materia.id, nombre: materia.nombre } : null;
}

function cursoRef(curso) {
  if (!curso) {
    return null;
  }

  const orientacion = curso.orientacionId ? academicRepository.findOrientacionById(curso.orientacionId) : null;
  const anioNombre = NOMBRE_ANIO[curso.anio] ?? String(curso.anio);
  const turnoNombre = descripcionTurno(curso.turno);

  return {
    id: curso.id,
    anio: curso.anio,
    anioNombre,
    turno: curso.turno,
    turnoNombre,
    orientacion: orientacion ? { id: orientacion.id, nombre: orientacion.nombre } : null,
    etiqueta: [`${anioNombre} año`, `Turno ${turnoNombre}`, orientacion?.nombre].filter(Boolean).join(" · "),
    estado: curso.estado
  };
}

function divisionRef(division) {
  return division ? { id: division.id, nombre: division.nombre, cursoId: division.cursoId, estado: division.estado } : null;
}

function usuarioRef(id) {
  if (!id) {
    return null;
  }

  const usuario = userRepository.findById(id, { includeInactive: true });

  if (!usuario) {
    return { id, nombre: null };
  }

  const nombre = usuario.displayName ?? ([usuario.nombre, usuario.apellido].filter(Boolean).join(" ") || usuario.email);
  return { id: usuario.id, nombre };
}

function descripcionEstado(estado) {
  return ESTADOS.find((item) => item.valor === estado)?.descripcion ?? estado;
}

function periodoDe(registro) {
  return {
    anioLectivo: registro.anioLectivo,
    cuatrimestre: registro.cuatrimestre ?? null,
    valor: registro.cuatrimestre ? String(registro.cuatrimestre) : "anual",
    etiqueta: etiquetaPeriodo(registro.anioLectivo, registro.cuatrimestre)
  };
}

function seccionesCompletas(contenido) {
  return SECCIONES_VALIDAS.filter((seccion) => typeof contenido?.[seccion] === "string" && contenido[seccion].trim()).length;
}

function cantidadObservaciones(historial = []) {
  return historial.filter((entrada) => entrada.estadoNuevo === "observada").length;
}

/* `detalle` agrega el contenido y el historial; los listados no los necesitan. */
function publicPlanificacion(registro, ctx, { detalle = false } = {}) {
  const docente = teachersRepository.findDocenteById(registro.docenteId);
  const curso = academicRepository.findCursoById(registro.cursoId);
  const vista = {
    id: registro.id,
    escuelaId: registro.escuelaId,
    docenteId: registro.docenteId,
    docente: docenteRef(docente) ?? { id: registro.docenteId },
    materiaId: registro.materiaId,
    materia: materiaRef(academicRepository.findSubjectRefById(registro.materiaId)),
    cursoId: registro.cursoId,
    curso: cursoRef(curso),
    divisionId: registro.divisionId,
    division: divisionRef(academicRepository.findDivisionById(registro.divisionId)),
    turno: curso?.turno ?? null,
    turnoNombre: descripcionTurno(curso?.turno),
    anioLectivo: registro.anioLectivo,
    cuatrimestre: registro.cuatrimestre ?? null,
    periodo: periodoDe(registro),
    asignacionMateriaId: registro.asignacionMateriaId ?? null,
    estado: registro.estado,
    estadoNombre: descripcionEstado(registro.estado),
    seccionesCompletas: seccionesCompletas(registro.contenido),
    seccionesTotales: SECCIONES_VALIDAS.length,
    fechaPresentacion: registro.fechaPresentacion ?? null,
    fechaRevision: registro.fechaRevision ?? null,
    revisor: usuarioRef(registro.revisadoPor),
    motivoRevision: registro.motivoRevision ?? null,
    cantidadObservaciones: cantidadObservaciones(registro.historialEstados),
    creadoEn: registro.creadoEn,
    actualizadoEn: registro.actualizadoEn,
    creadoPor: usuarioRef(registro.creadoPor),
    actualizadoPor: usuarioRef(registro.actualizadoPor),
    acciones: accionesPara(registro, ctx),
    transiciones: ctx.permisos.has(PERMISSIONS.TEACHING_PLANS_MANAGE) ? [...(TRANSICIONES_REVISION[registro.estado] ?? [])] : []
  };

  if (!detalle) {
    return vista;
  }

  return {
    ...vista,
    contenido: Object.fromEntries(SECCIONES_VALIDAS.map((seccion) => [seccion, registro.contenido?.[seccion] ?? null])),
    historialEstados: (registro.historialEstados ?? []).map((entrada) => ({
      estadoAnterior: entrada.estadoAnterior ?? null,
      estadoNuevo: entrada.estadoNuevo,
      fecha: entrada.fecha,
      usuario: usuarioRef(entrada.usuarioId),
      motivo: entrada.motivo ?? null
    }))
  };
}

/* ---------------- Orden -------------------------------------------------- */

const CLAVES_ORDEN = {
  id: (plan) => plan.id,
  docenteSort: (plan) => normalizarTexto(plan.docente?.nombreCompleto),
  materiaSort: (plan) => normalizarTexto(plan.materia?.nombre),
  cursoSort: (plan) => `${plan.curso?.anio ?? 0} ${plan.curso?.turno ?? ""} ${normalizarTexto(plan.division?.nombre)}`,
  estado: (plan) => plan.estado,
  periodoSort: (plan) => `${plan.anioLectivo}${plan.cuatrimestre ?? 0}`,
  creadoEn: (plan) => plan.creadoEn,
  actualizadoEn: (plan) => plan.actualizadoEn
};

function prioridadDeRevision(plan) {
  const posicion = PRIORIDAD_REVISION.indexOf(plan.estado);
  return posicion === -1 ? PRIORIDAD_REVISION.length : posicion;
}

function ordenar(lista, config) {
  if (!config) {
    return lista;
  }

  if (config.campo === "prioridadRevision") {
    return [...lista].sort(
      (a, b) => prioridadDeRevision(a) - prioridadDeRevision(b) || String(b.actualizadoEn).localeCompare(String(a.actualizadoEn))
    );
  }

  const clave = CLAVES_ORDEN[config.campo];

  return [...lista].sort((a, b) => collator.compare(String(clave(a) ?? ""), String(clave(b) ?? "")) * config.sentido);
}

/* ---------------- Validaciones ------------------------------------------- */

function validarAnioLectivo(data, errores, { requerido } = {}) {
  const valor = data?.anioLectivo;

  if (valor === undefined || valor === null || valor === "") {
    if (requerido) {
      errores.push({ field: "anioLectivo", message: "El ciclo lectivo es obligatorio." });
    }

    return undefined;
  }

  if (!esAnioLectivo(valor)) {
    errores.push({ field: "anioLectivo", message: `El ciclo lectivo debe ser un entero entre ${ANIO_MINIMO} y ${ANIO_MAXIMO}.` });
    return undefined;
  }

  return Number(valor);
}

/* `periodo` acepta "anual", "1" o "2"; tambien se admite `cuatrimestre`. */
function validarPeriodo(data, errores) {
  const crudo = data?.periodo !== undefined ? data.periodo : data?.cuatrimestre;

  if (crudo === undefined) {
    return undefined;
  }

  const cuatrimestre = normalizarCuatrimestre(crudo);

  if (cuatrimestre === undefined) {
    errores.push({ field: "periodo", message: "El periodo debe ser anual, 1 o 2." });
    return undefined;
  }

  return cuatrimestre;
}

function validarContenido(contenido, errores) {
  if (contenido === undefined) {
    return undefined;
  }

  if (contenido === null || typeof contenido !== "object" || Array.isArray(contenido)) {
    errores.push({ field: "contenido", message: "El contenido debe ser un objeto con las secciones de la planificacion." });
    return undefined;
  }

  const limpio = {};

  for (const [seccion, texto] of Object.entries(contenido)) {
    if (!SECCIONES_VALIDAS.includes(seccion)) {
      errores.push({ field: `contenido.${seccion}`, message: "La seccion indicada no existe." });
      continue;
    }

    if (texto === null || texto === "") {
      limpio[seccion] = null;
      continue;
    }

    if (typeof texto !== "string") {
      errores.push({ field: `contenido.${seccion}`, message: "La seccion debe ser texto." });
      continue;
    }

    if (texto.trim().length > LIMITES.seccion) {
      errores.push({ field: `contenido.${seccion}`, message: `La seccion no puede superar los ${LIMITES.seccion} caracteres.` });
      continue;
    }

    limpio[seccion] = texto.trim() || null;
  }

  return limpio;
}

/* Docente, materia, curso y division: existen y son coherentes entre si. */
function resolverReferencias({ docenteId, materiaId, cursoId, divisionId }, errores) {
  const docente = docenteId ? teachersRepository.findDocenteById(docenteId) : null;
  const materia = materiaId ? academicRepository.findSubjectRefById(materiaId) : null;
  const curso = cursoId ? academicRepository.findCursoById(cursoId) : null;
  const division = divisionId ? academicRepository.findDivisionById(divisionId) : null;

  if (!docenteId) {
    errores.push({ field: "docenteId", message: "El docente es obligatorio." });
  } else if (!docente) {
    errores.push({ field: "docenteId", message: "El docente indicado no existe." });
  }

  if (!materiaId) {
    errores.push({ field: "materiaId", message: "La materia es obligatoria." });
  } else if (!materia) {
    errores.push({ field: "materiaId", message: "La materia indicada no existe." });
  }

  if (!cursoId) {
    errores.push({ field: "cursoId", message: "El curso es obligatorio." });
  } else if (!curso) {
    errores.push({ field: "cursoId", message: "El curso indicado no existe." });
  }

  if (!divisionId) {
    errores.push({ field: "divisionId", message: "La division es obligatoria." });
  } else if (!division) {
    errores.push({ field: "divisionId", message: "La division indicada no existe." });
  } else if (curso && division.cursoId !== curso.id) {
    errores.push({ field: "divisionId", message: "La division indicada no pertenece al curso indicado." });
  }

  return { docente, materia, curso, division };
}

/* Asignacion de materia activa que cubre la combinacion. Una asignacion sin
   division cubre todas las divisiones del curso; una anual cubre cualquier
   cuatrimestre. */
function asignacionQueCubre({ docenteId, materiaId, cursoId, divisionId, anioLectivo, cuatrimestre }) {
  const asignaciones = teachersRepository.listAsignacionesMateria({ docenteId, materiaId, anio: anioLectivo, estado: "activo" });

  return (
    asignaciones.find((asignacion) => {
      if (asignacion.divisionId && asignacion.divisionId !== divisionId) {
        return false;
      }

      if (asignacion.cursoId && asignacion.cursoId !== cursoId) {
        return false;
      }

      if (!asignacion.cursoId && !asignacion.divisionId) {
        return false;
      }

      if (asignacion.cuatrimestre && asignacion.cuatrimestre !== (cuatrimestre ?? null)) {
        return false;
      }

      return true;
    }) ?? null
  );
}

/* Valida la combinacion completa contra la estructura academica y las
   asignaciones del modulo docentes. Devuelve la asignacion que la cubre. */
function validarCombinacion(combinacion, ctx, { excludeId } = {}) {
  const errores = [];
  const { docente } = resolverReferencias(combinacion, errores);

  if (errores.length > 0) {
    throw errorDeValidacion(errores);
  }

  if (ctx.restringido && combinacion.docenteId !== ctx.docenteId) {
    throw sinPermisos("Solo podes cargar planificaciones propias.");
  }

  if (docente.estado !== "activo") {
    throw conflicto("El docente esta inactivo y no puede recibir planificaciones.");
  }

  const asignacion = asignacionQueCubre(combinacion);

  if (!asignacion) {
    throw errorDeValidacion([
      {
        field: "materiaId",
        message: "El docente no tiene asignada esa materia en el curso, la division y el periodo indicados."
      }
    ]);
  }

  const duplicada = planificacionesRepository.findPlanificacionDuplicada({
    ...combinacion,
    estadosExcluidos: ESTADOS_SIN_UNICIDAD,
    excludeId
  });

  if (duplicada) {
    throw conflicto("Ya existe una planificacion para ese docente, materia, division y periodo.");
  }

  return asignacion;
}

/* Filtros comunes a las consultas por docente, materia y curso. */
function filtrosDeConsulta(query, errores) {
  const filtros = {};

  if (query.anioLectivo !== undefined && query.anioLectivo !== "") {
    if (esAnioLectivo(query.anioLectivo)) {
      filtros.anioLectivo = Number(query.anioLectivo);
    } else {
      errores.push({ field: "anioLectivo", message: `El ciclo lectivo debe ser un entero entre ${ANIO_MINIMO} y ${ANIO_MAXIMO}.` });
    }
  }

  if (query.periodo !== undefined && query.periodo !== "") {
    const cuatrimestre = normalizarCuatrimestre(query.periodo);

    if (cuatrimestre === undefined) {
      errores.push({ field: "periodo", message: "El periodo debe ser anual, 1 o 2." });
    } else {
      filtros.cuatrimestre = cuatrimestre;
    }
  }

  if (query.estado !== undefined && query.estado !== "") {
    if (ESTADOS_VALIDOS.includes(query.estado)) {
      filtros.estado = query.estado;
    } else {
      errores.push({ field: "estado", message: `El estado debe ser uno de: ${ESTADOS_VALIDOS.join(", ")}.` });
    }
  }

  return filtros;
}

function resumenDe(planificaciones) {
  const porEstado = Object.fromEntries(ESTADOS_VALIDOS.map((estado) => [estado, 0]));

  for (const plan of planificaciones) {
    porEstado[plan.estado] = (porEstado[plan.estado] ?? 0) + 1;
  }

  const ultimaActualizacion = planificaciones.reduce(
    (ultima, plan) => (!ultima || plan.actualizadoEn > ultima ? plan.actualizadoEn : ultima),
    null
  );

  return { total: planificaciones.length, porEstado, ultimaActualizacion };
}

/* Planificaciones visibles para el usuario con los filtros del repositorio. */
function visibles(ctx, filtros) {
  if (ctx.restringido && !ctx.docenteId) {
    return [];
  }

  return planificacionesRepository
    .listPlanificaciones({ ...filtros, ...(ctx.restringido ? { docenteId: ctx.docenteId } : null) })
    .map((registro) => publicPlanificacion(registro, ctx));
}

function auditar(accion, user, id, antes, despues) {
  planificacionesRepository.registrarAuditoria({
    accion,
    actorId: actorDel(user),
    entidad: "planificacion",
    entidadId: id,
    antes,
    despues
  });
}

/* ---------------- Servicio ----------------------------------------------- */

const planificacionesService = {
  getCatalogos() {
    return {
      statusCode: 200,
      body: {
        data: {
          estados: ESTADOS,
          estadosEditables: ESTADOS_EDITABLES,
          estadosConMotivo: ESTADOS_CON_MOTIVO,
          estadosBandejaRevision: ESTADOS_BANDEJA_REVISION,
          prioridadRevision: PRIORIDAD_REVISION,
          presentacion: PRESENTACION,
          transicionesRevision: TRANSICIONES_REVISION,
          secciones: SECCIONES,
          turnos: TURNOS,
          periodos: PERIODOS,
          aniosCurso: ANIOS_CURSO.map((anio) => ({ valor: anio, descripcion: `${NOMBRE_ANIO[anio]} año` })),
          ordenes: Object.keys(ORDENES)
        }
      }
    };
  },

  /* Combinaciones planificables segun las asignaciones de materia del modulo
     docentes: ciclo lectivo -> curso -> division -> materia -> docente. Un
     docente acotado solo ve las suyas. Con `incluirInactivas=true` se suman las
     asignaciones dadas de baja, util para filtrar planificaciones historicas. */
  getOpciones(query, user) {
    const ctx = contextoDe(user);
    const errores = [];
    const filtros = filtrosDeConsulta({ anioLectivo: query.anioLectivo }, errores);

    if (errores.length > 0) {
      throw errorDeValidacion(errores);
    }

    if (ctx.restringido && !ctx.docenteId) {
      return { statusCode: 200, body: { data: { aniosLectivos: [], combinaciones: [] } } };
    }

    const incluirInactivas = query.incluirInactivas === "true";
    const asignaciones = teachersRepository.listAsignacionesMateria({
      escuelaId: escuelaDel(user, query) ?? undefined,
      docenteId: ctx.restringido ? ctx.docenteId : undefined,
      anio: filtros.anioLectivo,
      estado: incluirInactivas ? "todos" : "activo"
    });

    const combinaciones = [];
    const vistas = new Set();

    for (const asignacion of asignaciones) {
      const docente = teachersRepository.findDocenteById(asignacion.docenteId);
      const materia = academicRepository.findSubjectRefById(asignacion.materiaId);

      if (!docente || !materia || (!incluirInactivas && docente.estado !== "activo")) {
        continue;
      }

      const divisionAsignada = asignacion.divisionId ? academicRepository.findDivisionById(asignacion.divisionId) : null;
      const curso = academicRepository.findCursoById(asignacion.cursoId ?? divisionAsignada?.cursoId);

      if (!curso) {
        continue;
      }

      const divisiones = divisionAsignada
        ? [divisionAsignada]
        : academicRepository.listDivisiones({ cursoId: curso.id, estado: incluirInactivas ? undefined : "activo" });

      for (const division of divisiones) {
        const clave = `${asignacion.id}:${division.id}`;

        if (vistas.has(clave)) {
          continue;
        }

        vistas.add(clave);
        combinaciones.push({
          asignacionId: asignacion.id,
          anioLectivo: asignacion.anio,
          cuatrimestre: asignacion.cuatrimestre ?? null,
          activa: asignacion.estado === "activo",
          docente: docenteRef(docente),
          materia: materiaRef(materia),
          curso: cursoRef(curso),
          division: divisionRef(division)
        });
      }
    }

    combinaciones.sort(
      (a, b) =>
        b.anioLectivo - a.anioLectivo ||
        a.curso.anio - b.curso.anio ||
        collator.compare(a.curso.turno, b.curso.turno) ||
        collator.compare(a.division.nombre, b.division.nombre) ||
        collator.compare(a.materia.nombre, b.materia.nombre) ||
        collator.compare(a.docente.nombreCompleto, b.docente.nombreCompleto)
    );

    const aniosLectivos = [...new Set(combinaciones.map((item) => item.anioLectivo))].sort((a, b) => b - a);

    return { statusCode: 200, body: { data: { aniosLectivos, combinaciones } } };
  },

  listPlanificaciones(query, user) {
    const ctx = contextoDe(user);
    const errores = [];
    const filtros = filtrosDeConsulta(query, errores);

    if (query.turno !== undefined && query.turno !== "" && !TURNOS_VALIDOS.includes(query.turno)) {
      errores.push({ field: "turno", message: `El turno debe ser uno de: ${TURNOS_VALIDOS.join(", ")}.` });
    }

    if (query.anio !== undefined && query.anio !== "" && !ANIOS_CURSO.includes(Number(query.anio))) {
      errores.push({ field: "anio", message: "El anio del curso debe ser un entero entre 1 y 7." });
    }

    if (typeof query.q === "string" && query.q.length > LIMITES.busqueda) {
      errores.push({ field: "q", message: `La busqueda no puede superar los ${LIMITES.busqueda} caracteres.` });
    }

    const fechaPresentacionDesde = validarFechaFiltro(query, "fechaPresentacionDesde", errores);
    const fechaPresentacionHasta = validarFechaFiltro(query, "fechaPresentacionHasta", errores);
    const fechaRevisionDesde = validarFechaFiltro(query, "fechaRevisionDesde", errores);
    const fechaRevisionHasta = validarFechaFiltro(query, "fechaRevisionHasta", errores);

    if (fechaPresentacionDesde && fechaPresentacionHasta && fechaPresentacionDesde > fechaPresentacionHasta) {
      errores.push({ field: "fechaPresentacionHasta", message: "La fecha de presentacion hasta no puede ser anterior a la fecha desde." });
    }

    if (fechaRevisionDesde && fechaRevisionHasta && fechaRevisionDesde > fechaRevisionHasta) {
      errores.push({ field: "fechaRevisionHasta", message: "La fecha de revision hasta no puede ser anterior a la fecha desde." });
    }

    /* `estados` acepta varios separados por coma (la bandeja de revision los usa
       para excluir borradores); se combina con `estado`. */
    const estados = typeof query.estados === "string" && query.estados.trim() ? query.estados.split(",").map((estado) => estado.trim()) : null;

    if (estados && estados.some((estado) => !ESTADOS_VALIDOS.includes(estado))) {
      errores.push({ field: "estados", message: `Los estados deben ser de: ${ESTADOS_VALIDOS.join(", ")}.` });
    }

    const orden = query.orden || ORDEN_POR_DEFECTO;

    if (!ORDENES[orden]) {
      errores.push({ field: "orden", message: "Orden invalido." });
    }

    validarPagina(query, errores);

    if (errores.length > 0) {
      throw errorDeValidacion(errores);
    }

    let lista = visibles(ctx, {
      escuelaId: escuelaDel(user, query) ?? undefined,
      docenteId: query.docenteId || undefined,
      materiaId: query.materiaId || undefined,
      cursoId: query.cursoId || undefined,
      divisionId: query.divisionId || undefined,
      ...filtros
    });

    if (query.turno) {
      lista = lista.filter((plan) => plan.turno === query.turno);
    }

    if (query.anio) {
      lista = lista.filter((plan) => plan.curso?.anio === Number(query.anio));
    }

    if (estados) {
      lista = lista.filter((plan) => estados.includes(plan.estado));
    }

    if (fechaPresentacionDesde) {
      lista = lista.filter((plan) => plan.fechaPresentacion && plan.fechaPresentacion.slice(0, 10) >= fechaPresentacionDesde);
    }

    if (fechaPresentacionHasta) {
      lista = lista.filter((plan) => plan.fechaPresentacion && plan.fechaPresentacion.slice(0, 10) <= fechaPresentacionHasta);
    }

    if (fechaRevisionDesde) {
      lista = lista.filter((plan) => plan.fechaRevision && plan.fechaRevision.slice(0, 10) >= fechaRevisionDesde);
    }

    if (fechaRevisionHasta) {
      lista = lista.filter((plan) => plan.fechaRevision && plan.fechaRevision.slice(0, 10) <= fechaRevisionHasta);
    }

    const buscado = normalizarTexto(query.q);

    if (buscado) {
      lista = lista.filter((plan) =>
        [
          plan.id,
          plan.docente?.nombreCompleto,
          `${plan.docente?.nombre ?? ""} ${plan.docente?.apellido ?? ""}`,
          plan.materia?.nombre,
          plan.curso?.etiqueta,
          plan.division?.nombre,
          `${plan.curso?.anioNombre ?? ""} ${plan.division?.nombre ?? ""}`,
          String(plan.anioLectivo)
        ].some((texto) => normalizarTexto(texto).includes(buscado))
      );
    }

    lista = ordenar(lista, ORDENES[orden]);

    return {
      statusCode: 200,
      body: paginar(lista, query, {
        q: query.q || null,
        docenteId: query.docenteId || null,
        materiaId: query.materiaId || null,
        anio: query.anio || null,
        cursoId: query.cursoId || null,
        divisionId: query.divisionId || null,
        turno: query.turno || null,
        estado: query.estado || null,
        estados: estados ? estados.join(",") : null,
        anioLectivo: query.anioLectivo || null,
        periodo: query.periodo || null,
        fechaPresentacionDesde: query.fechaPresentacionDesde || null,
        fechaPresentacionHasta: query.fechaPresentacionHasta || null,
        fechaRevisionDesde: query.fechaRevisionDesde || null,
        fechaRevisionHasta: query.fechaRevisionHasta || null,
        orden
      })
    };
  },

  getPlanificacion(id, user) {
    const ctx = contextoDe(user);
    const registro = planificacionesRepository.findPlanificacionById(id);

    if (!registro) {
      throw noEncontrado("La planificacion");
    }

    exigirPropia(registro, ctx);

    return { statusCode: 200, body: { data: publicPlanificacion(registro, ctx, { detalle: true }) } };
  },

  createPlanificacion(data, user) {
    const ctx = contextoDe(user);

    if (ctx.restringido && !ctx.docenteId) {
      throw sinPermisos("El usuario no tiene un legajo de docente asociado.");
    }

    const errores = [];
    const anioLectivo = validarAnioLectivo(data, errores, { requerido: true });
    const cuatrimestre = validarPeriodo(data, errores) ?? null;
    const contenido = validarContenido(data?.contenido, errores) ?? {};

    if (errores.length > 0) {
      throw errorDeValidacion(errores);
    }

    /* Un docente acotado carga siempre a su nombre aunque no envie docenteId. */
    const combinacion = {
      docenteId: ctx.restringido ? (data?.docenteId ?? ctx.docenteId) : data?.docenteId,
      materiaId: data?.materiaId,
      cursoId: data?.cursoId,
      divisionId: data?.divisionId,
      anioLectivo,
      cuatrimestre
    };

    const asignacion = validarCombinacion(combinacion, ctx);
    const ahora = new Date().toISOString();

    const registro = planificacionesRepository.createPlanificacion({
      escuelaId: academicRepository.findCursoById(combinacion.cursoId)?.escuelaId ?? escuelaDel(user, data),
      ...combinacion,
      asignacionMateriaId: asignacion.id,
      contenido,
      estado: ESTADO_INICIAL,
      historialEstados: [{ estadoAnterior: null, estadoNuevo: ESTADO_INICIAL, fecha: ahora, usuarioId: actorDel(user), motivo: null }],
      creadoPor: actorDel(user)
    });

    const vista = publicPlanificacion(registro, ctx, { detalle: true });
    auditar("planificacion:create", user, registro.id, null, vista);

    return { statusCode: 201, body: { data: vista } };
  },

  updatePlanificacion(id, data, user) {
    const ctx = contextoDe(user);
    const actual = planificacionesRepository.findPlanificacionById(id);

    if (!actual) {
      throw noEncontrado("La planificacion");
    }

    exigirPropia(actual, ctx);

    if (!ESTADOS_EDITABLES.includes(actual.estado)) {
      throw conflicto(`La planificacion esta ${descripcionEstado(actual.estado).toLowerCase()} y no se puede modificar.`);
    }

    const errores = [];
    const anioLectivo = validarAnioLectivo(data, errores);
    const cuatrimestre = validarPeriodo(data, errores);
    const contenido = validarContenido(data?.contenido, errores);

    if (errores.length > 0) {
      throw errorDeValidacion(errores);
    }

    const combinacion = {
      docenteId: data?.docenteId ?? actual.docenteId,
      materiaId: data?.materiaId ?? actual.materiaId,
      cursoId: data?.cursoId ?? actual.cursoId,
      divisionId: data?.divisionId ?? actual.divisionId,
      anioLectivo: anioLectivo ?? actual.anioLectivo,
      cuatrimestre: cuatrimestre !== undefined ? cuatrimestre : (actual.cuatrimestre ?? null)
    };

    const cambiaDatosGenerales = ["docenteId", "materiaId", "cursoId", "divisionId", "anioLectivo", "cuatrimestre"].some(
      (campo) => combinacion[campo] !== (actual[campo] ?? null)
    );

    const cambios = {};

    if (cambiaDatosGenerales) {
      const asignacion = validarCombinacion(combinacion, ctx, { excludeId: id });
      Object.assign(cambios, combinacion, { asignacionMateriaId: asignacion.id });
    }

    if (contenido !== undefined) {
      const nuevoContenido = { ...actual.contenido, ...contenido };

      if (JSON.stringify(nuevoContenido) !== JSON.stringify(actual.contenido)) {
        cambios.contenido = nuevoContenido;
      }
    }

    if (Object.keys(cambios).length === 0) {
      return { statusCode: 200, body: { data: publicPlanificacion(actual, ctx, { detalle: true }) } };
    }

    cambios.actualizadoPor = actorDel(user);
    const actualizado = planificacionesRepository.updatePlanificacion(id, cambios);
    const vista = publicPlanificacion(actualizado, ctx, { detalle: true });
    auditar("planificacion:update", user, id, publicPlanificacion(actual, ctx, { detalle: true }), vista);

    return { statusCode: 200, body: { data: vista } };
  },

  /* El docente entrega la planificacion: borrador -> presentada y
     observada -> corregida. */
  presentarPlanificacion(id, user) {
    const ctx = contextoDe(user);
    const actual = planificacionesRepository.findPlanificacionById(id);

    if (!actual) {
      throw noEncontrado("La planificacion");
    }

    exigirPropia(actual, ctx);

    const nuevoEstado = PRESENTACION[actual.estado];

    if (!nuevoEstado) {
      throw conflicto("Solo se puede presentar una planificacion en borrador u observada.");
    }

    if (seccionesCompletas(actual.contenido) === 0) {
      throw errorDeValidacion([{ field: "contenido", message: "Completa al menos una seccion antes de presentar la planificacion." }]);
    }

    const ahora = new Date().toISOString();
    const actualizado = planificacionesRepository.updatePlanificacion(
      id,
      { estado: nuevoEstado, fechaPresentacion: ahora, actualizadoPor: actorDel(user) },
      { estadoAnterior: actual.estado, estadoNuevo: nuevoEstado, fecha: ahora, usuarioId: actorDel(user), motivo: null }
    );
    const vista = publicPlanificacion(actualizado, ctx, { detalle: true });
    auditar("planificacion:presentar", user, id, { estado: actual.estado }, { estado: nuevoEstado });

    return { statusCode: 200, body: { data: vista } };
  },

  /* Revision de Jefatura: solo las transiciones de TRANSICIONES_REVISION. */
  cambiarEstado(id, data, user) {
    const ctx = contextoDe(user);
    const actual = planificacionesRepository.findPlanificacionById(id);

    if (!actual) {
      throw noEncontrado("La planificacion");
    }

    const errores = [];
    const estado = data?.estado;

    if (!estado) {
      errores.push({ field: "estado", message: "El estado es obligatorio." });
    } else if (!ESTADOS_VALIDOS.includes(estado)) {
      errores.push({ field: "estado", message: `El estado debe ser uno de: ${ESTADOS_VALIDOS.join(", ")}.` });
    }

    const motivo = typeof data?.motivo === "string" ? data.motivo.trim() : null;

    if (motivo && motivo.length > LIMITES.motivo) {
      errores.push({ field: "motivo", message: `El motivo no puede superar los ${LIMITES.motivo} caracteres.` });
    }

    if (ESTADOS_CON_MOTIVO.includes(estado) && !motivo) {
      errores.push({ field: "motivo", message: "El motivo es obligatorio para observar o rechazar." });
    }

    if (errores.length > 0) {
      throw errorDeValidacion(errores);
    }

    if (!(TRANSICIONES_REVISION[actual.estado] ?? []).includes(estado)) {
      throw conflicto(`No se puede pasar de ${descripcionEstado(actual.estado).toLowerCase()} a ${descripcionEstado(estado).toLowerCase()}.`);
    }

    const ahora = new Date().toISOString();
    const actualizado = planificacionesRepository.updatePlanificacion(
      id,
      {
        estado,
        fechaRevision: ahora,
        revisadoPor: actorDel(user),
        motivoRevision: motivo || null,
        actualizadoPor: actorDel(user)
      },
      { estadoAnterior: actual.estado, estadoNuevo: estado, fecha: ahora, usuarioId: actorDel(user), motivo: motivo || null }
    );
    const vista = publicPlanificacion(actualizado, ctx, { detalle: true });
    auditar("planificacion:estado", user, id, { estado: actual.estado }, { estado, motivo: motivo || null });

    return { statusCode: 200, body: { data: vista } };
  },

  /* ---------------- Consultas por docente, materia y curso ------------------ */

  getPorDocente(docenteId, query, user) {
    const ctx = contextoDe(user);

    if (ctx.restringido && docenteId !== ctx.docenteId) {
      throw sinPermisos("Solo podes consultar tus propias planificaciones.");
    }

    const docente = teachersRepository.findDocenteById(docenteId);

    if (!docente) {
      throw noEncontrado("El docente");
    }

    const errores = [];
    const filtros = filtrosDeConsulta(query, errores);

    if (errores.length > 0) {
      throw errorDeValidacion(errores);
    }

    const asignaciones = teachersRepository.listAsignacionesMateria({
      docenteId,
      anio: filtros.anioLectivo,
      estado: "activo"
    });

    const materias = new Map();
    const cursos = new Map();

    for (const asignacion of asignaciones) {
      const materia = academicRepository.findSubjectRefById(asignacion.materiaId);
      const division = asignacion.divisionId ? academicRepository.findDivisionById(asignacion.divisionId) : null;
      const curso = academicRepository.findCursoById(asignacion.cursoId ?? division?.cursoId);

      if (materia) {
        materias.set(materia.id, materiaRef(materia));
      }

      if (curso) {
        const clave = `${curso.id}:${division?.id ?? "*"}:${asignacion.anio}`;
        cursos.set(clave, {
          curso: cursoRef(curso),
          division: divisionRef(division),
          materia: materiaRef(materia),
          anioLectivo: asignacion.anio,
          periodo: etiquetaPeriodo(asignacion.anio, asignacion.cuatrimestre)
        });
      }
    }

    const planificaciones = ordenar(visibles(ctx, { docenteId, ...filtros }), ORDENES[ORDEN_POR_DEFECTO]);

    return {
      statusCode: 200,
      body: {
        data: {
          docente: docenteRef(docente),
          materias: [...materias.values()].sort((a, b) => collator.compare(a.nombre, b.nombre)),
          cursos: [...cursos.values()].sort(
            (a, b) => b.anioLectivo - a.anioLectivo || a.curso.anio - b.curso.anio || collator.compare(a.division?.nombre ?? "", b.division?.nombre ?? "")
          ),
          resumen: resumenDe(planificaciones),
          planificaciones
        }
      }
    };
  },

  getPorMateria(materiaId, query, user) {
    const ctx = contextoDe(user);
    const materia = academicRepository.findSubjectRefById(materiaId);

    if (!materia) {
      throw noEncontrado("La materia");
    }

    const errores = [];
    const filtros = filtrosDeConsulta(query, errores);

    if (errores.length > 0) {
      throw errorDeValidacion(errores);
    }

    const planificaciones = ordenar(
      visibles(ctx, { escuelaId: escuelaDel(user, query) ?? undefined, materiaId, ...filtros }),
      ORDENES.curso
    );

    return {
      statusCode: 200,
      body: { data: { materia: materiaRef(materia), resumen: resumenDe(planificaciones), planificaciones } }
    };
  },

  getPorCurso(cursoId, query, user) {
    const ctx = contextoDe(user);
    const curso = academicRepository.findCursoById(cursoId);

    if (!curso) {
      throw noEncontrado("El curso");
    }

    const errores = [];
    const filtros = filtrosDeConsulta(query, errores);
    const divisiones = academicRepository.listDivisiones({ cursoId }).map(divisionRef);

    if (query.divisionId && !divisiones.some((division) => division.id === query.divisionId)) {
      errores.push({ field: "divisionId", message: "La division indicada no pertenece al curso." });
    }

    if (errores.length > 0) {
      throw errorDeValidacion(errores);
    }

    const planificaciones = ordenar(
      visibles(ctx, { cursoId, divisionId: query.divisionId || undefined, materiaId: query.materiaId || undefined, ...filtros }),
      ORDENES.materia
    );

    return {
      statusCode: 200,
      body: {
        data: {
          curso: cursoRef(curso),
          divisiones: divisiones.sort((a, b) => collator.compare(a.nombre, b.nombre)),
          resumen: resumenDe(planificaciones),
          planificaciones
        }
      }
    };
  }
};

export default planificacionesService;
