import studentRepository from "../students/students.repository.mjs";
import boletinesRepository from "./boletines.repository.mjs";
import { alumnosDelCurso } from "../preceptor/preceptor.service.mjs";
import { exigirAccesoCurso } from "../auth/alcance-cursos.service.mjs";
import { errorDeValidacion, noEncontrado } from "../../utils/api-error.mjs";

/* Boletin de calificaciones compartido.

   - Secretaria / Direccion (students.write) editan el boletin completo desde el
     Boletin Digital.
   - El docente (grades.write) carga una materia para todo el curso desde su
     planilla; solo toca esa materia y solo en sus cursos.
   - Preceptoria y los demas roles con students.read lo leen (alcance por curso).

   Las notas se guardan como las escribe la planilla oficial: numero de 1 a 10
   (hasta dos decimales, con coma o punto), una valoracion TEA / TEP / TED, "-"
   o vacio. No se calcula ni se completa ninguna nota en el servidor. */

const ESCUELA_DEFECTO = "esc-1";
const CAMPOS_NOTA = ["informe1", "informe2", "promedioAnual", "diciembre", "febrero", "definitiva"];
const CAMPOS_DETALLE = ["p1", "p2", "v1", "f1", "p3", "p4", "v2", "f2"];
const MAX_MATERIAS_POR_CARGA = 6;
const MAX_TEXTO = 10;

function escuelaDel(user) {
  return String(user?.assignments?.find((asignacion) => asignacion.schoolId)?.schoolId ?? ESCUELA_DEFECTO);
}

export function notaValida(valor) {
  const texto = String(valor ?? "").trim();
  if (texto === "" || texto === "-") return true;
  if (/^(TEA|TEP|TED)$/i.test(texto)) return true;
  if (!/^\d{1,2}([.,]\d{1,2})?$/.test(texto)) return false;
  const numero = Number(texto.replace(",", "."));
  return numero >= 1 && numero <= 10;
}

function leerAnio(valor, alumno, errores) {
  if (valor === undefined || valor === null || valor === "") {
    return Number(alumno?.curso) || null;
  }
  const anio = Number(valor);
  if (!Number.isInteger(anio) || anio < 1 || anio > 7) {
    errores.push({ field: "anio", message: "El anio de cursada debe estar entre 1 y 7." });
    return null;
  }
  return anio;
}

function leerNotas(origen, campo, errores) {
  const notas = {};
  for (const nombre of CAMPOS_NOTA) {
    if (origen?.[nombre] === undefined) continue;
    const texto = String(origen[nombre] ?? "").trim();
    if (!notaValida(texto)) {
      errores.push({ field: `${campo}.${nombre}`, message: "La nota debe ser un numero de 1 a 10, TEA, TEP, TED o quedar vacia." });
      continue;
    }
    notas[nombre] = texto.toUpperCase();
  }
  return notas;
}

function leerDetalle(origen) {
  if (!origen || typeof origen !== "object") return undefined;
  const detalle = {};
  for (const nombre of CAMPOS_DETALLE) {
    if (origen[nombre] !== undefined && origen[nombre] !== null) {
      detalle[nombre] = String(origen[nombre]).trim().slice(0, MAX_TEXTO);
    }
  }
  return detalle;
}

function vacio(alumnoId, anio) {
  return { alumnoId, anio, calificaciones: {}, materiasPendientes: [], inasistencias: null, actualizadoEn: null, actualizadoPor: null };
}

function vista(registro) {
  return {
    alumnoId: registro.alumnoId,
    anio: registro.anio,
    calificaciones: registro.calificaciones,
    materiasPendientes: registro.materiasPendientes,
    inasistencias: registro.inasistencias,
    actualizadoEn: registro.actualizadoEn,
    actualizadoPor: registro.actualizadoPor
  };
}

function alumnoDeLaEscuela(alumnoId, user) {
  const alumno = studentRepository.findById(String(alumnoId ?? ""));
  if (!alumno || alumno.escuelaId !== escuelaDel(user)) {
    throw noEncontrado("El alumno");
  }
  return alumno;
}

/* GET /api/v1/boletines/alumno/:alumnoId?anio= */
function obtenerDeAlumno({ params, url, user }) {
  const alumno = alumnoDeLaEscuela(params.alumnoId, user);
  const errores = [];
  const anio = leerAnio(url.searchParams.get("anio"), alumno, errores);
  if (errores.length) throw errorDeValidacion(errores);

  return { statusCode: 200, body: { data: vista(boletinesRepository.find(alumno.id, anio) ?? vacio(alumno.id, anio)) } };
}

/* PUT /api/v1/boletines/alumno/:alumnoId  { anio, calificaciones, materiasPendientes, inasistencias }
   Las materias enviadas reemplazan a las guardadas; las demas se conservan. */
