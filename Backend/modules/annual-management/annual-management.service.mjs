import { createHash, randomUUID } from "node:crypto";
import { errorDeValidacion, conflicto, noEncontrado } from "../../utils/api-error.mjs";
import auditService from "../audit/audit.service.mjs";
import academicRecordsRepository from "../academic-records/academic-records.repository.mjs";
import academicRepository from "../academic/academic.repository.mjs";
import courseChangesRepository from "../course-changes/course-changes.repository.mjs";
import gradesRepository from "../grades/grades.repository.mjs";
import inasistenciasRepository from "../inasistencias/inasistencias.repository.mjs";
import studentRepository from "../students/students.repository.mjs";
import { CURSOS_VALIDOS, DIVISIONES_CATALOGO, buscarDivision } from "../students/catalogo.mjs";
import annualManagementRepository from "./annual-management.repository.mjs";

const MAX_FILAS_CIERRE = 2000;
const VIGENCIA_PREVIEW_MS = 2 * 60 * 60 * 1000;
const ESTADOS_MATERIA = ["aprobada", "desaprobada", "en_curso", "libre", "regular"];
const DECISIONES = ["promovido", "permanece", "egresado", "retirado", "no_continua"];
const ESTADOS_DIFICULTAD = new Set(["desaprobada", "libre"]);

function escuelaDel(user) {
  return String(user?.assignments?.find((assignment) => assignment.schoolId)?.schoolId ?? "esc-1");
}

function nombreResponsable(user) {
  return user?.displayName ?? user?.email ?? "Usuario del sistema";
}

function anioValido(value) {
  const year = Number(value);
  return Number.isInteger(year) && year >= 1990 && year <= 2100 ? year : null;
}

function validarAnioLectivo(value, field, errors) {
  const year = anioValido(value);
  if (year === null) {
    errors.push({ field, message: "El año lectivo debe ser un entero entre 1990 y 2100." });
  }
  return year;
}

function activosDeEscuela(escuelaId) {
  return studentRepository.all()
    .filter((student) => student.escuelaId === escuelaId && student.isActive !== false)
    .sort((a, b) =>
      Number(a.curso ?? 0) - Number(b.curso ?? 0) ||
      String(a.division ?? "").localeCompare(String(b.division ?? ""), "es") ||
      String(a.apellido ?? "").localeCompare(String(b.apellido ?? ""), "es") ||
      String(a.nombre ?? "").localeCompare(String(b.nombre ?? ""), "es")
    );
}

function hashRevision(roster, escuelaId, anio) {
  const data = roster.map((student) => [
    student.id,
    student.dni,
    student.curso,
    student.division,
    student.isActive,
    student.actualizadoEn
  ]);
  const situaciones = academicRecordsRepository.listSituaciones({ escuelaId, anio })
    .map((registro) => [
      registro.id,
      registro.alumnoId,
      registro.materiaId,
      registro.tipo,
      registro.estado,
      registro.actualizadoEn
    ]);
  return createHash("sha256").update(JSON.stringify({ alumnos: data, situaciones })).digest("hex");
}

function resumenAcademico(alumnoId, escuelaId, anio) {
  const registros = academicRecordsRepository.listSituaciones({ escuelaId, alumnoId, anio });
  const porEstado = Object.fromEntries(ESTADOS_MATERIA.map((estado) => [estado, 0]));
  for (const registro of registros) {
    if (Object.hasOwn(porEstado, registro.estado)) porEstado[registro.estado] += 1;
  }

  return { cantidad: registros.length, porEstado };
}

function nombreAlumno(student) {
  return `${student.apellido ?? ""}, ${student.nombre ?? ""}`.replace(/^,\s*/, "").trim();
}

