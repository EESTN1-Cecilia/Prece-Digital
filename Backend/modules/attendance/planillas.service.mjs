/* Reglas de las planillas mensuales de asistencia.

   - Las marcas se guardan por id de alumno (no por numero de orden): si entra o
     sale un alumno del curso, cada marca sigue siendo del alumno correcto.
   - Solo se guardan alumnos que pertenecen a ese curso.
   - Control de concurrencia: cada guardado trae la version que se leyo; si otra
     persona guardo antes, se responde 409 y no se pisa nada.
   - La planilla oficial (sin materia) es de preceptoria; la de una materia es
     del docente. Un preceptor o docente solo ve y edita sus cursos (alcance). */

import { ROLES } from "../../config/permissions.config.mjs";
import { ApiError, errorDeValidacion, sinPermisos } from "../../utils/api-error.mjs";
import { alcanceDe, claveCurso } from "../preceptor-assignments/alcance.mjs";
import studentRepository from "../students/students.repository.mjs";
import planillasRepository, { clavePlanilla } from "./planillas.repository.mjs";

export const CODIGOS_ASISTENCIA = ["P", "A", "J", "T", "—"];
const MAX_ALUMNOS = 200;
const MAX_OBSERVACION = 500;
const MAX_EFEMERIDES = 31;
const CURSO_RE = /^([1-7])-(\d{1,2})$/;

export function normalizarMateria(materia) {
  if (materia === undefined || materia === null) return { nombre: null, clave: "" };
  const nombre = String(materia).trim().replace(/\s+/g, " ").slice(0, 120);
  if (!nombre) return { nombre: null, clave: "" };
  const clave = nombre.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  return { nombre, clave };
}

function leerParametros({ curso, anio, mes, materia }) {
  const errores = [];
  const cursoTexto = String(curso ?? "").trim();
  const coincidencia = CURSO_RE.exec(cursoTexto);
  if (!coincidencia) errores.push({ field: "curso", message: "El curso debe tener el formato año-división, por ejemplo 1-1." });

  const anioNum = Number(anio);
  if (!Number.isInteger(anioNum) || anioNum < 2000 || anioNum > 2100) errores.push({ field: "anio", message: "El año no es válido." });

  const mesNum = Number(mes);
  if (!Number.isInteger(mesNum) || mesNum < 1 || mesNum > 12) errores.push({ field: "mes", message: "El mes debe estar entre 1 y 12." });

  if (errores.length) throw errorDeValidacion(errores);

  const materiaNorm = normalizarMateria(materia);
  return {
    cursoId: cursoTexto,
    anioCurso: Number(coincidencia[1]),
    division: coincidencia[2],
    anio: anioNum,
    mes: mesNum,
    materia: materiaNorm.nombre,
    materiaClave: materiaNorm.clave
  };
}

function roles(user) {
  return new Set((user?.assignments ?? []).map((asignacion) => asignacion.role));
}

/* Lectura: el curso tiene que estar en el alcance de la sesion. */
function verificarLectura(user, params) {
  const alcance = alcanceDe(user);
  if (alcance && !alcance.has(claveCurso(params.anioCurso, params.division))) {
    throw sinPermisos("Ese curso no está asignado a tu usuario.");
  }
}

/* Escritura: ademas del alcance, la planilla oficial no la edita quien es solo
   docente, y la de una materia no la edita quien es solo preceptor. */
function verificarEscritura(user, params) {
  verificarLectura(user, params);
  const propios = roles(user);
  const soloDocente = propios.size > 0 && [...propios].every((rol) => rol === ROLES.DOCENTE);
  const soloPreceptor = propios.size > 0 && [...propios].every((rol) => rol === ROLES.PRECEPTOR);

  if (!params.materia && soloDocente) {
    throw sinPermisos("La planilla oficial del curso la completa preceptoría.");
  }
  if (params.materia && soloPreceptor) {
    throw sinPermisos("La planilla de una materia la completa el docente a cargo.");
  }
}

function alumnoDelCurso(alumnoId, params) {
  const alumno = studentRepository.findById(alumnoId);
  return Boolean(alumno && Number(alumno.curso) === params.anioCurso && String(alumno.division) === params.division);
}

