import { errorDeValidacion, noEncontrado } from "../../utils/api-error.mjs";
import * as studentsRepository from "./students.repository.mjs";
import groupsRepository from "../groups/groups.repository.mjs";
import workshopsRepository from "../workshops/workshops.repository.mjs";

const POR_PAGINA_MAXIMO = 100;
const POR_PAGINA_DEFECTO = 20;
const ANIOS_CURSO_VALIDOS = [1, 2, 3, 4, 5, 6, 7];
const CONDICIONES_VALIDAS = ["regular", "irregular"];

/* ------------------------------------------------------------------
   Helpers
   ------------------------------------------------------------------ */

function escuelaIdInt(user) {
  const schoolId = user?.assignments?.[0]?.schoolId;
  if (!schoolId) {
    throw noEncontrado("La escuela del usuario");
  }

  const match = String(schoolId).match(/(\d+)$/);
  if (!match) {
    throw noEncontrado("La escuela del usuario");
  }

  return Number(match[1]);
}

function escuelaIdString(user) {
  return user?.assignments?.[0]?.schoolId ?? null;
}

function entero(valor, campo, { minimo = 1, maximo } = {}) {
  const numero = Number.parseInt(valor, 10);

  if (!Number.isInteger(numero) || numero < minimo || (maximo !== undefined && numero > maximo)) {
    throw errorDeValidacion([{ field: campo, message: `El parametro ${campo} no es valido.` }]);
  }

  return numero;
}

function leerOrden(searchParams) {
  const orden = searchParams.get("orden") ?? "apellido";

  if (!studentsRepository.ordenValido(orden)) {
    throw errorDeValidacion([{ field: "orden", message: "El orden solicitado no esta permitido." }]);
  }

  return orden;
}

function leerPaginacion(searchParams) {
  const pagina = entero(searchParams.get("pagina") ?? "1", "pagina");
  const porPagina = entero(searchParams.get("porPagina") ?? String(POR_PAGINA_DEFECTO), "porPagina", {
    minimo: 1,
    maximo: POR_PAGINA_MAXIMO
  });

  return { pagina, limite: porPagina, offset: (pagina - 1) * porPagina, porPagina };
}

function leerSoloActivos(searchParams) {
  const valor = searchParams.get("soloActivos");
  return valor === "true" || valor === "1";
}

function leerCondicion(searchParams) {
  const valor = searchParams.get("condicion");
  if (!valor) return null;

  if (!CONDICIONES_VALIDAS.includes(valor)) {
    throw errorDeValidacion([{ field: "condicion", message: "La condicion debe ser 'regular' o 'irregular'." }]);
  }

  return valor;
}

function leerPeriodo(searchParams) {
  const valor = searchParams.get("periodo");
  if (!valor) return null;

  const anio = Number.parseInt(valor, 10);
  if (!Number.isInteger(anio) || anio < 2000 || anio > 2100) {
    throw errorDeValidacion([{ field: "periodo", message: "El periodo academico no es valido." }]);
  }

  return anio;
}

function aFilaAlumno(fila, extras = {}) {
  return {
    id: String(fila.alumno_id),
    nombre: fila.nombre,
    apellido: fila.apellido,
    dni: fila.dni,
    curso: fila.anio_curso,
    division: fila.division,
    grupo: extras.grupo ?? null,
    taller: extras.taller ?? null,
    estado: fila.alumno_activo ? "activo" : "inactivo",
    condicion: fila.condicion ?? null
  };
}

function armarRespuesta({ tipo, contexto, filtros, pagina, porPagina, total, items, fechaConsulta }) {
  return {
    data: items,
    contexto: {
      ...contexto,
      tipo,
      fechaConsulta
    },
    filtros: {
      ...filtros,
      pagina,
      porPagina
    },
    paginacion: {
      total,
      pagina,
      porPagina,
      totalPaginas: total === 0 ? 0 : Math.ceil(total / porPagina)
    }
  };
}

function parametrosFiltros(searchParams) {
  return {
    soloActivos: leerSoloActivos(searchParams),
    condicion: leerCondicion(searchParams),
    periodo: leerPeriodo(searchParams)
  };
}