function guardarDeAlumno({ params, body, user }) {
  const alumno = alumnoDeLaEscuela(params.alumnoId, user);
  const cuerpo = body && typeof body === "object" ? body : {};
  const errores = [];
  const anio = leerAnio(cuerpo.anio, alumno, errores);
  const calificaciones = {};

  if (cuerpo.calificaciones !== undefined && (typeof cuerpo.calificaciones !== "object" || Array.isArray(cuerpo.calificaciones))) {
    errores.push({ field: "calificaciones", message: "Las calificaciones deben ser un objeto por materia." });
  } else {
    for (const [materia, notas] of Object.entries(cuerpo.calificaciones ?? {})) {
      if (!materia.trim() || materia.length > 120) {
        errores.push({ field: "calificaciones", message: "Hay una materia sin nombre o con un nombre demasiado largo." });
        continue;
      }
      calificaciones[materia] = leerNotas(notas, `calificaciones.${materia}`, errores);
    }
  }

  if (cuerpo.materiasPendientes !== undefined && !Array.isArray(cuerpo.materiasPendientes)) {
    errores.push({ field: "materiasPendientes", message: "Las materias pendientes deben ser una lista." });
  }

  if (errores.length) throw errorDeValidacion(errores);

  const registro = boletinesRepository.find(alumno.id, anio) ?? vacio(alumno.id, anio);
  const ahora = new Date().toISOString();

  for (const [materia, notas] of Object.entries(calificaciones)) {
    registro.calificaciones[materia] = { ...registro.calificaciones[materia], ...notas, actualizadoPor: user?.id ?? null, actualizadoEn: ahora };
  }

  if (Array.isArray(cuerpo.materiasPendientes)) {
    registro.materiasPendientes = cuerpo.materiasPendientes.slice(0, 20).map((fila) =>
      Object.fromEntries(Object.entries(fila ?? {}).map(([campo, valor]) => [campo, String(valor ?? "").slice(0, 80)]))
    );
  }

  if (cuerpo.inasistencias && typeof cuerpo.inasistencias === "object") {
    registro.inasistencias = Object.fromEntries(Object.entries(cuerpo.inasistencias).map(([campo, valor]) => [campo, String(valor ?? "").slice(0, 10)]));
  }

  registro.actualizadoEn = ahora;
  registro.actualizadoPor = user?.id ?? null;

  return { statusCode: 200, body: { data: vista(boletinesRepository.guardar(registro)) } };
}

function cursoValido(cursoId) {
  const coincidencia = /^([1-7])-(\d{1,5})$/.exec(String(cursoId ?? ""));
  if (!coincidencia) {
    throw errorDeValidacion([{ field: "cursoId", message: "El curso debe tener el formato anio-division, por ejemplo 1-1." }]);
  }
  return { anio: Number(coincidencia[1]), division: coincidencia[2], cursoId: `${coincidencia[1]}-${coincidencia[2]}` };
}

/* GET /api/v1/boletines/curso/:cursoId
   Boletines de los alumnos activos del curso, en orden de lista. */
function deCurso({ params, user }) {
  const curso = cursoValido(params.cursoId);
  exigirAccesoCurso(user, curso.cursoId);

  const data = alumnosDelCurso(curso.anio, curso.division, escuelaDel(user)).map((alumno, indice) => ({
    orden: indice + 1,
    alumno: { id: alumno.id, apellido: alumno.apellido, nombre: alumno.nombre, curso: alumno.curso, division: alumno.division },
    boletin: vista(boletinesRepository.find(alumno.id, curso.anio) ?? vacio(alumno.id, curso.anio))
  }));

  return { statusCode: 200, body: { data, contexto: { cursoId: curso.cursoId, anio: curso.anio, division: curso.division } } };
}

/* PUT /api/v1/boletines/curso/:cursoId/materia
   { materias: ["MATEMÁTICA", ...], notas: [{ alumnoId, informe1, informe2, promedioAnual, diciembre, febrero, definitiva, detalle }] }
   La planilla del docente: escribe una materia (bajo sus nombres equivalentes
   del plan) para los alumnos del curso, todo o nada. */
function guardarMateriaDeCurso({ params, body, user }) {
  const curso = cursoValido(params.cursoId);
  exigirAccesoCurso(user, curso.cursoId);

  const cuerpo = body && typeof body === "object" ? body : {};
  const errores = [];
  const materias = Array.isArray(cuerpo.materias)
    ? [...new Set(cuerpo.materias.map((materia) => String(materia ?? "").trim()).filter(Boolean))]
    : [];

  if (!materias.length || materias.length > MAX_MATERIAS_POR_CARGA || materias.some((materia) => materia.length > 120)) {
    errores.push({ field: "materias", message: "Indique la materia de la planilla." });
  }

  const delCurso = new Set(alumnosDelCurso(curso.anio, curso.division, escuelaDel(user)).map((alumno) => alumno.id));
  const notas = Array.isArray(cuerpo.notas) ? cuerpo.notas : [];

  if (!notas.length || notas.length > 100) {
    errores.push({ field: "notas", message: "La planilla debe traer entre 1 y 100 alumnos." });
  }

  const preparadas = notas.map((fila, indice) => {
    if (!delCurso.has(String(fila?.alumnoId ?? ""))) {
      errores.push({ field: `notas[${indice}].alumnoId`, message: "El alumno no pertenece al curso." });
      return null;
    }
    return { alumnoId: String(fila.alumnoId), notas: leerNotas(fila, `notas[${indice}]`, errores), detalle: leerDetalle(fila.detalle) };
  });

  if (errores.length) throw errorDeValidacion(errores);

  const ahora = new Date().toISOString();
  for (const fila of preparadas) {
    const registro = boletinesRepository.find(fila.alumnoId, curso.anio) ?? vacio(fila.alumnoId, curso.anio);
    for (const materia of materias) {
      registro.calificaciones[materia] = {
        ...registro.calificaciones[materia],
        ...fila.notas,
        ...(fila.detalle ? { detalle: fila.detalle } : {}),
        actualizadoPor: user?.id ?? null,
        actualizadoEn: ahora
      };
    }
    registro.actualizadoEn = ahora;
    registro.actualizadoPor = user?.id ?? null;
    boletinesRepository.guardar(registro);
  }

  return deCurso({ params, user });
}

export default { obtenerDeAlumno, guardarDeAlumno, deCurso, guardarMateriaDeCurso };
