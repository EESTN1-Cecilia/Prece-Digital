/* Portal del alumno: arma lo que ve el alumno autenticado a partir de los
   registros oficiales (ver student-portal.repository.mjs).

   Reglas que se respetan en todo el archivo:
   - Nada se inventa ni se completa: si un dato no esta registrado se informa
     como "sin registro" (null), nunca con un numero de ejemplo.
   - Las calificaciones no se recalculan: se muestra lo que cargo el docente y
     se clasifica con la escala vigente del modulo de calificaciones.
   - Una nota inferior a 6 en el ciclo actual NO es una previa: las previas son
     solo las situaciones academicas de tipo "pendiente" de ciclos anteriores.
   - Las llegadas tarde y los retiros anticipados no se suman como ausentes.

   Las funciones `armar*` son puras (reciben los registros ya leidos) para que
   la verificacion integral las reutilice sobre todo el padron sin repetir
   consultas por alumno. */

import studentPortalRepository from "./repositorio.mjs";
import {
  ESTADOS_CALIFICACION,
  JUSTIFICACIONES,
  PERIODOS_BOLETIN,
  REGLA_COMPUTO_ASISTENCIA,
  TIPOS_ASISTENCIA,
  cicloLectivoActual,
  clasificarValor,
  etiquetaEstado,
  ultimaCalificacion
} from "./catalogo.mjs";
import { interpretarValor } from "../grades/catalogo.mjs";
import { ESTADOS_MATERIA, TIPOS_SITUACION } from "../academic-records/catalogo.mjs";
import { errorDeValidacion } from "../../utils/api-error.mjs";

const collator = new Intl.Collator("es", { sensitivity: "base" });

/* ---------------- Referencias legibles ------------------------------------ */

function nombreMateria(materiaId) {
  return studentPortalRepository.materia(materiaId)?.nombre ?? materiaId;
}

function nombreDocente(docenteId) {
  const docente = studentPortalRepository.docente(docenteId);
  return docente ? `${docente.apellido}, ${docente.nombre}` : null;
}

/* "1ra" -> "1", "4ta" -> "4": las divisiones de la estructura academica usan
   ordinales y las del legajo numeros. */
export function numeroDeDivision(nombre) {
  const coincidencia = String(nombre ?? "").match(/\d+/);
  return coincidencia ? coincidencia[0] : null;
}

/* Curso y division a partir de los ids de la estructura academica. */
function ubicacionDesdeEstructura(cursoId, divisionId) {
  const division = studentPortalRepository.division(divisionId);
  const curso = studentPortalRepository.curso(cursoId ?? division?.cursoId);

  if (!curso && !division) {
    return null;
  }

  return {
    curso: curso?.anio ?? null,
    division: division ? numeroDeDivision(division.nombre) : null
  };
}

function etiquetaUbicacion(ubicacion) {
  if (!ubicacion?.curso) return null;
  return ubicacion.division ? `${ubicacion.curso}° ${ubicacion.division}°` : `${ubicacion.curso}°`;
}

function etiquetaEstadoMateria(estado) {
  return ESTADOS_MATERIA.find((item) => item.valor === estado)?.descripcion ?? estado;
}

const ETIQUETA_SITUACION = {
  en_curso: "En curso",
  regular: "Regular",
  aprobada: "Aprobada",
  desaprobada: "Desaprobada",
  libre: "Libre"
};

const ETIQUETA_TIPO = Object.fromEntries(TIPOS_SITUACION.map((tipo) => [tipo.valor, tipo.valor.charAt(0).toUpperCase() + tipo.valor.slice(1)]));

/* ---------------- Asistencia ---------------------------------------------- */

const TIPO_DESDE_REGISTRO = {
  ausente: TIPOS_ASISTENCIA.ausente.valor,
  media_falta: TIPOS_ASISTENCIA.parcial.valor,
  tarde: TIPOS_ASISTENCIA.tarde.valor
};

