/* Gestion de cuentas de usuario (modulo Identidad): alta, consulta, edicion,
   cambio de estado y roles. Las cuentas nunca se borran: la baja es logica. */

import { registrarCatedrasDeDocente, sincronizarDocentes } from "../teachers/catedras.service.mjs";
import { getStore } from "../../database/memory-store.mjs";
import { personalRelacional } from "../../database/personal-sqlserver.mjs";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { userRepository } from "../../database/repositories/user.repository.mjs";
import { PERMISSIONS, ROL_CATALOGO, ROLES } from "../../config/permissions.config.mjs";
import { conflicto, errorDeValidacion, errorHttp, noEncontrado } from "../../utils/api-error.mjs";
import { evaluateAccess } from "./permission.service.mjs";
import { revokeUserSessions } from "./token.service.mjs";
import { DIVISIONES_CATALOGO } from "../students/catalogo.mjs";
import { claveCurso } from "../preceptor-assignments/alcance.mjs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const DNI_RE = /^\d{7,9}$/;
const TELEFONO_RE = /^[\d\s+()-]{6,30}$/;
const ESTADOS = ["activo", "inactivo"];
const SITUACIONES_REVISTA = ["titular", "provisional", "suplente"];
const MODULOS_VALIDOS = [2, 3, 4, 6];
const HORA_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function texto(valor, maximo = 80) {
  const limpio = String(valor ?? "").trim();
  return limpio ? limpio.slice(0, maximo) : null;
}

function existente(id) {
  const usuario = userRepository.findById(id, { includeInactive: true });

  if (!usuario) {
    throw noEncontrado("El usuario solicitado");
  }

  return usuario;
}

function escuelaDel(actor, cuerpo) {
  return cuerpo?.schoolId ?? actor?.assignments?.find((asignacion) => asignacion.schoolId)?.schoolId ?? null;
}

function validarRoles(roles, errores, { requerido }) {
  if (roles === undefined && !requerido) {
    return undefined;
  }

  if (!Array.isArray(roles) || (requerido && roles.length === 0)) {
    errores.push({ field: "roles", message: "Asigna al menos un rol." });
    return undefined;
  }

  const desconocidos = roles.filter((rol) => !ROL_CATALOGO[rol]);

  if (desconocidos.length) {
    errores.push({ field: "roles", message: `Roles inexistentes: ${desconocidos.join(", ")}.` });
    return undefined;
  }

  /* La cuenta de alumno solo nace del legajo (primer ingreso con DNI): no se
     asigna a mano a una cuenta del personal. */
  if (roles.includes(ROLES.ALUMNO)) {
    errores.push({ field: "roles", message: "El rol alumno se asigna automaticamente desde el legajo del alumno." });
    return undefined;
  }

  return [...new Set(roles)];
}

/* Valida y normaliza los datos personales. En el alta los obligatorios son
   nombre, apellido, email y dni; en la edicion solo se valida lo que llega. */
function datosPersonales(cuerpo, errores, { alta }) {
  const salida = {};

  for (const campo of ["nombre", "apellido"]) {
    if (cuerpo[campo] !== undefined || alta) {
      salida[campo] = texto(cuerpo[campo]);
      if (!salida[campo]) errores.push({ field: campo, message: `El campo ${campo} es obligatorio.` });
    }
  }

  if (cuerpo.email !== undefined || alta) {
    const email = String(cuerpo.email ?? "").trim().toLowerCase();
    if (!EMAIL_RE.test(email)) {
      errores.push({ field: "email", message: "El correo no tiene un formato valido." });
    }
    salida.email = email;
  }

  if (cuerpo.dni !== undefined || alta) {
    const dni = String(cuerpo.dni ?? "").trim();
    if (!DNI_RE.test(dni)) {
      errores.push({ field: "dni", message: "El DNI debe tener entre 7 y 9 numeros, sin puntos." });
    }
    salida.dni = dni;
  }

  if (cuerpo.telefono !== undefined) {
    const telefono = texto(cuerpo.telefono, 30);
    if (telefono && !TELEFONO_RE.test(telefono)) {
      errores.push({ field: "telefono", message: "El telefono solo admite numeros, espacios y los signos + ( ) -" });
    }
    salida.telefono = telefono;
  }

  return salida;
}

/* Datos del cargo de un docente: materia, situacion de revista, modulos y
   horario. Es opcional en el alta, pero si llega se valida completo y solo
   se guarda cuando la cuenta tiene el rol docente. */
