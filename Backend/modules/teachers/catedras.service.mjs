/* Grilla de catedras del panel de Direccion: quien dicta cada materia en cada curso.

   Igual que con los preceptores, cada catedra asignada se copia a las asignaciones
   de rol del docente: de ahi leen su alcance la autorizacion y sus pantallas. Las
   entradas copiadas llevan catedraId para reemplazarlas sin tocar las demas. */

import { ROLES } from "../../config/permissions.config.mjs";
import { getStore } from "../../database/memory-store.mjs";
import { userRepository } from "../../database/repositories/user.repository.mjs";
import { errorDeValidacion } from "../../utils/api-error.mjs";
import { buscarDivision } from "../students/catalogo.mjs";

const CAMPOS_TEXTO = ["curso", "division", "numDivision", "materia", "area", "turno", "cargaHoraria", "estado", "situacion",
  "grupoTaller", "situacionRevista", "docenteSuplido", "horaDesde", "horaHasta"];
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

  if (Array.isArray(item.dias)) {
    limpia.dias = [...new Set(item.dias.map(Number).filter((n) => Number.isInteger(n) && n >= 1 && n <= 5))];
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

const mayuscula = (valor) => (valor ? valor.charAt(0).toUpperCase() + valor.slice(1) : null);

/* Alta de un docente con su cargo: por cada curso elegido deja una catedra asignada en la grilla
   (materia, modulos, dias y horario, grupo de taller). Si ya hay una fila de esa materia y curso sin
   docente, la reutiliza. Devuelve `deshacer()` para revertirlo si despues falla algo. */
export function registrarCatedrasDeDocente(usuario, cargo) {
  const catedras = getStore().catedras;
  const cursos = Array.isArray(cargo?.cursos) ? cargo.cursos : [];
  const modificadas = [];
  const creadas = [];

  const profesor = {
    id: usuario.id,
    nombre: usuario.displayName,
    email: usuario.email ?? null,
    avatar: (usuario.nombre ?? usuario.displayName ?? "?").charAt(0).toUpperCase()
  };

  for (const clave of cursos) {
    const [anioTexto, division] = clave.split("-");
    const anio = Number(anioTexto);
    const turno = mayuscula(buscarDivision(anio, division)?.turno);
    const materia = cargo.materia.trim();
    const mismaMateria = (c) => c.anio === anio && String(c.numDivision) === division && String(c.materia ?? "").trim().toLowerCase() === materia.toLowerCase();
    const libre = catedras.find((c) => mismaMateria(c) && !c.profesor);

    const datos = {
      materia,
      modulos: cargo.modulos,
      horasSemanales: cargo.modulos,
      cargaHoraria: `${cargo.modulos} mód. semanales`,
      estado: "asignado",
      profesor,
      situacionRevista: cargo.situacionRevista,
      ...(cargo.docenteSuplido ? { docenteSuplido: cargo.docenteSuplido } : {}),
      ...(cargo.grupoTaller ? { grupoTaller: cargo.grupoTaller } : {}),
      dias: cargo.dias ?? [],
      horaDesde: cargo.horaDesde,
      horaHasta: cargo.horaHasta
    };

    if (libre) {
      modificadas.push([libre, { ...libre }]);
      Object.assign(libre, datos);
    } else {
      const fila = {
        id: `cat-${usuario.id}-${anio}-${division}-${creadas.length}-${Date.now().toString(36)}`,
        anio,
        curso: `${anio}°`,
        division: `División ${division}`,
        numDivision: division,
        ...(turno ? { turno } : {}),
        ...datos
      };
      catedras.push(fila);
      creadas.push(fila);
    }
  }

  sincronizarDocentes();

  return {
    cantidad: creadas.length + modificadas.length,
    deshacer() {
      for (const fila of creadas) {
        const posicion = catedras.indexOf(fila);
        if (posicion >= 0) catedras.splice(posicion, 1);
      }
      for (const [fila, original] of modificadas) {
        for (const clave of Object.keys(fila)) delete fila[clave];
        Object.assign(fila, original);
      }
    }
  };
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