function filtrosResponse({ soloActivos, condicion, periodo, orden }) {
  const out = { soloActivos, orden };
  if (condicion) out.condicion = condicion;
  if (periodo) out.periodo = periodo;
  return out;
}

/* ------------------------------------------------------------------
   Listados especificos
   ------------------------------------------------------------------ */

export async function listarAlumnosPorCurso({ url, user }) {
  const escuelaId = escuelaIdInt(user);
  const searchParams = url.searchParams;

  const anioCurso = entero(searchParams.get("anioCurso"), "anioCurso");
  if (!ANIOS_CURSO_VALIDOS.includes(anioCurso)) {
    throw errorDeValidacion([{ field: "anioCurso", message: "El curso debe estar entre 1 y 7." }]);
  }

  const orden = leerOrden(searchParams);
  const { soloActivos, condicion, periodo } = parametrosFiltros(searchParams);
  const { pagina, limite, offset, porPagina } = leerPaginacion(searchParams);

  const contexto = await studentsRepository.contextoCursoEscuela(escuelaId, anioCurso, periodo);
  if (!contexto) {
    throw noEncontrado("El curso solicitado");
  }

  const [items, total] = await Promise.all([
    studentsRepository.listarPorCurso({ escuelaId, anioCurso, soloActivos, condicion, periodo, orden, limite, offset }),
    studentsRepository.totalPorCurso({ escuelaId, anioCurso, soloActivos, condicion, periodo })
  ]);

  return armarRespuesta({
    tipo: "curso",
    contexto: {
      curso: { anio: contexto.anio_curso },
      division: null,
      grupo: null,
      taller: null,
      periodoAcademico: contexto.periodo
    },
    filtros: filtrosResponse({ soloActivos, condicion, periodo, orden }),
    pagina,
    porPagina,
    total,
    items: items.map((f) => aFilaAlumno(f)),
    fechaConsulta: new Date().toISOString()
  });
}

export async function listarAlumnosPorDivision({ url, user }) {
  const escuelaId = escuelaIdInt(user);
  const searchParams = url.searchParams;

  const anioDivisionId = entero(searchParams.get("anioDivisionId"), "anioDivisionId");
  const orden = leerOrden(searchParams);
  const { soloActivos, condicion, periodo } = parametrosFiltros(searchParams);
  const { pagina, limite, offset, porPagina } = leerPaginacion(searchParams);

  const contexto = await studentsRepository.contextoDivision(escuelaId, anioDivisionId);
  if (!contexto) {
    throw noEncontrado("La division solicitada");
  }

  if (periodo && contexto.periodo !== periodo) {
    throw noEncontrado("La division solicitada en el periodo indicado");
  }

  const [items, total] = await Promise.all([
    studentsRepository.listarPorDivision({ escuelaId, anioDivisionId, soloActivos, condicion, periodo, orden, limite, offset }),
    studentsRepository.totalPorDivision({ escuelaId, anioDivisionId, soloActivos, condicion, periodo })
  ]);

  return armarRespuesta({
    tipo: "division",
    contexto: {
      curso: { anio: contexto.anio_curso },
      division: {
        id: String(anioDivisionId),
        numero: contexto.division,
        turnoAula: contexto.turno_aula,
        turnoTaller: contexto.turno_taller,
        orientacion: contexto.orientacion ?? null
      },
      grupo: null,
      taller: null,
      periodoAcademico: contexto.periodo
    },
    filtros: filtrosResponse({ soloActivos, condicion, periodo, orden }),
    pagina,
    porPagina,
    total,
    items: items.map((f) => aFilaAlumno(f)),
    fechaConsulta: new Date().toISOString()
  });
}