/* Une los dos registros de asistencia del backend sin contar dos veces el
   mismo dia:
     - inasistencias: jornada completa, con el circuito de justificacion
       (es la fuente que ya usa el boletin);
     - attendance-alerts: registro por tipo (ausente, tarde, media falta).
   Si el mismo dia aparece en ambos, vale el de inasistencias y la diferencia
   se devuelve en `conflictos` para que la revise preceptoria. */
export function armarAsistencias(alumno, { inasistencias = [], registros = [] }, { anio } = {}) {
  const porFecha = new Map();
  const conflictos = [];

  for (const registro of inasistencias) {
    if (anio && registro.anio !== anio) continue;

    porFecha.set(registro.fecha, {
      fecha: registro.fecha,
      anio: registro.anio,
      cuatrimestre: registro.cuatrimestre ?? null,
      tipo: TIPOS_ASISTENCIA.ausente.valor,
      justificacion: registro.estadoJustificacion,
      motivo: registro.motivo ?? null,
      curso: registro.curso ?? alumno.curso,
      division: registro.division ?? alumno.division,
      origen: "inasistencias"
    });
  }

  for (const registro of registros) {
    const anioRegistro = Number(String(registro.fecha).slice(0, 4));
    if (anio && anioRegistro !== anio) continue;

    const tipo = TIPO_DESDE_REGISTRO[registro.tipo] ?? TIPOS_ASISTENCIA.ausente.valor;
    const justificacion = registro.justificada ? "justificada" : "no_justificada";
    const existente = porFecha.get(registro.fecha);

    if (existente) {
      if (existente.tipo !== tipo || (existente.justificacion !== justificacion && existente.justificacion !== "pendiente")) {
        conflictos.push({
          fecha: registro.fecha,
          inasistencias: { tipo: existente.tipo, justificacion: existente.justificacion },
          registroAsistencia: { tipo, justificacion }
        });
      }
      continue;
    }

    porFecha.set(registro.fecha, {
      fecha: registro.fecha,
      anio: anioRegistro,
      cuatrimestre: null,
      tipo,
      justificacion,
      motivo: registro.motivo ?? null,
      curso: alumno.curso,
      division: alumno.division,
      origen: "asistencia"
    });
  }

  const detalle = [...porFecha.values()]
    .sort((a, b) => (a.fecha < b.fecha ? 1 : -1))
    .map((item) => ({
      fecha: item.fecha,
      anio: item.anio,
      cuatrimestre: item.cuatrimestre,
      tipo: item.tipo,
      tipoEtiqueta: Object.values(TIPOS_ASISTENCIA).find((tipo) => tipo.valor === item.tipo)?.etiqueta ?? item.tipo,
      justificacion: item.justificacion,
      justificacionEtiqueta: JUSTIFICACIONES[item.justificacion] ?? item.justificacion,
      motivo: item.motivo,
      curso: item.curso,
      division: item.division
    }));

  const vacio = () => ({ total: 0, justificadas: 0, injustificadas: 0, pendientes: 0 });
  const porTipo = {
    [TIPOS_ASISTENCIA.ausente.valor]: vacio(),
    [TIPOS_ASISTENCIA.parcial.valor]: vacio(),
    [TIPOS_ASISTENCIA.tarde.valor]: vacio()
  };

  for (const item of detalle) {
    const grupo = porTipo[item.tipo];
    grupo.total += 1;
    if (item.justificacion === "justificada") grupo.justificadas += 1;
    else if (item.justificacion === "pendiente") grupo.pendientes += 1;
    else grupo.injustificadas += 1;
  }

  const ausentes = porTipo[TIPOS_ASISTENCIA.ausente.valor];

  return {
    totales: {
      ausentes: ausentes.total,
      ausentesJustificados: ausentes.justificadas,
      ausentesInjustificados: ausentes.injustificadas,
      ausentesPendientes: ausentes.pendientes,
      ausentesParciales: porTipo[TIPOS_ASISTENCIA.parcial.valor].total,
      llegadasTarde: porTipo[TIPOS_ASISTENCIA.tarde.valor].total,
      /* El backend solo registra ausencias, tardes y retiros: no hay registro de
         presentes del que contar, asi que no se informa un numero estimado. */
      presentes: null,
      presentesDisponible: false
    },
    porTipo,
    detalle,
    conflictos
  };
}

