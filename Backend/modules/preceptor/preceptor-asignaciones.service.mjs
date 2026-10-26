import { ROLES } from "../../config/permissions.config.mjs";
import { userRepository } from "../../database/repositories/user.repository.mjs";
import studentRepository from "../students/students.repository.mjs";
import { DIVISIONES_CATALOGO } from "../students/catalogo.mjs";
import { cursosAsignadosPreceptor } from "../auth/alcance-cursos.service.mjs";
import { errorDeValidacion, noEncontrado } from "../../utils/api-error.mjs";

/* Asignacion de preceptores a divisiones (equivale a la tabla preceptor_cursos).

   Se guarda como asignaciones del usuario con rol preceptor y alcance de curso
   (anio + division), la misma forma que ya trae el seed y que lee el alcance
   por curso (modules/auth/alcance-cursos.service.mjs). Por eso un cambio de
   Direccion aplica en la siguiente peticion del preceptor: pantallas y
   autorizacion salen del mismo dato. Cada division tiene un preceptor a cargo. */

const ESCUELA_DEFECTO = "esc-1";

function escuelaDel(user) {
  return String(user?.assignments?.find((asignacion) => asignacion.schoolId)?.schoolId ?? ESCUELA_DEFECTO);
}

function nombreDe(usuario) {
  return [usuario.nombre, usuario.apellido].filter(Boolean).join(" ") || usuario.displayName || usuario.email;
}

function esPreceptor(usuario) {
  return (usuario?.assignments ?? []).some((asignacion) => asignacion.role === ROLES.PRECEPTOR);
}

function preceptoresActivos() {
  return userRepository.list().filter(esPreceptor);
}

function parseCurso(cursoId) {
  const coincidencia = /^(\d{1,2})-(\d{1,5})$/.exec(String(cursoId ?? "").trim());
  const division = coincidencia && DIVISIONES_CATALOGO.find(
    (item) => item.anio === Number(coincidencia[1]) && item.division === coincidencia[2]
  );

  if (!division) {
    throw errorDeValidacion([{ field: "cursoId", message: "La division indicada no existe en el catalogo." }]);
  }

  return division;
}

function asignacionDeCurso({ anio, division, turno }, schoolId) {
  return {
    role: ROLES.PRECEPTOR,
    schoolId,
    courseId: `${anio}-${division}`,
    anio,
    curso: `${anio}°`,
    division,
    shiftId: turno === "tarde" ? "tarde" : "manana",
    periodId: String(new Date().getFullYear())
  };
}

function esDelCurso(asignacion, clave) {
  if (asignacion.role !== ROLES.PRECEPTOR) return false;
  const propia = asignacion.anio && asignacion.division ? `${Number(asignacion.anio)}-${asignacion.division}` : asignacion.courseId;
  return propia === clave;
}

/* Saca la division del preceptor. Si era la ultima, conserva el rol preceptor
   sin curso: la cuenta sigue existiendo pero no ve alumnos hasta que Direccion
   le asigne una division. */
function quitarCursoDe(usuario, clave) {
  if (!usuario.assignments.some((asignacion) => esDelCurso(asignacion, clave))) {
    return;
  }

  const schoolId = usuario.assignments.find((asignacion) => asignacion.schoolId)?.schoolId ?? ESCUELA_DEFECTO;
  const restantes = usuario.assignments.filter((asignacion) => !esDelCurso(asignacion, clave));
  if (!restantes.some((asignacion) => asignacion.role === ROLES.PRECEPTOR)) {
    restantes.push({ role: ROLES.PRECEPTOR, schoolId });
  }

  userRepository.update(usuario.id, { assignments: restantes });
}

function vistaDivision(division, escuelaId, preceptores) {
  const clave = `${division.anio}-${division.division}`;
  const aCargo = preceptores.filter((usuario) => cursosAsignadosPreceptor(usuario).includes(clave));
  const activos = studentRepository.search({
    escuelaId,
    criterios: { estado: "activo", curso: division.anio, division: division.division },
    orden: "apellido"
  }).length;

  return {
    id: clave,
    anio: division.anio,
    division: division.division,
    turno: division.turno,
    orientacion: division.orientacion ?? "Ciclo Básico",
    activos,
    preceptor: aCargo[0] ? { id: aCargo[0].id, nombre: nombreDe(aCargo[0]), email: aCargo[0].email } : null,
    estado: aCargo.length ? "asignado" : "sin_asignar"
  };
}

function respuestaDivision(division, user) {
  return { statusCode: 200, body: { data: vistaDivision(division, escuelaDel(user), preceptoresActivos()) } };
}

/* GET /api/v1/preceptor/asignaciones */
function listar({ user }) {
  const escuelaId = escuelaDel(user);
  const preceptores = preceptoresActivos();

  return {
    statusCode: 200,
    body: {
      data: DIVISIONES_CATALOGO.map((division) => vistaDivision(division, escuelaId, preceptores)),
      preceptores: preceptores.map((usuario) => ({
        id: usuario.id,
        nombre: nombreDe(usuario),
        email: usuario.email,
        cursos: cursosAsignadosPreceptor(usuario)
      }))
    }
  };
}

/* PUT /api/v1/preceptor/asignaciones/:cursoId  { preceptorId } */
function asignar({ params, body, user }) {
  const division = parseCurso(params.cursoId);
  const clave = `${division.anio}-${division.division}`;
  const preceptorId = String(body?.preceptorId ?? "").trim();

  if (!preceptorId) {
    throw errorDeValidacion([{ field: "preceptorId", message: "Elegí el preceptor a cargo." }]);
  }

  const preceptor = userRepository.findById(preceptorId);

  if (!preceptor) {
    throw noEncontrado("El preceptor indicado");
  }

  if (!esPreceptor(preceptor)) {
    throw errorDeValidacion([{ field: "preceptorId", message: "La cuenta indicada no tiene el rol Preceptor." }]);
  }

  for (const otro of preceptoresActivos()) {
    if (otro.id !== preceptor.id) quitarCursoDe(otro, clave);
  }

  if (!cursosAsignadosPreceptor(preceptor).includes(clave)) {
    const schoolId = preceptor.assignments.find((asignacion) => asignacion.schoolId)?.schoolId ?? escuelaDel(user);
    /* La asignacion "solo rol" se reemplaza por la del curso. */
    const otras = preceptor.assignments.filter(
      (asignacion) => !(asignacion.role === ROLES.PRECEPTOR && !asignacion.anio && !asignacion.courseId)
    );
    userRepository.update(preceptor.id, { assignments: [...otras, asignacionDeCurso(division, schoolId)] });
  }

  return respuestaDivision(division, user);
}

/* DELETE /api/v1/preceptor/asignaciones/:cursoId */
function quitar({ params, user }) {
  const division = parseCurso(params.cursoId);
  const clave = `${division.anio}-${division.division}`;

  for (const preceptor of preceptoresActivos()) {
    quitarCursoDe(preceptor, clave);
  }

  return respuestaDivision(division, user);
}

export default { listar, asignar, quitar };