function filasDePreview(escuelaId, anioActual) {
  const roster = activosDeEscuela(escuelaId);
  const dniCounts = new Map();
  for (const student of roster) {
    const dni = String(student.dni ?? "").trim();
    if (dni) dniCounts.set(dni, (dniCounts.get(dni) ?? 0) + 1);
  }

  const alumnos = roster.map((student) => {
    const curso = Number(student.curso);
    const division = student.division === null || student.division === undefined ? null : String(student.division);
    const avisos = [];
    if (!Number.isInteger(curso) || !CURSOS_VALIDOS.includes(curso) || !division || !buscarDivision(curso, division)) {
      avisos.push("Sin curso o división válidos; requiere revisión.");
    }

    const academico = resumenAcademico(student.id, escuelaId, anioActual);
    if (academico.cantidad === 0) {
      avisos.push(`Sin situación académica registrada para ${anioActual}.`);
    }

    const dni = String(student.dni ?? "").trim();
    if (dni && dniCounts.get(dni) > 1) avisos.push("DNI duplicado en la matrícula; corregir antes de confirmar.");

    return {
      alumnoId: student.id,
      apellido: student.apellido,
      nombre: student.nombre,
      nombreCompleto: nombreAlumno(student),
      dni: student.dni ?? null,
      curso: Number.isInteger(curso) ? curso : null,
      division,
      turno: student.turno ?? null,
      orientacion: student.orientacion ?? null,
      situacionAcademica: academico,
      avisos
    };
  });

  return { roster, alumnos };
}

function snapshotDe(alumnos, anio, escuelaId, momento, decision = null) {
  return {
    escuelaId,
    anio,
    capturadoEn: momento,
    alumnos: alumnos.map((alumno) => ({
      alumnoId: alumno.alumnoId,
      apellido: alumno.apellido,
      nombre: alumno.nombre,
      dni: alumno.dni,
      curso: alumno.curso,
      division: alumno.division,
      turno: alumno.turno,
      orientacion: alumno.orientacion,
      decision: decision?.get(alumno.alumnoId) ?? null
    }))
  };
}

function destinosDisponibles(curso) {
  if (!Number.isInteger(curso) || !CURSOS_VALIDOS.includes(curso)) {
    return { promocion: [], permanencia: [] };
  }
  return {
    promocion: DIVISIONES_CATALOGO.filter((item) => item.anio === curso + 1).map((item) => item.division),
    permanencia: DIVISIONES_CATALOGO.filter((item) => item.anio === curso).map((item) => item.division)
  };
}

function claveDivision(curso, division) {
  return `${curso}:${String(division)}`;
}

function validarDecisiones(decisiones, preview, errores) {
  if (!Array.isArray(decisiones) || decisiones.length !== preview.alumnos.length) {
    errores.push({ field: "decisiones", message: "Debe incluir una decisión para cada alumno de la vista previa." });
    return [];
  }

  const esperados = new Set(preview.alumnos.map((alumno) => alumno.alumnoId));
  const vistos = new Set();
  const normalizadas = [];

  for (const [index, raw] of decisiones.entries()) {
    const alumnoId = raw?.alumnoId;
    if (typeof alumnoId !== "string" || !esperados.has(alumnoId)) {
      errores.push({ field: `decisiones.${index}.alumnoId`, message: "El alumno no pertenece a la vista previa." });
      continue;
    }
    if (vistos.has(alumnoId)) {
      errores.push({ field: `decisiones.${index}.alumnoId`, message: "El alumno está repetido en las decisiones." });
      continue;
    }
    vistos.add(alumnoId);

    if (!DECISIONES.includes(raw?.decision)) {
      errores.push({ field: `decisiones.${index}.decision`, message: "Seleccione una decisión para cada alumno." });
      continue;
    }

    const alumno = preview.alumnos.find((item) => item.alumnoId === alumnoId);
    const division = raw.division === undefined || raw.division === null ? "" : String(raw.division).trim();
    const destinoCurso = raw.decision === "promovido" ? alumno.curso + 1 : alumno.curso;

    if (["promovido", "permanece"].includes(raw.decision)) {
      if (!Number.isInteger(alumno.curso) || !buscarDivision(alumno.curso, alumno.division)) {
        errores.push({ field: `decisiones.${index}.decision`, message: "No se puede asignar un curso sin ubicación actual válida." });
      }
      if (!division || !buscarDivision(destinoCurso, division)) {
        errores.push({ field: `decisiones.${index}.division`, message: "Seleccione una división existente para el curso de destino." });
      }
      if (raw.decision === "promovido" && alumno.curso === Math.max(...CURSOS_VALIDOS)) {
        errores.push({ field: `decisiones.${index}.decision`, message: "El último curso no tiene un curso siguiente; indique egreso o la situación correspondiente." });
      }
    }

    if (raw.decision === "egresado" && alumno.curso !== Math.max(...CURSOS_VALIDOS)) {
      errores.push({ field: `decisiones.${index}.decision`, message: "El egreso solo se puede registrar desde el último curso del catálogo." });
    }

    const motivo = typeof raw.motivo === "string" ? raw.motivo.trim() : "";
    if (["retirado", "no_continua"].includes(raw.decision) && motivo.length < 5) {
      errores.push({ field: `decisiones.${index}.motivo`, message: "Indique un motivo de al menos 5 caracteres para la baja." });
    }
    if (motivo.length > 300) {
      errores.push({ field: `decisiones.${index}.motivo`, message: "El motivo admite hasta 300 caracteres." });
    }

    normalizadas.push({
      alumnoId,
      decision: raw.decision,
      division,
      motivo: motivo || null,
      cursoNuevo: destinoCurso
    });
  }

  if (vistos.size !== esperados.size) {
    errores.push({ field: "decisiones", message: "Faltan decisiones para uno o más alumnos." });
  }

  const dnis = new Map();
  for (const alumno of preview.alumnos) {
    const dni = String(alumno.dni ?? "").trim();
    if (dni) dnis.set(dni, (dnis.get(dni) ?? 0) + 1);
  }
  if ([...dnis.values()].some((cantidad) => cantidad > 1)) {
    errores.push({ field: "matricula", message: "Hay DNI duplicados. Corrija las inconsistencias antes de cerrar el ciclo." });
  }

  return normalizadas;
}

