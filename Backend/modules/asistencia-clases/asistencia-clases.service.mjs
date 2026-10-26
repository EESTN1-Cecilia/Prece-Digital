/* Asistencia por clase del docente.

   Una toma = una division ("<anio>-<division>", la misma clave que usa todo el
   alcance docente) + una materia + una fecha, con el estado de cada alumno
   activo de la division. Los estados son el catalogo institucional de la
   preceptoria (presente / ausente / tarde); la justificacion de una
   inasistencia sigue en el modulo de inasistencias.

   Reglas (todas en el backend, sin confiar en el navegador):
   - la identidad sale del token: el docente solo opera sobre los cursos que
     tiene asignados y sobre las materias que dicta en ese curso;
   - solo alumnos activos de la division, y todos: la politica es de registro
     completo, no se guardan tomas parciales;
   - una sola toma por division + materia + fecha (409 si se repite);
   - las correcciones las hace quien tomo la asistencia o un rol institucional,
     y quedan en el historial con usuario y fecha/hora. */

import { errorDeValidacion, errorHttp, noEncontrado, conflicto } from "../../utils/api-error.mjs";
import { transaction } from "../../database/memory-store.mjs";
import studentRepository from "../students/students.repository.mjs";
import teachersRepository from "../teachers/teachers.repository.mjs";
import { normalizarTexto } from "../teachers/catalogo.mjs";
import { ESTADOS_ASISTENCIA } from "../preceptor/preceptor.service.mjs";
import {
  cursosAsignadosDocente,
  cursosPermitidos,
  esDocenteRestringido,
  exigirAccesoCurso
} from "../auth/alcance-cursos.service.mjs";
import asistenciaClasesRepository from "./asistencia-clases.repository.mjs";

const ESCUELA_DEFECTO = "esc-1";
const CURSO_RE = /^(\d{1,2})-(\d{1,2})$/;
const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/;
const MATERIA_MAXIMO = 120;

const ETIQUETAS_ESTADO = {
  presente: "Presente",
  ausente: "Ausente",
  tarde: "Tardanza"
};

function escuelaDel(user) {
  return user?.assignments?.find((asignacion) => asignacion.schoolId)?.schoolId ?? ESCUELA_DEFECTO;
}

function partesCurso(cursoId) {
  const match = CURSO_RE.exec(String(cursoId ?? ""));
  return match ? { anio: Number(match[1]), division: String(Number(match[2])) } : null;
}

function exigirCurso(cursoId) {
  const partes = partesCurso(cursoId);

  if (!partes) {
    throw errorDeValidacion([{ field: "cursoId", message: "El curso debe tener la forma <año>-<división>, por ejemplo 1-1." }]);
  }

  return partes;
}

/* Fecha local de hoy en formato ISO corto (no UTC: una clase de la noche no
   puede quedar "en el futuro"). */
