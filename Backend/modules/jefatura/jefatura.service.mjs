import academicRepository from "../academic/academic.repository.mjs";
import schedulesRepository from "../schedules/schedules.repository.mjs";
import spacesRepository from "../spaces/spaces.repository.mjs";
import absencesRepository from "../absences/absences.repository.mjs";
import teachersRepository from "../teachers/teachers.repository.mjs";
import reservationsRepository from "../reservations/reservations.repository.mjs";
import studentRepository from "../students/students.repository.mjs";
import { buscarDivision } from "../students/catalogo.mjs";
import { getStore } from "../../database/memory-store.mjs";
import { filtrarPorCurso } from "../preceptor-assignments/alcance.mjs";
import { errorDeValidacion, noEncontrado } from "../../utils/api-error.mjs";

const DIAS = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];
const DIAS_LABEL = {
  lunes: "Lunes",
  martes: "Martes",
  miercoles: "Miércoles",
  jueves: "Jueves",
  viernes: "Viernes",
  sabado: "Sábado"
};
const POR_PAGINA = 25;

function escuelaDel(user, query = {}) {
  return user?.assignments?.find((a) => a.schoolId)?.schoolId ?? query.schoolId ?? "esc-1";
}

function normalizarDia(valor) {
  if (!valor) return null;
  return String(valor)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function coincideTexto(valor, filtro) {
  if (!filtro) return true;
  return String(valor ?? "").toLowerCase().includes(String(filtro).toLowerCase());
}

function minutos(hora) {
  if (!hora || !String(hora).includes(":")) return null;
  const [h, m] = String(hora).split(":").map(Number);
  return h * 60 + m;
}

function seSolapan(inicioA, finA, inicioB, finB) {
  const a = minutos(inicioA);
  const b = minutos(finA);
  const c = minutos(inicioB);
  const d = minutos(finB);
  if ([a, b, c, d].some((n) => !Number.isFinite(n))) return false;
  return a < d && c < b;
}

function fechaDeConsulta(query = {}) {
  if (query.fecha) return query.fecha;
  return new Date().toISOString().slice(0, 10);
}

function diaDeFecha(fecha) {
  const idx = new Date(`${fecha}T12:00:00`).getDay();
  return ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"][idx] ?? "lunes";
}

function nombreCurso(curso, division) {
  const anio = curso?.anio ? `${curso.anio}°` : "Curso";
  return division ? `${anio} ${division.nombre}` : `${anio} ${curso?.turno ?? ""}`.trim();
}

function publicCursoGrupo(curso, division) {
  const matriculas = division
    ? academicRepository.listMatricula({ divisionId: division.id })
    : academicRepository.listMatricula({ cursoId: curso.id });
  const activos = matriculas.filter((m) => m.isActive).length;

  return {
    id: division ? `division:${division.id}` : `curso:${curso.id}`,
    tipo: division ? "division" : "curso",
    cursoId: curso.id,
    divisionId: division?.id ?? null,
    anio: curso.anio,
    curso: nombreCurso(curso, division),
    division: division?.nombre ?? null,
    grupo: division?.nombre ?? null,
    turno: curso.turno,
    orientacion: curso.orientacionId ? academicRepository.findOrientacionById(curso.orientacionId)?.nombre ?? null : null,
    estado: division?.estado ?? curso.estado,
    cantidadAlumnos: matriculas.length,
    alumnosActivos: activos
  };
}

function listarCursosGruposBase({ escuelaId, estado = "activo", turno, anio } = {}) {
  const cursos = academicRepository.listCursos({
    escuelaId,
    estado,
    turno: turno || undefined,
    anio: anio ? Number(anio) : undefined
  });

  const grupos = [];
  for (const curso of cursos) {
    const divisiones = academicRepository.listDivisiones({ cursoId: curso.id, estado });
    if (divisiones.length === 0) {
      grupos.push(publicCursoGrupo(curso, null));
      continue;
    }
    for (const division of divisiones) {
      grupos.push(publicCursoGrupo(curso, division));
    }
  }

  return grupos.sort((a, b) => (a.anio - b.anio) || String(a.division ?? "").localeCompare(String(b.division ?? ""), "es"));
}

function resolverGrupo(grupoId, escuelaId) {
  const grupos = listarCursosGruposBase({ escuelaId, estado: "todos" });
  if (!grupoId) return grupos[0] ?? null;
  return grupos.find((g) => g.id === grupoId || g.divisionId === grupoId || g.cursoId === grupoId) ?? null;
}

function docentePorId(id) {
  if (!id) return null;
  const docente = teachersRepository.findById(id) ?? academicRepository.findTeacherRefById(id);
  if (!docente) return { id, nombre: "Docente no informado", apellido: "", estado: "sin_registro" };
  return {
    id: docente.id,
    nombre: docente.nombre ?? docente.firstName ?? "",
    apellido: docente.apellido ?? docente.lastName ?? "",
    estado: docente.isActive === false ? "inactivo" : "activo"
  };
}

function materiaPorId(id) {
  if (!id) return null;
  const materia = academicRepository.findSubjectRefById(id);
  return materia ? { id: materia.id, nombre: materia.nombre ?? materia.name } : { id, nombre: id };
}

function espacioPorId(id) {
  if (!id) return null;
  const espacio = spacesRepository.findSpaceById(id);
  if (!espacio) return { id, nombre: "Espacio no informado", codigo: id, estado: "sin_registro" };
  return {
    id: espacio.id,
    nombre: espacio.name,
    codigo: espacio.code,
    tipo: espacio.type,
    capacidad: espacio.capacity,
    estado: espacio.status
  };
}

function cursoGrupoDesdeAsignacion(asignacion) {
  const curso = academicRepository.findCursoById(asignacion.courseId);
  const division = asignacion.divisionId ? academicRepository.findDivisionById(asignacion.divisionId) : null;
  if (!curso) return null;
  return publicCursoGrupo(curso, division);
}

function ausenciaPara(asignacion, fecha) {
  const ausencias = absencesRepository.listAbsences({
    teacherId: asignacion.teacherId,
    date: fecha,
    schoolId: asignacion.schoolId
  });
  return ausencias.find((a) => (
    a.scheduleAssignmentId === asignacion.id ||
    seSolapan(asignacion.startTime, asignacion.endTime, a.startTime ?? asignacion.startTime, a.endTime ?? asignacion.endTime)
  )) ?? null;
}

function publicAusencia(ausencia) {
  if (!ausencia) return null;
  const docente = docentePorId(ausencia.teacherId);
  const reemplazo = ausencia.replacementTeacherId ? docentePorId(ausencia.replacementTeacherId) : null;
  return {
    id: ausencia.id,
    docente,
    estado: ausencia.status,
    tipo: ausencia.type,
    fecha: ausencia.date,
    desde: ausencia.startTime,
    hasta: ausencia.endTime,
    reemplazo,
    cobertura: reemplazo ? "con_reemplazo" : "sin_cobertura"
  };
}

function actividadDesdeAsignacion(asignacion, fecha) {
  const grupo = cursoGrupoDesdeAsignacion(asignacion);
  const ausencia = publicAusencia(ausenciaPara(asignacion, fecha));

  return {
    id: asignacion.id,
    origen: "schedule-assignment",
    cursoGrupo: grupo,
    cantidadAlumnos: grupo?.cantidadAlumnos ?? 0,
    alumnosActivos: grupo?.alumnosActivos ?? 0,
    docente: docentePorId(asignacion.teacherId),
    materia: materiaPorId(asignacion.subjectId),
    dia: asignacion.dayOfWeek,
    diaLabel: DIAS_LABEL[asignacion.dayOfWeek] ?? asignacion.dayOfWeek,
    inicio: asignacion.startTime,
    fin: asignacion.endTime,
    duracionMinutos: minutos(asignacion.endTime) - minutos(asignacion.startTime),
    espacio: espacioPorId(asignacion.spaceId),
    turno: grupo?.turno ?? null,
    estado: asignacion.isActive ? (ausencia ? "con_ausencia" : "programada") : "inactiva",
    ausencia,
    reemplazo: ausencia?.reemplazo ?? null
  };
}

function actividadDesdeRelacion(horario, grupo) {
  return {
    id: `academic:${grupo.id}:${horario.id}`,
    origen: "academic-relation",
    cursoGrupo: grupo,
    cantidadAlumnos: grupo.cantidadAlumnos,
    alumnosActivos: grupo.alumnosActivos,
    docente: null,
    materia: null,
    dia: normalizarDia(horario.dia ?? horario.dayOfWeek),
    diaLabel: horario.dia ?? DIAS_LABEL[normalizarDia(horario.dayOfWeek)] ?? "Sin día",
    inicio: horario.desde ?? horario.startTime,
    fin: horario.hasta ?? horario.endTime,
    duracionMinutos: minutos(horario.hasta ?? horario.endTime) - minutos(horario.desde ?? horario.startTime),
    espacio: null,
    turno: grupo.turno,
    estado: "programada",
    ausencia: null,
    reemplazo: null
  };
}

function reservasDeEspacio(spaceId, fecha) {
  return reservationsRepository.list({
    resourceType: "espacio",
    resourceId: spaceId,
    date: fecha
  }).filter((r) => !["cancelada", "rechazada"].includes(r.status));
}

function disponibilidadEspacio(espacio, actividades, fecha, query) {
  if (["inactivo", "no_disponible", "en_mantenimiento"].includes(espacio.status)) {
    return "no_disponible";
  }

  const ocupada = actividades.some((a) => {
    if (a.espacio?.id !== espacio.id) return false;
    if (query.hora && !seSolapan(a.inicio, a.fin, query.hora, query.horaFin ?? query.hora)) return false;
    return true;
  });
  if (ocupada) return "ocupado";

  const reservada = reservasDeEspacio(espacio.id, fecha).some((r) => {
    if (query.hora && !seSolapan(r.startTime, r.endTime, query.hora, query.horaFin ?? query.hora)) return false;
    return true;
  });
  return reservada ? "reservado" : "libre";
}

function aplicarFiltros(actividad, query) {
  if (query.docente && !coincideTexto(`${actividad.docente?.apellido ?? ""} ${actividad.docente?.nombre ?? ""}`, query.docente)) return false;
  if (query.materia && !coincideTexto(actividad.materia?.nombre, query.materia)) return false;
  if (query.espacio && !coincideTexto(`${actividad.espacio?.nombre ?? ""} ${actividad.espacio?.codigo ?? ""}`, query.espacio)) return false;
  if (query.estado && query.estado !== "todos" && actividad.estado !== query.estado && actividad.ausencia?.estado !== query.estado) return false;
  if (query.ausencias === "con" && !actividad.ausencia) return false;
  if (query.ausencias === "sin" && actividad.ausencia) return false;
  return true;
}

function paginar(lista, query) {
  const pagina = Math.max(1, Number(query.pagina ?? 1));
  const porPagina = Math.min(100, Math.max(1, Number(query.porPagina ?? POR_PAGINA)));
  const total = lista.length;
  const totalPaginas = total === 0 ? 0 : Math.ceil(total / porPagina);
  const desde = (pagina - 1) * porPagina;
  return {
    data: lista.slice(desde, desde + porPagina),
    paginacion: {
      total,
      pagina,
      porPagina,
      totalPaginas,
      tieneAnterior: pagina > 1,
      tieneSiguiente: pagina < totalPaginas
    }
  };
}

const CODIGO_GRUPO = /^\d{1,2}\.\d{1,2}$/;

/* Valida el cuerpo de la division de talleres: { anio, division, grupos: { A, B }, asignaciones: { alumnoId: "A" | "B" } }. */
function leerDivisionTalleres(body) {
  const errores = [];
  const anio = Number.parseInt(body?.anio, 10);
  const division = String(body?.division ?? "").trim();
  const grupos = body?.grupos ?? {};
  const asignaciones = body?.asignaciones;

  if (!Number.isInteger(anio) || !division || !buscarDivision(anio, division)) {
    errores.push({ field: "division", message: "El curso y la division indicados no existen para esta escuela." });
  }
  if (!CODIGO_GRUPO.test(String(grupos.A ?? "")) || !CODIGO_GRUPO.test(String(grupos.B ?? "")) || grupos.A === grupos.B) {
    errores.push({ field: "grupos", message: "Indicar dos codigos de grupo de taller distintos (por ejemplo 1.1 y 1.3)." });
  }
  if (!asignaciones || typeof asignaciones !== "object" || Array.isArray(asignaciones)) {
    errores.push({ field: "asignaciones", message: "Las asignaciones deben ser un objeto { alumnoId: \"A\" | \"B\" }." });
  } else if (Object.values(asignaciones).some((letra) => letra !== "A" && letra !== "B")) {
    errores.push({ field: "asignaciones", message: "Cada alumno se asigna al grupo A o al B." });
  }
  if (errores.length) throw errorDeValidacion(errores);

  return { anio, division, grupos: { A: String(grupos.A), B: String(grupos.B) }, asignaciones };
}

/* Valida { asignaciones: [{ grupo: "1.1", anio, division, docente: { id, nombre, email } | null }] }.
   docente null quita al profe del grupo. */
function leerDocentesTalleres(body) {
  const errores = [];
  const lista = body?.asignaciones;
  if (!Array.isArray(lista) || lista.length === 0 || lista.length > 200) {
    throw errorDeValidacion([{ field: "asignaciones", message: "Enviar entre 1 y 200 grupos de taller." }]);
  }
  const vistos = new Set();
  const limpias = lista.map((item, indice) => {
    const grupo = String(item?.grupo ?? "");
    const anio = Number.parseInt(item?.anio, 10);
    const division = String(item?.division ?? "").trim();
    if (!CODIGO_GRUPO.test(grupo) || vistos.has(grupo)) {
      errores.push({ field: `asignaciones.${indice}.grupo`, message: "Indicar un codigo de grupo de taller valido y sin repetir (por ejemplo 1.1)." });
    }
    vistos.add(grupo);
    if (!Number.isInteger(anio) || !division || !buscarDivision(anio, division)) {
      errores.push({ field: `asignaciones.${indice}.division`, message: "El curso y la division indicados no existen para esta escuela." });
    }
    const docente = item?.docente ?? null;
    if (docente !== null && (typeof docente !== "object" || !String(docente.id ?? docente.email ?? "").trim() || !String(docente.nombre ?? "").trim())) {
      errores.push({ field: `asignaciones.${indice}.docente`, message: "El docente necesita identificador y nombre." });
    }
    return {
      grupo,
      anio,
      division,
      docente: docente
        ? {
            id: String(docente.id ?? docente.email).trim(),
            nombre: String(docente.nombre).trim().slice(0, 120),
            email: String(docente.email ?? "").trim().toLowerCase().slice(0, 160)
          }
        : null
    };
  });
  if (errores.length) throw errorDeValidacion(errores);
  return limpias;
}

const claveDocenteTaller = (escuelaId, grupo) => `${escuelaId}|${grupo}`;

const jefaturaService = {
  /* Profes asignados a cada grupo de taller (lo define la direccion). Un grupo tiene un solo profe. */
  listarDocentesTalleres(query, user) {
    const escuelaId = escuelaDel(user, query);
    const todas = [...getStore().tallerDocentes.values()].filter((item) => item.escuelaId === escuelaId);
    const docenteId = String(query?.docenteId ?? "").trim();
    const email = String(query?.email ?? "").trim().toLowerCase();
    const data = todas
      .filter((item) => (!docenteId || item.docente.id === docenteId) && (!email || item.docente.email === email))
      .sort((a, b) => a.grupo.localeCompare(b.grupo, "es", { numeric: true }));
    return { statusCode: 200, body: { data } };
  },

  guardarDocentesTalleres(body, user) {
    const escuelaId = escuelaDel(user);
    const lista = leerDocentesTalleres(body);
    const mapa = getStore().tallerDocentes;
    let asignados = 0;
    let quitados = 0;

    for (const item of lista) {
      const clave = claveDocenteTaller(escuelaId, item.grupo);
      if (!item.docente) {
        if (mapa.delete(clave)) quitados += 1;
        continue;
      }
      mapa.set(clave, {
        escuelaId,
        grupo: item.grupo,
        anio: item.anio,
        division: item.division,
        docente: item.docente,
        actualizadoPor: user.id,
        actualizadoEn: new Date().toISOString()
      });
      asignados += 1;
    }

    const data = [...mapa.values()]
      .filter((item) => item.escuelaId === escuelaId)
      .sort((a, b) => a.grupo.localeCompare(b.grupo, "es", { numeric: true }));
    return { statusCode: 200, body: { data, meta: { asignados, quitados } } };
  },
  /* Guarda en cada alumno activo del curso el grupo de taller que le asigno la jefatura
     (campo grupoTaller del legajo). Es la unica fuente: listados, legajos y planillas la leen de ahi. */
  guardarDivisionTalleres(body, user) {
    const { anio, division, grupos, asignaciones } = leerDivisionTalleres(body);
    const alumnos = filtrarPorCurso(
      user,
      studentRepository.search({ escuelaId: escuelaDel(user), criterios: { estado: "activo", curso: anio, division }, orden: "apellido" })
    );
    const porId = new Map(alumnos.map((alumno) => [alumno.id, alumno]));
    const ignorados = Object.keys(asignaciones).filter((id) => !porId.has(id)).length;
    let actualizados = 0;

    for (const alumno of alumnos) {
      const letra = asignaciones[alumno.id];
      if (!letra) continue;
      const codigo = grupos[letra];
      if (alumno.grupoTaller === codigo) continue;

      studentRepository.update(alumno.id, { grupoTaller: codigo });
      studentRepository.registrarAuditoria({
        accion: "update",
        usuarioId: user.id,
        registroId: alumno.id,
        valorAnterior: { grupoTaller: alumno.grupoTaller ?? null },
        valorNuevo: { grupoTaller: codigo }
      });
      actualizados += 1;
    }

    return { statusCode: 200, body: { data: { anio, division, grupos, total: alumnos.length, actualizados, ignorados } } };
  },

  listCursosGrupos(query, user) {
    const escuelaId = escuelaDel(user, query);
    const grupos = listarCursosGruposBase({
      escuelaId,
      estado: query.estado ?? "activo",
      turno: query.turno,
      anio: query.anio
    });
    return { statusCode: 200, body: { data: grupos } };
  },

  getGrilla(query, user) {
    const escuelaId = escuelaDel(user, query);
    const fecha = fechaDeConsulta(query);
    const dia = normalizarDia(query.dia) ?? diaDeFecha(fecha);
    const grupos = listarCursosGruposBase({ escuelaId, estado: "activo" });
    const grupoSeleccionado = resolverGrupo(query.cursoGrupoId, escuelaId);

    if (!grupoSeleccionado && query.cursoGrupoId) {
      throw noEncontrado("el curso o grupo solicitado");
    }

    const asignaciones = schedulesRepository.listAssignments({
      schoolId: escuelaId,
      courseId: grupoSeleccionado?.cursoId,
      dayOfWeek: dia,
      includeInactive: false
    }).filter((a) => !grupoSeleccionado?.divisionId || a.divisionId === grupoSeleccionado.divisionId);

    const actividadesAsignadas = asignaciones.map((a) => actividadDesdeAsignacion(a, fecha));

    const relaciones = [];
    if (grupoSeleccionado) {
      const scopes = [
        { tipo: "curso", scopeId: grupoSeleccionado.cursoId },
        grupoSeleccionado.divisionId ? { tipo: "division", scopeId: grupoSeleccionado.divisionId } : null
      ].filter(Boolean);

      for (const scope of scopes) {
        for (const relacion of academicRepository.listScheduleRelations(scope)) {
          const horario = academicRepository.findScheduleRefById(relacion.scheduleId);
          if (horario && normalizarDia(horario.dia ?? horario.dayOfWeek) === dia) {
            relaciones.push(actividadDesdeRelacion(horario, grupoSeleccionado));
          }
        }
      }
    }

    const actividades = [...actividadesAsignadas, ...relaciones]
      .filter((a) => !query.turno || a.turno === query.turno)
      .filter((a) => aplicarFiltros(a, query))
      .sort((a, b) => String(a.inicio ?? "").localeCompare(String(b.inicio ?? "")));

    const espacios = spacesRepository.listSpaces({ schoolId: escuelaId, includeInactive: true });
    const disponibilidad = espacios.map((espacio) => ({
      espacio: espacioPorId(espacio.id),
      estado: disponibilidadEspacio(espacio, actividadesAsignadas, fecha, query),
      reserva: reservasDeEspacio(espacio.id, fecha)[0] ?? null,
      actividad: actividadesAsignadas.find((a) => a.espacio?.id === espacio.id) ?? null
    })).filter((item) => !query.espacio || coincideTexto(`${item.espacio.nombre} ${item.espacio.codigo}`, query.espacio));

    const ausencias = absencesRepository.listAbsences({ schoolId: escuelaId, date: fecha })
      .filter((a) => !query.docente || coincideTexto(`${docentePorId(a.teacherId)?.apellido ?? ""} ${docentePorId(a.teacherId)?.nombre ?? ""}`, query.docente))
      .map(publicAusencia);

    const opciones = {
      cursosGrupos: grupos,
      turnos: [...new Set(grupos.map((g) => g.turno).filter(Boolean))],
      docentes: [...new Map(actividades.map((a) => a.docente).filter(Boolean).map((d) => [d.id, d])).values()],
      materias: [...new Map(actividades.map((a) => a.materia).filter(Boolean).map((m) => [m.id, m])).values()],
      espacios: espacios.map((e) => espacioPorId(e.id))
    };

    const pagina = paginar(actividades, query);

    return {
      statusCode: 200,
      body: {
        ...pagina,
        filtros: {
          fecha,
          dia,
          cursoGrupoId: grupoSeleccionado?.id ?? null,
          turno: query.turno ?? null,
          docente: query.docente ?? null,
          materia: query.materia ?? null,
          espacio: query.espacio ?? null,
          estado: query.estado ?? "todos",
          ausencias: query.ausencias ?? "todas"
        },
        cursoGrupo: grupoSeleccionado,
        resumen: {
          actividades: actividades.length,
          ausencias: ausencias.length,
          espaciosOcupados: disponibilidad.filter((e) => e.estado === "ocupado").length,
          espaciosLibres: disponibilidad.filter((e) => e.estado === "libre").length,
          espaciosReservados: disponibilidad.filter((e) => e.estado === "reservado").length,
          espaciosNoDisponibles: disponibilidad.filter((e) => e.estado === "no_disponible").length
        },
        disponibilidad,
        ausencias,
        opciones,
        actualizadoEn: new Date().toISOString()
      }
    };
  }
};

export default jefaturaService;