function datosCargoDocente(cargo, roles, errores) {
  if (cargo === undefined || cargo === null || !roles?.includes("docente")) {
    return null;
  }

  const salida = {
    materia: texto(cargo.materia),
    situacionRevista: cargo.situacionRevista,
    docenteSuplido: null,
    modulos: Number(cargo.modulos),
    horaDesde: String(cargo.horaDesde ?? ""),
    horaHasta: String(cargo.horaHasta ?? ""),
    grupoTaller: texto(cargo.grupoTaller, 120),
    dias: []
  };

  /* Dias de la semana en que dicta (1 = lunes ... 5 = viernes). Obligatorios si se eligen cursos. */
  if (cargo.dias !== undefined && cargo.dias !== null) {
    const pedidos = Array.isArray(cargo.dias) ? cargo.dias.map(Number) : [];
    if (!Array.isArray(cargo.dias) || pedidos.some((dia) => !Number.isInteger(dia) || dia < 1 || dia > 5)) {
      errores.push({ field: "cargoDocente.dias", message: "Los dias deben ser numeros de 1 (lunes) a 5 (viernes)." });
    } else {
      salida.dias = [...new Set(pedidos)].sort();
    }
  }

  /* Cursos en los que dicta la materia (ids "anio-division" del catalogo). */
  if (cargo.cursos !== undefined && cargo.cursos !== null) {
    const validos = new Set(DIVISIONES_CATALOGO.map((item) => claveCurso(item.anio, item.division)));
    const pedidos = Array.isArray(cargo.cursos) ? cargo.cursos.map(String) : [];
    const invalidos = pedidos.filter((id) => !validos.has(id));
    if (!Array.isArray(cargo.cursos) || invalidos.length) {
      errores.push({ field: "cargoDocente.cursos", message: invalidos.length ? `Cursos inexistentes: ${invalidos.join(", ")}.` : "Los cursos deben ser una lista." });
    } else {
      salida.cursos = [...new Set(pedidos)];
    }
  }

  if (!salida.materia) {
    errores.push({ field: "cargoDocente.materia", message: "La materia es obligatoria." });
  }

  if (salida.cursos?.length && salida.dias.length === 0) {
    errores.push({ field: "cargoDocente.dias", message: "Elegi al menos un dia en que dicta la materia." });
  }

  if (!SITUACIONES_REVISTA.includes(salida.situacionRevista)) {
    errores.push({ field: "cargoDocente.situacionRevista", message: "La situacion de revista debe ser titular, provisional o suplente." });
  } else if (salida.situacionRevista === "suplente") {
    salida.docenteSuplido = texto(cargo.docenteSuplido, 120);
    if (!salida.docenteSuplido) {
      errores.push({ field: "cargoDocente.docenteSuplido", message: "Indica el apellido y nombre del docente al que suple." });
    }
  }

  if (!MODULOS_VALIDOS.includes(salida.modulos)) {
    errores.push({ field: "cargoDocente.modulos", message: "La cantidad de modulos debe ser 2, 3, 4 o 6." });
  }

  if (!HORA_RE.test(salida.horaDesde) || !HORA_RE.test(salida.horaHasta)) {
    errores.push({ field: "cargoDocente.horario", message: "El horario debe tener formato HH:MM." });
  } else if (salida.horaHasta <= salida.horaDesde) {
    errores.push({ field: "cargoDocente.horario", message: "La hora de fin debe ser posterior a la de inicio." });
  }

  return salida;
}

function nombreVisible(usuario) {
  return [usuario.nombre, usuario.apellido].filter(Boolean).join(" ") || usuario.email;
}

/* Administrar identidades (editar a terceros, asignar roles, matriz de permisos
   y asignaciones de alcance) exige identity.manage. identity.update, en cambio,
   alcanza para que cada persona edite su propio perfil. */
function gestionaIdentidad(actor) {
  return Boolean(actor) && evaluateAccess(actor, { permission: PERMISSIONS.IDENTITY_MANAGE }).allowed;
}

