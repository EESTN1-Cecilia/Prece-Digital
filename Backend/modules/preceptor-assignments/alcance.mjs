/* Alcance del preceptor: los cursos (curso + division del legajo) que el
   Director le asigno. Se guarda en la propia asignacion de rol del usuario
   ({ role: "preceptor", cursos: [{ curso, division }] }), asi un cambio del
   Director rige en el proximo pedido: verifyToken relee el usuario siempre.

   Solo se restringe a quien tiene UNICAMENTE el rol preceptor. Si ademas tiene
   un rol con alcance institucional (director, secretario, ...), manda ese. */

import { ROLES } from "../../config/permissions.config.mjs";
import studentRepository from "../students/students.repository.mjs";
import { errorHttp } from "../../utils/api-error.mjs";

export function claveCurso(curso, division) {
  return `${Number(curso)}-${String(division ?? "").trim()}`;
}

export function cursosDelPreceptor(user) {
  return (user?.assignments ?? [])
    .filter((asignacion) => asignacion.role === ROLES.PRECEPTOR)
    .flatMap((asignacion) => (Array.isArray(asignacion.cursos) ? asignacion.cursos : []));
}

/* null = sin restriccion; Set de claves "curso-division" = solo esos cursos. */
export function alcanceDe(user) {
  const roles = new Set((user?.assignments ?? []).map((asignacion) => asignacion.role));

  if (!roles.has(ROLES.PRECEPTOR) || [...roles].some((rol) => rol !== ROLES.PRECEPTOR)) {
    return null;
  }

  return new Set(cursosDelPreceptor(user).map((item) => claveCurso(item.curso, item.division)));
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

  const curso = numeroDe(registro.anio ?? registro.curso ?? registro.anioCurso);
  const division = divisionDe(registro.division ?? registro.numDivision);
  if (curso != null && division != null) return alcance.has(claveCurso(curso, division));

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
