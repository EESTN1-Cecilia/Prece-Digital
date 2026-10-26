import studentRepository from "../students/students.repository.mjs";
import { buscarDivision, DIVISIONES_CATALOGO } from "../students/catalogo.mjs";
import preceptorRepository from "./preceptor.repository.mjs";
import schedulesRepository from "../schedules/schedules.repository.mjs";
import spacesRepository from "../spaces/spaces.repository.mjs";
import teachersRepository from "../teachers/teachers.repository.mjs";
import academicRepository from "../academic/academic.repository.mjs";
import { errorDeValidacion, noEncontrado } from "../../utils/api-error.mjs";
import boletinesRepository from "../boletines/boletines.repository.mjs";
import { cursosPermitidos, esCuentaRestringida, exigirAccesoAlumno, exigirAccesoCurso } from "../auth/alcance-cursos.service.mjs";

const ESCUELA_DEFECTO = "esc-1";
const ANIOS_VALIDOS = [1, 2, 3, 4, 5, 6, 7];
/* Catalogo unico de estados de asistencia: lo reusa la asistencia por clase
   del docente (modules/asistencia-clases). */
export const ESTADOS_ASISTENCIA = ["presente", "ausente", "tarde"];
const ALIAS_ESTADO = {
  p: "presente",
  presente: "presente",
  a: "ausente",
  ausente: "ausente",
  t: "tarde",
  tarde: "tarde",
  "media_falta": "tarde",
  "media falta": "tarde"
};
const DIAS = ["Domingo", "Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado"];
const TIPOS_AULA = ["aula", "laboratorio", "taller", "sum", "biblioteca", "gimnasio"];

