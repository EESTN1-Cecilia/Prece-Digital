/* Legajo del alumno: resumen, perfil completo, observaciones, pases, constancias,
   alertas y el tablero de secretaria.

   Todo se arma con datos reales del backend:
   - alumno: students.repository (unica fuente de alumnos)
   - tutores: modulo tutors
   - situacion academica, materias e historial: modulo academic-records
   - observaciones, pases, constancias y alertas descartadas: students.repository

   Asistencia todavia no tiene modulo en el backend: los bloques de inasistencias
   se devuelven en cero con `disponible: false`, sin inventar datos. */

import studentRepository from "./students.repository.mjs";
import { buscarDivision, CURSOS_VALIDOS } from "./catalogo.mjs";
import { vistaAlumno } from "./students.service.mjs";
import tutorsRepository from "../tutors/tutors.repository.mjs";
import academicRecordsRepository from "../academic-records/academic-records.repository.mjs";
import { permisosDelUsuario } from "../auth/permission.service.mjs";
import { PERMISSIONS } from "../../config/permissions.config.mjs";
import { errorDeValidacion, noEncontrado } from "../../utils/api-error.mjs";

const TIPOS_OBSERVACION = ["Académica", "Convivencia", "Asistencia", "Administrativa", "Pedagógica"];
const ESTADOS_OBSERVACION = ["Activa", "Modificada", "Histórica"];
const DESCRIPCION_MAXIMA = 500;
const INSTITUCION = "E.E.S.T N° 1 Monte Grande";

/* ---------------- Utilidades ---------------- */

function anioLectivo() {
  return new Date().getFullYear();
}

function hoy() {
  return new Date().toISOString().slice(0, 10);
}

