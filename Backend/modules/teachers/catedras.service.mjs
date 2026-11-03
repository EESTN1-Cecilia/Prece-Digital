/* Grilla de catedras del panel de Direccion: quien dicta cada materia en cada curso.

   Igual que con los preceptores, cada catedra asignada se copia a las asignaciones
   de rol del docente: de ahi leen su alcance la autorizacion y sus pantallas. Las
   entradas copiadas llevan catedraId para reemplazarlas sin tocar las demas. */

import { ROLES } from "../../config/permissions.config.mjs";
import { getStore } from "../../database/memory-store.mjs";
import { userRepository } from "../../database/repositories/user.repository.mjs";
import { errorDeValidacion } from "../../utils/api-error.mjs";

const CAMPOS_TEXTO = ["curso", "division", "numDivision", "materia", "area", "turno", "cargaHoraria", "estado", "situacion"];
const MAX_TEXTO = 200;

function texto(valor) {
  return typeof valor === "string" && valor.length <= MAX_TEXTO;
}

function limpiarCatedra(item, indice, errores) {
  const field = `catedras[${indice}]`;

  if (!item || typeof item !== "object" || !texto(item.id) || !item.id) {
    errores.push({ field, message: "La catedra necesita un id." });
    return null;
  }

  if (!Number.isInteger(item.anio) || item.anio < 1 || item.anio > 7) {
    errores.push({ field, message: "El anio debe ser un numero de 1 a 7." });
    return null;
  }

  if (!/^\d+$/.test(String(item.numDivision ?? ""))) {
    errores.push({ field, message: "La division debe ser un numero." });
    return null;
  }

  const limpia = { id: item.id, anio: item.anio, numDivision: String(item.numDivision), profesor: null };

  for (const campo of CAMPOS_TEXTO) {
    if (campo !== "numDivision" && texto(item[campo])) limpia[campo] = item[campo];
  }

  for (const campo of ["modulos", "horasSemanales"]) {
    if (Number.isFinite(item[campo])) limpia[campo] = item[campo];
  }

  if (item.profesor) {
    const { id, nombre, email, avatar } = item.profesor;

    if (!texto(id) || !id) {
      errores.push({ field, message: "El profesor necesita un id." });
      return null;
    }

    limpia.profesor = { id, nombre: texto(nombre) ? nombre : null, email: texto(email) ? email : null, avatar: texto(avatar) ? avatar : null };
  }

  return limpia;
}

/* Vuelve a copiar la grilla a los docentes. Un id que no es de un docente no da acceso. */
export function sincronizarDocentes() {
  const catedras = getStore().catedras;

  for (const usuario of userRepository.list()) {
    const base = usuario.assignments.filter((asignacion) => !asignacion.catedraId);
    const docente = base.find((asignacion) => asignacion.role === ROLES.DOCENTE);
    const copiadas = usuario.assignments.length - base.length;
    const propias = docente ? catedras.filter((catedra) => catedra.profesor?.id === usuario.id) : [];

    if (copiadas === 0 && propias.length === 0) {
      continue;
    }

    const nuevas = propias.map((catedra) => ({
      role: ROLES.DOCENTE,
      ...(docente.schoolId ? { schoolId: docente.schoolId } : {}),
      catedraId: catedra.id,
      anio: catedra.anio,
      curso: `${catedra.anio}°`,
      division: catedra.numDivision,
      materia: catedra.materia ?? null
    }));

    userRepository.update(usuario.id, { assignments: [...base, ...nuevas] });
  }
}

export const catedrasService = {
  listar() {
    return getStore().catedras;
  },

  reemplazar(cuerpo = {}) {
    if (!Array.isArray(cuerpo.catedras)) {
      throw errorDeValidacion([{ field: "catedras", message: "Envia la lista de catedras." }]);
    }

    const errores = [];
    const limpias = cuerpo.catedras.map((item, indice) => limpiarCatedra(item, indice, errores));

    if (errores.length) {
      throw errorDeValidacion(errores);
    }

    const catedras = getStore().catedras;
    catedras.length = 0;
    catedras.push(...limpias);
    sincronizarDocentes();
    return catedras;
  }
};