/* ---------------- Calificaciones ------------------------------------------ */

function vistaCalificacion(calificacion) {
  const info = interpretarValor(calificacion.valor);

  return {
    id: calificacion.id,
    fecha: calificacion.fecha,
    tipoEvaluacion: calificacion.tipoEvaluacion,
    valor: calificacion.valor,
    nota: info?.nota ?? null,
    concepto: info?.concepto ?? null,
    estado: clasificarValor(calificacion.valor),
    docente: nombreDocente(calificacion.docenteId),
    observaciones: calificacion.observaciones ?? null
  };
}

function docenteDeMateria(materiaId, calificaciones, { anio, asignaciones = [] }) {
  const conDocente = ultimaCalificacion(calificaciones.filter((calificacion) => calificacion.docenteId));

  if (conDocente) {
    return nombreDocente(conDocente.docenteId);
  }

  const asignacion = asignaciones.find((item) => item.materiaId === materiaId && item.anio === anio);
  return asignacion ? nombreDocente(asignacion.docenteId) : null;
}

/* Matricula vigente del alumno en la estructura academica (division activa
   cuyo curso y numero coinciden con el legajo). */
export function matriculaVigente(alumno, matriculas) {
  for (const matricula of matriculas) {
    if (matricula.isActive === false) continue;
    const division = studentPortalRepository.division(matricula.divisionId);
    const curso = studentPortalRepository.curso(division?.cursoId);

    if (curso?.anio === alumno.curso && numeroDeDivision(division?.nombre) === String(alumno.division)) {
      return { matricula, division, curso };
    }
  }

  return null;
}

/* Agrupa las calificaciones de un ciclo por materia y periodo. El resultado del
   periodo es la ULTIMA calificacion registrada (un recuperatorio posterior
   reemplaza a la nota que recupera). No se promedia ni se redondea. */
export function armarCalificaciones(alumno, { calificaciones = [], situaciones = [], materiasCurriculares = [], asignaciones = [] }, { anio } = {}) {
  const delCiclo = calificaciones.filter((calificacion) => calificacion.anio === anio);
  const porMateria = new Map();

  const asegurar = (materiaId) => {
    if (!porMateria.has(materiaId)) porMateria.set(materiaId, []);
    return porMateria.get(materiaId);
  };

  for (const calificacion of delCiclo) asegurar(calificacion.materiaId).push(calificacion);
  for (const materiaId of materiasCurriculares) asegurar(materiaId);
  for (const situacion of situaciones) {
    if (situacion.anio === anio && situacion.tipo !== "pendiente") asegurar(situacion.materiaId);
  }

  const materias = [...porMateria.entries()].map(([materiaId, lista]) => {
    const periodos = {};

    for (const periodo of PERIODOS_BOLETIN) {
      const delPeriodo = lista.filter((calificacion) => (calificacion.cuatrimestre ?? null) === periodo.cuatrimestre);
      const resultado = ultimaCalificacion(delPeriodo);

      periodos[periodo.clave] = {
        etiqueta: periodo.etiqueta,
        resultado: resultado ? vistaCalificacion(resultado) : null,
        evaluaciones: delPeriodo.sort((a, b) => (a.fecha < b.fecha ? -1 : 1)).map(vistaCalificacion)
      };

    }

    /* El final (registro anual) manda sobre los cuatrimestres; si no hay, el 2° y despues el 1°. */
    const vigente = periodos.final.resultado ?? periodos.c2.resultado ?? periodos.c1.resultado ?? null;

    const situacion = situaciones
      .filter((item) => item.materiaId === materiaId && item.anio === anio && item.tipo !== "pendiente")
      .sort((a, b) => String(b.actualizadoEn).localeCompare(String(a.actualizadoEn)))[0] ?? null;

    const resultados = Object.values(periodos).map((periodo) => periodo.resultado).filter(Boolean);

    return {
      materiaId,
      materia: nombreMateria(materiaId),
      docente: docenteDeMateria(materiaId, lista, { anio, asignaciones }),
      periodos,
      calificacionFinal: periodos.final.resultado,
      estadoActual: vigente ? vigente.estado : ESTADOS_CALIFICACION.sinCalificacion.valor,
      estadoActualEtiqueta: etiquetaEstado(vigente ? vigente.estado : ESTADOS_CALIFICACION.sinCalificacion.valor),
      tieneTep: resultados.some((resultado) => resultado.estado === ESTADOS_CALIFICACION.tep.valor),
      tieneDebajoDe6: resultados.some((resultado) => resultado.estado === ESTADOS_CALIFICACION.debajoDe6.valor),
      situacionOficial: situacion
        ? {
            tipo: situacion.tipo,
            tipoEtiqueta: ETIQUETA_TIPO[situacion.tipo] ?? situacion.tipo,
            estado: situacion.estado,
            estadoEtiqueta: ETIQUETA_SITUACION[situacion.estado] ?? situacion.estado,
            descripcion: etiquetaEstadoMateria(situacion.estado)
          }
        : null
    };
  });

  materias.sort((a, b) => collator.compare(a.materia, b.materia));

  return {
    materias,
    totales: {
      materias: materias.length,
      conTep: materias.filter((materia) => materia.tieneTep).length,
      debajoDe6: materias.filter((materia) => materia.tieneDebajoDe6).length
    }
  };
}