function capitalizar(texto) {
  if (!texto) return texto;
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function alumnoExistente(id) {
  const alumno = studentRepository.findById(id);

  if (!alumno) {
    throw noEncontrado("El alumno solicitado");
  }

  return alumno;
}

function nombreCompleto(alumno) {
  return `${alumno.apellido}, ${alumno.nombre}`;
}

function cursoTexto(alumno) {
  return alumno.curso ? `${alumno.curso}°` : null;
}

function turnoTaller(turno) {
  if (turno === "mañana") return "Tarde";
  if (turno === "tarde") return "Mañana";
  return null;
}

function nombreActor(user) {
  return user?.displayName ?? user?.email ?? "Usuario del sistema";
}

/* ---------------- Situacion academica ---------------- */

function materiasDelAlumno(alumnoId) {
  return academicRecordsRepository.listSituaciones({ alumnoId }).map((situacion) => ({
    ...situacion,
    materia: academicRecordsRepository.findSubjectRefById(situacion.materiaId)
  }));
}

function resumenAcademico(situaciones) {
  const anio = situaciones.reduce((maximo, situacion) => Math.max(maximo, situacion.anio), 0);
  const vigentes = situaciones.filter((situacion) => situacion.anio === anio);
  const aprobadas = vigentes.filter((situacion) => situacion.estado === "aprobada").length;
  const desaprobadas = vigentes.filter((situacion) => ["desaprobada", "libre"].includes(situacion.estado)).length;
  const pendientes = situaciones.filter((situacion) => situacion.tipo === "pendiente" && situacion.estado !== "aprobada").length;
  const intensificadas = situaciones.filter((situacion) => situacion.tipo === "intensificada" && situacion.estado !== "aprobada").length;

  let estadoGeneral = "Regular al día";
  let situacionPromocion = "En condiciones de promoción directa";

  if (desaprobadas >= 3) {
    estadoGeneral = "En riesgo pedagógico";
    situacionPromocion = "Requiere intensificación en período complementario";
  } else if (desaprobadas > 0 || pendientes > 0 || intensificadas > 0) {
    estadoGeneral = "Con materias a intensificar";
    situacionPromocion = "Promoción condicionada a mesa de examen";
  }

  return {
    estadoGeneral,
    situacionPromocion,
    materiasAprobadas: aprobadas,
    materiasPendientes: pendientes,
    materiasDesaprobadas: desaprobadas,
    evaluacionesPendientes: intensificadas,
    totalMaterias: vigentes.length,
    promedioGeneral: null
  };
}

const ESTADO_MATERIA_TEXTO = {
  en_curso: "En curso",
  regular: "Regular",
  aprobada: "Aprobada",
  desaprobada: "Desaprobada",
  libre: "Libre"
};

function materiaParaPerfil(situacion, alumno) {
  return {
    id: situacion.id,
    nombre: situacion.materia?.nombre ?? situacion.materiaId,
    curso: cursoTexto(alumno),
    division: alumno.division,
    anio: situacion.anio,
    docente: null,
    periodo: situacion.cuatrimestre ? `${situacion.cuatrimestre}° cuatrimestre ${situacion.anio}` : `Anual ${situacion.anio}`,
    calificaciones: { primerCuatrimestre: null, segundoCuatrimestre: null, definitiva: null },
    promedio: null,
    tipo: situacion.tipo,
    estado: ESTADO_MATERIA_TEXTO[situacion.estado] ?? situacion.estado,
    instanciasPendientes: situacion.tipo === "pendiente" && situacion.estado !== "aprobada" ? ["Mesa de examen"] : [],
    observaciones: situacion.observaciones ?? null
  };
}

function libroMatriz(situaciones, alumno) {
  const porAnio = new Map();

  for (const situacion of situaciones) {
    if (!porAnio.has(situacion.anio)) porAnio.set(situacion.anio, []);
    porAnio.get(situacion.anio).push(situacion);
  }

  return [...porAnio.entries()]
    .sort(([a], [b]) => a - b)
    .map(([anio, lista]) => ({
      anioLectivo: anio,
      curso: anio === anioLectivo() ? cursoTexto(alumno) : null,
      division: anio === anioLectivo() ? alumno.division : null,
      condicion: capitalizar(alumno.condicion ?? "regular"),
      resultadoFinal: lista.every((situacion) => situacion.estado === "aprobada") ? "Promovido" : "En curso",
      promedioFinal: null,
      materias: lista.map((situacion) => ({
        materia: situacion.materia?.nombre ?? situacion.materiaId,
        calificacionFinal: null,
        estado: ESTADO_MATERIA_TEXTO[situacion.estado] ?? situacion.estado,
        folio: null,
        libro: null
      }))
    }));
}

/* ---------------- Tutores ---------------- */

function tutoresDelAlumno(alumnoId) {
  return tutorsRepository.listRelations({ studentId: alumnoId }).map((relacion) => {
    const tutor = tutorsRepository.findTutorById(relacion.tutorId) ?? {};

    return {
      id: tutor.id ?? relacion.tutorId,
      relacionId: relacion.id,
      nombre: tutor.nombre ?? null,
      apellido: tutor.apellido ?? null,
      dni: tutor.dni ?? null,
      parentesco: capitalizar(relacion.parentesco),
      telefono: tutor.telefono ?? null,
      email: tutor.email ?? null,
      domicilio: tutor.direccion ?? null,
      tutorPrincipal: Boolean(relacion.responsablePrincipal),
      estadoVinculo: relacion.isActive ? "Activo" : "Inactivo",
      autorizadoRetiro: Boolean(relacion.autorizadoRetiro)
    };
  });
}

/* ---------------- Inasistencias (sin modulo de asistencia todavia) ---------------- */

function inasistenciasSinDatos() {
  return {
    total: 0,
    justificadas: 0,
    injustificadas: 0,
    porcentajeAsistencia: null,
    inasistenciasRelevantes: 0,
    periodo: `Ciclo Lectivo ${anioLectivo()}`,
    alertaInasistencias: false,
    umbralAlerta: 15,
    disponible: false
  };
}

/* ---------------- Alertas ---------------- */

function alertasDelAlumno(alumno, academico) {
  const alertas = [];
  const recurso = `#/alumnos/${alumno.id}`;

  if (alumno.isActive && alumno.condicion === "irregular") {
    alertas.push({
      id: `alt-cond-${alumno.id}`,
      tipo: "Administrativa",
      titulo: "Alumno en condición irregular",
      descripcion: "La condición del legajo figura como irregular.",
      prioridad: "alta",
      fecha: hoy(),
      estado: "activa",
      recursoRelacionado: recurso
    });
  }

  if (academico.materiasDesaprobadas > 0 || academico.materiasPendientes > 0) {
    const cantidad = academico.materiasDesaprobadas + academico.materiasPendientes;
    alertas.push({
      id: `alt-acad-${alumno.id}`,
      tipo: "Académica",
      titulo: `${cantidad} materia(s) desaprobadas o pendientes`,
      descripcion: "Registra materias desaprobadas o pendientes de aprobación.",
      prioridad: academico.materiasDesaprobadas >= 3 ? "alta" : "media",
      fecha: hoy(),
      estado: "activa",
      recursoRelacionado: recurso
    });
  }

  if (!alumno.fechaNacimiento || !alumno.direccion) {
    alertas.push({
      id: `alt-doc-${alumno.id}`,
      tipo: "Documentación",
      titulo: "Legajo incompleto",
      descripcion: "Faltan datos obligatorios del legajo (fecha de nacimiento o domicilio).",
      prioridad: "media",
      fecha: hoy(),
      estado: "activa",
      recursoRelacionado: recurso
    });
  }

  return alertas.filter((alerta) => !studentRepository.alertaDescartada(alerta.id));
}

/* ---------------- Observaciones ---------------- */

function vistaObservacion(registro) {
  return {
    id: registro.id,
    alumnoId: registro.alumnoId,
    alumno: registro.alumno,
    dni: registro.dni,
    fecha: registro.fecha,
    tipo: registro.tipo,
    descripcion: registro.descripcion,
    sector: registro.sector,
    responsable: registro.responsable,
    usuarioResponsable: registro.responsable,
    estado: registro.estado,
    creadoPor: registro.creadoPor,
    creadoEn: registro.creadoEn,
    actualizadoEn: registro.actualizadoEn
  };
}

function validarObservacion(datos = {}) {
  const errores = [];
  const descripcion = String(datos.descripcion ?? "").trim();
  const tipo = String(datos.tipo ?? "").trim();
  const fecha = String(datos.fecha ?? hoy()).trim();
  const estado = String(datos.estado ?? "Activa").trim() || "Activa";

  if (!descripcion) {
    errores.push({ field: "descripcion", message: "La descripcion es obligatoria." });
  } else if (descripcion.length > DESCRIPCION_MAXIMA) {
    errores.push({ field: "descripcion", message: `La descripcion admite hasta ${DESCRIPCION_MAXIMA} caracteres.` });
  }

  if (!TIPOS_OBSERVACION.includes(tipo)) {
    errores.push({ field: "tipo", message: `El tipo debe ser uno de: ${TIPOS_OBSERVACION.join(", ")}.` });
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    errores.push({ field: "fecha", message: "La fecha debe tener formato AAAA-MM-DD." });
  }

  if (!ESTADOS_OBSERVACION.includes(estado)) {
    errores.push({ field: "estado", message: `El estado debe ser uno de: ${ESTADOS_OBSERVACION.join(", ")}.` });
  }

  if (errores.length) {
    throw errorDeValidacion(errores);
  }

  return {
    descripcion,
    tipo,
    fecha,
    estado,
    sector: String(datos.sector ?? "").trim().slice(0, 80) || null
  };
}

/* ---------------- Servicio ---------------- */

const legajoService = {
  resumen(alumnoId) {
    const alumno = alumnoExistente(alumnoId);
    const situaciones = materiasDelAlumno(alumno.id);
    const academico = resumenAcademico(situaciones);

    return {
      data: {
        datosPersonales: {
          id: alumno.id,
          nombre: alumno.nombre,
          apellido: alumno.apellido,
          nombreCompleto: nombreCompleto(alumno),
          dni: alumno.dni,
          legajo: alumno.id,
          fotoPerfil: null,
          email: alumno.email,
          telefono: alumno.telefono,
          fechaNacimiento: alumno.fechaNacimiento,
          genero: alumno.genero,
          direccion: alumno.direccion
        },
        informacionEscolar: {
          curso: cursoTexto(alumno),
          division: alumno.division,
          turno: capitalizar(alumno.turno),
          turnoTaller: turnoTaller(alumno.turno),
          condicion: capitalizar(alumno.condicion),
          estado: alumno.isActive ? "Activo" : "Inactivo",
          anioLectivo: anioLectivo(),
          orientacion: alumno.orientacion ?? "Ciclo Básico"
        },
        estadoAcademico: academico,
        inasistencias: inasistenciasSinDatos(),
        alertas: alertasDelAlumno(alumno, academico),
        perfilCompletoUrl: `#/alumnos/${alumno.id}/perfil`,
        actualizadoEn: alumno.actualizadoEn
      }
    };
  },

  perfil(alumnoId, user) {
    const alumno = alumnoExistente(alumnoId);
    const situaciones = materiasDelAlumno(alumno.id);
    const academico = resumenAcademico(situaciones);
    const permisos = permisosDelUsuario(user);
    const puedeEscribir = permisos.includes(PERMISSIONS.STUDENTS_WRITE);

    return {
      data: {
        datosPersonales: {
          ...vistaAlumno(alumno),
          nombreCompleto: nombreCompleto(alumno),
          cuil: null,
          lugarNacimiento: { pais: alumno.nacionalidad, provincia: alumno.provincia, localidad: alumno.localidad },
          domicilio: alumno.direccion,
          estado: alumno.isActive ? "Activo" : "Inactivo",
          condicion: capitalizar(alumno.condicion),
          fechaIngreso: alumno.fechaAlta,
          anioLectivoActual: anioLectivo(),
          legajo: alumno.id
        },
        contacto: {
          telefono: alumno.telefono,
          telefonoAlternativo: alumno.contacto?.telefono ?? null,
          email: alumno.email,
          domicilio: alumno.direccion,
          localidad: alumno.localidad,
          observacionesContacto: null
        },
        tutores: tutoresDelAlumno(alumno.id),
        situacionAcademica: {
          ...academico,
          anioLectivo: anioLectivo(),
          curso: cursoTexto(alumno),
          division: alumno.division,
          turno: capitalizar(alumno.turno),
          orientacion: alumno.orientacion ?? "Ciclo Básico",
          estadoPromocion: academico.situacionPromocion,
          observacionesAcademicas: null
        },
        materias: situaciones.filter((situacion) => situacion.anio === anioLectivo() || situacion.tipo !== "cursada").map((situacion) => materiaParaPerfil(situacion, alumno)),
        inasistencias: { resumen: { ...inasistenciasSinDatos(), situacionActual: "Sin registros de asistencia" }, detalle: [] },
        observaciones: studentRepository.listarObservaciones({ alumnoId: alumno.id }).map(vistaObservacion),
        condicionesParticulares: { salud: [], pedagogicas: [] },
        libroMatriz: libroMatriz(situaciones, alumno),
        historialCambios: studentRepository.listarTraza(alumno.id).map((entrada) => ({
          id: entrada.id,
          tipoCambio: { create: "Alta de alumno", update: "Modificación de datos", deactivate: "Baja de alumno" }[entrada.accion] ?? entrada.accion,
          descripcion: null,
          fecha: entrada.fecha,
          usuario: entrada.usuarioId,
          sector: null,
          anterior: entrada.valorAnterior,
          nuevo: entrada.valorNuevo
        })),
        pases: studentRepository.listarPases({ alumnoId: alumno.id }),
        permisosAcciones: {
          puedeModificar: puedeEscribir,
          puedeGenerarConstancia: alumno.isActive && permisos.includes(PERMISSIONS.DOCUMENTS_WRITE),
          puedeIniciarPase: alumno.isActive && puedeEscribir,
          puedeRegistrarObservaciones: permisos.includes(PERMISSIONS.OBSERVATIONS_WRITE)
        },
        actualizadoEn: alumno.actualizadoEn
      }
    };
  },

  listarObservaciones(alumnoId) {
    if (alumnoId) {
      alumnoExistente(alumnoId);
    }

    return { data: studentRepository.listarObservaciones({ alumnoId }).map(vistaObservacion) };
  },

  crearObservacion(alumnoId, datos, user) {
    const alumno = alumnoExistente(alumnoId);
    const entrada = validarObservacion(datos);

    const registro = studentRepository.crearObservacion({
      ...entrada,
      alumnoId: alumno.id,
      alumno: nombreCompleto(alumno),
      dni: alumno.dni,
      /* El responsable es siempre quien esta autenticado: no lo decide el cliente. */
      responsable: nombreActor(user),
      creadoPor: user.id
    });

    return { statusCode: 201, body: { data: vistaObservacion(registro) } };
  },

  iniciarPase(alumnoId, datos = {}, user) {
    const alumno = alumnoExistente(alumnoId);
    const errores = [];
    const motivo = String(datos.motivo ?? "").trim();
    const colegioDestino = String(datos.colegioDestino ?? "").trim();

    if (!alumno.isActive) {
      errores.push({ field: "alumno", message: "No se puede iniciar un pase para un alumno inactivo." });
    }
    if (!motivo) errores.push({ field: "motivo", message: "El motivo es obligatorio." });
    if (!colegioDestino) errores.push({ field: "colegioDestino", message: "El colegio de destino es obligatorio." });

    if (errores.length) {
      throw errorDeValidacion(errores);
    }

    const pase = studentRepository.crearPase({
      alumnoId: alumno.id,
      motivo: motivo.slice(0, 300),
      colegioDestino: colegioDestino.slice(0, 150),
      estado: "Iniciado",
      fechaInicio: new Date().toISOString(),
      iniciadoPor: user.id
    });

    studentRepository.registrarAuditoria({
      accion: "transfer",
      usuarioId: user.id,
      registroId: alumno.id,
      valorNuevo: pase
    });

    return {
      statusCode: 201,
      body: { data: { tramiteId: pase.id, ...pase }, message: "Trámite de pase iniciado correctamente." }
    };
  },

  emitirConstancia(alumnoId, user) {
    const alumno = alumnoExistente(alumnoId);

    if (!alumno.isActive) {
      throw errorDeValidacion([{ field: "alumno", message: "Solo se emiten constancias para alumnos activos." }]);
    }

    const curso = cursoTexto(alumno) ?? "-";
    const orientacion = alumno.orientacion ?? "Ciclo Básico";
    const turno = capitalizar(alumno.turno) ?? "-";
    const constancia = studentRepository.registrarConstancia({ alumnoId: alumno.id, emitidaPor: user.id });

    return {
      statusCode: 201,
      body: {
        data: {
          certificadoId: constancia.id,
          alumnoId: alumno.id,
          nombreCompleto: nombreCompleto(alumno),
          dni: alumno.dni,
          curso,
          division: alumno.division,
          turno,
          orientacion,
          institucion: INSTITUCION,
          fechaEmision: new Date().toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" }),
          validoHasta: "30 días corridos a partir de su emisión",
          textoOficial: `Por la presente se certifica que ${nombreCompleto(alumno)}, DNI N° ${alumno.dni}, es alumno/a REGULAR del ${curso} año, División ${alumno.division ?? "-"}°, Turno ${turno}, de la especialidad ${orientacion}, durante el Ciclo Lectivo ${anioLectivo()} en esta institución educativa.`
        },
        message: "Constancia de alumno regular generada con éxito."
      }
    };
  },

  descartarAlerta(alertaId) {
    if (!/^alt-[a-z]+-[\w-]+$/.test(alertaId ?? "")) {
      throw noEncontrado("La alerta solicitada");
    }

    studentRepository.descartarAlerta(alertaId);
    return { data: { id: alertaId, estado: "descartada" } };
  },

  tableroSecretaria(user) {
    const escuelaId = String(user.assignments?.[0]?.schoolId ?? "esc-1");
    const alumnos = studentRepository.all().filter((alumno) => alumno.escuelaId === escuelaId);
    const activos = alumnos.filter((alumno) => alumno.isActive);
    const porTurno = ["mañana", "tarde"].map((turno) => {
      const cantidad = activos.filter((alumno) => alumno.turno === turno).length;
      return {
        turno: capitalizar(turno),
        cantidad,
        porcentaje: activos.length ? Math.round((cantidad / activos.length) * 1000) / 10 : 0
      };
    });

    const divisiones = new Map();
    for (const alumno of activos) {
      if (!alumno.curso || !CURSOS_VALIDOS.includes(alumno.curso)) continue;
      const clave = `${alumno.curso}-${alumno.division}`;
      divisiones.set(clave, (divisiones.get(clave) ?? 0) + 1);
    }

    const alumnosPorCurso = [...divisiones.entries()]
      .map(([clave, cantidad]) => {
        const [curso, division] = clave.split("-");
        const informacion = buscarDivision(Number(curso), division) ?? {};
        return {
          id: clave,
          curso: `${curso}°`,
          division,
          turnoAula: capitalizar(informacion.turno) ?? null,
          turnoTaller: turnoTaller(informacion.turno),
          orientacion: informacion.orientacion ?? "Ciclo Básico",
          cantidad,
          estado: "Normal",
          porcentaje: Math.round((cantidad / activos.length) * 1000) / 10
        };
      })
      .sort((a, b) => a.id.localeCompare(b.id, "es", { numeric: true }));

    const alertas = [];
    let totalPendientes = 0;
    let totalDesaprobadas = 0;
    const casosDestacados = [];

    for (const alumno of activos) {
      const situaciones = materiasDelAlumno(alumno.id);
      const academico = resumenAcademico(situaciones);
      totalPendientes += academico.materiasPendientes;
      totalDesaprobadas += academico.materiasDesaprobadas;

      if (academico.materiasPendientes + academico.materiasDesaprobadas > 0) {
        casosDestacados.push({
          id: alumno.id,
          alumno: nombreCompleto(alumno),
          curso: `${cursoTexto(alumno) ?? "-"} ${alumno.division ?? ""}`.trim(),
          detalle: `${academico.materiasPendientes} pendiente(s), ${academico.materiasDesaprobadas} desaprobada(s)`,
          situacion: academico.estadoGeneral,
          tipo: academico.materiasPendientes ? "previa" : "desaprobada"
        });
      }

      for (const alerta of alertasDelAlumno(alumno, academico)) {
        alertas.push({
          id: alerta.id,
          tipo: alerta.tipo,
          titulo: alerta.titulo,
          descripcion: alerta.descripcion,
          alumno: `${nombreCompleto(alumno)} (${cursoTexto(alumno) ?? "-"} ${alumno.division ?? ""})`.trim(),
          fecha: alerta.fecha,
          prioridad: alerta.prioridad,
          estado: "pendiente",
          recurso: alerta.recursoRelacionado
        });
      }
    }

    const pases = studentRepository.listarPases();
    const actividadReciente = studentRepository
      .listarTrazaGeneral()
      .slice(0, 8)
      .map((entrada) => {
        const alumno = studentRepository.findById(entrada.registroId);
        return {
          id: entrada.id,
          tipo: { create: "Alta", update: "Modificación", deactivate: "Baja", transfer: "Pase" }[entrada.accion] ?? entrada.accion,
          descripcion: { create: "Alta de alumno", update: "Actualización de legajo", deactivate: "Baja de alumno", transfer: "Inicio de trámite de pase" }[entrada.accion] ?? entrada.accion,
          usuario: entrada.usuarioId,
          fecha: entrada.fecha,
          recurso: alumno ? nombreCompleto(alumno) : entrada.registroId
        };
      });

    return {
      data: {
        institucion: { nombre: INSTITUCION, cicloLectivo: anioLectivo(), periodo: `Ciclo Lectivo ${anioLectivo()}` },
        resumenAlumnos: {
          total: alumnos.length,
          activos: activos.length,
          inactivos: alumnos.length - activos.length,
          periodo: `Ciclo Lectivo ${anioLectivo()}`,
          ultimaActualizacion: new Date().toISOString(),
          porTurno
        },
        alumnosPorCurso,
        inasistencias: {
          totalInasistencias: 0,
          justificadas: 0,
          injustificadas: 0,
          alumnosEnRiesgo: 0,
          periodo: "Sin módulo de asistencia",
          alumnosAtencion: [],
          disponible: false
        },
        alertas,
        situacionesAcademicas: {
          totalMateriasPendientes: totalPendientes,
          totalMateriasDesaprobadas: totalDesaprobadas,
          evaluacionesPendientes: 0,
          cambiosCursoPendientes: pases.filter((pase) => pase.estado === "Iniciado").length,
          casosDestacados: casosDestacados.slice(0, 5)
        },
        actividadReciente
      }
    };
  }
};

export default legajoService;
