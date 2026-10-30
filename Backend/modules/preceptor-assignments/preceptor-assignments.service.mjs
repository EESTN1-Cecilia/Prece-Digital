/* Asignacion de cursos a preceptores (la hace el Director).

   No hay tabla propia: la lista de cursos vive en la asignacion de rol
   "preceptor" del usuario, el mismo lugar del que la autorizacion lee los
   alcances. Un curso tiene a lo sumo un preceptor: asignarlo a otro lo saca
   del anterior. */

import { userRepository } from "../../database/repositories/user.repository.mjs";
import { ROLES } from "../../config/permissions.config.mjs";
import { DIVISIONES_CATALOGO } from "../students/catalogo.mjs";
import { errorDeValidacion, noEncontrado } from "../../utils/api-error.mjs";
import { claveCurso, cursosDelPreceptor } from "./alcance.mjs";

const capitalizar = (texto) => (texto ? texto.charAt(0).toUpperCase() + texto.slice(1) : texto);

function preceptores() {
  return userRepository.list().filter((usuario) => usuario.assignments.some((asignacion) => asignacion.role === ROLES.PRECEPTOR));
}

function nombreDe(usuario) {
  return [usuario.nombre, usuario.apellido].filter(Boolean).join(" ") || usuario.displayName || usuario.email;
}

function vistaDivision(item, asignado) {
  const id = claveCurso(item.anio, item.division);
  const preceptor = asignado?.usuario ?? null;

  return {
    id,
    anio: item.anio,
    curso: `${item.anio}°`,
    division: `División ${item.division}`,
    numDivision: item.division,
    turno: capitalizar(item.turno),
    orientacion: item.orientacion ?? "Ciclo Básico",
    preceptor: preceptor
      ? { id: preceptor.id, nombre: nombreDe(preceptor), email: preceptor.email, avatar: nombreDe(preceptor).charAt(0).toUpperCase() }
      : null,
    estado: preceptor ? "asignado" : "sin_asignar",
    actualizadoEn: asignado?.actualizadoEn ?? null
  };
}

function guardarCursos(usuario, cursos) {
  const assignments = usuario.assignments.map((asignacion) =>
    asignacion.role === ROLES.PRECEPTOR ? { ...asignacion, cursos } : asignacion
  );
  userRepository.update(usuario.id, { assignments });
}

function validarDivisiones(divisiones) {
  const lista = (Array.isArray(divisiones) ? divisiones : [divisiones]).filter(Boolean).map(String);
  const validas = new Set(DIVISIONES_CATALOGO.map((item) => claveCurso(item.anio, item.division)));
  const invalidas = lista.filter((id) => !validas.has(id));

  if (!lista.length || invalidas.length) {
    throw errorDeValidacion([{ field: "divisiones", message: invalidas.length ? `Cursos inexistentes: ${invalidas.join(", ")}.` : "Indicá al menos un curso." }]);
  }

  return lista;
}

const preceptorAssignmentsService = {
  listar() {
    const porCurso = new Map();
    for (const usuario of preceptores()) {
      for (const curso of cursosDelPreceptor(usuario)) {
        porCurso.set(claveCurso(curso.curso, curso.division), { usuario, actualizadoEn: curso.actualizadoEn ?? null });
      }
    }
    return DIVISIONES_CATALOGO.map((item) => vistaDivision(item, porCurso.get(claveCurso(item.anio, item.division))));
  },

  asignar({ divisiones, preceptorId } = {}) {
    const ids = validarDivisiones(divisiones);
    const destino = preceptorId ? userRepository.findById(String(preceptorId)) : null;

    if (!destino || !destino.assignments.some((asignacion) => asignacion.role === ROLES.PRECEPTOR)) {
      throw noEncontrado("El preceptor indicado");
    }

    const hoy = new Date().toISOString().slice(0, 10);

    /* Un curso, un preceptor: se saca de quien lo tuviera. */
    for (const usuario of preceptores()) {
      if (usuario.id === destino.id) continue;
      const actuales = cursosDelPreceptor(usuario);
      const restantes = actuales.filter((curso) => !ids.includes(claveCurso(curso.curso, curso.division)));
      if (restantes.length !== actuales.length) guardarCursos(usuario, restantes);
    }

    const propios = cursosDelPreceptor(userRepository.findById(destino.id)).filter((curso) => !ids.includes(claveCurso(curso.curso, curso.division)));
    const nuevos = ids.map((id) => {
      const [curso, division] = id.split("-");
      return { curso: Number(curso), division, actualizadoEn: hoy };
    });
    guardarCursos(userRepository.findById(destino.id), [...propios, ...nuevos]);

    return this.listar();
  },

  quitar({ divisiones } = {}) {
    const ids = validarDivisiones(divisiones);

    for (const usuario of preceptores()) {
      const actuales = cursosDelPreceptor(usuario);
      const restantes = actuales.filter((curso) => !ids.includes(claveCurso(curso.curso, curso.division)));
      if (restantes.length !== actuales.length) guardarCursos(usuario, restantes);
    }

    return this.listar();
  },

  /* Cursos del preceptor autenticado (identidad tomada del token). */
  misCursos(user) {
    const propios = new Set(cursosDelPreceptor(user).map((curso) => claveCurso(curso.curso, curso.division)));
    return DIVISIONES_CATALOGO.filter((item) => propios.has(claveCurso(item.anio, item.division))).map((item) => vistaDivision(item, { usuario: user }));
  }
};

export default preceptorAssignmentsService;