function agrupar(registros, clave) {
  const conteos = new Map();
  for (const registro of registros) {
    const valor = clave(registro);
    if (valor === null || valor === undefined || valor === "") continue;
    const etiqueta = String(valor);
    conteos.set(etiqueta, (conteos.get(etiqueta) ?? 0) + 1);
  }
  return [...conteos.entries()]
    .map(([valor, cantidad]) => ({ valor, cantidad }))
    .sort((a, b) => a.valor.localeCompare(b.valor, "es", { numeric: true }));
}

function coincidenciaUbicacion(item, filtros) {
  if (filtros.curso !== null && Number(item.curso) !== filtros.curso) return false;
  if (filtros.division && String(item.division) !== filtros.division) return false;
  return true;
}

function filtrarPorAlumnoConSnapshot(registros, snapshot, filtros) {
  if (filtros.curso === null && !filtros.division) return registros;
  if (!snapshot) return null;

  const ids = new Set(snapshot.alumnos.filter((alumno) => coincidenciaUbicacion(alumno, filtros)).map((alumno) => alumno.alumnoId));
  return registros.filter((registro) => ids.has(registro.alumnoId));
}

function contarEstados(registros) {
  const conteos = Object.fromEntries(ESTADOS_MATERIA.map((estado) => [estado, 0]));
  for (const registro of registros ?? []) {
    if (Object.hasOwn(conteos, registro.estado)) conteos[registro.estado] += 1;
  }
  return conteos;
}

