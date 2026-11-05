/* Suplencias de preceptores (las gestiona el Director).

   Una suplencia da al suplente acceso a cursos del titular entre dos fechas. No
   copia nada a sus asignaciones: alcance.mjs la lee en cada pedido, asi vence sola.
   El titular conserva su acceso. Las suplencias no se borran: se finalizan. */

import { ROLES } from "../../config/permissions.config.mjs";
import { getStore } from "../../database/memory-store.mjs";
import { userRepository } from "../../database/repositories/user.repository.mjs";
import { conflicto, errorDeValidacion, noEncontrado } from "../../utils/api-error.mjs";
import { esFechaIso, hoyEnBuenosAires } from "../calendario/calendario.fechas.mjs";
import { claveCurso, cursosDelPreceptor } from "./alcance.mjs";

const ESTADOS = ["programada", "vigente", "vencida", "finalizada"];
const MAX_MOTIVO = 500;

function estadoDe(suplencia, hoy = hoyEnBuenosAires()) {
  if (suplencia.finalizadaEn) return "finalizada";
  if (hoy < suplencia.desde) return "programada";
  return hoy > suplencia.hasta ? "vencida" : "vigente";
}

function persona(id) {
  const usuario = userRepository.findById(id, { includeInactive: true });
  return { id, nombre: usuario ? [usuario.nombre, usuario.apellido].filter(Boolean).join(" ") || usuario.displayName || usuario.email : null };
}

function vista(suplencia) {
  return {
    ...suplencia,
    titular: persona(suplencia.titularId),
    suplente: persona(suplencia.suplenteId),
    estado: estadoDe(suplencia)
  };
}

function preceptorActivo(id, field, errores) {
  const usuario = id ? userRepository.findById(String(id)) : null;

  if (!usuario?.assignments.some((asignacion) => asignacion.role === ROLES.PRECEPTOR)) {
    errores.push({ field, message: "Debe ser un preceptor activo." });
    return null;
  }

  return usuario;
}

const suplenciasService = {
  listar({ estado, titularId, suplenteId } = {}) {
    if (estado && !ESTADOS.includes(estado)) {
      throw errorDeValidacion([{ field: "estado", message: `Valores permitidos: ${ESTADOS.join(", ")}.` }]);
    }

    return getStore().suplencias
      .map(vista)
      .filter((item) => (!estado || item.estado === estado) && (!titularId || item.titularId === titularId) && (!suplenteId || item.suplenteId === suplenteId))
      .sort((a, b) => b.desde.localeCompare(a.desde));
  },

  crear(cuerpo = {}, actor) {
    const errores = [];
    const titular = preceptorActivo(cuerpo.titularId, "titularId", errores);
    const suplente = preceptorActivo(cuerpo.suplenteId, "suplenteId", errores);
    const { desde, hasta, motivo = null } = cuerpo;

    if (titular && suplente && titular.id === suplente.id) {
      errores.push({ field: "suplenteId", message: "El suplente no puede ser el titular." });
    }

    if (!esFechaIso(desde)) errores.push({ field: "desde", message: "Indica una fecha valida (AAAA-MM-DD)." });
    if (!esFechaIso(hasta)) errores.push({ field: "hasta", message: "Indica una fecha valida (AAAA-MM-DD)." });
    if (esFechaIso(desde) && esFechaIso(hasta) && hasta < desde) {
      errores.push({ field: "hasta", message: "No puede ser anterior a la fecha de inicio." });
    }
    if (esFechaIso(hasta) && hasta < hoyEnBuenosAires()) {
      errores.push({ field: "hasta", message: "La suplencia ya habria terminado." });
    }

    if (motivo !== null && (typeof motivo !== "string" || motivo.length > MAX_MOTIVO)) {
      errores.push({ field: "motivo", message: `Hasta ${MAX_MOTIVO} caracteres.` });
    }

    /* Sin divisiones indicadas cubre todos los cursos del titular. */
    const propias = titular ? cursosDelPreceptor(titular).map((curso) => claveCurso(curso.curso, curso.division)) : [];
    const divisiones = cuerpo.divisiones === undefined ? propias : cuerpo.divisiones;

    if (titular && (!Array.isArray(divisiones) || divisiones.length === 0 || divisiones.some((id) => !propias.includes(id)))) {
      errores.push({ field: "divisiones", message: "Indica cursos asignados al titular." });
    }

    if (errores.length) {
      throw errorDeValidacion(errores);
    }

    const solapada = getStore().suplencias.find((item) =>
      !item.finalizadaEn && item.desde <= hasta && desde <= item.hasta && item.divisiones.some((id) => divisiones.includes(id))
    );

    if (solapada) {
      throw conflicto("Ya hay una suplencia en esas fechas para alguno de esos cursos.");
    }

    const suplencia = {
      id: `sup_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      titularId: titular.id,
      suplenteId: suplente.id,
      divisiones: [...new Set(divisiones)],
      desde,
      hasta,
      motivo,
      creadoPor: actor.id,
      creadoEn: new Date().toISOString(),
      finalizadaEn: null,
      finalizadaPor: null
    };

    getStore().suplencias.push(suplencia);
    return vista(suplencia);
  },

  finalizar(id, actor) {
    const suplencia = getStore().suplencias.find((item) => item.id === id);

    if (!suplencia) {
      throw noEncontrado("La suplencia");
    }

    const estado = estadoDe(suplencia);

    if (estado === "finalizada" || estado === "vencida") {
      throw conflicto("La suplencia ya termino.");
    }

    suplencia.finalizadaEn = new Date().toISOString();
    suplencia.finalizadaPor = actor.id;
    return vista(suplencia);
  }
};

export default suplenciasService;
