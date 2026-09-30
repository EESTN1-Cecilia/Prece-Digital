import { sonDiasLectivosConsecutivos } from "./catalogo.mjs";

/* Motor de deteccion de alertas por inasistencias consecutivas.

   Es una funcion pura a proposito:

   - No lee el store, no escribe nada y no importa notificaciones.
   - Recibe las inasistencias y la configuracion de la escuela, y devuelve los
     periodos que cumplen la condicion.

   Eso permite ejecutar exactamente la misma evaluacion al registrar una
   inasistencia, desde un proceso periodico o desde otro canal de comunicacion
   (correo, sms, app) sin duplicar la regla. La deduplicacion y la escritura de
   la alerta son responsabilidad de attendance-alerts.service.mjs. */

/* Identifica la situacion detectada. Si dos evaluaciones llegan a la misma
   clave, la segunda sabe que ya fue registrada y no genera otra alerta. */
export function claveDeAlerta({ escuelaId, alumnoId, condicion, periodoDesde, periodoHasta, diasConsecutivos }) {
  return [escuelaId, alumnoId, condicion, periodoDesde, periodoHasta, diasConsecutivos].join("|");
}

/* Solo computan las inasistencias vigentes del tipo que la escuela contabiliza. Las
   dadas de baja se ignoran. */
function computables(inasistencias, configuracion) {
  return inasistencias
    .filter((inasistencia) => !inasistencia.bajaEn)
    .filter((inasistencia) => configuracion.tiposContabilizados.includes(inasistencia.tipo));
}

function ordenarPorFecha(inasistencias) {
  return [...inasistencias].sort((a, b) => {
    if (a.fecha !== b.fecha) {
      return a.fecha < b.fecha ? -1 : 1;
    }

    return String(a.id).localeCompare(String(b.id));
  });
}

/* Recorre una sola vez la linea de tiempo del alumno y emite un evento por cada
   corte relevante. `alCerrar` decide que se hace con cada racha que llega al
   umbral, de modo que la deteccion y el resumen del alumno comparten exactamente
   la misma lectura de las reglas. `alActualizar` es opcional: solo lo necesita el
   resumen, que va siguiendo la racha abierta. */
function recorrerRachas(inasistencias, configuracion, alCerrar, alActualizar = () => {}) {
  const { diasConsecutivos, justificadasGeneranAlerta, justificadasReinicianRacha, diasNoHabiles = [] } =
    configuracion;

  let racha = [];

  for (const inasistencia of ordenarPorFecha(computables(inasistencias, configuracion))) {
    /* Un dia no habil o un hueco entre dias lectivos corta la racha: no alcanza
       con que las fechas sean distintas, tiene que ser el dia lectivo siguiente. */
    const cortePorHueco =
      racha.length > 0 &&
      !sonDiasLectivosConsecutivos(racha[racha.length - 1].fecha, inasistencia.fecha, diasNoHabiles);

    if (cortePorHueco) {
      racha = [];
    }

    /* Una inasistencia justificada no cuenta para el umbral, pero la institucion
       espera que el alumno retome la asistencia: por defecto corta la racha. */
    if (inasistencia.justificada && !justificadasGeneranAlerta) {
      if (justificadasReinicianRacha) {
        racha = [];
      }

      alActualizar(racha);
      continue;
    }

    racha.push(inasistencia);

    if (racha.length >= diasConsecutivos) {
      alCerrar(racha);

      /* El periodo se cierra aca: volver a alertar exige un nuevo periodo
         completo, no un dia extra de la misma racha. */
      racha = [];
    }

    alActualizar(racha);
  }

  return racha;
}

function construirPeriodo(racha) {
  const dias = racha.map((inasistencia) => inasistencia.fecha);

  return {
    condicion: "inasistencias_consecutivas",
    cantidadInasistencias: racha.length,
    diasConsecutivosExigidos: racha.length,
    periodoDesde: dias[0],
    periodoHasta: dias[dias.length - 1],
    dias,
    inasistenciaIds: racha.map((inasistencia) => inasistencia.id),
    inasistencias: racha.map((inasistencia) => ({
      id: inasistencia.id,
      fecha: inasistencia.fecha,
      tipo: inasistencia.tipo,
      justificada: Boolean(inasistencia.justificada)
    }))
  };
}

/* Periodos que cumplen la condicion de inasistencias consecutivas. */
export function detectarInasistenciasConsecutivas(inasistencias, configuracion) {
  const periodos = [];

  recorrerRachas(inasistencias, configuracion, (racha) => periodos.push(construirPeriodo(racha)));

  return periodos;
}

/* Punto de entrada del modulo: aplica todas las condiciones del catalogo y ya
   devuelve la clave de deduplicacion de cada una. */
export function detectarAlertas(inasistencias, configuracion, alumno) {
  if (!configuracion.habilitada) {
    return [];
  }

  return detectarInasistenciasConsecutivas(inasistencias, configuracion).map((periodo) => ({
    ...periodo,
    clave: claveDeAlerta({
      escuelaId: configuracion.escuelaId,
      alumnoId: alumno.id,
      condicion: periodo.condicion,
      periodoDesde: periodo.periodoDesde,
      periodoHasta: periodo.periodoHasta,
      diasConsecutivos: configuracion.diasConsecutivos
    })
  }));
}

/* Serie historica de la racha del alumno, para explicar por que todavia no hay
   alerta: cuanto lleva, cuanto falta y como quedo la anterior. */
export function rachaActual(inasistencias, configuracion) {
  let rachaPrevia = [];
  let rachaAbierta = [];

  recorrerRachas(
    inasistencias,
    configuracion,
    (racha) => {
      rachaPrevia = racha;
    },
    (racha) => {
      rachaAbierta = racha;
    }
  );

  const { diasConsecutivos } = configuracion;

  return {
    diasConsecutivos: rachaAbierta.length,
    umbralExigido: diasConsecutivos,
    completo: rachaAbierta.length >= diasConsecutivos,
    diasQueFaltan: Math.max(0, diasConsecutivos - rachaAbierta.length),
    desde: rachaAbierta[0]?.fecha ?? null,
    hasta: rachaAbierta[rachaAbierta.length - 1]?.fecha ?? null,
    inasistenciaIds: rachaAbierta.map((inasistencia) => inasistencia.id),
    ultimaRachaCerrada: {
      dias: rachaPrevia.length,
      desde: rachaPrevia[0]?.fecha ?? null,
      hasta: rachaPrevia[rachaPrevia.length - 1]?.fecha ?? null
    }
  };
}