function validarCuerpo(body, params) {
  const errores = [];
  const diasEnMes = new Date(params.anio, params.mes, 0).getDate();
  const registrosEntrada = body?.registros;

  if (!registrosEntrada || typeof registrosEntrada !== "object" || Array.isArray(registrosEntrada)) {
    throw errorDeValidacion([{ field: "registros", message: "Faltan los registros de asistencia." }]);
  }

  const ids = Object.keys(registrosEntrada);
  if (ids.length > MAX_ALUMNOS) errores.push({ field: "registros", message: `La planilla admite hasta ${MAX_ALUMNOS} alumnos.` });

  const registros = {};
  for (const alumnoId of ids) {
    if (!alumnoDelCurso(alumnoId, params)) {
      errores.push({ field: `registros.${alumnoId}`, message: "El alumno no pertenece a este curso." });
      continue;
    }
    const dias = registrosEntrada[alumnoId];
    if (!dias || typeof dias !== "object" || Array.isArray(dias)) {
      errores.push({ field: `registros.${alumnoId}`, message: "Los días del alumno no son válidos." });
      continue;
    }
    registros[alumnoId] = {};
    for (const [diaTexto, codigo] of Object.entries(dias)) {
      const dia = Number(diaTexto);
      if (!Number.isInteger(dia) || dia < 1 || dia > diasEnMes) {
        errores.push({ field: `registros.${alumnoId}.${diaTexto}`, message: "Día fuera del mes." });
      } else if (!CODIGOS_ASISTENCIA.includes(codigo)) {
        errores.push({ field: `registros.${alumnoId}.${diaTexto}`, message: "Código de asistencia no válido (P, A, J, T o —)." });
      } else {
        registros[alumnoId][dia] = codigo;
      }
    }
  }

  const observacionesPorAlumno = {};
  const obsEntrada = body?.observacionesPorAlumno ?? {};
  if (typeof obsEntrada !== "object" || Array.isArray(obsEntrada)) {
    errores.push({ field: "observacionesPorAlumno", message: "Las observaciones no son válidas." });
  } else {
    for (const [alumnoId, texto] of Object.entries(obsEntrada)) {
      const limpio = String(texto ?? "").trim();
      if (!limpio) continue;
      if (!alumnoDelCurso(alumnoId, params)) {
        errores.push({ field: `observacionesPorAlumno.${alumnoId}`, message: "El alumno no pertenece a este curso." });
      } else if (limpio.length > MAX_OBSERVACION) {
        errores.push({ field: `observacionesPorAlumno.${alumnoId}`, message: `La observación admite hasta ${MAX_OBSERVACION} caracteres.` });
      } else {
        observacionesPorAlumno[alumnoId] = limpio;
      }
    }
  }

  const observacionesMes = [];
  const efemerides = body?.observacionesMes ?? [];
  if (!Array.isArray(efemerides) || efemerides.length > MAX_EFEMERIDES) {
    errores.push({ field: "observacionesMes", message: "Las observaciones del mes no son válidas." });
  } else {
    for (const item of efemerides) {
      const dia = Number(item?.dia);
      const descripcion = String(item?.descripcion ?? "").trim().slice(0, 200);
      if (Number.isInteger(dia) && dia >= 1 && dia <= diasEnMes && descripcion) observacionesMes.push({ dia, descripcion });
    }
  }

  const entero = (valor, campo) => {
    if (valor === undefined || valor === null || valor === "") return 0;
    const numero = Number(valor);
    if (!Number.isInteger(numero) || numero < 0 || numero > 1000) {
      errores.push({ field: campo, message: "Debe ser un número entero entre 0 y 1000." });
      return 0;
    }
    return numero;
  };

  const resultado = {
    registros,
    observacionesPorAlumno,
    observacionesMes,
    matriculaInicial: entero(body?.matriculaInicial, "matriculaInicial"),
    entradas: entero(body?.entradas, "entradas"),
    salidas: entero(body?.salidas, "salidas")
  };

  if (errores.length) throw errorDeValidacion(errores.slice(0, 20));
  return resultado;
}

function nombreDe(user) {
  return [user?.nombre, user?.apellido].filter(Boolean).join(" ") || user?.displayName || user?.email || "Usuario";
}

export function obtenerPlanilla(query, user) {
  const params = leerParametros(query ?? {});
  verificarLectura(user, params);
  return planillasRepository.buscar(clavePlanilla(params));
}

export function guardarPlanilla(query, body, user) {
  const params = leerParametros(query ?? {});
  verificarEscritura(user, params);
  const datos = validarCuerpo(body, params);
  const clave = clavePlanilla(params);
  const actual = planillasRepository.buscar(clave);
  const versionLeida = Number(body?.version ?? 0);
  const versionActual = actual?.version ?? 0;

  if (!Number.isInteger(versionLeida) || versionLeida !== versionActual) {
    throw new ApiError(
      "CONFLICT",
      `Otra persona guardó esta planilla (${actual?.actualizadoPor ?? "otro usuario"}) mientras la tenías abierta. Recargá la planilla para ver los cambios y volvé a cargar los tuyos.`,
      { details: [{ field: "version", message: "La planilla cambió en el servidor." }] }
    );
  }

  const ahora = new Date().toISOString();
  return planillasRepository.guardar(clave, {
    cursoId: params.cursoId,
    curso: params.anioCurso,
    division: params.division,
    materia: params.materia,
    anio: params.anio,
    mes: params.mes,
    ...datos,
    version: versionActual + 1,
    creadoEn: actual?.creadoEn ?? ahora,
    actualizadoEn: ahora,
    actualizadoPor: nombreDe(user),
    actualizadoPorId: user?.id ?? null
  });
}