/* ---------------- Previas -------------------------------------------------- */

function cursoDeOrigen(alumno, situacion, calificaciones, movimientos) {
  const delAnio = calificaciones.filter((calificacion) => calificacion.anio === situacion.anio);
  const referencia = delAnio.find((calificacion) => calificacion.materiaId === situacion.materiaId) ?? delAnio[0];

  if (referencia) {
    const ubicacion = ubicacionDesdeEstructura(referencia.cursoId, referencia.divisionId);
    if (ubicacion?.curso) return { ...ubicacion, fuente: "calificaciones" };
  }

  /* Promocion registrada al ciclo siguiente: la ubicacion anterior es el curso de origen. */
  /* El primer movimiento posterior a ese ciclo guarda donde estaba el alumno durante el ciclo. */
  const promocion = movimientos
    .filter((movimiento) => Number(String(movimiento.fecha ?? movimiento.anio).slice(0, 4)) > situacion.anio)
    .sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)))[0];

  if (promocion) {
    return { curso: promocion.cursoAnterior, division: String(promocion.divisionAnterior), fuente: "movimientos" };
  }

  return null;
}

function instanciasDe(situacion) {
  return (situacion.historial ?? [])
    .map((entrada) => ({
      fecha: entrada.fecha ?? entrada.momento ?? null,
      estado: entrada.estado ?? null,
      estadoEtiqueta: ETIQUETA_SITUACION[entrada.estado] ?? entrada.estado ?? null,
      periodo: entrada.etiqueta ?? (entrada.anio ? String(entrada.anio) : null),
      observaciones: entrada.observaciones ?? null
    }))
    .sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)));
}

/* Previas = situaciones de tipo "pendiente" de ciclos anteriores. Dejan de
   figurar como pendientes cuando el registro oficial pasa a "aprobada". */