function construirInforme({ escuelaId, anio, curso, division }) {
  const snapshot = annualManagementRepository.getSnapshot(escuelaId, anio);
  const snapshotAnterior = annualManagementRepository.getSnapshot(escuelaId, anio - 1);
  const filtros = { curso, division };
  const roster = snapshot ? snapshot.alumnos.filter((alumno) => coincidenciaUbicacion(alumno, filtros)) : [];
  const cierre = annualManagementRepository.findClosure(escuelaId, anio);
  const alumnosCierre = cierre?.alumnos?.filter((alumno) =>
    (curso === null || Number(alumno.cursoAnterior) === curso) &&
    (!division || String(alumno.divisionAnterior) === division)
  ) ?? null;
  const resultadosCierre = alumnosCierre
    ? Object.fromEntries(DECISIONES.map((decision) => [
      decision,
      alumnosCierre.filter((alumno) => alumno.decision === decision).length
    ]))
    : null;

  const inasistencias = inasistenciasRepository.list({ escuelaId, anio })
    .filter((item) => (curso === null || Number(item.curso) === curso) && (!division || String(item.division) === division));
  const inasistenciasAnteriores = inasistenciasRepository.list({ escuelaId, anio: anio - 1 })
    .filter((item) => (curso === null || Number(item.curso) === curso) && (!division || String(item.division) === division));
  const porAlumno = new Map();
  for (const item of inasistencias) {
    const actual = porAlumno.get(item.alumnoId) ?? {
      alumnoId: item.alumnoId,
      alumno: item.alumno?.apellido && item.alumno?.nombre
        ? `${item.alumno.apellido}, ${item.alumno.nombre}`
        : item.alumno?.nombre ?? item.alumnoId,
      curso: item.curso ?? null,
      division: item.division ?? null,
      cantidad: 0
    };
    actual.cantidad += 1;
    porAlumno.set(item.alumnoId, actual);
  }

  let situaciones = academicRecordsRepository.listSituaciones({ escuelaId, anio });
  situaciones = filtrarPorAlumnoConSnapshot(situaciones, snapshot, filtros);
  const situacionesDisponibles = situaciones !== null;
  situaciones ??= [];
  let situacionesAnteriores = academicRecordsRepository.listSituaciones({ escuelaId, anio: anio - 1 });
  situacionesAnteriores = filtrarPorAlumnoConSnapshot(situacionesAnteriores, snapshotAnterior, filtros);
  const comparacionAcademicaDisponible = situacionesDisponibles && situacionesAnteriores !== null &&
    situaciones.length > 0 && situacionesAnteriores.length > 0;
  situacionesAnteriores ??= [];

  const nombresMaterias = academicRecordsRepository.listSituacionesMateria();
  const materiasConDificultades = new Map();
  for (const situacion of situaciones) {
    if (!ESTADOS_DIFICULTAD.has(situacion.estado)) continue;
    const nombre = nombresMaterias[situacion.materiaId]?.nombre ?? situacion.materiaId;
    const actual = materiasConDificultades.get(nombre) ?? { materia: nombre, desaprobadas: 0, libres: 0, total: 0 };
    actual[situacion.estado === "desaprobada" ? "desaprobadas" : "libres"] += 1;
    actual.total += 1;
    materiasConDificultades.set(nombre, actual);
  }

  const calificaciones = gradesRepository.listCalificaciones({ escuelaId, anio });
  const calificacionesFiltradas = calificaciones.filter((calificacion) => {
    if (curso === null && !division) return true;
    const cursoRef = calificacion.cursoId ? academicRepository.findCursoById(calificacion.cursoId) : null;
    const divisionRef = calificacion.divisionId ? academicRepository.findDivisionById(calificacion.divisionId) : null;
    return (curso === null || Number(cursoRef?.anio) === curso) &&
      (!division || String(divisionRef?.nombre) === division);
  });

  const comparacionDisponible = Boolean(snapshot && snapshotAnterior);
  const porCurso = snapshot ? agrupar(roster, (alumno) => alumno.curso).map((item) => ({ curso: Number(item.valor), cantidad: item.cantidad })) : null;
  const cursosExtremos = porCurso?.length
    ? {
      mayorMatricula: porCurso.filter((item) => item.cantidad === Math.max(...porCurso.map((cursoItem) => cursoItem.cantidad))),
      menorMatricula: porCurso.filter((item) => item.cantidad === Math.min(...porCurso.map((cursoItem) => cursoItem.cantidad)))
    }
    : null;
  const porDivision = snapshot
    ? agrupar(roster, (alumno) => claveDivision(alumno.curso, alumno.division))
      .map((item) => {
        const [cursoAnio, divisionNombre] = item.valor.split(":");
        return { curso: Number(cursoAnio), division: divisionNombre, cantidad: item.cantidad };
      })
    : null;
  const porValor = agrupar(calificacionesFiltradas, (item) => item.valor)
    .map((item) => ({ valor: item.valor, cantidad: item.cantidad }));
  const porEstado = agrupar(situaciones, (item) => item.estado)
    .map((item) => ({ estado: item.valor, cantidad: item.cantidad }));

  const rosterAnterior = snapshotAnterior?.alumnos.filter((alumno) => coincidenciaUbicacion(alumno, filtros)) ?? [];
  const matriculaAnterior = snapshotAnterior ? rosterAnterior.length : null;
  const matriculaActual = snapshot ? roster.length : null;

  return {
    generadoEn: new Date().toISOString(),
    anio,
    filtros: { curso, division: division || null },
    opciones: {
      cursos: CURSOS_VALIDOS,
      divisiones: DIVISIONES_CATALOGO.map((item) => ({ curso: item.anio, division: item.division }))
    },
    matricula: {
      disponible: Boolean(snapshot),
      total: snapshot ? roster.length : null,
      porCurso,
      porDivision,
      cursosExtremos,
      fuente: snapshot ? "cierre anual registrado" : null
    },
    resultadosCierre,
    comparacionMatricula: {
      disponible: comparacionDisponible,
      anioAnterior: anio - 1,
      matriculaAnterior: comparacionDisponible ? matriculaAnterior : null,
      matriculaActual: comparacionDisponible ? matriculaActual : null,
      variacion: comparacionDisponible ? matriculaActual - matriculaAnterior : null
    },
    asistencia: {
      disponible: inasistencias.length > 0,
      totalInasistencias: inasistencias.length,
      alumnosConInasistencias: porAlumno.size,
      comparacion: {
        disponible: inasistencias.length > 0 && inasistenciasAnteriores.length > 0,
        anioAnterior: anio - 1,
        totalAnterior: inasistenciasAnteriores.length,
        totalActual: inasistencias.length,
        variacion: inasistencias.length - inasistenciasAnteriores.length
      },
      porCurso: agrupar(inasistencias, (item) => item.curso).map((item) => ({ curso: Number(item.valor), cantidad: item.cantidad })),
      alumnosConMasInasistencias: [...porAlumno.values()]
        .sort((a, b) => b.cantidad - a.cantidad || a.alumno.localeCompare(b.alumno, "es"))
        .slice(0, 10)
    },
    academico: {
      disponible: situacionesDisponibles && situaciones.length > 0 || calificacionesFiltradas.length > 0,
      situacionesDisponibles,
      totalSituaciones: situaciones.length,
      porEstado,
      alumnosConSituacionesAprobadas: new Set(situaciones.filter((item) => item.estado === "aprobada").map((item) => item.alumnoId)).size,
      alumnosConMateriasDesaprobadasOLibres: new Set(situaciones.filter((item) => ESTADOS_DIFICULTAD.has(item.estado)).map((item) => item.alumnoId)).size,
      alumnosConSituacionesNoAprobadas: new Set(situaciones.filter((item) => item.estado !== "aprobada").map((item) => item.alumnoId)).size,
      comparacion: {
        disponible: comparacionAcademicaDisponible,
        anioAnterior: anio - 1,
        situacionesAnteriores: comparacionAcademicaDisponible ? situacionesAnteriores.length : null,
        situacionesActuales: comparacionAcademicaDisponible ? situaciones.length : null,
        porEstadoAnterior: comparacionAcademicaDisponible ? contarEstados(situacionesAnteriores) : null,
        porEstadoActual: comparacionAcademicaDisponible ? contarEstados(situaciones) : null
      },
      materiasConDificultades: [...materiasConDificultades.values()].sort((a, b) => b.total - a.total || a.materia.localeCompare(b.materia, "es")),
      totalEvaluaciones: calificacionesFiltradas.length,
      calificacionesPorValor: porValor
    },
    avisos: [
      ...(!snapshot ? ["No hay una fotografía de matrícula para este ciclo; se omiten los totales históricos de matrícula."] : []),
      ...(!comparacionDisponible ? ["La comparación de matrícula requiere fotografías de ambos ciclos."] : []),
      ...((curso !== null || division) && !snapshot ? ["No se pueden filtrar situaciones académicas por curso/división sin una fotografía de matrícula del ciclo."] : []),
      ...((curso !== null || division) && !snapshotAnterior ? ["No se puede comparar la situación académica por curso/división: falta la fotografía del ciclo anterior."] : []),
      ...(situaciones.length > 0 && situacionesAnteriores.length === 0 ? ["No hay situaciones académicas registradas en ambos ciclos para compararlas."] : []),
      ...(inasistencias.length > 0 && inasistenciasAnteriores.length === 0 ? ["No hay registros de inasistencias de ambos ciclos para compararlos."] : []),
      ...(inasistencias.length === 0 ? ["No hay registros de inasistencias para los filtros seleccionados."] : []),
      ...(situaciones.length === 0 && calificacionesFiltradas.length === 0 ? ["No hay registros académicos para los filtros seleccionados."] : [])
    ]
  };
}

