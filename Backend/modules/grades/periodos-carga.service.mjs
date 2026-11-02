/* Bloqueo y desbloqueo de los periodos de carga de notas.

   La Direccion habilita o bloquea, por ciclo lectivo, la carga de cada periodo
   (1° y 2° cuatrimestre, diciembre y febrero). Con un periodo bloqueado nadie
   puede dar de alta, modificar ni anular calificaciones de ese periodo, salvo
   admin y director, que son quienes lo administran y rectifican.

   El control vive en grades.service (alta, modificacion y baja), asi que vale
   igual para la API de calificaciones, la planilla del docente y el boletin
   oficial. */

import { errorDeValidacion, errorHttp } from "../../utils/api-error.mjs";
import { userRepository } from "../../database/repositories/user.repository.mjs";
import { ANIO_MAXIMO, ANIO_MINIMO, PERIODOS_CARGA, PERIODOS_CARGA_VALIDOS, esAnioLectivo, periodoDeCarga } from "./catalogo.mjs";
import gradesRepository from "./grades.repository.mjs";

const ROLES_SIN_BLOQUEO = ["admin", "director"];

function leerAnio(valor) {
  if (valor === undefined || valor === null || valor === "") {
    return new Date().getFullYear();
  }

  if (!esAnioLectivo(valor)) {
    throw errorDeValidacion([{ field: "anio", message: `El ciclo lectivo debe ser un año entre ${ANIO_MINIMO} y ${ANIO_MAXIMO}.` }]);
  }

  return Number(valor);
}

function responsable(id) {
  if (!id) return null;
  const usuario = userRepository.findById(id, { includeInactive: true });
  return { id, nombre: usuario?.displayName ?? null };
}

function armar(anio) {
  const guardados = gradesRepository.obtenerPeriodosCarga(anio)?.periodos ?? {};

  return {
    anio,
    periodos: PERIODOS_CARGA.map(({ id, nombre, descripcion }) => {
      const estado = guardados[id];
      return {
        id,
        nombre,
        descripcion,
        habilitado: estado?.habilitado ?? true,
        actualizadoEn: estado?.actualizadoEn ?? null,
        actualizadoPor: responsable(estado?.actualizadoPor)
      };
    })
  };
}

/* Admin y director cargan aunque el periodo este bloqueado. */
export function ignoraBloqueo(user) {
  return (user?.assignments ?? []).some((asignacion) => ROLES_SIN_BLOQUEO.includes(asignacion.role));
}

export function estaHabilitado(anio, periodo) {
  return gradesRepository.obtenerPeriodosCarga(anio)?.periodos?.[periodo]?.habilitado !== false;
}

/* `calificacion` necesita anio, cuatrimestre, tipoEvaluacion y periodo. */
export function puedeCargar(user, calificacion) {
  return ignoraBloqueo(user) || estaHabilitado(calificacion.anio, periodoDeCarga(calificacion));
}

export function exigirPeriodoHabilitado(user, calificacion) {
  if (puedeCargar(user, calificacion)) return;

  const id = periodoDeCarga(calificacion);
  const { nombre } = PERIODOS_CARGA.find((periodo) => periodo.id === id);
  const message = `La carga de notas del período "${nombre}" ${calificacion.anio} está bloqueada por la Dirección.`;

  throw errorHttp(409, "PERIODO_BLOQUEADO", message, [{ field: "periodo", message, anio: calificacion.anio, periodo: id }]);
}

const periodosCargaService = {
  obtener(query = {}) {
    return { statusCode: 200, body: { data: armar(leerAnio(query.anio)) } };
  },

  /* cuerpo: { periodos: { cuatrimestre1: false, cuatrimestre2: true, ... } }.
     Solo cambia los periodos enviados. */
  actualizar(anioParam, cuerpo, user) {
    const anio = leerAnio(anioParam);
    const pedidos = cuerpo?.periodos;
    const errores = [];

    if (!pedidos || typeof pedidos !== "object" || Array.isArray(pedidos) || Object.keys(pedidos).length === 0) {
      errores.push({ field: "periodos", message: "Indicá al menos un período con su estado, por ejemplo { \"cuatrimestre1\": false }." });
    } else {
      for (const [id, habilitado] of Object.entries(pedidos)) {
        if (!PERIODOS_CARGA_VALIDOS.includes(id)) {
          errores.push({ field: `periodos.${id}`, message: `El período no existe. Valores posibles: ${PERIODOS_CARGA_VALIDOS.join(", ")}.` });
        } else if (typeof habilitado !== "boolean") {
          errores.push({ field: `periodos.${id}`, message: "El estado debe ser true (habilitado) o false (bloqueado)." });
        }
      }
    }

    if (errores.length > 0) {
      throw errorDeValidacion(errores);
    }

    const actuales = gradesRepository.obtenerPeriodosCarga(anio)?.periodos ?? {};
    const nuevos = { ...actuales };
    const momento = new Date().toISOString();
    let huboCambios = false;

    for (const [id, habilitado] of Object.entries(pedidos)) {
      if ((actuales[id]?.habilitado ?? true) === habilitado) continue;
      nuevos[id] = { habilitado, actualizadoEn: momento, actualizadoPor: user?.id ?? null };
      huboCambios = true;
    }

    if (huboCambios) {
      const antes = armar(anio);
      gradesRepository.guardarPeriodosCarga(anio, nuevos);
      gradesRepository.registrarAuditoria({
        accion: "periodos-carga:update",
        actorId: user?.id ?? null,
        entidad: "periodos-carga",
        entidadId: String(anio),
        antes,
        despues: armar(anio)
      });
    }

    return { statusCode: 200, body: { data: armar(anio) } };
  }
};

export default periodosCargaService;
