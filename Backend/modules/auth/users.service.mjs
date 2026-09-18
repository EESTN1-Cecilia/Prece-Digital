/* Gestion de cuentas de usuario (modulo Identidad): alta, consulta, edicion,
   cambio de estado y roles. Las cuentas nunca se borran: la baja es logica. */

import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { userRepository } from "../../database/repositories/user.repository.mjs";
import { ROL_CATALOGO } from "../../config/permissions.config.mjs";
import { conflicto, errorDeValidacion, errorHttp, noEncontrado } from "../../utils/api-error.mjs";
import { revokeUserSessions } from "./token.service.mjs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const DNI_RE = /^\d{7,9}$/;
const TELEFONO_RE = /^[\d\s+()-]{6,30}$/;
const ESTADOS = ["activo", "inactivo"];

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

function nombreVisible(usuario) {
  return [usuario.nombre, usuario.apellido].filter(Boolean).join(" ") || usuario.email;
}

export const usersService = {
  list(query = {}) {
    const q = String(query.q ?? "").trim().toLowerCase();
    const rol = query.rol || null;
    const estado = query.estado || null;

    return userRepository
      .list({ includeInactive: true })
      .map((usuario) => userRepository.publicView(usuario))
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

    const usuario = userRepository.create({
      ...datos,
      displayName: nombreVisible(datos),
      passwordHash: await bcrypt.hash(passwordTemporal, 10),
      assignments: roles.map((role) => (schoolId ? { role, schoolId } : { role }))
    });

    return { ...userRepository.publicView(usuario), passwordTemporal };
  },

  update(actor, id, cuerpo = {}) {
    const usuario = existente(id);
    const errores = [];
    const datos = datosPersonales(cuerpo, errores, { alta: false });
    const estado = cuerpo.estado;

    if (estado !== undefined && !ESTADOS.includes(estado)) {
      errores.push({ field: "estado", message: "El estado debe ser activo o inactivo." });
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

    let actualizado = userRepository.update(id, datos);
    actualizado = userRepository.update(id, { displayName: nombreVisible(actualizado) });

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

    /* Los roles viajan en el access token: se cierran las sesiones abiertas para
       que el cambio aplique en el proximo inicio de sesion. */
    revokeUserSessions(id);
    return userRepository.publicView(actualizado);
  }
};