export function armarPrevias(alumno, { situaciones = [], calificaciones = [], movimientos = [] }, { cicloActual }) {
  const previas = situaciones
    .filter((situacion) => situacion.tipo === "pendiente" && situacion.anio < cicloActual)
    .map((situacion) => {
      const instancias = instanciasDe(situacion);
      const aprobada = situacion.estado === "aprobada";
      const fechas = instancias.map((instancia) => instancia.fecha).filter(Boolean);

      /* El ultimo cambio de estado del registro tambien es una instancia de
         evaluacion cuando dejo la materia aprobada o desaprobada. */
      if (["aprobada", "desaprobada", "libre"].includes(situacion.estado) && situacion.actualizadoEn) {
        fechas.push(situacion.actualizadoEn);
      }

      const origen = cursoDeOrigen(alumno, situacion, calificaciones, movimientos);

      return {
        id: situacion.id,
        materiaId: situacion.materiaId,
        materia: nombreMateria(situacion.materiaId),
        anioCursada: situacion.anio,
        cursoOrigen: origen ? { curso: origen.curso, division: origen.division, etiqueta: etiquetaUbicacion(origen) } : null,
        estado: aprobada ? "aprobada" : "pendiente",
        estadoEtiqueta: aprobada ? "Aprobada" : "Pendiente de aprobación",
        estadoMateria: situacion.estado,
        estadoMateriaEtiqueta: ETIQUETA_SITUACION[situacion.estado] ?? situacion.estado,
        fechaUltimaInstancia: fechas.sort().at(-1)?.slice(0, 10) ?? null,
        instancias,
        observaciones: situacion.observaciones ?? null
      };
    })
    .sort((a, b) => a.anioCursada - b.anioCursada || collator.compare(a.materia, b.materia));

  return {
    pendientes: previas.filter((previa) => previa.estado === "pendiente"),
    aprobadas: previas.filter((previa) => previa.estado === "aprobada")
  };
}

/* ---------------- Datos del alumno ----------------------------------------- */

function datosPersonales(alumno, cicloLectivo, taller = null) {
  return {
    nombre: alumno.nombre,
    apellido: alumno.apellido,
    nombreCompleto: `${alumno.apellido}, ${alumno.nombre}`,
    dni: alumno.dni,
    curso: alumno.curso,
    division: alumno.division,
    cursoDivision: etiquetaUbicacion({ curso: alumno.curso, division: alumno.division }),
    turno: alumno.turno ?? null,
    orientacion: alumno.orientacion ?? null,
    condicion: alumno.condicion ?? null,
    cicloLectivo,
    grupoTaller: alumno.tallerId || alumno.grupoTaller
      ? { tallerId: alumno.tallerId ?? null, taller: taller?.name ?? null, grupo: alumno.grupoTaller ?? null }
      : null
  };
}

/* Materias de la division donde esta matriculado el alumno (estructura curricular). */
export function materiasCurriculares(alumno, matriculas, relacionesMateria) {
  const vigente = matriculaVigente(alumno, matriculas);

  if (!vigente) {
    return { ids: [], cursoId: null, divisionId: null };
  }

  const ids = [
    ...(relacionesMateria.get(`division:${vigente.division.id}`) ?? []),
    ...(relacionesMateria.get(`curso:${vigente.curso.id}`) ?? [])
  ];

  return { ids: [...new Set(ids)], cursoId: vigente.curso.id, divisionId: vigente.division.id };
}

/* Todo lo que el portal necesita de un alumno, leido en paralelo una sola vez
   por pedido. */
async function fuentesDe(alumno) {
  const [calificaciones, situaciones, inasistencias, registros, movimientos, matriculas, relaciones, taller] = await Promise.all([
    studentPortalRepository.calificacionesDe(alumno.id),
    studentPortalRepository.situacionesDe(alumno.id),
    studentPortalRepository.inasistenciasDe(alumno.id),
    studentPortalRepository.registrosAsistenciaDe(alumno.id),
    studentPortalRepository.movimientosDe(alumno.id),
    studentPortalRepository.matriculasDe(alumno.id),
    studentPortalRepository.relacionesMateria(),
    studentPortalRepository.taller(alumno.tallerId)
  ]);

  const curricular = materiasCurriculares(alumno, matriculas, relaciones);
  const asignaciones = curricular.divisionId
    ? await studentPortalRepository.asignacionesDeDivision({ cursoId: curricular.cursoId, divisionId: curricular.divisionId })
    : [];

  return { calificaciones, situaciones, inasistencias, registros, movimientos, matriculas, curricular, asignaciones, taller };
}

