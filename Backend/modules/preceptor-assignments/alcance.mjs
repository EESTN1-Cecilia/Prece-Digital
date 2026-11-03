/* Alcance del preceptor: los cursos (curso + division del legajo) que el
   Director le asigno. Se guarda en la propia asignacion de rol del usuario
   ({ role: "preceptor", cursos: [{ curso, division }] }), asi un cambio del
   Director rige en el proximo pedido: verifyToken relee el usuario siempre.

   Solo se restringe a quien tiene UNICAMENTE el rol preceptor. Si ademas tiene
   un rol con alcance institucional (director, secretario, ...), manda ese. */

import { ROLES } from "../../config/permissions.config.mjs";
import studentRepository from "../students/students.repository.mjs";
import academicRepository from "../academic/academic.repository.mjs";
import { DIVISIONES_CATALOGO } from "../students/catalogo.mjs";
import teachersRepository from "../teachers/teachers.repository.mjs";
import { errorHttp } from "../../utils/api-error.mjs";

export function claveCurso(curso, division) {
  return `${Number(curso)}-${String(division ?? "").trim()}`;
}

export function cursosDelPreceptor(user) {
  return (user?.assignments ?? [])
    .filter((asignacion) => asignacion.role === ROLES.PRECEPTOR)
    .flatMap((asignacion) => (Array.isArray(asignacion.cursos) ? asignacion.cursos : []));
}

/* Cursos de un docente: los de su rol y los de sus asignaciones activas del modulo
   docentes. Una asignacion sin division cubre todas las divisiones de ese anio. */
export function clavesDelDocente(user) {
  const claves = new Set();

  for (const asignacion of user?.assignments ?? []) {
    if (asignacion.role === ROLES.DOCENTE && asignacion.anio != null && asignacion.division != null) {
      claves.add(claveCurso(asignacion.anio, asignacion.division));
    }
  }

  const docente = teachersRepository.findDocenteByUserId(user?.id);

  if (!docente) {
    return claves;
  }

  const asignaciones = [
    ...teachersRepository.listAsignacionesCurso({ docenteId: docente.id, estado: "activo" }),
    ...teachersRepository.listAsignacionesMateria({ docenteId: docente.id, estado: "activo" })
  ];

  for (const { cursoId, divisionId } of asignaciones) {
    const anio = academicRepository.findCursoById(cursoId)?.anio;

    if (anio == null) {
      continue;
    }

    const numero = divisionId ? /\d+/.exec(academicRepository.findDivisionById(divisionId)?.nombre ?? "")?.[0] : null;

    if (numero) {
      claves.add(claveCurso(anio, numero));
    } else if (!divisionId) {
      DIVISIONES_CATALOGO.filter((item) => item.anio === anio).forEach((item) => claves.add(claveCurso(anio, item.division)));
    }
  }

  return claves;
}

/* null = sin restriccion; Set de claves "curso-division" = solo esos cursos.
   Solo se acota a preceptores y docentes: otro rol institucional manda. */
export function alcanceDe(user) {
  const roles = new Set((user?.assignments ?? []).map((asignacion) => asignacion.role));
  const acotados = [ROLES.PRECEPTOR, ROLES.DOCENTE];

  if (roles.size === 0 || [...roles].some((rol) => !acotados.includes(rol))) {
    return null;
  }

  return new Set([
    ...cursosDelPreceptor(user).map((item) => claveCurso(item.curso, item.division)),
    ...(roles.has(ROLES.DOCENTE) ? clavesDelDocente(user) : [])
  ]);
}

export function alumnoEnAlcance(alcance, alumno) {
  return !alcance || (alumno && alcance.has(claveCurso(alumno.curso, alumno.division)));
}

/* Filtra registros que traen curso y division (alumnos, inasistencias). */
export function filtrarPorCurso(user, registros, { curso = "curso", division = "division" } = {}) {
  const alcance = alcanceDe(user);
  return alcance ? registros.filter((registro) => alcance.has(claveCurso(registro[curso], registro[division]))) : registros;
}

