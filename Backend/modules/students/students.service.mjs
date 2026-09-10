import { errorDeValidacion, noEncontrado } from "../../utils/api-error.mjs";
import { exigirRoles } from "../../middlewares/auth.middleware.mjs";
import { rolesPermitidos } from "../../config/permissions.config.mjs";
import * as studentsRepository from "./students.repository.mjs";

const POR_PAGINA_MAXIMO = 100;
const POR_PAGINA_DEFECTO = 20;
const ANIOS_CURSO_VALIDOS = [1, 2, 3, 4, 5, 6, 7];

const OPERACION = "students:listados";

/* -------------------------------------------------------------
   Helpers de validacion y parseo de parametros
   ------------------------------------------------------------- */

function permisosPara(user) {
  exigirRoles(user, rolesPermitidos(OPERACION));
  return user;
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

function aFilaAlumno(fila) {
  return {
    alumnoId: fila.alumno_id,
    nombre: fila.nombre,
    apellido: fila.apellido,
    dni: fila.dni,
    estado: fila.alumno_activo ? "activo" : "inactivo",
    condicion: fila.condicion ?? null,
    curso: {
      anio: fila.anio_curso,
      orientacion: fila.orientacion ?? null
    },
    division: {
      id: fila.anio_division_id,
      numero: fila.division,
      turnoAula: fila.turno_aula,
      turnoTaller: fila.turno_taller
    },
    grupo: fila.grupo_taller_id ? { id: fila.grupo_taller_id } : null,
    taller: fila.materia_id ? { id: fila.materia_id, nombre: fila.taller } : null
  };
}

function armarListado({ tipo, contexto, filtros, pagina, porPagina, total, items }) {
  return {
    data: items.map(aFilaAlumno),
    contexto,
    filtros,
    paginacion: {
      total,
      pagina,
      porPagina,
      totalPaginas: total === 0 ? 0 : Math.ceil(total / porPagina)
    }
  };
}

/* -------------------------------------------------------------
   Listados especificos
   ------------------------------------------------------------- */

export async function listarAlumnosPorCurso({ url, user }) {
  permisosPara(user);
  const escuelaId = user.escuelaId;

  const anioCurso = entero(url.searchParams.get("anioCurso"), "anioCurso");
  if (!ANIOS_CURSO_VALIDOS.includes(anioCurso)) {
    throw errorDeValidacion([{ field: "anioCurso", message: "El curso debe estar entre 1 y 7." }]);
  }

  const orden = leerOrden(url.searchParams);
  const soloActivos = leerSoloActivos(url.searchParams);
  const { pagina, limite, offset, porPagina } = leerPaginacion(url.searchParams);

  const contexto = await studentsRepository.contextoCursoEscuela(escuelaId, anioCurso);
  if (!contexto) {
    throw noEncontrado("El curso solicitado");
  }

  const [items, total] = await Promise.all([
    studentsRepository.listarPorCurso({ escuelaId, anioCurso, soloActivos, orden, limite, offset }),
    studentsRepository.totalPorCurso({ escuelaId, anioCurso, soloActivos })
  ]);

  return armarListado({
    tipo: "curso",
    contexto: {
      tipo: "curso",
      curso: { anio: contexto.anio_curso },
      periodo: { id: contexto.ciclo_lectivo_id, anio: contexto.periodo }
    },
    filtros: { soloActivos, orden },
    pagina,
    porPagina,
    total,
    items
  });
}

export async function listarAlumnosPorDivision({ url, user }) {
  permisosPara(user);
  const escuelaId = user.escuelaId;

  const anioDivisionId = entero(url.searchParams.get("anioDivisionId"), "anioDivisionId");
  const orden = leerOrden(url.searchParams);
  const soloActivos = leerSoloActivos(url.searchParams);
  const { pagina, limite, offset, porPagina } = leerPaginacion(url.searchParams);

  const contexto = await studentsRepository.contextoDivision(escuelaId, anioDivisionId);
  if (!contexto) {
    throw noEncontrado("La division solicitada");
  }

  const [items, total] = await Promise.all([
    studentsRepository.listarPorDivision({ escuelaId, anioDivisionId, soloActivos, orden, limite, offset }),
    studentsRepository.totalPorDivision({ escuelaId, anioDivisionId, soloActivos })
  ]);

  return armarListado({
    tipo: "division",
    contexto: {
      tipo: "division",
      curso: { anio: contexto.anio_curso },
      division: {
        id: anioDivisionId,
        numero: contexto.division,
        turnoAula: contexto.turno_aula,
        turnoTaller: contexto.turno_taller,
        orientacion: contexto.orientacion ?? null
      },
      periodo: { id: contexto.ciclo_lectivo_id, anio: contexto.periodo }
    },
    filtros: { soloActivos, orden },
    pagina,
    porPagina,
    total,
    items
  });
}

export async function listarAlumnosPorGrupo({ url, user }) {
  permisosPara(user);
  const escuelaId = user.escuelaId;

  const grupoTallerId = entero(url.searchParams.get("grupoTallerId"), "grupoTallerId");
  const orden = leerOrden(url.searchParams);
  const soloActivos = leerSoloActivos(url.searchParams);
  const { pagina, limite, offset, porPagina } = leerPaginacion(url.searchParams);

  const contexto = await studentsRepository.contextoGrupoTaller(escuelaId, grupoTallerId);
  if (!contexto) {
    throw noEncontrado("El grupo solicitado");
  }

  const [items, total] = await Promise.all([
    studentsRepository.listarPorGrupoTaller({ escuelaId, grupoTallerId, soloActivos, orden, limite, offset }),
    studentsRepository.totalPorGrupoTaller({ escuelaId, grupoTallerId, soloActivos })
  ]);

  return armarListado({
    tipo: "grupo",
    contexto: {
      tipo: "grupo",
      grupo: { id: grupoTallerId, nombre: contexto.grupo_taller },
      taller: contexto.taller ? { id: contexto.materia_id, nombre: contexto.taller } : null,
      periodo: { id: contexto.ciclo_lectivo_id, anio: contexto.periodo }
    },
    filtros: { soloActivos, orden },
    pagina,
    porPagina,
    total,
    items
  });
}

export async function listarAlumnosPorTaller({ url, user }) {
  permisosPara(user);
  const escuelaId = user.escuelaId;

  const materiaId = entero(url.searchParams.get("materiaId"), "materiaId");
  const orden = leerOrden(url.searchParams);
  const soloActivos = leerSoloActivos(url.searchParams);
  const { pagina, limite, offset, porPagina } = leerPaginacion(url.searchParams);

  const contexto = await studentsRepository.contextoMateria(escuelaId, materiaId);
  if (!contexto) {
    throw noEncontrado("El taller solicitado");
  }

  const [items, total] = await Promise.all([
    studentsRepository.listarPorTaller({ escuelaId, materiaId, soloActivos, orden, limite, offset }),
    studentsRepository.totalPorTaller({ escuelaId, materiaId, soloActivos })
  ]);

  return armarListado({
    tipo: "taller",
    contexto: {
      tipo: "taller",
      taller: { id: materiaId, nombre: contexto.taller },
      periodo: { id: null, anio: null }
    },
    filtros: { soloActivos, orden },
    pagina,
    porPagina,
    total,
    items
  });
}