function aniosConRegistros(fuentes, cicloActual) {
  const anios = new Set([cicloActual]);
  for (const calificacion of fuentes.calificaciones) anios.add(calificacion.anio);
  for (const situacion of fuentes.situaciones) if (situacion.tipo !== "pendiente") anios.add(situacion.anio);
  return [...anios].filter((anio) => anio <= cicloActual).sort((a, b) => b - a);
}

function leerAnio(query, cicloActual) {
  if (query?.anio === undefined || query.anio === "") {
    return cicloActual;
  }

  const anio = Number(query.anio);

  if (!Number.isInteger(anio) || anio < 1990 || anio > cicloActual) {
    throw errorDeValidacion([{ field: "anio", message: "El ciclo lectivo solicitado no es válido." }]);
  }

  return anio;
}

/* Calcula el resumen del panel con las MISMAS funciones que cada seccion: el
   numero de una tarjeta siempre coincide con el detalle de su seccion. */
export function armarResumen(alumno, fuentes, { cicloActual }) {
  const asistencias = armarAsistencias(alumno, fuentes, { anio: cicloActual });
  const calificaciones = armarCalificaciones(alumno, { ...fuentes, materiasCurriculares: fuentes.curricular?.ids ?? [] }, { anio: cicloActual });
  const previas = armarPrevias(alumno, fuentes, { cicloActual });

  return {
    ausentes: asistencias.totales.ausentes,
    materiasConTep: calificaciones.totales.conTep,
    materiasDebajoDe6: calificaciones.totales.debajoDe6,
    materiasAprobadas: calificaciones.materias.filter((materia) => materia.estadoActual === ESTADOS_CALIFICACION.aprobada.valor).length,
    previasPendientes: previas.pendientes.length
  };
}

/* ---------------- Servicio ------------------------------------------------- */