/* Filtra registros que solo traen el id del alumno. */
export function filtrarPorAlumno(user, registros, campo = "alumnoId") {
  const alcance = alcanceDe(user);
  if (!alcance) return registros;
  return registros.filter((registro) => alumnoEnAlcance(alcance, studentRepository.findById(registro[campo])));
}

/* ---- Recorte de respuestas ----------------------------------------------
   Red de seguridad central: despues de cada handler, para un preceptor se
   sacan de la respuesta los registros que pertenecen a un alumno o a un curso
   que no tiene asignado. Asi un servicio que olvide filtrar no filtra datos.
   Un objeto "pertenece" a un curso si trae curso/anio + division, y a un
   alumno si trae alumnoId/studentId/estudianteId. Lo que no se puede atribuir
   a un alumno ni a un curso (catalogos, totales) se deja como esta. */

const CAMPOS_ID_ALUMNO = ["alumnoId", "studentId", "estudianteId"];

function numeroDe(valor) {
  if (typeof valor === "number" && Number.isInteger(valor)) return valor;
  const coincidencia = /^(\d+)\s*(°|º|ro|do|to|mo|vo|er)?\b/i.exec(String(valor ?? "").trim());
  return coincidencia ? Number(coincidencia[1]) : null;
}

function divisionDe(valor) {
  const coincidencia = /(\d+)/.exec(String(valor ?? ""));
  return coincidencia ? coincidencia[1] : null;
}

/* true = dentro, false = fuera, null = no se puede atribuir. */
function veredicto(alcance, registro) {
  for (const campo of CAMPOS_ID_ALUMNO) {
    if (typeof registro[campo] === "string" && registro[campo]) {
      const alumno = studentRepository.findById(registro[campo]);
      if (alumno) return alumnoEnAlcance(alcance, alumno);
    }
  }

  const curso = numeroDe(registro.curso ?? registro.anioCurso ?? registro.anio);
  const division = divisionDe(registro.division ?? registro.numDivision);
  /* anio tambien puede ser el ciclo lectivo (2026): eso no identifica un curso. */
  if (curso != null && curso < 100 && division != null) return alcance.has(claveCurso(curso, division));

  return null;
}

function recortar(alcance, valor, profundidad) {
  if (profundidad > 8 || valor == null || typeof valor !== "object") return valor;

  if (Array.isArray(valor)) {
    return valor
      .filter((item) => !(item && typeof item === "object" && !Array.isArray(item) && veredicto(alcance, item) === false))
      .map((item) => recortar(alcance, item, profundidad + 1));
  }

  const salida = {};
  for (const [clave, contenido] of Object.entries(valor)) {
    salida[clave] = recortar(alcance, contenido, profundidad + 1);
  }

  /* Un listado recortado no puede seguir informando el total de la escuela. */
  if (salida.paginacion && typeof salida.paginacion === "object" && Array.isArray(salida.data) && Array.isArray(valor.data)) {
    if (salida.data.length !== valor.data.length) {
      salida.paginacion = { ...salida.paginacion, total: Math.min(Number(salida.paginacion.total ?? 0), salida.data.length) };
    }
  }

  return salida;
}

export function recortarRespuesta(user, payload) {
  const alcance = alcanceDe(user);
  if (!alcance || payload == null || typeof payload !== "object") return payload;

  const cuerpo = Object.hasOwn(payload, "statusCode") && Object.hasOwn(payload, "body") ? payload.body : payload;
  const dato = cuerpo && typeof cuerpo === "object" && !Array.isArray(cuerpo) && cuerpo.data && !Array.isArray(cuerpo.data) ? cuerpo.data : null;

  /* Un registro suelto de otro curso (GET por id) es un 403, no una lista vacia. */
  if (dato && veredicto(alcance, dato) === false) {
    throw errorHttp(403, "OUT_OF_SCOPE", "Ese curso o alumno no está asignado a tu perfil.");
  }

  return payload === cuerpo ? recortar(alcance, payload, 0) : { ...payload, body: recortar(alcance, cuerpo, 0) };
}