function hoy() {
  const ahora = new Date();
  const local = new Date(ahora.getTime() - ahora.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function esFechaValida(texto) {
  if (!FECHA_RE.test(String(texto ?? ""))) {
    return false;
  }

  const fecha = new Date(`${texto}T00:00:00Z`);
  return !Number.isNaN(fecha.getTime()) && fecha.toISOString().slice(0, 10) === texto;
}

/* Genero tal como esta cargado en el legajo; null si no hay dato (la planilla
   institucional lo usa para sus totales por varones y mujeres). */
function generoDe(alumno) {
  const valor = String(alumno.genero ?? "").trim().toLowerCase();
  if (valor.startsWith("f")) return "F";
  if (valor.startsWith("m")) return "M";
  return null;
}

/* Alumnos activos de la division, en orden alfabetico. Solo los datos que
   necesita la tarea docente: sin telefonos, domicilios ni familia. */
function alumnosDeDivision(escuelaId, { anio, division }) {
  return studentRepository
    .search({ escuelaId, criterios: { curso: anio, division, estado: "activo" }, orden: "apellido" })
    .map((alumno, indice) => ({
      orden: indice + 1,
      id: alumno.id,
      apellido: alumno.apellido,
      nombre: alumno.nombre,
      dni: alumno.dni,
      genero: generoDe(alumno),
      condicion: alumno.condicion ?? null
    }));
}

/* Materias que el usuario dicta en ese curso. Lista vacia = sin restriccion por
   materia (roles institucionales, o asignaciones sin materia cargada). */
function materiasDelCurso(user, cursoId) {
  if (!esDocenteRestringido(user)) {
    return [];
  }

  const curso = cursosAsignadosDocente(user).find((item) => item.id === cursoId);
  return (curso?.materias ?? []).filter(Boolean);
}

function validarMateria(user, cursoId, materia, errores) {
  const texto = typeof materia === "string" ? materia.trim() : "";

  if (!texto) {
    errores.push({ field: "materia", message: "La materia es obligatoria." });
    return null;
  }

  if (texto.length > MATERIA_MAXIMO) {
    errores.push({ field: "materia", message: `La materia no puede superar los ${MATERIA_MAXIMO} caracteres.` });
    return null;
  }

  const permitidas = materiasDelCurso(user, cursoId);

  if (permitidas.length && !permitidas.some((item) => normalizarTexto(item) === normalizarTexto(texto))) {
    throw errorHttp(403, "FORBIDDEN", "No tiene asignada esa materia en el curso indicado.");
  }

  return texto;
}

/* Valida la lista completa: cada alumno activo de la division, una sola vez,
   con un estado del catalogo. */
function validarRegistros(registros, alumnos, errores) {
  if (!Array.isArray(registros) || registros.length === 0) {
    errores.push({ field: "registros", message: "Registrá el estado de asistencia de los alumnos." });
    return null;
  }

  const idsDivision = new Set(alumnos.map((alumno) => alumno.id));
  const vistos = new Set();
  const limpios = [];

  registros.forEach((item, indice) => {
    const alumnoId = String(item?.alumnoId ?? "");
    const estado = String(item?.estado ?? "").toLowerCase();

    if (!idsDivision.has(alumnoId)) {
      errores.push({ field: `registros[${indice}].alumnoId`, message: "El alumno no pertenece a la división o no está activo." });
      return;
    }

    if (vistos.has(alumnoId)) {
      errores.push({ field: `registros[${indice}].alumnoId`, message: "El alumno figura más de una vez." });
      return;
    }

    if (!ESTADOS_ASISTENCIA.includes(estado)) {
      errores.push({ field: `registros[${indice}].estado`, message: "El estado debe ser presente, ausente o tarde." });
      return;
    }

    vistos.add(alumnoId);
    limpios.push({ alumnoId, estado });
  });

  const faltantes = alumnos.filter((alumno) => !vistos.has(alumno.id));

  if (!errores.length && faltantes.length) {
    errores.push({
      field: "registros",
      message: `Faltan ${faltantes.length} alumno(s) por registrar: la asistencia se guarda completa.`
    });
  }

  return limpios;
}

function resumen(registros) {
  const totales = { total: registros.length, presente: 0, ausente: 0, tarde: 0 };

  for (const item of registros) {
    totales[item.estado] += 1;
  }

  return totales;
}

function vistaClase(clase, { conAlumnos = false } = {}) {
  const base = {
    id: clase.id,
    cursoId: clase.cursoId,
    anio: clase.anio,
    division: clase.division,
    curso: `${clase.anio}° ${clase.division}°`,
    materia: clase.materia,
    fecha: clase.fecha,
    resumen: resumen(clase.registros),
    docenteUserId: clase.docenteUserId,
    creadoPor: clase.creadoPor,
    creadoEn: clase.creadoEn,
    actualizadoPor: clase.actualizadoPor,
    actualizadoEn: clase.actualizadoEn,
    correcciones: clase.historial.length
  };

  if (!conAlumnos) {
    return base;
  }

  return {
    ...base,
    registros: clase.registros.map((item) => {
      const alumno = studentRepository.findById(item.alumnoId);
      return {
        alumnoId: item.alumnoId,
        apellido: alumno?.apellido ?? null,
        nombre: alumno?.nombre ?? null,
        estado: item.estado
      };
    }),
    historial: clase.historial.map((entrada) => ({
      modificadoPor: entrada.modificadoPor,
      modificadoEn: entrada.modificadoEn,
      resumenAnterior: resumen(entrada.registrosAnteriores)
    }))
  };
}

function claseAccesible(user, id) {
  const clase = asistenciaClasesRepository.findById(id);

  if (!clase) {
    throw noEncontrado("La toma de asistencia");
  }

  exigirAccesoCurso(user, clase.cursoId);
  return clase;
}

const asistenciaClasesService = {
  catalogo() {
    return {
      statusCode: 200,
      body: {
        data: {
          estados: ESTADOS_ASISTENCIA.map((valor) => ({ valor, nombre: ETIQUETAS_ESTADO[valor] ?? valor })),
          politica: "completa"
        }
      }
    };
  },

  /* Lista de alumnos de un curso autorizado. */
  alumnosDeCurso(user, cursoId) {
    const partes = exigirCurso(cursoId);
    exigirAccesoCurso(user, cursoId);
    const alumnos = alumnosDeDivision(escuelaDel(user), partes);

    return {
      statusCode: 200,
      body: {
        data: alumnos,
        curso: { id: cursoId, anio: partes.anio, division: partes.division, materias: materiasDelCurso(user, cursoId) },
        total: alumnos.length
      }
    };
  },

  listar(user, query = {}) {
    const errores = [];

    for (const campo of ["desde", "hasta"]) {
      if (query[campo] && !esFechaValida(query[campo])) {
        errores.push({ field: campo, message: "La fecha debe tener el formato AAAA-MM-DD." });
      }
    }

    if (query.cursoId) {
      exigirCurso(query.cursoId);
      exigirAccesoCurso(user, query.cursoId);
    }

    if (errores.length) {
      throw errorDeValidacion(errores);
    }

    const lista = asistenciaClasesRepository.list({
      cursos: cursosPermitidos(user),
      cursoId: query.cursoId || null,
      materiaClave: query.materia ? normalizarTexto(query.materia) : null,
      desde: query.desde || null,
      hasta: query.hasta || null
    });

    /* incluirRegistros=1: cada toma trae los estados por alumno. Lo usa la
       planilla mensual para armar sus columnas sin pedir toma por toma. */
    const conRegistros = query.incluirRegistros === "1" || query.incluirRegistros === "true";
    const data = lista.map((clase) =>
      conRegistros
        ? { ...vistaClase(clase), registros: clase.registros.map((item) => ({ alumnoId: item.alumnoId, estado: item.estado })) }
        : vistaClase(clase)
    );

    return { statusCode: 200, body: { data, total: lista.length } };
  },

  obtener(user, id) {
    return { statusCode: 200, body: { data: vistaClase(claseAccesible(user, id), { conAlumnos: true }) } };
  },

  registrar(user, cuerpo = {}) {
    const partes = exigirCurso(cuerpo.cursoId);
    exigirAccesoCurso(user, cuerpo.cursoId);

    const errores = [];
    const materia = validarMateria(user, cuerpo.cursoId, cuerpo.materia, errores);
    const fecha = String(cuerpo.fecha ?? "");

    if (!esFechaValida(fecha)) {
      errores.push({ field: "fecha", message: "La fecha debe tener el formato AAAA-MM-DD." });
    } else if (fecha > hoy()) {
      errores.push({ field: "fecha", message: "No se puede registrar asistencia de una fecha futura." });
    }

    const escuelaId = escuelaDel(user);
    const alumnos = alumnosDeDivision(escuelaId, partes);

    if (!alumnos.length) {
      errores.push({ field: "cursoId", message: "La división no tiene alumnos activos." });
    }

    const registros = alumnos.length ? validarRegistros(cuerpo.registros, alumnos, errores) : null;

    if (errores.length) {
      throw errorDeValidacion(errores);
    }

    const materiaClave = normalizarTexto(materia);

    if (asistenciaClasesRepository.findByClase({ cursoId: cuerpo.cursoId, materiaClave, fecha })) {
      throw conflicto("Ya se registró la asistencia de esta materia en esta división para esa fecha. Abrila desde el historial para corregirla.");
    }

    const docente = teachersRepository.findDocenteByUserId(user.id);
    const clase = asistenciaClasesRepository.create({
      escuelaId,
      cursoId: cuerpo.cursoId,
      anio: partes.anio,
      division: partes.division,
      materia,
      materiaClave,
      fecha,
      registros,
      docenteUserId: user.id,
      docenteId: docente?.id ?? null,
      creadoPor: user.id
    });

    return { statusCode: 201, body: { data: vistaClase(clase, { conAlumnos: true }) } };
  },

  /* Guarda varios dias de una planilla mensual (division + materia) de una sola
     vez: cada dia nuevo se registra y cada dia ya tomado se corrige. Todo se
     valida antes de escribir: si un dia falla, no se guarda ninguno. */
  guardarPlanilla(user, cuerpo = {}) {
    const partes = exigirCurso(cuerpo.cursoId);
    exigirAccesoCurso(user, cuerpo.cursoId);

    const errores = [];
    const materia = validarMateria(user, cuerpo.cursoId, cuerpo.materia, errores);
    const dias = Array.isArray(cuerpo.tomas) ? cuerpo.tomas : null;

    if (!dias || dias.length === 0) {
      errores.push({ field: "tomas", message: "No hay días para guardar." });
    }

    if (errores.length) {
      throw errorDeValidacion(errores);
    }

    const escuelaId = escuelaDel(user);
    const alumnos = alumnosDeDivision(escuelaId, partes);
    const materiaClave = normalizarTexto(materia);
    const vistas = new Set();
    const operaciones = [];

    dias.forEach((dia, indice) => {
      const fecha = String(dia?.fecha ?? "");
      const erroresDia = [];

      if (!esFechaValida(fecha)) {
        erroresDia.push({ field: `tomas[${indice}].fecha`, message: "La fecha debe tener el formato AAAA-MM-DD." });
      } else if (fecha > hoy()) {
        erroresDia.push({ field: `tomas[${indice}].fecha`, message: `No se puede registrar asistencia del ${fecha}: es una fecha futura.` });
      } else if (vistas.has(fecha)) {
        erroresDia.push({ field: `tomas[${indice}].fecha`, message: `El día ${fecha} figura más de una vez.` });
      }

      vistas.add(fecha);
      const registros = validarRegistros(dia?.registros, alumnos, erroresDia);
      errores.push(...erroresDia.map((error) => ({ ...error, message: fecha ? `${fecha}: ${error.message}` : error.message })));

      if (erroresDia.length) {
        return;
      }

      const existente = asistenciaClasesRepository.findByClase({ cursoId: cuerpo.cursoId, materiaClave, fecha });

      if (existente && esDocenteRestringido(user) && existente.docenteUserId !== user.id) {
        throw errorHttp(403, "FORBIDDEN", `La asistencia del ${fecha} la tomó otra persona: solo ella puede corregirla.`);
      }

      operaciones.push({ fecha, registros, existente });
    });

    if (errores.length) {
      throw errorDeValidacion(errores);
    }

    const docente = teachersRepository.findDocenteByUserId(user.id);
    const guardadas = transaction(() =>
      operaciones.map(({ fecha, registros, existente }) =>
        existente
          ? asistenciaClasesRepository.corregir(existente.id, { registros, actorId: user.id })
          : asistenciaClasesRepository.create({
              escuelaId,
              cursoId: cuerpo.cursoId,
              anio: partes.anio,
              division: partes.division,
              materia,
              materiaClave,
              fecha,
              registros,
              docenteUserId: user.id,
              docenteId: docente?.id ?? null,
              creadoPor: user.id
            })
      )
    );

    return {
      statusCode: 200,
      body: {
        data: guardadas.map((clase) => vistaClase(clase)),
        registradas: operaciones.filter((item) => !item.existente).length,
        corregidas: operaciones.filter((item) => item.existente).length
      }
    };
  },

  corregir(user, id, cuerpo = {}) {
    const clase = claseAccesible(user, id);

    if (esDocenteRestringido(user) && clase.docenteUserId !== user.id) {
      throw errorHttp(403, "FORBIDDEN", "Solo quien tomó la asistencia puede corregirla.");
    }

    const errores = [];
    const alumnos = alumnosDeDivision(clase.escuelaId, { anio: clase.anio, division: clase.division });
    const registros = validarRegistros(cuerpo.registros, alumnos, errores);

    if (errores.length) {
      throw errorDeValidacion(errores);
    }

    const corregida = asistenciaClasesRepository.corregir(id, { registros, actorId: user.id });
    return { statusCode: 200, body: { data: vistaClase(corregida, { conAlumnos: true }) } };
  }
};

export default asistenciaClasesService;
