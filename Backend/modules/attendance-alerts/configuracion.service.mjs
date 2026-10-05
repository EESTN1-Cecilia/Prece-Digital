import attendanceAlertsRepository from "./attendance-alerts.repository.mjs";
import { errorDeValidacion } from "../../utils/api-error.mjs";
import {
  CANALES_NOTIFICACION_VALIDOS,
  CONDICIONES,
  CONFIGURACION_POR_DEFECTO,
  DIAS_CONSECUTIVOS_MAXIMO,
  DIAS_CONSECUTIVOS_MINIMO,
  ESTADOS_ALERTA,
  MOTOR_DE_ALERTA,
  PRIORIDADES,
  TIPOS_INASISTENCIA,
  TIPOS_INASISTENCIA_VALIDOS,
  completarConfiguracion,
  descripcionDeTipo,
  esDiaLectivo,
  esFecha
} from "./catalogo.mjs";

/* Configuracion institucional de la deteccion, una por escuela.

   Es lo que permite que la regla se ajuste a cada institucion sin tocar codigo:
   cuantos dias lectivos seguidos generan la alerta, que tipos de inasistencia
   cuentan, si las justificadas cuentan o cortan la racha, con que prioridad y
   por que canales se avisa, y que dias no son lectivos. */

const CAMPOS_BOOLEANOS = ["habilitada", "justificadasGeneranAlerta", "justificadasReinicianRacha"];

/* La escuela sale siempre de la sesion, nunca del cuerpo de la peticion: un cliente
   no puede leer ni escribir la configuracion de otra escuela. Una cuenta sin
   escuela asignada (el admin del sistema) opera sobre la configuracion base. */
export function escuelaDe(user) {
  return user?.assignments?.find((asignacion) => asignacion.schoolId)?.schoolId ?? null;
}

/* Un usuario con escuela solo ve lo de su escuela. Si el registro es de otra, la
   API responde 404 y no 403: asi tampoco se le revela que ese id existe. */
export function esDeLaEscuelaDelUsuario(escuelaId, user) {
  const escuela = escuelaDe(user);

  return !escuela || escuela === escuelaId;
}

const CAMPOS_CONFIGURABLES = [
  "habilitada",
  "diasConsecutivos",
  "tiposContabilizados",
  "justificadasGeneranAlerta",
  "justificadasReinicianRacha",
  "prioridadNotificacion",
  "canales",
  "diasNoHabiles",
  "umbralAlertaInasistencias"
];

function validar(configuracion) {
  const errores = [];

  if (configuracion.diasConsecutivos !== undefined) {
    const valor = configuracion.diasConsecutivos;

    if (!Number.isInteger(valor)) {
      errores.push({
        field: "diasConsecutivos",
        message: "La cantidad de dias consecutivos debe ser un numero entero."
      });
    } else if (valor < DIAS_CONSECUTIVOS_MINIMO || valor > DIAS_CONSECUTIVOS_MAXIMO) {
      errores.push({
        field: "diasConsecutivos",
        message: `La cantidad de dias consecutivos debe estar entre ${DIAS_CONSECUTIVOS_MINIMO} y ${DIAS_CONSECUTIVOS_MAXIMO}.`
      });
    }
  }

  for (const campo of CAMPOS_BOOLEANOS) {
    if (configuracion[campo] !== undefined && typeof configuracion[campo] !== "boolean") {
      errores.push({ field: campo, message: `El campo ${campo} debe ser verdadero o falso.` });
    }
  }

  if (configuracion.tiposContabilizados !== undefined) {
    const valores = configuracion.tiposContabilizados;

    if (!Array.isArray(valores) || valores.length === 0) {
      errores.push({
        field: "tiposContabilizados",
        message: `Indique al menos un tipo. Tipos validos: ${TIPOS_INASISTENCIA_VALIDOS.join(", ")}.`
      });
    } else {
      const invalidos = valores.filter((tipo) => !TIPOS_INASISTENCIA_VALIDOS.includes(tipo));

      if (invalidos.length > 0) {
        errores.push({
          field: "tiposContabilizados",
          message: `Tipos de inasistencia invalidos: ${invalidos.join(", ")}. Use uno de: ${TIPOS_INASISTENCIA_VALIDOS.join(", ")}.`
        });
      }

      if (new Set(valores).size !== valores.length) {
        errores.push({ field: "tiposContabilizados", message: "Hay tipos de inasistencia repetidos." });
      }
    }
  }

  if (configuracion.prioridadNotificacion !== undefined && !PRIORIDADES.includes(configuracion.prioridadNotificacion)) {
    errores.push({
      field: "prioridadNotificacion",
      message: `Prioridad invalida. Use una de: ${PRIORIDADES.join(", ")}.`
    });
  }

  if (configuracion.canales !== undefined) {
    if (!Array.isArray(configuracion.canales) || configuracion.canales.length === 0) {
      errores.push({
        field: "canales",
        message: `Indique al menos un canal. Canales validos: ${CANALES_NOTIFICACION_VALIDOS.join(", ")}.`
      });
    } else {
      const invalidos = configuracion.canales.filter((canal) => !CANALES_NOTIFICACION_VALIDOS.includes(canal));

      if (invalidos.length > 0) {
        errores.push({
          field: "canales",
          message: `Canales invalidos: ${invalidos.join(", ")}. Use uno de: ${CANALES_NOTIFICACION_VALIDOS.join(", ")}.`
        });
      }
    }
  }

  if (configuracion.diasNoHabiles !== undefined) {
    if (!Array.isArray(configuracion.diasNoHabiles)) {
      errores.push({
        field: "diasNoHabiles",
        message: "Los dias no habiles deben ser una lista de fechas AAAA-MM-DD."
      });
    } else {
      for (const dia of configuracion.diasNoHabiles) {
        if (!esFecha(dia)) {
          errores.push({ field: "diasNoHabiles", message: `"${dia}" no es una fecha valida con formato AAAA-MM-DD.` });
        } else if (!esDiaLectivo(dia)) {
          errores.push({
            field: "diasNoHabiles",
            message: `"${dia}" ya es fin de semana, asi que no hace falta declararlo como dia no habil.`
          });
        }
      }

      if (new Set(configuracion.diasNoHabiles).size !== configuracion.diasNoHabiles.length) {
        errores.push({ field: "diasNoHabiles", message: "Hay dias no habiles repetidos." });
      }
    }
  }

  if (configuracion.umbralAlertaInasistencias !== undefined) {
    const valor = configuracion.umbralAlertaInasistencias;

    if (!Number.isInteger(valor) || valor < 1 || valor > 200) {
      errores.push({
        field: "umbralAlertaInasistencias",
        message: "El umbral debe ser un numero entero entre 1 y 200."
      });
    }
  }

  if (errores.length > 0) {
    throw errorDeValidacion(errores);
  }
}