export const studentPortalService = {
  async perfil(alumno) {
    const cicloActual = cicloLectivoActual();
    const fuentes = await fuentesDe(alumno);

    return {
      datosPersonales: datosPersonales(alumno, cicloActual, fuentes.taller),
      resumen: armarResumen(alumno, fuentes, { cicloActual })
    };
  },

  async boletin(alumno, query = {}) {
    const cicloActual = cicloLectivoActual();
    const fuentes = await fuentesDe(alumno);
    const disponibles = aniosConRegistros(fuentes, cicloActual);
    const anio = leerAnio(query, cicloActual);
    const esActual = anio === cicloActual;

    /* Curso del ciclo consultado: el actual sale del legajo; uno anterior, de
       las calificaciones de ese anio. */
    let ubicacion = { curso: alumno.curso, division: alumno.division };
    if (!esActual) {
      const referencia = fuentes.calificaciones.find((calificacion) => calificacion.anio === anio);
      ubicacion = referencia ? ubicacionDesdeEstructura(referencia.cursoId, referencia.divisionId) : null;
    }

    const calificaciones = armarCalificaciones(alumno, { ...fuentes, materiasCurriculares: esActual ? fuentes.curricular.ids : [] }, { anio });
    const asistencias = armarAsistencias(alumno, fuentes, { anio });
    const previas = armarPrevias(alumno, fuentes, { cicloActual });

    return {
      alumno: {
        ...datosPersonales(alumno, anio, fuentes.taller),
        curso: ubicacion?.curso ?? null,
        division: ubicacion?.division ?? null,
        cursoDivision: etiquetaUbicacion(ubicacion)
      },
      cicloLectivo: anio,
      cicloActual,
      aniosDisponibles: disponibles,
      periodos: PERIODOS_BOLETIN.map(({ clave, etiqueta }) => ({ clave, etiqueta })),
      materias: calificaciones.materias,
      totales: calificaciones.totales,
      inasistencias: {
        ausentes: asistencias.totales.ausentes,
        ausentesJustificados: asistencias.totales.ausentesJustificados,
        ausentesInjustificados: asistencias.totales.ausentesInjustificados,
        llegadasTarde: asistencias.totales.llegadasTarde,
        ausentesParciales: asistencias.totales.ausentesParciales
      },
      materiasPendientes: previas.pendientes,
      criterio: "Cada período muestra la última calificación registrada por el docente. La calificación final es la registrada como anual; si no fue cargada, figura sin registro."
    };
  },

  async asistencias(alumno, query = {}) {
    const cicloActual = cicloLectivoActual();
    const fuentes = await fuentesDe(alumno);
    const anios = new Set([cicloActual]);
    for (const registro of fuentes.inasistencias) anios.add(registro.anio);
    for (const registro of fuentes.registros) anios.add(Number(String(registro.fecha).slice(0, 4)));
    const disponibles = [...anios].filter((anio) => anio <= cicloActual).sort((a, b) => b - a);
    const anio = leerAnio(query, cicloActual);
    const resultado = armarAsistencias(alumno, fuentes, { anio });

    return {
      cicloLectivo: anio,
      aniosDisponibles: disponibles,
      curso: alumno.curso,
      division: alumno.division,
      cursoDivision: etiquetaUbicacion(alumno),
      totales: resultado.totales,
      porTipo: resultado.porTipo,
      detalle: resultado.detalle,
      reglaComputo: REGLA_COMPUTO_ASISTENCIA
    };
  },

  async situacionAcademica(alumno) {
    const cicloActual = cicloLectivoActual();
    const fuentes = await fuentesDe(alumno);
    const calificaciones = armarCalificaciones(alumno, { ...fuentes, materiasCurriculares: fuentes.curricular.ids }, { anio: cicloActual });
    const previas = armarPrevias(alumno, fuentes, { cicloActual });

    const filas = [];

    for (const materia of calificaciones.materias) {
      for (const periodo of PERIODOS_BOLETIN) {
        const resultado = materia.periodos[periodo.clave].resultado;
        if (!resultado) continue;

        filas.push({
          materiaId: materia.materiaId,
          materia: materia.materia,
          docente: resultado.docente ?? materia.docente,
          periodo: `${periodo.etiqueta} ${cicloActual}`,
          calificacion: resultado.valor,
          estado: resultado.estado,
          estadoEtiqueta: etiquetaEstado(resultado.estado),
          fecha: resultado.fecha
        });
      }
    }

    for (const previa of previas.pendientes) {
      filas.push({
        materiaId: previa.materiaId,
        materia: previa.materia,
        docente: null,
        periodo: `Ciclo ${previa.anioCursada}${previa.cursoOrigen?.etiqueta ? ` (${previa.cursoOrigen.etiqueta})` : ""}`,
        calificacion: null,
        estado: ESTADOS_CALIFICACION.pendiente.valor,
        estadoEtiqueta: ESTADOS_CALIFICACION.pendiente.etiqueta,
        fecha: previa.fechaUltimaInstancia
      });
    }

    return {
      cicloLectivo: cicloActual,
      filas,
      totales: {
        conTep: calificaciones.totales.conTep,
        debajoDe6: calificaciones.totales.debajoDe6,
        pendientes: previas.pendientes.length,
        aprobadas: filas.filter((fila) => fila.estado === ESTADOS_CALIFICACION.aprobada.valor).length
      },
      materiasSinCalificacion: calificaciones.materias
        .filter((materia) => materia.estadoActual === ESTADOS_CALIFICACION.sinCalificacion.valor)
        .map((materia) => ({ materiaId: materia.materiaId, materia: materia.materia, docente: materia.docente })),
      estados: Object.values(ESTADOS_CALIFICACION),
      aclaracion: "Una nota inferior a 6 durante el ciclo lectivo no es una materia previa. Las previas son las materias pendientes de aprobación de ciclos anteriores."
    };
  },

  async previas(alumno) {
    const cicloActual = cicloLectivoActual();
    const fuentes = await fuentesDe(alumno);
    return { cicloActual, ...armarPrevias(alumno, fuentes, { cicloActual }) };
  }
};

export default studentPortalService;
