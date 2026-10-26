import { ROLES } from "../../config/permissions.config.mjs";
import { userRepository } from "../../database/repositories/user.repository.mjs";
import teachersRepository from "../teachers/teachers.repository.mjs";
import academicRepository from "../academic/academic.repository.mjs";
import studentRepository from "../students/students.repository.mjs";
import { errorHttp } from "../../utils/api-error.mjs";

/* Alcance por curso de los roles docente y preceptor.

   Un docente o un preceptor solo ve los alumnos (legajos, perfiles, boletines,
   calificaciones, inasistencias, observaciones...) de los cursos que tiene
   asignados. Un curso se identifica como "<anio>-<division>" (por ejemplo
   "2-1"), la misma clave que usan el catalogo de divisiones y la preceptoria.

   Origen de las asignaciones del docente, en orden:
     1. Las asignaciones del usuario con rol docente que traen anio + division
        (o un courseId con forma "3-3").
     2. Si no hay ninguna, las asignaciones activas del modulo de docentes
        (docentes_asignaciones_cursos / _materias) del docente ligado al usuario.

   Las del preceptor son sus asignaciones con rol preceptor que traen anio +
   division (equivalen a preceptor_cursos). Las registra Direccion desde la
   seccion de asignaciones (modules/preceptor/preceptor-asignaciones.service.mjs)
   y se leen en cada consulta: un cambio de Direccion aplica en la peticion
   siguiente, sin volver a iniciar sesion.

   Si el usuario tiene ademas un rol con alcance institucional (director,
   secretario, jefe de area, admin, server) no se restringe nada. Una cuenta
   docente + preceptor ve la union de los cursos de ambos roles. */

const ROLES_SIN_RESTRICCION = new Set([
  ROLES.ADMIN,
  ROLES.DIRECTOR,
  ROLES.SECRETARIO,
  ROLES.JEFE_AREA,
  ROLES.SERVER
]);

const ROLES_CON_ALCANCE = [ROLES.DOCENTE, ROLES.PRECEPTOR];

function numero(valor) {
  const match = /(\d+)/.exec(String(valor ?? ""));
  return match ? Number(match[1]) : null;
}

function claveCurso(anio, division) {
  const a = numero(anio);
  const d = numero(division);
  return a && d != null ? `${a}-${d}` : null;
}

function usuarioCompleto(user) {
  if (!user) return null;
  return (user.id ? userRepository.findById(user.id, { includeInactive: true }) : null) ?? user;
}

function rolesDe(user) {
  return new Set((user?.assignments ?? []).map((asignacion) => asignacion.role));
}

function sinRolInstitucional(roles) {
  return ![...roles].some((rol) => ROLES_SIN_RESTRICCION.has(rol));
}

/* true cuando la cuenta es solo docente. La asistencia por clase lo usa para
   las reglas propias del docente (corregir solo sus tomas). */
export function esDocenteRestringido(user) {
  const roles = rolesDe(usuarioCompleto(user));
  return roles.has(ROLES.DOCENTE) && !roles.has(ROLES.PRECEPTOR) && sinRolInstitucional(roles);
}

/* true cuando el preceptor (sin rol institucional) ve solo los cursos que le
   asigno Direccion. */
export function esPreceptorRestringido(user) {
  const roles = rolesDe(usuarioCompleto(user));
  return roles.has(ROLES.PRECEPTOR) && sinRolInstitucional(roles);
}

/* true cuando la cuenta ve solo sus cursos asignados (docente y/o preceptor). */
export function esCuentaRestringida(user) {
  const roles = rolesDe(usuarioCompleto(user));
  return ROLES_CON_ALCANCE.some((rol) => roles.has(rol)) && sinRolInstitucional(roles);
}

/* Claves "<anio>-<division>" asignadas al usuario como preceptor, ordenadas. */
export function cursosAsignadosPreceptor(user) {
  const claves = new Set();

  for (const asignacion of usuarioCompleto(user)?.assignments ?? []) {
    if (asignacion.role !== ROLES.PRECEPTOR) continue;

    let clave = claveCurso(asignacion.anio ?? asignacion.curso, asignacion.division);
    if (!clave && /^\d+-\d+$/.test(String(asignacion.courseId ?? ""))) {
      clave = String(asignacion.courseId);
    }
    if (clave) claves.add(clave);
  }

  return [...claves].sort((a, b) => {
    const [anioA, divisionA] = a.split("-").map(Number);
    const [anioB, divisionB] = b.split("-").map(Number);
    return anioA - anioB || divisionA - divisionB;
  });
}