function normalizarTexto(valor) {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function escuelaDel(user) {
  return String(user?.assignments?.find((asignacion) => asignacion.schoolId)?.schoolId ?? ESCUELA_DEFECTO);
}

function fechaLocal(valor = new Date()) {
  const anio = valor.getFullYear();
  const mes = String(valor.getMonth() + 1).padStart(2, "0");
  const dia = String(valor.getDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
}

function horaLocal(valor = new Date()) {
  return `${String(valor.getHours()).padStart(2, "0")}:${String(valor.getMinutes()).padStart(2, "0")}`;
}

function validarFecha(valor, errores, campo = "fecha") {
  if (valor == null || String(valor).trim() === "") {
    return fechaLocal();
  }

  const fecha = String(valor).trim();
  const patron = /^\d{4}-\d{2}-\d{2}$/;

  if (!patron.test(fecha)) {
    errores.push({ field: campo, message: "La fecha debe tener el formato AAAA-MM-DD." });
    return null;
  }

  const [anio, mes, dia] = fecha.split("-").map(Number);
  const fechaObjeto = new Date(anio, mes - 1, dia);

  if (
    fechaObjeto.getFullYear() !== anio ||
    fechaObjeto.getMonth() !== mes - 1 ||
    fechaObjeto.getDate() !== dia
  ) {
    errores.push({ field: campo, message: "La fecha indicada no es valida." });
    return null;
  }

  if (fecha > fechaLocal()) {
    errores.push({ field: campo, message: "No se puede registrar asistencia de una fecha futura." });
    return null;
  }

  return fecha;
}

function parseCursoId(valor, errores) {
  const texto = String(valor ?? "").trim();
  const coincidencia = /^(\d{1,2})-(\d{1,5})$/.exec(texto);

  if (!coincidencia) {
    errores.push({ field: "cursoId", message: "El curso debe tener el formato anio-division, por ejemplo 1-1." });
    return null;
  }

  const anio = Number(coincidencia[1]);
  const division = coincidencia[2];

  if (!ANIOS_VALIDOS.includes(anio)) {
    errores.push({ field: "cursoId", message: "El anio del curso debe estar entre 1 y 7." });
    return null;
  }

  return { anio, division, cursoId: `${anio}-${division}` };
}

function normalizarEstado(valor) {
  return ALIAS_ESTADO[normalizarTexto(valor)] ?? null;
}

function etiquetaCurso(anio, division) {
  return `${anio}\u00b0 ${division}`;
}

function vistaAlumno(alumno, asistencia) {
  return {
    id: alumno.id,
    nombre: alumno.nombre,
    apellido: alumno.apellido,
    nombreCompleto: `${alumno.apellido}, ${alumno.nombre}`,
    dni: alumno.dni,
    curso: alumno.curso,
    division: alumno.division,
    cursoLabel: etiquetaCurso(alumno.curso, alumno.division),
    turno: alumno.turno,
    orientacion: alumno.orientacion,
    condicion: alumno.condicion,
    asistencia: asistencia
      ? {
          estado: asistencia.estado,
          observaciones: asistencia.observaciones,
          actualizadoEn: asistencia.actualizadoEn
        }
      : null
  };
}

function vistaRegistro(registro, alumno) {
  return {
    id: registro.id,
    alumnoId: registro.alumnoId,
    alumno: alumno ? `${alumno.apellido}, ${alumno.nombre}` : null,
    cursoId: registro.cursoId,
    anio: registro.anio,
    division: registro.division,
    fecha: registro.fecha,
    estado: registro.estado,
    observaciones: registro.observaciones,
    registradoPor: registro.registradoPor,
    actualizadoEn: registro.actualizadoEn
  };
}

function resumenAsistencias(alumnos) {
  const resumen = { total: alumnos.length, presentes: 0, ausentes: 0, tarde: 0, sinRegistrar: 0 };

  for (const alumno of alumnos) {
    const estado = alumno.asistencia?.estado;

    if (estado === "presente") resumen.presentes++;
    else if (estado === "ausente") resumen.ausentes++;
    else if (estado === "tarde") resumen.tarde++;
    else resumen.sinRegistrar++;
  }

  return resumen;
}

function contextoCurso(anio, division, alumnos) {
  const catalogo = buscarDivision(anio, division);
  const primero = alumnos[0];

  return {
    cursoId: `${anio}-${division}`,
    anio,
    division,
    curso: `${anio}\u00b0`,
    cursoLabel: etiquetaCurso(anio, division),
    turno: catalogo?.turno ?? primero?.turno ?? null,
    orientacion: catalogo?.orientacion ?? primero?.orientacion ?? null
  };
}

function espacioPlanta(space) {
  if (space.floor == null) return "Sin piso";
  if (space.floor === 1) return "Planta baja";
  if (space.floor === 2) return "Planta alta";
  return `Piso ${space.floor}`;
}

function resolverCursoAsignacion(assignment) {
  const curso = assignment.courseId ? academicRepository.findCursoById(assignment.courseId) : null;
  const division = assignment.divisionId ? academicRepository.findDivisionById(assignment.divisionId) : null;
  const anio = curso?.anio ?? null;
  const divisionNombre = division?.nombre ?? null;

  return {
    cursoId: assignment.courseId ?? null,
    divisionId: assignment.divisionId ?? null,
    curso: anio != null && divisionNombre ? `${anio}\u00b0 ${divisionNombre}` : (anio != null ? `${anio}\u00b0` : null)
  };
}

function vistaClase(assignment) {
  const docente = assignment.teacherId ? teachersRepository.findDocenteById(assignment.teacherId) : null;
  const materia = assignment.subjectId ? academicRepository.findSubjectRefById(assignment.subjectId) : null;
  const curso = resolverCursoAsignacion(assignment);

  return {
    id: assignment.id,
    desde: assignment.startTime,
    hasta: assignment.endTime,
    materia: materia?.nombre ?? null,
    materiaId: assignment.subjectId ?? null,
    docente: docente ? { id: docente.id, nombre: `${docente.apellido}, ${docente.nombre}` } : null,
    curso: curso.curso,
    cursoId: curso.cursoId,
    divisionId: curso.divisionId
  };
}

function listarAlumnos({ params, url, user }) {
  const errores = [];
  const curso = parseCursoId(params.cursoId, errores);
  const fecha = validarFecha(url.searchParams.get("fecha"), errores);

  if (errores.length) {
    throw errorDeValidacion(errores);
  }

  exigirAccesoCurso(user, `${curso.anio}-${curso.division}`);

  const escuelaId = escuelaDel(user);
  const alumnos = alumnosDelCurso(curso.anio, curso.division, escuelaId);

  if (alumnos.length === 0) {
    const catalogo = buscarDivision(curso.anio, curso.division);

    if (!catalogo) {
      throw noEncontrado("El curso solicitado");
    }
  }

  const asistencias = new Map(
    preceptorRepository
      .listPorFecha({ alumnoIds: alumnos.map((alumno) => alumno.id), fecha })
      .map((registro) => [registro.alumnoId, registro])
  );

  const data = alumnos.map((alumno) => vistaAlumno(alumno, asistencias.get(alumno.id)));

  return {
    statusCode: 200,
    body: {
      data,
      contexto: {
        ...contextoCurso(curso.anio, curso.division, alumnos),
        fecha
      },
      resumen: resumenAsistencias(data)
    }
  };
}

function registrarAsistencia({ body, user }) {
  const errores = [];
  const cuerpo = body && typeof body === "object" ? body : {};
  const items = Array.isArray(cuerpo.registros) ? cuerpo.registros : [cuerpo];

  if (items.length === 0) {
    errores.push({ field: "registros", message: "Debe indicar al menos un registro de asistencia." });
  }

  if (items.length > 100) {
    errores.push({ field: "registros", message: "No se pueden registrar mas de 100 alumnos por solicitud." });
  }

  const escuelaId = escuelaDel(user);
  const preparados = [];

  items.forEach((item, indice) => {
    if (!item || typeof item !== "object") {
      errores.push({ field: `registros[${indice}]`, message: "El registro de asistencia no es valido." });
      return;
    }

    const alumnoId = String(item.alumnoId ?? "").trim();

    if (!alumnoId) {
      errores.push({ field: `registros[${indice}].alumnoId`, message: "El alumno es obligatorio." });
      return;
    }

    const alumno = studentRepository.findById(alumnoId);

    if (!alumno || alumno.escuelaId !== escuelaId) {
      errores.push({ field: `registros[${indice}].alumnoId`, message: "El alumno indicado no existe." });
      return;
    }

    exigirAccesoAlumno(user, alumno.id);

    if (!alumno.isActive) {
      errores.push({ field: `registros[${indice}].alumnoId`, message: "El alumno se encuentra inactivo." });
      return;
    }

    const estado = normalizarEstado(item.estado);

    if (!estado || !ESTADOS_ASISTENCIA.includes(estado)) {
      errores.push({ field: `registros[${indice}].estado`, message: "El estado debe ser presente, ausente o tarde." });
      return;
    }

    const cursoIdRaw = item.cursoId ?? cuerpo.cursoId;
    let curso = { anio: alumno.curso, division: alumno.division, cursoId: `${alumno.curso}-${alumno.division}` };

    if (cursoIdRaw != null && String(cursoIdRaw).trim() !== "") {
      const cursoIndicado = parseCursoId(cursoIdRaw, errores);

      if (!cursoIndicado) {
        return;
      }

      if (cursoIndicado.anio !== alumno.curso || cursoIndicado.division !== alumno.division) {
        errores.push({
          field: `registros[${indice}].cursoId`,
          message: "El alumno no pertenece al curso indicado."
        });
        return;
      }

      curso = cursoIndicado;
    }

    const fecha = validarFecha(item.fecha ?? cuerpo.fecha, errores, `registros[${indice}].fecha`);

    if (!fecha) {
      return;
    }

    const observaciones = item.observaciones == null ? null : String(item.observaciones).trim();

    if (observaciones && observaciones.length > 255) {
      errores.push({
        field: `registros[${indice}].observaciones`,
        message: "Las observaciones no pueden superar los 255 caracteres."
      });
      return;
    }

    preparados.push({ alumno, curso, fecha, estado, observaciones: observaciones || null });
  });

  if (errores.length) {
    throw errorDeValidacion(errores);
  }

  const guardados = preparados.map(({ alumno, curso, fecha, estado, observaciones }) =>
    preceptorRepository.upsert({
      alumnoId: alumno.id,
      fecha,
      escuelaId,
      cursoId: curso.cursoId,
      anio: curso.anio,
      division: curso.division,
      estado,
      observaciones,
      registradoPor: user?.id ?? null
    })
  );

  const alumnos = guardados.map((registro) => studentRepository.findById(registro.alumnoId));
  const resumen = guardados.reduce(
    (acumulado, registro) => {
      acumulado[registro.estado] = (acumulado[registro.estado] ?? 0) + 1;
      return acumulado;
    },
    { presente: 0, ausente: 0, tarde: 0 }
  );

  return {
    statusCode: 200,
    body: {
      data: guardados.map((registro, indice) => vistaRegistro(registro, alumnos[indice])),
      resumen: { total: guardados.length, ...resumen }
    }
  };
}

function normalizarDia(valor, fecha) {
  if (!valor) {
    return DIAS[new Date(`${fecha}T00:00:00`).getDay()];
  }

  const buscado = normalizarTexto(valor);
  return DIAS.find((dia) => normalizarTexto(dia) === buscado) ?? null;
}

function estadoAulas({ url, user }) {
  const errores = [];
  const fecha = validarFecha(url.searchParams.get("fecha"), errores);
  const horaRaw = url.searchParams.get("hora");
  const hora = horaRaw == null || String(horaRaw).trim() === "" ? horaLocal() : String(horaRaw).trim();

  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(hora)) {
    errores.push({ field: "hora", message: "La hora debe tener el formato HH:MM." });
  }

  if (errores.length) {
    throw errorDeValidacion(errores);
  }

  const dia = normalizarDia(url.searchParams.get("dia"), fecha);

  if (!dia) {
    throw errorDeValidacion([{ field: "dia", message: "El dia indicado no es valido." }]);
  }

  const escuelaId = escuelaDel(user);
  const espacios = spacesRepository.listSpaces({ schoolId: escuelaId, includeInactive: true });
  const asignaciones = schedulesRepository.listAssignments({ schoolId: escuelaId, dayOfWeek: dia });
  const aulas = espacios.filter((space) => TIPOS_AULA.includes(String(space.type).toLowerCase()));
  const visibles = aulas.length > 0 ? aulas : espacios;

  const data = visibles.map((space) => {
    const delEspacio = asignaciones.filter((assignment) => assignment.spaceId === space.id);
    const actual = delEspacio.find(
      (assignment) => assignment.startTime <= hora && assignment.endTime > hora
    );
    const siguiente = delEspacio
      .filter((assignment) => assignment.startTime > hora)
      .sort((a, b) => a.startTime.localeCompare(b.startTime))[0];

    const mantenimiento = !space.isActive || space.status === "mantenimiento";

    return {
      id: space.id,
      nombre: space.name,
      codigo: space.code,
      tipo: space.type,
      capacidad: space.capacity,
      piso: space.floor,
      planta: espacioPlanta(space),
      sector: space.sector,
      estado: mantenimiento ? "mantenimiento" : (actual ? "ocupada" : "libre"),
      claseActual: actual ? vistaClase(actual) : null,
      proximaClase: !actual && siguiente ? vistaClase(siguiente) : null
    };
  });

  const resumen = {
    total: data.length,
    ocupadas: data.filter((aula) => aula.estado === "ocupada").length,
    libres: data.filter((aula) => aula.estado === "libre").length,
    mantenimiento: data.filter((aula) => aula.estado === "mantenimiento").length
  };

  return {
    statusCode: 200,
    body: {
      data,
      contexto: { fecha, hora, dia, turno: Number(hora.slice(0, 2)) < 13 ? "manana" : "tarde" },
      resumen
    }
  };
}

/* Divisiones visibles para el usuario: las asignadas si es una cuenta con
   alcance por curso (preceptor o docente), o el catalogo completo para los
   roles institucionales. Cada una con su matricula activa. */
function divisionesVisibles(user) {
  const escuelaId = escuelaDel(user);
  const permitidos = cursosPermitidos(user);
  const claves = permitidos
    ? [...permitidos]
    : DIVISIONES_CATALOGO.map(({ anio, division }) => `${anio}-${division}`);

  return claves
    .map((clave) => {
      const [anioTexto, division] = clave.split("-");
      const anio = Number(anioTexto);
      const catalogo = buscarDivision(anio, division);
      const cantidadAlumnos = studentRepository.search({
        escuelaId,
        criterios: { estado: "activo", curso: anio, division },
        orden: "apellido"
      }).length;

      return {
        id: clave,
        courseId: clave,
        anio,
        division,
        curso: `${anio}°`,
        cursoLabel: etiquetaCurso(anio, division),
        turno: catalogo?.turno ?? null,
        orientacion: catalogo?.orientacion ?? (anio <= 3 ? "Ciclo Básico" : null),
        cantidadAlumnos,
        schoolId: escuelaId
      };
    })
    .sort((a, b) => a.anio - b.anio || Number(a.division) - Number(b.division));
}

/* GET /api/v1/preceptor/mis-cursos
   `restringido` indica si el backend limita al usuario a esos cursos. */
function misCursos({ user }) {
  return {
    statusCode: 200,
    body: { data: divisionesVisibles(user), restringido: esCuentaRestringida(user) }
  };
}

function exigirCursoValido(cursoId) {
  const errores = [];
  const curso = parseCursoId(cursoId, errores);

  if (errores.length) {
    throw errorDeValidacion(errores);
  }

  return curso;
}

const ORDEN_DE_LISTA = new Intl.Collator("es", { sensitivity: "base" });

/* Alumnos activos en orden de lista: apellido y nombre sin distinguir
   mayusculas ni acentos (la lista, la planilla y los boletines comparten el
   mismo numero de orden). */
export function alumnosDelCurso(anio, division, escuelaId) {
  return studentRepository
    .search({ escuelaId, criterios: { estado: "activo", curso: anio, division }, orden: "apellido" })
    .sort((a, b) => ORDEN_DE_LISTA.compare(a.apellido, b.apellido) || ORDEN_DE_LISTA.compare(a.nombre, b.nombre));
}

/* ---------------- Boletines ----------------------------------------------
   Salen del boletin compartido (modules/boletines): el mismo que edita
   Secretaria en el Boletin Digital y que completa cada docente desde su
   planilla. No se completa ninguna nota: lo que falta llega vacio y el
   frontend lo muestra como faltante. El preceptor solo lee. */

const CAMPOS_NOTA = ["informe1", "informe2", "promedioAnual", "diciembre", "febrero", "definitiva"];

function soloNotas(calificaciones = {}) {
  return Object.fromEntries(
    Object.entries(calificaciones).map(([materia, notas]) => [
      materia,
      Object.fromEntries(CAMPOS_NOTA.map((campo) => [campo, notas?.[campo] ?? ""]))
    ])
  );
}

function boletinDeAlumno(alumno, anio, cicloLectivo, inasistencias) {
  const registro = boletinesRepository.find(alumno.id, anio);

  return {
    alumno: {
      id: alumno.id,
      apellido: alumno.apellido,
      nombre: alumno.nombre,
      nombreCompleto: `${alumno.apellido}, ${alumno.nombre}`,
      curso: alumno.curso,
      division: alumno.division
    },
    anio,
    cicloLectivo,
    calificaciones: soloNotas(registro?.calificaciones),
    materiasPendientes: registro?.materiasPendientes ?? [],
    inasistencias: {
      ...(inasistencias ?? { ausentes: 0, tardes: 0, registradas: 0 }),
      total: registro?.inasistencias?.total ?? null
    }
  };
}

function inasistenciasPorAlumno(alumnoIds, cicloLectivo) {
  const totales = new Map(alumnoIds.map((id) => [id, { ausentes: 0, tardes: 0, registradas: 0 }]));

  for (const registro of preceptorRepository.list({ alumnoIds, desde: `${cicloLectivo}-01-01`, hasta: `${cicloLectivo}-12-31` })) {
    const total = totales.get(registro.alumnoId);
    if (!total) continue;
    total.registradas++;
    if (registro.estado === "ausente") total.ausentes++;
    if (registro.estado === "tarde") total.tardes++;
  }

  return totales;
}

/* GET /api/v1/preceptor/boletin/:cursoId[?alumnoId=&ciclo=]
   Boletines del curso en orden de lista, o el de un alumno del curso. */
function boletinCurso({ params, url, user }) {
  const curso = exigirCursoValido(params.cursoId);
  exigirAccesoCurso(user, curso.cursoId);

  const escuelaId = escuelaDel(user);
  const cicloTexto = url?.searchParams?.get("ciclo");
  const cicloLectivo = cicloTexto ? Number(cicloTexto) : new Date().getFullYear();

  if (!Number.isInteger(cicloLectivo) || cicloLectivo < 1990 || cicloLectivo > 2100) {
    throw errorDeValidacion([{ field: "ciclo", message: "El ciclo lectivo no es valido." }]);
  }

  const lista = alumnosDelCurso(curso.anio, curso.division, escuelaId);
  /* El numero de orden es la posicion en la lista del curso, aun cuando se
     pide el boletin de un solo alumno. */
  let elegidos = lista.map((alumno, indice) => ({ alumno, orden: indice + 1 }));
  const alumnoId = url?.searchParams?.get("alumnoId");

  if (alumnoId) {
    elegidos = elegidos.filter(({ alumno }) => alumno.id === alumnoId);
    if (!elegidos.length) {
      throw noEncontrado("El alumno solicitado en este curso");
    }
  }

  const inasistencias = inasistenciasPorAlumno(elegidos.map(({ alumno }) => alumno.id), cicloLectivo);

  return {
    statusCode: 200,
    body: {
      data: elegidos.map(({ alumno, orden }) => ({ orden, ...boletinDeAlumno(alumno, curso.anio, cicloLectivo, inasistencias.get(alumno.id)) })),
      contexto: { ...contextoCurso(curso.anio, curso.division, lista), cicloLectivo }
    }
  };
}

/* ---------------- Historial de asistencia diaria -------------------------
   Agrupa los registros diarios por curso y fecha: cada grupo es un "dia de
   asistencia", con la misma forma que las tomas del portal docente para
   reutilizar el historial y la planilla mensual. */

function validarRango(url, errores) {
  const rango = {};

  for (const campo of ["desde", "hasta"]) {
    const valor = url.searchParams.get(campo);
    if (valor == null || valor === "") continue;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
      errores.push({ field: campo, message: "La fecha debe tener el formato AAAA-MM-DD." });
      continue;
    }
    rango[campo] = valor;
  }

  return rango;
}