export const usersService = {
  list(query = {}) {
    const q = String(query.q ?? "").trim().toLowerCase();
    const rol = query.rol || null;
    const estado = query.estado || null;

    return userRepository
      .list({ includeInactive: true })
      .map((usuario) => userRepository.publicView(usuario))
      /* Las cuentas de alumno (una por legajo) no se mezclan con las del personal:
         solo aparecen si se las pide explicitamente con ?rol=alumno. */
      .filter((usuario) => rol === ROLES.ALUMNO || !usuario.roles.includes(ROLES.ALUMNO))
      .filter((usuario) => !rol || usuario.roles.includes(rol))
      .filter((usuario) => !estado || usuario.estado === estado)
      .filter(
        (usuario) =>
          !q ||
          [usuario.nombre, usuario.apellido, usuario.email, usuario.displayName, usuario.id]
            .filter(Boolean)
            .some((campo) => campo.toLowerCase().includes(q))
      );
  },

  get(id) {
    return userRepository.publicView(existente(id));
  },

  async create(actor, cuerpo = {}) {
    const errores = [];
    const datos = datosPersonales(cuerpo, errores, { alta: true });
    const roles = validarRoles(cuerpo.roles, errores, { requerido: true });
    const cargoDocente = datosCargoDocente(cuerpo.cargoDocente, roles, errores);

    if (errores.length) {
      throw errorDeValidacion(errores);
    }

    if (userRepository.findByEmail(datos.email, { includeInactive: true })) {
      throw conflicto("Ya existe un usuario con ese correo.");
    }

    /* Contrasena temporal: se muestra una sola vez en esta respuesta para
       entregarla a la persona. Nunca se guarda en claro. */
    const passwordTemporal = crypto.randomBytes(9).toString("base64url");
    const schoolId = escuelaDel(actor, cuerpo);

    if (datos.dni && userRepository.list({ includeInactive: true }).some((otro) => otro.dni === datos.dni && !otro.studentId)) {
      throw conflicto("Ya existe una persona del personal con ese DNI.");
    }

    const usuario = userRepository.create({
      ...datos,
      cargoDocente,
      displayName: nombreVisible(datos),
      passwordHash: await bcrypt.hash(passwordTemporal, 10),
      assignments: roles.map((role) => (schoolId ? { role, schoolId } : { role }))
    });

    /* Un docente con cursos queda asignado en la grilla de Direccion: materia, curso, grupo de taller,
       dias y horario. Es la misma fila que despues se guarda en asignaciones_docentes. */
    const catedras = cargoDocente?.cursos?.length ? registrarCatedrasDeDocente(usuario, cargoDocente) : null;

    /* Con el personal en tablas relacionales, la cuenta se guarda en la base antes de responder:
       si no se puede guardar, no queda nada a medias en memoria. */
    if (personalRelacional) {
      try {
        await personalRelacional.sincronizar(getStore(), { forzar: true });
      } catch (error) {
        console.error(`[personal] no se pudo guardar el alta de ${datos.email}: ${error.message}`);
        catedras?.deshacer();
        userRepository.remove(usuario.id);
        sincronizarDocentes();
        throw errorHttp(500, "PERSONAL_NO_GUARDADO", "No se pudo guardar la cuenta en la base de datos. Intenta de nuevo; si sigue fallando, avisa al administrador del sistema.");
      }
    }

    /* El alta pudo renumerar el id (usr_<id de la base>): se vuelve a leer por correo. */
    const guardado = userRepository.findByEmail(datos.email, { includeInactive: true });
    return { ...userRepository.publicView(guardado), passwordTemporal };
  },

  async update(actor, id, cuerpo = {}) {
    const usuario = existente(id);
    const propio = Boolean(actor?.id) && actor.id === id;
    const administra = gestionaIdentidad(actor);
    const estado = cuerpo.estado;

    /* Editar a otra persona exige identity.manage: identity.update solo
       habilita el propio perfil. */
    if (!administra && !propio) {
      throw errorHttp(403, "FORBIDDEN", "Solo puede modificar su propia información personal.");
    }

    /* El rol, las asignaciones y el estado de la cuenta no se tocan desde la
       edición de perfil: los administra la gestion de identidad. */
    if (!administra && (estado !== undefined || cuerpo.roles !== undefined || cuerpo.assignments !== undefined)) {
      throw errorHttp(403, "FORBIDDEN", "No puede cambiar el rol ni el estado de su propia cuenta.");
    }

    const errores = [];
    const datos = datosPersonales(cuerpo, errores, { alta: false });

    if (estado !== undefined && !ESTADOS.includes(estado)) {
      errores.push({ field: "estado", message: "El estado debe ser activo o inactivo." });
    }

    const nuevaPassword = cuerpo.password !== undefined && cuerpo.password !== "" ? String(cuerpo.password) : null;
    if (nuevaPassword !== null && (nuevaPassword.length < 8 || nuevaPassword.length > 120)) {
      errores.push({ field: "password", message: "La contraseña debe tener entre 8 y 120 caracteres." });
    }

    if (errores.length) {
      throw errorDeValidacion(errores);
    }

    if (datos.email && datos.email !== usuario.email) {
      const otro = userRepository.findByEmail(datos.email, { includeInactive: true });
      if (otro && otro.id !== id) {
        throw conflicto("Ya existe un usuario con ese correo.");
      }
    }

    if (estado === "inactivo" && actor?.id === id) {
      throw errorHttp(403, "FORBIDDEN", "No puede desactivar su propia cuenta.");
    }

    if (nuevaPassword !== null) {
      datos.passwordHash = await bcrypt.hash(nuevaPassword, 10);
      datos.passwordChangedAt = new Date().toISOString();
      datos.mustChangePassword = false;
    }

    let actualizado = userRepository.update(id, datos);
    actualizado = userRepository.update(id, { displayName: nombreVisible(actualizado) });

    if (nuevaPassword !== null && actor?.id !== id) {
      revokeUserSessions(id);
    }

    if (estado === "inactivo" && usuario.isActive) {
      actualizado = userRepository.deactivate(id);
      revokeUserSessions(id);
    } else if (estado === "activo" && !usuario.isActive) {
      actualizado = userRepository.activate(id);
    }

    return userRepository.publicView(actualizado);
  },

  replaceRoles(actor, id, cuerpo = {}) {
    const usuario = existente(id);
    const errores = [];
    const roles = validarRoles(cuerpo.roles, errores, { requerido: true });

    if (errores.length) {
      throw errorDeValidacion(errores);
    }

    const schoolId = usuario.assignments.find((asignacion) => asignacion.schoolId)?.schoolId ?? escuelaDel(actor, cuerpo);
    const actualizado = userRepository.update(id, {
      assignments: roles.map((role) => (schoolId ? { role, schoolId } : { role }))
    });

    sincronizarDocentes();

    /* Los roles viajan en el access token: se cierran las sesiones abiertas para
       que el cambio aplique en el proximo inicio de sesion. */
    revokeUserSessions(id);
    return userRepository.publicView(actualizado);
  },

  /* Reseteo de la contrasena de acceso del personal. Genera una clave temporal
     que se muestra una sola vez, obliga a cambiarla en el proximo ingreso y
     cierra las sesiones abiertas. Nunca se guarda en claro. */
  async resetPassword(actor, id) {
    const usuario = existente(id);
    const roles = usuario.assignments.map((asignacion) => asignacion.role);

    if (actor?.id === id) {
      throw errorHttp(403, "FORBIDDEN", "Para cambiar su propia contraseña use su perfil.");
    }

    if (roles.includes(ROLES.ALUMNO) || usuario.studentId) {
      throw errorHttp(403, "FORBIDDEN", "Las cuentas de alumnos no se gestionan desde el personal.");
    }

    const actorEsAdmin = actor?.assignments?.some((asignacion) => asignacion.role === ROLES.ADMIN);
    if (roles.includes(ROLES.ADMIN) && !actorEsAdmin) {
      throw errorHttp(403, "FORBIDDEN", "Solo un administrador puede resetear la contraseña de otro administrador.");
    }

    if (!usuario.isActive) {
      throw conflicto("La cuenta esta desactivada: reactivela antes de resetear su contraseña.");
    }

    const passwordTemporal = crypto.randomBytes(9).toString("base64url");
    userRepository.update(id, {
      passwordHash: await bcrypt.hash(passwordTemporal, 10),
      passwordChangedAt: new Date().toISOString(),
      mustChangePassword: true
    });
    revokeUserSessions(id);

    return {
      id: usuario.id,
      displayName: usuario.displayName,
      email: usuario.email,
      roles: [...new Set(roles)],
      passwordTemporal
    };
  },

  remove(actor, id) {
    const usuario = existente(id);

    if (actor?.id === id) {
      throw errorHttp(403, "FORBIDDEN", "No puede eliminar su propia cuenta.");
    }

    revokeUserSessions(id);
    userRepository.remove(id);
    sincronizarDocentes();
    return userRepository.publicView(usuario);
  }
};