function cursosDesdeAsignacionesDeUsuario(user) {
  const cursos = new Map();

  for (const asignacion of user?.assignments ?? []) {
    if (asignacion.role !== ROLES.DOCENTE) continue;

    let clave = claveCurso(asignacion.anio ?? asignacion.curso, asignacion.division);
    if (!clave && /^\d+-\d+$/.test(String(asignacion.courseId ?? ""))) {
      clave = String(asignacion.courseId);
    }
    if (!clave) continue;

    const [anio, division] = clave.split("-");
    const previo = cursos.get(clave);
    const materias = new Set(previo?.materias ?? []);
    if (asignacion.materia) materias.add(asignacion.materia);

    cursos.set(clave, {
      id: clave,
      anio: Number(anio),
      curso: `${anio}°`,
      division,
      materias: [...materias],
      materia: [...materias][0] ?? null,
      turno: asignacion.shiftId ?? previo?.turno ?? null,
      schoolId: asignacion.schoolId ?? previo?.schoolId ?? null
    });
  }

  return cursos;
}

function divisionesDelCursoAcademico(cursoId, divisionId) {
  const curso = cursoId ? academicRepository.findCursoById(cursoId) : null;
  if (!curso?.anio) return [];

  if (divisionId) {
    const division = academicRepository.findDivisionById(divisionId);
    const clave = claveCurso(curso.anio, division?.nombre);
    return clave ? [clave] : [];
  }

  /* Asignacion a todo el anio: todas las divisiones de ese curso. */
  const divisiones = typeof academicRepository.listDivisiones === "function"
    ? academicRepository.listDivisiones({ cursoId })
    : [];
  return (divisiones ?? [])
    .map((division) => claveCurso(curso.anio, division.nombre))
    .filter(Boolean);
}

function cursosDesdeModuloDocentes(user) {
  const cursos = new Map();
  let docente = null;

  try {
    docente = teachersRepository.findDocenteByUserId(user?.id) ??
      (user?.email ? teachersRepository.findDocenteByEmail(user.email) : null);
  } catch {
    docente = null;
  }

  if (!docente) return cursos;

  const asignaciones = [
    ...teachersRepository.listAsignacionesCurso({ docenteId: docente.id, estado: "activo" }),
    ...teachersRepository.listAsignacionesMateria({ docenteId: docente.id, estado: "activo" })
  ];

  for (const asignacion of asignaciones) {
    for (const clave of divisionesDelCursoAcademico(asignacion.cursoId, asignacion.divisionId)) {
      const [anio, division] = clave.split("-");
      cursos.set(clave, {
        id: clave,
        anio: Number(anio),
        curso: `${anio}°`,
        division,
        materias: [],
        materia: null,
        turno: null,
        schoolId: asignacion.escuelaId ?? null
      });
    }
  }

  return cursos;
}

/* Cursos asignados al docente, ordenados por anio y division. */
export function cursosAsignadosDocente(user) {
  const completo = usuarioCompleto(user);
  let cursos = cursosDesdeAsignacionesDeUsuario(completo);

  if (cursos.size === 0) {
    cursos = cursosDesdeModuloDocentes(completo);
  }

  return [...cursos.values()].sort((a, b) => a.anio - b.anio || Number(a.division) - Number(b.division));
}

/* Cursos del docente con la matricula activa de cada division y el horario
   de su carga horaria (si el perfil lo tiene cargado). Alimenta el portal docente. */
export function cursosConDetalleDocente(user) {
  const completo = usuarioCompleto(user);
  const escuelaId = completo?.assignments?.find((asignacion) => asignacion.schoolId)?.schoolId ?? "esc-1";
  const franja = completo?.hora_desde && completo?.hora_hasta ? `${completo.hora_desde} a ${completo.hora_hasta}` : null;
  const dia = completo?.dia === "Miercoles" ? "Miércoles" : completo?.dia;
  const horario = franja ? [dia, franja].filter(Boolean).join(" de ") : null;

  return cursosAsignadosDocente(user).map((curso) => ({
    ...curso,
    cantidadAlumnos: studentRepository.search({
      escuelaId,
      criterios: { curso: curso.anio, division: String(Number(curso.division)), estado: "activo" },
      orden: "apellido"
    }).length,
    horario
  }));
}

/* Set de claves "<anio>-<division>" permitidas, o null si el usuario no tiene
   restriccion por curso. */