function resumenDia(registros) {
  const resumen = { presente: 0, ausente: 0, tarde: 0 };
  for (const registro of registros) {
    if (registro.estado in resumen) resumen[registro.estado]++;
  }
  return resumen;
}

function vistaDia(cursoId, fecha, registros, { conRegistros = false } = {}) {
  const [anio, division] = cursoId.split("-");

  return {
    id: `${cursoId}|${fecha}`,
    cursoId,
    curso: etiquetaCurso(anio, division),
    materia: "Asistencia diaria",
    fecha,
    resumen: resumenDia(registros),
    correcciones: 0,
    registros: conRegistros
      ? registros.map((registro) => {
          const alumno = studentRepository.findById(registro.alumnoId);
          return {
            alumnoId: registro.alumnoId,
            apellido: alumno?.apellido ?? null,
            nombre: alumno?.nombre ?? null,
            estado: registro.estado
          };
        }).sort((a, b) => `${a.apellido} ${a.nombre}`.localeCompare(`${b.apellido} ${b.nombre}`, "es"))
      : undefined
  };
}

/* GET /api/v1/preceptor/asistencias?cursoId=&desde=&hasta=&incluirRegistros=1 */
function listarAsistencias({ url, user }) {
  const errores = [];
  const cursoIdTexto = url.searchParams.get("cursoId");
  const curso = cursoIdTexto ? parseCursoId(cursoIdTexto, errores) : null;
  const rango = validarRango(url, errores);

  if (errores.length) {
    throw errorDeValidacion(errores);
  }

  if (curso) {
    exigirAccesoCurso(user, curso.cursoId);
  }

  const registros = preceptorRepository.list({
    cursoId: curso?.cursoId ?? null,
    cursos: cursosPermitidos(user),
    ...rango
  });
  const grupos = new Map();

  for (const registro of registros) {
    const clave = `${registro.cursoId}|${registro.fecha}`;
    if (!grupos.has(clave)) grupos.set(clave, []);
    grupos.get(clave).push(registro);
  }

  const conRegistros = url.searchParams.get("incluirRegistros") === "1";
  const data = [...grupos.entries()]
    .map(([clave, lista]) => {
      const [cursoId, fecha] = clave.split("|");
      return vistaDia(cursoId, fecha, lista, { conRegistros });
    })
    .sort((a, b) => b.fecha.localeCompare(a.fecha) || a.cursoId.localeCompare(b.cursoId, "es", { numeric: true }));

  return { statusCode: 200, body: { data } };
}

/* GET /api/v1/preceptor/asistencias/:cursoId/:fecha */
function obtenerAsistenciaDia({ params, user }) {
  const curso = exigirCursoValido(params.cursoId);
  exigirAccesoCurso(user, curso.cursoId);

  const fecha = String(params.fecha ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    throw errorDeValidacion([{ field: "fecha", message: "La fecha debe tener el formato AAAA-MM-DD." }]);
  }

  const registros = preceptorRepository.list({ cursoId: curso.cursoId, desde: fecha, hasta: fecha });

  if (!registros.length) {
    throw noEncontrado("La asistencia de ese dia");
  }

  return { statusCode: 200, body: { data: vistaDia(curso.cursoId, fecha, registros, { conRegistros: true }) } };
}

export default {
  listarAlumnos,
  registrarAsistencia,
  estadoAulas,
  misCursos,
  boletinCurso,
  listarAsistencias,
  obtenerAsistenciaDia
};
