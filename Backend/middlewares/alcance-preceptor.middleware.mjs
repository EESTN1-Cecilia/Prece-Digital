import studentRepository from "../modules/students/students.repository.mjs";
import observationsRepository from "../modules/observations/observations.repository.mjs";
import particularConditionsRepository from "../modules/particular-conditions/particular-conditions.repository.mjs";
import attendanceFollowupsRepository from "../modules/attendance-followups/attendance-followups.repository.mjs";
import attendanceAlertsRepository from "../modules/attendance-alerts/attendance-alerts.repository.mjs";
import inasistenciasRepository from "../modules/inasistencias/inasistencias.repository.mjs";
import { alcanceDe, alumnoEnAlcance, claveCurso } from "../modules/preceptor-assignments/alcance.mjs";
import { ROLES } from "../config/permissions.config.mjs";
import { errorHttp } from "../utils/api-error.mjs";

/* Va despues de verifyToken en TODAS las rutas protegidas (routes/index.mjs).
   Para un preceptor, rechaza cualquier pedido que nombre a un alumno o a un
   curso que el Director no le asigno: por URL (:studentId, :alumnoId), query
   o cuerpo. Los listados sin filtro se recortan en cada servicio. */

const CAMPOS_ALUMNO = ["studentId", "alumnoId", "estudianteId"];
const RUTAS_OBSERVACIONES = [
  /^\/api\/v1\/observations(?:\/|$)/,
  /^\/api\/v1\/students\/[^/]+\/observations(?:\/|$)/,
  /^\/api\/v1\/alumnos\/[^/]+\/observaciones(?:\/|$)/
];
const MENSAJE_SIN_CURSOS = "Necesitás tener al menos un curso asignado para acceder a las observaciones.";

function fueraDeAlcance() {
  return errorHttp(403, "OUT_OF_SCOPE", "Ese curso o alumno no está asignado a tu perfil.");
}

function esPreceptorDeAlcanceLimitado(user) {
  const roles = new Set((user?.assignments ?? []).map((asignacion) => asignacion.role));
  return roles.has(ROLES.PRECEPTOR) && [...roles].every((rol) => [ROLES.PRECEPTOR, ROLES.DOCENTE].includes(rol));
}

export async function alcancePreceptor(ctx) {
  const alcance = alcanceDe(ctx.user);

  if (!alcance) {
    return;
  }

  const pathname = ctx.url.pathname;
  const metodo = ctx.request.method;
  const esPreceptor = esPreceptorDeAlcanceLimitado(ctx.user);

  if (esPreceptor && RUTAS_OBSERVACIONES.some((patron) => patron.test(pathname)) && alcance.size === 0) {
    throw errorHttp(403, "PRECEPTOR_NO_ASSIGNED_COURSES", MENSAJE_SIN_CURSOS);
  }

  if (esPreceptor && metodo === "POST" && ["/api/v1/students", "/api/v1/students/bulk"].includes(pathname)) {
    throw errorHttp(403, "PRECEPTOR_CANNOT_CREATE_STUDENTS", "El rol Preceptor no puede cargar alumnos.");
  }

  if (
    esPreceptor &&
    metodo !== "GET" &&
    (
      /^\/api\/v1\/(?:cursos|divisiones)(?:\/|$)/.test(pathname) ||
      ["/api/v1/preceptores/asignaciones", "/api/v1/preceptores/asignaciones/quitar"].includes(pathname)
    )
  ) {
    throw errorHttp(403, "PRECEPTOR_ASSIGNMENTS_MANAGED_BY_DIRECTOR", "La estructura y asignación de cursos debe gestionarla Dirección.");
  }

  const query = Object.fromEntries(ctx.url.searchParams.entries());
  const fuentes = [ctx.params ?? {}, query, ctx.body && typeof ctx.body === "object" ? ctx.body : {}];

  for (const fuente of fuentes) {
    for (const campo of CAMPOS_ALUMNO) {
      const id = fuente[campo];
      if (!id) continue;
      const alumno = studentRepository.findById(String(id));
      /* Un id inexistente o de otra escuela sigue al handler, que ya los rechaza (404 / 422). */
      const escuelas = new Set((ctx.user.assignments ?? []).map((asignacion) => asignacion.schoolId).filter(Boolean));
      if (alumno && escuelas.has(alumno.escuelaId) && !alumnoEnAlcance(alcance, alumno)) throw fueraDeAlcance();
    }

    const curso = fuente.curso ?? fuente.anioCurso ?? fuente.cursoNuevo;
    const division = fuente.division ?? fuente.divisionNueva;
    if (curso != null && curso !== "" && division != null && division !== "" && /^\d+$/.test(String(curso))) {
      if (!alcance.has(claveCurso(curso, division))) throw fueraDeAlcance();
    }
  }
}

/* Escritura sobre un registro por su id (observacion, seguimiento, condicion,
   inasistencia, alerta): el registro debe pertenecer a un alumno del alcance
   ANTES de tocarlo. El recorte de la respuesta no alcanza para esto, porque
   la modificacion ya estaria hecha. Un id inexistente sigue al handler (404). */
const RESOLUTORES = {
  observationId: (id) => observationsRepository.findObservationById(id),
  seguimientoId: (id, ruta) => {
    if (ruta.includes("/seguimientos-inasistencia/")) return attendanceFollowupsRepository.findSeguimientoById(id);
    const seguimiento = observationsRepository.findSeguimientoById(id);
    return seguimiento ? observationsRepository.findObservationById(seguimiento.observacionId) : null;
  },
  conditionId: (id) => particularConditionsRepository.findConditionById(id),
  inasistenciaId: (id) => inasistenciasRepository.findById(id),
  alertaId: (id) => attendanceAlertsRepository.findAlertaById(id)
};

export function alcancePreceptorRegistro(ctx) {
  const alcance = alcanceDe(ctx.user);
  if (!alcance || !ctx.params) return;

  for (const [parametro, resolver] of Object.entries(RESOLUTORES)) {
    const id = ctx.params[parametro];
    if (!id) continue;
    const registro = resolver(String(id), ctx.url.pathname);
    if (!registro?.alumnoId) continue;
    const alumno = studentRepository.findById(registro.alumnoId);
    /* Otra escuela: sigue al handler, que responde 404 como si no existiera. */
    const escuelas = new Set((ctx.user.assignments ?? []).map((asignacion) => asignacion.schoolId).filter(Boolean));
    if (alumno && escuelas.has(alumno.escuelaId) && !alumnoEnAlcance(alcance, alumno)) throw fueraDeAlcance();
  }
}