const attendanceAlertsConfigService = {
  /* La configuracion vigente de la escuela, con el detalle de que campos siguen
     en el valor por defecto del sistema y cuales ya los ajusto la institucion. */
  getConfiguracion(escuelaId) {
    const configuracion = attendanceAlertsRepository.findConfiguracion(escuelaId);
    const porDefecto = CONFIGURACION_POR_DEFECTO;

    const camposPorDefecto = Object.keys(porDefecto).filter(
      (campo) => JSON.stringify(configuracion[campo]) === JSON.stringify(porDefecto[campo])
    );

    return {
      statusCode: 200,
      body: {
        data: {
          ...configuracion,
          motor: MOTOR_DE_ALERTA,
          detalle: {
            esPorDefecto: configuracion.esPorDefecto,
            valoresPorDefecto: porDefecto,
            camposPorDefecto,
            camposAjustados: Object.keys(porDefecto).filter((campo) => !camposPorDefecto.includes(campo))
          }
        }
      }
    };
  },

  /* Acepta una actualizacion parcial: lo que no viene conserva el valor
     anterior, de modo que un ajuste de prioridad no borra los dias no habiles. */
  updateConfiguracion(escuelaId, data, actor) {
    const errores = [];
    const parcial = {};

    for (const [campo, valor] of Object.entries(data ?? {})) {
      if (!CAMPOS_CONFIGURABLES.includes(campo)) {
        errores.push({ field: campo, message: `El campo ${campo} no se puede configurar.` });
        continue;
      }

      parcial[campo] = valor;
    }

    if (Object.keys(parcial).length === 0) {
      errores.push({
        field: "configuracion",
        message: `Indique al menos un campo. Campos configurables: ${CAMPOS_CONFIGURABLES.join(", ")}.`
      });
    }

    if (errores.length > 0) {
      throw errorDeValidacion(errores);
    }

    validar(parcial);

    /* Se parte de la configuracion vigente y no del valor por defecto del sistema:
       cambiar la prioridad no puede borrar los dias no habiles que la escuela ya
       habia declarado. */
    const anterior = attendanceAlertsRepository.findConfiguracion(escuelaId);
    const guardada = attendanceAlertsRepository.saveConfiguracion(
      completarConfiguracion({ ...anterior, ...parcial }, escuelaId)
    );

    attendanceAlertsRepository.registrarAuditoria({
      accion: "configuracion:update",
      actorId: actor ?? null,
      entidad: "configuracion_alertas",
      entidadId: escuelaId,
      antes: anterior,
      despues: guardada
    });

    return { statusCode: 200, body: { data: guardada } };
  },

  /* Catalogos para que la pantalla de configuracion no hardcodee nada. */
  getCatalogos() {
    return {
      statusCode: 200,
      body: {
        data: {
          tiposInasistencia: TIPOS_INASISTENCIA.map((tipo) => ({
            ...tipo,
            descripcion: descripcionDeTipo(tipo.valor)
          })),
          condiciones: CONDICIONES,
          estadosAlerta: ESTADOS_ALERTA,
          prioridades: PRIORIDADES,
          configuracionPorDefecto: CONFIGURACION_POR_DEFECTO,
          camposConfigurables: CAMPOS_CONFIGURABLES,
          limites: { diasConsecutivos: [DIAS_CONSECUTIVOS_MINIMO, DIAS_CONSECUTIVOS_MAXIMO] }
        }
      }
    };
  }
};

export default attendanceAlertsConfigService;