const annualManagementService = {
  obtenerPreview(query, user) {
    const errores = [];
    const anioActual = validarAnioLectivo(query.get("anioActual"), "anioActual", errores);
    const anioNuevo = validarAnioLectivo(query.get("anioNuevo"), "anioNuevo", errores);
    if (anioActual !== null && anioNuevo !== null && anioNuevo !== anioActual + 1) {
      errores.push({ field: "anioNuevo", message: "El nuevo ciclo lectivo debe ser el siguiente año consecutivo." });
    }
    if (errores.length) throw errorDeValidacion(errores);

    const escuelaId = escuelaDel(user);
    if (annualManagementRepository.findClosure(escuelaId, anioActual)) {
      throw conflicto(`El cierre ${anioActual} → ${anioNuevo} ya fue confirmado.`);
    }

    const { roster, alumnos } = filasDePreview(escuelaId, anioActual);
    if (alumnos.length > MAX_FILAS_CIERRE) {
      throw errorDeValidacion([{ field: "matricula", message: `La vista previa admite hasta ${MAX_FILAS_CIERRE} alumnos.` }]);
    }

    const preview = {
      id: randomUUID(),
      escuelaId,
      usuarioId: user?.id ?? null,
      anioActual,
      anioNuevo,
      rosterHash: hashRevision(roster, escuelaId, anioActual),
      creadoEn: new Date().toISOString(),
      alumnos
    };
    annualManagementRepository.createPreview(preview);

    return {
      data: {
        previewId: preview.id,
        anioActual,
        anioNuevo,
        creadoEn: preview.creadoEn,
        cantidadAlumnos: alumnos.length,
        cantidadConAvisos: alumnos.filter((alumno) => alumno.avisos.length > 0).length,
        divisiones: DIVISIONES_CATALOGO,
        alumnos
      }
    };
  },

  confirmarCierre(body, user, request) {
    const preview = annualManagementRepository.findPreview(body?.previewId);
    const escuelaId = escuelaDel(user);
    if (!preview || preview.escuelaId !== escuelaId || preview.usuarioId !== (user?.id ?? null)) {
      throw noEncontrado("La vista previa del cierre anual");
    }
    if (preview.confirmedByClosureId) {
      throw conflicto("Esta vista previa ya fue confirmada.");
    }
    if (Date.now() - Date.parse(preview.creadoEn) > VIGENCIA_PREVIEW_MS) {
      throw conflicto("La vista previa venció; genere una nueva antes de confirmar.");
    }
    if (annualManagementRepository.findClosure(escuelaId, preview.anioActual)) {
      throw conflicto(`El ciclo lectivo ${preview.anioActual} ya tiene un cierre confirmado.`);
    }

    const { roster } = filasDePreview(escuelaId, preview.anioActual);
    if (hashRevision(roster, escuelaId, preview.anioActual) !== preview.rosterHash) {
      throw conflicto("La matrícula cambió desde la revisión. Genere una nueva vista previa.");
    }

    const errores = [];
    const decisiones = validarDecisiones(body?.decisiones, preview, errores);
    if (errores.length) throw errorDeValidacion(errores);

    const id = randomUUID();
    const momento = new Date().toISOString();
    const fecha = momento.slice(0, 10);
    const estudiantePorId = new Map(roster.map((student) => [student.id, student]));
    const alumnosCicloActual = preview.alumnos;
    const snapshotAnterior = annualManagementRepository.getSnapshot(escuelaId, preview.anioActual);
    const snapshotOrigen = snapshotAnterior ?? snapshotDe(alumnosCicloActual, preview.anioActual, escuelaId, momento);
    const movimientos = [];
    const cambiosAplicados = [];
    let guardoSnapshotOrigen = false;
    let guardoSnapshotDestino = false;
    let guardoCierre = false;

    const resultados = Object.fromEntries(DECISIONES.map((decision) => [decision, 0]));
    const decisionesPorAlumno = new Map(decisiones.map((decision) => [decision.alumnoId, decision.decision]));

    try {
      const alumnosNuevoCiclo = [];
      for (const decision of decisiones) {
        const student = estudiantePorId.get(decision.alumnoId);
        const alumno = preview.alumnos.find((item) => item.alumnoId === decision.alumnoId);
        resultados[decision.decision] += 1;

        if (decision.decision === "promovido" || decision.decision === "permanece") {
          const ubicacion = buscarDivision(decision.cursoNuevo, decision.division);
          const destino = {
            curso: decision.cursoNuevo,
            division: decision.division,
            turno: ubicacion.turno,
            orientacion: ubicacion.orientacion
          };
          if (student.curso !== destino.curso || String(student.division) !== destino.division) {
            studentRepository.update(student.id, destino);
            cambiosAplicados.push({ student, antes: studentRepository.findById(student.id), ubicacionAnterior: { curso: student.curso, division: student.division, turno: student.turno, orientacion: student.orientacion } });
            const movimiento = courseChangesRepository.crearMovimiento({
              escuelaId,
              alumnoId: student.id,
              alumno: `${student.apellido}, ${student.nombre}`,
              dni: student.dni,
              cursoAnterior: student.curso,
              divisionAnterior: String(student.division),
              turnoAnterior: student.turno ?? null,
              orientacionAnterior: student.orientacion ?? null,
              cursoNuevo: destino.curso,
              divisionNueva: destino.division,
              turnoNuevo: destino.turno,
              orientacionNueva: destino.orientacion,
              tipo: decision.decision === "promovido" ? "promocion" : "cambio_division",
              anio: preview.anioActual,
              cuatrimestre: null,
              fecha,
              motivo: `Cierre anual ${preview.anioActual} a ${preview.anioNuevo}`,
              responsableId: user?.id ?? null,
              responsable: nombreResponsable(user),
              operacionId: id
            });
            movimientos.push(movimiento);
          }
          alumnosNuevoCiclo.push({
            alumnoId: student.id,
            apellido: student.apellido,
            nombre: student.nombre,
            dni: student.dni ?? null,
            curso: destino.curso,
            division: destino.division,
            turno: destino.turno,
            orientacion: destino.orientacion,
            decision: decision.decision
          });
        } else {
          const motivoBaja = decision.decision === "egresado"
            ? `Egreso registrado en el cierre anual ${preview.anioActual}.`
            : `${decision.decision === "retirado" ? "Retiro" : "No continúa"} en el cierre anual ${preview.anioActual}: ${decision.motivo}`;
          studentRepository.deactivate(student.id, fecha, motivoBaja);
          cambiosAplicados.push({ student, antes: studentRepository.findById(student.id), ubicacionAnterior: null, desactivado: true });
        }

        if (decision.decision === "promovido" && alumno.curso === Math.max(...CURSOS_VALIDOS)) {
          throw conflicto(`No se puede promover al último curso: ${alumno.nombreCompleto}.`);
        }
      }

      guardoSnapshotOrigen = annualManagementRepository.saveSnapshot(snapshotOrigen);
      if (!guardoSnapshotOrigen && !snapshotAnterior) {
        throw conflicto("Ya existe una fotografía de matrícula para el ciclo de origen.");
      }

      const snapshotDestino = snapshotDe(
        alumnosNuevoCiclo.map((alumno) => ({
          alumnoId: alumno.alumnoId,
          apellido: alumno.apellido,
          nombre: alumno.nombre,
          dni: alumno.dni,
          curso: alumno.curso,
          division: alumno.division,
          turno: alumno.turno,
          orientacion: alumno.orientacion
        })),
        preview.anioNuevo,
        escuelaId,
        momento,
        decisionesPorAlumno
      );
      guardoSnapshotDestino = annualManagementRepository.saveSnapshot(snapshotDestino);
      if (!guardoSnapshotDestino) {
        throw conflicto("Ya existe una fotografía de matrícula para el nuevo ciclo.");
      }

      const cierre = annualManagementRepository.createClosure({
        id,
        escuelaId,
        anioActual: preview.anioActual,
        anioNuevo: preview.anioNuevo,
        creadoEn: momento,
        responsableId: user?.id ?? null,
        responsable: nombreResponsable(user),
        resultados,
        alumnos: decisiones.map((decision) => {
          const alumno = preview.alumnos.find((item) => item.alumnoId === decision.alumnoId);
          return {
            alumnoId: alumno.alumnoId,
            apellido: alumno.apellido,
            nombre: alumno.nombre,
            dni: alumno.dni,
            cursoAnterior: alumno.curso,
            divisionAnterior: alumno.division,
            cursoNuevo: ["promovido", "permanece"].includes(decision.decision) ? decision.cursoNuevo : null,
            divisionNueva: ["promovido", "permanece"].includes(decision.decision) ? decision.division : null,
            decision: decision.decision,
            motivo: decision.motivo
          };
        }),
        movimientos: movimientos.map((movimiento) => movimiento.id)
      });
      if (!cierre) throw conflicto(`El cierre ${preview.anioActual} → ${preview.anioNuevo} ya fue confirmado.`);
      guardoCierre = true;

      auditService.registrar({
        usuarioId: user?.id ?? null,
        escuelaId,
        accion: "update",
        tabla: "cierre_anual",
        registroId: id,
        valorNuevo: { anioActual: preview.anioActual, anioNuevo: preview.anioNuevo, resultados },
        motivo: "Confirmación de actualización anual de listas",
        metodo: request?.method,
        ruta: request?.url?.pathname
      });
      annualManagementRepository.markPreviewConfirmed(preview.id, id);

      return { statusCode: 201, body: { data: cierre } };
    } catch (error) {
      if (guardoCierre) annualManagementRepository.removeClosure(escuelaId, preview.anioActual);
      if (guardoSnapshotDestino) annualManagementRepository.removeSnapshot(escuelaId, preview.anioNuevo);
      if (guardoSnapshotOrigen) annualManagementRepository.removeSnapshot(escuelaId, preview.anioActual);
      for (const movimiento of movimientos) courseChangesRepository.eliminarMovimiento(movimiento.id);
      for (const cambio of cambiosAplicados.reverse()) {
        studentRepository.update(cambio.student.id, cambio.ubicacionAnterior ?? {});
        if (cambio.desactivado) {
          studentRepository.activate(cambio.student.id);
          studentRepository.update(cambio.student.id, { fechaBaja: cambio.student.fechaBaja, motivoBaja: cambio.student.motivoBaja });
        }
      }
      throw error;
    }
  },

  obtenerInforme(query, user) {
    const errores = [];
    const anio = validarAnioLectivo(query.get("anio"), "anio", errores);
    const cursoParam = query.get("curso");
    const curso = cursoParam === null || cursoParam === "" ? null : Number(cursoParam);
    if (curso !== null && (!Number.isInteger(curso) || !CURSOS_VALIDOS.includes(curso))) {
      errores.push({ field: "curso", message: "El curso debe estar entre 1 y 7." });
    }
    const division = query.get("division")?.trim() ?? "";
    if (division && (curso !== null
      ? !buscarDivision(curso, division)
      : !DIVISIONES_CATALOGO.some((item) => item.division === division))) {
      errores.push({ field: "division", message: "La división no existe en el curso seleccionado." });
    }
    if (errores.length) throw errorDeValidacion(errores);

    return {
      data: construirInforme({ escuelaId: escuelaDel(user), anio, curso, division })
    };
  },

  historial(user) {
    return {
      data: annualManagementRepository.listClosures(escuelaDel(user)).map((closure) => ({
        id: closure.id,
        anioActual: closure.anioActual,
        anioNuevo: closure.anioNuevo,
        creadoEn: closure.creadoEn,
        responsableId: closure.responsableId,
        responsable: closure.responsable,
        resultados: closure.resultados
      }))
    };
  },

  registrarExportacion(body, user, request) {
    const errores = [];
    const anio = validarAnioLectivo(body?.anio, "anio", errores);
    if (!["pdf", "xlsx"].includes(body?.formato)) {
      errores.push({ field: "formato", message: "El formato debe ser pdf o xlsx." });
    }
    if (errores.length) throw errorDeValidacion(errores);

    auditService.registrar({
      usuarioId: user?.id ?? null,
      escuelaId: escuelaDel(user),
      accion: "export",
      tabla: "informe_anual",
      registroId: String(anio),
      valorNuevo: { anio, formato: body.formato },
      metodo: request?.method,
      ruta: request?.url?.pathname
    });
    return { data: { registrado: true } };
  }
};

export default annualManagementService;