export async function listarAlumnosPorGrupo({ url, user }) {
  const escuelaIdMySQL = escuelaIdInt(user);
  const escuelaIdStr = escuelaIdString(user);
  const searchParams = url.searchParams;

  const groupId = searchParams.get("groupId");
  if (!groupId) {
    throw errorDeValidacion([{ field: "groupId", message: "El parametro groupId es obligatorio." }]);
  }

  const group = groupsRepository.findGroupById(groupId);
  if (!group) {
    throw noEncontrado("El grupo solicitado");
  }

  if (escuelaIdStr && group.schoolId !== escuelaIdStr) {
    throw noEncontrado("El grupo solicitado");
  }

  const orden = leerOrden(searchParams);
  const { soloActivos, condicion } = parametrosFiltros(searchParams);
  const { pagina, limite, offset, porPagina } = leerPaginacion(searchParams);

  const miembros = groupsRepository.listMembers({ groupId, includeInactive: soloActivos });
  const studentIds = [...new Set(miembros.filter((m) => m.isActive).map((m) => Number(m.studentId)))].filter(Number.isFinite);

  const [items, total] = await Promise.all([
    studentsRepository.listarPorIds({ escuelaId: escuelaIdMySQL, ids: studentIds, soloActivos, condicion, orden, limite, offset }),
    studentsRepository.totalPorIds({ escuelaId: escuelaIdMySQL, ids: studentIds, soloActivos, condicion })
  ]);

  const groupInfo = { id: group.id, nombre: group.name };

  return armarRespuesta({
    tipo: "grupo",
    contexto: {
      curso: group.courseId ? { id: group.courseId } : null,
      division: group.divisionId ? { id: group.divisionId } : null,
      grupo: groupInfo,
      taller: group.workshopId ? { id: group.workshopId } : null,
      periodoAcademico: null
    },
    filtros: filtrosResponse({ soloActivos, condicion, orden: orden, periodo: null }),
    pagina,
    porPagina,
    total,
    items: items.map((f) => aFilaAlumno(f, { grupo: groupInfo })),
    fechaConsulta: new Date().toISOString()
  });
}

export async function listarAlumnosPorTaller({ url, user }) {
  const escuelaIdMySQL = escuelaIdInt(user);
  const escuelaIdStr = escuelaIdString(user);
  const searchParams = url.searchParams;

  const workshopId = searchParams.get("workshopId");
  if (!workshopId) {
    throw errorDeValidacion([{ field: "workshopId", message: "El parametro workshopId es obligatorio." }]);
  }

  const workshop = workshopsRepository.findById(workshopId);
  if (!workshop) {
    throw noEncontrado("El taller solicitado");
  }

  if (escuelaIdStr && workshop.schoolId !== escuelaIdStr) {
    throw noEncontrado("El taller solicitado");
  }

  const orden = leerOrden(searchParams);
  const { soloActivos, condicion } = parametrosFiltros(searchParams);
  const { pagina, limite, offset, porPagina } = leerPaginacion(searchParams);

  const gruposDelTaller = groupsRepository.listGroups({ workshopId, schoolId: escuelaIdStr, includeInactive: true });
  const todosStudentIds = new Set();

  for (const g of gruposDelTaller) {
    const miembros = groupsRepository.listMembers({ groupId: g.id, includeInactive: soloActivos });
    for (const m of miembros) {
      if (m.isActive) {
        todosStudentIds.add(Number(m.studentId));
      }
    }
  }

  const studentIds = [...todosStudentIds].filter(Number.isFinite);

  const [items, total] = await Promise.all([
    studentsRepository.listarPorIds({ escuelaId: escuelaIdMySQL, ids: studentIds, soloActivos, condicion, orden, limite, offset }),
    studentsRepository.totalPorIds({ escuelaId: escuelaIdMySQL, ids: studentIds, soloActivos, condicion })
  ]);

  const tallerInfo = { id: workshop.id, nombre: workshop.name };

  return armarRespuesta({
    tipo: "taller",
    contexto: {
      curso: null,
      division: null,
      grupo: null,
      taller: tallerInfo,
      periodoAcademico: null
    },
    filtros: filtrosResponse({ soloActivos, condicion, orden: orden, periodo: null }),
    pagina,
    porPagina,
    total,
    items: items.map((f) => aFilaAlumno(f, { taller: tallerInfo })),
    fechaConsulta: new Date().toISOString()
  });
}