export function cursosPermitidos(user) {
  if (!esCuentaRestringida(user)) return null;

  const roles = rolesDe(usuarioCompleto(user));
  const permitidos = new Set();

  if (roles.has(ROLES.DOCENTE)) {
    for (const curso of cursosAsignadosDocente(user)) permitidos.add(curso.id);
  }
  if (roles.has(ROLES.PRECEPTOR)) {
    for (const clave of cursosAsignadosPreceptor(user)) permitidos.add(clave);
  }

  return permitidos;
}

export function alumnoEnCursos(alumno, permitidos) {
  if (!permitidos) return true;
  if (!alumno) return false;
  const clave = claveCurso(alumno.curso, alumno.division);
  return clave ? permitidos.has(clave) : false;
}

export function cursoPermitido(user, anio, division) {
  const permitidos = cursosPermitidos(user);
  if (!permitidos) return true;
  return permitidos.has(claveCurso(anio, division));
}

function sinAcceso() {
  return errorHttp(403, "FORBIDDEN", "Solo puede consultar alumnos de los cursos que tiene asignados.");
}

/* Lanza 403 si el usuario es docente o preceptor y el alumno no pertenece a sus cursos.
   Un alumno inexistente se deja pasar: el servicio responde el 404 que corresponda. */
export function exigirAccesoAlumno(user, alumnoId) {
  const permitidos = cursosPermitidos(user);
  if (!permitidos || !alumnoId) return;

  const alumno = studentRepository.findById(String(alumnoId));
  if (!alumno) return;

  if (!alumnoEnCursos(alumno, permitidos)) {
    throw sinAcceso();
  }
}

export function exigirAccesoCurso(user, cursoId) {
  const permitidos = cursosPermitidos(user);
  if (!permitidos) return;
  if (!permitidos.has(String(cursoId ?? ""))) {
    throw sinAcceso();
  }
}

/* true si al menos uno de los alumnos es de los cursos permitidos (null = sin
   restriccion). Para recursos ligados a varios alumnos, como un tutor. */
export function algunAlumnoEnCursos(alumnoIds, permitidos) {
  if (!permitidos) return true;
  return alumnoIds.some((alumnoId) => alumnoEnCursos(studentRepository.findById(String(alumnoId)), permitidos));
}

/* Lanza 403 si el usuario tiene alcance por curso y ninguno de los alumnos
   ligados al recurso es de sus cursos. */
export function exigirAccesoAAlgunAlumno(user, alumnoIds) {
  const permitidos = cursosPermitidos(user);
  if (!permitidos) return;
  if (!algunAlumnoEnCursos(alumnoIds, permitidos)) {
    throw sinAcceso();
  }
}

/* Middleware para rutas con :studentId o :alumnoId. Va despues de authorize. */
export async function restringirAlumnoPorCurso(ctx) {
  exigirAccesoAlumno(ctx.user, ctx.params?.studentId ?? ctx.params?.alumnoId);
}

function alumnoIdDe(item) {
  if (!item || typeof item !== "object") return null;
  return item.alumnoId ?? item.studentId ?? item.alumno?.id ?? null;
}

/* Envuelve el handler de un listado o detalle de modulos con datos de alumnos
   (condiciones, inasistencias, alertas, movimientos...) que no llevan el alumno
   en la ruta: un ?alumnoId= ajeno responde 403, los listados se recortan a los
   cursos permitidos y un detalle de un alumno ajeno responde 403. Para los
   roles sin restriccion devuelve la respuesta tal cual. */
export function conAlcanceEnRespuesta(handler) {
  return async (ctx) => {
    const consulta = ctx.url?.searchParams;
    exigirAccesoAlumno(ctx.user, consulta?.get("alumnoId") ?? consulta?.get("studentId"));

    const payload = await handler(ctx);
    const permitidos = cursosPermitidos(ctx.user);
    if (!permitidos) return payload;

    const envuelto = payload && Object.hasOwn(payload, "statusCode") && Object.hasOwn(payload, "body");
    const cuerpo = envuelto ? payload.body : payload;
    const visible = (item) => {
      const alumnoId = alumnoIdDe(item);
      return !alumnoId || alumnoEnCursos(studentRepository.findById(String(alumnoId)), permitidos);
    };

    let filtrado = cuerpo;
    if (Array.isArray(cuerpo?.data)) {
      filtrado = { ...cuerpo, data: cuerpo.data.filter(visible) };
    } else if (Array.isArray(cuerpo)) {
      filtrado = cuerpo.filter(visible);
    } else if (cuerpo?.data && !visible(cuerpo.data)) {
      throw sinAcceso();
    }

    return envuelto ? { ...payload, body: filtrado } : filtrado;
  };
}
